# Deployment

## Environments

Two isolated **profiles**, `staging` and `demo`, each its own Compose project from the same
`infra/compose.yml` — separate database, volumes, and ports (`docs/architecture.md` Section
13.1). Either can run on a laptop or the VPS; a VPS deploy is simply the `demo` profile running
on a server instead of localhost.

| Profile   | Purpose                            | Runs on                     | Data             | Secure context                         |
| --------- | ---------------------------------- | --------------------------- | ---------------- | -------------------------------------- |
| `staging` | Day-to-day dev and feature testing | Laptop, Compose             | Seeded synthetic | Yes — `localhost` is exempt            |
| `demo`    | Curated, isolated, for the pitch   | Laptop or VPS, same Compose | Seeded synthetic | Only if sslip.io is enabled on the VPS |

The same `compose.yml` for both. The only differences are which `.env.<profile>` file is loaded,
the Compose project name (`-p sagip-<profile>`), and whether `compose.override.yml` is applied.

## Configuration

Every setting is an environment variable, loaded through `pydantic-settings`. `.env.staging.example`
and `.env.demo.example` are committed; **the real `.env.staging` / `.env.demo` are never** (NFR-SEC-010).

> A committed database password in a student repository is a genuinely common failure. Both
> `.env.*` files are gitignored — keep it that way, and add new settings to **both** `.example`
> files, or one profile's stack will not start.

The ones that actually change between a laptop and the VPS:

| Variable                   | Local                                 | VPS                                      |
| -------------------------- | ------------------------------------- | ---------------------------------------- |
| `JWT_SECRET`               | The dev placeholder                   | **Generate one**: `openssl rand -hex 32` |
| `POSTGRES_PASSWORD`        | The dev placeholder                   | **Change it**                            |
| `COOKIE_SECURE`            | `false`                               | `true` only if HTTPS is on               |
| `CORS_ORIGINS`             | `http://localhost:8090` (demo)        | The public origin                        |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8090/api/v1` (demo) | The public origin + `/api/v1`            |
| `PROXY_PORT`               | `8090` (demo) / `8080` (staging)      | `80`                                     |

`NEXT_PUBLIC_API_BASE_URL` is **inlined at build time**, not read at runtime. Changing it means
rebuilding `web`, not restarting it.

## First deploy

The VPS runs the `demo` profile — it's the one meant to be presented, and keeping the same
profile name whether on a laptop or a server means "runs identically both places" is literally
true, not just a design goal (`tech_stack.md` T-3).

```bash
git clone <repo> && cd Project_Pitching
cp .env.demo.example .env.demo
# edit .env.demo — at minimum JWT_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS,
# NEXT_PUBLIC_API_BASE_URL, PROXY_PORT=80
make up ENV=demo
```

`make up ENV=demo` builds, waits for the database healthcheck, applies migrations, seeds (both
idempotent — safe to rerun), and starts everything.

Startup order is enforced by healthcheck, not by `sleep`:

```
db → (healthy) → api (alembic upgrade head, then seed) → web → proxy
              └→ cron
```

Migrations and seeding run on API start rather than as a separate step — one less thing to
forget, and `make up ENV=demo` alone leaves you with a fully working, presentable demo.

Sizing: 2 vCPU / 4 GB is comfortable. 1 vCPU / 2 GB works if the budget is tight. A local
Philippine provider may beat a cheaper EU one on latency, which matters more here than price
(`tech_stack.md` T-OI-5).

## HTTPS is optional

**The app is designed to work on plain HTTP.** Browsers block `navigator.geolocation` and
`getUserMedia` on non-secure origins, but nothing in the requirements depends on them — the
draggable pin and gallery upload are the _baseline_, and GPS and camera are enhancements
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

The `demo` profile always fetches live weather and river data, same as `staging` — `DEMO_MODE`
/ FR-WX-016's scripted timeline was **not built**; the decision taken instead is documented in
`tech_stack.md` Section 7's decision log. A live scrape failing mid-pitch is a real, accepted
risk under that decision.

What covers it: FR-WX-012 (last-known-good with visible age) and FR-WX-007 (manual entry) mean
a PAGASA outage degrades to a stale-but-labelled number, never a blank panel. And for the
moment in the pitch that needs a river actually rising on cue, use the **Simulate typhoon**
button on `/admin/weather-readings` — it writes a real, rising sequence of river-level readings (crossing
Alert Levels 1, 2, and 3 against the configured thresholds) and creates the matching
`alert_prompt`s immediately, without waiting for a real flood or a live gauge to cooperate. It
is a manual `source='manual'` entry like any other FR-WX-007 reading — clearly attributed,
clearly not a live PAGASA value if anyone checks.

**Say plainly that it is simulated** when you use it. Judges respect that more than a fragile
live call.

Before the pitch:

- [ ] Restore rehearsed from a real dump ([`backup-restore.md`](./backup-restore.md))
- [ ] The deployed URL opened on a real phone, not just the browser's device emulator
- [ ] The local stack proven to run the demo if the VPS dies (T-3)
- [ ] `make clean ENV=demo && make up ENV=demo` run once, fresh, so the presented data matches
      what's actually seeded — not whatever staging experiments left behind
- [ ] **Simulate typhoon** tried at least once against this exact deployment, and the resulting
      alert prompt acknowledged/published once so the flow is rehearsed, not just built

## Updating a running deployment

```bash
git pull
make up ENV=demo          # rebuilds changed images, reapplies migrations, reseeds (idempotent)
```

Take a backup first if the pull contains a migration (`make backup ENV=demo`). `down -v` deletes
the database — `make clean ENV=demo` is the same thing, named honestly, scoped to one profile.
