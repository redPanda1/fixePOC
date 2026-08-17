class InvalidTransitionError(Exception):
    pass


_QUESTION_ACTION_TRANSITIONS = {
    "created": {"read"},
    "read": {"in_progress"},
    "in_progress": {"waiting_on_customer", "waiting_on_internal", "complete"},
    "waiting_on_customer": {"in_progress", "waiting_on_internal", "complete"},
    "waiting_on_internal": {"in_progress", "waiting_on_customer", "complete"},
    "complete": {"archived"},
    "archived": set(),
}

_AGENT_PROPOSAL_TRANSITIONS = {
    "created": {"read"},
    "read": {"complete"},
    "complete": {"archived"},
    "archived": set(),
}


def _table(entry_type: str) -> dict[str, set[str]]:
    return _AGENT_PROPOSAL_TRANSITIONS if entry_type == "agent_proposal" else _QUESTION_ACTION_TRANSITIONS


def assert_transition_allowed(entry_type: str, from_status: str, to_status: str) -> None:
    allowed = _table(entry_type).get(from_status, set())
    if to_status not in allowed:
        raise InvalidTransitionError(f"Cannot move thread from '{from_status}' to '{to_status}'")


def status_after_read(entry_type: str, current_status: str) -> str | None:
    """Auto, once: only fires from 'created'. Returns None if no transition applies."""
    if current_status == "created":
        assert_transition_allowed(entry_type, current_status, "read")
        return "read"
    return None


def status_after_message(entry_type: str, current_status: str, actor_role: str) -> str:
    if current_status in {"complete", "archived"}:
        raise InvalidTransitionError("Thread is closed; it cannot receive new messages")
    target = "waiting_on_customer" if actor_role == "am" else "waiting_on_internal"
    # created/read collapse straight through in_progress into the waiting_* target in
    # one hop, so a single message-send action produces a single status write / event.
    if current_status in {"created", "read"}:
        assert_transition_allowed(entry_type, current_status, "in_progress")
        current_status = "in_progress"
    if current_status == "in_progress":
        assert_transition_allowed(entry_type, "in_progress", target)
        return target
    assert_transition_allowed(entry_type, current_status, target)
    return target


def status_after_option_select(entry_type: str, current_status: str) -> str:
    return status_after_message(entry_type, current_status, actor_role="customer")


def status_after_verdict(entry_type: str, current_status: str) -> str:
    if entry_type != "agent_proposal":
        raise InvalidTransitionError("Verdicts only apply to agent_proposal threads")
    assert_transition_allowed(entry_type, current_status, "complete")
    return "complete"


def assert_manual_transition_allowed(entry_type: str, from_status: str, to_status: str) -> None:
    """Used by the explicit set-status route (AM only)."""
    assert_transition_allowed(entry_type, from_status, to_status)
