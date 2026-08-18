import os
from typing import Any

import boto3

NOTIFICATION_EMAIL_FROM = os.environ["NOTIFICATION_EMAIL_FROM"]

_ses = boto3.client("ses")


def send_email(person: dict[str, Any], event: dict[str, Any], url: str) -> None:
    subject = event["subject"]
    preview = event["preview"]
    _ses.send_email(
        Source=NOTIFICATION_EMAIL_FROM,
        Destination={"ToAddresses": [person["email"]]},
        Message={
            "Subject": {"Data": f"FIXE: {subject}"},
            "Body": {
                "Text": {"Data": f"{preview}\n\nView and respond: {url}"},
                "Html": {
                    "Data": f"<p>{preview}</p><p><a href=\"{url}\">View and respond</a></p>"
                },
            },
        },
    )
