from typing import Any

from ids import generate_sortable_id, now_iso
from repository import ConcurrencyError, get_thread, select_option as repo_select_option
from responses import json_response
from serialize import serialize_thread_detail
from status import InvalidTransitionError, status_after_option_select


def handle_select_option(
    thread_id: str, message_id: str, person_id: str, org_id: str, groups: list[str], body: dict[str, Any]
) -> dict[str, Any]:
    # Only customers select options - the AM/customer chat pane only ever renders
    # chips for the AM to read, per the spec's UI description.
    if "admin" in groups:
        return json_response(403, {"message": "Only the customer can select an option."})

    item = get_thread(thread_id)
    if item is None or item["orgId"] != org_id or item["entryType"] == "agent_proposal":
        return json_response(404, {"message": "Thread not found."})

    option_id = body.get("optionId")
    if not isinstance(option_id, str) or not option_id.strip():
        return json_response(400, {"message": "'optionId' must be a non-empty string"})

    message_index = next(
        (idx for idx, message in enumerate(item["messages"]) if message["messageId"] == message_id), None
    )
    if message_index is None:
        return json_response(404, {"message": "Message not found."})

    message = item["messages"][message_index]
    if message["author"] == person_id:
        return json_response(400, {"message": "You cannot select an option on your own message."})
    if message.get("selectedOptionId") is not None:
        return json_response(409, {"message": "This question has already been answered."})
    if option_id not in {option["id"] for option in message.get("options", [])}:
        return json_response(400, {"message": "'optionId' does not match any option on this message."})

    try:
        new_status = status_after_option_select(item["entryType"], item["status"])
    except InvalidTransitionError as exc:
        return json_response(400, {"message": str(exc)})

    now = now_iso()
    event = {
        "eventId": generate_sortable_id("evt"),
        "actorId": person_id,
        "eventType": "option_selected",
        "fromValue": item["status"],
        "toValue": new_status,
        "createdAt": now,
    }

    try:
        updated = repo_select_option(
            thread_id,
            message_index=message_index,
            expected_status=item["status"],
            new_status=new_status,
            option_id=option_id,
            selected_by_id=person_id,
            selected_at=now,
            event=event,
        )
    except ConcurrencyError as exc:
        return json_response(409, {"message": str(exc)})

    return json_response(200, {"thread": serialize_thread_detail(updated)})
