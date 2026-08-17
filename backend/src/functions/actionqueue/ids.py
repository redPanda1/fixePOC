import secrets
from datetime import UTC, datetime


def now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


def generate_sortable_id(prefix: str) -> str:
    # Fixed-width and zero-padded, so lexicographic order matches chronological
    # order - same generator pattern as receipts/repository.py:generate_receipt_id.
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%S%f")
    return f"{prefix}_{timestamp}Z_{secrets.token_hex(4)}"
