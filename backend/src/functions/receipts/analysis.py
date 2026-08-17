import json
import os
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

NOVA_MODEL_ID = os.environ["NOVA_MODEL_ID"]
CLAUDE_MODEL_ID = os.environ["CLAUDE_MODEL_ID"]

# Below this confidence (or an "unreadable" classification), the cheap model's
# result is escalated to the stronger fallback model for independent re-verification.
NOVA_ACCEPTANCE_CONFIDENCE = 0.90

_IMAGE_FORMATS = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}

_SYSTEM_PROMPT = """You are a receipt-reading assistant for FIXE. Inspect only the supplied image.
Classify it as analyzed, not_receipt, or unreadable. A fully analyzed receipt must have a clearly
readable vendor, total, and every visible purchased item's description and printed line cost.
Quantities and unit costs are optional only when they are not printed. The receipt's transaction
date is optional and should be returned only when a date is printed on the receipt and can be
read confidently; never infer, guess, or substitute today's date. If the image is not an
identifiable purchase receipt, return not_receipt with no extracted values. If it is a receipt but
any required value or visible line item cannot be read confidently, return unreadable with no
extracted values. Never guess or repair obscured text. For analyzed receipts, use ISO 4217 currency
codes when identifiable, ISO 8601 (YYYY-MM-DD) for the receipt date when identifiable, and plain
base-10 decimal strings without currency symbols or grouping for amounts.
Set is_receipt false only for not_receipt; it must be true for analyzed and unreadable."""

_USER_PROMPT = """Analyze this image under the receipt rules. Return all visible purchased line
items, excluding subtotal, tax, tip, discounts, tender, change, and total rows. line_total is the
printed extended cost for that item; unit_cost is the printed per-unit cost when present.
receipt_date is the transaction date printed on the receipt, formatted YYYY-MM-DD, or omitted if
it isn't printed or can't be read confidently. Report a confidence from 0 to 1 reflecting certainty
that the classification and every required extracted field are correct."""


class ReceiptItem(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: str | None = Field(default=None, max_length=50)
    unit_cost: str | None = Field(default=None, max_length=50)
    line_total: str = Field(max_length=50)


class ReceiptOutput(BaseModel):
    status: Literal["analyzed", "not_receipt", "unreadable"]
    is_receipt: bool
    vendor: str | None = Field(default=None, max_length=200)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    total_amount: str | None = Field(default=None, max_length=50)
    receipt_date: str | None = Field(default=None, max_length=10)
    items: list[ReceiptItem] = Field(default_factory=list, max_length=200)
    confidence: float = Field(ge=0, le=1)


class ReceiptAnalysisProviderError(Exception):
    """Raised when a model call fails, or its structured output can't be trusted."""


@dataclass
class AnalysisAttempt:
    model_id: str
    outcome: str
    confidence: float | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"modelId": self.model_id, "outcome": self.outcome}
        if self.confidence is not None:
            result["confidence"] = self.confidence
        return result


def analyze_receipt(image_bytes: bytes, content_type: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Two-tier receipt analysis: Nova Lite first, Claude Sonnet as a confidence-gated fallback.

    Returns (analysis, attempts). analysis is None only when both tiers fail to produce a
    usable result (provider error or invalid structured output on both attempts).
    """
    attempts: list[AnalysisAttempt] = []
    initial_normalized: dict[str, Any] | None = None

    try:
        initial = _call_model(NOVA_MODEL_ID, image_bytes, content_type, None)
    except ReceiptAnalysisProviderError:
        attempts.append(AnalysisAttempt(NOVA_MODEL_ID, "provider_error"))
    else:
        try:
            initial_normalized = _normalize(initial, NOVA_MODEL_ID)
        except ReceiptAnalysisProviderError:
            attempts.append(AnalysisAttempt(NOVA_MODEL_ID, "invalid_output", initial.confidence))
        else:
            if initial.status == "unreadable":
                outcome = "unreadable"
            elif initial.confidence <= NOVA_ACCEPTANCE_CONFIDENCE:
                outcome = "low_confidence"
            else:
                outcome = "accepted"
            attempts.append(AnalysisAttempt(NOVA_MODEL_ID, outcome, initial.confidence))
            if outcome == "accepted":
                return initial_normalized, [attempt.to_dict() for attempt in attempts]

    try:
        fallback = _call_model(CLAUDE_MODEL_ID, image_bytes, content_type, initial_normalized)
    except ReceiptAnalysisProviderError:
        attempts.append(AnalysisAttempt(CLAUDE_MODEL_ID, "provider_error"))
        return None, [attempt.to_dict() for attempt in attempts]

    try:
        fallback_normalized = _normalize(fallback, CLAUDE_MODEL_ID)
    except ReceiptAnalysisProviderError:
        attempts.append(AnalysisAttempt(CLAUDE_MODEL_ID, "invalid_output", fallback.confidence))
        return None, [attempt.to_dict() for attempt in attempts]

    attempts.append(AnalysisAttempt(CLAUDE_MODEL_ID, "accepted", fallback.confidence))
    return fallback_normalized, [attempt.to_dict() for attempt in attempts]


def _call_model(
    model_id: str,
    image_bytes: bytes,
    content_type: str,
    correction_context: dict[str, Any] | None,
) -> ReceiptOutput:
    image_format = _IMAGE_FORMATS[content_type]
    model = BedrockModel(model_id=model_id, temperature=0.1, streaming=False)
    agent = Agent(model=model, system_prompt=_SYSTEM_PROMPT)
    try:
        return agent.structured_output(
            ReceiptOutput,
            [
                {"text": _build_user_prompt(correction_context)},
                {"image": {"format": image_format, "source": {"bytes": image_bytes}}},
            ],
        )
    except Exception as exc:  # noqa: BLE001 - every provider failure shares one safe boundary
        raise ReceiptAnalysisProviderError(f"Receipt analysis request failed: {exc}") from exc


def _build_user_prompt(correction_context: dict[str, Any] | None) -> str:
    if correction_context is None:
        return _USER_PROMPT
    return (
        f"{_USER_PROMPT}\nA lower-cost model produced the draft below. Independently inspect the "
        "image, correct every mistake, and do not preserve uncertain values merely because they "
        f"appear in the draft.\nDraft: {json.dumps(correction_context, default=str)}"
    )


def _normalize(output: ReceiptOutput, model_id: str) -> dict[str, Any]:
    if not 0 <= output.confidence <= 1:
        raise ReceiptAnalysisProviderError("Receipt analysis returned invalid confidence")
    expected_receipt = output.status != "not_receipt"
    if output.is_receipt is not expected_receipt:
        raise ReceiptAnalysisProviderError("Receipt analysis returned inconsistent receipt status")

    base = {"modelId": model_id, "confidence": output.confidence}
    if output.status == "not_receipt":
        return {
            **base,
            "status": output.status,
            "vendor": None,
            "currency": None,
            "totalAmount": None,
            "receiptDate": None,
            "items": [],
            "error": {"code": "not_receipt", "message": "The image is not an identifiable receipt."},
        }
    if output.status == "unreadable":
        return {
            **base,
            "status": output.status,
            "vendor": None,
            "currency": None,
            "totalAmount": None,
            "receiptDate": None,
            "items": [],
            "error": {
                "code": "unreadable_receipt",
                "message": "The receipt is identifiable, but required fields are unreadable.",
            },
        }

    vendor = output.vendor.strip() if isinstance(output.vendor, str) else ""
    if not vendor or output.total_amount is None or not output.items:
        raise ReceiptAnalysisProviderError("Receipt analysis returned incomplete analyzed data")
    currency = output.currency.upper().strip() if isinstance(output.currency, str) else None
    if currency is not None and not re.fullmatch(r"[A-Z]{3}", currency):
        raise ReceiptAnalysisProviderError("Receipt analysis returned an invalid currency code")
    receipt_date = output.receipt_date.strip() if isinstance(output.receipt_date, str) else None
    if receipt_date == "":
        receipt_date = None
    if receipt_date is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", receipt_date):
        raise ReceiptAnalysisProviderError("Receipt analysis returned an invalid receipt date")
    return {
        **base,
        "status": "analyzed",
        "vendor": vendor,
        "currency": currency,
        "totalAmount": _decimal_string(output.total_amount, "total_amount"),
        "receiptDate": receipt_date,
        "items": [_normalize_item(item) for item in output.items],
        "error": None,
    }


def _normalize_item(item: ReceiptItem) -> dict[str, str | None]:
    description = item.description.strip()
    if not description:
        raise ReceiptAnalysisProviderError("Receipt analysis returned an invalid item description")
    return {
        "description": description,
        "quantity": _decimal_string(item.quantity, "quantity") if item.quantity is not None else None,
        "unitCost": _decimal_string(item.unit_cost, "unit_cost") if item.unit_cost is not None else None,
        "lineTotal": _decimal_string(item.line_total, "line_total"),
    }


def _decimal_string(value: str, field_name: str) -> str:
    try:
        decimal = Decimal(value)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ReceiptAnalysisProviderError(f"Receipt analysis returned an invalid {field_name}") from exc
    if not decimal.is_finite():
        raise ReceiptAnalysisProviderError(f"Receipt analysis returned an invalid {field_name}")
    normalized = format(decimal, "f")
    if "." in normalized:
        normalized = normalized.rstrip("0").rstrip(".")
    return normalized or "0"
