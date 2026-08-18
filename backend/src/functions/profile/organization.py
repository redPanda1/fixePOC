import os
from datetime import UTC, datetime
from typing import Any

import boto3

from avatar_storage import create_download_url
from responses import json_response
from validation import ValidationError, validate_name

ORGANIZATION_TABLE_NAME = os.environ["ORGANIZATION_TABLE_NAME"]

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(ORGANIZATION_TABLE_NAME)


def _now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


def _serialize(org_id: str, item: dict[str, Any] | None) -> dict[str, Any]:
    item = item or {}
    return {
        "orgId": org_id,
        "name": item.get("name") or "",
        "avatarUrl": create_download_url(org_id, item.get("avatarUrl")),
        "defaultAmId": item.get("defaultAmId"),
    }


def handle_get_organization(org_id: str) -> dict[str, Any]:
    result = _table.get_item(Key={"orgId": org_id})
    return json_response(200, _serialize(org_id, result.get("Item")))


def handle_list_organizations() -> dict[str, Any]:
    # Table is tiny at POC scale, so a full Scan is acceptable here - there's no
    # access pattern elsewhere in the app that needs "every org," so no GSI exists.
    result = _table.scan()
    orgs = [
        {
            "orgId": item["orgId"],
            "name": item.get("name") or "",
            "avatarUrl": create_download_url(item["orgId"], item.get("avatarUrl")),
            "defaultAmId": item.get("defaultAmId"),
        }
        for item in result.get("Items", [])
        if item.get("isInternal") is not True
    ]
    orgs.sort(key=lambda org: org["name"])
    return json_response(200, {"organizations": orgs})


def handle_update_organization(org_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        name = validate_name(payload.get("name"), "name", 200)
    except ValidationError as exc:
        return json_response(400, {"message": str(exc)})

    avatar_url = payload.get("avatarUrl")
    if avatar_url is not None and not isinstance(avatar_url, str):
        return json_response(400, {"message": "'avatarUrl' must be a string"})

    # "name" is a DynamoDB reserved word, so it must be aliased via ExpressionAttributeNames.
    update_expression = "SET #name = :name, updatedAt = :updatedAt"
    expression_names = {"#name": "name"}
    expression_values: dict[str, Any] = {":name": name, ":updatedAt": _now_iso()}
    if avatar_url:
        update_expression += ", avatarUrl = :avatarUrl"
        expression_values[":avatarUrl"] = avatar_url

    try:
        result = _table.update_item(
            Key={"orgId": org_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW",
        )
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Organization record could not be saved"})

    return json_response(200, _serialize(org_id, result["Attributes"]))
