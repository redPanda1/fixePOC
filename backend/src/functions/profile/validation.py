class ValidationError(Exception):
    pass


def validate_name(value, field: str, max_len: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field}' must be a non-empty string")
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ValidationError(f"'{field}' must be {max_len} characters or fewer")
    return cleaned


COMMUNICATION_PREFERENCE_CHOICES = frozenset({"email", "textMessage", "fixeApp"})


def validate_communication_preferences(value) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValidationError("'communicationPreferences' must be an array of strings")
    unknown = sorted(set(value) - COMMUNICATION_PREFERENCE_CHOICES)
    if unknown:
        raise ValidationError(f"'communicationPreferences' contains unknown option(s): {', '.join(unknown)}")
    seen: list[str] = []
    for item in value:
        if item not in seen:
            seen.append(item)
    return seen
