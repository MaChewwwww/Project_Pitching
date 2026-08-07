# `infra` — the stack

One Compose file, environment-driven differences. **No separate production stack** — that is
what makes "demo from a laptop" a viable fallback if the VPS dies on the day (`tech_stack.md`
T-3, NFR-MNT-007).

## Files

| Path | What it is |
|---|---|
| `compose.yml` | The stack. What runs on the VPS, and the base for local development |
| `compose.override.yml` | Local development only — hot reload, source bind mounts, exposed ports |
| `caddy/Caddyfile` | Routing. `/api/*` → FastAPI, `/uploads/*` → volume, everything else → Next.js |
| `scripts/backup.sh` · `restore.sh` | `pg_dump` / `pg_restore` wrappers |
| `backups/` | Dumps land here. Gitignored |

## Services

```
Browser → proxy (Caddy, :8080) ─┬→ web (Next.js :3000)
                                └→ api (FastAPI :8000) → db (Postgres 16 + PostGIS)
                                   cron (APScheduler, no ports) ──┘
```

| Service | Replicas | Notes |
|---|---|---|
| `proxy` | 1 | Single entry point. Also serves uploads straight off the volume |
| `web` | 1 | |
| `api` | 1 | Gunicorn + Uvicorn workers. Runs `alembic upgrade head` on start |
| `cron` | **exactly 1** | More than one means every job fires twice (`architecture.md` A-4) |
| `db` | 1 | Single source of truth |

## Use it from the root

```bash
make dev      # hot reload, attached
make up       # detached, production-shaped
make down     # stop, keep data
make clean    # stop and DELETE the database
make logs
```

Prefer these over raw `docker compose` — they are what CI runs.

## Ports

| Port | Serves |
|---|---|
| **8080** | The proxy. This is the one you use |
| 3000 | Next.js direct — development only |
| 8000 | FastAPI direct — development only |
| 5433 | Postgres, for a GUI client — development only |

**8080, not 80**, because port 80 is occupied on most Windows machines. Change `PROXY_PORT` in
`.env` if you want something else. The direct ports come from `compose.override.yml` and do not
exist on the VPS.

## Docs

| Document | Covers |
|---|---|
| [`docs/deployment.md`](./docs/deployment.md) | Getting this onto a VPS, configuration, HTTPS, demo day |
| [`docs/backup-restore.md`](./docs/backup-restore.md) | Taking a backup, and the restore you must rehearse |
