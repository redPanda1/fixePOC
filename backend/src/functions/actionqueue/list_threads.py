from typing import Any

from repository import list_threads_by_assignee, list_threads_by_org
from responses import json_response
from serialize import serialize_thread_summary


def handle_list_threads(person_id: str, org_id: str, groups: list[str]) -> dict[str, Any]:
    if "admin" in groups:
        items = list_threads_by_assignee(person_id)
    else:
        items = list_threads_by_org(org_id, exclude_agent_proposal=True)
    return json_response(200, {"threads": [serialize_thread_summary(item) for item in items]})
