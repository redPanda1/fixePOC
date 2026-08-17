from typing import Any

from ids import generate_sortable_id, now_iso
from repository import ConcurrencyError, get_thread, set_status as repo_set_status
from responses import json_response
from serialize import serialize_thread_detail
from status import InvalidTransitionError, assert_manual_transition_allowed


def handle_set_status(
    thread_id: str, person_id: str, groups: list[str], body: dict[str, Any]
) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can change thread status."})

    item = get_thread(thread_id)
    if item is None or item["assignedToId"] != person_id:
        return json_response(404, {"message": "Thread not found."})

    new_status = body.get("status")
    if not isinstance(new_status, str) or not new_status.strip():
        return json_response(400, {"message": "'status' must be a non-empty string"})

    try:
        assert_manual_transition_allowed(item["entryType"], item["status"], new_status)
    except InvalidTransitionError as exc:
        return json_response(400, {"message": str(exc)})

    now = now_iso()
    event = {
        "eventId": generate_sortable_id("evt"),
        "actorId": person_id,
        "eventType": "status_change",
        "fromValue": item["status"],
        "toValue": new_status,
        "createdAt": now,
    }

    try:
        updated = repo_set_status(
            thread_id,
            expected_status=item["status"],
            new_status=new_status,
            event=event,
            archived_at=now if new_status == "archived" else None,
        )
    except ConcurrencyError as exc:
        return json_response(409, {"message": str(exc)})

    return json_response(200, {"thread": serialize_thread_detail(updated)})
