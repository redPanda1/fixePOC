import os
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

THREAD_TABLE_NAME = os.environ["THREAD_TABLE_NAME"]
RECEIPTS_TABLE = os.environ["RECEIPTS_TABLE"]
PERSON_TABLE_NAME = os.environ["PERSON_TABLE_NAME"]

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(THREAD_TABLE_NAME)
_receipts_table = _dynamodb.Table(RECEIPTS_TABLE)
_person_table = _dynamodb.Table(PERSON_TABLE_NAME)


class ConcurrencyError(Exception):
    """Raised when a thread's status changed between read and write (optimistic locking)."""


def create_thread(item: dict[str, Any]) -> None:
    _table.put_item(Item=_to_dynamo(item))


def get_thread(thread_id: str) -> dict[str, Any] | None:
    result = _table.get_item(Key={"threadId": thread_id})
    item = result.get("Item")
    return _from_dynamo(item) if item else None


def list_threads_by_assignee(assigned_to_id: str) -> list[dict[str, Any]]:
    result = _table.query(
        IndexName="AssignedToIndex",
        KeyConditionExpression=Key("assignedToId").eq(assigned_to_id),
        ScanIndexForward=False,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def list_threads_by_org(org_id: str, *, exclude_agent_proposal: bool = False) -> list[dict[str, Any]]:
    query_kwargs: dict[str, Any] = {
        "IndexName": "OrgIndex",
        "KeyConditionExpression": Key("orgId").eq(org_id),
        "ScanIndexForward": False,
    }
    if exclude_agent_proposal:
        query_kwargs["FilterExpression"] = "entryType <> :agentProposal"
        query_kwargs["ExpressionAttributeValues"] = {":agentProposal": "agent_proposal"}
    result = _table.query(**query_kwargs)
    return [_from_dynamo(item) for item in result.get("Items", [])]


def list_receipts_by_org(org_id: str) -> list[dict[str, Any]]:
    result = _receipts_table.query(
        IndexName="OrgIndex",
        KeyConditionExpression=Key("orgId").eq(org_id),
        ScanIndexForward=False,  # receiptId is a zero-padded timestamp, so this is newest-first.
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def count_agent_proposal_threads(org_id: str) -> int:
    result = _table.query(
        IndexName="OrgIndex",
        KeyConditionExpression=Key("orgId").eq(org_id),
        FilterExpression="entryType = :agentProposal",
        ExpressionAttributeValues={":agentProposal": "agent_proposal"},
        Select="COUNT",
    )
    return int(result.get("Count", 0))


def find_agent_person_id() -> str | None:
    # Table is tiny at POC scale, so a Scan for the one isAgent-flagged item is fine -
    # there's no access pattern elsewhere that needs "find person by flag," so no GSI exists.
    result = _person_table.scan(FilterExpression="isAgent = :true", ExpressionAttributeValues={":true": True})
    items = result.get("Items", [])
    return items[0]["personId"] if items else None


def _conditional_update(
    thread_id: str,
    *,
    expected_status: str,
    update_expression: str,
    expression_names: dict[str, str],
    expression_values: dict[str, Any],
) -> dict[str, Any]:
    names = {"#status": "status", **expression_names}
    values = {":expectedStatus": expected_status, **expression_values}
    try:
        result = _table.update_item(
            Key={"threadId": thread_id},
            UpdateExpression=update_expression,
            ConditionExpression="#status = :expectedStatus",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=_to_dynamo(values),
            ReturnValues="ALL_NEW",
        )
    except _dynamodb.meta.client.exceptions.ConditionalCheckFailedException as exc:
        raise ConcurrencyError(f"Thread '{thread_id}' status changed; retry with the latest state.") from exc
    return _from_dynamo(result["Attributes"])


def update_status_only(
    thread_id: str, *, expected_status: str, new_status: str, event: dict[str, Any], read_at: str | None = None
) -> dict[str, Any]:
    update_expression = "SET #status = :newStatus, updatedAt = :updatedAt, events = list_append(events, :newEvent)"
    values: dict[str, Any] = {
        ":newStatus": new_status,
        ":updatedAt": event["createdAt"],
        ":newEvent": [event],
    }
    if read_at is not None:
        update_expression += ", readAt = :readAt"
        values[":readAt"] = read_at
    return _conditional_update(
        thread_id,
        expected_status=expected_status,
        update_expression=update_expression,
        expression_names={},
        expression_values=values,
    )


def append_message(
    thread_id: str,
    *,
    expected_status: str,
    new_status: str,
    message: dict[str, Any],
    event: dict[str, Any],
    last_message_preview: str,
) -> dict[str, Any]:
    update_expression = (
        "SET messages = list_append(messages, :newMessage), "
        "events = list_append(events, :newEvent), "
        "#status = :newStatus, updatedAt = :updatedAt, lastMessagePreview = :preview"
    )
    values = {
        ":newMessage": [message],
        ":newEvent": [event],
        ":newStatus": new_status,
        ":updatedAt": event["createdAt"],
        ":preview": last_message_preview,
    }
    return _conditional_update(
        thread_id,
        expected_status=expected_status,
        update_expression=update_expression,
        expression_names={},
        expression_values=values,
    )


def select_option(
    thread_id: str,
    *,
    message_index: int,
    expected_status: str,
    new_status: str,
    option_id: str,
    selected_by_id: str,
    selected_at: str,
    event: dict[str, Any],
) -> dict[str, Any]:
    message_path = f"messages[{message_index}]"
    update_expression = (
        f"SET {message_path}.selectedOptionId = :optionId, "
        f"{message_path}.selectedById = :selectedById, "
        f"{message_path}.selectedAt = :selectedAt, "
        "events = list_append(events, :newEvent), "
        "#status = :newStatus, updatedAt = :updatedAt"
    )
    values = {
        ":optionId": option_id,
        ":selectedById": selected_by_id,
        ":selectedAt": selected_at,
        ":newEvent": [event],
        ":newStatus": new_status,
        ":updatedAt": event["createdAt"],
    }
    # names dict must alias the reserved word "status" only; the list-index path
    # above is a literal document path, not an ExpressionAttributeNames placeholder.
    return _conditional_update(
        thread_id,
        expected_status=expected_status,
        update_expression=update_expression,
        expression_names={},
        expression_values=values,
    )


def set_status(
    thread_id: str,
    *,
    expected_status: str,
    new_status: str,
    event: dict[str, Any],
    archived_at: str | None = None,
) -> dict[str, Any]:
    update_expression = "SET #status = :newStatus, updatedAt = :updatedAt, events = list_append(events, :newEvent)"
    values: dict[str, Any] = {
        ":newStatus": new_status,
        ":updatedAt": event["createdAt"],
        ":newEvent": [event],
    }
    if archived_at is not None:
        update_expression += ", archivedAt = :archivedAt"
        values[":archivedAt"] = archived_at
    return _conditional_update(
        thread_id,
        expected_status=expected_status,
        update_expression=update_expression,
        expression_names={},
        expression_values=values,
    )


def render_verdict(
    thread_id: str,
    *,
    expected_status: str,
    verdict: str,
    verdict_by_id: str,
    verdict_at: str,
    verdict_note: str | None,
    edited_action: dict[str, Any] | None,
    system_message: dict[str, Any],
    event: dict[str, Any],
) -> dict[str, Any]:
    update_expression = (
        "SET proposal.verdict = :verdict, "
        "proposal.verdictById = :verdictById, "
        "proposal.verdictAt = :verdictAt, "
        "proposal.verdictNote = :verdictNote, "
        "proposal.editedAction = :editedAction, "
        "messages = list_append(messages, :newMessage), "
        "events = list_append(events, :newEvent), "
        "#status = :newStatus, updatedAt = :updatedAt"
    )
    values = {
        ":verdict": verdict,
        ":verdictById": verdict_by_id,
        ":verdictAt": verdict_at,
        ":verdictNote": verdict_note,
        ":editedAction": edited_action,
        ":newMessage": [system_message],
        ":newEvent": [event],
        ":newStatus": "complete",
        ":updatedAt": event["createdAt"],
    }
    return _conditional_update(
        thread_id,
        expected_status=expected_status,
        update_expression=update_expression,
        expression_names={},
        expression_values=values,
    )


def _to_dynamo(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: _to_dynamo(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_to_dynamo(val) for val in value]
    return value


def _from_dynamo(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {key: _from_dynamo(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_from_dynamo(val) for val in value]
    return value
