class ValidationError(Exception):
    pass


def validate_name(value, field: str, max_len: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field}' must be a non-empty string")
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ValidationError(f"'{field}' must be {max_len} characters or fewer")
    return cleaned
