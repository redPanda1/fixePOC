from typing import Any

from ids import generate_sortable_id, now_iso
from notify import notify_customer_input_needed
from repository import create_thread as repo_create_thread
from responses import json_response
from serialize import serialize_thread_detail
from validation import ValidationError, validate_entry_type, validate_options, validate_references, validate_text


def handle_create_thread(person_id: str, groups: list[str], body: dict[str, Any]) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can create threads."})

    try:
        org_id = validate_text(body.get("orgId"), "orgId", 100)
        assigned_to_id = validate_text(body.get("assignedToId"), "assignedToId", 100)
        subject = validate_text(body.get("subject"), "subject", 200)
        content = validate_text(body.get("body"), "body", 4000)
        entry_type = validate_entry_type(body.get("entryType"))
        references = validate_references(body.get("references"), org_id)
        options = validate_options(body.get("options"))
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    now = now_iso()
    thread_id = generate_sortable_id("thread")
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
        "eventType": "created",
        "fromValue": None,
        "toValue": "waiting_on_customer",
        "createdAt": now,
    }
    item = {
        "threadId": thread_id,
        "entryType": entry_type,
        "orgId": org_id,
        "createdById": person_id,
        "assignedToId": assigned_to_id,
        # The AM's first message is what creates the thread, so it starts already
        # waiting on the customer - see status.py for the simplified state machine.
        "status": "waiting_on_customer",
        "subject": subject,
        "lastMessagePreview": content[:140],
        "proposal": None,
        "messages": [message],
        "events": [event],
        "createdAt": now,
        "updatedAt": now,
        "readAt": None,
        "archivedAt": None,
    }

    try:
        repo_create_thread(item)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Thread could not be created"})

    # New threads always start waiting_on_customer (see comment above), so the customer
    # always needs to be notified here.
    notify_customer_input_needed(thread_id=thread_id, org_id=org_id, subject=subject, preview=content[:140])

    return json_response(201, {"thread": serialize_thread_detail(item)})
