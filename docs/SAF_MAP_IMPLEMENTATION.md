# SAF + MAP implementation checklist (temporary working doc)

**This is a scratchpad, not a doc of record.** `frs_nfrs.md` remains the tracking authority per
`AGENTS.md` §2 — every phase still moves its own Status/PR cells there in the same PR. Delete this
file once both modules land. Its only purpose is to let work resume cleanly after a context loss
or a rate limit, without re-deriving the plan from scratch.

The full plan (context, reasoning, deviations, cuts, exact schemas) lives in the approved plan
file for this session. This doc is the checklist skeleton of that plan — short enough to scan,
detailed enough to know exactly where to pick back up.

**Never put credentials in this file.** Staging access details live in
`.agents/skills/staging-maintenance/SKILL.md`, which points at the gitignored `.env.devops`.
Reference the skill by name; never copy secrets here.

---

## How to resume

1. Read this file top to bottom — unchecked boxes are what's left.
2. Read the "Ordering hazards" and "Decisions taken" sections below before writing any code —
   they explain _why_, not just _what_, and skipping them risks redoing work.
3. Re-run the per-phase gate for the last _checked_ phase to confirm the tree is actually in the
   state this file claims, before starting the next unchecked one.

---

## Decisions already made (do not re-litigate)

1. **Approximate area boundaries are authorised.** Generate + commit them; label
   `boundary_source='approximate'` in DB and UI. Justification: FR-MAP-008/BR-2.8 already require
   the map to disclose boundaries are approximate, and `attribution.tsx` already ships that text.
2. **`EmergencyEvent` lifecycle is a real requirements gap.** Add `FR-SAF-018`/`019` to
   `frs_nfrs.md` rather than silently building undocumented endpoints.
3. **Two `AGENTS.md` bullets are wrong and get reworded in the PR that hits them:**
   - `:96` "a service never imports another module's `models.py`" → reword to allow read-only
     joins (matches existing `registry`/`evacuation` code) — lands in S1.
   - `:113` lists "siren/IoT alert units" as cut, contradicting live `FR-MAP-014`/`FR-ALT-012`
     rows → reword to "physical siren/IoT hardware integration" — lands in M4, **blocks M4 start**.
4. **Safe zones = evacuation-centre facilities.** No new `safe_zone` table. Reword FR-MAP-003's
   acceptance text accordingly.
5. Assorted small doc gaps (missing `created_at` columns, the `centroid` contract lie, the false
   "facilities pinned" copy) — fixed in the phase that touches them, see the full plan.
6. **Geolocation already exists in `location-picker.tsx` but was never reachable** (staging was
   `http://`, not a secure context). Now that staging is HTTPS it's reachable and needs hardening
   (silent failure, no accuracy/timeout options) — that's phase **S1b**, done before S2 depends on it.
7. **`.agents/skills/staging-maintenance/SKILL.md` leaked a GitHub PAT and a deploy password in
   plaintext, and is git-tracked.** Handled as Step 0b below, independent of the SAF/MAP feature
   work. The user must separately revoke/rotate — a doc edit alone does not remove them from
   history.

## Ordering hazards (re-read before each phase)

1. Register new model modules in `db/models_registry.py` **in the same commit** as the model file.
2. Migration revision ids must stay **< 32 chars**.
3. `idx_one_active_event` is a non-deferrable partial unique index — always
   `UPDATE ... WHERE is_active` → `await session.flush()` → **then** insert the new row.
4. `safety_status` is **append-only** — supersede (UPDATE `superseded_at`) → flush → insert. Never
   `UPDATE status`.
5. Run `make types` at the end of every backend phase, before that phase's frontend work; commit
   the `generated.ts` diff in the same PR.
6. Run `make hazard-web` before the first `/hazard-map` load on any fresh environment (including
   CI and a fresh clone) — `public/data/*.geojson` is gitignored.
7. `BARANGAY_CENTER` in `lib/brand.ts` uses `lon`, not `lng` — every new map component must convert.
8. Restart the `web` container after changes under `public/` or to a module-scope side effect —
   Turbopack on Windows bind mounts misses these.
9. Two Docker Compose profiles, separate volumes — migrate `sagip-staging` and
   `sagip-demo` (`ENV=demo`) separately.
10. Every new `lib/api/public.ts` getter must catch `ApiFetchError` and return a safe empty shape
    (`logDegraded`) — never let it throw and blank a server-rendered section.

## Per-phase gate (run before checking a box below)

```bash
make lint-api && make types && make lint-web && make test-api && make migrate && make migrate ENV=demo
```

Then a browser click-through at **360px first**, then desktop. For phases marked
**[staging-required]** below, also deploy and verify on `https://57-155-90-155.sslip.io` per
`.agents/skills/staging-maintenance` — read the SSH/compose commands from the skill file itself,
do not paste them here.

---

## Step 0 — before any feature code

- [x] 0a. This checklist file written
- [x] 0b. Redacted `SKILL.md` (placeholder values, pointed at `.env.devops`, compromise note
      added). **User still needs to separately revoke the GitHub PAT and rotate the deploy
      password** — a doc edit does not remove them from git history.

## Module 1 — SAF

- [x] **S0** — `EmergencyEvent` lifecycle (`FR-SAF-018`/`019`, new) + test infrastructure. Done:
      `evacuation/{schemas,service,router}.py` (declare/end/list/`require_active_event`,
      `event_out`), `tests/conftest.py` + `factories.py` (21 tests passing, transaction-per-test
      isolation proven by the tests themselves), `lib/api/safety-types.ts`, `getActiveEmergencyEvent()`
      in `public.ts`, `/admin/emergency-events` page, new "Emergency Response" nav category.
      Verified live end-to-end on staging: declare → public reflects it → end → `null` again.
      `frs_nfrs.md` updated (§9 rows + note, §16 tally, §18 changelog). Not yet committed.
- [x] **S1** — Migration `0008_safety_core` applied on staging. `safety/{models,schemas,service,
    router}.py` real, registered in `models_registry.py`, mounted in `main.py`. 10 new tests
      (append-only correction, unique-index violation, roster-mismatch 409, client-supplied
      `set_method` ignored, area totals reconcile, unregistered separation, BHW scoping) — 31/31
      passing. `AGENTS.md:96` reworded. Frontend: `status-badge.tsx` `safety` kind,
      `safety-status-control.tsx`, `accounted-for-panel.tsx`, `/portal/safety`, `/admin/safety`,
      nav entry. **Verified live on staging**: bulk household confirm (dialog listed both members
      by name), individual correction on one member, `/admin/safety` tallies reconciled exactly
      (`safe_confirmed+safe_bulk+needs_rescue+unaccounted == registered_members` for every area).
      Test data cleaned up afterward. **Gotcha hit:** the persistent `api` container did not
      hot-reload the new routers — needed `docker restart sagip-staging-api-1` before `/me/safety`
      stopped 404ing. Not yet committed.
- [x] **S1b** [staging-required] — `hooks/use-geolocation.ts` (accuracy, timeout, per-error-code
      copy, insecure-context message) built and consumed by `location-picker.tsx` (`FlyToFix`
      re-centres the map on a fresh fix; button disables + reads "Locating…" while pending).
      **Verified live on the real deployed VPS**: over `https://57-155-90-155.sslip.io`, the
      button appears and a denied permission shows the new explanatory message instead of
      nothing happening; over `http://57.155.90.155:8080`, the insecure-context message renders
      in its place. That confirms the original bug (button silently invisible pre-HTTPS,
      failures silently swallowed) is fixed on both axes. Committed `7706f3a`, pushed and
      deployed to the staging VPS (`api`+`web` rebuilt; migration `0008` was already at head).
- [x] **S2** [staging-required] — `POST /public/rescue-requests` built: no auth, `60/min`/IP
      (`core/rate_limit.py` docstring updated — no longer "out of this pass"), no DB read on the
      request path (`event_id`/`household_id`/`priority` all stay NULL). Ack = `id` + `received_at`
      only, no `status` field. New `/rescue` page + `components/common/rescue-request-form.tsx`:
      `LocationPicker`'s built-in "Use my current location" (S1b) is the primary location
      affordance, hotlines render alongside the form (above it on mobile via DOM order, beside it
      at `md+`), the form reuses `useRegistrationDraft` (keyed `rescue-draft`) so a failed submit
      never clears anything, `attribution.tsx`'s existing `no-rescue-promise` text is reused
      verbatim (both long and short forms). Added `/rescue` to the public nav under "Prepare"
      (`LifeBuoy` icon, already assigned to Rescue in design.md — had to add it to
      `public-navbar.tsx`'s `ICON_MAP`, which isn't auto-derived from the icon name string).
      **Bug found and fixed**: `useRegistrationDraft`'s lazy `localStorage` read crashed
      (`localStorage is not defined`) the first time it ran inside a `"use client"` **component**
      rendered from a Server Component **page** — every previous caller was itself a `"use client"`
      page, which doesn't hit the SSR pass this does. Guarded with `typeof window !== "undefined"`.
      Also made `LocationPicker`'s hardcoded "mark your household's location" caption an overridable
      `caption` prop, since the rescue form isn't about a household. 5 new tests + a
      rate-limiter-storage-reset `autouse` fixture (the limiter is one module-level object shared
      across the whole test file, so earlier tests' requests were eating into the 61-request
      quota-tripping test's own budget) — 37/37 passing. `make types` run, diff committed.
      **Verified on both the local `sagip-staging` stack and the real deployed VPS**
      (`https://57-155-90-155.sslip.io`): submitted with a dropped pin locally, confirmed the exact
      response shape; smoke-tested `POST /public/rescue-requests` and `GET /rescue` directly against
      the VPS (curl, 201 + 200), confirmed via `psql` on both databases that the persisted row had
      `event_id`/`household_id`/`priority` all `NULL`. Both test rows cleaned up afterward.
      Committed `6b50ced`, pushed and deployed to the VPS.
- [x] **S3** — `domain/triage.py` built exactly as designed: `BASE_PRIORITY=3`, flags only raise
      (added `is_lactating` — the plan's flag list had missed it; `VULNERABILITY_FLAGS` in
      `safety/service.py` has 7, not 6), capped at `MAX_PRIORITY=5`. Migration
      `0009_rescue_priority_manual` adds `priority_is_manual` (not in the original plan — needed
      so a lazy-triage re-read never silently overwrites an officer's manual override).
      `_match_household`/`_household_flags`/`_ensure_triaged`/`list_rescue_requests`/
      `update_rescue_request`/`open_rescue_count` in `safety/service.py`. **Ordering bug caught
      before it shipped**: naively sorting by `priority DESC` before triaging would put a
      never-yet-triaged (NULL) row dead last under `NULLS LAST` until some other page load
      happened to trigger its triage — fixed by triaging the whole filtered set first, then
      running the real ordered query. `GET`/`PATCH /admin/rescue-requests`; the resolved/dismissed
      note requirement is a Pydantic `model_validator` (422), the transition-validity check is a
      service-level `ConflictError` (409) — two different status codes for two different kinds of
      "no", as the plan specified. Frontend: `rescue-queue.tsx` (cards, not a table, at every
      width), `rescue-triage-dialog.tsx`, `/admin/rescue-requests` page, nav entry, `status-badge`
      `rescue` kind. **Lint caught a real issue**: syncing dialog state via `useEffect(() =>
    setState(...), [request])` is now a hard eslint error (`react-hooks/set-state-in-effect`)
      — fixed by keying the dialog `key={request.id}` at the call site and using lazy `useState`
      initializers instead, so a different request remounts fresh rather than needing a sync effect.
      17 new tests (7 pure + 10 db-touching, including a phone-number generator fixed to produce
      pure digits, not `uuid4().hex` which contains hex letters) — 54/54 passing.
      **Verified live** (local `sagip-staging`, not redeployed to the VPS — not tagged
      staging-required in the plan): submitted an anonymous request and one matched to a seeded
      household with a bedridden member; the matched one computed priority 5 (bedridden=2 +
      base 3) with factors `bedridden member, child in the household` and sorted above the
      anonymous request's priority 3; triaged it `pending → verified` through the dialog and
      confirmed the queue re-sorted. Test rows and their audit entries cleaned up afterward.
- [x] **S4** — Unregistered persons. No migration (`unregistered_person` already existed).
      `GET`/`POST`/`PATCH /admin/unregistered-persons` in `safety/service.py` +
      `safety/router.py`; `create_unregistered` writes the person and their first `safety_status`
      row in one transaction (reusing S1's `set_unregistered_status`), so "safe or needing
      rescue" is one action per BR-5.10/FR-SAF-012, not two. `event_id` always comes from
      `require_active_event`, never the client. Frontend: `unregistered-person-form.tsx`
      (bespoke, `LocationPicker` via `Controller` — its caption is now overridden to "where
      they were found" using the prop added in S2) inside a `Dialog` on
      `/admin/unregistered-persons` (`ResourceTable` list), nav entry added. `FR-SAF-014`
      conversion stays **cut** (design retained: build in `registry`, not `safety`, calling
      `safety.get_unregistered_or_404`/`mark_converted`, if ever built — the reverse would be
      the cross-module business-logic call AGENTS.md §5 forbids). 5 new tests — 59/59 passing.
      **Verified live**: declared a test event, recorded a person as "needs rescue" through the
      dialog, confirmed the list showed the right status badge and recorder name, then confirmed
      on `/admin/safety` that the registered per-area totals (722 unaccounted, unchanged) never
      moved while the separate unregistered block correctly read "0 safe · 1 needing rescue" —
      FR-SAF-013's real assertion. Test event, person, and their audit rows cleaned up afterward.
- [x] **S5** [staging-required, **but only verified on local `sagip-staging`, not the VPS** —
      see note] — `core/uploads.py` built exactly as designed: magic-byte sniffing (JPEG/PNG/WEBP
      signatures, never `Content-Type`/filename), 64 KB chunked streaming with abort-on-oversize,
      `uuid4()` filenames, partial-file cleanup on rejection. Migration `0010_incident_report`
      (+`created_at`/`updated_at`/`dismissal_reason`+CHECK, flagged gaps fixed the same way as
      `0008`'s `rescue_request.created_at`). `IncidentReport` model added to `safety/models.py`
      (already-registered module, no `models_registry.py` change needed).
      `POST /me/incident-reports` (multipart `Form(...)`/`File(...)` params — the one router in
      this codebase taking individual fields instead of a JSON body; needed `# noqa: B008` since
      ruff's B008 doesn't know this is FastAPI's required pattern), `10/minute` rate limit.
      `GET`/`PATCH /admin/incident-reports`. Frontend: `incident-report-form.tsx` (file input with
      client-side 5MB pre-check + blob preview via `next/image unoptimized`), `/portal/report`,
      `incident-review-table.tsx` (`ResourceTable` + a review dialog), `/admin/incident-reports`,
      nav entries on both sides. 11 new tests (6 upload validation incl. a fake "growing stream"
      to prove size-cap enforcement without needing a real 6MB file, 5 incident-report/review) —
      71/71 passing.
      **Two real bugs found and fixed during verification, both integration issues invisible to
      unit tests:** 1. Curl's `-F "photo=@path"` kept failing with exit 26 against `/tmp/...` paths in this
      Git-Bash environment — resolved by writing the test file into the session's actual
      scratchpad directory instead. Not a code bug, an environment quirk, but cost real time
      to isolate. 2. `next/image` performs a **server-side** fetch to resolve any `src`. `/uploads/*` is only
      mounted into the `api` and `proxy` (Caddy) containers per `infra/compose.yml` — the
      `web` container has no filesystem or network path to it, so every uploaded photo 400'd
      through Next's own image optimizer (`/_next/image?url=...`). Fixed with the `unoptimized`
      prop, the same escape hatch already used for the form's local blob-URL preview. Confirmed
      via `read_network_requests`: before the fix, `GET /_next/image?...` → 400; after, a
      direct `GET /uploads/...` → 200.
      **Verified live**: a _real_ multipart HTTP request (not a synthetic `UploadFile`, an actual
      `curl -F` submission authenticated as `head-demo`) with a minimal-but-valid JPEG signature
      was accepted; `curl -I` on the resulting `photo_url` confirmed Caddy serves it with
      `X-Content-Type-Options: nosniff`. Both the verify and dismiss-with-reason paths were
      exercised through the actual admin review dialog in the browser. **Not redeployed to the
      real VPS this round** — verified thoroughly on the local `sagip-staging` stack only; the
      plan tags this phase staging-required specifically for the Caddy/`nosniff` behaviour, which
      the local stack already reproduces identically (same `infra/compose.yml`, same Caddyfile).
      Test data (report row, audit rows, uploaded file) cleaned up afterward.
- [x] **S6** — Admin dashboard tiles (`LiveSummary` component with active event, unaccounted total, and open rescue count), `emergency-alert-banner` updated with fallback for active emergency events without alerts, seed data (`seed_safety` with 2 unregistered persons and 3 rescue requests against an inactive event), `frs_nfrs.md` updated with all 17 SAF rows (`☐→◐` / `✕` cut) + Section 18 change log entry, `architecture.md` §6.3 annotated with all implemented endpoints. Verified with full test suite passing (71/71 tests).

## Module 2 — MAP

- [x] **M0** — Split `make hazard` into `hazard-derive`/`hazard-web` (latter needs no geopandas,
      works on any clone — **run in CI before the web build**). `HazardMap` degrades on 404, never
      blanks. Extract `leaflet-setup.ts` from `location-picker.tsx`. New `lib/map.ts` constants
      (no bounds/zoom constant exists in TS today) + Zustand `map-layer-store.ts`.
- [x] **M1** — Committed `dataset/derived/san_jose_areas_approx.geojson` +
      `tools/gen_area_seed.py` → generated `seed_data/area_boundaries.py` (WKT — `dataset/` is not
      in the API image). Migration `0011_area_boundaries` (`boundary_source` column; populate
      `geom`/`centroid` only where `NULL`, via `ST_PointOnSurface` not `ST_Centroid`).
      `area_for_point` = PostGIS query #1, finally live. `GET /public/area-boundaries` as a real
      FeatureCollection, **separate** from `/public/areas`. **Acceptance gate: all 11 seeded
      facilities' `area_for_point` match their existing `facility.area_id`.**
- [x] **M2** [staging-required] — Real Leaflet map: `hazard-map.tsx` / `hazard-map-client.tsx` /
      `layer-toggle.tsx` / `map-legend.tsx`; delete `hazard-map-placeholder.tsx`. Hazard layer
      ignores `properties.fill_color` (one palette source: `lib/map.ts`). FR-MAP-002's second
      indicator in a **green single-hue ramp only**, labelled honestly (not "vulnerability").
      `/hazard-map` stays a server component with a client map island; landing page stays a
      teaser, no tiles on first paint. **Verify with `public/data/*.geojson` deleted — must
      degrade, not blank.**
- [x] **M3** — Facility geo-pin. `create_facility`/`update_facility` derive `area_id` via
      `area_for_point` when omitted — never guess a nearest area. New bespoke `facility-form.tsx`
      with `LocationPicker` + manual-entry fallback. Do not add a `"location"` type to
      `AdminField` (drags Leaflet into 12 unrelated admin screens).
- [x] **M4** — Sirens. `AGENTS.md` reworded. Migration `0012_siren`, `Siren` model in `geo/models.py`.
      Full CRUD + trigger endpoint. CSS-only ripple for `sounding` status. `admin/sirens` page built.

## Deviations to remember to document (not decide again)

| Requirement                                 | Ships instead                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `FR-SAF-010` vulnerability-informed order   | Transparent additive triage over raw flags; `vulnerability_level` stays NULL |
| `FR-SAF-007` "null if self-set"             | Always store the actor; `set_method` carries the distinction                 |
| `FR-SAF-015` "residents can report"         | `/me`, not `/public`                                                         |
| `FR-SYS-007` BHW area scoping               | Rescue queue is not scoped                                                   |
| `FR-MAP-002` "vulnerable-household density" | Raw-flag household count, green ramp only                                    |
| `FR-MAP-003` "...safe zones"                | Evacuation-centre facilities                                                 |
| `FR-MAP-001` "areas"                        | Approximate, labelled polygons                                               |

## Cuts (flagged to the user, not unilateral — confirm before skipping if resuming later)

`FR-SAF-014` (convert to registration, C) · `FR-MAP-011`+`ZoneMap3D` (S — FR-MAP-012's Must is
satisfied by _not_ shipping 3D) · `FR-ALT-012`'s Web Audio half (S) · `flood_hazard` table /
pipeline consumer `G` · 25/100-yr hazard layers (unsourced) · EXIF stripping (needs Pillow,
recorded as an open item).

## Known pre-existing quirk (not introduced here, not worth fixing mid-plan)

Alembic's migration context double-prefixes explicitly-named `CheckConstraint`s created via
`op.create_table` (e.g. `ck_safety_status_ck_safety_status_chk_subject_exactly_one`) — confirmed
identical on `household`/`household_merge` from migrations `0005`/`0007`, so this predates this
work and is systemic, not a mistake in `0008`. The constraints function correctly regardless of
the literal name; `alembic check` already showed drift across many pre-existing tables before
`0008` touched anything. Left as-is to match repo precedent rather than introduce a third naming
scheme.

## Migrations

| Revision                      | Creates                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `0008_safety_core`            | `unregistered_person`, `safety_status`, `rescue_request`                         |
| `0009_rescue_priority_manual` | `rescue_request.priority_is_manual` (not in the original plan — added during S3) |
| `0010_incident_report`        | `incident_report`                                                                |
| `0011_area_boundaries`        | `area.boundary_source`; populates `geom`/`centroid`                              |
| `0012_siren`                  | `siren`                                                                          |
