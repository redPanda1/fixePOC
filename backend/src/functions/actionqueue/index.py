import json

from add_message import handle_add_message
from create_chat_image_upload_url import handle_create_chat_image_upload_url
from create_thread import handle_create_thread
from get_thread import handle_get_thread
from list_org_receipts import handle_list_org_receipts
from list_threads import handle_list_threads
from render_verdict import handle_render_verdict
from responses import json_response
from select_option import handle_select_option
from set_status import handle_set_status
from simulate_agent import handle_simulate_agent


def handler(event, _context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    person_id = claims.get("custom:personId")
    org_id = claims.get("custom:orgId")
    if not person_id:
        return json_response(400, {"message": "Authenticated user is missing personId."})
    if not org_id:
        return json_response(400, {"message": "Authenticated user is missing orgId."})

    groups = _parse_groups(claims.get("cognito:groups"))
    route_key = event["requestContext"]["routeKey"]
    path_params = event.get("pathParameters") or {}

    if route_key == "GET /action-queue/threads":
        return handle_list_threads(person_id, org_id, groups)
    if route_key == "GET /action-queue/threads/{threadId}":
        return handle_get_thread(path_params["threadId"], person_id, org_id, groups)
    if route_key == "GET /action-queue/receipts":
        query_params = event.get("queryStringParameters") or {}
        return handle_list_org_receipts(query_params.get("orgId"), groups)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "Request body must be valid JSON."})

    if route_key == "POST /action-queue/threads":
        return handle_create_thread(person_id, groups, body)
    if route_key == "POST /action-queue/chat-images/upload-url":
        return handle_create_chat_image_upload_url(groups, body)
    if route_key == "POST /action-queue/threads/{threadId}/messages":
        return handle_add_message(path_params["threadId"], person_id, org_id, groups, body)
    if route_key == "POST /action-queue/threads/{threadId}/messages/{messageId}/select":
        return handle_select_option(
            path_params["threadId"], path_params["messageId"], person_id, org_id, groups, body
        )
    if route_key == "POST /action-queue/threads/{threadId}/status":
        return handle_set_status(path_params["threadId"], person_id, groups, body)
    if route_key == "POST /action-queue/threads/{threadId}/verdict":
        return handle_render_verdict(path_params["threadId"], person_id, groups, body)
    if route_key == "POST /action-queue/simulate-agent":
        return handle_simulate_agent(person_id, groups, body)

    return json_response(404, {"message": "Not found"})


def _parse_groups(groups_claim) -> list[str]:
    if isinstance(groups_claim, list):
        return groups_claim
    if isinstance(groups_claim, str):
        return [
            group.strip()
            for group in groups_claim.replace("[", "").replace("]", "").split(",")
            if group.strip()
        ]
    return []
