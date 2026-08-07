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

| Code | Module | BRD |
|---|---|---|
| `SYS` | Platform foundation — auth, roles, audit, configuration | cross-cutting |
| `PUB` | Public information site | M0 |
| `REG` | Community registry, members, vulnerability, health worker feedback | M1 |
| `MAP` | Barangay zone map | M2 |
| `WX` | Flood & weather watch | M3 |
| `ALT` | Alerts & announcements | M4 |
| `SAF` | Safety check-in & rescue | M5 |
| `EVC` | Evacuation center operations | M6 |
| `DON` | Donation drives & assistance | M7 |
| `ACT` | Activities & volunteers | M8 |
| `PRP` | Preparedness hub | M9 |
| `ANL` | Analytics & reporting | M10 |

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

| Value | Meaning |
|---|---|
| `☐` | Not started |
| `◐` | In progress |
| `👁` | In review |
| `✅` | Done — merged and meets acceptance criteria |
| `⏸` | Deferred |
| `✕` | Dropped — ID retired, never reused |

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

`M` Must · `S` Should · `C` Could — inherited from the BRD. Priority is build order **within** a module; every module is in scope (BRD 4.2).

---

## 2. Scope Summary

**In scope:** 11 modules, M0–M10, plus platform foundation.

**Not being built** — the complete list, carried from the BRD:

| Excluded | Reference |
|---|---|
| SMS notifications | BR-4.10, D-6 |
| Siren / IoT alert units (physical hardware) | BR-4.11, D-6 (Physical IoT procurement out of scope; **Visual Siren Simulation & Pin Triggering feature added for map & alert demo**: FR-MAP-014, FR-ALT-012) |
| Post-registration profile claiming | BRD M1b, D-11 |
| Safe routes & blocked roads on the map | BR-2.7, D-12 |
| Donation inventory, allocation, distribution tracking | BRD M7, D-8 |
| Native mobile apps | BRD 4.2 |
| Payment processing | BRD 4.2 |
| Any barangay other than San Jose | BRD 4.0 |
| Full offline sync | `design.md` D-OI-8 |

---

## 3. Platform Foundation — `SYS`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-SYS-001 | Account registration for a head of household | Email + password; unique email enforced; password policy applied; account created in `pending` state | BR-1.1 | M | ☐ | — |
| FR-SYS-002 | Login and logout | Valid credentials return an access token + refresh cookie; logout invalidates the refresh token | Tech Stack 5 | M | ☐ | — |
| FR-SYS-003 | Session refresh | Access token expires ≤15 min; refresh via httpOnly cookie without re-login | Tech Stack 5 | M | ☐ | — |
| FR-SYS-004 | Password reset | User can request a reset; admin can also initiate one for a resident | Tech Stack 5 | S | ☐ | — |
| FR-SYS-005 | Six roles enforced | `public`, `head`, `bhw`, `admin`, `sk`, `superadmin`; role carried as a token claim | BRD 5.1 | M | ☐ | — |
| FR-SYS-006 | Server-side authorization on every endpoint | Every protected route checks role; UI hiding alone fails review | BRD 5.1 | M | ☐ | — |
| FR-SYS-007 | BHW area scoping | A BHW can read/write only households in their assigned areas; cross-area access returns 403 | BR-1.44 | M | ☐ | — |
| FR-SYS-008 | Audit log of state-changing actions | Actor, action, target, timestamp recorded and queryable by admin | BR-1.45, BR-4.6 | M | ☐ | — |
| FR-SYS-009 | Admin can manage users | List, search, filter, view, activate/deactivate, change role | BRD 5.1 | M | ☐ | — |
| FR-SYS-010 | Configuration store | Admin-editable settings: barangay totals, alert thresholds, hotlines, facility list | BR-3.3, BR-10.1a | M | ☐ | — |
| FR-SYS-011 | In-app notification centre | Notifications listed, unread count shown, mark-as-read | BR-1.18, BR-8.3 | S | ☐ | — |
| FR-SYS-012 | Reference data: PSGC | PSGC hierarchy loaded at migration; cascading region→province→city→barangay select | BR-1.3 | M | ☐ | — |
| FR-SYS-013 | Reference data: barangay areas | Areas/zones seeded with names and boundary polygons; used across REG, MAP, ANL | BR-1.3, OI-3 | M | ☐ | — |
| FR-SYS-014 | Emergency hotline directory | Admin CRUD; surfaced in PUB, MAP, EVC; one-tap `tel:` links | BR-0.7 | M | ☐ | — |
| FR-SYS-015 | Barangay facility registry | Admin CRUD with geo-pin: evacuation centres, hospitals, clinics, barangay hall, police, fire, rescue stations | BR-2.4, BR-2.5 | M | ☐ | — |
| FR-SYS-016 | Rate limiting on sensitive endpoints | Login and rescue-request endpoints throttled per IP | Tech Stack 5 | S | ☐ | — |
| FR-SYS-017 | Consent capture at registration | Consent text version recorded with timestamp, covering all members | BR-1.41 | M | ☐ | — |
| FR-SYS-018 | Data export / deletion request handling | Admin can export or delete a household record on request | BR-1.42, BR-1.43 | S | ☐ | — |

---

## 4. Public Information Site — `PUB`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-PUB-001 | Hero section | App name, tagline, Get Started/Login action, always-visible hotline action | BR-0.1 | M | ◐ | — |
| FR-PUB-002 | About section | Mission, vision, why preparedness matters, SDG 11 & 13 alignment | BR-0.2 | M | ◐ | — |
| FR-PUB-003 | Latest announcements feed | Newest first, pulled live from ALT; emergency notices visually distinct | BR-0.3 | M | ◐ | — |
| FR-PUB-004 | Weather overview | Current conditions, temperature, rainfall, forecast; each reading timestamped and sourced | BR-0.4 | M | ◐ | — |
| FR-PUB-005 | Preparedness tip cards | Cards for flood, earthquake, fire, typhoon, San Jose Go Bag; each opens the full guide | BR-0.5 | S | ◐ | — |
| FR-PUB-006 | Upcoming activities | Date, venue, description; pulled live from ACT | BR-0.6 | S | ◐ | — |
| FR-PUB-007 | Emergency hotlines section | One-tap callable on mobile | BR-0.7 | M | ◐ | — |
| FR-PUB-008 | Evacuation centres list | Address, capacity, map preview; live occupancy once EVC is built | BR-0.8 | M | ◐ | — |
| FR-PUB-009 | Public hazard map embed | Flood-prone areas, safe zones, evacuation centres, facilities | BR-0.9 | M | ◐ | — |
| FR-PUB-010 | Donation drives section | Active drives, needs, progress, donation form — no account | BR-0.10 | S | ◐ | — |
| FR-PUB-011 | FAQs | Published, maintainable, accordion presentation | BR-0.11 | S | ◐ | — |
| FR-PUB-012 | Footer | Barangay info, contacts, socials, hotline, copyright | BR-0.12 | M | ◐ | — |
| FR-PUB-013 | Live content, single source | Every dynamic section reads from its module; no duplicated content store | BR-0.13 | M | ☐ | — |
| FR-PUB-014 | No personal data on public pages | Only area-level aggregates rendered; verified by review | BR-0.14, BR-1.52 | M | ◐ | — |
| FR-PUB-015 | Persistent hotline access | Hotline action reachable without scrolling on all viewports | BR-0.15 | M | ◐ | — |
| FR-PUB-016 | Section-level failure isolation | A failed weather or map fetch degrades that section only; hotlines always render | BR-0.17 | M | ◐ | — |
| FR-PUB-017 | Emergency alert takeover | Active alert renders above all content, sticky, non-dismissible while active | BR-0.18 | M | ◐ | — |
| FR-PUB-018 | Empty sections hidden | Sections with no content are not rendered as empty shells | BR-0.20 | S | ◐ | — |

> **Why these are `◐` and not `✅`.** The landing page and the four information
> routes are built, responsive at 360/768/1440, and verified — but every section
> reads a typed fixture rather than its module. That makes **FR-PUB-013 (`☐`)
> definitionally unmet**, and since the other seventeen are *demonstrated* against
> fixtures rather than against real data, none of them can honestly claim the
> Definition of Done either. Two more DoD items are also outstanding across the
> whole set: peer review (item 6), and the loading states that only become
> meaningful once the fetches are real (item 3).
>
> The fixtures are shaped to the exact DTOs the API will return — envelopes,
> field names, and derived fields included — so closing these is a change to
> `apps/web/src/lib/api/public.ts` alone. `grep -rn "TODO(FR-PUB-013)"` lists
> every call site.
>
> The **PR column is deliberately empty**: this work is committed locally and has
> not been pushed, so there is no PR to reference yet.

---

## 5. Community Registry — `REG`

### 5.1 Household registration

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-001 | Self-registration as head of household | Creates household record + head's own member profile in one flow | BR-1.1 | M | ☐ | — |
| FR-REG-002 | BHW-assisted registration | BHW creates a household and all members without any account being attached | BR-1.2, BR-1.20 | M | ☐ | — |
| FR-REG-003 | Address capture via PSGC + area | PSGC cascading select plus barangay area assignment; area required | BR-1.3 | M | ☐ | — |
| FR-REG-004 | Household core fields | One address, one area, one named head, contact number optional | BR-1.4 | M | ☐ | — |
| FR-REG-005 | No-phone households accepted | Registration completes without a contact number; record flagged `unreachable_by_phone` | BR-1.4a | M | ☐ | — |
| FR-REG-006 | Household reference number | Generated at creation, unique, displayed on the record | BR-1.20a | M | ☐ | — |
| FR-REG-007 | Creator attribution | Barangay-created records store creating BHW and timestamp | BR-1.20b | M | ☐ | — |
| FR-REG-008 | Household geotag | Draggable map pin sets coordinates; GPS button only when `isSecureContext` | BR-1.7 | S | ☐ | — |
| FR-REG-009 | Head can edit household and members | All edits versioned and auditable | BR-1.8 | S | ☐ | — |
| FR-REG-010 | Duplicate detection and merge | Likely duplicates flagged on name + birthdate + area; admin can merge, preserving history | BR-1.9 | M | ☐ | — |
| FR-REG-011 | Verification flag | Admin marks a household verified; unverified records still count and still receive alerts | BR-1.10 | S | ☐ | — |
| FR-REG-012 | Registration draft persistence | Form state saved locally as typed; resume prompt on return; never cleared on failed submit | Design 9.6 | S | ☐ | — |

### 5.2 Household members

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-020 | Add member profiles | Head or BHW adds unlimited members to a household | BR-1.31 | M | ☐ | — |
| FR-REG-021 | Vulnerable-group flags | Per member: child, senior, PWD, pregnant/lactating, chronic condition on regular medication, **bedridden/mobility-limited** | BR-1.32 | M | ☐ | — |
| FR-REG-022 | Members hold no account | Member records have no credentials; access is via the head's account only | BR-1.33 | M | ☐ | — |
| FR-REG-023 | Relationship to head recorded | Selectable relationship per member | BR-1.34 | S | ☐ | — |
| FR-REG-024 | All members in one visit | BHW flow captures every member in a single session without re-entry | BR-1.36 | M | ☐ | — |
| FR-REG-025 | Member repeater UX | One member per collapsible card, one open at a time, "Member N of M" progress, sticky save | Design 9.5 | M | ☐ | — |
| FR-REG-026 | Split an adult member out | Adult member becomes head of a new household, retaining nutrition history | BR-1.37 | C | ☐ | — |

### 5.3 Nutrition & health data

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-030 | Capture nutrition indicators per member | Indicator set configurable; final set from Nutrition lead (OI-2) | BR-1.5 | M | ☐ | — |
| FR-REG-031 | Automatic nutrition classification | Status computed from entered values without manual scoring; recomputed on edit | BR-1.6 | M | ☐ | — |
| FR-REG-032 | Nutrition history retained | Successive measurements stored with dates, not overwritten | BR-1.19 | S | ☐ | — |

### 5.4 Vulnerability classification

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-040 | Compute vulnerability from A + B + C | Person factors, exposure, and capacity all contribute; person factors alone insufficient | BR-1.47 | M | ☐ | — |
| FR-REG-041 | Four named levels | `Low`, `Moderate`, `High`, `Priority`; raw score never surfaced to users | BR-1.48 | M | ☐ | — |
| FR-REG-042 | Most-vulnerable-member rule | One bedridden member or one severely malnourished child forces `Priority` regardless of other factors | BR-1.38, BR-1.49 | M | ☐ | — |
| FR-REG-043 | Exposure factors from geography | Area hazard class, river proximity, distance to nearest centre, vehicle accessibility — derived, not asked | BR-1.47 | M | ☐ | — |
| FR-REG-044 | Capacity factors reduce level | Able-bodied adult present, reachable by phone, drill attendance, go-bag prepared | BR-1.47 | S | ☐ | — |
| FR-REG-045 | Explainability | Admin can see which factors produced the level | BR-1.50 | M | ☐ | — |
| FR-REG-046 | Manual override | Admin overrides level with a mandatory recorded reason; override visible as such | BR-1.51 | M | ☐ | — |
| FR-REG-047 | Vulnerability never public | Not rendered on public pages, not visible to other residents | BR-1.52 | M | ☐ | — |
| FR-REG-048 | Vulnerability visible to barangay | Shown on household record and in registry lists for targeting | BR-1.11 | M | ☐ | — |

### 5.5 Health worker feedback

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-050 | BHW writes feedback on a member | Free-text guidance saved against a member profile | BR-1.12 | M | ☐ | — |
| FR-REG-051 | Feedback appears on head's portal | Attributed to the author, dated | BR-1.13 | M | ☐ | — |
| FR-REG-052 | Guidance disclaimer | Every published item carries "general dietary advice, not a diagnosis" text | BR-1.17 | M | ☐ | — |
| FR-REG-053 | Source attribution | Guidance indicates authorship/review and cites NNC/DOH/DOST-FNRI basis | BR-1.16 | M | ☐ | — |
| FR-REG-054 | Notify on new feedback | Resident notified in-app when feedback is published | BR-1.18 | S | ☐ | — |
| FR-REG-055 | Feedback history | Prior feedback retained and viewable chronologically | BR-1.19 | S | ☐ | — |
| FR-REG-056 | Automated draft guidance | System proposes guidance from nutrition status — **draft only** | BR-1.14 | C | ⏸ | — |
| FR-REG-057 | Mandatory human review before publish | Drafted guidance cannot reach a resident without explicit BHW approval. **Blocks FR-REG-056** | BR-1.15 | M | ⏸ | — |

> `FR-REG-056` / `FR-REG-057` are deferred pending OI-11. If automated drafting is dropped, mark both `✕`. **FR-REG-056 must never ship without FR-REG-057.**

### 5.6 Counts

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-REG-060 | Registered counts derived | Household and member counts computed from the registry | BR-1.39 | M | ☐ | — |
| FR-REG-061 | Barangay-wide totals configured | Admin-entered figures, stored separately, never conflated with registered counts | BR-1.40 | M | ☐ | — |

---

## 6. Barangay Zone Map — `MAP`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-MAP-001 | Area/zone rendering | Barangay divided into its areas, each selectable | BR-2.1 | M | ☐ | — |
| FR-MAP-002 | Area shading by indicator | Toggle between malnutrition concentration, vulnerable-household density, flood exposure | BR-2.2 | M | ☐ | — |
| FR-MAP-003 | Hazard layers | NOAH flood polygons (5/25/100-yr) with low/medium/high fill; safe zones | BR-2.3 | M | ☐ | — |
| FR-MAP-004 | Hazard data pre-clipped and static | Serves a committed GeoJSON clipped to San Jose; no runtime dependency on NOAH | Tech Stack 6 | M | ☐ | — |
| FR-MAP-005 | Facility pins | All facility types from FR-SYS-015 rendered with type-specific icons | BR-2.4 | M | ☐ | — |
| FR-MAP-006 | Admin facility management | Add/edit/remove/geo-pin without developer involvement | BR-2.5 | M | ☐ | — |
| FR-MAP-007 | Public map, no personal data | Login-free version showing area aggregates only | BR-2.6 | M | ☐ | — |
| FR-MAP-008 | Boundary disclaimer | Map states boundaries are approximations, not cadastral data | BR-2.8 | M | ☐ | — |
| FR-MAP-009 | Attribution | OSM and Project NOAH (ODC-ODbL) credited on the map and in About | Tech Stack 6 | M | ☐ | — |
| FR-MAP-010 | Layer legend | Legend reflects the domain palettes; collapsible on mobile | Design 3.4 | M | ☐ | — |
| FR-MAP-011 | 3D zone visualization | Extruded area polygons coloured by risk; orbit controls; click to select | BR-2.1, BR-2.2 | S | ☐ | — |
| FR-MAP-012 | 3D fallback on low-end devices | Below `md` or ≤4 cores, render 2D map or static image with opt-in to 3D | Design 9.6 | M | ☐ | — |
| FR-MAP-013 | Location picker | Draggable pin primary; GPS button only in secure context | Design 9.5 | M | ☐ | — |
| FR-MAP-014 | Siren / IoT alert unit pins | Pin siren locations on interactive map with status indicators (idle / sounding); admin can add/edit/geo-pin siren units | BR-4.11, BR-2.4 | S | ☐ | — |

---

## 7. Flood & Weather Watch — `WX`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-WX-001 | Current conditions | Temperature, rainfall, precipitation outlook for the barangay | BR-3.1 | M | ☐ | — |
| FR-WX-002 | Short-term forecast | Hourly and daily forecast displayed | BR-3.1 | M | ☐ | — |
| FR-WX-003 | Open-Meteo integration | Scheduled fetch, cached; never called per page view | Tech Stack 7 | M | ☐ | — |
| FR-WX-004 | River level display | Current reading shown with unit and station name | BR-3.2 | M | ☐ | — |
| FR-WX-005 | Three-tier alert mapping | Reading mapped to Normal / 1 Prepare / 2 Evacuate / 3 Forced Evacuation | BR-3.2 | M | ☐ | — |
| FR-WX-006 | Configurable thresholds | Admin edits the metre values for each tier | BR-3.3 | M | ☐ | — |
| FR-WX-007 | Manual river level entry | Admin can enter the current reading directly; used when automated retrieval is unavailable | Tech Stack 7 | M | ☐ | — |
| FR-WX-008 | PAGASA retrieval adapter | Isolated behind one interface; failure does not break the module | Tech Stack 7 | S | ☐ | — |
| FR-WX-009 | Threshold breach prompts BDRRMC | Crossing a tier creates an actionable prompt. **Never auto-publishes a public alert** | BR-3.4 | M | ☐ | — |
| FR-WX-010 | Provenance and timestamp on every reading | Source and time shown; no bare numbers | BR-3.8 | M | ☐ | — |
| FR-WX-011 | Stale data marked | Readings older than threshold visibly flagged as stale | BR-3.8 | M | ☐ | — |
| FR-WX-012 | Last-known-good retention | Previous reading shown with its age when a fetch fails; never silently blank | Tech Stack 7 | M | ☐ | — |
| FR-WX-013 | Flood event history | Date, level reached, areas affected, households displaced | BR-3.5 | S | ☐ | — |
| FR-WX-014 | Forecast-based advance warning | Predicted threshold breach surfaced where data supports it | BR-3.6 | S | ☐ | — |
| FR-WX-015 | Heat index & typhoon advisories | Surfaced on portal and public site | BR-3.7 | C | ☐ | — |
| FR-WX-016 | Demo/simulation mode | Seeded scenario can drive readings on a scripted timeline for the pitch | Tech Stack 7 | S | ☐ | — |

---

## 8. Alerts & Announcements — `ALT`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-ALT-001 | Publish announcement | Title, body, type, effective period; admin and SK officer | BR-4.1 | M | ☐ | — |
| FR-ALT-002 | Announcement types | Emergency notice, class suspension, road closure, water/power interruption, general | BR-4.1 | M | ☐ | — |
| FR-ALT-003 | Area targeting | Target specific areas or the whole barangay | BR-4.2 | M | ☐ | — |
| FR-ALT-004 | Emergency alerts visually distinct | Danger palette, separate presentation from routine announcements | BR-4.3 | M | ☐ | — |
| FR-ALT-005 | Actionable instruction required | Alert cannot be published without an instruction field | BR-4.4 | M | ☐ | — |
| FR-ALT-006 | Alert type taxonomy | Flood, earthquake, typhoon, heavy rainfall, heat index, evacuation | BR-4.7 | M | ☐ | — |
| FR-ALT-007 | Issuer attribution | Publishing officer and timestamp recorded and displayed | BR-4.6 | M | ☐ | — |
| FR-ALT-008 | In-platform & website delivery | Alerts appear in portal and on the public site | BR-4.8 | M | ☐ | — |
| FR-ALT-009 | Alert history | Retained and publicly viewable | BR-4.5 | S | ☐ | — |
| FR-ALT-010 | Channel-extensible design | Delivery abstracted so a channel can be added without redesign | BR-4.9 | S | ☐ | — |
| FR-ALT-011 | Deactivate an alert | Admin ends an active alert; takeover banner clears | BR-4.3 | M | ☐ | — |
| FR-ALT-012 | Siren simulation, trigger & audio playback | Triggering a siren pin emits expanding radial soundwave ripples/vibrations on the map pin AND synthesizes/plays a siren audio alarm on the machine via Web Audio API | BR-3.4, BR-4.11 | S | ☐ | — |

---

## 9. Safety Check-In & Rescue — `SAF`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-SAF-001 | Per-member safety marking | Any member can be individually marked safe | BR-5.1 | M | ☐ | — |
| FR-SAF-002 | Whole-household safety marking | One action covers all members | BR-5.1 | M | ☐ | — |
| FR-SAF-003 | Bulk action confirmation | Household action lists the members it covers and requires explicit confirm — never a single ambiguous tap | BR-5.1b | M | ☐ | — |
| FR-SAF-004 | Head or barangay may set status | Both actors supported, individually or in bulk | BR-5.1a, BR-5.2 | M | ☐ | — |
| FR-SAF-005 | Confidence distinction | Dashboard distinguishes individually confirmed from bulk-covered statuses | BR-5.1c | S | ☐ | — |
| FR-SAF-006 | Status correction | Any status revertible by head or barangay | BR-5.1d | M | ☐ | — |
| FR-SAF-007 | Status provenance | Records who set it, when, and how (self / assisted / bulk) | BR-5.8 | M | ☐ | — |
| FR-SAF-008 | Rescue request submission | Location plus situation description | BR-5.3 | M | ☐ | — |
| FR-SAF-009 | **Rescue request without an account** | Public form, no login, minimal fields, large tap targets | BR-5.9 | M | ☐ | — |
| FR-SAF-010 | Rescue queue and triage | Queued, tracked to resolution; registered requesters' vulnerability informs order; unregistered **not** deprioritised by default | BR-5.4 | M | ☐ | — |
| FR-SAF-011 | Accounted-for dashboard | Live registered accounted-for vs unaccounted, broken down by area | BR-5.5 | M | ☐ | — |
| FR-SAF-012 | Record unregistered person | Admin records a person as safe or needing rescue with name + location only | BR-5.10 | M | ☐ | — |
| FR-SAF-013 | Unregistered counted separately | Kept out of registered coverage figures | BR-5.11 | S | ☐ | — |
| FR-SAF-014 | Convert emergency record to registration | Post-event conversion into a full household record | BR-5.12 | C | ☐ | — |
| FR-SAF-015 | Incident reporting | Type, description, photo upload, location | BR-5.6 | S | ☐ | — |
| FR-SAF-016 | Verify or dismiss reports | Admin can mark verified or dismissed with reason | BR-5.7 | S | ☐ | — |
| FR-SAF-017 | No promise of rescue | Every rescue surface displays the disclaimer and official hotlines alongside | BRD M5 note | M | ☐ | — |

---

## 10. Evacuation Center Operations — `EVC`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-EVC-001 | Centre registry | Name, address, capacity, contact person; admin CRUD | BR-6.1 | M | ☐ | — |
| FR-EVC-002 | Occupancy tracking | Current occupancy recorded and shown against capacity | BR-6.2 | M | ☐ | — |
| FR-EVC-003 | Map presence and directions | Centres pinned; directions available publicly | BR-6.3 | M | ☐ | — |
| FR-EVC-004 | Check in a registered resident | Linked to their member record; feeds FR-SAF-011 | BR-6.6 | S | ☐ | — |
| FR-EVC-005 | Check in an unregistered evacuee | By name only; counts toward occupancy | BR-6.7 | M | ☐ | — |
| FR-EVC-006 | Supply levels | Food, water, medicine stock recorded per centre | BR-6.4 | S | ☐ | — |
| FR-EVC-007 | Facilities status | Comfort rooms, power, water availability | BR-6.5 | C | ☐ | — |
| FR-EVC-008 | Capacity warning | Centre at or above capacity is visibly flagged to admins | BR-6.2 | S | ☐ | — |

---

## 11. Donation Drives & Assistance — `DON`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-DON-001 | Create a donation drive | Event, items needed, quantity target, description | BR-7.1 | M | ☐ | — |
| FR-DON-002 | Public donation form, no account | Item, quantity, donor name, optional contact | BR-7.2, BR-7.2a | M | ☐ | — |
| FR-DON-003 | Reference number issued | Unique reference returned on submission | BR-7.2b | S | ☐ | — |
| FR-DON-004 | Public progress display | Progress against target shown on the drive | BR-7.3 | M | ☐ | — |
| FR-DON-005 | Donation status lifecycle | `Submitted` → `Received` / `Partially received` / `Not fulfilled` | BR-7.4 | M | ☐ | — |
| FR-DON-006 | Status change attribution | Officer and timestamp recorded per change | BR-7.4a | M | ☐ | — |
| FR-DON-007 | Walk-in donations | Admin records donations never submitted online | BR-7.4b | S | ☐ | — |
| FR-DON-008 | Donor status lookup | Donor checks status by reference number, no account | BR-7.4c | C | ☐ | — |
| FR-DON-009 | Close a drive | Admin closes when target met or event passed | BR-7.5 | S | ☐ | — |
| FR-DON-010 | No money handled | No payment fields or processing; monetary donations directed to official channels with a notice | BR-7.7 | M | ☐ | — |
| FR-DON-011 | Publish distribution schedules | When and where residents can claim | BR-7.6 | S | ☐ | — |
| FR-DON-012 | Record assistance per household | What was provided or scheduled, and whether claimed | BR-7.6a | S | ☐ | — |
| FR-DON-013 | Resident assistance status | Head sees pending / scheduled / claimed for their household | BR-7.6b | S | ☐ | — |
| FR-DON-014 | Assistance decoupled from donations | No data relationship between a donation record and an assistance record | BR-7.6c | M | ☐ | — |

---

## 12. Activities & Volunteers — `ACT`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-ACT-001 | Create an activity | Title, type, date, venue, description; admin and SK officer | BR-8.1 | M | ☐ | — |
| FR-ACT-002 | Activity types | Drill, seminar, first aid training, clean-up, tree planting, NGO programme | BR-8.1 | M | ☐ | — |
| FR-ACT-003 | Public and portal listing | Upcoming activities on both surfaces | BR-8.2 | M | ☐ | — |
| FR-ACT-004 | Attendance intent | Resident indicates they will attend | BR-8.3 | S | ☐ | — |
| FR-ACT-005 | Event reminders | In-app reminder before the event | BR-8.3 | S | ☐ | — |
| FR-ACT-006 | Volunteer registration | Resident registers as volunteer with skills inventory | BR-8.4 | S | ☐ | — |
| FR-ACT-007 | Attendance recording | Admin records actual attendance; reportable | BR-8.5 | S | ☐ | — |
| FR-ACT-008 | Volunteer task assignment | Volunteers assigned to tasks during an emergency | BR-8.6 | C | ☐ | — |
| FR-ACT-009 | Training certificates | Issued and tracked per volunteer | BR-8.7 | C | ☐ | — |

---

## 13. Preparedness Hub — `PRP`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-PRP-001 | Hazard guides | Before/during/after for flood, earthquake, typhoon, fire, landslide | BR-9.1 | M | ☐ | — |
| FR-PRP-002 | Go-bag checklist | Interactive tick-off; state persisted per household | BR-9.2 | M | ☐ | — |
| FR-PRP-003 | Emergency food guide | Shelf-stable options, safe water, storage, emergency cooking | BR-9.3 | M | ☐ | — |
| FR-PRP-004 | Localized San Jose Go Bag | Reflects local conditions, not generic national advice | BR-9.4 | S | ☐ | — |
| FR-PRP-005 | FAQs | Published and maintainable via admin | BR-9.5 | S | ☐ | — |
| FR-PRP-006 | Family emergency plan | Household drafts and saves a plan | BR-9.6 | C | ☐ | — |
| FR-PRP-007 | Source attribution and dating | Every guide cites NDRRMC/DOH/PRC/NNC and shows last-reviewed date | BR-9.8 | M | ☐ | — |
| FR-PRP-008 | Go-bag status feeds vulnerability | Completion contributes to capacity factors | BR-1.47 | S | ☐ | — |
| FR-PRP-009 | Content in Filipino | Primary content Filipino, English secondary | BR-9.7 | S | ☐ | — |

---

## 14. Analytics & Reporting — `ANL`

| ID | Requirement | Acceptance criteria | Src | Pri | Status | PR |
|---|---|---|---|---|---|---|
| FR-ANL-001 | Operations dashboard | Registered households/members, high-risk and flood-prone counts, affected families, active emergencies, open rescues | BR-10.1 | M | ☐ | — |
| FR-ANL-002 | Configured totals as denominator | Barangay-wide figures admin-set and stored separately | BR-10.1a | M | ☐ | — |
| FR-ANL-003 | Coverage always visible | Registered counts always presented against the configured total | BR-10.1b | M | ☐ | — |
| FR-ANL-004 | Nutrition summary by area | Ranked to show which areas need intervention first | BR-10.2 | M | ☐ | — |
| FR-ANL-005 | Affected families per event | Tracked and reportable | BR-10.3 | M | ☐ | — |
| FR-ANL-006 | Donation drive reporting | Needed vs submitted vs received per drive | BR-10.4 | S | ☐ | — |
| FR-ANL-007 | Activity participation reporting | Attendance across activities, for SK accomplishment reporting | BR-10.5 | S | ☐ | — |
| FR-ANL-008 | Response time measurement | Rescue request creation → resolution | BR-10.6 | C | ☐ | — |
| FR-ANL-009 | Report export | CSV/PDF export for MDRRMO and SK submission | BR-10.7 | S | ☐ | — |
| FR-ANL-010 | Multi-year retention | Historical data retained for trend analysis | BR-10.8 | C | ☐ | — |
| FR-ANL-011 | Charts follow the palette | Chart colours and solid-vs-dashed conventions per Design 3.5 | Design 3.5 | S | ☐ | — |

---

## 15. Non-Functional Requirements

### 15.1 Performance — `PERF`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-PERF-001 | Public landing page first contentful paint on 3G, mid-range Android | ≤ 3 s | ☐ |
| NFR-PERF-002 | Public landing page Largest Contentful Paint | ≤ 4 s | ☐ |
| NFR-PERF-003 | API response time, 95th percentile, non-report endpoints | ≤ 500 ms | ☐ |
| NFR-PERF-004 | Registry list with 5,000 households — paginated load | ≤ 1.5 s | ☐ |
| NFR-PERF-005 | Hazard GeoJSON payload | ≤ 500 KB after simplification | ☐ |
| NFR-PERF-006 | Public landing JS bundle | ≤ 250 KB gzipped | ☐ |
| NFR-PERF-007 | Recharts and Three.js loaded dynamically, never in the landing bundle | Verified in build output | ☐ |
| NFR-PERF-008 | Weather and river data served from cache, not upstream, on page load | 0 upstream calls per page view | ☐ |
| NFR-PERF-009 | Spatial queries use PostGIS indexes | No sequential scan on point-in-polygon | ☐ |

### 15.2 Availability & Resilience — `AVL`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-AVL-001 | Platform availability during normal operation | ≥ 99% monthly | ☐ |
| NFR-AVL-002 | Upstream data source failure does not break a page | Section-level degradation only | ☐ |
| NFR-AVL-003 | Last-known-good values served when a fetch fails, with visible age | Always | ☐ |
| NFR-AVL-004 | Hotlines and emergency contacts render even when all dynamic sections fail | Always | ☐ |
| NFR-AVL-005 | Database backup frequency | Daily `pg_dump`, stored off-box | ☐ |
| NFR-AVL-006 | Restore from backup verified | Tested at least once before the pitch | ☐ |
| NFR-AVL-007 | Local Docker Compose stack can run the full demo if the VPS is unavailable | Verified | ☐ |

### 15.3 Security — `SEC`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-SEC-001 | Passwords hashed with argon2 | No other algorithm accepted | ☐ |
| NFR-SEC-002 | Access token lifetime | ≤ 15 minutes | ☐ |
| NFR-SEC-003 | Refresh token in httpOnly + SameSite cookie; `Secure` set via env when HTTPS is available | Verified | ☐ |
| NFR-SEC-004 | Authorization enforced server-side on every protected endpoint | 100% coverage; UI hiding never sufficient | ☐ |
| NFR-SEC-005 | BHW area scoping enforced in the data layer, not the UI | Cross-area request returns 403 | ☐ |
| NFR-SEC-006 | Input validated server-side with Pydantic on every endpoint | 100% | ☐ |
| NFR-SEC-007 | Parameterised queries only — no string-built SQL | Enforced by ORM usage + review | ☐ |
| NFR-SEC-008 | File uploads validated by type and size; stored outside the web root | ≤ 5 MB, images only | ☐ |
| NFR-SEC-009 | Rate limiting on login and rescue endpoints | Configured | ☐ |
| NFR-SEC-010 | No secrets committed; `.env.example` only | Verified by CI secret scan | ☐ |
| NFR-SEC-011 | Dependencies scanned for known vulnerabilities | CI check on PRs | ☐ |
| NFR-SEC-012 | Security headers set at the proxy | CSP, X-Frame-Options, X-Content-Type-Options | ☐ |

### 15.4 Privacy & Data Protection — `PRV`

> Provisional pending PolSci review (BRD OI-17). Not triggered at prototype stage — the demo uses synthetic data.

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-PRV-001 | Consent recorded at registration, covering every member, with the consent text version | Stored | ⏸ |
| NFR-PRV-002 | Head can request deletion of the household record; barangay can action it | Supported | ⏸ |
| NFR-PRV-003 | Adult member can request access, correction, or removal independently of the head | Process exists | ⏸ |
| NFR-PRV-004 | Access to health and nutrition data logged | Actor, record, timestamp | ⏸ |
| NFR-PRV-005 | Retention period defined for inactive records | Documented and applied | ⏸ |
| NFR-PRV-006 | No personal, household-level, or member-level data on any public surface | Verified by review | ☐ |
| NFR-PRV-007 | Demo and development environments use synthetic data only | No real resident data outside production | ☐ |
| NFR-PRV-008 | Privacy notice published and linked from registration | Present | ⏸ |

### 15.5 Usability & Accessibility — `UX`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-UX-001 | Colour contrast | WCAG 2.1 AA — 4.5:1 body, 3:1 large text and UI boundaries | ☐ |
| NFR-UX-002 | Status never conveyed by colour alone | Icon or text label always present | ☐ |
| NFR-UX-003 | Tap targets | ≥ 44×44; ≥ 48×48 on emergency actions | ☐ |
| NFR-UX-004 | Full keyboard operability with visible focus | All interactive elements | ☐ |
| NFR-UX-005 | Alerts announced to assistive technology | `aria-live="assertive"` on emergency banners | ☐ |
| NFR-UX-006 | Usable at 200% zoom without horizontal scrolling | Verified | ☐ |
| NFR-UX-007 | `prefers-reduced-motion` honoured | Transforms and pulses disabled | ☐ |
| NFR-UX-008 | Every screen has defined loading, empty, and error states | 100% | ☐ |
| NFR-UX-009 | Destructive actions require confirmation | Always | ☐ |
| NFR-UX-010 | Form errors identify the field and the fix, in plain language | Always | ☐ |

### 15.6 Compatibility — `CMP`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-CMP-001 | Minimum supported viewport | 320 px | ☐ |
| NFR-CMP-002 | Browsers | Chrome, Firefox, Safari, Edge — last 2 major versions; Android Chrome; iOS Safari 15+ | ☐ |
| NFR-CMP-003 | Functions without a secure context | Manual location entry and gallery upload always available | ☐ |
| NFR-CMP-004 | Tested on a real device at 360 px before the pitch | Verified | ☐ |
| NFR-CMP-005 | Both orientations supported; none required | Verified | ☐ |

### 15.7 Maintainability — `MNT`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-MNT-001 | TypeScript strict mode on the frontend | Enabled | 👁 |
| NFR-MNT-002 | Lint and format enforced in CI | ruff (Python), ESLint + Prettier (TS) | 👁 |
| NFR-MNT-003 | CI runs lint and tests on every PR | Green required to merge | 👁 |
| NFR-MNT-004 | All schema changes via Alembic migrations | No manual DDL | 👁 |
| NFR-MNT-005 | Test coverage on vulnerability classification and alert threshold logic | ≥ 80% on those modules | ☐ |
| NFR-MNT-006 | shadcn primitives not edited except for token wiring | Enforced by review | ☐ |
| NFR-MNT-007 | Environment parity — same Compose stack locally and on the VPS | Verified | 👁 |
| NFR-MNT-008 | README enables a new team member to run the stack | ≤ 30 minutes from clone | ◐ |
| NFR-MNT-009 | External data adapters isolated behind interfaces | Weather, river level, hazard data | ◐ |

> **On the `👁` rows above and in 15.8.** These were delivered by the infrastructure bootstrap (`chore/NFR-MNT-007-infra-bootstrap`) and are implemented and verified against a running stack. They are `👁` rather than `✅` because Definition of Done item 6 — reviewed by one other team member — has not happened yet, and NFR-MNT-003's "green required to merge" additionally needs branch protection, which needs a remote.
>
> The `◐` rows are partial by design:
>
> - **NFR-MNT-008** — the README exists and the stack comes up from a clean clone, but nobody has actually timed a teammate doing it. That is the acceptance criterion, so it stays `◐` until someone does.
> - **NFR-MNT-009** — the `DataSource` protocol and the three adapter modules exist; the adapters themselves are stubs. The interface is what this NFR asks for, but calling it done before anything implements it would be a lie.
> - **NFR-OBS-002** — the `@job` decorator logs start, outcome, and duration for every job, so the requirement is structurally met. The six jobs are stubs, so there are no real outcomes to log yet.

### 15.8 Observability — `OBS`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-OBS-001 | Structured application logs with request IDs | JSON output | 👁 |
| NFR-OBS-002 | Scheduled job outcomes logged — success, failure, duration | Every run | ◐ |
| NFR-OBS-003 | Upstream fetch failures logged with source and reason | Every failure | ☐ |
| NFR-OBS-004 | Health check endpoint | `/health` returning app and DB status | 👁 |
| NFR-OBS-005 | Audit log queryable by admin | Filter by actor, action, date | ☐ |

### 15.9 Data — `DAT`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-DAT-001 | PostgreSQL with PostGIS for all spatial data | Areas, household points, hazard polygons | ☐ |
| NFR-DAT-002 | Coordinate reference system | WGS 84 / EPSG:4326 | ☐ |
| NFR-DAT-003 | All timestamps stored in UTC, displayed in PHT | Verified | ☐ |
| NFR-DAT-004 | Soft delete on household and member records | Recoverable; hard delete only on a privacy request | ☐ |
| NFR-DAT-005 | Registered counts always derived, never stored as a duplicate field | Verified | ☐ |
| NFR-DAT-006 | Seed data set for demo, clearly marked synthetic | Available | ☐ |
| NFR-DAT-007 | Reference data loaded via migration, not runtime API calls | PSGC, areas, hazard GeoJSON | ☐ |

### 15.10 Localization — `LOC`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-LOC-001 | Filipino primary, English secondary | All resident-facing copy | ☐ |
| NFR-LOC-002 | Language switchable and persisted | Per user/session | ☐ |
| NFR-LOC-003 | No concatenated translation fragments | Full parameterised strings | ☐ |
| NFR-LOC-004 | Layout tolerates ~30% string expansion without clipping | Verified | ☐ |
| NFR-LOC-005 | Dates and numbers formatted for `fil-PH` | Verified | ☐ |
| NFR-LOC-006 | Hotline numbers, area names, facility names never translated | Verified | ☐ |

### 15.11 Legal & Compliance — `LGL`

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-LGL-001 | Project NOAH data attributed under ODC-ODbL; derivatives under the same licence | Map footer and About | ☐ |
| NFR-LGL-002 | OpenStreetMap attribution on every map view | Always visible | ☐ |
| NFR-LGL-003 | Open-Meteo attributed; non-commercial usage limits respected | ≤ 10k calls/day | ☐ |
| NFR-LGL-004 | PAGASA data attributed; polite scraping — identified UA, ≥10 min interval, backoff | Verified | ☐ |
| NFR-LGL-005 | Platform never presents itself as an official warning authority | Disclaimer on all alert surfaces | ☐ |
| NFR-LGL-006 | Health guidance carries a non-diagnostic disclaimer | Every published item | ☐ |
| NFR-LGL-007 | Rescue surfaces state that submission does not guarantee response | Always, with hotlines shown | ☐ |

---

## 16. Delivery Summary

| Module | FRs | Must | Should | Could | Done |
|---|---|---|---|---|---|
| SYS | 18 | 14 | 4 | 0 | 0 |
| PUB | 18 | 14 | 4 | 0 | 0 |
| REG | 36 | 26 | 8 | 2 | 0 |
| MAP | 13 | 11 | 2 | 0 | 0 |
| WX | 16 | 10 | 5 | 1 | 0 |
| ALT | 11 | 9 | 2 | 0 | 0 |
| SAF | 17 | 12 | 4 | 1 | 0 |
| EVC | 8 | 4 | 3 | 1 | 0 |
| DON | 14 | 8 | 5 | 1 | 0 |
| ACT | 9 | 3 | 4 | 2 | 0 |
| PRP | 9 | 4 | 4 | 1 | 0 |
| ANL | 11 | 5 | 4 | 2 | 0 |
| **Total** | **180** | **120** | **49** | **11** | **0** |

Non-functional: **77** across 11 categories.

> Recount whenever requirements are added or dropped. If the Must total climbs, that is R-8 (scope overrun) materialising — the largest risk on this project.

### Build order (BRD 8)

| Stage | Modules |
|---|---|
| 1 · Spine | `SYS`, `REG`, `PUB` shell |
| 2 · Demo narrative | `MAP`, `WX`, `SAF` |
| 3 · Operational depth | `ALT`, `EVC`, `DON` |
| 4 · Sustaining | `ACT`, `PRP`, `ANL` |

---

## 17. Blocked Requirements

Requirements that cannot start until an open item is resolved.

| Requirement | Blocked by | Owner |
|---|---|---|
| FR-REG-030, FR-REG-031 | Nutrition indicator set and thresholds — BRD OI-2 | Nutrition lead |
| FR-REG-040 – FR-REG-046 | Vulnerability level definitions and weighting — BRD OI-18 | PubAd lead |
| FR-REG-056, FR-REG-057 | Automated guidance in or out — BRD OI-11 | Nutrition + IT leads |
| FR-SYS-013, FR-MAP-001 | Official area/zone list and boundaries — BRD OI-3 | PubAd lead |
| FR-MAP-003, FR-MAP-004 | San Jose boundary polygon for clipping — tech T-OI-2 | IT lead |
| FR-WX-006 | Local river alert thresholds — BRD OI-4 | PubAd lead |
| FR-ANL-002 | Official barangay population and household totals — BRD OI-12 | PubAd lead |
| FR-PUB-001, FR-PUB-002 | App name, tagline, mission and vision — BRD OI-1, OI-10 | Whole team |
| NFR-PRV-001 – 005, 008 | Privacy requirements review — BRD OI-17 | PolSci lead |

---

## 18. Change Log

| Date | Version | Change | By |
|---|---|---|---|
| Aug 2026 | 0.1 | Initial derivation from BRD v0.3, tech_stack v0.1, design v0.2 | — |
