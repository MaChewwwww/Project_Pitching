# `infra` — the stack

One Compose file, environment-driven differences. **No separate production stack** — that is
what makes "demo from a laptop" a viable fallback if the VPS dies on the day (`tech_stack.md`
T-3, NFR-MNT-007).

## Files

| Path                               | What it is                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `compose.yml`                      | The stack. What runs on the VPS, and the base for local development           |
| `compose.override.yml`             | Local development only — hot reload, source bind mounts, exposed ports        |
| `caddy/Caddyfile`                  | Routing. `/api/*` → FastAPI, `/uploads/*` → volume, everything else → Next.js |
| `scripts/backup.sh` · `restore.sh` | `pg_dump` / `pg_restore` wrappers                                             |
| `backups/`                         | Dumps land here. Gitignored                                                   |

## Services

```
Browser → proxy (Caddy, :8080) ─┬→ web (Next.js :3000)
                                └→ api (FastAPI :8000) → db (Postgres 16 + PostGIS)
                                   cron (APScheduler, no ports) ──┘
```

| Service | Replicas      | Notes                                                                                      |
| ------- | ------------- | ------------------------------------------------------------------------------------------ |
| `proxy` | 1             | Single entry point. Also serves uploads straight off the volume                            |
| `web`   | 1             |                                                                                            |
| `api`   | 1             | Gunicorn + Uvicorn workers. Runs `alembic upgrade head`, then seeds (idempotent), on start |
| `cron`  | **exactly 1** | More than one means every job fires twice (`architecture.md` A-4)                          |
| `db`    | 1             | Single source of truth                                                                     |

## Use it from the root

Two isolated profiles, `staging` (default) and `demo` (`architecture.md` Section 13.1) — each
its own Compose project (separate database, volumes, ports), so both can run at once and
breaking staging while testing a feature can never touch the demo data sitting ready for the
pitch.

```bash
make dev                 # staging — hot reload, attached
make dev ENV=demo        # demo — same, on different ports, can run alongside staging
make up                  # detached, production-shaped
make down                # stop, keep data
make clean ENV=demo      # stop and DELETE the demo database — reseed fresh before presenting
make logs
```

Prefer these over raw `docker compose` — they are what CI runs, and they pass the right
`-p sagip-<env>` and `--env-file .env.<env>` for you.

## Ports

| Port               | Serves                                                 | Profile |
| ------------------ | ------------------------------------------------------ | ------- |
| **8080**           | The proxy — the one you use day to day                 | staging |
| 3000 / 8000 / 5433 | Next.js / FastAPI / Postgres direct — development only | staging |
| **8090**           | The proxy for the demo profile                         | demo    |
| 3010 / 8010 / 5443 | Next.js / FastAPI / Postgres direct — development only | demo    |

Neither is port 80, because port 80 is occupied on most Windows machines. Change
`PROXY_PORT`/`WEB_PORT`/`API_PORT`/`DB_PORT` in `.env.staging` or `.env.demo` if you want
something else — just keep the two profiles distinct if you want to run them together. The
direct ports come from `compose.override.yml` and do not exist on the VPS.

## Docs

| Document                                             | Covers                                                  |
| ---------------------------------------------------- | ------------------------------------------------------- |
| [`docs/deployment.md`](./docs/deployment.md)         | Getting this onto a VPS, configuration, HTTPS, demo day |
| [`docs/backup-restore.md`](./docs/backup-restore.md) | Taking a backup, and the restore you must rehearse      |
