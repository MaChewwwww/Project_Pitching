# `services/cron` — scheduled jobs

Ingestion and maintenance on a schedule. **The only part of the system allowed to call an
external service.**

No HTTP surface, no ports, exactly one replica.

## Why it is its own container

An in-process scheduler inside the API breaks the moment you run more than one Gunicorn worker:
every worker fires every job. Duplicate scrapes, duplicate alert prompts, duplicate reminders.

A dedicated single-replica container makes that impossible *by construction* rather than by
convention (`architecture.md` A-4). It costs nothing.

## Run it

Part of the stack — `make dev` from the repository root starts it.

```bash
docker compose --env-file .env -f infra/compose.yml -f infra/compose.override.yml logs -f cron
```

Run one job by hand:

```bash
make shell-api   # no — use the cron container:
docker compose --env-file .env -f infra/compose.yml -f infra/compose.override.yml \
  run --rm cron python -c "from jobs import fetch_weather; fetch_weather()"
```

## Layout

```
main.py      scheduler setup, trigger registration
runner.py    the @job decorator — logging, timing, failure isolation
jobs/
├── readings.py      fetch_weather, fetch_river_level, evaluate_thresholds
├── maintenance.py   flag_stale_records, send_activity_reminders
└── backup.py        backup_database
```

## The rule that matters most

**No job publishes anything a resident sees.**

`evaluate_thresholds` writes an `alert_prompt` for the BDRRMC to review. A public alert requires
a named officer calling `POST /admin/alerts`. Nothing connects the two automatically, and
nothing should — a student prototype must not warn 143,000 people unsupervised
(`architecture.md` D-4, A-10).

Do not shortcut this for demo convenience.

## Docs

[`docs/jobs.md`](./docs/jobs.md) — the six jobs, their cadences, and the discipline every one of
them follows.

Cadences are also in [`architecture.md`](../../docs/architecture.md) Section 9. If you change
one, change both.
