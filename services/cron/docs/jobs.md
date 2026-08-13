# Jobs

## The six

| Job                       | Cadence                | Writes               | Requirement |
| ------------------------- | ---------------------- | -------------------- | ----------- |
| `fetch_weather`           | every 20 min           | `reading`, `forecast` | FR-WX-003   |
| `fetch_river_level`       | every 15 min           | `reading`            | FR-WX-008   |
| `fetch_tcws_signal`       | every 30 min           | `reading`            | FR-WX-008   |
| `evaluate_thresholds`     | after each river fetch | `alert_prompt`       | FR-WX-009   |
| `flag_stale_records`      | daily 02:00            | `household.stale_at` | R-2         |
| `send_activity_reminders` | daily 08:00            | `notification`       | FR-ACT-005  |
| `backup_database`         | daily 03:00            | off-box dump         | NFR-AVL-005 |

Daily jobs are scheduled in **PHT**, because "02:00" means 02:00 in the barangay. Everything is
still _stored_ in UTC (NFR-DAT-003).

`fetch_weather` writes Open-Meteo hourly precipitation chance, rainfall, and apparent-temperature
outlooks plus daily precipitation totals, maximum rain chance, and maximum apparent temperature for
the next seven days. `forecast.horizon` keeps the two series separate for the public weather panel;
the API returns the current hour and today rather than dropping them at the time boundary.

On every cron container startup, `main.py` runs `fetch_weather` before registering the recurring
schedule. A deploy or worker restart therefore refreshes the cached weather and forecast data
immediately; the normal 20-minute interval resumes afterward.

> All six are currently stubs that log and return. The scheduling, logging, and failure
> isolation around them is real; the bodies land with their FRs.

## Discipline every job follows

**1. Idempotent.** A double run must be harmless. The scheduler _will_ double-run eventually —
a container restart, a clock adjustment, a redeploy. Design for it rather than hoping.

**2. Logged.** Start, outcome, and duration on every run (NFR-OBS-002). The `@job` decorator in
`runner.py` does this, so no job has to remember:

```json
{
  "ts": "…",
  "level": "INFO",
  "logger": "cron.fetch_weather",
  "message": "job finished",
  "job": "fetch_weather",
  "outcome": "success",
  "duration_ms": 412.7
}
```

**3. Isolated.** `@job` catches and logs any exception rather than letting it escape. One broken
job must never stop the scheduler or the other five. A failure is logged and the next run tries
again.

**4. Never user-visible.** No job writes to a surface a resident sees. See the alert rule below.

## Failure behaviour for fetches

In this order (`architecture.md` Section 8.2):

1. **Fetch fails** → log with source and reason (NFR-OBS-003). **Write nothing.**
2. The read path still returns the most recent reading, whatever its age.
3. Staleness is computed at read time from `observed_at` against
   `config.reading.stale_after_minutes`, and returned as a field. The API never hides it.
4. A failed fetch **never** produces an empty weather panel. It produces yesterday's number,
   labelled as yesterday's (NFR-AVL-003).

Writing a null or a zero on failure would be worse than writing nothing — it looks like a
measurement.

## Scraping PAGASA politely

There is no public API; the FFWS publishes through a page meant for humans.

- Identify the user agent. Do not pretend to be a browser.
- Never poll faster than every 10 minutes.
- Back off on errors rather than retrying tightly.
- Expect it to break without warning — any markup change kills the parser, and the site is under
  heaviest load during exactly the events it is needed for.

That last point is why `ManualSource` exists: an officer types the reading in, it writes the
same `reading` row with `source='manual'` and full attribution, and every downstream feature
keeps working (FR-WX-007). It is a first-class source, not a fallback bolted on.

## The alert rule

**`evaluate_thresholds` creates a prompt. It does not publish.**

```
fetch_river_level → reading → evaluate_thresholds → alert_prompt → BDRRMC dashboard
                                                                        ↓ officer decides
                                                          POST /admin/alerts → public alert
```

The human step in the middle is the architecture, not a formality (`architecture.md` D-4).
`alert_prompt.resulted_in_announcement_id` staying null is a legitimate, recorded outcome — the
officer looked and decided not to warn.

## Adding a job

1. Write the function in the right `jobs/` module, decorated with `@job("name")`.
2. Export it from `jobs/__init__.py`.
3. Register the trigger in `main.py`.
4. Add a row to the table above **and** to `architecture.md` Section 9.
5. Ask yourself the idempotency question explicitly: what happens if this runs twice in the same
   minute?

CI runs `python -c "import main; main.build_scheduler()"` on every change, so an import error or
a bad trigger fails the PR rather than silently stopping the jobs at 02:00 on a Sunday.

## Job defaults, and why

```python
coalesce=True          # a missed run is skipped, not replayed in a burst
max_instances=1        # a slow run does not overlap the next
misfire_grace_time=300 # a five-minute-late run is still worth doing
```

Without `coalesce`, a laptop waking from sleep fires every missed interval at once — which for
`fetch_river_level` means hammering a government site you promised to be polite to.

## When cron silently stops

Flagged as a real risk (`architecture.md` AR-4): the container dies, nothing fetches, and the
weather panel keeps showing an increasingly old number.

Three mitigations, two of which exist:

- Staleness is user-visible by design (FR-WX-011) — **built**.
- Job outcomes are logged — **built**.
- `/health` surfaces the last successful run — **not built yet**.
