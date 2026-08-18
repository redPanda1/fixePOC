import os

APP_BASE_URL = os.environ["APP_BASE_URL"]


def build_thread_url(thread_id: str) -> str:
    return f"{APP_BASE_URL.rstrip('/')}/action-queue/{thread_id}"
