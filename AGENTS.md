# Agent Rules

Rules for any AI coding agent (Claude Code, Cowork, Gemini, Cursor, Copilot, etc.) working in
this repository. Read this before touching code. It doesn't repeat the docs — it tells you
where to look and what not to violate.

This is the **single, tool-agnostic rules file**. `CLAUDE.md` and `GEMINI.md` (and any
future tool-specific file) just point here — don't duplicate content into them. If a rule
needs to change, change it here, once.

**Project:** `SAGIP-SJ` (System for Alert, Guidance, Incident Reporting, and Preparedness) — Barangay San Jose Disaster Readiness & Community Health Platform.
A prototype for an SK Project Pitching competition, built by a 5-person interdisciplinary
student team (PolSci, PubAd, Nutrition & Dietetics, IT). Optimize for a working, coherent
demo on a fixed deadline — not for production hardening.

### Staging Environment & VPS Info

- **VPS Public IP**: `57.155.90.155`
- **Primary HTTPS Domain**: `https://57-155-90-155.sslip.io`
- **HTTP Staging URL**: `http://57.155.90.155:8080` or `http://57.155.90.155`
- **SSH Target**: `ssh -i C:\Users\MaChew\.ssh\bgh_azure_ed25519 deploy@57.155.90.155`
- **Server Deployment Path**: `/opt/bgh/Project_Pitching`
- **Compose Project Name**: `sagip-staging` (`--env-file .env.staging -f infra/compose.yml`)
- See `.agents/skills/staging-maintenance/SKILL.md` for complete maintenance runbooks.

### Local machine is the default target

**Unless the user explicitly mentions the server, staging, the VPS, or invokes the
`staging-maintenance` skill — assume all Docker and compose operations run on the local
machine.** Do not SSH, push to the server remote, or touch any VPS resource as a side-effect
of a routine "rebuild", "restart", or "run" request. The local stack uses the same
`infra/compose.yml` with `--env-file .env.staging` and project name `sagip-staging`.

## 1. Read order

Before implementing anything, read in this order:

1. [`docs/frs_nfrs.md`](./docs/frs_nfrs.md) — **the source of truth.** Every feature has an
   FR/NFR ID here. If what you're asked to build doesn't map to an ID, stop and say so instead
   of inventing scope.
2. [`docs/architecture.md`](./docs/architecture.md) — service boundaries, module layout,
   repository layout, API conventions.
3. [`docs/schema.md`](./docs/schema.md) — the physical database schema. Don't invent columns
   or tables; if the schema is missing something a requirement needs, that's a doc gap to flag,
   not something to freelance around.
4. [`docs/design.md`](./docs/design.md) — colors, typography, components, responsive rules.
5. [`docs/tech_stack.md`](./docs/tech_stack.md) — why each technology was chosen, and what was
   deliberately rejected. Don't reach for a rejected alternative because it's more familiar.
6. [`docs/business-requirements.md`](./docs/business-requirements.md) — only if you need the
   business rationale behind a requirement. Not needed for routine implementation.

Then, once you know _which_ directory you are working in, read that unit's `README.md` and its
local `docs/` — [`apps/api`](./apps/api/README.md), [`apps/web`](./apps/web/README.md),
[`services/cron`](./services/cron/README.md), [`infra`](./infra/README.md). Those cover how the
code is actually organised and the traps specific to it. Section 6 explains the split.

## 2. ID scheme and git convention

Full detail: `frs_nfrs.md` Section 1. Summary:

- Every unit of work maps to an `FR-<MODULE>-<NNN>` or `NFR-<CATEGORY>-<NNN>` ID from
  `frs_nfrs.md`. No ID, no PR.
- IDs are permanent. Never renumber or reuse a dropped ID.
- Branch: `<type>/<FR-ID>-<short-slug>` (e.g. `feat/FR-REG-004-member-profiles`).
- Commit: Conventional Commits, with `Refs: FR-XXX-NNN[, FR-XXX-NNN]` in the footer.
- PR title: `[FR-XXX-NNN] Short description`.
- **`frs_nfrs.md`'s Status/PR columns must be updated in the same PR that implements the
  requirement.** A requirement is not done if the tracking doc doesn't move with it.

### Pre-publish check

- Before creating a commit, pushing a branch, or deploying to staging, run the affected
  project's lint command (normally `make lint` or the unit's equivalent) and resolve all
  lint errors. Linting is the required pre-publish check; run typechecks or tests as needed
  for the task, but do not make them a blanket prerequisite for every commit, push, or deploy.

## 3. Definition of Done

From `frs_nfrs.md` Section 1.4. A requirement is not `✅` until all of these hold:

1. Acceptance criteria (stated in `frs_nfrs.md`) are met.
2. Works at 360px and at desktop (`design.md` Section 9).
3. Loading, empty, and error states are implemented — not just the happy path.
4. Authorization is enforced server-side, not just hidden in the UI (`NFR-SEC-004`).
5. Keyboard reachable, visible focus, adequate contrast (`NFR-UX-*`).
6. Reviewed by one other team member.
7. `frs_nfrs.md` updated in the same PR.
8. Affected documentation updated in the same PR — root `docs/` if the contract changed,
   the local `docs/` if the implementation did. See Section 6.

Don't mark something done, or imply it's done, if any of these are unmet.

## 4. Repository layout

Full detail: `architecture.md` Section 12. This is a monorepo:

```
apps/web/             Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
apps/api/             FastAPI (Python 3.12+, SQLAlchemy 2.0, Alembic, GeoAlchemy2)
services/cron/        Scheduled jobs — the only thing allowed to call external APIs
packages/api-types/   Generated from OpenAPI. Never hand-edit generated.ts.
tools/                One-off developer scripts. Not part of the running system.
infra/                Compose files, Caddyfile, backup/restore scripts
dataset/raw/          Gitignored — bulky source shapefile downloads
dataset/derived/      Committed — the canonical clipped hazard GeoJSON
docs/                 The specification set — the contract (Section 6)
```

Every top-level unit above carries its own `README.md`, and the four with real code —
`apps/web`, `apps/api`, `services/cron`, `infra` — also carry a local `docs/`. What goes
where is Section 6.

`Makefile` is the single entry point (`make dev`, `make test`, `make lint`, `make types`,
`make hazard-web`). Prefer it over ad-hoc commands so what you run matches what CI runs.

> **On a fresh clone or a fresh environment, run `make hazard-web` before loading
> `/hazard-map`.** `apps/web/public/data/*.geojson` is gitignored, so the flood layer is
> genuinely absent until you stage it. The map degrades rather than blanking, but it will
> look broken to you. `make hazard-derive` is the other half and needs GeoPandas — you
> almost never want it.

## 5. Hard rules — do not violate

- **Routers never touch the database.** Router → service → ORM. See `architecture.md`
  Section 4 for the full module convention (`router.py` / `schemas.py` / `service.py` /
  `models.py`) and the "rules that keep this from rotting."
- **A service may import another module's model classes for read-only joins** (e.g.
  `registry/service.py` importing `geo.models.Area`, `evacuation/service.py` importing
  `geo.models.Facility`, `safety/service.py` importing `registry.models.Household`/`Member`) —
  but it never calls another module's _business logic_ that way. A cross-module write, or
  anything beyond a plain join condition, goes through the owning service instead.
- **`domain/` stays pure.** No I/O, no ORM, no framework imports in `vulnerability.py` or
  `alert_levels.py` — that's what makes them unit-testable.
- **No request path calls an external service directly.** Weather, PAGASA, and any other
  upstream data are fetched by `services/cron` and read from the database. If you're adding a
  feature that needs live external data on a request path, that's an architecture violation —
  raise it, don't route around it.
- **Alerts are always human-issued.** A threshold breach creates a _prompt_ for an officer to
  review, never an auto-published alert. Don't "simplify" this by auto-publishing, even for
  demo convenience.
- **`dataset/derived/*.geojson` is the single source of truth for hazard data**, not
  `apps/web/public/data/`. Never hand-edit the copy in `public/data/` — stage it via
  `make hazard-web`, regenerate the source via `make hazard-derive`. Never commit anything
  under `dataset/raw/`.
- **Map colours come from `apps/web/src/lib/map.ts`, never from the GeoJSON.** The committed
  hazard data carries a `fill_color` property; reading it would put the palette in two places
  with no way to tell which one a wrong colour came from. Layers ignore it.
- **`packages/api-types/src/generated.ts` is never hand-edited.** Regenerate via `make types`
  after any API schema change, and commit the diff in the same PR.
- **Don't reintroduce out-of-scope features.** The following were explicitly cut and should
  not be added back without the user asking: SMS notifications, physical siren/IoT hardware integration (the siren pin UI and manual trigger are in scope; real hardware is not),
  post-registration profile claiming, safe routes/blocked roads on the map, donation
  inventory/allocation/distribution tracking, native mobile apps, payment processing, any
  barangay other than San Jose, full offline sync. Full list with rationale: `frs_nfrs.md`
  Section 2.
- **Don't add a new dependency or swap a chosen technology without checking `tech_stack.md`
  first.** If it's not there, either it needs to be added there (with rationale) before use,
  or it's one of the "what we deliberately did not choose" items — check before reaching for
  it.
- **Flood hazard colors are yellow/orange/red** (`#FFED4A` / `#F59E0B` / `#EF4444`) per the
  official Philippine government hazard-map convention — not blue. See `design.md` Section
  3.4 for why, and the rule that hazard is always a translucent map fill while alert level is
  always a solid badge, never rendered as the other form.
- **Do not modify the three finalized public map configurations.** The three public map views —
  (1) Landing Page map preview (`/`, `center=[14.7415, 121.1315]`, `zoom={13.38}`, hazard overlay enabled),
  (2) Dedicated Flood Hazard Map (`/hazard-map`, `center=[14.7415, 121.1315]`, `zoom={14.25}`, hazard overlay enabled), and
  (3) Barangay Facilities Map (`/barangay-facilities`, `center=[14.7435, 121.1305]`, `zoom={14.15}`, hazard overlay disabled) —
  are finalized. When developing future maps (e.g. inside the admin/resident portal), create isolated map views or components rather than altering the zoom, center, or layer defaults of these three public maps.

## 6. Documentation — what lives where, and when to update it

Docs are two-tier. The tiers answer different questions and change for different reasons.

|              | Root `docs/`                                                                                | Local `<unit>/docs/`                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Answers      | **What** we are building and **why**                                                        | **How** this codebase does it                                                        |
| Owns         | FR/NFR IDs, the physical schema, the design system, technology choices, system architecture | Module conventions, workflows, local gotchas, the commands you actually type         |
| Audience     | The whole team, including non-IT members                                                    | Whoever is editing that directory                                                    |
| Changes when | The product or the contract changes                                                         | The code changes                                                                     |
| Examples     | "Households carry a `reference_no` (FR-REG-006)" · "`primary-600` is `#1F8049`"             | "Register every `models.py` in `models_registry.py` or autogenerate drops the table" |

### The rule that keeps them from drifting

> **A local doc never restates a requirement, a column, or a token value. It links to the
> root doc that owns it.**

If one change would force you to edit both tiers, one of them is in the wrong place. Duplication
between docs is the failure mode this split exists to avoid — see Section 7.

Concretely: `apps/web/docs/components.md` does **not** list the colour palette. It links to
`docs/design.md` Section 3 and explains how those tokens are wired into `globals.css`. If the
palette changes, exactly one file changes.

### What to update, and when

Update docs **in the same PR** as the code. A doc updated in a follow-up PR is a doc that is
wrong for as long as the follow-up takes, and follow-ups slip.

| You did this                                     | Update                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Implemented an FR                                | `frs_nfrs.md` Status/PR columns (already required by Section 2)                                             |
| Added or changed a table or column               | `docs/schema.md`, then `apps/api/docs/migrations.md` only if the _workflow_ changed                         |
| Added an API module or endpoint                  | `docs/architecture.md` Section 6 if the contract changed; `apps/api/docs/modules.md` if the convention did  |
| Added a `components/common/` composite           | `apps/web/docs/components.md` — and `docs/design.md` Section 7.2 only if it is a new entry in the inventory |
| Added or changed a scheduled job                 | `docs/architecture.md` Section 9 (the cadence table) and `services/cron/docs/jobs.md`                       |
| Changed how the stack is built, run, or deployed | `infra/docs/` and the affected `README.md`                                                                  |
| Added a dependency                               | `docs/tech_stack.md`, with the rationale — before you use it (Section 5)                                    |
| Discovered a gotcha that cost you an hour        | The local `docs/` of the unit it bit you in. This is the highest-value thing in this table                  |
| Changed a decision that a doc explains           | Fix the explanation, not just the fact. A stale _why_ is worse than a missing one                           |

### Writing them

- Match the terse, direct tone already in the docs. No padding.
- Explain the **why**, not just the what. Anyone can read the code for the what.
- Prefer a short table over three paragraphs.
- A doc that only restates filenames is worse than no doc — it rots and misleads. If you have
  nothing non-obvious to say about a directory, say nothing.
- Every local `docs/` has a `README.md` index. Add new files to it.

## 7. Style notes

- Match the terse, direct tone already in the docs. Don't pad PR descriptions or comments.
- When a correction is made to one doc (e.g. a renamed path, a scope change), check whether
  the same fact is stated in the other five docs and fix it there too. Inconsistency between
  docs is a bug.
- This team is mostly non-IT. Prefer boring, explainable solutions over clever ones — a
  PolSci or Nutrition teammate should be able to follow a PR description even if they can't
  read the diff.

## 8. Adding a new tool-specific pointer file

If a teammate uses a coding agent that reads a different filename (e.g. `.cursorrules`,
`copilot-instructions.md`), add it as a one-line pointer to this file, matching the pattern
in `CLAUDE.md` / `GEMINI.md`. Never fork the rules into a second copy.

## 9. Demo release — August 17, 2026

`main` at `ce66a7e` established the approved Public Information Site and Barangay Portal baseline.
The current demo release also includes the completed Resident Portal. Do not make speculative
layout or workflow changes to these surfaces. Final About/platform and team detail remains pending
project-supplied content; do not invent it. This protects the pitch baseline; it does **not** waive
the FR/NFR mapping, Definition of Done, authorization, documentation, lint, or review rules.

See [`docs/demo-freeze.md`](./docs/demo-freeze.md) for the exact release boundary and remaining
content dependency.
