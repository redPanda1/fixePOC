from typing import Any

from ids import generate_sortable_id, now_iso
from repository import count_agent_proposal_threads, create_thread, find_agent_person_id, list_receipts_by_org
from responses import json_response
from serialize import serialize_thread_detail

# Confidences deliberately span the UI's three confidence bands (green >= .85,
# yellow >= .6, red < .6) so repeated demo clicks show every badge color.
_TEMPLATES: list[dict[str, Any]] = [
    {
        "checkNumber": "1042",
        "vendor": "Ace Plumbing",
        "amount": 350.00,
        "proposedAccount": "Repairs & Maintenance",
        "currentAccount": "Uncategorized Expense",
        "confidence": 0.92,
    },
    {
        "checkNumber": "1058",
        "vendor": "Sunrise Produce Co.",
        "amount": 612.40,
        "proposedAccount": "Cost of Goods Sold - Food",
        "currentAccount": "Uncategorized Expense",
        "confidence": 0.78,
    },
    {
        "checkNumber": "1071",
        "vendor": "City Linen Service",
        "amount": 214.50,
        "proposedAccount": "Laundry & Linen",
        "currentAccount": "Supplies",
        "confidence": 0.61,
    },
    {
        "checkNumber": "1083",
        "vendor": "Bright Spark Electric",
        "amount": 890.00,
        "proposedAccount": "Repairs & Maintenance",
        "currentAccount": "Uncategorized Expense",
        "confidence": 0.55,
    },
]

_MARGINEDGE_EVIDENCE = {
    "type": "link",
    "url": "https://app.marginedge.com/demo-placeholder",
    "label": "View in MarginEdge (demo)",
}


def handle_simulate_agent(person_id: str, groups: list[str], body: dict[str, Any]) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can run the agent simulator."})

    org_id = body.get("orgId")
    if not isinstance(org_id, str) or not org_id.strip():
        return json_response(400, {"message": "'orgId' must be a non-empty string"})

    agent_person_id = find_agent_person_id()
    if agent_person_id is None:
        return json_response(500, {"message": "No agent person is seeded (isAgent=true). See the seed runbook."})

    template_index = count_agent_proposal_threads(org_id) % len(_TEMPLATES)
    template = _TEMPLATES[template_index]

    evidence = [_MARGINEDGE_EVIDENCE]
    receipts = list_receipts_by_org(org_id)
    if receipts:
        latest = receipts[0]
        evidence.insert(
            0,
            {
                "type": "receipt",
                "receiptId": latest["receiptId"],
                "personId": latest["personId"],
                "label": latest.get("vendor") or latest.get("originalFileName") or "Receipt",
            },
        )

    proposed_action = {
        "type": "qbo_categorization",
        "checkNumber": template["checkNumber"],
        "date": now_iso()[:10],
        "amount": template["amount"],
        "vendor": template["vendor"],
        "proposedAccount": template["proposedAccount"],
        "currentAccount": template["currentAccount"],
    }
    subject = f"Categorize check #{template['checkNumber']} — {template['vendor']}"
    summary = (
        f"Proposed: categorize check #{template['checkNumber']} "
        f"({template['vendor']}, ${template['amount']:.2f}) as {template['proposedAccount']}."
    )

    now = now_iso()
    thread_id = generate_sortable_id("thread")
    message = {
        "messageId": generate_sortable_id("msg"),
        "author": agent_person_id,
        "messageType": "user",
        "content": summary,
        "references": [],
        "options": [],
        "selectedOptionId": None,
        "selectedById": None,
        "selectedAt": None,
        "createdAt": now,
    }
    event = {
        "eventId": generate_sortable_id("evt"),
        "actorId": agent_person_id,
        "eventType": "created",
        "fromValue": None,
        "toValue": "created",
        "createdAt": now,
    }
    item = {
        "threadId": thread_id,
        "entryType": "agent_proposal",
        "orgId": org_id,
        "createdById": agent_person_id,
        # Assigned to whoever clicked "Simulate Agent Run" so the demo is
        # immediately visible to its operator, rather than org.defaultAmId.
        "assignedToId": person_id,
        "status": "created",
        "subject": subject,
        "lastMessagePreview": summary[:140],
        "proposal": {
            "proposedAction": proposed_action,
            "confidence": template["confidence"],
            "evidence": evidence,
            "verdict": None,
            "verdictById": None,
            "verdictAt": None,
            "verdictNote": None,
            "editedAction": None,
        },
        "messages": [message],
        "events": [event],
        "createdAt": now,
        "updatedAt": now,
        "readAt": None,
        "archivedAt": None,
    }

    try:
        create_thread(item)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Simulated proposal could not be created"})

    return json_response(201, {"thread": serialize_thread_detail(item)})
