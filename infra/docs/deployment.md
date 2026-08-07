# Deployment

## Environments

| Environment | Runs on | Data | Secure context |
|---|---|---|---|
| Local dev | Laptop, Compose | Seeded synthetic | Yes — `localhost` is exempt |
| Demo | Laptop, Compose | Seeded + scripted flood scenario | Yes |
| VPS | Single host, same Compose | Seeded synthetic | Only if sslip.io is enabled |

The same `compose.yml` in all three. The only differences are `.env` and whether
`compose.override.yml` is applied.

## Configuration

Every setting is an environment variable, loaded through `pydantic-settings`. `.env.example` is
committed; **`.env` never is** (NFR-SEC-010).

> A committed database password in a student repository is a genuinely common failure. `.env` is
> gitignored — keep it that way, and add new settings to `.env.example` too, or the next
> person's stack will not start.

The ones that actually change between environments:

| Variable | Local | VPS |
|---|---|---|
| `JWT_SECRET` | The dev placeholder | **Generate one**: `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | The dev placeholder | **Change it** |
| `COOKIE_SECURE` | `false` | `true` only if HTTPS is on |
| `CORS_ORIGINS` | `http://localhost:8080` | The public origin |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` | The public origin + `/api/v1` |
| `PROXY_PORT` | `8080` | `80` |
| `DEMO_MODE` | `false` | `true` for the pitch |

`NEXT_PUBLIC_API_BASE_URL` is **inlined at build time**, not read at runtime. Changing it means
rebuilding `web`, not restarting it.

## First deploy

```bash
git clone <repo> && cd Project_Pitching
cp .env.example .env
# edit .env — at minimum JWT_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS,
# NEXT_PUBLIC_API_BASE_URL, PROXY_PORT=80
make up
```

`make up` builds, waits for the database healthcheck, applies migrations, and starts everything.

Startup order is enforced by healthcheck, not by `sleep`:

```
db → (healthy) → api (runs alembic upgrade head) → web → proxy
              └→ cron
```

Migrations run on API start rather than as a separate step — one less thing to forget.

Sizing: 2 vCPU / 4 GB is comfortable. 1 vCPU / 2 GB works if the budget is tight. A local
Philippine provider may beat a cheaper EU one on latency, which matters more here than price
(`tech_stack.md` T-OI-5).

## HTTPS is optional

**The app is designed to work on plain HTTP.** Browsers block `navigator.geolocation` and
`getUserMedia` on non-secure origins, but nothing in the requirements depends on them — the
draggable pin and gallery upload are the *baseline*, and GPS and camera are enhancements
detected at runtime via `window.isSecureContext`.

If you want the enhancements on the public URL, the cheapest route is **sslip.io**: replace
`:80` in `caddy/Caddyfile` with the hostname for your IP —

```
203-0-113-5.sslip.io {
```

— and Caddy fetches a Let's Encrypt certificate itself. No account, no DNS panel, about ten
minutes. Then set `COOKIE_SECURE=true`.

> `localhost` is a secure context. If the demo runs from a laptop, the enhancements work during
> the pitch with no setup at all.

## Demo day

`DEMO_MODE=true` switches readings to a scripted timeline (FR-WX-016). The flag is the *only*
difference — a flood scenario you control tells the story better than whatever the river happens
to be doing that morning, and a live scrape failing mid-pitch is an avoidable risk.

**Say plainly that it is simulated.** Judges respect that more than a fragile live call.

Before the pitch:

- [ ] Restore rehearsed from a real dump ([`backup-restore.md`](./backup-restore.md))
- [ ] The deployed URL opened on a real phone, not just the browser's device emulator
- [ ] The local stack proven to run the demo if the VPS dies (T-3)
- [ ] `DEMO_MODE` set the way you intend, and checked at `/api/v1/health`

## Updating a running deployment

```bash
git pull
make up          # rebuilds changed images, reapplies migrations
```

Take a backup first if the pull contains a migration. `down -v` deletes the database — `make
clean` is the same thing, named honestly.
