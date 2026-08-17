class InvalidTransitionError(Exception):
    pass


_QUESTION_ACTION_TRANSITIONS = {
    # No "created"/"read"/"in_progress" for question|action threads - the AM's first
    # message is always the thing that creates the thread, so it starts life already
    # waiting on the customer. Simplified for the POC; agent_proposal keeps its own
    # created->read->complete machine below, where "read" gates the verdict flow.
    "waiting_on_customer": {"waiting_on_internal", "complete"},
    "waiting_on_internal": {"waiting_on_customer", "complete"},
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
    if current_status == target:
        # e.g. the AM sends a second message before the customer has replied - the
        # thread is already waiting on the other party, so this is a no-op, not a
        # transition (the transition table has no self-loops for waiting_on_*).
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
