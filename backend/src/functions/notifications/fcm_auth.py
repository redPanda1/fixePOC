import json
import os
import time
from typing import Any

import boto3
from google.auth.transport.requests import Request
from google.oauth2 import service_account

FCM_SERVICE_ACCOUNT_SECRET_ARN = os.environ["FCM_SERVICE_ACCOUNT_SECRET_ARN"]
_FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

_secrets_client = boto3.client("secretsmanager")

# Cached across warm Lambda invocations - google-auth's Credentials already tracks its own
# expiry and refreshes lazily, so we just need to avoid re-fetching the secret every call.
_credentials: service_account.Credentials | None = None
_project_id: str | None = None


def _load_credentials() -> service_account.Credentials:
    global _credentials, _project_id
    if _credentials is None:
        secret_value = _secrets_client.get_secret_value(SecretId=FCM_SERVICE_ACCOUNT_SECRET_ARN)
        secret_info = json.loads(secret_value["SecretString"])
        # Read the FCM project ID from the service-account JSON itself rather than
        # hardcoding it, so it can never drift out of sync with whichever secret is deployed.
        _project_id = secret_info["project_id"]
        _credentials = service_account.Credentials.from_service_account_info(
            secret_info, scopes=_FCM_SCOPES
        )
    return _credentials


def get_access_token() -> str:
    credentials = _load_credentials()
    if not credentials.valid:
        credentials.refresh(Request())
    return credentials.token


def get_project_id() -> str:
    _load_credentials()
    assert _project_id is not None
    return _project_id
