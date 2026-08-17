from typing import Any

from storage import presigned_get_url


def _thumbnail_url(record: dict[str, Any]) -> str | None:
    thumbnail_key = record.get("thumbnailKey")
    return presigned_get_url(thumbnail_key) if thumbnail_key else None


def serialize_receipt(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record["receiptId"],
        "orgId": record.get("orgId"),
        "createdAt": record.get("createdAt"),
        "updatedAt": record.get("updatedAt"),
        "contentType": record.get("contentType"),
        "originalFileName": record.get("originalFileName"),
        "analysisStatus": record.get("analysisStatus"),
        "vendor": record.get("vendor"),
        "currency": record.get("currency"),
        "totalAmount": record.get("totalAmount"),
        "receiptDate": record.get("receiptDate"),
        "items": record.get("items", []),
        "confidence": record.get("confidence"),
        "modelId": record.get("modelId"),
        "analysisAttempts": record.get("analysisAttempts", []),
        "analysisError": record.get("analysisError"),
        "imageAccessUrl": presigned_get_url(record["s3Key"]),
        "thumbnailAccessUrl": _thumbnail_url(record),
    }


def serialize_receipt_summary(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record["receiptId"],
        "orgId": record.get("orgId"),
        "vendor": record.get("vendor"),
        "totalAmount": record.get("totalAmount"),
        "currency": record.get("currency"),
        "receiptDate": record.get("receiptDate"),
        "analysisStatus": record.get("analysisStatus"),
        "createdAt": record.get("createdAt"),
        "originalFileName": record.get("originalFileName"),
        "thumbnailAccessUrl": _thumbnail_url(record),
    }
