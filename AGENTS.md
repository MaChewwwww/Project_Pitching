# Agent Rules

Rules for any AI coding agent (Claude Code, Cowork, Gemini, Cursor, Copilot, etc.) working in
this repository. Read this before touching code. It doesn't repeat the docs — it tells you
where to look and what not to violate.

This is the **single, tool-agnostic rules file**. `CLAUDE.md` and `GEMINI.md` (and any
future tool-specific file) just point here — don't duplicate content into them. If a rule
needs to change, change it here, once.

**Project:** `[APP_NAME]` — Barangay San Jose Disaster Readiness & Community Health Platform.
A prototype for an SK Project Pitching competition, built by a 5-person interdisciplinary
student team (PolSci, PubAd, Nutrition & Dietetics, IT). Optimize for a working, coherent
demo on a fixed deadline — not for production hardening.

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

## 3. Definition of Done

From `frs_nfrs.md` Section 1.4. A requirement is not `✅` until all of these hold:

1. Acceptance criteria (stated in `frs_nfrs.md`) are met.
2. Works at 360px and at desktop (`design.md` Section 9).
3. Loading, empty, and error states are implemented — not just the happy path.
4. Authorization is enforced server-side, not just hidden in the UI (`NFR-SEC-004`).
5. Keyboard reachable, visible focus, adequate contrast (`NFR-UX-*`).
6. Reviewed by one other team member.
7. `frs_nfrs.md` updated in the same PR.

Don't mark something done, or imply it's done, if any of these are unmet.

## 4. Repository layout

Full detail: `architecture.md` Section 12. This is a monorepo:

```
apps/web/           Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
apps/api/            FastAPI (Python 3.12+, SQLAlchemy 2.0, Alembic, GeoAlchemy2)
services/cron/        Scheduled jobs — the only thing allowed to call external APIs
packages/api-types/   Generated from OpenAPI. Never hand-edit generated.ts.
tools/                One-off developer scripts. Not part of the running system.
infra/                Compose files, Caddyfile, backup/restore scripts
dataset/raw/           Gitignored — bulky source shapefile downloads
dataset/derived/       Committed — the canonical clipped hazard GeoJSON
docs/                 This doc set
```

`Makefile` is the single entry point (`make dev`, `make test`, `make lint`, `make types`,
`make hazard`). Prefer it over ad-hoc commands so what you run matches what CI runs.

## 5. Hard rules — do not violate

- **Routers never touch the database.** Router → service → ORM. See `architecture.md`
  Section 4 for the full module convention (`router.py` / `schemas.py` / `service.py` /
  `models.py`) and the "rules that keep this from rotting."
- **A service never imports another module's `models.py`.** Cross-module access goes through
  the owning service, not a direct query.
- **`domain/` stays pure.** No I/O, no ORM, no framework imports in `vulnerability.py` or
  `alert_levels.py` — that's what makes them unit-testable.
- **No request path calls an external service directly.** Weather, PAGASA, and any other
  upstream data are fetched by `services/cron` and read from the database. If you're adding a
  feature that needs live external data on a request path, that's an architecture violation —
  raise it, don't route around it.
- **Alerts are always human-issued.** A threshold breach creates a *prompt* for an officer to
  review, never an auto-published alert. Don't "simplify" this by auto-publishing, even for
  demo convenience.
- **`dataset/derived/*.geojson` is the single source of truth for hazard data**, not
  `apps/web/public/data/`. Never hand-edit the copy in `public/data/` — regenerate via
  `make hazard`. Never commit anything under `dataset/raw/`.
- **`packages/api-types/src/generated.ts` is never hand-edited.** Regenerate via `make types`
  after any API schema change, and commit the diff in the same PR.
- **Don't reintroduce out-of-scope features.** The following were explicitly cut and should
  not be added back without the user asking: SMS notifications, siren/IoT alert units,
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

## 6. Style notes

- Match the terse, direct tone already in the docs. Don't pad PR descriptions or comments.
- When a correction is made to one doc (e.g. a renamed path, a scope change), check whether
  the same fact is stated in the other five docs and fix it there too. Inconsistency between
  docs is a bug.
- This team is mostly non-IT. Prefer boring, explainable solutions over clever ones — a
  PolSci or Nutrition teammate should be able to follow a PR description even if they can't
  read the diff.

## 7. Adding a new tool-specific pointer file

If a teammate uses a coding agent that reads a different filename (e.g. `.cursorrules`,
`copilot-instructions.md`), add it as a one-line pointer to this file, matching the pattern
in `CLAUDE.md` / `GEMINI.md`. Never fork the rules into a second copy.
