from typing import Any

from ids import generate_sortable_id, now_iso
from repository import ConcurrencyError, get_thread, render_verdict as repo_render_verdict
from responses import json_response
from serialize import resolve_person_names, serialize_thread_detail
from status import InvalidTransitionError, status_after_verdict

_VERDICT_VERBS = {"approved": "approved", "rejected": "rejected", "modified": "modified and approved"}


def handle_render_verdict(
    thread_id: str, person_id: str, groups: list[str], body: dict[str, Any]
) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can render a verdict."})

    item = get_thread(thread_id)
    if item is None or item["assignedToId"] != person_id or item["entryType"] != "agent_proposal":
        return json_response(404, {"message": "Thread not found."})

    verdict = body.get("verdict")
    if verdict not in _VERDICT_VERBS:
        return json_response(400, {"message": "'verdict' must be 'approved', 'rejected', or 'modified'"})

    edited_action = body.get("editedAction")
    if verdict == "modified" and not isinstance(edited_action, dict):
        return json_response(400, {"message": "'editedAction' is required when verdict is 'modified'"})
    if verdict != "modified":
        edited_action = None

    verdict_note = body.get("verdictNote")
    if verdict_note is not None and not isinstance(verdict_note, str):
        return json_response(400, {"message": "'verdictNote' must be a string"})

    try:
        new_status = status_after_verdict(item["entryType"], item["status"])
    except InvalidTransitionError as exc:
        return json_response(400, {"message": str(exc)})

    now = now_iso()
    am_name = resolve_person_names({person_id}).get(person_id, "The AM")
    system_message = {
        "messageId": generate_sortable_id("msg"),
        "author": person_id,
        "messageType": "system",
        "content": f"{am_name} {_VERDICT_VERBS[verdict]} this proposal.",
        "references": [],
        "options": [],
        "selectedOptionId": None,
        "selectedById": None,
        "selectedAt": None,
        "createdAt": now,
    }
    event = {
        "eventId": generate_sortable_id("evt"),
        "actorId": person_id,
        "eventType": "verdict_rendered",
        "fromValue": item["status"],
        "toValue": new_status,
        "createdAt": now,
    }

    try:
        updated = repo_render_verdict(
            thread_id,
            expected_status=item["status"],
            verdict=verdict,
            verdict_by_id=person_id,
            verdict_at=now,
            verdict_note=verdict_note,
            edited_action=edited_action,
            system_message=system_message,
            event=event,
        )
    except ConcurrencyError as exc:
        return json_response(409, {"message": str(exc)})

    return json_response(200, {"thread": serialize_thread_detail(updated)})
