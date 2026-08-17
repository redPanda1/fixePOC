from typing import Any

from analysis import analyze_receipt
from repository import generate_receipt_id, now_iso, put_receipt
from responses import json_response
from serialize import serialize_receipt
from storage import (
    ReceiptValidationError,
    create_thumbnail,
    image_key,
    parse_uploaded_image,
    save_image,
    save_thumbnail,
    thumbnail_key,
)


def handle_create(person_id: str, body: dict[str, Any]) -> dict[str, Any]:
    image_payload = body.get("image")
    if image_payload is None:
        return json_response(400, {"message": "Request body must include an 'image' object."})

    try:
        image = parse_uploaded_image(image_payload)
    except ReceiptValidationError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    receipt_id = generate_receipt_id()
    key = image_key(person_id, receipt_id, image.content_type)

    try:
        save_image(key, image)
    except Exception:  # noqa: BLE001 - keep storage internals out of API responses
        return json_response(500, {"message": "Receipt image could not be stored"})

    thumb_key = thumbnail_key(person_id, receipt_id)
    try:
        save_thumbnail(thumb_key, create_thumbnail(image.data))
    except Exception:  # noqa: BLE001 - a thumbnail failure shouldn't block the upload or analysis
        thumb_key = None

    try:
        analysis, attempts = analyze_receipt(image.data, image.content_type)
    except Exception:  # noqa: BLE001 - an unexpected model error shouldn't lose the upload
        analysis, attempts = None, []

    now = now_iso()
    record: dict[str, Any] = {
        "personId": person_id,
        "receiptId": receipt_id,
        "createdAt": now,
        "updatedAt": now,
        "s3Key": key,
        "thumbnailKey": thumb_key,
        "contentType": image.content_type,
        "originalFileName": image.file_name,
        "fileSizeBytes": len(image.data),
        "analysisAttempts": attempts,
    }
    if analysis is None:
        record.update(
            {
                "analysisStatus": "error",
                "vendor": None,
                "currency": None,
                "totalAmount": None,
                "receiptDate": None,
                "items": [],
                "confidence": None,
                "modelId": None,
                "analysisError": {
                    "code": "analysis_failed",
                    "message": "The receipt could not be analyzed by the configured AI models.",
                },
            }
        )
    else:
        record.update(
            {
                "analysisStatus": analysis["status"],
                "vendor": analysis["vendor"],
                "currency": analysis["currency"],
                "totalAmount": analysis["totalAmount"],
                "receiptDate": analysis["receiptDate"],
                "items": analysis["items"],
                "confidence": analysis["confidence"],
                "modelId": analysis["modelId"],
                "analysisError": analysis["error"],
            }
        )

    try:
        put_receipt(record)
    except Exception:  # noqa: BLE001
        return json_response(500, {"message": "Receipt could not be saved"})

    return json_response(201, {"receipt": serialize_receipt(record)})
