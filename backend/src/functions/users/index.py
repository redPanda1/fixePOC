import json

from responses import json_response
from users import handle_create_user, handle_list_users, handle_reset_password, handle_set_user_status


def handler(event, _context):
    claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
    caller_email = claims.get("email")
    groups = _parse_groups(claims.get("cognito:groups"))

    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can manage users."})

    route_key = event["requestContext"]["routeKey"]
    path_params = event.get("pathParameters") or {}

    if route_key == "GET /users":
        return handle_list_users()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "Request body must be valid JSON."})

    if route_key == "POST /users":
        return handle_create_user(body)
    if route_key == "PUT /users/{username}/status":
        return handle_set_user_status(path_params["username"], body, caller_email)
    if route_key == "POST /users/{username}/reset-password":
        return handle_reset_password(path_params["username"])

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
