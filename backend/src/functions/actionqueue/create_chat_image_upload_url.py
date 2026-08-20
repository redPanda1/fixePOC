from typing import Any

from responses import json_response
from storage import ChatImageStorageError, create_chat_image_upload_url


def handle_create_chat_image_upload_url(groups: list[str], body: dict[str, Any]) -> dict[str, Any]:
    if "admin" not in groups:
        return json_response(403, {"message": "Only Account Managers can upload chat images."})

    org_id = body.get("orgId")
    if not isinstance(org_id, str) or not org_id.strip():
        return json_response(400, {"message": "'orgId' must be a non-empty string"})

    try:
        result = create_chat_image_upload_url(org_id.strip(), body.get("contentType"))
    except ChatImageStorageError as exc:
        return json_response(exc.status_code, {"message": str(exc)})

    return json_response(200, result)
