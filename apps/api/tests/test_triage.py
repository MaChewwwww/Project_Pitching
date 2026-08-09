"""FR-SAF-010 — `domain/triage.py`. Pure, no database, no fixtures.

The one assertion that matters most: an unregistered request (no flags
available at all) must never sort below a registered household with no
flags either. Both are exactly `BASE_PRIORITY` — there is no code path that
subtracts, so there is nothing to accidentally get backwards.
"""

from __future__ import annotations

from src.domain.triage import BASE_PRIORITY, FLAG_WEIGHTS, MAX_PRIORITY, triage_priority


def test_no_flags_and_no_people_count_is_base_priority():
    priority, factors = triage_priority(flags=set(), people_count=None)
    assert priority == BASE_PRIORITY
    assert factors == []


def test_an_unregistered_request_is_never_below_base_priority():
    """Unregistered and "registered with no flags" must be indistinguishable
    — that is the structural guarantee BR-5.9 needs, not just a policy."""
    unregistered_priority, _ = triage_priority(flags=set(), people_count=None)
    assert unregistered_priority == BASE_PRIORITY
    assert unregistered_priority >= BASE_PRIORITY


def test_each_flag_only_raises_priority_never_lowers_it():
    baseline, _ = triage_priority(flags=set(), people_count=None)
    for flag in FLAG_WEIGHTS:
        with_flag, factors = triage_priority(flags={flag}, people_count=None)
        assert with_flag >= baseline
        assert len(factors) == 1


def test_bedridden_weighs_more_than_a_single_generic_flag():
    bedridden, _ = triage_priority(flags={"is_bedridden"}, people_count=None)
    senior, _ = triage_priority(flags={"is_senior"}, people_count=None)
    assert bedridden > senior


def test_priority_is_capped_at_max():
    priority, _ = triage_priority(flags=set(FLAG_WEIGHTS), people_count=10)
    assert priority == MAX_PRIORITY


def test_large_group_adds_one_factor():
    small, _ = triage_priority(flags=set(), people_count=2)
    large, factors = triage_priority(flags=set(), people_count=5)
    assert large == small + 1
    assert any("5+" in f for f in factors)


def test_flags_are_monotone_non_decreasing_as_more_are_added():
    one, _ = triage_priority(flags={"is_senior"}, people_count=None)
    two, _ = triage_priority(flags={"is_senior", "is_pwd"}, people_count=None)
    assert two >= one
