"""Rescue-request triage priority (FR-SAF-010).

Pure functions over plain data. No database access, no FastAPI imports — the
caller loads the flags and passes values in (same shape as `vulnerability.py`).

FR-SAF-010's literal text asks for "registered requesters' vulnerability
level" to inform order. That scoring is blocked on BRD OI-18 —
`domain/vulnerability.py` has no scoring function yet. This module ships a
transparent additive signal over the raw per-member boolean flags instead,
which *are* captured and queryable. Documented deviation, `frs_nfrs.md`
Section 9.

The one hard rule this module exists to enforce structurally: an
unregistered request must never be deprioritised for lacking flags (BR-5.9).
Priority only ever goes up from `BASE_PRIORITY` — there is no code path that
subtracts, so "no data" and "no flags" are indistinguishable, which is
exactly the point.
"""

from __future__ import annotations

BASE_PRIORITY = 3
MAX_PRIORITY = 5

# Higher = more urgent, matching `idx_rescue_open`'s intended
# `ORDER BY priority DESC, created_at`.
FLAG_WEIGHTS: dict[str, int] = {
    "is_bedridden": 2,
    "is_pwd": 1,
    "is_pregnant": 1,
    "is_lactating": 1,
    "is_senior": 1,
    "is_child": 1,
    "has_chronic_condition": 1,
}

FLAG_LABELS: dict[str, str] = {
    "is_bedridden": "bedridden member",
    "is_pwd": "member with a disability",
    "is_pregnant": "pregnant member",
    "is_lactating": "lactating member",
    "is_senior": "senior member",
    "is_child": "child in the household",
    "has_chronic_condition": "member with a chronic condition",
}

LARGE_GROUP_THRESHOLD = 5
LARGE_GROUP_LABEL = f"{LARGE_GROUP_THRESHOLD}+ people"


def triage_priority(*, flags: set[str], people_count: int | None) -> tuple[int, list[str]]:
    """Returns `(priority, factors)`. `priority` is 1..`MAX_PRIORITY`, capped;
    `factors` is human-readable, for display next to the computed number —
    never store more than a plain int in the database, per `rescue_request`'s
    own column type.
    """
    priority = BASE_PRIORITY
    factors: list[str] = []

    for flag in FLAG_WEIGHTS:
        if flag in flags:
            priority += FLAG_WEIGHTS[flag]
            factors.append(FLAG_LABELS[flag])

    if people_count is not None and people_count >= LARGE_GROUP_THRESHOLD:
        priority += 1
        factors.append(LARGE_GROUP_LABEL)

    return min(priority, MAX_PRIORITY), factors
