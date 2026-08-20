import os
import secrets
from typing import Any

import boto3
from botocore.config import Config

RECEIPTS_BUCKET = os.environ["RECEIPTS_BUCKET"]

ALLOWED_CHAT_IMAGE_CONTENT_TYPES = frozenset({"image/png"})
_CHAT_IMAGE_PRESIGN_EXPIRES_SECONDS = 900

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))


class ChatImageStorageError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def presigned_get_url(key: str, *, expires_seconds: int = 900) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": RECEIPTS_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )


def create_chat_image_upload_url(org_id: str, content_type: Any) -> dict[str, Any]:
    if content_type not in ALLOWED_CHAT_IMAGE_CONTENT_TYPES:
        raise ChatImageStorageError("Only PNG chat images are supported", status_code=415)

    # A random suffix means every capture lands on a fresh key, mirroring the avatar
    # upload pattern - see profile/avatar_storage.py.
    key = f"chat_images/{org_id}/{secrets.token_hex(16)}.png"

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": RECEIPTS_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=_CHAT_IMAGE_PRESIGN_EXPIRES_SECONDS,
    )

    return {
        "upload_url": upload_url,
        "key": key,
        "expires_in": _CHAT_IMAGE_PRESIGN_EXPIRES_SECONDS,
    }
