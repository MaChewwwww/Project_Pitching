# Functional & Non-Functional Requirements

**Project:** `SAGIP-SJ` (System for Alert, Guidance, Incident Reporting, and Preparedness) — Barangay San Jose Disaster Readiness & Community Health Platform
**Version:** 0.1 · **Date:** August 2026
**Status:** Source of truth for implementation

**Companions:** [`business-requirements.md`](./business-requirements.md) · [`tech_stack.md`](./tech_stack.md) · [`design.md`](./design.md)

---

## 1. How to Use This Document

This is the **single source of truth** for what gets built. Every branch, commit, and pull request maps back to an ID here.

### 1.1 ID scheme

```
FR-<MODULE>-<NNN>     functional requirement
NFR-<CATEGORY>-<NNN>  non-functional requirement
```

IDs are **permanent**. A requirement that is removed is marked `Dropped` and its ID is never reused — otherwise old commits point at the wrong thing.

| Code  | Module                                                             | BRD           |
| ----- | ------------------------------------------------------------------ | ------------- |
| `SYS` | Platform foundation — auth, roles, audit, configuration            | cross-cutting |
| `PUB` | Public information site                                            | M0            |
| `REG` | Community registry, members, vulnerability, health worker feedback | M1            |
| `MAP` | Barangay zone map                                                  | M2            |
| `WX`  | Flood & weather watch                                              | M3            |
| `ALT` | Alerts & announcements                                             | M4            |
| `SAF` | Safety check-in & rescue                                           | M5            |
| `EVC` | Evacuation center operations                                       | M6            |
| `DON` | Donation drive posts                                               | M7            |
| `ACT` | Activities & volunteers                                            | M8            |
| `PRP` | Preparedness hub                                                   | M9            |
| `ANL` | Analytics & reporting                                              | M10           |

NFR categories: `PERF` `AVL` `SEC` `PRV` `UX` `CMP` `MNT` `OBS` `DAT` `LOC` `LGL`

### 1.2 Git convention

**Branch**

```
<type>/<FR-ID>-<short-slug>

feat/FR-REG-004-member-profiles
fix/FR-SAF-011-bulk-safe-confirmation
chore/NFR-MNT-003-ci-lint
```

**Commit** — Conventional Commits, with the ID in the footer:

```
feat(registry): add member profile form with vulnerability flags

Implements per-member capture of child/senior/PWD/pregnant/chronic/
bedridden flags feeding the vulnerability classifier.

Refs: FR-REG-004, FR-REG-012
```

**Pull request title**

```
[FR-REG-004] Member profiles with vulnerability flags
```

A PR may close several requirements. List them all in the description as `Closes FR-REG-004, FR-REG-012`, then update the **Status** and **PR** columns in this document **in the same PR**. The doc is only a source of truth if it moves with the code.

### 1.3 Status values

| Value | Meaning                                     |
| ----- | ------------------------------------------- |
| `☐`   | Not started                                 |
| `◐`   | In progress                                 |
| `👁`   | In review                                   |
| `✅`  | Done — merged and meets acceptance criteria |
| `⏸`   | Deferred                                    |
| `✕`   | Dropped — ID retired, never reused          |

### 1.4 Definition of Done

A requirement is `✅` only when all of the following hold:

1. Acceptance criteria met.
2. Works at **360px** and at desktop (`design.md` Section 9).
3. Loading, empty, and error states implemented — not just the happy path.
4. Server-side authorization enforced, not just UI hiding (`NFR-SEC-004`).
5. Keyboard reachable, visible focus, adequate contrast (`NFR-UX-*`).
6. Reviewed by one other team member.
7. This document updated in the same PR.
8. Affected documentation updated in the same PR — this `docs/` set if the contract changed,
   the unit's local `docs/` if the implementation did (`AGENTS.md` Section 6).

### 1.5 Priority

`M` Must · `S` Should · `C` Could — inherited from the BRD. Priority is build order **within** a module. A retired requirement remains in its table with `✕`; its ID is never reused.

### 1.6 Module Progress Overview

| Code  | Module                                      | Total | Done (`✅`) | In Progress (`◐`) | In Review (`👁`) | Not Started (`☐`) | Deferred (`⏸`) | Dropped (`✕`) | Active Completion |
| ----- | ------------------------------------------- | :---: | :---------: | :---------------: | :-------------: | :---------------: | :------------: | :-----------: | :---------------: |
| `SYS` | Platform Foundation                         |  18   |      0      |        12         |        0        |         6         |       0        |       0       |      **67%**      |
| `PUB` | Public Information Site                     |  20   |      0      |        18         |        0        |         2         |       0        |       0       |      **90%**      |
| `REG` | Community Registry                          |  42   |      0      |        20         |        0        |        11         |       0        |      11       |      **65%**      |
| `MAP` | Barangay Zone Map                           |  14   |      0      |        12         |        0        |         2         |       0        |       0       |      **86%**      |
| `WX`  | Flood & Weather Watch                       |  16   |      0      |        14         |        0        |         2         |       0        |       0       |      **88%**      |
| `ALT` | Alerts & Announcements                      |  15   |      0      |        11         |        0        |         4         |       0        |       0       |      **73%**      |
| `SAF` | Safety Check-In & Rescue                    |  19   |      0      |        18         |        0        |         0         |       0        |       1       |     **100%**      |
| `EVC` | Evacuation Center Operations                |   8   |      0      |         2         |        0        |         6         |       0        |       0       |      **25%**      |
| `DON` | Donation Drive Posts                        |  17   |      0      |         1         |        0        |         3         |       0        |      13       |      **25%**      |
| `ACT` | Activities & Volunteers                     |  12   |      0      |         3         |        0        |         9         |       0        |       0       |      **25%**      |
| `PRP` | Preparedness Hub                            |   9   |      0      |         5         |        0        |         4         |       0        |       0       |      **56%**      |
| `ANL` | Analytics & Reporting                       |  11   |      0      |         2         |        0        |         7         |       0        |       2       |      **22%**      |
| `NFR` | Non-Functional Requirements (Cross-Cutting) |  88   |      0      |         8         |        7        |        67         |       6        |       0       |      **18%**      |

_Overall Active Completion: **133 / 256 active requirements (52%)** implemented, in progress, or in review. The denominator excludes 27 retired FRs and 6 deferred privacy NFRs._

---

## 2. Scope Summary

**In scope:** 11 modules, M0–M10, plus platform foundation.

**Not being built** — the complete list, carried from the BRD:

| Excluded                                                                                                 | Reference                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMS notifications                                                                                        | BR-4.10, D-6                                                                                                                                                  |
| Siren / IoT alert units (physical hardware)                                                              | BR-4.11, D-6 (Physical IoT procurement out of scope; **Visual Siren Simulation & Pin Triggering feature added for map & alert demo**: FR-MAP-014, FR-ALT-012) |
| Post-registration profile claiming                                                                       | BRD M1b, D-11                                                                                                                                                 |
| Safe routes & blocked roads on the map                                                                   | BR-2.7, D-12                                                                                                                                                  |
| Donation inventory, allocation, distribution tracking                                                    | BRD M7, D-8                                                                                                                                                   |
| Donation pledges, donor transactions, receipt status, public progress, and household assistance tracking | BRD M7, D-16 — donation drives are informational articles only                                                                                                |
| Native mobile apps                                                                                       | BRD 4.2                                                                                                                                                       |
| Payment processing                                                                                       | BRD 4.2                                                                                                                                                       |
| Any barangay other than San Jose                                                                         | BRD 4.0                                                                                                                                                       |
| Full offline sync                                                                                        | `design.md` D-OI-8                                                                                                                                            |

### 2.1 Portal and console revision audit — August 11, 2026

This is an evidence-backed backlog, not a new screen specification. Staging at commit
`8a3eaec` was reviewed with the seeded superadmin and household-head accounts.

| Surface        | Verified current state                                                                                                      | Revision boundary                                                                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen portal | Household reference/area/member summary, safety check-in, and authenticated incident reporting are reachable.               | Household/member editing, alerts, activity participation, volunteer tools, go-bag progress, notifications, and other still-open FRs must be designed before implementation. The cut assistance tracker is not part of that redesign.                                        |
| Admin console  | Registry, emergency response, weather, alerts, facilities, activities, guides, FAQs, and donation-drive CRUD are reachable. | The article-authoring routes and shared list surface now have a focused editorial/DataTable pass. Responsive acceptance and peer review remain required before any linked FR is marked done. Current breadth is not evidence that every linked FR meets Definition of Done. |

Do not convert this audit into invented portal screens. New target workflows require a stakeholder decision and permanent FR IDs first.

**Console setup surface revision (August 13, 2026).** The admin sidebar no longer exposes a
System & Setup category. `/admin/areas` was a misleading editing surface because the seeded
boundaries are reference geometry, not officer-managed content; `/admin/config` was likewise
removed as a workflow. Area records and operational configuration remain service/data contracts
used by maps, targeting, analytics, and weather. Runtime operational values now belong in the
environment profile; the old config rows remain only for migration compatibility until the
remaining configuration contract is retired.

---

## 3. Platform Foundation — `SYS`

| ID         | Requirement                                  | Acceptance criteria                                                                                                                                                                                                                                     | Src              | Pri | Status | PR  |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --- | ------ | --- |
| FR-SYS-001 | Account registration for a head of household | Email + password; unique email enforced (409 on conflict); password ≥8 chars; account created **`active` immediately** — no email-verification flow exists, so `pending` (this row's original acceptance text) would leave the account unable to log in | BR-1.1           | M   | ◐      | —   |
| FR-SYS-002 | Login and logout                             | Valid credentials return an access token + refresh cookie; logout invalidates the refresh token                                                                                                                                                         | Tech Stack 5     | M   | ◐      | —   |
| FR-SYS-003 | Session refresh                              | Access token expires ≤15 min; refresh via httpOnly cookie without re-login                                                                                                                                                                              | Tech Stack 5     | M   | ◐      | —   |
| FR-SYS-004 | Password reset                               | User can request a reset; admin can also initiate one for a resident                                                                                                                                                                                    | Tech Stack 5     | S   | ☐      | —   |
| FR-SYS-005 | Six roles enforced                           | `public`, `head`, `bhw`, `admin`, `sk`, `superadmin`; role carried as a token claim                                                                                                                                                                     | BRD 5.1          | M   | ◐      | —   |
| FR-SYS-006 | Server-side authorization on every endpoint  | Every protected route checks role; UI hiding alone fails review                                                                                                                                                                                         | BRD 5.1          | M   | ◐      | —   |
| FR-SYS-007 | BHW area scoping                             | A BHW can read/write only households in their assigned areas; cross-area access returns 403                                                                                                                                                             | BR-1.44          | M   | ◐      | —   |
| FR-SYS-008 | Audit log of state-changing actions          | Actor, action, target, timestamp recorded and queryable by admin                                                                                                                                                                                        | BR-1.45, BR-4.6  | M   | ◐      | —   |
| FR-SYS-009 | Admin can manage users                       | List, search, filter, view, activate/deactivate, change role                                                                                                                                                                                            | BRD 5.1          | M   | ☐      | —   |
| FR-SYS-010 | Configuration store                          | Deployment-configured barangay totals and alert thresholds, with hotlines and facilities owned by their operational modules                                                                                                                             | BR-3.3, BR-10.1a | M   | ◐      | —   |
| FR-SYS-011 | In-app notification centre                   | Notifications listed, unread count shown, mark-as-read                                                                                                                                                                                                  | BR-1.18, BR-8.3  | S   | ☐      | —   |
| FR-SYS-012 | Reference data: PSGC                         | PSGC hierarchy loaded at migration; cascading region→province→city→barangay select                                                                                                                                                                      | BR-1.3           | M   | ☐      | —   |
| FR-SYS-013 | Reference data: barangay areas               | Areas/zones seeded with names and boundary polygons; used across REG, MAP, ANL                                                                                                                                                                          | BR-1.3, OI-3     | M   | ◐      | —   |
| FR-SYS-014 | Emergency hotline directory                  | Admin CRUD; surfaced in PUB, MAP, EVC; one-tap `tel:` links                                                                                                                                                                                             | BR-0.7           | M   | ◐      | —   |
| FR-SYS-015 | Barangay facility registry                   | Admin CRUD with geo-pin: evacuation centres, hospitals, clinics, barangay hall, police, fire, rescue stations                                                                                                                                           | BR-2.4, BR-2.5   | M   | ◐      | —   |
| FR-SYS-016 | Rate limiting on sensitive endpoints         | Login and rescue-request endpoints throttled per IP                                                                                                                                                                                                     | Tech Stack 5     | S   | ◐      | —   |
| FR-SYS-017 | Consent capture at registration              | Consent text version recorded with timestamp, covering all members                                                                                                                                                                                      | BR-1.41          | M   | ☐      | —   |
| FR-SYS-018 | Data export / deletion request handling      | Admin can export or delete a household record on request                                                                                                                                                                                                | BR-1.42, BR-1.43 | S   | ☐      | —   |

---

## 4. Public Information Site — `PUB`

| ID         | Requirement                      | Acceptance criteria                                                                                                                         | Src                        | Pri | Status | PR  |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --- | ------ | --- |
| FR-PUB-001 | Hero section                     | App name, tagline, Get Started/Login action, always-visible hotline action                                                                  | BR-0.1                     | M   | ◐      | —   |
| FR-PUB-002 | About section                    | Mission, vision, why preparedness matters, SDG 13/11/3 alignment                                                                            | BR-0.2                     | M   | ◐      | —   |
| FR-PUB-003 | Latest announcements feed        | Published article previews newest first, pulled live from ALT; emergency notices visually distinct                                          | BR-0.3                     | M   | ◐      | —   |
| FR-PUB-004 | Weather overview                 | Current conditions, temperature, rainfall, forecast; each reading timestamped and sourced                                                   | BR-0.4                     | M   | ◐      | —   |
| FR-PUB-005 | Preparedness tip cards           | Cards for flood, earthquake, fire, typhoon, San Jose Go Bag; each opens the full guide                                                      | BR-0.5                     | S   | ◐      | —   |
| FR-PUB-006 | Upcoming activities              | Published article previews with cover image, date, venue, and type; pulled live from ACT                                                    | BR-0.6                     | S   | ◐      | —   |
| FR-PUB-007 | Emergency hotlines section       | One-tap callable on mobile                                                                                                                  | BR-0.7                     | M   | ◐      | —   |
| FR-PUB-008 | Evacuation centres list          | Address, capacity, map preview; live occupancy once EVC is built                                                                            | BR-0.8                     | M   | ◐      | —   |
| FR-PUB-009 | Public hazard map embed          | Flood-prone areas, safe zones, evacuation centres, facilities                                                                               | BR-0.9                     | M   | ◐      | —   |
| FR-PUB-010 | Donation drives section          | Published informational article previews with cover image, active dates, organizer/contact, and drop-off instructions; no donor transaction | BR-0.10                    | S   | ◐      | —   |
| FR-PUB-011 | FAQs                             | Published, maintainable, accordion presentation                                                                                             | BR-0.11                    | S   | ◐      | —   |
| FR-PUB-012 | Footer                           | Barangay info, contacts, socials, hotline, copyright                                                                                        | BR-0.12                    | M   | ◐      | —   |
| FR-PUB-013 | Live content, single source      | Every dynamic section reads from its module; no duplicated content store                                                                    | BR-0.13                    | M   | ◐      | —   |
| FR-PUB-014 | No personal data on public pages | Only area-level aggregates rendered; verified by review                                                                                     | BR-0.14, BR-1.52           | M   | ◐      | —   |
| FR-PUB-015 | Persistent hotline access        | Hotline action reachable without scrolling on all viewports                                                                                 | BR-0.15                    | M   | ◐      | —   |
| FR-PUB-016 | Section-level failure isolation  | A failed weather or map fetch degrades that section only; hotlines always render                                                            | BR-0.17                    | M   | ◐      | —   |
| FR-PUB-017 | Emergency alert takeover         | Active alert renders above all content, sticky, non-dismissible while active                                                                | BR-0.18                    | M   | ◐      | —   |
| FR-PUB-018 | Empty sections hidden            | Sections with no content are not rendered as empty shells                                                                                   | BR-0.20                    | S   | ◐      | —   |
| FR-PUB-019 | Public article detail pages      | Announcement, activity, and donation-drive previews link to canonical slug detail pages with full rich content and ordered gallery          | BR-0.3a, BR-0.6a, BR-0.10a | M   | ◐      | —   |
| FR-PUB-020 | Article image presentation       | Cover and gallery images preserve their selected order; publication is blocked until the required cover image is set                        | BR-4.1b, BR-7.1a, BR-8.1b  | M   | ◐      | —   |

> **FR-PUB-013 is closed.** Every section listed above reads through
> `apps/web/src/lib/api/public.ts`, which calls the real API (Zod-parsed against
> `public-schemas.ts`) instead of a fixture — `grep -rn "TODO(FR-PUB-013)" src`
> now returns nothing. `lib/fixtures/` was deleted except `hotlines.ts`, kept
> deliberately as the one hard-coded fallback FR-PUB-016/NFR-AVL-004 require.
>
> **Per-section loading states are now in place** (Definition of Done item 3).
> Each async landing section sits in its own `<Suspense>` with a fallback that
> reproduces that section's grid, so a slow feed delays one section instead of the
> whole page body. The indicator is `common/WaterSpinner` — a CSS-only 3D droplet
> and ripple loop, no client component, so guarding twelve sections still costs
> zero JavaScript. `SectionBoundary` stays _outside_ `Suspense`: inverted, an
> error thrown mid-stream escapes to the route-level `error.tsx` and blanks the
> page, which is what FR-PUB-016 exists to prevent.
>
> Note the earlier reading of this was wrong: the loading states were not
> unsurfaceable in a Server-Component/ISR model, they simply had nowhere to mount.
> A Server Component that awaits without a Suspense boundary above it doesn't
> render a pending state at all — it just delays its own output.
>
> **Why the other seventeen are still `◐` and not `✅`.** They are demonstrated
> against real, seeded data end-to-end — including a live create-in-the-admin-
> console → audit-log → ISR-revalidate → public-page loop, and a kill-the-API
> test proving section-level failure isolation (FR-PUB-016) actually holds — but
> one Definition of Done item remains open across the whole set: peer review
> (item 6). That is no longer a fixture problem; it is follow-up work.
>
> The **PR column is deliberately empty**: this work is committed locally and has
> not been pushed, so there is no PR to reference yet.

---

## 5. Community Registry — `REG`

### 5.1 Household registration

> **Registry workspace update (Aug 2026).** The implementation now includes resident household/member
> editing, admin/BHW household and citizen directories, area-scoped CRUD, transfer and registry-managed
> head replacement, archive actions, and resident self-service at `/portal/household/edit`. These rows
> remain `◐` until peer review evidence is recorded; account-linked heads remain lifecycle-protected.

| ID             | Requirement                            | Acceptance criteria                                                                                                             | Src             | Pri | Status | PR  |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- | --- | ------ | --- |
| FR-REG-001     | Self-registration as head of household | Creates household record + head's own member profile in one flow                                                                | BR-1.1          | M   | ◐      | —   |
| FR-REG-002     | BHW-assisted registration              | BHW creates a household and all members without any account being attached; head birthday/sex and added-member sex are captured | BR-1.2, BR-1.20 | M   | ◐      | —   |
| FR-REG-003     | Address capture via PSGC + area        | PSGC cascading select plus barangay area assignment; area required                                                              | BR-1.3          | M   | ◐      | —   |
| FR-REG-004     | Household core fields                  | One address, one area, one named head, contact number optional                                                                  | BR-1.4          | M   | ◐      | —   |
| FR-REG-005     | No-phone households accepted           | Registration completes without a contact number; record flagged `unreachable_by_phone`                                          | BR-1.4a         | M   | ◐      | —   |
| FR-REG-006     | Household reference number             | Generated at creation, unique, displayed on the record                                                                          | BR-1.20a        | M   | ◐      | —   |
| FR-REG-007     | Creator attribution                    | Barangay-created records store creating BHW and timestamp                                                                       | BR-1.20b        | M   | ◐      | —   |
| FR-REG-008     | Household geotag                       | Draggable map pin sets coordinates; GPS button only when `isSecureContext`                                                      | BR-1.7          | S   | ◐      | —   |
| FR-REG-009     | Head can edit household and members    | All edits versioned and auditable                                                                                               | BR-1.8          | S   | ◐      | —   |
| FR-REG-010     | Duplicate detection and merge          | Likely duplicates flagged on name + birthdate + area; admin can merge, preserving history                                       | BR-1.9          | M   | ◐      | —   |
| FR-REG-011     | Verification flag                      | Admin marks a household verified; unverified records still count and still receive alerts                                       | BR-1.10         | S   | ◐      | —   |
| ~~FR-REG-012~~ | ~~Registration draft persistence~~     | **Cut, Aug 2026** — the BHW form starts fresh on each visit; local draft persistence is not part of the operator workflow       | Design 9.6      | —   | ✕      | —   |

### 5.2 Household members

| ID         | Requirement                   | Acceptance criteria                                                                                                                     | Src        | Pri | Status | PR  |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --- | ------ | --- |
| FR-REG-020 | Add member profiles           | Head or BHW adds unlimited members to a household                                                                                       | BR-1.31    | M   | ◐      | —   |
| FR-REG-021 | Vulnerable-group flags        | Per member: child, senior, PWD, pregnant/lactating, chronic condition on regular medication, **bedridden/mobility-limited**             | BR-1.32    | M   | ◐      | —   |
| FR-REG-022 | Members hold no account       | Member records have no credentials; access is via the head's account only                                                               | BR-1.33    | M   | ◐      | —   |
| FR-REG-023 | Relationship to head recorded | Selectable relationship per member                                                                                                      | BR-1.34    | S   | ◐      | —   |
| FR-REG-024 | All members in one visit      | BHW flow captures every member in a single session without re-entry; each added member records required sex and optional contact number | BR-1.36    | M   | ◐      | —   |
| FR-REG-025 | Member repeater UX            | One member per collapsible card, one open at a time, "Member N of M" progress, sticky save                                              | Design 9.5 | M   | ◐      | —   |
| FR-REG-026 | Split an adult member out     | Adult member becomes head of a new household, retaining profile history                                                                 | BR-1.37    | C   | ◐      | —   |

> **Registration and members are real and verified end-to-end** (self-registration
> at `/register` → `/portal/onboarding`; BHW-assisted at `/admin/households/new`;
> `POST /admin/households/merge`) — not yet `✅` per Definition of Done item 6
> (peer review), same convention as the rest of this document. Specifics:
>
> - **FR-REG-001 is split across two requests, not one.** `/auth/register`
>   creates only the account; the `household`/`member` rows are created at
>   `/me/household` (onboarding), once `area_id` — a `NOT NULL` column — is
>   known. This was a deliberate scope decision (basic details at sign-up,
>   address/area/pin afterward), but it means a resident who registers and
>   never completes onboarding has an account with no household — acceptable
>   for now, revisit if abandonment turns out to matter.
> - **FR-REG-003's PSGC half is not built.** Address capture is free-text
>   street address + an Area select (the barangay's own six zones, already
>   seeded) only. The national PSGC cascading hierarchy (`FR-SYS-012`, ~42,000
>   rows, vendored not runtime) remains unbuilt; `household.psgc_barangay_code`
>   stays `NULL` on every new record.
> - **FR-REG-010's duplicate detection is a calibrated heuristic, not the full
>   spec.** `similarity(head_name) > 0.5` (pg_trgm; raised from an initial 0.4
>   after it flagged ~75% of the 200 seeded households — common Filipino
>   surnames collide heavily on trigram similarity) plus an exact
>   `(full_name, birth_date)` match against any of the household's own
>   members. No admin-configurable threshold. Never blocks creation — flags
>   only, per BR-1.9 ("the only defence" now that account-claiming is out of
>   scope, BRD D-11) — surfaced as a list badge and a creation-time toast.
>   Merge is real: re-parents members, demotes the losing household's head
>   (`is_head=false`) before re-parenting so `idx_member_one_head` never trips,
>   soft-deletes the loser, records a `household_merge` row. One accepted gap:
>   the demoted former head keeps whatever `relationship_to_head` it had
>   before the merge (e.g. still "Head") — there is no edit UI (FR-REG-009) to
>   correct it yet.
> - **FR-REG-011 is automatic, not a manual admin action.** The literal
>   acceptance text ("admin marks a household verified") isn't what's built —
>   a deliberate product decision instead treats the entry point itself as the
>   verification: a BHW who visited and entered the household in person, or a
>   resident who completed their own onboarding behind a login, both set
>   `verified_at`/`verified_by_user_id` at creation time. There is no
>   unverified state to review and no endpoint or button to set one — every
>   household created through either flow is verified immediately. The
>   trade-off: a self-registered head who lies about their own household is
>   just as "verified" as a genuine one; there is no independent check. The
>   ~200 synthetic `M-SJ-000-001`…`M-SJ-000-200` rows predate this and remain unverified (`verified_at`
>   is `NULL`), since they were never touched by either creation path.
> - **FR-REG-020 is BHW-complete, self-registration-partial.** A BHW adds
>   unlimited members via the repeater in one visit. A self-registered head
>   can only create their own member row at onboarding — adding more members
>   later requires editing (FR-REG-009), which is out of scope this pass.
> - **FR-REG-008's map (`components/features/registry/location-picker.tsx`)
>   is the first real Leaflet integration in this codebase** — `leaflet`/
>   `react-leaflet` were installed but unused; `/hazard-map` remains an
>   explicitly non-interactive placeholder, untouched by this work.

### 5.3 Nutrition & health data — **cut, Aug 2026**

> The team confirmed the platform will not collect clinical nutrition-assessment
> data (BRD D-15, Section 4.2). `FR-REG-030`/`031`/`032` (formerly BR-1.5,
> BR-1.6, BR-1.19's nutrition half) are withdrawn, not deferred. This closes
> BRD OI-2. The general vulnerability flags in 5.2 (`FR-REG-021`) are
> unaffected — they are household risk factors, not clinical measurements.

| ID             | Requirement                                 | Acceptance criteria                             | Src     | Pri | Status | PR  |
| -------------- | ------------------------------------------- | ----------------------------------------------- | ------- | --- | ------ | --- |
| ~~FR-REG-030~~ | ~~Capture nutrition indicators per member~~ | **Cut, Aug 2026** — no nutrition data collected | BR-1.5  | —   | ✕      | —   |
| ~~FR-REG-031~~ | ~~Automatic nutrition classification~~      | **Cut, Aug 2026**                               | BR-1.6  | —   | ✕      | —   |
| ~~FR-REG-032~~ | ~~Nutrition history retained~~              | **Cut, Aug 2026**                               | BR-1.19 | —   | ✕      | —   |

### 5.4 Vulnerability classification

| ID         | Requirement                          | Acceptance criteria                                                                                                                                                                 | Src              | Pri | Status | PR  |
| ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --- | ------ | --- |
| FR-REG-040 | Compute vulnerability from A + B + C | Person factors, exposure, and capacity all contribute; person factors alone insufficient                                                                                            | BR-1.47          | M   | ☐      | —   |
| FR-REG-041 | Four named levels                    | `Low`, `Moderate`, `High`, `Priority`; raw score never surfaced to users                                                                                                            | BR-1.48          | M   | ☐      | —   |
| FR-REG-042 | Most-vulnerable-member rule          | One bedridden member forces `Priority` regardless of other factors                                                                                                                  | BR-1.38, BR-1.49 | M   | ☐      | —   |
| FR-REG-043 | Exposure factors from geography      | Target classifier derives area hazard class, waterway distance, nearest-centre distance, and vehicle accessibility; the current survey band in FR-REG-062 is explicitly provisional | BR-1.47          | M   | ☐      | —   |
| FR-REG-044 | Capacity factors reduce level        | Able-bodied adult present, reachable by phone, drill attendance, go-bag prepared                                                                                                    | BR-1.47          | S   | ☐      | —   |
| FR-REG-045 | Explainability                       | Admin can see which factors produced the level                                                                                                                                      | BR-1.50          | M   | ☐      | —   |
| FR-REG-046 | Manual override                      | Admin overrides level with a mandatory recorded reason; override visible as such                                                                                                    | BR-1.51          | M   | ☐      | —   |
| FR-REG-047 | Vulnerability never public           | Not rendered on public pages, not visible to other residents                                                                                                                        | BR-1.52          | M   | ☐      | —   |
| FR-REG-048 | Vulnerability visible to barangay    | Shown on household record and in registry lists for targeting                                                                                                                       | BR-1.11          | M   | ☐      | —   |

### 5.5 Health worker feedback — **out of scope, Aug 2026**

> The entire feedback loop (`FR-REG-050`–`057`, BR-1.12–BR-1.19) was built
> around a BHW reviewing and delivering nutrition/dietary guidance. With
> nutrition data collection cut (BRD D-15), there is nothing for a health
> worker to give feedback on, so the whole section is withdrawn, not just its
> automated-drafting half. This closes BRD OI-11 as "out" and retires R-13.

| ID             | Requirement                               | Acceptance criteria | Src     | Pri | Status | PR  |
| -------------- | ----------------------------------------- | ------------------- | ------- | --- | ------ | --- |
| ~~FR-REG-050~~ | ~~BHW writes feedback on a member~~       | **Cut, Aug 2026**   | BR-1.12 | —   | ✕      | —   |
| ~~FR-REG-051~~ | ~~Feedback appears on head's portal~~     | **Cut, Aug 2026**   | BR-1.13 | —   | ✕      | —   |
| ~~FR-REG-052~~ | ~~Guidance disclaimer~~                   | **Cut, Aug 2026**   | BR-1.17 | —   | ✕      | —   |
| ~~FR-REG-053~~ | ~~Source attribution~~                    | **Cut, Aug 2026**   | BR-1.16 | —   | ✕      | —   |
| ~~FR-REG-054~~ | ~~Notify on new feedback~~                | **Cut, Aug 2026**   | BR-1.18 | —   | ✕      | —   |
| ~~FR-REG-055~~ | ~~Feedback history~~                      | **Cut, Aug 2026**   | BR-1.19 | —   | ✕      | —   |
| ~~FR-REG-056~~ | ~~Automated draft guidance~~              | **Cut, Aug 2026**   | BR-1.14 | —   | ✕      | —   |
| ~~FR-REG-057~~ | ~~Mandatory human review before publish~~ | **Cut, Aug 2026**   | BR-1.15 | —   | ✕      | —   |

### 5.6 Counts

| ID         | Requirement                          | Acceptance criteria                                                                                                                                                                | Src     | Pri | Status | PR  |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ------ | --- |
| FR-REG-060 | Registered counts derived            | Household and member counts computed from the registry                                                                                                                             | BR-1.39 | M   | ◐      | —   |
| FR-REG-061 | Barangay-wide totals configured      | Admin-entered figures, stored separately, never conflated with registered counts                                                                                                   | BR-1.40 | M   | ◐      | —   |
| FR-REG-062 | Waterway-proximity onboarding survey | Self- or BHW-assisted onboarding stores `very_near`, `near`, or `far` alongside the draggable map pin; charts label it as self-reported survey data, not a calculated GIS distance | BR-1.53 | M   | ◐      | —   |

---

## 6. Barangay Zone Map — `MAP`

| ID         | Requirement                        | Acceptance criteria                                                                                                                                                                                                                                | Src               | Pri | Status | PR  |
| ---------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --- | ------ | --- |
| FR-MAP-001 | Area/zone rendering                | Barangay divided into its areas, each selectable                                                                                                                                                                                                   | BR-2.1            | M   | ◐      | —   |
| FR-MAP-002 | Area shading by indicator          | Toggle between vulnerable-household density, flood exposure                                                                                                                                                                                        | BR-2.2            | M   | ◐      | —   |
| FR-MAP-003 | Hazard layers                      | NOAH flood polygons (5/25/100-yr) with low/medium/high fill; safe zones                                                                                                                                                                            | BR-2.3            | M   | ◐      | —   |
| FR-MAP-004 | Hazard data pre-clipped and static | Serves a committed GeoJSON clipped to San Jose; no runtime dependency on NOAH                                                                                                                                                                      | Tech Stack 6      | M   | ◐      | —   |
| FR-MAP-005 | Facility pins                      | All facility types from FR-SYS-015 rendered with type-specific icons                                                                                                                                                                               | BR-2.4            | M   | ◐      | —   |
| FR-MAP-006 | Admin facility management          | Add/edit/remove/geo-pin without developer involvement                                                                                                                                                                                              | BR-2.5            | M   | ◐      | —   |
| FR-MAP-007 | Public map, no personal data       | Login-free version showing area aggregates only                                                                                                                                                                                                    | BR-2.6            | M   | ◐      | —   |
| FR-MAP-008 | Boundary disclaimer                | Map states boundaries are approximations, not cadastral data                                                                                                                                                                                       | BR-2.8            | M   | ◐      | —   |
| FR-MAP-009 | Attribution                        | OSM and Project NOAH (ODC-ODbL) credited on the map and in About                                                                                                                                                                                   | Tech Stack 6      | M   | ◐      | —   |
| FR-MAP-010 | Layer legend                       | Legend reflects the domain palettes; collapsible on mobile                                                                                                                                                                                         | Design 3.4        | M   | ◐      | —   |
| FR-MAP-011 | 3D zone visualization              | Extruded area polygons coloured by risk; orbit controls; click to select                                                                                                                                                                           | BR-2.1, BR-2.2    | S   | ☐      | —   |
| FR-MAP-012 | 3D fallback on low-end devices     | Below `md` or ≤4 cores, render 2D map or static image with opt-in to 3D                                                                                                                                                                            | Design 9.6        | M   | ☐      | —   |
| FR-MAP-013 | Location picker                    | Draggable pin primary; GPS button only in secure context                                                                                                                                                                                           | Design 9.5        | M   | ◐      | —   |
| FR-MAP-014 | Siren / IoT alert unit pins        | Pin siren locations on interactive map with status indicators (idle / sounding); admin can add/edit/geo-pin siren units                                                                                                                            | BR-4.11, BR-2.4   | S   | ◐      | —   |
| FR-MAP-015 | Private emergency household map    | Event-selected admin/BHW map shows area-scoped household pins, flood-risk classification, member safety/support details, evacuation assignments, rescue emphasis, and operational filters without changing the finalized public map configurations | — (new, Aug 2026) | C   | ◐      | —   |

---

## 7. Flood & Weather Watch — `WX`

| ID        | Requirement                               | Acceptance criteria                                                                                                             | Src          | Pri | Status | PR  |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ | --- | ------ | --- |
| FR-WX-001 | Current conditions                        | Temperature, rainfall, precipitation outlook for the barangay                                                                   | BR-3.1       | M   | ◐      | —   |
| FR-WX-002 | Short-term forecast                       | Hourly and daily forecast displayed                                                                                             | BR-3.1       | M   | ◐      | —   |
| FR-WX-003 | Open-Meteo integration                    | Scheduled fetch, cached; never called per page view                                                                             | Tech Stack 7 | M   | ◐      | —   |
| FR-WX-004 | River level display                       | Current reading shown with unit and station name                                                                                | BR-3.2       | M   | ◐      | —   |
| FR-WX-005 | Three-tier alert mapping                  | Reading mapped to Normal / 1 Prepare / 2 Evacuate / 3 Critical; the operational instruction may still require forced evacuation | BR-3.2       | M   | ◐      | —   |
| FR-WX-006 | Configurable thresholds                   | Deployment profile supplies the metre values for each tier; changing the environment changes the evaluator                      | BR-3.3       | M   | ◐      | —   |
| FR-WX-007 | Manual river level entry                  | Admin can enter the current reading directly; used when automated retrieval is unavailable                                      | Tech Stack 7 | M   | ◐      | —   |
| FR-WX-008 | PAGASA retrieval adapter                  | Isolated behind one interface; failure does not break the module                                                                | Tech Stack 7 | S   | ◐      | —   |
| FR-WX-009 | Threshold breach prompts BDRRMC           | Crossing a tier creates an actionable prompt. **Never auto-publishes a public alert**                                           | BR-3.4       | M   | ◐      | —   |
| FR-WX-010 | Provenance and timestamp on every reading | Source and time shown; no bare numbers                                                                                          | BR-3.8       | M   | ◐      | —   |
| FR-WX-011 | Stale data marked                         | Readings older than threshold visibly flagged as stale                                                                          | BR-3.8       | M   | ◐      | —   |
| FR-WX-012 | Last-known-good retention                 | Previous reading shown with its age when a fetch fails; never silently blank                                                    | Tech Stack 7 | M   | ◐      | —   |
| FR-WX-013 | Flood event history                       | Date, level reached, areas affected, households displaced                                                                       | BR-3.5       | S   | ◐      | —   |
| FR-WX-014 | Forecast-based advance warning            | Predicted threshold breach surfaced where data supports it                                                                      | BR-3.6       | S   | ☐      | —   |
| FR-WX-015 | Heat index & typhoon advisories           | Surfaced on portal and public site                                                                                              | BR-3.7       | C   | ◐      | —   |
| FR-WX-016 | Demo/simulation mode                      | Seeded scenario can drive readings on a scripted timeline for the pitch                                                         | Tech Stack 7 | S   | ☐      | —   |

---

> **FR-WX-013 review note (Aug 13, 2026).** The deployed implementation now covers
> admin create/list/update/delete for manual flood records, exact area selection
> restoration, protected Emergency Event-linked records, public/admin response
> separation, responsive history management, and filtered insights. The status stays
> `◐` until peer review is recorded; the implementation and follow-up UI refinements
> are in commits `f7d8485` through `2a506e0`.

## 8. Alerts & Announcements — `ALT`

| ID         | Requirement                                | Acceptance criteria                                                                                                                                                                                | Src                     | Pri | Status | PR  |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --- | ------ | --- |
| FR-ALT-001 | Publish announcement                       | Title, body, type, effective period; admin and SK officer                                                                                                                                          | BR-4.1                  | M   | ◐      | —   |
| FR-ALT-002 | Announcement types                         | Emergency notice, class suspension, road closure, water/power interruption, general                                                                                                                | BR-4.1                  | M   | ◐      | —   |
| FR-ALT-003 | Area targeting                             | Target specific areas or the whole barangay                                                                                                                                                        | BR-4.2                  | M   | ◐      | —   |
| FR-ALT-004 | Emergency alerts visually distinct         | Danger palette, separate presentation from routine announcements                                                                                                                                   | BR-4.3                  | M   | ◐      | —   |
| FR-ALT-005 | Actionable instruction required            | Alert cannot be published without an instruction field                                                                                                                                             | BR-4.4                  | M   | ◐      | —   |
| FR-ALT-006 | Alert type taxonomy                        | Flood, earthquake, typhoon, heavy rainfall, heat index, evacuation                                                                                                                                 | BR-4.7                  | M   | ◐      | —   |
| FR-ALT-007 | Issuer attribution                         | Publishing officer and timestamp recorded and displayed                                                                                                                                            | BR-4.6                  | M   | ◐      | —   |
| FR-ALT-008 | In-platform & website delivery             | Alerts appear in portal and on the public site                                                                                                                                                     | BR-4.8                  | M   | ◐      | —   |
| FR-ALT-009 | Alert history                              | Retained and publicly viewable                                                                                                                                                                     | BR-4.5                  | S   | ◐      | —   |
| FR-ALT-010 | Channel-extensible design                  | Delivery abstracted so a channel can be added without redesign                                                                                                                                     | BR-4.9                  | S   | ◐      | —   |
| FR-ALT-011 | Deactivate an alert                        | Admin ends an active alert; takeover banner clears                                                                                                                                                 | BR-4.3                  | M   | ◐      | —   |
| FR-ALT-012 | Siren simulation, trigger & audio playback | Triggering a siren pin emits expanding radial soundwave ripples/vibrations on the map pin AND synthesizes/plays a siren audio alarm on the machine via Web Audio API                               | BR-3.4, BR-4.11         | S   | ☐      | —   |
| FR-ALT-013 | Announcement article authoring             | Routine announcements support slug, excerpt, constrained rich-text body, draft/published/archived lifecycle, and author attribution; alerts retain their required instruction and targeting fields | BR-4.1a, BR-4.6         | M   | ◐      | —   |
| FR-ALT-014 | Announcement image gallery                 | A published routine announcement has one cover image and may have up to ten ordered images; emergency banners remain text-first                                                                    | BR-4.1b, BR-4.1c        | M   | ◐      | —   |
| FR-ALT-015 | Announcement preview and detail            | Public and portal feeds show previews that link to the canonical article; alert history remains publicly viewable and emergency takeover behavior is unchanged                                     | BR-0.3a, BR-4.5, BR-4.8 | M   | ◐      | —   |

---

## 9. Safety Check-In & Rescue — `SAF`

| ID         | Requirement                              | Acceptance criteria                                                                                                                                                                                                                                                                             | Src               | Pri | Status | PR  |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --- | ------ | --- |
| FR-SAF-001 | Per-member safety marking                | Any member can be individually marked safe                                                                                                                                                                                                                                                      | BR-5.1            | M   | ◐      | —   |
| FR-SAF-002 | Whole-household safety marking           | One action covers all members                                                                                                                                                                                                                                                                   | BR-5.1            | M   | ◐      | —   |
| FR-SAF-003 | Bulk action confirmation                 | Household action lists the members it covers and requires explicit confirm — never a single ambiguous tap                                                                                                                                                                                       | BR-5.1b           | M   | ◐      | —   |
| FR-SAF-004 | Head or barangay may set status          | Both actors supported, individually or in bulk                                                                                                                                                                                                                                                  | BR-5.1a, BR-5.2   | M   | ◐      | —   |
| FR-SAF-005 | Confidence distinction                   | Dashboard distinguishes individually confirmed from bulk-covered statuses                                                                                                                                                                                                                       | BR-5.1c           | S   | ◐      | —   |
| FR-SAF-006 | Status correction                        | Any status revertible by head or barangay                                                                                                                                                                                                                                                       | BR-5.1d           | M   | ◐      | —   |
| FR-SAF-007 | Status provenance                        | Records who set it, when, and how (self / assisted / bulk)                                                                                                                                                                                                                                      | BR-5.8            | M   | ◐      | —   |
| FR-SAF-008 | Rescue request submission                | Location plus situation description                                                                                                                                                                                                                                                             | BR-5.3            | M   | ◐      | —   |
| FR-SAF-009 | **Rescue request without an account**    | Public form, no login, minimal fields, large tap targets                                                                                                                                                                                                                                        | BR-5.9            | M   | ◐      | —   |
| FR-SAF-010 | Rescue queue and triage                  | Queued, tracked to resolution; registered requesters' vulnerability informs order; unregistered **not** deprioritised by default                                                                                                                                                                | BR-5.4            | M   | ◐      | —   |
| FR-SAF-011 | Accounted-for dashboard                  | Live registered accounted-for vs unaccounted, broken down by area                                                                                                                                                                                                                               | BR-5.5            | M   | ◐      | —   |
| FR-SAF-012 | Record unregistered person               | Admin records a person as safe or needing rescue with name + location only                                                                                                                                                                                                                      | BR-5.10           | M   | ◐      | —   |
| FR-SAF-013 | Unregistered counted separately          | Kept out of registered coverage figures                                                                                                                                                                                                                                                         | BR-5.11           | S   | ◐      | —   |
| FR-SAF-014 | Convert emergency record to registration | Registry-owned assisted conversion adds an unregistered person to an existing or new household once, transfers their open evacuation check-in and event safety status to the new member, and retains the emergency record for audit/history                                                     | BR-5.12           | C   | ◐      | —   |
| FR-SAF-015 | Incident reporting                       | Type, description, photo upload, location                                                                                                                                                                                                                                                       | BR-5.6            | S   | ◐      | —   |
| FR-SAF-016 | Verify or dismiss reports                | Admin can mark verified or dismissed with reason                                                                                                                                                                                                                                                | BR-5.7            | S   | ◐      | —   |
| FR-SAF-017 | No promise of rescue                     | Every rescue surface displays the disclaimer and official hotlines alongside                                                                                                                                                                                                                    | BRD M5 note       | M   | ◐      | —   |
| FR-SAF-018 | Declare an emergency event               | Admin names and types an event; multiple events may be active concurrently, all operational writes select an event explicitly, and declaring a flood creates one protected linked Flood History record                                                                                          | — (new, Aug 2026) | M   | ◐      | —   |
| FR-SAF-019 | End an emergency event                   | Admin ends a selected active event; its history is retained and its flood record finalized. Physical evacuation occupancy is preserved while another event remains active and reset only after the final active event ends                                                                      | — (new, Aug 2026) | M   | ◐      | —   |
| FR-SAF-020 | Concurrent event operations workspace    | Admin/BHW operations are scoped to an addressable selected-event workspace; legacy omitted event IDs resolve only when exactly one event is active and fail with `409` when ambiguous. Resident statuses remain independent per event; SK access is aggregate-only without household/member PII | — (new, Aug 2026) | C   | ◐      | —   |
| FR-SAF-021 | Incident response lifecycle              | Barangay Admin and Superadmin can link an incident to an emergency event and advance it `pending → verified → in progress → resolved`, or dismiss a non-final report. Resolution notes and dismissal reasons are required and every action is retained in the operational timeline. | — (new, Aug 2026) | S   | ◐      | —   |

> **FR-SAF-018/019 originated as a prerequisite gap found during the SAF build.** Every operational row is event-scoped, while the original spec had no create/end lifecycle. `evacuation/service.py` owns declare/end/list/event resolution because evacuation owns `EmergencyEvent`; FR-SAF-020 replaces the initial singleton behavior with explicit concurrent-event selection and a newest-first public list.
>
> **FR-SAF-021 makes incident reporting an operational loop, rather than a verification inbox.** It is intentionally limited to the two barangay-admin personas; no officer assignment model is introduced. The authenticated administrator is recorded in the audit trail for each action.
>
> **FR-SAF-008/009/017 are real: `POST /public/rescue-requests`, the first unauthenticated write in this codebase.** No auth dependency, no database read on the request path (`event_id`/`household_id`/`priority` all stay `NULL` — resolving any of them is a `SELECT`, which architecture.md's spec for this endpoint forbids), rate-limited generously at `60/minute` per IP rather than the `10`/`5` used for login/register — a false positive here turns away a real emergency (architecture.md R-11). The ack response carries only `id` and `received_at`, deliberately no `status` field, so nothing reads as a promise of rescue (FR-SAF-017; the disclaimer text itself already existed in `attribution.tsx`). Verified live on staging: submitted with a dropped pin, response had exactly the two fields, `source_ip` was recorded but never serialised, and the row's `event_id`/`household_id`/`priority` were confirmed `NULL` via direct query.
>
> **FR-SAF-010 is real, with the literal "vulnerability informs order" text deviated from — documented, FR-REG-011 precedent.** `domain/triage.py`'s `triage_priority` is a transparent additive signal over the raw per-member boolean flags (bedridden weighted highest), not a vulnerability _level_ — that scoring is blocked on BRD OI-18, and `rescue_request.vulnerability_level` stays `NULL` rather than being populated with a made-up value that would poison the column once OI-18 lands. Priority is computed lazily on first admin read of the queue (a GET that writes — architecture.md says triage is asynchronous and there is no worker on the request path yet; a `services/cron` job is the cleaner long-term home, noted as a follow-up, not built for zero demo value), and household matching is an exact normalised match on `contact_number` only (`+63`/`0` prefixes folded to the same form) — never fuzzy, since attaching the wrong household would pull in another family's flags and reorder a queue during a flood. The one structural guarantee: an unregistered request and a registered household with no flags are **numerically identical** (both `BASE_PRIORITY`), because nothing in `triage_priority` ever subtracts — there is no code path that could deprioritise a request for lacking data (BR-5.9). The queue is **not area-scoped** (`FR-SYS-007` deviation) — `rescue_request` has no `area_id` and an anonymous request has no household to derive one from, so scoping would hide from every BHW exactly the requests BR-5.9 exists to protect. An officer's manual priority override (`priority_is_manual`, migration `0009`) is never silently recomputed by a later lazy-triage pass. Verified live on the local staging stack: a request matched to a seeded household with a bedridden member computed priority `5` and sorted above an anonymous request at priority `3`; the triage dialog's status transition (`pending → verified`) persisted and the list re-sorted correctly. 17 new backend tests (7 pure `domain/triage.py`, 10 database-touching), 54/54 passing.
>
> **FR-SAF-001…007/011/013 (safety check-in + accounted-for) went in in the same pass as the event lifecycle.** `safety_status` is append-only with two unique partial indexes actually enforcing "one current row per subject" (schema.md previously described this in prose only); `set_method` is derived server-side from tier+scope and never accepted from the client (a resident posting `set_method="assisted"` would otherwise forge barangay confirmation); household bulk actions require `acknowledged_member_ids` to exactly match the live roster, checked server-side, not just via a client confirm dialog. One documented deviation: `set_by_user_id` is always the actor, never null, contradicting schema.md's original "null if self-set by the head" note — the note described when null was _permitted_, but FR-SAF-007 requires recording _who_, and nulling it loses exactly that.
>
> **FR-SAF-015/016 are real: `core/uploads.py` validates by magic bytes, not `Content-Type` or filename** (a `.php` renamed `.jpg` is rejected — confirmed by test and by the sniffed extension driving the stored name, never the client's), streams in 64 KB chunks so a declared-small file cannot exhaust memory before its real size is known, and names every file from `uuid4()`. `POST /me/incident-reports` is mounted on `/me`, deliberately **not** `/public` — FR-SAF-015's literal text says "residents can report incidents", but FR-SAF-009's no-account rule is scoped to _rescue_ for life-safety reasons; there is no equivalent argument for an anonymous photo upload, and one would hand the internet a write to a volume Caddy serves. `IncidentReportReview`'s dismissal-reason requirement is enforced twice — a Pydantic validator (422) and a database CHECK (belt and braces) — mirroring `RescueRequestPatch`'s resolution-note pattern. **Known residual risk, accepted for the demo, not silently handled: uploaded photos keep their original EXIF data**, which can include GPS coordinates; the only protection on a served file is its unguessable UUID filename. Stripping EXIF needs Pillow (a new dependency, a `tech_stack.md` entry) and should happen before any real deployment. Verified live: a real multipart request with a valid JPEG signature was accepted, `photo_url` was served by Caddy with `X-Content-Type-Options: nosniff` confirmed via response headers, and both the verify and dismiss-with-reason paths worked through the admin review dialog. One integration bug found and fixed in the process: `next/image` performs a server-side fetch to resolve an image `src`, but the `web` container has no filesystem or network path to `/uploads/*` — only Caddy and the `api` container mount that volume — so the optimizer returned `400` for every uploaded photo. Fixed with the `unoptimized` prop, the same escape hatch already used for the form's local blob-URL preview.

---

## 10. Evacuation Center Operations — `EVC`

| ID         | Requirement                      | Acceptance criteria                                                                                                              | Src    | Pri | Status | PR  |
| ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | --- | ------ | --- |
| FR-EVC-001 | Centre registry                  | Name, address, capacity, contact person; admin CRUD                                                                              | BR-6.1 | M   | ◐      | —   |
| FR-EVC-002 | Occupancy tracking               | Current physical occupancy is the count of open person check-ins across concurrent events, shown against capacity                | BR-6.2 | M   | ◐      | —   |
| FR-EVC-003 | Map presence and directions      | Centres pinned; directions available publicly                                                                                    | BR-6.3 | M   | ◐      | —   |
| FR-EVC-004 | Check in a registered resident   | Linked to their member record; at most one open physical check-in per member across concurrent events; feeds FR-SAF-011          | BR-6.6 | S   | ◐      | —   |
| FR-EVC-005 | Check in an unregistered evacuee | Name required; location/contact optional; support needs retained; at most one open physical check-in and counts toward occupancy | BR-6.7 | M   | ◐      | —   |
| FR-EVC-006 | Supply levels                    | Food, water, medicine stock recorded per centre                                                                                  | BR-6.4 | S   | ☐      | —   |
| FR-EVC-007 | Facilities status                | Comfort rooms, power, water availability                                                                                         | BR-6.5 | C   | ☐      | —   |
| FR-EVC-008 | Capacity warning                 | Centre at or above capacity is visibly flagged to admins; capacity is advisory and never rejects an arrival                      | BR-6.2 | S   | ◐      | —   |

---

## 11. Donation Drive Posts — `DON`

| ID             | Requirement                              | Acceptance criteria                                                                                                                                                                                           | Src                 | Pri | Status | PR  |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --- | ------ | --- |
| FR-DON-001     | Publish a donation-drive article         | Admin or SK publishes an informational post with slug, title, excerpt, constrained rich-text body, organizer/contact, drop-off instructions, optional emergency event, and active dates; no donor transaction | BR-7.1              | M   | ◐      | —   |
| ~~FR-DON-002~~ | ~~Public donation form, no account~~     | **Cut, Aug 2026** — stakeholder direction makes donation drives informational posts only                                                                                                                      | ~~BR-7.2, BR-7.2a~~ | —   | ✕      | —   |
| ~~FR-DON-003~~ | ~~Reference number issued~~              | **Cut, Aug 2026** — no donor submission exists                                                                                                                                                                | ~~BR-7.2b~~         | —   | ✕      | —   |
| ~~FR-DON-004~~ | ~~Public progress display~~              | **Cut, Aug 2026** — no targets, pledges, or received quantities are tracked                                                                                                                                   | ~~BR-7.3~~          | —   | ✕      | —   |
| ~~FR-DON-005~~ | ~~Donation status lifecycle~~            | **Cut, Aug 2026** — no donation transaction record exists                                                                                                                                                     | ~~BR-7.4~~          | —   | ✕      | —   |
| ~~FR-DON-006~~ | ~~Status change attribution~~            | **Cut, Aug 2026** with the donation transaction lifecycle                                                                                                                                                     | ~~BR-7.4a~~         | —   | ✕      | —   |
| ~~FR-DON-007~~ | ~~Walk-in donations~~                    | **Cut, Aug 2026** — the platform does not record donations                                                                                                                                                    | ~~BR-7.4b~~         | —   | ✕      | —   |
| ~~FR-DON-008~~ | ~~Donor status lookup~~                  | **Cut, Aug 2026** — there is no reference number or tracked status                                                                                                                                            | ~~BR-7.4c~~         | —   | ✕      | —   |
| ~~FR-DON-009~~ | ~~Close a drive when its target is met~~ | **Cut, Aug 2026** — replaced by the article publication lifecycle; the retired ID is not reused                                                                                                               | ~~BR-7.5~~          | —   | ✕      | —   |
| ~~FR-DON-010~~ | ~~No money handled~~                     | **Cut as a standalone workflow, Aug 2026** — the stronger scope rule is that no donor transaction or payment field exists at all                                                                              | ~~BR-7.7~~          | —   | ✕      | —   |
| ~~FR-DON-011~~ | ~~Publish distribution schedules~~       | **Cut, Aug 2026** — household assistance tracking is outside the revised prototype                                                                                                                            | ~~BR-7.6~~          | —   | ✕      | —   |
| ~~FR-DON-012~~ | ~~Record assistance per household~~      | **Cut, Aug 2026** — household assistance tracking is outside the revised prototype                                                                                                                            | ~~BR-7.6a~~         | —   | ✕      | —   |
| ~~FR-DON-013~~ | ~~Resident assistance status~~           | **Cut, Aug 2026** — the resident portal will not expose an assistance tracker                                                                                                                                 | ~~BR-7.6b~~         | —   | ✕      | —   |
| ~~FR-DON-014~~ | ~~Assistance decoupled from donations~~  | **Cut, Aug 2026** with the assistance tracker                                                                                                                                                                 | ~~BR-7.6c~~         | —   | ✕      | —   |
| FR-DON-015     | Donation-drive image gallery             | A published post has one cover image and may have up to ten ordered images                                                                                                                                    | BR-7.1a             | M   | ◐      | —   |
| FR-DON-016     | Donation-drive publication lifecycle     | Drafts are private; published posts appear during their active period; archived posts remain available by canonical slug                                                                                      | BR-7.1b             | M   | ◐      | —   |
| FR-DON-017     | Donation-drive preview and detail        | Public previews link to full article pages; organizer/contact and drop-off instructions are visible without an account                                                                                        | BR-0.10a, BR-7.1c   | M   | ◐      | —   |

---

## 12. Activities & Volunteers — `ACT`

| ID         | Requirement                 | Acceptance criteria                                                                                                                                        | Src             | Pri | Status | PR  |
| ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --- | ------ | --- |
| FR-ACT-001 | Create an activity          | Title, type, date, venue, description; admin and SK officer                                                                                                | BR-8.1          | M   | ◐      | —   |
| FR-ACT-002 | Activity types              | Drill, seminar, first aid training, clean-up, tree planting, NGO programme                                                                                 | BR-8.1          | M   | ◐      | —   |
| FR-ACT-003 | Public and portal listing   | Upcoming activities on both surfaces                                                                                                                       | BR-8.2          | M   | ◐      | —   |
| FR-ACT-004 | Attendance intent           | Resident indicates they will attend                                                                                                                        | BR-8.3          | S   | ☐      | —   |
| FR-ACT-005 | Event reminders             | In-app reminder before the event                                                                                                                           | BR-8.3          | S   | ☐      | —   |
| FR-ACT-006 | Volunteer registration      | Resident registers as volunteer with skills inventory                                                                                                      | BR-8.4          | S   | ☐      | —   |
| FR-ACT-007 | Attendance recording        | Admin records actual attendance; reportable                                                                                                                | BR-8.5          | S   | ☐      | —   |
| FR-ACT-008 | Volunteer task assignment   | Volunteers assigned to tasks during an emergency                                                                                                           | BR-8.6          | C   | ☐      | —   |
| FR-ACT-009 | Training certificates       | Issued and tracked per volunteer                                                                                                                           | BR-8.7          | C   | ☐      | —   |
| FR-ACT-010 | Activity article authoring  | Activity records include slug, excerpt, constrained rich-text body, and draft/published/archived lifecycle while retaining type, schedule, venue, and area | BR-8.1a         | M   | ◐      | —   |
| FR-ACT-011 | Activity image gallery      | A published activity has one cover image and may have up to ten ordered images                                                                             | BR-8.1b         | M   | ◐      | —   |
| FR-ACT-012 | Activity preview and detail | Public and portal previews link to the canonical article detail; attendance and volunteer workflows remain separate                                        | BR-0.6a, BR-8.2 | M   | ◐      | —   |

---

## 13. Preparedness Hub — `PRP`

| ID         | Requirement                       | Acceptance criteria                                                 | Src     | Pri | Status | PR  |
| ---------- | --------------------------------- | ------------------------------------------------------------------- | ------- | --- | ------ | --- |
| FR-PRP-001 | Hazard guides                     | Before/during/after for flood, earthquake, typhoon, fire, landslide | BR-9.1  | M   | ◐      | —   |
| FR-PRP-002 | Go-bag checklist                  | Interactive tick-off; state persisted per household                 | BR-9.2  | M   | ☐      | —   |
| FR-PRP-003 | Emergency food guide              | Shelf-stable options, safe water, storage, emergency cooking        | BR-9.3  | M   | ◐      | —   |
| FR-PRP-004 | Localized San Jose Go Bag         | Reflects local conditions, not generic national advice              | BR-9.4  | S   | ◐      | —   |
| FR-PRP-005 | FAQs                              | Published and maintainable via admin                                | BR-9.5  | S   | ◐      | —   |
| FR-PRP-006 | Family emergency plan             | Household drafts and saves a plan                                   | BR-9.6  | C   | ☐      | —   |
| FR-PRP-007 | Source attribution and dating     | Every guide cites NDRRMC/DOH/PRC/NNC and shows last-reviewed date   | BR-9.8  | M   | ◐      | —   |
| FR-PRP-008 | Go-bag status feeds vulnerability | Completion contributes to capacity factors                          | BR-1.47 | S   | ☐      | —   |
| FR-PRP-009 | Content in Filipino               | Primary content Filipino, English secondary                         | BR-9.7  | S   | ☐      | —   |

---

## 14. Analytics & Reporting — `ANL`

| ID             | Requirement                      | Acceptance criteria                                                                                                  | Src         | Pri | Status | PR  |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- | --- | ------ | --- |
| FR-ANL-001     | Operations dashboard             | Registered households/members, high-risk and flood-prone counts, affected families, active emergencies, open rescues | BR-10.1     | M   | ☐      | —   |
| FR-ANL-002     | Configured totals as denominator | Barangay-wide figures supplied through deployment configuration and kept separate                                    | BR-10.1a    | M   | ◐      | —   |
| FR-ANL-003     | Coverage always visible          | Registered counts always presented against the configured total                                                      | BR-10.1b    | M   | ◐      | —   |
| ~~FR-ANL-004~~ | ~~Nutrition summary by area~~    | **Cut, Aug 2026** — BR-10.2 is cut, no nutrition status is recorded                                                  | BR-10.2     | —   | ✕      | —   |
| FR-ANL-005     | Affected families per event      | Tracked and reportable                                                                                               | BR-10.3     | M   | ☐      | —   |
| ~~FR-ANL-006~~ | ~~Donation drive reporting~~     | **Cut, Aug 2026** — informational donation-drive posts have no quantities or transactions to aggregate               | ~~BR-10.4~~ | —   | ✕      | —   |
| FR-ANL-007     | Activity participation reporting | Attendance across activities, for SK accomplishment reporting                                                        | BR-10.5     | S   | ☐      | —   |
| FR-ANL-008     | Response time measurement        | Rescue request creation → resolution                                                                                 | BR-10.6     | C   | ☐      | —   |
| FR-ANL-009     | Report export                    | CSV/PDF export for MDRRMO and SK submission                                                                          | BR-10.7     | S   | ☐      | —   |
| FR-ANL-010     | Multi-year retention             | Historical data retained for trend analysis                                                                          | BR-10.8     | C   | ☐      | —   |
| FR-ANL-011     | Charts follow the palette        | Chart colours and solid-vs-dashed conventions per Design 3.5                                                         | Design 3.5  | S   | ☐      | —   |

---

## 15. Non-Functional Requirements

### 15.1 Performance — `PERF`

| ID           | Requirement                                                           | Target                                 | Status |
| ------------ | --------------------------------------------------------------------- | -------------------------------------- | ------ |
| NFR-PERF-001 | Public landing page first contentful paint on 3G, mid-range Android   | ≤ 3 s                                  | ☐      |
| NFR-PERF-002 | Public landing page Largest Contentful Paint                          | ≤ 4 s                                  | ☐      |
| NFR-PERF-003 | API response time, 95th percentile, non-report endpoints              | ≤ 500 ms                               | ☐      |
| NFR-PERF-004 | Registry list with 5,000 households — paginated load                  | ≤ 1.5 s                                | ☐      |
| NFR-PERF-005 | Hazard GeoJSON payload                                                | ≤ 500 KB after simplification          | ☐      |
| NFR-PERF-006 | Public landing JS bundle                                              | ≤ 250 KB gzipped                       | ☐      |
| NFR-PERF-007 | Recharts and Three.js loaded dynamically, never in the landing bundle | Verified in build output               | ☐      |
| NFR-PERF-008 | Weather and river data served from cache, not upstream, on page load  | 0 upstream calls per page view         | ☐      |
| NFR-PERF-009 | Spatial queries use PostGIS indexes                                   | No sequential scan on point-in-polygon | ☐      |

### 15.2 Availability & Resilience — `AVL`

| ID          | Requirement                                                                | Target                                | Status |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------- | ------ |
| NFR-AVL-001 | Platform availability during normal operation                              | ≥ 99% monthly                         | ☐      |
| NFR-AVL-002 | Upstream data source failure does not break a page                         | Section-level degradation only        | ◐      |
| NFR-AVL-003 | Last-known-good values served when a fetch fails, with visible age         | Always                                | ◐      |
| NFR-AVL-004 | Hotlines and emergency contacts render even when all dynamic sections fail | Always                                | ◐      |
| NFR-AVL-005 | Database backup frequency                                                  | Daily `pg_dump`, stored off-box       | ☐      |
| NFR-AVL-006 | Restore from backup verified                                               | Tested at least once before the pitch | ☐      |
| NFR-AVL-007 | Local Docker Compose stack can run the full demo if the VPS is unavailable | Verified                              | ☐      |

### 15.3 Security — `SEC`

| ID          | Requirement                                                                                                                     | Target                                       | Status |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| NFR-SEC-001 | Passwords hashed with argon2                                                                                                    | No other algorithm accepted                  | ☐      |
| NFR-SEC-002 | Access token lifetime                                                                                                           | ≤ 15 minutes                                 | ☐      |
| NFR-SEC-003 | Refresh token in httpOnly + SameSite cookie; `Secure` set via env when HTTPS is available                                       | Verified                                     | ☐      |
| NFR-SEC-004 | Authorization enforced server-side on every protected endpoint                                                                  | 100% coverage; UI hiding never sufficient    | ☐      |
| NFR-SEC-005 | BHW area scoping enforced in the data layer, not the UI                                                                         | Cross-area request returns 403               | ☐      |
| NFR-SEC-006 | Input validated server-side with Pydantic on every endpoint                                                                     | 100%                                         | ☐      |
| NFR-SEC-007 | Parameterised queries only — no string-built SQL                                                                                | Enforced by ORM usage + review               | ☐      |
| NFR-SEC-008 | File uploads validated by type and size; stored outside the web root                                                            | ≤ 5 MB, images only                          | ◐      |
| NFR-SEC-009 | Rate limiting on login and rescue endpoints                                                                                     | Configured                                   | ☐      |
| NFR-SEC-010 | No secrets committed; `.env.example` only                                                                                       | Verified by CI secret scan                   | ☐      |
| NFR-SEC-011 | Dependencies scanned for known vulnerabilities                                                                                  | CI check on PRs                              | ☐      |
| NFR-SEC-012 | Security headers set at the proxy                                                                                               | CSP, X-Frame-Options, X-Content-Type-Options | ☐      |
| NFR-SEC-013 | Rich article documents accept only the configured Tiptap node/mark allow-list; arbitrary HTML and embedded uploads are rejected | Validated server-side before persistence     | ◐      |

### 15.4 Privacy & Data Protection — `PRV`

> Provisional pending PolSci review (BRD OI-17). Not triggered at prototype stage — the demo uses synthetic data.

| ID          | Requirement                                                                            | Target                                   | Status |
| ----------- | -------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| NFR-PRV-001 | Consent recorded at registration, covering every member, with the consent text version | Stored                                   | ⏸      |
| NFR-PRV-002 | Head can request deletion of the household record; barangay can action it              | Supported                                | ⏸      |
| NFR-PRV-003 | Adult member can request access, correction, or removal independently of the head      | Process exists                           | ⏸      |
| NFR-PRV-004 | Access to a household's profile data logged                                            | Actor, record, timestamp                 | ⏸      |
| NFR-PRV-005 | Retention period defined for inactive records                                          | Documented and applied                   | ⏸      |
| NFR-PRV-006 | No personal, household-level, or member-level data on any public surface               | Verified by review                       | ☐      |
| NFR-PRV-007 | Demo and development environments use synthetic data only                              | No real resident data outside production | ☐      |
| NFR-PRV-008 | Privacy notice published and linked from registration                                  | Present                                  | ⏸      |

### 15.5 Usability & Accessibility — `UX`

| ID         | Requirement                                                              | Target                                                     | Status |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
| NFR-UX-001 | Colour contrast                                                          | WCAG 2.1 AA — 4.5:1 body, 3:1 large text and UI boundaries | ☐      |
| NFR-UX-002 | Status never conveyed by colour alone                                    | Icon or text label always present                          | ☐      |
| NFR-UX-003 | Tap targets                                                              | ≥ 44×44; ≥ 48×48 on emergency actions                      | ☐      |
| NFR-UX-004 | Full keyboard operability with visible focus                             | All interactive elements                                   | ☐      |
| NFR-UX-005 | Alerts announced to assistive technology                                 | `aria-live="assertive"` on emergency banners               | ☐      |
| NFR-UX-006 | Usable at 200% zoom without horizontal scrolling                         | Verified                                                   | ☐      |
| NFR-UX-007 | `prefers-reduced-motion` honoured                                        | Transforms and pulses disabled                             | ☐      |
| NFR-UX-008 | Every screen has defined loading, empty, and error states                | 100%                                                       | ☐      |
| NFR-UX-009 | Destructive actions require confirmation                                 | Always                                                     | ☐      |
| NFR-UX-010 | Form errors identify the field and the fix, in plain language            | Always                                                     | ☐      |
| NFR-UX-011 | Article publication is blocked until exactly one cover image is selected | Announcement, activity, and donation-drive CMS             | ☐      |

### 15.6 Compatibility — `CMP`

| ID          | Requirement                                        | Target                                                                                | Status |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| NFR-CMP-001 | Minimum supported viewport                         | 320 px                                                                                | ☐      |
| NFR-CMP-002 | Browsers                                           | Chrome, Firefox, Safari, Edge — last 2 major versions; Android Chrome; iOS Safari 15+ | ☐      |
| NFR-CMP-003 | Functions without a secure context                 | Manual location entry and gallery upload always available                             | ☐      |
| NFR-CMP-004 | Tested on a real device at 360 px before the pitch | Verified                                                                              | ☐      |
| NFR-CMP-005 | Both orientations supported; none required         | Verified                                                                              | ☐      |

### 15.7 Maintainability — `MNT`

| ID          | Requirement                                                             | Target                                | Status |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------- | ------ |
| NFR-MNT-001 | TypeScript strict mode on the frontend                                  | Enabled                               | 👁      |
| NFR-MNT-002 | Lint and format enforced in CI                                          | ruff (Python), ESLint + Prettier (TS) | 👁      |
| NFR-MNT-003 | CI runs lint and tests on every PR                                      | Green required to merge               | 👁      |
| NFR-MNT-004 | All schema changes via Alembic migrations                               | No manual DDL                         | 👁      |
| NFR-MNT-005 | Test coverage on vulnerability classification and alert threshold logic | ≥ 80% on those modules                | ☐      |
| NFR-MNT-006 | shadcn primitives not edited except for token wiring                    | Enforced by review                    | ☐      |
| NFR-MNT-007 | Environment parity — same Compose stack locally and on the VPS          | Verified                              | 👁      |
| NFR-MNT-008 | README enables a new team member to run the stack                       | ≤ 30 minutes from clone               | ◐      |
| NFR-MNT-009 | External data adapters isolated behind interfaces                       | Weather, river level, hazard data     | ◐      |

> **On the `👁` rows above and in 15.8.** These were delivered by the infrastructure bootstrap (`chore/NFR-MNT-007-infra-bootstrap`) and are implemented and verified against a running stack. They are `👁` rather than `✅` because Definition of Done item 6 — reviewed by one other team member — has not happened yet, and NFR-MNT-003's "green required to merge" additionally needs branch protection, which needs a remote.
>
> The `◐` rows are partial by design:
>
> - **NFR-MNT-008** — the README exists and the stack comes up from a clean clone, but nobody has actually timed a teammate doing it. That is the acceptance criterion, so it stays `◐` until someone does.
> - **NFR-MNT-009** — `OpenMeteoSource` and `PagasaSource` are real now: both fetch live, and `PagasaSource` carries a bundled TLS intermediate certificate because the FFWS server doesn't send one itself (`tech_stack.md` Section 7). `ManualSource` is deliberately a pass-through — nothing ever calls its `fetch()`, since manual entry is a write triggered by `POST /admin/readings`, not a scheduled pull. Stays `◐` on peer review alone.
> - **NFR-OBS-002** — three of the six jobs (`fetch_weather`, `fetch_river_level`, `evaluate_thresholds`) are real and verified against live sources; `flag_stale_records`, `send_activity_reminders`, and `backup_database` remain stubs. The `@job` decorator's start/outcome/duration logging already covers all six structurally — the gap is job bodies, not observability.

### 15.8 Observability — `OBS`

| ID          | Requirement                                                | Target                                | Status |
| ----------- | ---------------------------------------------------------- | ------------------------------------- | ------ |
| NFR-OBS-001 | Structured application logs with request IDs               | JSON output                           | 👁      |
| NFR-OBS-002 | Scheduled job outcomes logged — success, failure, duration | Every run                             | ◐      |
| NFR-OBS-003 | Upstream fetch failures logged with source and reason      | Every failure                         | ◐      |
| NFR-OBS-004 | Health check endpoint                                      | `/health` returning app and DB status | 👁      |
| NFR-OBS-005 | Audit log queryable by admin                               | Filter by actor, action, date         | ☐      |

### 15.9 Data — `DAT`

| ID          | Requirement                                                                    | Target                                             | Status |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | ------ |
| NFR-DAT-001 | PostgreSQL with PostGIS for all spatial data                                   | Areas, household points, hazard polygons           | ☐      |
| NFR-DAT-002 | Coordinate reference system                                                    | WGS 84 / EPSG:4326                                 | ☐      |
| NFR-DAT-003 | All timestamps stored in UTC, displayed in PHT                                 | Verified                                           | ☐      |
| NFR-DAT-004 | Soft delete on household and member records                                    | Recoverable; hard delete only on a privacy request | ☐      |
| NFR-DAT-005 | Registered counts always derived, never stored as a duplicate field            | Verified                                           | ☐      |
| NFR-DAT-006 | Seed data set for demo, clearly marked synthetic                               | Available                                          | ☐      |
| NFR-DAT-007 | Reference data loaded via migration, not runtime API calls                     | PSGC, areas, hazard GeoJSON                        | ☐      |
| NFR-DAT-008 | Rich article bodies stored as validated Tiptap JSON, never raw executable HTML | `JSONB`, constrained document schema               | ◐      |

### 15.10 Localization — `LOC`

| ID          | Requirement                                                  | Target                     | Status |
| ----------- | ------------------------------------------------------------ | -------------------------- | ------ |
| NFR-LOC-001 | Filipino primary, English secondary                          | All resident-facing copy   | ☐      |
| NFR-LOC-002 | Language switchable and persisted                            | Per user/session           | ☐      |
| NFR-LOC-003 | No concatenated translation fragments                        | Full parameterised strings | ☐      |
| NFR-LOC-004 | Layout tolerates ~30% string expansion without clipping      | Verified                   | ☐      |
| NFR-LOC-005 | Dates and numbers formatted for `fil-PH`                     | Verified                   | ☐      |
| NFR-LOC-006 | Hotline numbers, area names, facility names never translated | Verified                   | ☐      |

### 15.11 Legal & Compliance — `LGL`

| ID          | Requirement                                                                        | Target                                                     | Status |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| NFR-LGL-001 | Project NOAH data attributed under ODC-ODbL; derivatives under the same licence    | Concise map attribution plus full site footer/About credit | ☐      |
| NFR-LGL-002 | OpenStreetMap attribution on every map view                                        | Always visible                                             | ☐      |
| NFR-LGL-003 | Open-Meteo attributed; non-commercial usage limits respected                       | ≤ 10k calls/day                                            | ☐      |
| NFR-LGL-004 | PAGASA data attributed; polite scraping — identified UA, ≥10 min interval, backoff | Verified                                                   | ☐      |
| NFR-LGL-005 | Platform never presents itself as an official warning authority                    | Disclaimer on all alert surfaces                           | ☐      |
| NFR-LGL-006 | Health guidance carries a non-diagnostic disclaimer                                | Every published item                                       | ☐      |
| NFR-LGL-007 | Rescue surfaces state that submission does not guarantee response                  | Always, with hotlines shown                                | ☐      |

---

## 16. Delivery Summary

| Module    | Total IDs | Active  |  Must   | Should | Could | Dropped | Done  |
| --------- | :-------: | :-----: | :-----: | :----: | :---: | :-----: | :---: |
| SYS       |    18     |   18    |   14    |   4    |   0   |    0    |   0   |
| PUB       |    20     |   20    |   15    |   5    |   0   |    0    |   0   |
| REG       |    42     |   31    |   24    |   6    |   1   |   11    |   0   |
| MAP       |    14     |   14    |   12    |   2    |   0   |    0    |   0   |
| WX        |    16     |   16    |   11    |   4    |   1   |    0    |   0   |
| ALT       |    15     |   15    |   12    |   3    |   0   |    0    |   0   |
| SAF       |    19     |   18    |   14    |   4    |   0   |    1    |   0   |
| EVC       |     8     |    8    |    4    |   3    |   1   |    0    |   0   |
| DON       |    17     |    4    |    4    |   0    |   0   |   13    |   0   |
| ACT       |    12     |   12    |    6    |   4    |   2   |    0    |   0   |
| PRP       |     9     |    9    |    4    |   4    |   1   |    0    |   0   |
| ANL       |    11     |    9    |    4    |   3    |   2   |    2    |   0   |
| **Total** |  **201**  | **174** | **124** | **42** | **8** | **27**  | **0** |

Non-functional: **88** across 11 categories, including 6 deferred privacy rows.

> Recount whenever requirements are added or dropped. If the Must total climbs, that is R-8 (scope overrun) materialising — the largest risk on this project.

### Build order (BRD 8)

| Stage                 | Modules                   |
| --------------------- | ------------------------- |
| 1 · Spine             | `SYS`, `REG`, `PUB` shell |
| 2 · Demo narrative    | `MAP`, `WX`, `SAF`        |
| 3 · Operational depth | `ALT`, `EVC`, `DON`       |
| 4 · Sustaining        | `ACT`, `PRP`, `ANL`       |

---

## 17. Blocked Requirements

Requirements that cannot start until an open item is resolved.

| Requirement                | Blocked by                                                    | Owner                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-REG-040 – FR-REG-046    | Vulnerability level definitions and weighting — BRD OI-18     | PubAd lead                                                                                                                                                                                                                     |
| ~~FR-SYS-013, FR-MAP-001~~ | ~~Official area/zone list and boundaries — BRD OI-3~~         | **Resolved** — approximate boundaries shipped via migration `0011_area_boundaries`; labelled `boundary_source='approximate'` in DB and in the map disclaimer (FR-MAP-008). Official boundaries still preferred when available. |
| ~~FR-MAP-003, FR-MAP-004~~ | ~~San Jose boundary polygon for clipping — tech T-OI-2~~      | **Resolved** — approximate San Jose boundary used for the 5-yr flood hazard clip; `dataset/derived/san_jose_boundary.geojson` committed.                                                                                       |
| ~~FR-WX-006~~              | ~~Local river alert thresholds — BRD OI-4~~                   | **Resolved for the prototype** — configurable interim Montalban FFWS values are deployed. Barangay confirmation remains required before official use.                                                                          |
| FR-ANL-002                 | Official barangay population and household totals — BRD OI-12 | PubAd lead                                                                                                                                                                                                                     |
| ~~FR-PUB-001, FR-PUB-002~~ | ~~App name, tagline, mission and vision — BRD OI-1, OI-10~~   | **Resolved** — SAGIP-SJ and the concept-paper-derived mission and vision are recorded in the BRD. Stakeholder wordsmithing may refine copy without blocking implementation.                                                    |
| NFR-PRV-001 – 005, 008     | Privacy requirements review — BRD OI-17                       | PolSci lead                                                                                                                                                                                                                    |

---

## 18. Change Log

> Change-log status symbols record what was claimed at that time. Section 1.6 is the current status source; the August MAP `✅` entries were later reclassified to `◐` because peer-review evidence is not recorded.

> **Aug 13, 2026 documentation audit.** Reviewed the last 24 hours of weather,
> flood-history, announcement, portal-loading, and configuration commits. The
> affected root and local guidance now reflects the `/admin/weather-readings` route,
> river-history/simulation endpoints, FR-WX-013 admin/public DTO separation and
> lifecycle protection, the Barangay-Wide Flood area-association shortcut, and the
> responsive flood-history scorecard/chart layout. No requirement was marked done
> without peer-review evidence.

> **Aug 14, 2026 registration workspace update.** Added optional member contact numbers and required sex capture to the BHW-assisted household flow. The same transaction now exposes added members in the registered-citizen directory, with the new nullable member column covered by migration `0022_member_contact_number` and regenerated API types. The create action now opens a review confirmation before saving; existing duplicate detection remains non-blocking and surfaces a `Possible Duplicate` flag after save. FR-REG-002/020/024/025 remain `◐` pending peer review.

> **Aug 14, 2026 registered-citizen workspace update.** Added the area-scoped citizen summary, complete profile/detail/activity contracts, shared create/edit workspace, household lifecycle tabs, and mapped adult promotion flow. `FR-REG-020`–`026` and `FR-REG-060` remain `◐` pending browser validation and peer review; no requirement is marked done by this implementation pass.

| Date         | Version | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | By  |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Aug 2026     | 0.1     | Initial derivation from BRD v0.3, tech_stack v0.1, design v0.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —   |
| Aug 11, 2026 | 0.1     | Documentation reconciliation at deployed commit `8a3eaec`: recorded household map pinning and waterway-proximity onboarding, Project NOAH hazard integration, the protected three public map views, the 21-facility demo snapshot (14 researched evacuation centers), live weather/river/TCWS feeds, flood-history charts, rescue/safety/triage/incident workflows, auth and responsive public-page revisions, footer-level official disclaimers, and the sparse citizen-portal/admin revision backlog. Stakeholder decision D-16 converts donation drives to informational articles and retires `FR-DON-002`–`014` plus `FR-ANL-006`. Added planned article-CMS requirements for announcements, activities, and donation drives; no application or database changes in this documentation pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —   |
| Aug 2026     | 0.1     | FR-PUB-013 closed — the public site reads live data end to end. 55 further FR/NFR rows moved `☐`→`◐` across SYS, ALT, ACT, PRP, EVC, DON, WX, ANL, REG, and MNT/OBS/AVL, reflecting real backend modules, a working admin console, live PAGASA/Open-Meteo ingestion, and a verified failure-isolation test — not yet `✅` anywhere, since Definition of Done item 6 (peer review) hasn't happened. Registry UI, safety/rescue, evacuation check-ins, and the hazard map (`MAP`) remain untouched. See `AGENTS.md` Section 2 — no PR yet, this is uncommitted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —   |
| Aug 2026     | 0.1     | Self- and BHW-assisted household registration built: `/register` + `/portal/onboarding`, `/admin/households/new` + `/admin/households` (list, "Flagged only" filter, merge), minimal duplicate detection (FR-REG-010), the first real Leaflet map (FR-REG-008), and BHW-form draft persistence (FR-REG-012). 19 REG rows and FR-SYS-001/007 moved `☐`→`◐` — see the note under Section 5.2 for exactly what's real versus deferred (PSGC, verification, post-onboarding member editing). Committed `deb8418`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —   |
| Aug 2026     | 0.1     | `contact_number` moved from `/auth/register` to onboarding, required unless `is_unreachable_by_phone` (FR-REG-005). `FR-REG-011` (verification) implemented as an automatic product decision rather than the literal "admin marks verified" text — both creation paths set `verified_at`/`verified_by_user_id` immediately, no review step exists; `☐`→`◐`. See the Section 5.2 note for the trade-off this accepts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —   |
| Aug 2026     | 0.1     | First live browser click-through of the registration work above (previously verified only via curl + static typecheck). Found and fixed a real bug: `LocationPicker`'s marker icon setup imported the PNGs directly from `leaflet/dist/images`, which built and typechecked fine but threw `iconUrl not set in Icon options` at runtime under Turbopack — switched to the unpkg CDN copies instead (same fix pattern most bundlers need, just a different failure mode than webpack's). Confirmed working end-to-end: self-registration → onboarding with a real map pin placement and drag; the BHW form's member repeater (one-open-at-a-time, "Member N of M"), area-scope filtering, and draft-resume after a real page reload; and an actual merge via the dialog, verified against the database (demotion, re-parenting, single `is_head`). Confirmed at 360px. One rough edge noted, not fixed: the merge dialog's candidate list is every flagged household, not specifically ones correlated to the row you clicked — the admin has to recognize the right pair by name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —   |
| Aug 2026     | 0.1     | Closed both rough edges from the row above. New `GET /admin/households/{id}/duplicates` (reuses `find_duplicate_candidates`, computed fresh rather than reusing the list snapshot) — the merge dialog now shows only the specific correlated household(s), each labelled with why it matched, instead of every flagged household platform-wide; curl-confirmed against a real pair (one match returned, down from ~50). The BHW form's `location` (map pin) moved from a separate `useState` into the RHF form itself, so `useRegistrationDraft`'s `form.watch()` now covers it — a resumed draft used to lose a placed pin. Mechanically the same `Controller` pattern already used for every other field in that form; not re-verified by click after the fix (Browser pane was closed on the user's end this round).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —   |
| Aug 2026     | 0.1     | Team confirmed the platform will **not** collect clinical nutrition-assessment data (BRD D-15). Cut `FR-REG-030`/`031`/`032` (Section 5.3), the entire health-worker-feedback loop `FR-REG-050`–`057` (Section 5.5, formerly gated by OI-11), and `FR-ANL-004` (Section 14, nutrition summary by area, BR-10.2) — all now `✕`, closing BRD OI-2 and OI-11 and retiring risk-register rows R-10/R-13. Reworded `FR-REG-026`, `FR-REG-042`, `FR-MAP-002`, and `NFR-PRV-004` to drop nutrition-specific language in favor of the vulnerability-flags framing that was always the separate, still-in-scope concern. `schema.md`, `design.md` (D-OI-4), and `architecture.md` (A-OI-3, AR-1, D-1, the `/me/feedback` and `/admin/members/{id}/feedback` routes, the ERD) updated to match. The Go Bag checklist (M9/portal) is unaffected. No code changes — none of the cut requirements had been implemented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —   |
| Aug 2026     | 0.1     | Follow-up to the row above: SDG 2 (Zero Hunger) dropped as a primary alignment (it tracked the now-cut nutrition program) per the team's concept paper, which states SDG 13, 11, and 3 instead. BRD Section 12, BR-0.2, and `FR-PUB-002` reworded; `about.ts`'s `SDG_ENTRIES` (live UI, `/about`) now lists exactly those three cards in that order, and `about-section.tsx`'s grid dropped from 4 to 3 columns on large screens to match. Verified live at `/about`, desktop and mobile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —   |
| Aug 2026     | 0.1     | Start of the `SAF` + `MAP` build (Stage 2 of the build order, the last two untouched modules). First phase: the `EmergencyEvent` lifecycle, added as `FR-SAF-018`/`019` — a requirements gap found while planning, not in the original spec, but a hard prerequisite since every other SAF row is event-scoped and nothing could create or activate one. Built in `evacuation/service.py` (`declare_event`/`end_event`/`list_events`/`require_active_event`), not `safety/`, since `evacuation` already owns the `EmergencyEvent` model. `POST /admin/emergency-events` (with an explicit `supersede_active` opt-in — auto-closing a live event as a side effect was rejected as too dangerous), `POST /admin/emergency-events/{id}/end`, `GET /admin/emergency-events`, and `GET /public/emergency-events/active`. New admin page and nav category ("Emergency Response", placed second, right after Registry). Also stood up the backend test suite's first real fixtures (`tests/conftest.py`, `tests/factories.py`) — every prior test was a stub-level smoke test with no database; this is the transaction-per-test, real-token pattern every later SAF/MAP phase depends on. 11 new tests, all passing, plus the pre-existing 10. Verified live end-to-end on staging (`https://57-155-90-155.sslip.io`): declared an event through the admin UI, confirmed it live on the public endpoint, ended it, confirmed `null` again. `FR-SAF-018`/`019` `☐→◐`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —   |
| Aug 2026     | 0.1     | Migration `0008_safety_core` — `unregistered_person`, `safety_status`, `rescue_request` created together (they cross-reference). Safety check-in built for real: `POST /me/safety-status` and `POST /admin/safety-status` (one route per tier, a discriminated `scope`, not four routes), `GET /admin/accounted-for`. `set_method` is derived server-side from tier+scope and never accepted from the client; household bulk actions require `acknowledged_member_ids` to exactly match the live roster, enforced with a 409 not just a client dialog; two new unique partial indexes make "at most one current row per subject" a database guarantee instead of a documented rule nothing checked. `FR-SAF-001…007/011/013` `☐→◐`; `AGENTS.md:96`'s "a service never imports another module's models.py" reworded to match what `registry`/`evacuation` already did (safety needs `Household`/`Member` for the accounted-for join). 10 new tests, 31/31 passing. Verified live on staging: bulk household confirm, an individual correction, tallies reconciled exactly per area.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —   |
| Aug 2026     | 0.1     | Geolocation hardening (`FR-REG-008`, `FR-MAP-013`) — the `getCurrentPosition` call in `LocationPicker` existed since the registration build but was never reachable in practice: staging was a bare-IP `http://` origin, not a secure context, so the button stayed hidden and its failure path (a bare "silently ignore" comment) had never actually run. New `hooks/use-geolocation.ts` adds per-error-code messages (permission denied / unavailable / timeout, each distinct), an accuracy readout with a >50m warning, and — the one thing that could only be caught on a real deployment — an explanatory line instead of a silently absent button when the context is insecure. Verified on the actual deployed VPS, both ways: over `https://57-155-90-155.sslip.io` a denied permission shows the new message instead of nothing happening; over `http://57.155.90.155:8080` the insecure-context message renders in the button's place. `localhost` cannot reproduce either case, so this genuinely required the staging deploy this session stood up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —   |
| Aug 2026     | 0.1     | `POST /public/rescue-requests` (`FR-SAF-008`, `FR-SAF-009`, `FR-SAF-017`) — the first unauthenticated write in this codebase. No auth dependency, no database read on the request path, `60/minute` per IP (generous by design — `/auth/login` and `/auth/register` are `10`/`5`, but a false positive here turns away a real emergency, not just a typo). The ack response carries only `id` and `received_at`, no `status` field, so nothing implies a rescue is guaranteed; the FR-SAF-017 disclaimer text already existed in `attribution.tsx` and is reused verbatim, not rewritten. New `/rescue` page: hotlines render alongside the form (above it on mobile, beside it at `md+`), the form never clears on a failed submit (reuses `useRegistrationDraft`, keyed `rescue-draft`), and `LocationPicker`'s hardcoded "household's location" caption is now an overridable prop so this non-registration caller reads correctly. `FR-SAF-008/009/017` `☐→◐`. Found and fixed a real bug in the process: `useRegistrationDraft`'s lazy `localStorage` read crashed with `localStorage is not defined` the first time it was used inside a "use client" component rendered from a Server Component page (every prior caller was itself a "use client" page, which doesn't hit this) — guarded with a `typeof window` check. 5 new tests (plus a rate-limiter-storage-reset fixture, since the limiter is one module-level object shared across the whole test file) — 37/37 passing. Verified live end-to-end on staging: submitted with a dropped pin, confirmed the response shape, and confirmed via direct query that `event_id`/`household_id`/`priority` were all `NULL` on the persisted row.                                                                                                                                                                                                                                                                                                                                                                                                 | —   |
| Aug 2026     | 0.1     | Rescue queue and triage (`FR-SAF-010`): new `domain/triage.py` (additive priority over raw per-member flags, `vulnerability_level` deliberately left `NULL` — deviation documented in Section 9), `GET`/`PATCH /admin/rescue-requests`, lazy triage on first admin read, exact digit-normalised household matching (never fuzzy), server-enforced status transitions (`pending → verified → dispatched → resolved`, any → `dismissed`), and a manual-priority-override flag (migration `0009_rescue_priority_manual`) so an officer's decision is never silently recomputed. New admin page (cards, not a table, per design.md's mobile-first rule for this screen) with a triage dialog; nav entry added under "Emergency Response". `FR-SAF-010` `☐→◐`. 17 new tests (7 pure, 10 database-touching) — 54/54 passing. Verified live: a request matched to a seeded bedridden-member household computed priority 5 and correctly outranked an anonymous priority-3 request; a status transition through the dialog persisted and the queue re-sorted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —   |
| Aug 2026     | 0.1     | Unregistered persons (`FR-SAF-012`, `013`): `GET`/`POST`/`PATCH /admin/unregistered-persons`. Recording a person writes their name, location, and initial safety status (`safe`/`needs_rescue`) in one action, not two — the same `set_unregistered_status` path S1 already built. No fields beyond what BR-5.10 asks for ("a name and location is enough"): no age, no household guess. New admin page (`ResourceTable` + a record dialog reusing `LocationPicker`, with its caption overridden to "where they were found" rather than the default household-registration wording); nav entry added. `FR-SAF-012` `☐→◐`. 5 new tests — 59/59 passing. Verified live: recorded a person as "needs rescue" against a declared test event; `/admin/safety` showed the registered per-area totals completely unchanged (722 unaccounted, same six-area split) while the separate unregistered block read "0 safe · 1 needing rescue" — FR-SAF-013's real assertion, holding structurally rather than by convention. Test event and person cleaned up afterward. `FR-SAF-014` (post-event conversion to a full registration) remains cut, as decided during planning — `get_unregistered_or_404` is already exposed for it if ever built, in `registry`, not `safety`, per AGENTS.md Section 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —   |
| Aug 2026     | 0.1     | Upload infrastructure and incident reports (`FR-SAF-015`, `016`, `NFR-SEC-008`): new `core/uploads.py` validates by magic bytes (never `Content-Type` or filename), streams in 64 KB chunks, names files from `uuid4()`. Migration `0010_incident_report` (+`created_at`/`updated_at`/`dismissal_reason` and the CHECK enforcing it — flagged gaps in the original schema, fixed the same way `rescue_request.created_at` was in `0008`). `POST /me/incident-reports` (multipart, authenticated — deliberate deviation from FR-SAF-015's literal "residents can report" text, since the no-account rule is scoped to _rescue_ for life-safety reasons and an anonymous upload hands the internet a write); `GET`/`PATCH /admin/incident-reports`. New portal report page and admin review table with a photo preview and a dismiss/verify dialog. `FR-SAF-015/016` and `NFR-SEC-008` `☐→◐`. 11 new tests (6 upload validation, 5 incident-report/review) — 71/71 passing. **Bug found and fixed**: `next/image` does a server-side fetch to resolve any `src`, but only Caddy and the `api` container mount the `/uploads` volume — the `web` container has no path to it, so every uploaded photo 400'd through the optimizer. Fixed with `unoptimized`, the same escape hatch the form's local blob-preview already used. **Open item, not silently handled**: uploaded photos keep their EXIF data (potential GPS leakage); stripping it needs Pillow and belongs in `tech_stack.md` before any real deployment — see the Section 9 note. Verified live end-to-end: a real multipart request with a valid JPEG signature was accepted and `photo_url` confirmed served by Caddy with `X-Content-Type-Options: nosniff`; both the verify and dismiss-with-reason paths worked through the admin dialog. Test data cleaned up afterward.                                                                                                                                                                                                                                                                | —   |
| Aug 2026     | 0.1     | SAF Module completion (S6): Added `LiveSummary` admin dashboard tiles (Active event, Unaccounted total, Open rescue requests count) and quick-access navigation cards for Emergency Events, Safety, and Rescue Queue. Hardened `EmergencyAlertBanner` to fall back to an active `emergency_event` notice when no announcement exists. Added demo seed data (`seed_safety`) for inactive prior emergency events with unregistered persons and rescue requests. All 17 SAF FR rows (FR-SAF-001..019, with FR-SAF-014 cut) updated to `◐`/`✕`. `architecture.md` Section 6.3 annotated with all newly implemented SAF endpoints.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —   |
| Aug 2026     | 0.1     | Concurrent emergency operations supersede the earlier singleton design: migration `0023_concurrent_emergency_operations` drops `idx_one_active_event`, adds walk-in support/conversion fields, and enforces one open physical check-in per person. `/admin/emergency-events` is now an event-selected Overview/Map/Accounted For workspace; the private map uses exact static NOAH intersection with labelled survey fallback and never changes the three finalized public maps. Safety, walk-ins, resident check-in, incident reports, occupancy, and public banners are event-aware; ambiguous omitted IDs return `409`. Flood History synchronization is flood-only. FR-SAF-014 reactivated; FR-SAF-020 and FR-MAP-015 added; relevant EVC rows moved to `◐`. Live verification and peer review remain outstanding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —   |
| Aug 2026     | 0.1     | MAP module built (M0–M4), 11/13 requirements now `✅`. **M0** — Geospatial pipeline split into `make hazard-derive` (needs GeoPandas) and `make hazard-web` (stdlib-only, runs in CI/Docker builds); `HazardMap` degrades gracefully on a missing GeoJSON layer (404 → `status: "unavailable"`) rather than crashing; `lib/map.ts` is now the single source of all map colours (layer keys, viewport, tile URL), with a Zustand `map-layer-store.ts` for layer visibility. **M1** — Approximate area boundaries generated (`tools/gen_area_seed.py` → `dataset/derived/san_jose_areas_approx.geojson`), then seeded via migration `0011_area_boundaries` (`boundary_source='approximate'`, `ST_PointOnSurface` for centroids). `GET /public/area-boundaries` (real FeatureCollection, separate from `/public/areas`). Resolves blocker BRD OI-3 at approximate precision; resolves BRD T-OI-2. **M2** — Real interactive Leaflet `HazardMap`: flood polygons with the correct Philippine government palette (yellow/orange/red; never blue — `design.md §3.4`), area-level vulnerability shading (green ramp, raw-flag count, labelled honestly — deviation from FR-MAP-002's "density" language documented), layer toggles, collapsible legend. Verified degraded-layer case (GeoJSON deleted). **M3** — Facility geo-pin: `create_facility`/`update_facility` derive `area_id` via PostGIS `ST_Contains` when omitted; bespoke `facility-form.tsx` with `LocationPicker` + manual-entry fallback. Admin CRUD in `/admin/facilities`. **M4** — Siren units: migration `0012_siren` (`Siren` model in `geo/models.py`, GiST-indexed point geometry, `status` CHECK `idle`/`sounding`); full CRUD + `POST /{id}/trigger` toggle endpoint; CSS-only ripple on `sounding` status in the public map; `/admin/sirens` management page. `AGENTS.md` reworded to clarify "physical siren/IoT hardware" is cut, not the admin-triggerable simulation. FR-MAP-001..010, 013, 014 → `✅`. FR-MAP-011/012 (3D visualization) remain `☐`. Section 17 blockers for FR-SYS-013/FR-MAP-001 and FR-MAP-003/004 resolved. | —   |
| Aug 2026     | 0.1     | Redesigned `AnnouncementCard` and `AnnouncementsSection` (FR-PUB-003, FR-ALT-004): replaced full solid-red background with a high-contrast red accent design system (red border-left, `<TriangleAlert />` badge tag, and dedicated `<ImmediateGuidance />` callout box). Converted the landing page section grid into a symmetrical 3-column equal layout with uniform aspect ratio image headers (and fallback gradient headers). Fixed desktop `SectionHeader` "View All" button text visibility across public sections. Updated `design.md` and `apps/web/docs/components.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —   |
