from typing import Any

import requests

from fcm_auth import get_access_token, get_project_id


def send_push(person: dict[str, Any], event: dict[str, Any], url: str) -> None:
    token = get_access_token()
    fcm_url = f"https://fcm.googleapis.com/v1/projects/{get_project_id()}/messages:send"
    response = requests.post(
        fcm_url,
        headers={"Authorization": f"Bearer {token}"},
        json={
            "message": {
                "token": person["fcmDeviceToken"],
                "notification": {"title": "FIXE", "body": event["preview"]},
                "data": {"threadId": event["threadId"], "url": url},
            }
        },
        timeout=5,
    )
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as err:
        raise requests.exceptions.HTTPError(f"{err}: {response.text}", response=response) from err
