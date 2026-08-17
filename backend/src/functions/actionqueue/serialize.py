import os
from typing import Any

import boto3

from storage import presigned_get_url

PERSON_TABLE_NAME = os.environ["PERSON_TABLE_NAME"]
RECEIPTS_TABLE = os.environ["RECEIPTS_TABLE"]

_dynamodb = boto3.resource("dynamodb")
_person_table = _dynamodb.Table(PERSON_TABLE_NAME)
_receipts_table = _dynamodb.Table(RECEIPTS_TABLE)


def _display_name(person: dict[str, Any] | None) -> str:
    if not person:
        return "Unknown"
    if person.get("isAgent"):
        return f"{person.get('firstName', 'Fixe')} {person.get('lastName', 'Agent')}".strip()
    name = f"{person.get('firstName', '')} {person.get('lastName', '')}".strip()
    return name or "Unknown"


def resolve_person_names(person_ids: set[str]) -> dict[str, str]:
    ids = [pid for pid in person_ids if pid]
    if not ids:
        return {}
    keys = [{"personId": pid} for pid in dict.fromkeys(ids)]  # de-dupe, preserve order
    names: dict[str, str] = {}
    # DynamoDB batch_get_item caps at 100 keys per request - plenty at POC scale.
    for start in range(0, len(keys), 100):
        response = _dynamodb.batch_get_item(RequestItems={PERSON_TABLE_NAME: {"Keys": keys[start : start + 100]}})
        for item in response.get("Responses", {}).get(PERSON_TABLE_NAME, []):
            names[item["personId"]] = _display_name(item)
    return names


def _resolve_reference(ref: dict[str, Any]) -> dict[str, Any]:
    if ref.get("type") != "receipt":
        return {"type": "link", "url": ref.get("url"), "label": ref.get("label")}

    result = _receipts_table.get_item(Key={"personId": ref.get("personId"), "receiptId": ref.get("receiptId")})
    receipt = result.get("Item")
    if not receipt:
        return {"type": "receipt", "url": None, "thumbnailUrl": None, "label": ref.get("label") or "Receipt (removed)"}

    return {
        "type": "receipt",
        "receiptId": receipt["receiptId"],
        "url": presigned_get_url(receipt["s3Key"]),
        "thumbnailUrl": presigned_get_url(receipt["thumbnailKey"]) if receipt.get("thumbnailKey") else None,
        "label": ref.get("label") or receipt.get("vendor") or receipt.get("originalFileName"),
    }


def _serialize_message(message: dict[str, Any], names: dict[str, str]) -> dict[str, Any]:
    return {
        "messageId": message["messageId"],
        "author": message["author"],
        "authorName": names.get(message["author"], "Unknown"),
        "messageType": message.get("messageType", "user"),
        "content": message.get("content"),
        "references": [_resolve_reference(ref) for ref in message.get("references", [])],
        "options": message.get("options", []),
        "selectedOptionId": message.get("selectedOptionId"),
        "selectedById": message.get("selectedById"),
        "selectedByName": names.get(message.get("selectedById") or "", None),
        "selectedAt": message.get("selectedAt"),
        "createdAt": message.get("createdAt"),
    }


def _serialize_event(event: dict[str, Any], names: dict[str, str]) -> dict[str, Any]:
    return {
        "eventId": event["eventId"],
        "actorId": event["actorId"],
        "actorName": names.get(event["actorId"], "Unknown"),
        "eventType": event["eventType"],
        "fromValue": event.get("fromValue"),
        "toValue": event.get("toValue"),
        "createdAt": event.get("createdAt"),
    }


def _serialize_proposal(proposal: dict[str, Any] | None, names: dict[str, str]) -> dict[str, Any] | None:
    if proposal is None:
        return None
    return {
        "proposedAction": proposal.get("proposedAction"),
        "confidence": proposal.get("confidence"),
        "evidence": [_resolve_reference(ref) for ref in proposal.get("evidence", [])],
        "verdict": proposal.get("verdict"),
        "verdictById": proposal.get("verdictById"),
        "verdictByName": names.get(proposal.get("verdictById") or "", None),
        "verdictAt": proposal.get("verdictAt"),
        "verdictNote": proposal.get("verdictNote"),
        "editedAction": proposal.get("editedAction"),
    }


def _collect_person_ids(item: dict[str, Any]) -> set[str]:
    ids = {item.get("createdById"), item.get("assignedToId")}
    proposal = item.get("proposal") or {}
    ids.add(proposal.get("verdictById"))
    for message in item.get("messages", []):
        ids.add(message.get("author"))
        ids.add(message.get("selectedById"))
    for event in item.get("events", []):
        ids.add(event.get("actorId"))
    return {pid for pid in ids if pid}


def serialize_thread_summary(item: dict[str, Any]) -> dict[str, Any]:
    proposal = item.get("proposal")
    return {
        "threadId": item["threadId"],
        "entryType": item["entryType"],
        "orgId": item["orgId"],
        "createdById": item["createdById"],
        "assignedToId": item["assignedToId"],
        "status": item["status"],
        "subject": item["subject"],
        "lastMessagePreview": item.get("lastMessagePreview"),
        "confidence": proposal.get("confidence") if proposal else None,
        "createdAt": item["createdAt"],
        "updatedAt": item["updatedAt"],
    }


def serialize_thread_detail(item: dict[str, Any]) -> dict[str, Any]:
    names = resolve_person_names(_collect_person_ids(item))
    return {
        **serialize_thread_summary(item),
        "readAt": item.get("readAt"),
        "archivedAt": item.get("archivedAt"),
        "createdByName": names.get(item["createdById"], "Unknown"),
        "assignedToName": names.get(item["assignedToId"], "Unknown"),
        "proposal": _serialize_proposal(item.get("proposal"), names),
        "messages": [_serialize_message(message, names) for message in item.get("messages", [])],
        "events": [_serialize_event(event, names) for event in item.get("events", [])],
    }
