from typing import Any

ENTRY_TYPES = {"question", "action", "agent_proposal"}
REFERENCE_TYPES = {"receipt", "link"}


class ValidationError(Exception):
    pass


def validate_text(value: Any, field: str, max_len: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field}' must be a non-empty string")
    cleaned = value.strip()
    if len(cleaned) > max_len:
        raise ValidationError(f"'{field}' must be {max_len} characters or fewer")
    return cleaned


def validate_entry_type(value: Any) -> str:
    if value is None:
        return "question"
    if value not in ENTRY_TYPES - {"agent_proposal"}:
        raise ValidationError("'entryType' must be 'question' or 'action'")
    return value


def validate_references(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValidationError("'references' must be a list")
    references: list[dict[str, Any]] = []
    for raw in value:
        if not isinstance(raw, dict):
            raise ValidationError("Each reference must be an object")
        ref_type = raw.get("type")
        if ref_type not in REFERENCE_TYPES:
            raise ValidationError("Each reference's 'type' must be 'receipt' or 'link'")
        label = raw.get("label")
        if label is not None and not isinstance(label, str):
            raise ValidationError("A reference's 'label' must be a string")
        if ref_type == "receipt":
            receipt_id = raw.get("receiptId")
            person_id = raw.get("personId")
            if not isinstance(receipt_id, str) or not receipt_id.strip():
                raise ValidationError("A receipt reference must include a non-empty 'receiptId'")
            if not isinstance(person_id, str) or not person_id.strip():
                raise ValidationError("A receipt reference must include a non-empty 'personId'")
            references.append({"type": "receipt", "receiptId": receipt_id, "personId": person_id, "label": label})
        else:
            url = raw.get("url")
            if not isinstance(url, str) or not url.strip():
                raise ValidationError("A link reference must include a non-empty 'url'")
            references.append({"type": "link", "url": url.strip(), "label": label})
    return references


def validate_options(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValidationError("'options' must be a list")
    options: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw in value:
        if not isinstance(raw, dict):
            raise ValidationError("Each option must be an object")
        option_id = validate_text(raw.get("id"), "option.id", 50)
        label = validate_text(raw.get("label"), "option.label", 200)
        option_value = raw.get("value")
        if not isinstance(option_value, str) or not option_value.strip():
            raise ValidationError("Each option's 'value' must be a non-empty string")
        if option_id in seen_ids:
            raise ValidationError(f"Duplicate option id '{option_id}'")
        seen_ids.add(option_id)
        options.append({"id": option_id, "label": label, "value": option_value.strip()})
    return options
