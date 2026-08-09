# Logging, errors, audit, health

Four cross-cutting concerns that each have exactly one implementation, so no module has to
reinvent them.

## Logging

Structured JSON, one line per event, with a **request ID on every line** (NFR-OBS-001).

```json
{
  "ts": "2026-08-07T08:55:26.835Z",
  "level": "INFO",
  "logger": "api.request",
  "message": "request",
  "request_id": "1bf0ec41…",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration_ms": 24.1
}
```

The ID is generated per request — or taken from an inbound `X-Request-ID` — held in a context
variable, and attached to every record emitted while handling that request. A log line from deep
inside a service carries it without the service knowing HTTP exists. It is also returned as a
response header and included in error bodies, so a user can quote it.

```python
log.info("household verified", extra={"household_id": str(h.id), "area_id": str(h.area_id)})
```

- **Anything passed via `extra=` lands in the JSON.** Use it for structured fields rather than
  formatting values into the message — `grep` finds a field, not a sentence.
- **Never log a password, token, or full contact number.** Log the ID and look the rest up.
- Uvicorn's own handlers are removed at startup so every line in the container log is parseable.

## Errors

One handler, one shape (`architecture.md` Section 6.1):

```json
{
  "type": "/errors/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "…",
  "errors": [],
  "request_id": "de4bacaa…"
}
```

Raise from a service; never catch in a router.

| Raise                   | Gives                      |
| ----------------------- | -------------------------- |
| `NotFoundError`         | 404                        |
| `PermissionDeniedError` | 403                        |
| `ConflictError`         | 409                        |
| `AppError`              | 400                        |
| Anything else           | 500 with a generic message |

**An unhandled exception logs the traceback and returns nothing about it.** The 500 body says
"something went wrong" and carries the request ID; the detail is in the logs. Leaking a stack
trace to a public endpoint tells an attacker your table names.

Validation failures return 422 with field-level entries in `errors[]`, which is what the web
form binds to.

Subclass `AppError` when a domain concept needs its own status — do not build ad-hoc dicts.

## Audit log

Every state-changing action writes one row: actor, action, entity, timestamp, before/after
(FR-SYS-008). Written by a service-layer helper, so it happens inside the same transaction as
the change it records — a rollback takes the audit entry with it, rather than recording
something that never happened.

**Append-only.** There is no update or delete path in the application, and there should never be
one. `actor_user_id` is null for system actions.

Action names read `entity.verb`: `household.create`, `alert.publish`, `vulnerability.override`.

## Health

`/health` and `/api/v1/health` (NFR-OBS-004). Both, because a container healthcheck and a
browser coming through the proxy take different paths.

```json
{
  "status": "ok",
  "database": "ok",
  "environment": "development",
  "demo_mode": "false"
}
```

**It reports, it never raises.** A dead database returns `"database":"unavailable"` with HTTP
200 — a health endpoint that 500s tells you less than one that describes what is broken.

`architecture.md` AR-4 flags a silently stopped `cron` container as a real risk. Surfacing the
last successful job run here is the intended mitigation, and is not built yet.

## What is deliberately absent

No metrics backend, no tracer, no log aggregator. One barangay, one VPS, a fixed deadline —
`docker compose logs` and a request ID are the right size. Structured JSON means that decision
is reversible without touching a single call site.
