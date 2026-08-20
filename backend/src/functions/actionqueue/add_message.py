from typing import Any

from ids import generate_sortable_id, now_iso
from notify import notify_customer_input_needed
from repository import ConcurrencyError, append_message, get_thread
from responses import json_response
from serialize import serialize_thread_detail
from status import InvalidTransitionError, status_after_message
from validation import ValidationError, validate_options, validate_references, validate_text


def _authorized(item: dict[str, Any], person_id: str, org_id: str, groups: list[str]) -> bool:
    if "admin" in groups:
        return item["assignedToId"] == person_id
    return item["orgId"] == org_id and item["entryType"] != "agent_proposal"


def handle_add_message(
    thread_id: str, person_id: str, org_id: str, groups: list[str], body: dict[str, Any]
) -> dict[str, Any]:
    item = get_thread(thread_id)
    if item is None or not _authorized(item, person_id, org_id, groups):
        return json_response(404, {"message": "Thread not found."})

    if item["entryType"] == "agent_proposal":
        return json_response(400, {"message": "Agent-proposal threads use the verdict endpoint, not messages."})

    try:
        content = validate_text(body.get("content"), "content", 4000)
        references = validate_references(body.get("references"), item["orgId"])
        options = validate_options(body.get("options"))
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    actor_role = "am" if "admin" in groups else "customer"
    try:
        new_status = status_after_message(item["entryType"], item["status"], actor_role)
    except InvalidTransitionError as exc:
        return json_response(400, {"message": str(exc)})

    now = now_iso()
    message = {
        "messageId": generate_sortable_id("msg"),
        "author": person_id,
        "messageType": "user",
        "content": content,
        "references": references,
        "options": options,
        "selectedOptionId": None,
        "selectedById": None,
        "selectedAt": None,
        "createdAt": now,
    }
    event = {
        "eventId": generate_sortable_id("evt"),
        "actorId": person_id,
        "eventType": "message_added",
        "fromValue": item["status"],
        "toValue": new_status,
        "createdAt": now,
    }

    try:
        updated = append_message(
            thread_id,
            expected_status=item["status"],
            new_status=new_status,
            message=message,
            event=event,
            last_message_preview=content[:140],
        )
    except ConcurrencyError as exc:
        return json_response(409, {"message": str(exc)})

    if actor_role == "am":
        # Notify on every AM-authored message, not just ones that flip the status - even
        # if the thread was already waiting_on_customer, the customer hasn't seen this
        # new content yet (see status_after_message()'s no-op-transition comment).
        notify_customer_input_needed(
            thread_id=thread_id, org_id=item["orgId"], subject=item["subject"], preview=content[:140]
        )

    return json_response(200, {"thread": serialize_thread_detail(updated)})
