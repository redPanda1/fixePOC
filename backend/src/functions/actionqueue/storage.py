import os

import boto3
from botocore.config import Config

RECEIPTS_BUCKET = os.environ["RECEIPTS_BUCKET"]

s3 = boto3.client("s3", config=Config(signature_version="s3v4"))


def presigned_get_url(key: str, *, expires_seconds: int = 900) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": RECEIPTS_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )
