"""Daily housekeeping jobs."""

from __future__ import annotations

import logging

from runner import job

log = logging.getLogger("cron.maintenance")


@job("flag_stale_records")
def flag_stale_records() -> None:
    """Set `household.stale_at` on records nobody has updated in a long time (R-2).

    Not yet implemented. Flagging is not deleting and not hiding — a stale record
    still counts and still receives alerts. It only tells a BHW where to visit next.
    """
    log.info("not implemented")


@job("send_activity_reminders")
def send_activity_reminders() -> None:
    """Create in-app notifications for upcoming activities (FR-ACT-005).

    Not yet implemented. In-app only — SMS is explicitly out of scope (BR-4.10, D-6).
    """
    log.info("not implemented")
