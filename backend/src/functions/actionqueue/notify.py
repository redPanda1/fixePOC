import json
import logging
import os

import boto3

NOTIFICATION_FUNCTION_NAME = os.environ["NOTIFICATION_FUNCTION_NAME"]

logger = logging.getLogger()
_lambda = boto3.client("lambda")


def notify_customer_input_needed(*, thread_id: str, org_id: str, subject: str, preview: str) -> None:
    payload = {"threadId": thread_id, "orgId": org_id, "subject": subject, "preview": preview}
    try:
        _lambda.invoke(
            FunctionName=NOTIFICATION_FUNCTION_NAME,
            InvocationType="Event",
            Payload=json.dumps(payload).encode(),
        )
    except Exception:
        # Never let a notification-trigger failure fail or delay the admin's request.
        logger.exception("Failed to trigger NotificationFunction for threadId=%s", thread_id)
