from typing import Any

from repository import list_receipts_by_org
from responses import json_response
from storage import presigned_get_url


def _serialize_picker_receipt(record: dict[str, Any]) -> dict[str, Any]:
    thumbnail_key = record.get("thumbnailKey")
    return {
        "receiptId": record["receiptId"],
        "personId": record["personId"],
        "vendor": record.get("vendor"),
        "totalAmount": record.get("totalAmount"),
        "currency": record.get("currency"),
        "receiptDate": record.get("receiptDate"),
        "originalFileName": record.get("originalFileName"),
        "thumbnailAccessUrl": presigned_get_url(thumbnail_key) if thumbnail_key else None,
    }


def handle_list_org_receipts(org_id_param: str | None, groups: list[str]) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can browse receipts by org."})
    if not org_id_param:
        return json_response(400, {"message": "Query parameter 'orgId' is required."})

    records = list_receipts_by_org(org_id_param)
    return json_response(200, {"receipts": [_serialize_picker_receipt(record) for record in records]})
