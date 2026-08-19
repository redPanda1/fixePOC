import os
from typing import Any
from urllib.parse import unquote, urlparse

import boto3
from botocore.config import Config

AVATARS_BUCKET = os.environ["AVATARS_BUCKET"]

_PRESIGN_EXPIRES_SECONDS = 900

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))


def create_download_url(org_id: str | None, file_url: Any) -> str | None:
    # Mirrors profile/avatar_storage.py::create_download_url. Duplicated (not
    # imported) because each Lambda function here is packaged from its own
    # CodeUri directory.
    if not org_id or not file_url:
        return None
    key = _parse_owned_avatar_url(org_id, file_url)
    if key is None:
        return None
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AVATARS_BUCKET, "Key": key},
        ExpiresIn=_PRESIGN_EXPIRES_SECONDS,
    )


def _parse_owned_avatar_url(org_id: str, value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme != "s3" or parsed.netloc != AVATARS_BUCKET or parsed.query or parsed.fragment:
        return None
    try:
        key = unquote(parsed.path.lstrip("/"), errors="strict")
    except UnicodeError:
        return None
    # Tenant isolation: refuse to presign a GET for a key outside the person's own org prefix.
    owned_prefix = f"avatars/{org_id}/"
    if not key.startswith(owned_prefix) or len(key) <= len(owned_prefix):
        return None
    return key
