from typing import Any

import boto3

_sns = boto3.client("sns")


def send_sms(person: dict[str, Any], event: dict[str, Any], url: str) -> None:
    subject = event["subject"]
    _sns.publish(
        PhoneNumber=person["phoneNumber"],
        Message=f"FIXE: {subject} - {url}",
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {"DataType": "String", "StringValue": "Transactional"},
        },
    )
