import os
import secrets
from typing import Any
from urllib.parse import unquote, urlparse

import boto3
from botocore.config import Config

AVATARS_BUCKET = os.environ["AVATARS_BUCKET"]

MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
_PRESIGN_EXPIRES_SECONDS = 900

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))


class AvatarStorageError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def create_upload_url(org_id: str, scope: str, owner_id: str, content_type: Any) -> dict[str, Any]:
    if scope not in {"person", "organization"}:
        raise AvatarStorageError("'target' must be 'person' or 'organization'")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AvatarStorageError("Only JPEG, PNG, and WebP avatar images are supported", status_code=415)

    # A random suffix means every upload lands on a fresh key, so there's no
    # collision to resolve and the frontend never has to cache-bust a reused URL.
    extension = _EXTENSIONS[content_type]
    key = f"avatars/{org_id}/{scope}/{owner_id}/{secrets.token_hex(8)}.{extension}"

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": AVATARS_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=_PRESIGN_EXPIRES_SECONDS,
    )

    return {
        "upload_url": upload_url,
        "file_url": f"s3://{AVATARS_BUCKET}/{key}",
        "headers": {"Content-Type": content_type},
        "expires_in": _PRESIGN_EXPIRES_SECONDS,
    }


def create_download_url(org_id: str, file_url: Any) -> str | None:
    if not file_url:
        return None
    key = _parse_owned_avatar_url(org_id, file_url)
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AVATARS_BUCKET, "Key": key},
        ExpiresIn=_PRESIGN_EXPIRES_SECONDS,
    )


def _parse_owned_avatar_url(org_id: str, value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AvatarStorageError("Stored avatar URL is invalid", status_code=500)
    parsed = urlparse(value.strip())
    if parsed.scheme != "s3" or parsed.netloc != AVATARS_BUCKET or parsed.query or parsed.fragment:
        raise AvatarStorageError("Stored avatar URL is invalid", status_code=500)
    try:
        key = unquote(parsed.path.lstrip("/"), errors="strict")
    except UnicodeError as exc:
        raise AvatarStorageError("Stored avatar URL is invalid", status_code=500) from exc
    # Tenant isolation: refuse to presign a GET for a key outside the caller's own org prefix.
    owned_prefix = f"avatars/{org_id}/"
    if not key.startswith(owned_prefix) or len(key) <= len(owned_prefix):
        raise AvatarStorageError("Stored avatar URL does not belong to this organization", status_code=403)
    return key
