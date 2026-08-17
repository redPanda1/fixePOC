import os
import secrets
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

RECEIPTS_TABLE = os.environ["RECEIPTS_TABLE"]

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(RECEIPTS_TABLE)


def now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


def generate_receipt_id() -> str:
    # Fixed-width and zero-padded, so lexicographic order matches chronological
    # order - lets list queries sort newest-first without a separate GSI.
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%S%f")
    return f"{timestamp}Z_{secrets.token_hex(4)}"


def put_receipt(item: dict[str, Any]) -> None:
    _table.put_item(Item=_to_dynamo(item))


def get_receipt(person_id: str, receipt_id: str) -> dict[str, Any] | None:
    result = _table.get_item(Key={"personId": person_id, "receiptId": receipt_id})
    item = result.get("Item")
    return _from_dynamo(item) if item else None


def list_receipts(person_id: str) -> list[dict[str, Any]]:
    result = _table.query(
        KeyConditionExpression=Key("personId").eq(person_id),
        ScanIndexForward=False,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def delete_receipt(person_id: str, receipt_id: str) -> None:
    _table.delete_item(Key={"personId": person_id, "receiptId": receipt_id})


def _to_dynamo(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: _to_dynamo(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_to_dynamo(val) for val in value]
    return value


def _from_dynamo(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {key: _from_dynamo(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_from_dynamo(val) for val in value]
    return value
