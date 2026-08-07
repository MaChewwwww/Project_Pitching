"""The six scheduled jobs from docs/architecture.md Section 9.

Job discipline — every one of these holds, for every job:

  1. **Idempotent.** A double run must be harmless. The scheduler will double-run
     eventually; design for it rather than hoping.
  2. **Logged.** Start, outcome, and duration on every run (NFR-OBS-002). The
     `@job` decorator in `runner.py` does this so no job has to remember.
  3. **Isolated.** A failing job never blocks the next run, and never blocks
     another job.
  4. **Never user-visible.** No job writes to a surface a resident sees. In
     particular `evaluate_thresholds` creates an `alert_prompt` for the BDRRMC —
     publishing an alert requires a named officer calling `POST /admin/alerts`
     (architecture.md D-4). Do not shortcut this, even for demo convenience.
"""

from jobs.backup import backup_database
from jobs.maintenance import flag_stale_records, send_activity_reminders
from jobs.readings import evaluate_thresholds, fetch_river_level, fetch_weather

__all__ = [
    "backup_database",
    "evaluate_thresholds",
    "fetch_river_level",
    "fetch_weather",
    "flag_stale_records",
    "send_activity_reminders",
]
