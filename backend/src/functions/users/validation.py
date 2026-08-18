import re

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(Exception):
    pass


def validate_name(value, field: str, max_len: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field}' must be a non-empty string")
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ValidationError(f"'{field}' must be {max_len} characters or fewer")
    return cleaned


def validate_email(value) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError("'email' must be a non-empty string")
    cleaned = value.strip().lower()
    if not _EMAIL_RE.match(cleaned):
        raise ValidationError("'email' must be a valid email address")
    return cleaned
