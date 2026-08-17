from typing import Any

from repository import delete_receipt, get_receipt
from responses import empty_response, json_response
from storage import delete_image


def handle_delete(person_id: str, receipt_id: str) -> dict[str, Any]:
    try:
        record = get_receipt(person_id, receipt_id)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Receipt could not be deleted"})
    if record is None:
        return json_response(404, {"message": "Receipt was not found"})

    try:
        delete_image(record["s3Key"])
        if record.get("thumbnailKey"):
            delete_image(record["thumbnailKey"])
    except Exception:  # noqa: BLE001 - the DynamoDB record is authoritative; orphaned
        pass  # S3 objects can be cleaned up separately rather than blocking the delete.

    try:
        delete_receipt(person_id, receipt_id)
    except Exception:  # noqa: BLE001
        return json_response(500, {"message": "Receipt could not be deleted"})

    return empty_response(204)
