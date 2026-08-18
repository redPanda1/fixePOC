import os
from datetime import UTC, datetime
from typing import Any

import boto3

from avatar_storage import create_download_url
from responses import json_response
from validation import (
    ValidationError,
    validate_communication_preferences,
    validate_device_token,
    validate_name,
    validate_phone_number,
)

PERSON_TABLE_NAME = os.environ["PERSON_TABLE_NAME"]

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(PERSON_TABLE_NAME)


def _now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


def _user_type(groups: list[str]) -> str:
    return "ADMIN" if "admin" in groups else "USER"


def _serialize(item: dict[str, Any], org_id: str, groups: list[str]) -> dict[str, Any]:
    return {
        **item,
        "avatarUrl": create_download_url(org_id, item.get("avatarUrl")),
        "userType": _user_type(groups),
        "communicationPreferences": item.get("communicationPreferences", []),
        "phoneNumber": item.get("phoneNumber"),
    }


def handle_get_person(person_id: str, org_id: str, groups: list[str]) -> dict[str, Any]:
    result = _table.get_item(Key={"personId": person_id})
    item = result.get("Item")
    if not item:
        return json_response(404, {"message": "Person record not found."})
    return json_response(200, _serialize(item, org_id, groups))


def handle_update_person(
    person_id: str, org_id: str, groups: list[str], payload: dict[str, Any]
) -> dict[str, Any]:
    try:
        first_name = validate_name(payload.get("firstName"), "firstName", 100)
        last_name = validate_name(payload.get("lastName"), "lastName", 100)
        communication_preferences = None
        if "communicationPreferences" in payload:
            communication_preferences = validate_communication_preferences(
                payload["communicationPreferences"]
            )
        phone_number = None
        phone_number_provided = "phoneNumber" in payload
        if phone_number_provided:
            phone_number = validate_phone_number(payload["phoneNumber"])
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    avatar_url = payload.get("avatarUrl")
    if avatar_url is not None and not isinstance(avatar_url, str):
        return json_response(400, {"message": "'avatarUrl' must be a string"})

    update_expression = "SET firstName = :firstName, lastName = :lastName, updatedAt = :updatedAt"
    expression_values: dict[str, Any] = {
        ":firstName": first_name,
        ":lastName": last_name,
        ":updatedAt": _now_iso(),
    }
    if avatar_url:
        update_expression += ", avatarUrl = :avatarUrl"
        expression_values[":avatarUrl"] = avatar_url
    if communication_preferences is not None:
        update_expression += ", communicationPreferences = :communicationPreferences"
        expression_values[":communicationPreferences"] = communication_preferences
    if phone_number_provided:
        update_expression += ", phoneNumber = :phoneNumber"
        expression_values[":phoneNumber"] = phone_number

    try:
        result = _table.update_item(
            Key={"personId": person_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW",
        )
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Person record could not be saved"})

    return json_response(200, _serialize(result["Attributes"], org_id, groups))


def handle_update_device_token(person_id: str, org_id: str, groups: list[str], payload: dict[str, Any]) -> dict[str, Any]:
    try:
        device_token = validate_device_token(payload.get("fcmDeviceToken"))
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    try:
        result = _table.update_item(
            Key={"personId": person_id},
            UpdateExpression="SET fcmDeviceToken = :fcmDeviceToken, updatedAt = :updatedAt",
            ExpressionAttributeValues={":fcmDeviceToken": device_token, ":updatedAt": _now_iso()},
            ReturnValues="ALL_NEW",
        )
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Device token could not be saved"})

    return json_response(200, _serialize(result["Attributes"], org_id, groups))
