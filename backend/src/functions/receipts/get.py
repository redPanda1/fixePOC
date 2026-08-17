from typing import Any

from repository import get_receipt
from responses import json_response
from serialize import serialize_receipt


def handle_get(person_id: str, receipt_id: str) -> dict[str, Any]:
    try:
        record = get_receipt(person_id, receipt_id)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Receipt could not be loaded"})
    if record is None:
        return json_response(404, {"message": "Receipt was not found"})
    return json_response(200, {"receipt": serialize_receipt(record)})
