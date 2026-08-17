from typing import Any

from repository import list_receipts
from responses import json_response
from serialize import serialize_receipt_summary


def handle_list(person_id: str) -> dict[str, Any]:
    try:
        records = list_receipts(person_id)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Receipts could not be loaded"})
    return json_response(200, {"receipts": [serialize_receipt_summary(record) for record in records]})
