# `SAGIP-SJ` — Barangay San Jose Disaster Readiness & Community Health Platform

**SAGIP-SJ**: System for Alert, Guidance, Incident Reporting, and Preparedness for Barangay San Jose.

A prototype for an SK Project Pitching competition, built by a four-person interdisciplinary
student team. Registry, hazard mapping, flood watch, alerts, safety check-in, evacuation,
donations, activities, preparedness, and analytics for **Barangay San Jose, Rodriguez, Rizal**.

---

## Demo release state

The functional demo is complete across the Public Information Site, Resident Portal, and Barangay
Portal. The public About route now uses the project team's supplied four-person profiles and
approved portraits. Further changes to that content should use project-supplied source material;
do not substitute placeholder biographies, portraits, or claims.

[`docs/demo-freeze.md`](./docs/demo-freeze.md) records the release boundary and
[`apps/web/docs/structure.md`](./apps/web/docs/structure.md) maps the implemented route families.
Individual requirement rows remain subject to their Definition of Done evidence and peer review in
[`docs/frs_nfrs.md`](./docs/frs_nfrs.md).

---

## Get it running

**Target: under 30 minutes from a fresh clone** (NFR-MNT-008). Docker does almost all of it.

### 1. Install the prerequisites

| Tool               | Version | Notes                                                                                                                                           |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker Desktop** | 24+     | Must be _running_ before `make dev`. This is the only hard requirement — the API, database, and jobs never need to be installed on your machine |
| **Node.js**        | 20+     | For `npm install` and the shadcn CLI                                                                                                            |
| **GNU Make**       | 4+      | The entry point for everything                                                                                                                  |
| **Python**         | 3.12+   | Only for the scripts in `tools/`, not for running the app                                                                                       |

**Windows** — Make is not bundled. Install it once, then **open a new terminal** so the PATH
change takes effect:

```bash
winget install ezwinports.make
```

macOS has Make already. Debian/Ubuntu: `sudo apt install make`.

### 2. Start the stack

```bash
git clone <repo-url> && cd Project_Pitching
make dev
```

That is the whole setup. `make dev` copies `.env.staging.example` to `.env.staging` if you
don't have one, builds all five containers, applies the database migrations, seeds demo data
(idempotent — safe on every restart), and starts everything with hot reload. The first build
takes a few minutes; later ones are cached.

This is the **staging** profile — the one you use day to day. There is also an isolated
**demo** profile (`make dev ENV=demo`, port 8090 instead of 8080) for the pitch itself, so
testing a feature never risks corrupting the curated data you're about to present
(`docs/architecture.md` Section 13.1). Both can run at the same time.

### 3. Check it worked

| URL                                   | Should show                       |
| ------------------------------------- | --------------------------------- |
| <http://localhost:8080>               | The web app                       |
| <http://localhost:8080/api/v1/health> | `{"status":"ok","database":"ok"}` |
| <http://localhost:8080/api/docs>      | Interactive OpenAPI docs          |

> **Why port 8080 and not 80?** Port 80 is occupied on most Windows machines. Change
> `PROXY_PORT` in `.env.staging` if you want something else.

If `make dev` fails, the usual causes are Docker Desktop not running, port 8080 already in
use, or a stale volume — `make clean` wipes the database and lets you start over.

---

## The commands you'll actually use

`make` on its own lists everything. The ones that matter day to day:

| Command                           | What it does                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `make dev`                        | Start the whole stack with hot reload                                                                   |
| `make down`                       | Stop it, keeping your data                                                                              |
| `make clean`                      | Stop it and **delete the database**                                                                     |
| `make logs`                       | Tail logs from every container                                                                          |
| `make migrate`                    | Apply pending database migrations                                                                       |
| `make revision m="add household"` | Generate a new migration from model changes                                                             |
| `make lint`                       | ruff + ESLint, same as CI                                                                               |
| `make test`                       | pytest + web tests, same as CI                                                                          |
| `make types`                      | Regenerate `packages/api-types` from the API's OpenAPI schema                                           |
| `make shadcn`                     | Reinstall all shadcn/ui primitives                                                                      |
| `make hazard-web`                 | Stage the committed flood GeoJSON into `apps/web/public/data/`. Stdlib only — run once on a fresh clone |
| `make hazard-derive`              | Rebuild the flood GeoJSON from the source shapefile. Needs GeoPandas; rarely run                        |

**Use these rather than raw `docker compose` commands.** They are what CI runs, so if it passes
locally it passes there.

---

## What's in here

```
apps/web/           Next.js — public site, resident portal, admin console
apps/api/           FastAPI — all business logic, authorization, persistence
services/cron/      Scheduled jobs. The only thing allowed to call external APIs
packages/api-types/ TypeScript types generated from OpenAPI. Never hand-edited
infra/              Compose files, Caddyfile, backup/restore scripts
tools/              One-off developer scripts. Not part of the running system
dataset/            Flood hazard data — raw/ is gitignored, derived/ is committed
docs/               The specification set. Start with docs/frs_nfrs.md
```

Five containers: `proxy` (Caddy) → `web` (Next.js) and `api` (FastAPI) → `db`
(PostgreSQL 16 + PostGIS), plus `cron` running the scheduled jobs. Identical locally and on the
VPS — same Compose file, different `.env` (NFR-MNT-007).

**Every directory above has its own `README.md`**, and the four with real code also have a local
`docs/`. Start there when you are working inside one:

|          | README                                               | Local docs                                                                                                                                                        |
| -------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | [`apps/api`](apps/api/README.md)                     | [modules](apps/api/docs/modules.md) · [migrations](apps/api/docs/migrations.md) · [auth](apps/api/docs/auth.md) · [observability](apps/api/docs/observability.md) |
| Frontend | [`apps/web`](apps/web/README.md)                     | [structure](apps/web/docs/structure.md) · [components](apps/web/docs/components.md) · [data & state](apps/web/docs/data-and-state.md)                             |
| Jobs     | [`services/cron`](services/cron/README.md)           | [jobs](services/cron/docs/jobs.md)                                                                                                                                |
| Stack    | [`infra`](infra/README.md)                           | [deployment](infra/docs/deployment.md) · [backup & restore](infra/docs/backup-restore.md)                                                                         |
| Contract | [`packages/api-types`](packages/api-types/README.md) | —                                                                                                                                                                 |
| Scripts  | [`tools`](tools/README.md)                           | —                                                                                                                                                                 |

---

## Before you write code

**Read [`AGENTS.md`](./AGENTS.md).** It is short, it applies to humans as much as to AI
assistants, and it names the rules that are easy to break by accident.

The short version:

1. **Every unit of work maps to an ID** in [`docs/frs_nfrs.md`](./docs/frs_nfrs.md) — the source
   of truth for what gets built. No ID, no PR.
2. **Branch:** `<type>/<FR-ID>-<slug>`, e.g. `feat/FR-REG-004-member-profiles`.
3. **Commit:** Conventional Commits with `Refs: FR-XXX-NNN` in the footer.
4. **PR title:** `[FR-REG-004] Member profiles with vulnerability flags`.
5. **Update `frs_nfrs.md`'s Status column in the same PR.** The doc is only a source of truth
   if it moves with the code.
6. **Update the affected docs in the same PR** — root `docs/` if the contract changed, the
   unit's local `docs/` if the implementation did (`AGENTS.md` §6). A doc updated in a follow-up
   PR is wrong for as long as the follow-up takes, and follow-ups slip.

A requirement is not done until it meets the eight-point Definition of Done in `AGENTS.md` §3 —
including _works at 360px_, _loading/empty/error states exist_, and _authorization enforced
server-side_.

### The docs, in reading order

| Document                                                      | Answers                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------- |
| [`frs_nfrs.md`](./docs/frs_nfrs.md)                           | **What** to build, with IDs and acceptance criteria            |
| [`architecture.md`](./docs/architecture.md)                   | **How** it is structured — modules, API, deployment            |
| [`schema.md`](./docs/schema.md)                               | The physical database — every table and column                 |
| [`design.md`](./docs/design.md)                               | **How it looks** — colours, type, components, responsive rules |
| [`tech_stack.md`](./docs/tech_stack.md)                       | **Which tools**, and what was deliberately rejected            |
| [`business-requirements.md`](./docs/business-requirements.md) | **Why**, if you need the rationale                             |

---

## Things that will bite you

- **`.env.staging` / `.env.demo` are never committed.** Both gitignored. Add new settings to
  **both** `.env.staging.example` and `.env.demo.example`, or one profile's stack won't start.
- **Testing something risky? Use `ENV=demo`'s isolation, don't rely on remembering to reseed.**
  Staging and demo are separate databases precisely so a half-finished feature in staging can't
  leave the demo data in a broken state before the pitch.
- **No manual SQL.** Every schema change is an Alembic migration (NFR-MNT-004).
- **Never edit `apps/web/public/data/*.geojson`.** It is a copy. The source of truth is
  `dataset/derived/`; stage it with `make hazard-web`, regenerate it with `make hazard-derive`.
  A fresh clone has no copy until `hazard-web` runs — the map degrades rather than blanking.
- **Never hand-edit `packages/api-types/src/generated.ts`.** Run `make types` and commit the
  diff — CI fails if it's stale.
- **Geolocation and camera do not work over plain HTTP.** That is a browser rule, not a bug.
  The manual paths — draggable pin, gallery upload — are the baseline
  (`tech_stack.md` Section 9). `localhost` is exempt, so they do work in development.

---

## Attribution

Flood hazard data © **Project NOAH / UP DREAM–Phil-LiDAR (DOST)**, distributed by BetterGov.ph
under the [ODC-ODbL](https://opendatacommons.org/licenses/odbl/1.0/). Attribution is mandatory
and derivatives inherit the licence (NFR-LGL-001).

Basemap tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
Weather data from [Open-Meteo](https://open-meteo.com/). River level from DOST-PAGASA.
