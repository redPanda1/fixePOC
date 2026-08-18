import logging
from typing import Any

from deep_link import build_thread_url
from email_channel import send_email
from push import send_push
from recipients import resolve_recipients
from sms import send_sms

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict[str, Any], _context) -> None:
    # Invoked asynchronously (InvocationType="Event") from the ActionQueue function - there's
    # no caller waiting on a response, so failures are handled per-channel below and only
    # ever surfaced via CloudWatch logs, never raised out of this handler.
    org_id = event["orgId"]
    thread_id = event.get("threadId")
    recipients = resolve_recipients(org_id)
    logger.info(
        "Notifying %d recipient(s) for orgId=%s threadId=%s", len(recipients), org_id, thread_id
    )
    for person in recipients:
        _notify_one(person, event)


def _notify_one(person: dict[str, Any], event: dict[str, Any]) -> None:
    preferences = person.get("communicationPreferences") or []
    url = build_thread_url(event["threadId"])
    person_id = person.get("personId")

    if not preferences:
        logger.info("personId=%s has no communicationPreferences configured - nothing to send", person_id)
        return

    if "email" in preferences:
        if person.get("email"):
            _try_channel("email", person, event, send_email, person, event, url)
        else:
            logger.info("Skipping email for personId=%s - no email on file", person_id)
    if "textMessage" in preferences:
        if person.get("phoneNumber"):
            _try_channel("sms", person, event, send_sms, person, event, url)
        else:
            logger.info("Skipping sms for personId=%s - no phoneNumber on file", person_id)
    if "fixeApp" in preferences:
        if person.get("fcmDeviceToken"):
            _try_channel("push", person, event, send_push, person, event, url)
        else:
            logger.info("Skipping push for personId=%s - no fcmDeviceToken on file", person_id)


def _try_channel(
    channel: str, person: dict[str, Any], event: dict[str, Any], send_fn, *args: Any
) -> None:
    try:
        send_fn(*args)
    except Exception:
        # One channel failing (bad token, unverified SES recipient, etc.) must never
        # block the others - log and move on rather than letting this propagate.
        logger.exception(
            "Notification channel '%s' failed for personId=%s threadId=%s",
            channel,
            person.get("personId"),
            event.get("threadId"),
        )
    else:
        logger.info(
            "Notification channel '%s' sent for personId=%s threadId=%s",
            channel,
            person.get("personId"),
            event.get("threadId"),
        )
