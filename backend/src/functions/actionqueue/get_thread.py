from typing import Any

from ids import generate_sortable_id, now_iso
from repository import ConcurrencyError, get_thread, update_status_only
from responses import json_response
from serialize import serialize_thread_detail
from status import status_after_read


def _authorized(item: dict[str, Any], person_id: str, org_id: str, groups: list[str]) -> bool:
    if "admin" in groups:
        return item["assignedToId"] == person_id
    return item["orgId"] == org_id and item["entryType"] != "agent_proposal"


def handle_get_thread(thread_id: str, person_id: str, org_id: str, groups: list[str]) -> dict[str, Any]:
    item = get_thread(thread_id)
    # 404 (not 403) for both "missing" and "not authorized" so existence isn't leaked.
    if item is None or not _authorized(item, person_id, org_id, groups):
        return json_response(404, {"message": "Thread not found."})

    if person_id == item["assignedToId"]:
        new_status = status_after_read(item["entryType"], item["status"])
        if new_status is not None:
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
                item = update_status_only(
                    thread_id, expected_status=item["status"], new_status=new_status, event=event, read_at=now
                )
            except ConcurrencyError:
                # Someone else already transitioned it - treat as a no-op and re-read.
                item = get_thread(thread_id)

    return json_response(200, {"thread": serialize_thread_detail(item)})
