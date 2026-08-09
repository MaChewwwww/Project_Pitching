# `apps/api` — FastAPI backend

All business logic, authorization, and persistence. One deployable application organised by
module — not microservices (`architecture.md` D-5).

## Run it

From the **repository root**, not here:

```bash
make dev
```

The API is then at <http://localhost:8080/api/v1> through the proxy, or
<http://localhost:8000> directly. Interactive docs: <http://localhost:8080/api/docs>.

You do not need Python installed. Everything runs in the container, including the tests.

| Command                           | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `make migrate`                    | Apply pending migrations                                |
| `make revision m="add household"` | Generate a migration from model changes                 |
| `make test-api`                   | pytest                                                  |
| `make lint-api`                   | ruff                                                    |
| `make shell-api`                  | Shell inside the container                              |
| `make shell-db`                   | psql                                                    |
| `make types`                      | Regenerate `packages/api-types` from the OpenAPI schema |

## Layout

```
alembic/            migrations (alembic.ini sits beside it)
src/
├── main.py         app assembly, middleware, router mounting, /health
├── core/           config · security · deps · errors · logging
├── db/             session · base · models_registry
├── modules/        one per feature area, four files each
├── integrations/   external data adapters — called by services/cron, never by a request
└── domain/         pure functions. No I/O, no ORM, no framework imports
tests/
```

Each module is `router.py` / `schemas.py` / `service.py` / `models.py`. What each may and may
not do is in [`docs/modules.md`](./docs/modules.md) — read it before adding one.

## The rules you are most likely to break

1. **Routers never touch the database.** Router → service → ORM.
2. **A service never imports another module's `models.py`.** Go through the owning service.
3. **`domain/` stays pure.** That is what makes it unit-testable (NFR-MNT-005).
4. **No request path calls an external service.** The scheduler fetches; the API reads.
5. **Every new `models.py` goes into `src/db/models_registry.py`** — otherwise Alembic
   autogenerate emits a migration that _drops your table_.
6. **No manual DDL, ever.** Alembic only (NFR-MNT-004).

Full list with rationale: [`AGENTS.md`](../../AGENTS.md) Section 5.

## Docs

| Document                                           | Covers                                                         |
| -------------------------------------------------- | -------------------------------------------------------------- |
| [`docs/modules.md`](./docs/modules.md)             | The four-file convention, module boundaries, adding a module   |
| [`docs/migrations.md`](./docs/migrations.md)       | Alembic workflow and the traps specific to PostGIS             |
| [`docs/auth.md`](./docs/auth.md)                   | Token flow, roles, area scoping — the highest-risk area (AR-6) |
| [`docs/observability.md`](./docs/observability.md) | Log shape, error envelope, audit log, `/health`                |

_What_ to build is in [`docs/frs_nfrs.md`](../../docs/frs_nfrs.md). The database columns are in
[`docs/schema.md`](../../docs/schema.md). Neither is restated here.
