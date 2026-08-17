import json

from avatar_storage import AvatarStorageError, create_upload_url
from organization import handle_get_organization, handle_list_organizations, handle_update_organization
from person import handle_get_person, handle_update_person
from responses import json_response


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

    if route_key == "GET /person":
        return handle_get_person(person_id, org_id, groups)
    if route_key == "GET /organization":
        return handle_get_organization(org_id)
    if route_key == "GET /organizations":
        if "admin" not in groups:
            return json_response(403, {"message": "Only Account Managers can list organizations."})
        return handle_list_organizations()

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "Request body must be valid JSON."})

    if route_key == "PUT /person":
        return handle_update_person(person_id, org_id, groups, body)
    if route_key == "PUT /organization":
        return handle_update_organization(org_id, body)
    if route_key == "POST /avatars/upload-url":
        return _handle_create_avatar_upload_url(org_id, person_id, body)

    return json_response(404, {"message": "Not found"})


def _handle_create_avatar_upload_url(org_id: str, person_id: str, body: dict) -> dict:
    target = body.get("target")
    if target == "person":
        scope, owner_id = "person", person_id
    elif target == "organization":
        scope, owner_id = "organization", org_id
    else:
        return json_response(400, {"message": "'target' must be 'person' or 'organization'"})

    content_type = body.get("contentType")
    try:
        result = create_upload_url(org_id, scope, owner_id, content_type)
    except AvatarStorageError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    return json_response(200, result)


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
