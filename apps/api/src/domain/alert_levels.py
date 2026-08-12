"""River alert threshold evaluation (FR-WX-009).

Pure functions. Given a reading and the configured thresholds, decide whether a
level has been breached.

**This module never publishes anything.** A breach produces an `alert_prompt` for
the BDRRMC to review; a public alert requires a named officer calling
`POST /admin/alerts`. The human step in the middle is the architecture, not a
formality (architecture.md D-4, A-10). Do not "simplify" it by auto-publishing,
even for demo convenience.

Thresholds are configuration, not constants — they are supplied through the
deployment environment as `ALERT_THRESHOLD_LEVEL_{1,2,3}_M` and are set by the
barangay (BRD OI-4).
"""

from __future__ import annotations

from typing import Literal

AlertLevel = Literal[1, 2, 3]

# design.md Section 3.4 — the wording residents see, not decoration.
LEVEL_LABELS: dict[int, str] = {
    1: "Prepare",
    2: "Evacuate",
    3: "Forced Evacuation",
}
