import os
import secrets
from datetime import UTC, datetime
from typing import Any

import boto3

from avatar_storage import create_download_url
from cognito_users import (
    CognitoUsersError,
    create_cognito_user,
    list_admin_usernames,
    list_all_users,
    set_user_enabled,
    trigger_password_reset,
)
from responses import json_response
from validation import ValidationError, validate_email, validate_name

PERSON_TABLE_NAME = os.environ["PERSON_TABLE_NAME"]
ORGANIZATION_TABLE_NAME = os.environ["ORGANIZATION_TABLE_NAME"]

_dynamodb = boto3.resource("dynamodb")
_person_table = _dynamodb.Table(PERSON_TABLE_NAME)
_org_table = _dynamodb.Table(ORGANIZATION_TABLE_NAME)


def _now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


def _generate_id(prefix: str) -> str:
    # Same fixed-width, zero-padded, chronologically-sortable format used by
    # actionqueue/ids.py::generate_sortable_id and receipts/repository.py.
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%S%f")
    return f"{prefix}_{timestamp}Z_{secrets.token_hex(4)}"


def _attr(user: dict[str, Any], name: str) -> str | None:
    for entry in user.get("Attributes", []):
        if entry.get("Name") == name:
            return entry.get("Value")
    return None


def _batch_get_persons(person_ids: list[str]) -> dict[str, dict[str, Any]]:
    ids = [pid for pid in person_ids if pid]
    if not ids:
        return {}
    keys = [{"personId": pid} for pid in dict.fromkeys(ids)]
    persons: dict[str, dict[str, Any]] = {}
    # DynamoDB batch_get_item caps at 100 keys per request - plenty at POC scale.
    for start in range(0, len(keys), 100):
        response = _dynamodb.batch_get_item(RequestItems={PERSON_TABLE_NAME: {"Keys": keys[start : start + 100]}})
        for item in response.get("Responses", {}).get(PERSON_TABLE_NAME, []):
            persons[item["personId"]] = item
    return persons


def _get_org_names() -> dict[str, str]:
    # Table is tiny at POC scale, mirrors profile/organization.py::handle_list_organizations.
    result = _org_table.scan()
    return {item["orgId"]: item.get("name") or "" for item in result.get("Items", [])}


def _serialize_user(
    user: dict[str, Any],
    admin_usernames: set[str],
    persons: dict[str, dict[str, Any]],
    org_names: dict[str, str],
) -> dict[str, Any]:
    username = user["Username"]
    person_id = _attr(user, "custom:personId")
    org_id = _attr(user, "custom:orgId")
    person = persons.get(person_id or "")

    return {
        "username": username,
        "email": _attr(user, "email") or username,
        "personId": person_id,
        "orgId": org_id,
        "orgName": org_names.get(org_id or ""),
        "firstName": person.get("firstName") if person else None,
        "lastName": person.get("lastName") if person else None,
        "avatarUrl": create_download_url(org_id, person.get("avatarUrl")) if person else None,
        "isAdmin": username in admin_usernames,
        "enabled": user.get("Enabled", False),
        "cognitoStatus": user.get("UserStatus"),
        "createdAt": user.get("UserCreateDate").isoformat() if user.get("UserCreateDate") else None,
        "hasPersonRecord": person is not None,
    }


def handle_list_users() -> dict[str, Any]:
    cognito_users = list_all_users()
    admin_usernames = list_admin_usernames()
    persons = _batch_get_persons([_attr(user, "custom:personId") for user in cognito_users])
    org_names = _get_org_names()

    items = [_serialize_user(user, admin_usernames, persons, org_names) for user in cognito_users]
    items.sort(key=lambda item: (item["email"] or "").lower())
    return json_response(200, {"users": items})


def _resolve_org(payload: dict[str, Any]) -> tuple[str, str]:
    org_id = payload.get("orgId")
    new_org_name = payload.get("newOrganizationName")

    if isinstance(org_id, str) and org_id.strip():
        result = _org_table.get_item(Key={"orgId": org_id})
        item = result.get("Item")
        if not item:
            raise ValidationError("Selected organization could not be found.")
        return org_id, item.get("name") or ""

    if isinstance(new_org_name, str) and new_org_name.strip():
        name = validate_name(new_org_name, "newOrganizationName", 200)
        new_org_id = _generate_id("org")
        _org_table.put_item(Item={"orgId": new_org_id, "name": name, "updatedAt": _now_iso()})
        return new_org_id, name

    raise ValidationError("Provide either 'orgId' or 'newOrganizationName'.")


def handle_create_user(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        email = validate_email(payload.get("email"))
        first_name = validate_name(payload.get("firstName"), "firstName", 100)
        last_name = validate_name(payload.get("lastName"), "lastName", 100)
        org_id, org_name = _resolve_org(payload)
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    is_admin = bool(payload.get("isAdmin"))
    person_id = _generate_id("person")

    try:
        create_cognito_user(email, person_id, org_id, make_admin=is_admin)
    except CognitoUsersError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    _person_table.put_item(
        Item={
            "personId": person_id,
            "firstName": first_name,
            "lastName": last_name,
            "communicationPreferences": [],
            "updatedAt": _now_iso(),
        }
    )

    return json_response(
        201,
        {
            "username": email,
            "email": email,
            "personId": person_id,
            "orgId": org_id,
            "orgName": org_name,
            "firstName": first_name,
            "lastName": last_name,
            "isAdmin": is_admin,
            "enabled": True,
            "cognitoStatus": "FORCE_CHANGE_PASSWORD",
            "createdAt": _now_iso(),
            "hasPersonRecord": True,
        },
    )


def handle_set_user_status(username: str, payload: dict[str, Any], caller_email: str | None) -> dict[str, Any]:
    if caller_email and username.lower() == caller_email.lower():
        return json_response(400, {"message": "You cannot lock or unlock your own account."})

    enabled = payload.get("enabled")
    if not isinstance(enabled, bool):
        return json_response(400, {"message": "'enabled' must be a boolean."})

    try:
        set_user_enabled(username, enabled)
    except CognitoUsersError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    return json_response(200, {"username": username, "enabled": enabled})


def handle_reset_password(username: str) -> dict[str, Any]:
    try:
        trigger_password_reset(username)
    except CognitoUsersError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    return json_response(200, {"message": "Password reset email sent."})
