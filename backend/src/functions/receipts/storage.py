import os
from dataclasses import dataclass
from typing import Any

import boto3
from botocore.config import Config

RECEIPTS_BUCKET = os.environ["RECEIPTS_BUCKET"]

MAX_RECEIPT_IMAGE_BYTES = int(3.5 * 1024 * 1024)
ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))


class ReceiptValidationError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class ReceiptImage:
    file_name: str
    content_type: str
    data: bytes


def parse_uploaded_image(payload: Any) -> ReceiptImage:
    import base64
    import binascii

    if not isinstance(payload, dict):
        raise ReceiptValidationError("'image' must be an object")

    file_name = payload.get("file_name")
    content_type = payload.get("content_type")
    encoded = payload.get("data_base64")

    if not isinstance(file_name, str) or not file_name.strip() or len(file_name.encode("utf-8")) > 255:
        raise ReceiptValidationError("'image.file_name' must be 1 to 255 characters")
    if "/" in file_name or "\\" in file_name or file_name in {".", ".."}:
        raise ReceiptValidationError("'image.file_name' must not contain a path")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ReceiptValidationError("Only JPEG, PNG, and WebP receipt images are supported", status_code=415)
    if not isinstance(encoded, str) or not encoded:
        raise ReceiptValidationError("'image.data_base64' must be a non-empty base64 string")

    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ReceiptValidationError("'image.data_base64' must contain valid base64") from exc

    _validate_image_bytes(data, content_type)
    return ReceiptImage(file_name.strip(), content_type, data)


def _validate_image_bytes(data: bytes, content_type: str) -> None:
    if not data:
        raise ReceiptValidationError("The receipt image must not be empty")
    if len(data) > MAX_RECEIPT_IMAGE_BYTES:
        raise ReceiptValidationError("The receipt image must be 3.5 MiB or smaller", status_code=413)
    if _detect_content_type(data) != content_type:
        raise ReceiptValidationError("The uploaded file contents do not match its image type", status_code=415)


def _detect_content_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return None


_THUMBNAIL_MAX_DIMENSION = 240


def image_key(person_id: str, receipt_id: str, content_type: str) -> str:
    return f"{person_id}/receipts/{receipt_id}.{_EXTENSIONS[content_type]}"


def thumbnail_key(person_id: str, receipt_id: str) -> str:
    return f"{person_id}/receipts/thumbnails/{receipt_id}.jpg"


def save_image(key: str, image: ReceiptImage) -> None:
    s3.put_object(
        Bucket=RECEIPTS_BUCKET,
        Key=key,
        Body=image.data,
        ContentType=image.content_type,
        ServerSideEncryption="AES256",
    )


def create_thumbnail(data: bytes) -> bytes:
    from io import BytesIO

    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        with Image.open(BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail((_THUMBNAIL_MAX_DIMENSION, _THUMBNAIL_MAX_DIMENSION), Image.Resampling.LANCZOS)
            if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
                rgba = image.convert("RGBA")
                flattened = Image.new("RGB", rgba.size, "white")
                flattened.paste(rgba, mask=rgba.getchannel("A"))
                image = flattened
            else:
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, format="JPEG", quality=80, optimize=True)
            return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ReceiptValidationError("The receipt image could not be decoded", status_code=415) from exc


def save_thumbnail(key: str, data: bytes) -> None:
    s3.put_object(
        Bucket=RECEIPTS_BUCKET,
        Key=key,
        Body=data,
        ContentType="image/jpeg",
        ServerSideEncryption="AES256",
    )


def presigned_get_url(key: str, *, expires_seconds: int = 900) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": RECEIPTS_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )


def delete_image(key: str) -> None:
    s3.delete_object(Bucket=RECEIPTS_BUCKET, Key=key)
