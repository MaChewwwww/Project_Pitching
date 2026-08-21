# Business Requirements Document

**Project:** SAGIP-SJ — System for Alert, Guidance, Incident Reporting, and Preparedness
_(formerly a working name pending Section 11 OI-1; closed — see Resolved Decisions D-13)_

**Locality:** Barangay San Jose, Rodriguez (Montalban), Rizal
**Prepared for:** Sangguniang Kabataan Project Pitching Competition
**Prepared by:** PUP Student Team — Political Science, Public Administration, Nutrition & Dietetics, Information Technology
**Version:** 0.4 · **Date:** August 2026
**Status:** Reviewed for internal consistency. 11 open items in Section 11 require team input; 16 decisions are recorded as settled

> **Scope note.** This document describes _what the business needs and why_. Functional/non-functional requirements, architecture, tech stack, data models, and design are covered in separate documents.

---

## 1. Executive Summary

Barangay San Jose sits in the upper Marikina River basin. When the river rises, the barangay evacuates — repeatedly, every rainy season. Today that response runs on paper lists, group chats, and the personal knowledge of barangay officials and health workers. Nobody can answer, in the first hour of a flood, the three questions that matter most: **who is at risk, where are they, and who is still unaccounted for.**

This project proposes a single barangay platform that answers those questions. It builds a household registry — one account per family, held by the head of the household, covering every member including the children who cannot register for themselves. Households are captured online _or_ by barangay health workers going door to door, so families without phones or internet are not excluded. Each member profile flags who needs priority attention — children, seniors, persons with disability, pregnant or lactating women, and people with chronic conditions requiring regular medication — and the registry is plotted against a zone map of the barangay, then powers flood alerting, evacuation center management, safety check-ins, rescue requests, and donation drives.

A household with a bedridden senior or a member with a chronic condition is not just a name on a list — it is a _priority evacuation case_, visible to the barangay before the water rises, not discovered after.

> **Aug 2026 revision.** Earlier drafts of this document fused a clinical nutrition-assessment program (Operation Timbang Plus digitization: per-member indicators, automatic malnutrition classification, health-worker dietary guidance) into the registry as a second, equally-weighted pillar. The team has since confirmed the platform will **not** collect nutrition assessment data. The general vulnerability flags below (child, senior, PWD, pregnant/lactating, chronic condition, bedridden) remain — they are household risk factors, not clinical measurements, and were always a separate concern from OPT+-style data collection. The Go Bag checklist (M9/portal) is unaffected and stays in scope. See Section 4.2 and Section 7's M1/M1a notes for exactly what changed. The SDG alignment (Section 12) was updated to match: SDG 2 (Zero Hunger) was the nutrition program's SDG and is no longer a primary alignment; SDG 13, 11, and 3 remain.

The platform is designed to be an SK-fundable, SK-operable project: low cost, youth-run, and directly aligned with the health, active citizenship, and governance thrusts of the Philippine Youth Development Plan.

---

## 1a. Mission & Vision

_Closes OI-10 — see Section 11's Resolved Decisions, D-14. Drafted from the team's concept paper (Introduction, Problem Statement, and Project Rationale sections) rather than left as placeholder prose; still open to PolSci/PubAd wordsmithing before the deck._

**Mission.** To equip Barangay San Jose with a centralized digital platform that shifts disaster management from reactive to proactive — profiling households before disaster strikes, delivering timely hazard information and alerts, and coordinating barangay officials, health workers, and residents so that preparedness, response, and recovery are faster and better informed. This mirrors the shift Republic Act No. 10121 (the Philippine Disaster Risk Reduction and Management Act of 2010) asks every LGU to make, at the barangay level where the river actually rises.

**Vision.** A disaster-resilient Barangay San Jose where community-based, technology-enabled disaster risk reduction protects every resident — especially those most vulnerable to being overlooked — through accessible information, coordinated barangay action, and a registry that never has to be rebuilt from scratch after the water recedes.

---

## 2. Background & Problem Statement

### 2.0 Legal Basis

The Philippines is among the countries most exposed to typhoons, floods, earthquakes, and landslides. **Republic Act No. 10121 (2010)**, the Philippine Disaster Risk Reduction and Management Act, shifted the national approach from reactive disaster response toward proactive risk reduction, preparedness, mitigation, and recovery, and directs LGUs — including barangays — to run community-based disaster risk reduction programs. This project operationalizes that mandate at the barangay level: the modules in Section 7 (registry, alerts, hazard mapping, evacuation, preparedness) are the concrete, digital form of what RA 10121 asks San Jose to already be doing.

### 2.1 Context

| Fact                        | Detail                                                                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Population                  | ~143,031 residents (2024 POPCEN, PSA) — among the most populous barangays in the Philippines                                                                                                               |
| Geography                   | Upper Marikina watershed; storm water from the Montalban and Puray tributaries converges near the barangay                                                                                                 |
| Reference alert system      | Marikina River (Sto. Niño station): 15 m = 1st alarm _(prepare)_, 16 m = 2nd alarm _(evacuate)_, 18 m = 3rd alarm _(forced evacuation)_. Local thresholds for Rodriguez must be confirmed with the MDRRMO. |
| National nutrition backdrop | Child stunting rose to 25.3% in 2025 (DOST-FNRI), the first increase in a decade                                                                                                                           |
| Existing local practice     | Operation Timbang Plus (OPT+) — annual weighing and measuring of children 0–71 months by BHWs and Barangay Nutrition Scholars                                                                              |

### 2.2 Problems to Solve

**P1 — The barangay does not have a usable list of who is vulnerable.**
Records exist on paper and in spreadsheets held by different offices. During an emergency they cannot be searched, sorted, or shared fast enough to be useful.

_Note: the platform improves this for residents who register (Section 4.4). It does not produce a complete list of the barangay, and should never be presented as doing so._

**P2 — Risk information is not visual, so it does not drive decisions.**
Even where data exists, it sits in tables. Officials cannot see at a glance which areas of the barangay concentrate the most at-risk households, so resources are allocated by intuition and by whoever complains loudest.

**P3 — Flood warnings reach residents late and inconsistently.**
River level, rainfall, and hazard information are scattered across national agency sites and social media. There is no single barangay-level channel that translates them into "what does this mean for _my_ area, right now."

**P4 — After a flood begins, accounting for people is manual and slow.**
Families are marked safe by word of mouth. Rescue requests come in as phone calls and Facebook comments that get lost. Evacuation center headcounts are written on paper.

**P5 — Donation drives are uncoordinated.**
Donation requests circulate through social posts that are hard to find, update, or verify. Residents need one official article with current organizer, active dates, requested support, and drop-off instructions; transaction tracking is not part of the revised prototype (D-16).

### 2.3 Consequences of Doing Nothing

Preventable delays in evacuating high-risk households; children and seniors overlooked when assistance is handed out; repeated duplicate data collection that exhausts BHW volunteers; and no evidence base for the barangay to justify budget requests to the municipal or provincial level.

---

## 3. Business Objectives

| #    | Objective                                                                                                                                 | Why it matters                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| BO-1 | Establish one authoritative, continuously updated registry of households and their members, inclusive of those without phones or internet | Everything else depends on this                                                                                                      |
| BO-2 | Turn that registry into a visual, area-level picture of risk and need                                                                     | Makes prioritization defensible instead of political                                                                                 |
| BO-3 | Shorten the time between a rising river and a warned, moving household                                                                    | Directly reduces harm                                                                                                                |
| BO-4 | Account for every **registered** resident during and after an emergency                                                                   | Rescue targeting and post-event reporting. Unregistered residents remain covered by existing manual barangay processes (Section 4.4) |
| BO-5 | Give donation drives one official, current public publishing channel                                                                      | Residents can read the organizer, active dates, requested support, and drop-off instructions without relying on stale social posts   |
| BO-6 | Give the SK a measurable, repeatable youth-led governance project                                                                         | Fundable under the 10% SK share of the barangay general fund; fits the CBYDP                                                         |

---

## 4. Scope

### 4.0 Geographic Scope

**This project covers Barangay San Jose, Rodriguez (Montalban), Rizal — and only that barangay.**

Every requirement, metric, and map area in this document refers to San Jose alone. The platform is operated by the Barangay San Jose LGU and SK for San Jose residents.

Two clarifications this implies:

- **The Municipality of Rodriguez is an external party, not a user.** The MDRRMO appears in this document only as (a) the authoritative source for official river alert thresholds and (b) a recipient of reports the barangay submits upward. Rodriguez's other barangays are out of scope, and no municipal-level console is being built.
- **Areas/zones are San Jose's internal subdivisions** (Area 1, Area 2, …), not barangays. The map divides one barangay into its own areas — it is not a map of Rodriguez.

Because San Jose alone holds roughly 143,000 residents — larger than many entire municipalities — a single-barangay scope is not a small one. Expansion to other barangays is a possible future direction but is deliberately excluded here; no work should be delayed or complicated to accommodate it.

### 4.1 In Scope

A web platform with three faces:

1. **Public information site** — open to anyone, no login. Announcements, weather, hazard map, hotlines, evacuation centers, preparedness guidance, activities, donation drives.
2. **Resident portal** — for registered households. Household and member profiles, alerts, safety check-in, rescue requests, incident reports, go-bag checklist, activities, and notifications. The August 2026 stakeholder revision removed household assistance status from scope (D-16).
3. **Barangay admin console** — for barangay officials, BDRRMC, BHWs, and SK. Registry management, assisted registration, map and facility configuration, alerts, evacuation center operations, donation-drive publishing, activities, analytics.

**August 13, 2026 implementation revision:** the admin console does not expose a generic System
& Setup area. Seeded boundaries remain reference data, and configurable totals/thresholds are
supplied through the deployment environment rather than an officer-facing settings page. The
underlying business needs in BR-1.40, BR-3.3, and BR-10.1a remain; only their maintenance surface
changed.

### 4.2 Out of Scope

All eleven module areas remain represented, but the exclusions below retire specific historical requirements. `frs_nfrs.md` Section 2 is the implementation-level complete list.

- **SMS notifications and physical Siren/IoT alert hardware** (BR-4.10, BR-4.11) — physical hardware and paid SMS gateway contracts documented as future roadmap. Note: A **Visual Siren Simulation, Pin Triggering, and Web Audio API playback feature** is implemented for map and alert demonstration (FR-MAP-014, FR-ALT-012).
- **Clinical nutrition assessment and dietary guidance** (M1a; formerly BR-1.5, BR-1.6's nutrition half, BR-1.12–1.19) — **cut, Aug 2026.** No per-member nutrition indicators, malnutrition classification, or health-worker dietary feedback are collected or generated. The general vulnerability flags (child, senior, PWD, pregnant/lactating, chronic condition, bedridden) remain — see D-15. The Go Bag checklist (M9/portal) is unaffected.
- **Post-registration profile claiming** (M1b) — a resident cannot claim a household record that a BHW created for them. Duplicate detection and manual merge (BR-1.9) cover the gap.
- **Safe routes and blocked roads on the map** (M2) — road closures are communicated as announcements instead (BR-4.1).
- **Donation transactions and household assistance tracking** (M7, D-16) — no donor submission, targets/progress, pledge or receipt status, reference number, payment, distribution schedule, recipient record, or assistance-status portal.
- **Any barangay other than San Jose**, and any municipality-wide or multi-barangay capability
- Native mobile applications (iOS/Android)
- Financial transaction processing or recording — the platform has no payment or donor transaction surface
- Integration with national systems (PhilSys, DSWD Listahanan, PhilHealth)
- Clinical or diagnostic functions of any kind
- Barangay administrative services unrelated to disaster or health (permits, clearances, blotter)
- Operating as an official warning authority — the barangay relays and interprets PAGASA/NDRRMC warnings; it does not replace them

### 4.3 Assumptions

- The barangay LGU will designate staff to operate the console and keep content current.
- BHWs and Barangay Nutrition Scholars will conduct assisted registration as part of existing outreach (e.g., alongside OPT+), not as a new unfunded workload.
- Public weather, hazard, and river data sources remain freely available.
- A prototype is sufficient for the competition; production deployment requires LGU adoption and budget approval.

### 4.4 Registration & Coverage Model

**Registration is opt-in, not a census.** A head of household creates an account to put their family on the barangay's radar before disaster strikes — flagged for priority assistance if they need it, reachable for alerts, accounted for during an emergency. The registry therefore covers _willing participants_, not all ~143,000 residents of San Jose.

Three consequences follow, and the team should be explicit about all three rather than let a judge discover them:

1. **Barangay-wide totals are configured, not counted.** The total number of residents and households _in the barangay_ is a figure an administrator enters from official records. What the platform counts is what it holds — registered households and their members (BR-1.39). Registrations are reported _against_ the configured denominator; the platform never claims to have counted the barangay itself.
2. **Coverage is the honest headline metric.** "1,200 households profiled out of roughly 34,000" is a credible year-one result. "Complete barangay registry" is not, and would not survive scrutiny. _The 34,000 figure is an estimate derived from population and average family size; the actual barangay household count must be sourced from the LGU (OI-12)._
3. **Disaster features operate over registered households only.** Safety check-in, rescue prioritization, and vulnerability flagging apply to families in the registry. For everyone else the barangay's existing manual processes remain in force, unchanged. The platform supplements those processes; it does not replace them.

> **Strategic note for the team.** Self-registration's incentive is personal and immediate — knowing your own household is on the barangay's radar before a flood, not after — while the benefit to the barangay is collective. State it deliberately in the pitch. The corresponding weakness is that coverage grows slowly at first, which is exactly why BHW-assisted registration (BR-1.2) matters so much: it is the only mechanism that reaches households who would never sign up on their own.

---

## 5. Stakeholders & Users

| Stakeholder                                                                                           | Interest                                           | Role in platform                                                                                             |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Residents / households                                                                                | Timely warning, being found, and emergency support | Head registers the household, receives alerts, checks the family in safe, requests rescue, reports incidents |
| Barangay Health Workers & Nutrition Scholars                                                          | Reach families who cannot self-register            | Assisted registration; flag vulnerable members for priority assistance                                       |
| Barangay Captain & Council                                                                            | Evidence for decisions and budget                  | Consume analytics; approve announcements                                                                     |
| BDRRMC                                                                                                | Operational response                               | Issue alerts, manage evacuation centers, dispatch rescue                                                     |
| Sangguniang Kabataan                                                                                  | Deliver and sustain a youth project                | Own the platform; run activities and volunteer programs                                                      |
| MDRRMO (Rodriguez) — _external_                                                                       | Municipal coordination                             | Not a platform user. Source of official alert thresholds; recipient of reports the barangay submits upward   |
| Donors, NGOs, civic groups                                                                            | A current official request for support             | Read donation-drive posts and follow the published contact or drop-off instructions outside the platform     |
| Vulnerable groups — children, seniors, PWDs, pregnant/lactating women, people with chronic conditions | Priority treatment                                 | Flagged for prioritized assistance                                                                           |

### 5.1 User Roles

**Six roles hold accounts**, in two groups — one public-facing, five internal.

| #   | Role                                           | Holds an account? | Access summary                                                                                                                                                                                                 |
| --- | ---------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Public visitor**                             | No                | Public site only. Can also submit a rescue request without registering (BR-5.9)                                                                                                                                |
| 2   | **Head of household**                          | Yes               | Own household record and all member profiles, alerts, safety check-in for the family, incident reports, activities, go-bag progress, and notifications                                                         |
| 3   | **Barangay Health Worker / Nutrition Scholar** | Yes               | Assisted registration — **scoped to assigned area** (BR-1.44)                                                                                                                                                  |
| 4   | **Barangay Admin / BDRRMC**                    | Yes               | Full operational control — alerts, map and facility configuration, evacuation centers, donation-drive publishing, verification, and rescue dispatch. _One role: in this barangay the same people do both jobs_ |
| 5   | **SK Officer**                                 | Yes               | Activities, volunteers, announcements; analytics read-only                                                                                                                                                     |
| 6   | **Super Admin**                                | Yes               | Accounts, roles, system configuration, audit logs                                                                                                                                                              |

> **Pitch-demo constraint (August 16, 2026):** Present exactly two user types — **Resident** and
> **Barangay Admin**. The remaining internal role values support the prototype's authorization
> model but are not separate demo personas, accounts, or screens to present. This does not change
> the production-oriented role model above or remove its server-side guards.

#### Who is _not_ a user type

Worth stating explicitly, because each of these looks like a role and isn't:

- **Household members** — profiled, but hold no account (BR-1.33). An adult member's right to see or correct their record (BR-1.43) is a request handled by the barangay, not a login.
- **Community readers** — view donation-drive articles and use the organizer/contact or drop-off instructions outside the platform. The platform does not accept or track a donation transaction (M7, D-16).
- **Volunteers** — an attribute of an existing resident account, not a separate role. A volunteer is a head of household who has registered their skills (BR-8.4).
- **Unregistered persons in an emergency** — recorded _by_ the barangay (BR-5.10), never logging in themselves.
- **MDRRMO** — external. Receives exported reports; has no access (Section 4.0).

> **Decided:** Barangay Admin and BDRRMC remain a **single role** — in Barangay San Jose the same officials perform both functions, so splitting them would add administrative overhead without reflecting how the barangay actually works. Every action is attributed to the individual officer regardless (BR-4.6, BR-5.8), so accountability does not depend on the role split.

---

## 6. Consolidating the Feature List

The team's brainstorm produced roughly 30 candidate features across the landing page and portal. Many overlap. Grouped by the business need they serve, they collapse into **eleven modules — M0 through M10.** The ten below, plus the public site:

| Module                                | Absorbs from the brainstorm                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 · Community Registry**           | User and household profiling, family members, vulnerable-group flags, medical conditions, contact info, address, geotagging, vulnerability level                                 |
| **M2 · Barangay Zone Map**            | 3D area map, interactive hazard map (public + portal), flood-prone areas, safe zones, facility pins, vulnerability/risk heat layers                                              |
| **M3 · Flood & Weather Watch**        | Weather overview, current weather, hourly forecast, rainfall, river level, storm tracking, heat index, typhoon alerts, flood history & prediction, alert levels 1–3              |
| **M4 · Alerts & Announcements**       | Emergency alerts, flood/earthquake/typhoon warnings, announcement board, class suspensions, road closures, utility interruptions, notifications                                  |
| **M5 · Safety Check-In & Rescue**     | Mark-safe (self and admin-assisted), rescue requests, incident reporting with photo and location                                                                                 |
| **M6 · Evacuation Center Operations** | Center list, capacity, occupancy, supplies, contact person, directions, map preview                                                                                              |
| **M7 · Donation Drive Posts**         | Informational donation-drive articles with organizer/contact, drop-off instructions, active dates, rich content, and image galleries; no donor transaction or assistance tracker |
| **M8 · Activities & Volunteers**      | Seminars, drills, trainings, clean-ups, NGO programs, event reminders, volunteer registration, attendance, skills inventory                                                      |
| **M9 · Preparedness Hub**             | Preparedness tips, before/during/after guides, family emergency plan, go-bag checklist, emergency food guide, FAQs                                                               |
| **M10 · Analytics & Reporting**       | Disaster dashboard, registered residents/households, high-risk families, disaster trends, participation rates, and response times                                                |

Plus **M0 · Public Information Site**, which is the landing page surfacing read-only slices of M2, M3, M4, M6, M7, M8, and M9.

**Recommendation:** the emergency hotline directory and barangay facility registry are configuration data used by M0, M2, and M6 rather than a module of their own. Manage them as **shared reference data** maintained in the admin console.

---

## 7. Business Requirements by Module

Priorities use MoSCoW: **M** = Must have, **S** = Should have, **C** = Could have.

The modules below remain the product map, but individual requirements may be retired by a recorded stakeholder decision. Priority indicates **build order within a module**. The complete active/cut list is maintained in `frs_nfrs.md` Section 2; never infer scope from this introductory sentence alone.

### M1 · Community Registry — _the foundation_

#### The registration model

**One account per household, held by the head of the household. That account manages a profile for every person in it — including children, who cannot register for themselves.**

This resolves the tension that ran through earlier drafts. The objection to households was that the platform cannot verify who lives with whom. That objection is answered not by removing households, but by being precise about what a household record actually claims:

> A household is **the set of people the account holder takes responsibility for profiling.** It is a self-declared group, not a verified statement about who sleeps under one roof. The platform does not attempt to prove cohabitation, and nothing in the system depends on it being provable.

That framing is enough for every use the platform has. Disaster response needs to know that the people in a household are connected, where they are, and which of them need help first — not proof of residency, only a named adult who is accountable for the data and reachable about it.

| ID         | Requirement                                                                                                                                                                                                                | Priority |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.1     | A resident can register as a **head of household** through the public website, creating a household record and their own member profile within it                                                                          | M        |
| BR-1.2     | A BHW can register a household and all its members on the head's behalf, so those without a phone or internet are not excluded                                                                                             | M        |
| BR-1.3     | Address capture uses the official Philippine Standard Geographic Code hierarchy, plus the barangay's own area/zone designation (Area 1, Area 2, …)                                                                         | M        |
| BR-1.4     | A household record carries one address, one area assignment, one named head, and at least one contact number where the household has one                                                                                   | M        |
| BR-1.4a    | A household with no contact number can still register. It is flagged as unreachable by phone, which raises its vulnerability level (M1f, Group C) rather than blocking registration                                        | M        |
| ~~BR-1.5~~ | ~~Each member profile captures health and nutrition indicators for that individual.~~ **Cut, Aug 2026** — the platform does not collect clinical nutrition-assessment data. See the Aug 2026 revision note in Section 1    | —        |
| BR-1.6     | The system automatically classifies the household's overall vulnerability level from the vulnerability flags entered (BR-1.32), without manual scoring. Criteria are defined in **M1f**                                    | M        |
| BR-1.7     | A household can be geotagged to a location on the barangay map                                                                                                                                                             | S        |
| BR-1.8     | The head can update the household record and all member profiles; changes are auditable                                                                                                                                    | S        |
| BR-1.9     | Duplicate household records are detected and flagged, and the barangay can merge them. **Priority raised** — with profile claiming out of scope (M1b), this is now the only defence against the same family existing twice | M        |
| BR-1.10    | The barangay can mark a household record as **verified**. Unverified records still count in the registry and still receive alerts — verification affects reporting confidence, not service                                 | S        |
| BR-1.11    | A household's vulnerability level is visible to the barangay so priority assistance can be targeted — _the stated purpose of profiling: malaman ng barangay kung sino ang dapat bigyan ng priority assistance_             | M        |

##### Barangay-created records

Assisted registration produces records that belong to the barangay and have no account attached. These requirements are core to BR-1.2 and remain in scope.

| ID       | Requirement                                                                                                                                                                                                              | Priority |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-1.20  | A BHW can create a complete household record, with all member profiles, without anyone in it having an account. The record is immediately usable by the barangay for disaster response and priority-assistance targeting | M        |
| BR-1.20a | Every household record has a named head, an assigned area, and a household reference number generated at creation                                                                                                        | M        |
| BR-1.20b | Every barangay-created record retains which health worker created it, and when                                                                                                                                           | M        |

#### M1a · Health Worker Feedback Loop — **out of scope, Aug 2026**

~~The registry is not just a collection point. A family who submits their nutrition data receives something back...~~

This entire module was a health-worker dietary-guidance loop built on top of per-member nutrition classification: a BHW or Nutrition Scholar writes feedback drawn from a resident's recorded nutrition status (optionally AI-drafted, always human-reviewed before publish), sourced from NNC/DOH/DOST-FNRI standards. **Cut along with BR-1.5** — with no nutrition status being recorded, there is nothing for this loop to be written from. `BR-1.12` through `BR-1.19` are withdrawn, not just deferred. This closes OI-11 (automated dietary guidance) as **out**, and removes R-13 (automated dietary guidance is wrong or misapplied) as a live risk.

What the registry still gives back to a household that registers: alerts, priority-assistance targeting for flagged vulnerable members, and visibility during an emergency (Section 4.4). It is no longer a dietary-guidance exchange.

#### M1b · Profile Claiming — **out of scope**

A resident whose household was registered by a BHW cannot later claim that record and take over the account. **Post-registration claiming is not being built.**

The full design — an "I already have a profile" onboarding fork, BHW-issued claim slips with one-time codes, health worker approval, and in-person verification at the barangay hall — was drafted and deliberately cut. It is three verification paths, a physical slip-printing process, and an approval queue: a large amount of machinery for a competition prototype, and none of it is what a judge is evaluating.

**How the two registration routes coexist without it:**

| Route                         | What the resident gets                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Self-registration online**  | A full account: portal access, alerts, safety check-in                                                                |
| **BHW-assisted registration** | A barangay-held record. Counted in the registry, appears on the map, and receives priority in vulnerability targeting |

This is coherent rather than a compromise: the residents a BHW registers are, by definition, the ones without a phone or internet. A login is of no use to them. They are served through the health worker, which is how the barangay reaches them today.

**What this costs, stated plainly:**

- If a BHW-registered head later signs up online, a **duplicate** is created. BR-1.9 is the stopgap — detection plus a manual merge — and its priority has been raised to Must-have because it is now the only defence (R-16).
- A BHW-registered household **cannot see its own record or feedback online**, ever, unless they register separately.
- The barangay carries the merge work manually.

> **Revisit before live deployment.** At prototype scale, manual merging is trivial. At a few thousand households it is not, and claiming becomes necessary rather than optional.

#### M1c · Household Members

The reason the head-of-household model is necessary rather than merely convenient: **Operation Timbang Plus targets children aged 0–71 months, and a three-year-old cannot hold an account.** Seniors, bedridden persons, and PWDs are frequently in the same position. If only self-registering individuals could be profiled, the platform would systematically exclude the people it exists to serve.

| ID      | Requirement                                                                                                                                                                                       | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.31 | The head can add member profiles for the people in their household — children, spouse, parents, relatives, and others in their care                                                               | M        |
| BR-1.32 | Each member profile flags whether the person is a child, senior, PWD, pregnant or lactating, has a chronic medical condition requiring regular medication, or is **bedridden / mobility-limited** | M        |
| BR-1.33 | A member has a full vulnerability profile but no account of their own                                                                                                                             | M        |
| BR-1.34 | Each member's relationship to the head is recorded                                                                                                                                                | S        |
| BR-1.35 | Health worker feedback (M1a) can be written against any member's profile and appears on the head's portal                                                                                         | M        |
| BR-1.36 | A BHW can record all members during a single assisted registration visit, rather than one visit per person                                                                                        | M        |
| BR-1.37 | An adult member can be split out into their own household record later — on marriage, or on moving out — retaining their profile history                                                          | C        |
| BR-1.38 | Household vulnerability is derived from its most vulnerable member, not averaged. One bedridden member makes the household a priority case                                                        | M        |

> **Design principle.** Profiling is collected **once**, per household, and serves disaster response and priority-assistance targeting together. Health workers must never be asked to visit the same family twice to get the same information into two different systems.

#### M1d · Household Counts

| ID      | Requirement                                                                                                                                                                                                                 | Priority |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.39 | The count of **registered** households is derived from the registry — it is simply the number of household records                                                                                                          | M        |
| BR-1.40 | The **barangay-wide total** number of households and residents remains manually configured by an administrator from official barangay figures (BR-10.1a), since registration is opt-in and covers only part of the barangay | M        |

> These two numbers are different things and must never be conflated. The first is what the platform knows; the second is the denominator it is measured against (Section 4.4).

#### M1e · Privacy, Consent & Access Control — _provisional, pending PolSci review_

> **Status: reference note, not agreed requirements — and not blocking the pitch.**
>
> The competition prototype runs on seeded, synthetic data (OI-7). No real resident information is collected, so none of the obligations below are triggered at pitch stage. They apply **only if the barangay adopts the platform for live use.**
>
> The list is kept here so the team has a considered answer if a judge asks — "we have identified the Data Privacy Act obligations and scoped them to deployment" is a stronger response than either ignoring the question or over-promising compliance. The **PolSci lead** can confirm or correct it at leisure (OI-17).

| ID      | Candidate requirement                                                                                                | Priority |
| ------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.41 | Registration captures explicit, recorded consent covering **every member profiled**, not only the head               | M        |
| BR-1.42 | A head can withdraw consent and request deletion of their household record; the barangay must be able to action this | M        |
| BR-1.43 | An adult member can request to see, correct, or be removed from the record they appear in, independently of the head | M        |
| BR-1.44 | A BHW's access is limited to the areas they are assigned to — they cannot browse the whole barangay registry         | M        |
| BR-1.45 | Access to a household's profile data is logged: who viewed which record, and when                                    | S        |
| BR-1.46 | A retention period for inactive records is defined and applied                                                       | S        |

**Questions parked for the PolSci lead — for deployment, not for the pitch:**

- Who is the Personal Information Controller — the barangay LGU, the SK, or both? Determines who carries the obligation; it should not default to the student team.
- Does profiling minors require parental consent beyond what the head already gives?
- Does a barangay of this size need to register a data processing system with the National Privacy Commission?
- Of the six items above, BR-1.43 is the one worth keeping regardless: an adult profiled by a relative who never told them has a right of access, and R-17 has no other mitigation.

#### M1f · Vulnerability Classification

BR-1.6 and BR-1.38 require the system to classify household vulnerability automatically, but did not say from what. This section defines the inputs. **Weights, thresholds, and the scoring formula belong in the functional/technical document** — what follows is the business definition of what counts and why.

The standard DRRM framing applies: a household's risk rises with **who is in it** and **where it is**, and falls with **what it can do for itself.**

##### Group A — Who is in the household _(person factors)_

Carries the most weight. Each is already captured per member (BR-1.32).

| Factor                                          | Why it matters                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Children under 5                                | Cannot self-evacuate; highest mortality in floods                                   |
| Pregnant or lactating women                     | Restricted mobility; medical needs during displacement                              |
| Older persons (60+)                             | Mobility, medication dependence, heat and cold sensitivity                          |
| Persons with disability                         | May require assisted evacuation or specific transport                               |
| Bedridden or mobility-limited persons           | Cannot evacuate without physical assistance — often the single most decisive factor |
| Chronic conditions requiring regular medication | Dialysis, insulin, TB treatment, maintenance drugs — interruption is dangerous      |

##### Group B — Where the household is _(exposure)_

The target classifier derives exposure from area and geotag. The current prototype is not yet
that classifier: it separately captures a map pin and asks a coarse waterway-proximity survey
question (`very_near`, `near`, `far`). The survey powers the August demo charts but must never be
described as a GIS-calculated distance.

| Factor                                     | Why it matters                                                 |
| ------------------------------------------ | -------------------------------------------------------------- |
| Flood hazard classification of the area    | The primary exposure driver                                    |
| Proximity to the river or known flood path | Lead time before water arrives                                 |
| Distance to the nearest evacuation center  | How far they must travel, and how early they must leave        |
| Accessibility to rescue vehicles           | Narrow alleys and unpaved paths change how a rescue is mounted |

##### Group C — What the household can do for itself _(capacity — reduces vulnerability)_

| Factor                                 | Why it matters                                                |
| -------------------------------------- | ------------------------------------------------------------- |
| At least one able-bodied adult present | A household of only children and seniors cannot self-evacuate |
| Reachable by phone                     | Determines whether a warning can reach them at all            |
| Has attended a drill or training       | Recorded via M8 attendance                                    |
| Go-bag prepared                        | Self-reported via M9 checklist                                |

##### Requirements

| ID      | Requirement                                                                                                                                              | Priority |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.47 | Vulnerability is computed from person factors (A), exposure (B), and capacity (C) — never from person factors alone                                      | M        |
| BR-1.48 | The result is a small number of named levels — proposed: **Low · Moderate · High · Priority** — not a raw score shown to users                           | M        |
| BR-1.49 | Classification follows the most-vulnerable-member rule (BR-1.38): one bedridden member places the household at the top tier regardless of other factors  | M        |
| BR-1.50 | The barangay can see **why** a household received its level — which factors contributed — so the classification can be questioned and corrected          | M        |
| BR-1.51 | Barangay staff can manually override a household's level, with a recorded reason. Local knowledge beats a formula                                        | M        |
| BR-1.52 | Vulnerability level is never shown on the public site, and is not disclosed to other residents (BR-0.14)                                                 | M        |
| BR-1.53 | Onboarding captures a self-reported waterway-proximity band alongside the map pin; the UI and analytics label it as survey data, not calculated distance | M        |

> **Deliberately excluded: income, employment, housing material, and tenure status.** These are genuine vulnerability indicators used in formal assessments, and this platform should still not collect them. They are intrusive to ask, hard to verify, slow the registration form down, and risk the platform being perceived as a means-testing exercise rather than a safety tool. The factors above are sufficient to prioritize an evacuation.

> **A caution worth stating.** Labelling families creates real consequences — who gets fetched first, who gets relief. BR-1.50 and BR-1.51 exist because a formula will sometimes be wrong, and the barangay must be able to see the reasoning and overrule it. A classification nobody can question is worse than no classification.

> **Owners.** Groups A, B, and C, and the level definitions, sit with the **PubAd lead** working from the barangay's own DRRM practice (OI-18).

### M2 · Barangay Zone Map

| ID     | Requirement                                                                                                                                             | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-2.1 | A visual map of Barangay San Jose divides the territory into its constituent areas/zones                                                                | M        |
| BR-2.2 | Areas are shaded by aggregated indicators — vulnerable-household density, flood exposure — so the areas needing the most action are immediately obvious | M        |
| BR-2.3 | The map displays hazard layers: flood-prone areas and designated safe zones                                                                             | M        |
| BR-2.4 | The map displays pinned facilities: evacuation centers, hospitals, clinics, barangay hall, police station, fire station, rescue stations                | M        |
| BR-2.5 | Barangay admins can add, edit, remove, and geo-pin facilities without developer assistance                                                              | M        |
| BR-2.6 | A public version of the map is available without login and shows **no personal, household-level, or member-level data** — area-level aggregates only    | M        |
| BR-2.7 | _Removed — safe routes and blocked roads are out of scope. See note below._                                                                             | —        |
| BR-2.8 | Area boundaries are approximations for planning and visualization, clearly labelled as such — not survey-grade cadastral data                           | M        |

> **Safe routes and blocked roads are out of scope.** Both require a road network layer and, worse, someone updating it _during_ an event — precisely when barangay staff have the least capacity to spare. Stale routing information in a flood is actively dangerous: a route shown as safe that is already underwater is worse than showing no route at all.
>
> Road closures are still communicated, just as announcements rather than map geometry (BR-4.1). That is how the barangay does it today, and it carries no risk of the map contradicting reality.

### M3 · Flood & Weather Watch

| ID     | Requirement                                                                                                                                                                     | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-3.1 | Current conditions and short-term forecast are shown for the barangay — temperature, rainfall, precipitation outlook                                                            | M        |
| BR-3.2 | River level readings are displayed and mapped to a three-tier label (1 · Prepare, 2 · Evacuate, 3 · Critical). A Level 3 officer instruction may still order forced evacuation. | M        |
| BR-3.3 | Alert thresholds are configurable by the barangay, so they can be aligned with official MDRRMO/PAGASA values                                                                    | M        |
| BR-3.4 | When an alert level is reached, the platform automatically prompts the BDRRMC to issue a warning to affected areas                                                              | M        |
| BR-3.5 | Historical flood events are recorded — date, level reached, areas affected, households displaced                                                                                | S        |
| BR-3.6 | Forecast-based advance warning is provided where the underlying data supports it                                                                                                | S        |
| BR-3.7 | Heat index and typhoon tracking advisories are surfaced                                                                                                                         | C        |
| BR-3.8 | Data provenance and timestamp are shown on every reading, and stale data is visibly marked                                                                                      | M        |

**Data dependencies (business-level):** open weather data services for forecast and precipitation; UP Project NOAH for hazard mapping and impact simulation; PAGASA telemetered stream and rainfall stations for real-time river data. Availability, licensing, and refresh limits are technical concerns documented separately. _The barangay is a relayer and interpreter of these sources, never the issuing authority._

### M4 · Alerts & Announcements

| ID      | Requirement                                                                                                                                                   | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-4.1  | Barangay admins can publish announcements — emergency notices, class suspensions, road closures, water/power interruptions, general notices                   | M        |
| BR-4.2  | Announcements can be targeted to specific areas or to the whole barangay                                                                                      | M        |
| BR-4.3  | Emergency alerts are visually distinct from routine announcements and appear prominently on the public site and resident portal                               | M        |
| BR-4.4  | Alerts carry a clear instruction, not just information — what the resident should do now                                                                      | M        |
| BR-4.5  | Alert history is retained and publicly viewable                                                                                                               | S        |
| BR-4.6  | Every alert issuance is attributed to the issuing officer and time-stamped                                                                                    | M        |
| BR-4.7  | Alert types are distinguishable: flood warning, earthquake, typhoon update, heavy rainfall, heat index advisory, evacuation announcement                      | M        |
| BR-4.8  | Alerts are delivered as in-platform and website notifications                                                                                                 | M        |
| BR-4.9  | The alert system is designed so additional delivery channels can be added later without redesign — see _Future Integrations_ below                            | S        |
| BR-4.1a | Routine announcements support an excerpt, constrained rich-text body, draft/published/archived lifecycle, and a canonical public article page                 | M        |
| BR-4.1b | A published routine announcement has one cover image and may have up to ten ordered gallery images                                                            | M        |
| BR-4.1c | Emergency alerts retain instruction, area targeting, issuer attribution, and takeover behavior; their banner remains text-first and never depends on an image | M        |

**Future integrations — not developed in this project, in any form:**

| ID      | Capability                                                                                                                        | Status                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-4.10 | **Automatic SMS notifications** to registered residents — reaches people who do not have the site open, and works on basic phones | Not developed — roadmap only                                                                                                                 |
| BR-4.11 | **Siren / IoT alert units** installed across the barangay's areas                                                                 | Physical IoT hardware out of scope; **Visual Siren Simulation & Pin Triggering feature built for map & alert demo** (FR-MAP-014, FR-ALT-012) |

> These are the module's two future infrastructure integrations. The platform-wide cut list in Section 4.2 and stakeholder decision D-16 remain authoritative for other retired scope.
>
> They matter more than anything else in this module for real-world effectiveness, because they are the only channels that reach residents who are offline — which, per Section 4.4, is most of the barangay. Both are excluded on cost and procurement grounds rather than technical ones: SMS requires a paid gateway and per-message cost the SK budget would have to carry indefinitely, and sirens require hardware, installation, and municipal coordination. Neither is something a student team can responsibly commit to.
>
> They belong in the pitch **as roadmap**, because they answer the obvious judge question — _"paano yung walang cellphone?"_ — and because BR-4.9 means the platform is built to accept them without redesign. That is a stronger answer than pretending to have solved it.

### M5 · Safety Check-In & Rescue

| ID      | Requirement                                                                                                                                                                                                                                                                                           | Priority |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-5.1  | During an active emergency, safety status can be set **per member** or **for the whole household at once**, whichever the situation allows                                                                                                                                                            | M        |
| BR-5.1a | Either the head or a barangay admin/BHW can set safety status, for the household or for individual members                                                                                                                                                                                            | M        |
| BR-5.1b | A household-level "all safe" action **lists the members it will cover and requires explicit confirmation.** It is never a single ambiguous tap                                                                                                                                                        | M        |
| BR-5.1c | The dashboard distinguishes members confirmed individually from those covered by a household-level action, so the BDRRMC can see how much confidence a "safe" count carries                                                                                                                           | S        |
| BR-5.1d | Any safety status can be corrected or reverted, by the head or by the barangay                                                                                                                                                                                                                        | M        |
| BR-5.2  | A barangay admin or BHW can mark a resident safe on their behalf — critical for residents already at an evacuation center without a phone or signal                                                                                                                                                   | M        |
| BR-5.3  | A resident can submit a rescue request with their location and a description of the situation                                                                                                                                                                                                         | M        |
| BR-5.4  | Rescue requests are queued and tracked to resolution. Where the requester is a registered household, their vulnerability level informs prioritization; where they are not, the request is triaged on the reported situation alone and is **not** placed below registered requests by default (BR-5.9) | M        |
| BR-5.5  | Admins see a live count of accounted-for vs. unaccounted-for **registered** residents, broken down by area                                                                                                                                                                                            | M        |
| BR-5.6  | Residents can report incidents — flooding, fire, fallen trees, blocked roads, landslides, power outages — with photo and location                                                                                                                                                                     | S        |
| BR-5.7  | Reports and rescue requests can be verified or dismissed by admins to control false reports                                                                                                                                                                                                           | S        |
| BR-5.8  | Every safety status records who set it, when, and how — self, assisted by barangay, or covered by a household-level action                                                                                                                                                                            | M        |

> **Why BR-5.1b and BR-5.1c exist.** Marking the whole household safe in one action is the right default — a mother wading to an evacuation center with four children should not tap through five screens. But families get separated in floods: a father still at work, a child at school. If a bulk action is too easy, a head under stress marks everyone safe and the barangay stops looking for someone who is still missing.
>
> In disaster response an over-reported "safe" is far more dangerous than an under-reported one, because it removes a person from the search list. Listing the members before confirming, and showing the BDRRMC which statuses were individually confirmed, keeps the convenience without the false confidence.

##### Unregistered persons

Added after review: the emergency modules assumed everyone involved is in the registry. In a real flood most people will not be, and a system that cannot record them is a system the BDRRMC will abandon on day one.

| ID      | Requirement                                                                                                                                   | Priority |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-5.9  | **A rescue request can be submitted without an account.** Nobody should have to register during an emergency to ask for help                  | M        |
| BR-5.10 | Admins can record an unregistered person as safe, or as needing rescue, without first creating a full profile — a name and location is enough | M        |
| BR-5.11 | Unregistered persons recorded during an event are counted separately from registered residents, so coverage figures stay honest               | S        |
| BR-5.12 | A record created during an emergency can be converted into a full registration afterwards                                                     | C        |

> **Why this matters.** Requiring registration before rescue would be the single worst design error in this platform. BR-5.9 is a hard requirement, and rescue requests from unregistered persons must not be deprioritized simply because no vulnerability data exists for them.

> **Explicitly not a promise of rescue.** The platform routes requests to the BDRRMC. It must never imply that submitting a request guarantees a response, and must always display official hotlines alongside.

### M6 · Evacuation Center Operations

| ID     | Requirement                                                                                                                | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-6.1 | Admins maintain a list of evacuation centers with address, capacity, and contact person                                    | M        |
| BR-6.2 | Current occupancy is recorded and shown against capacity                                                                   | M        |
| BR-6.3 | Centers appear on the map with directions available to the public                                                          | M        |
| BR-6.4 | Stock levels for food, water, and medicine at each center are tracked                                                      | S        |
| BR-6.5 | Facilities status (comfort rooms, power, water) is recorded                                                                | C        |
| BR-6.6 | Residents checked in at a center are linked to their member record where one exists, feeding the accounted-for count in M5 | S        |
| BR-6.7 | Evacuees with no registry record can be checked in by name, and counted toward occupancy (BR-5.10)                         | M        |

### M7 · Donation Drive Posts

#### The flow

**Barangay or SK drafts an informational post → an authorised officer publishes it → residents read the article and follow its official contact or drop-off instructions outside the platform.** The platform does not accept pledges, create donor records, issue reference numbers, track receipt, calculate progress, hold money, or record household assistance.

| ID                              | Requirement                                                                                                                                                                                       | Priority |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-7.1                          | Admins and SK officers can publish a donation-drive article with title, excerpt, constrained rich-text body, organizer/contact, drop-off instructions, optional emergency event, and active dates | M        |
| BR-7.1a                         | A published post has one cover image and may have up to ten ordered gallery images                                                                                                                | M        |
| BR-7.1b                         | Drafts are private, published posts are public during their active period, and archived posts remain available at their canonical slug                                                            | M        |
| BR-7.1c                         | Public previews link to the full article; all instructions are readable without an account                                                                                                        | M        |
| ~~BR-7.2 / 7.2a / 7.2b~~        | ~~Public donor submission, donor contact capture, and reference number~~ — **retired by D-16**                                                                                                    | —        |
| ~~BR-7.3~~                      | ~~Public target/progress display~~ — **retired by D-16**                                                                                                                                          | —        |
| ~~BR-7.4 / 7.4a / 7.4b / 7.4c~~ | ~~Donation receipt/status workflow, attribution, walk-ins, and donor lookup~~ — **retired by D-16**                                                                                               | —        |
| ~~BR-7.5~~                      | ~~Close a drive when its target is met~~ — **retired; article archival replaces this workflow without reusing the ID**                                                                            | —        |
| ~~BR-7.6 / 7.6a / 7.6b / 7.6c~~ | ~~Distribution schedules and household assistance tracker~~ — **retired by D-16**                                                                                                                 | —        |
| ~~BR-7.7~~                      | ~~No money handled as a standalone workflow~~ — **retired; the stronger rule is that the platform has no donor transaction or payment surface at all**                                            | —        |

> **Scope boundary:** the post may state categories of goods requested in prose and may direct residents to official channels. It does not store item targets, donor identities, quantities pledged or received, donation status, monetary details, recipient households, or distributions.

### M8 · Activities & Volunteers

| ID      | Requirement                                                                                                                                      | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-8.1  | Admins and SK officers can create activities — drills, seminars, first aid training, clean-ups, NGO programs — with date, venue, and description | M        |
| BR-8.2  | Upcoming activities appear on the public site and resident portal                                                                                | M        |
| BR-8.3  | Residents can indicate attendance and receive reminders before the event                                                                         | S        |
| BR-8.4  | Residents can register as volunteers and record their skills                                                                                     | S        |
| BR-8.5  | Attendance is recorded and reportable, supporting SK accomplishment reporting                                                                    | S        |
| BR-8.6  | Volunteers can be assigned to tasks during an emergency                                                                                          | C        |
| BR-8.7  | Training certificates are issued and tracked                                                                                                     | C        |
| BR-8.1a | Activities use an article body with excerpt and draft/published/archived lifecycle while retaining type, schedule, venue, and area               | M        |
| BR-8.1b | A published activity has one cover image and may have up to ten ordered gallery images                                                           | M        |

### M9 · Preparedness Hub

| ID     | Requirement                                                                                                                                                                                                    | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-9.1 | Before/during/after guidance is provided for flood, earthquake, typhoon, fire, and landslide                                                                                                                   | M        |
| BR-9.2 | A go-bag checklist is provided that residents can tick off to track their own readiness                                                                                                                        | M        |
| BR-9.3 | An emergency food guide covers shelf-stable and nutritious options, safe water, storage, and emergency cooking — **authored by the Nutrition & Dietetics lead**, and a distinguishing feature of this platform | M        |
| BR-9.4 | A localized "San Jose Go Bag" reflects local conditions rather than generic national advice                                                                                                                    | S        |
| BR-9.5 | Frequently asked questions are published and maintained                                                                                                                                                        | S        |
| BR-9.6 | Households can draft a family emergency plan                                                                                                                                                                   | C        |
| BR-9.7 | Content is available in Filipino; English optional                                                                                                                                                             | S        |
| BR-9.8 | All guidance is attributed to a recognized source (NDRRMC, DOH, PRC, NNC) and dated                                                                                                                            | M        |

### M10 · Analytics & Reporting

| ID          | Requirement                                                                                                                                                                                      | Priority |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-10.1     | An operations dashboard shows registered residents and households, high-risk and flood-prone households, affected families, active emergencies, and ongoing rescue operations                    | M        |
| BR-10.1a    | **Barangay-wide** population and household totals are **manually configured** by an administrator from official barangay figures, since the registry is opt-in and not a census (Section 4.4)    | M        |
| BR-10.1b    | **Registered** household and member counts are derived from the registry itself (BR-1.39), and always presented against the configured total so coverage is visible rather than implied          | M        |
| ~~BR-10.2~~ | ~~Nutrition status is summarized by area, identifying which areas need intervention first~~ **Cut, Aug 2026** — no nutrition status is recorded (see Section 1's Aug 2026 revision note and M1a) | —        |
| BR-10.3     | Affected-family counts are tracked per event                                                                                                                                                     | M        |
| ~~BR-10.4~~ | ~~Donation drives are reportable per event — what was needed, submitted, and received~~ — **retired by D-16; article posts have no transaction metrics**                                         | —        |
| BR-10.5     | Participation in preparedness activities is reportable                                                                                                                                           | S        |
| BR-10.6     | Emergency response time is measured from request to resolution                                                                                                                                   | C        |
| BR-10.7     | Reports can be exported for submission to the MDRRMO and for SK accomplishment reporting                                                                                                         | S        |
| BR-10.8     | Multi-year trends are retained for planning and budget justification                                                                                                                             | C        |

### M0 · Public Information Site (Landing / Information Page)

The landing page is the barangay's public face and the **only** part of the platform reachable without an account. It is not a separate content system — almost every section is a read-only window onto a module maintained elsewhere in the admin console.

#### M0.1 Page Sections

Listed in the team's intended page order. "Fed by" identifies where the content is actually maintained.

| ID       | Section                    | Content                                                                                                                                                                                                                                                                                                | Fed by                  | Priority |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------- |
| BR-0.1   | **Hero**                   | Platform name, tagline, "Get Started / Login" action, and an always-visible **Emergency Hotline** action                                                                                                                                                                                               | Static + reference data | M        |
| BR-0.2   | **About the Platform**     | What the platform is; mission and vision; why disaster preparedness matters for San Jose; SDG alignment — SDG 13 (Climate Action), SDG 11 (Sustainable Cities and Communities), and SDG 3 (Good Health and Well-being) per Section 12. SDG 2 dropped, Aug 2026 (tracked the now-cut nutrition program) | Static content          | M        |
| BR-0.3   | **Latest Announcements**   | Published article previews newest first with cover imagery; emergency notices remain visually distinct and text-first                                                                                                                                                                                  | M4                      | M        |
| BR-0.3a  | **Announcement Details**   | Preview links open the canonical rich article with ordered gallery, issuer, publication time, and applicable area/instruction metadata                                                                                                                                                                 | M4                      | M        |
| BR-0.4   | **Weather Overview**       | Current conditions, temperature, rainfall, short-term forecast, typhoon alerts. Every reading timestamped and attributed to its source                                                                                                                                                                 | M3                      | M        |
| BR-0.5   | **Preparedness Tips**      | Quick cards: before a flood, earthquake safety, fire safety, typhoon preparedness, **San Jose Go Bag Essentials**. Each card opens the full guide                                                                                                                                                      | M9                      | S        |
| BR-0.6   | **Upcoming Activities**    | Published article previews for seminars, drills, training, clean-ups, and NGO programs, with cover, date, venue, and type                                                                                                                                                                              | M8                      | S        |
| BR-0.6a  | **Activity Details**       | Preview links open the canonical rich article and ordered gallery; attendance and volunteer actions remain separate workflows                                                                                                                                                                          | M8                      | M        |
| BR-0.7   | **Emergency Hotlines**     | Barangay office, police, fire station, ambulance, hospital, rescue team — **one-tap callable on mobile**                                                                                                                                                                                               | Reference data          | M        |
| BR-0.8   | **Evacuation Centers**     | List with address, capacity, and map preview. Live occupancy shown once M6 is built                                                                                                                                                                                                                    | M6                      | M        |
| BR-0.9   | **Interactive Hazard Map** | Public map: flood-prone areas, safe zones, evacuation centers, barangay facilities                                                                                                                                                                                                                     | M2                      | M        |
| BR-0.10  | **Donation Drive Posts**   | Published informational previews with cover, active dates, organizer/contact, and drop-off instructions; no donor submission or progress                                                                                                                                                               | M7                      | S        |
| BR-0.10a | **Donation Drive Details** | Preview links open the canonical rich article and ordered gallery without requiring an account                                                                                                                                                                                                         | M7                      | M        |
| BR-0.11  | **FAQs**                   | How do I register? Where is the nearest evacuation center? How do I report an incident? What should be inside my Go Bag?                                                                                                                                                                               | M9                      | S        |
| BR-0.12  | **Footer**                 | Barangay San Jose information, contact details, social media links, emergency hotline, copyright                                                                                                                                                                                                       | Static + reference data | M        |

#### M0.2 Cross-Cutting Requirements

| ID      | Requirement                                                                                                                                    | Priority |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-0.13 | Every dynamic section pulls live from its module — the barangay updates content in **one** place, never twice                                  | M        |
| BR-0.14 | The page displays **no personal, household-level, or member-level data** at any point. Map and statistics are area-level aggregates only       | M        |
| BR-0.15 | The emergency hotline action is reachable from anywhere on the page without scrolling                                                          | M        |
| BR-0.16 | The page is usable on low-end phones over slow or congested connections                                                                        | M        |
| BR-0.17 | If a dynamic section fails to load — weather feed down, map unavailable — the rest of the page, **and the hotlines in particular**, still work | M        |
| BR-0.18 | When an emergency alert is active, it takes over the top of the page above all other content                                                   | M        |
| BR-0.19 | Primary content is in Filipino, with English as a secondary option                                                                             | S        |
| BR-0.20 | Sections with no current content are hidden rather than shown empty                                                                            | S        |

#### M0.3 Business Notes

**Emergency access beats page order.** The team's layout places hotlines seventh. During an actual flood the hotline is the single most-used element on the page — hence BR-0.15, which keeps it persistently reachable regardless of where it sits in the scroll.

**"Profiling for donations" — retired.** The earlier interpretation was a donor form. D-16 removes the form and every donor record; only an informational donation-drive article remains.

**Twelve sections is a long page.** All twelve get built. Suggested order within the module: Hero, About, Announcements, Weather, Hotlines, Evacuation Centers, Hazard Map, and Footer first — these are structural. Preparedness Tips, Activities, Donations, and FAQs depend on their source modules and on content being written, so they slot in later without changing the page's structure.

---

## 8. Build Order

**All eleven module areas — M0 through M10 — remain represented, but not every historical requirement remains active.** `frs_nfrs.md` Section 2 is the authoritative complete cut list. Physical siren/IoT integration is roadmap-only; the visual siren simulation is a prototype feature.

The sequencing below is therefore a **build order, not a scope cut.** Nothing in a later stage is optional; the ordering exists so that at any point before the deadline there is a coherent, demonstrable system rather than eleven half-finished modules.

### Build order

| Stage                         | Modules                                                                     | Rationale                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Spine**                 | M1 Community Registry · M0 Public Site (shell)                              | Everything else reads from the registry. The public site shell gives every later module somewhere to surface.                                                  |
| **2 · The demo narrative**    | M2 Zone Map · M3 Flood & Weather Watch · M5 Safety Check-In & Rescue        | Completes the story a judge follows in five minutes. If the timeline collapses, this is what must exist.                                                       |
| **3 · Operational depth**     | M4 Alerts & Announcements · M6 Evacuation Centers · M7 Donation Drive Posts | High real-world value; each depends on stages 1–2 being stable.                                                                                                |
| **4 · Sustaining engagement** | M8 Activities & Volunteers · M9 Preparedness Hub · M10 Analytics            | Content- and process-heavy rather than technically hard. M9 in particular is writing work the Nutrition and PubAd members can do in parallel with development. |

### The demonstrable core

If time runs short, **stages 1 and 2** are what must be working:

_A health worker profiles a family in one visit, including the toddler who could never register herself and the bedridden grandmother who needs help evacuating → the household is flagged for priority assistance and appears on the map as part of an at-risk area → the river rises and the area is warned → she checks the whole family in safe, or requests rescue._

Every module in those two stages is either novel or directly demonstrates the core value. Skipping any of them breaks the story.

> **Parallelize what isn't code.** M9's preparedness content, the FAQ, the mission and vision, and the emergency food guide are writing tasks, not development tasks. Assigning them to the non-IT members from day one removes them from the critical path entirely.

---

## 9. Success Metrics

| Objective | Metric                                                                                                                          | Target horizon                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| BO-1      | Households with a verified profile, against the configured barangay total                                                       | 3–5% in year 1 — registration is opt-in (Section 4.4), so coverage grows gradually and the target is set to be defensible rather than impressive |
| BO-1      | % of households captured through BHW-assisted registration                                                                      | ≥ 25% — proves the platform reaches the offline population                                                                                       |
| BO-1      | Registered households in flood-prone areas, as a share of all registered households                                             | Higher than their share of the barangay — shows outreach is targeting risk, not just collecting volume                                           |
| BO-1      | Children under 5 profiled, as a share of all registered members                                                                 | The registry's value is coverage of the vulnerable, not raw headcount                                                                            |
| BO-2      | Areas with a computed vulnerability/risk score                                                                                  | 100% of designated areas                                                                                                                         |
| BO-3      | Time from alert threshold reached to warning published                                                                          | Under 15 minutes                                                                                                                                 |
| BO-4      | % of **registered** residents accounted for within 24 hours of an event                                                         | ≥ 80% — denominator is the registry, not the barangay. Counted per member, not per household, since a family can be separated                    |
| BO-4      | Rescue requests resolved and closed                                                                                             | 100% closed with a recorded outcome                                                                                                              |
| BO-5      | Published donation-drive articles have current active dates, official contact/drop-off instructions, and accessible cover media | 100% of published posts pass the content publication checks                                                                                      |
| BO-6      | Barangay staff able to operate the console without developer help                                                               | Yes, after one training session                                                                                                                  |
| BO-6      | Project adopted into the CBYDP / ABYIP                                                                                          | Within one planning cycle                                                                                                                        |

_These are operational targets for a live deployment. Prototype-stage acceptance is narrower: a working demonstration of the stage 1–2 flow (Section 8) using seeded and simulated data._

---

## 10. Risks & Constraints

| #    | Risk                                                                                                                                                                                 | Impact                                                                              | Mitigation                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1  | **Data privacy.** The registry holds health data on minors and vulnerable persons — sensitive personal information under the Data Privacy Act                                        | High **at deployment**; not triggered at prototype stage, which uses synthetic data | Candidate controls drafted in **M1e** — consent covering all members, withdrawal and deletion, member right of access, area-scoped BHW access, access logging, retention — to be confirmed by the PolSci lead before live use (OI-17). Public views show aggregates only (BR-0.14, BR-2.6)  |
| R-2  | **Registry goes stale.** A registry nobody updates is worse than none, because it is trusted and wrong                                                                               | High                                                                                | Tie updates to existing OPT+ and BHW rounds; show record age; flag stale records                                                                                                                                                                                                            |
| R-3  | **Digital divide.** The residents most at risk are the least likely to be online                                                                                                     | High                                                                                | BHW-assisted registration is a Must-have, not a nice-to-have (BR-1.2); no account needed to request rescue (BR-5.9); admin-side proxy check-in (BR-5.2). **Note: SMS and sirens are not being built (BR-4.10/4.11), so this risk is only partially mitigated and should be stated as such** |
| R-4  | **Connectivity fails exactly when needed.** Power and data drop during the disaster the platform exists for                                                                          | High                                                                                | Design for degraded operation; admin-side proxy check-in; never position the platform as the sole channel                                                                                                                                                                                   |
| R-5  | **External data dependency.** Public weather and hazard feeds may change, rate-limit, or go down                                                                                     | Medium                                                                              | Multiple sources; cache last-known values; display data age; never fail silently                                                                                                                                                                                                            |
| R-6  | **False sense of security.** Residents may treat a green status or an absent alert as an all-clear                                                                                   | High                                                                                | Explicit disclaimers; always show official hotlines; barangay is relayer not authority                                                                                                                                                                                                      |
| R-7  | **LGU adoption.** A platform with no barangay staff behind it is dead on arrival                                                                                                     | High                                                                                | Involve barangay officials during development, not after; keep the console genuinely simple                                                                                                                                                                                                 |
| R-8  | **Scope overrun — now the project's single largest risk.** Eleven modules, five students of whom a minority are IT, one competition timeline, and no module descoped                 | High                                                                                | Build order in Section 8 ensures a coherent demo exists at every point; stages 1–2 are the non-negotiable core; content work (M9, FAQs, mission/vision) assigned to non-IT members in parallel from day one; team should agree a date after which no new features are accepted              |
| R-9  | **Sustainability after the competition.** Team members graduate                                                                                                                      | Medium                                                                              | Institutionalize under the SK with recurring CBYDP/ABYIP funding and documented handover                                                                                                                                                                                                    |
| R-10 | _Retired._ Nutrition indicators are moot — BR-1.5 is cut (Aug 2026); no nutrition data is collected                                                                                  | —                                                                                   | —                                                                                                                                                                                                                                                                                           |
| R-11 | **False rescue reports** during a live emergency waste scarce response capacity                                                                                                      | Medium                                                                              | Admin verification and dismissal (BR-5.7); registered requests carry known identity. **Note: this must not be mitigated by requiring an account — see BR-5.9. Accepting some false reports is the correct trade against turning away real ones**                                            |
| R-12 | **Partial coverage.** Registration is opt-in, so the registry will cover a minority of households — and possibly not the most vulnerable ones, who are least likely to self-register | High                                                                                | BHW-assisted registration targeted at flood-prone areas; report coverage openly (Section 4.4); never present the registry as complete; existing manual barangay processes continue in parallel                                                                                              |
| R-13 | _Retired._ Automated dietary guidance is no longer possible — the whole M1a feedback loop is out of scope (Aug 2026), not just the automated-drafting half                           | —                                                                                   | —                                                                                                                                                                                                                                                                                           |
| R-14 | **No SMS or siren** means every alert channel built reaches only people already online — the opposite of the population most at risk                                                 | Medium                                                                              | Position honestly as roadmap (BR-4.10/4.11); alerting supplements rather than replaces existing barangay warning practice; BR-4.9 keeps the design open so the barangay can add these once funded                                                                                           |
| R-15 | _Retired._ Fraudulent household claiming is no longer possible — claiming is out of scope (M1b). Reinstate this risk if claiming is ever built                                       | —                                                                                   | —                                                                                                                                                                                                                                                                                           |
| R-16 | **Duplicate records.** With claiming out of scope, a BHW-registered head who later signs up online creates a second record — splitting the family's history and inflating counts     | **Raised to High**                                                                  | Duplicate detection and manual merge (BR-1.9, now Must-have) is the only control. Manageable at prototype scale; revisit before live deployment                                                                                                                                             |
| R-17 | **Members added without their knowledge or consent.** The head profiles adult relatives, including their health conditions, and those adults may never know the record exists        | Medium                                                                              | Proposed: consent covering every member (BR-1.41) and an independent right of access for adult members (BR-1.43) — both provisional pending OI-17. BHWs confirm members present during assisted registration; scope of who may be added is OI-14                                            |
| R-18 | **Concentration of harm in one account.** Losing control of a head's account exposes an entire family rather than one person                                                         | Medium                                                                              | Proportionate to the data held; access logging (BR-1.45); barangay can disable an account and re-issue access                                                                                                                                                                               |
| R-19 | **Emergency features exclude the unregistered.** In a real flood most people affected will not be in the registry                                                                    | High                                                                                | No account required to request rescue (BR-5.9); admins can record unregistered persons safe or needing rescue (BR-5.10); evacuation centers accept unregistered evacuees (BR-6.7); counted separately so figures stay honest (BR-5.11)                                                      |

---

## 11. Open Items & Decisions Needed

| #        | Item                                                                                                                                                                                                                                                                                                                   | Owner                                    | Needed by                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| OI-3     | **Official area/zone list and boundaries** to replace the six labelled approximate polygons used by the prototype                                                                                                                                                                                                      | PolSci / PubAd leads, via barangay       | Before any official deployment    |
| OI-4     | **Local river alert thresholds.** The prototype uses the Montalban gauge's published 22.40/23.00/23.60 m values; MDRRMO must confirm the local operational thresholds.                                                                                                                                                 | PubAd lead, via MDRRMO                   | Before any official deployment    |
| OI-5     | **Barangay endorsement.** Whether a letter of support or consultation record can be secured — materially strengthens the pitch                                                                                                                                                                                         | PolSci lead                              | Before submission                 |
| OI-6     | **Consent and privacy notice wording** for registration                                                                                                                                                                                                                                                                | PolSci / PubAd leads                     | Before any real data is collected |
| ~~OI-7~~ | ~~Prototype demo data~~ — **resolved:** the staging seed contains synthetic households, historical events, facilities, alerts, activities, and safety/rescue scenarios                                                                                                                                                 | —                                        | Complete                          |
| OI-8     | **Confirm the build order** in Section 8, and agree a date after which no new features are accepted (R-8)                                                                                                                                                                                                              | Whole team                               | Immediately                       |
| OI-12    | **Official barangay population and household totals** to configure as the analytics denominator (BR-10.1a)                                                                                                                                                                                                             | PubAd lead, via barangay                 | Before demo                       |
| OI-13    | **Coverage narrative for the pitch.** Decide how the team presents opt-in registration — recommended framing in Section 4.4 is that being on the barangay's radar before disaster strikes is the incentive, and collective disaster readiness is the payoff                                                            | Whole team                               | Before deck design                |
| OI-14    | **Who may be added as a household member** (BR-1.31) — confirm the policy before real data; the prototype currently permits adult relatives and still carries the consent risk in R-17                                                                                                                                 | Nutrition & Dietetics lead + PolSci lead | Before real data collection       |
| OI-17    | **Privacy and consent requirements (M1e) — review and confirm.** The section is currently a provisional draft, not agreed requirements. Includes: who is the Personal Information Controller, parental consent for minors, whether NPC registration applies, and whether BR-1.43 (adult member right of access) stands | **PolSci lead**                          | Before any real data is collected |
| OI-18    | **Vulnerability level definitions and factor weighting (M1f)** — confirm the four levels and weighting before the prototype's raw-flag analytics becomes an official classifier                                                                                                                                        | PubAd lead, via BDRRMC                   | Before official classification    |
| ~~OI-19~~ | ~~**Final About/platform and team details** — approve the public platform copy, team names/roles, and any photographs or social links before they are added to `/about`. The existing route must not use invented material.~~ **Resolved Aug 21, 2026:** the project team supplied the approved four-person profiles, roles, biographies, and portraits now used by the landing page and `/about`. | Project owner + content leads | Complete |

### Resolved decisions

Recorded so the team does not relitigate them.

| #    | Decision                                                                                              | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | Registration unit                                                                                     | **Household**, with one account held by the head, managing a profile per member (M1). Children cannot self-register, which makes this necessary rather than merely convenient                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D-2  | Household verification                                                                                | The platform does **not** attempt to prove cohabitation. A household is the set of people the head takes responsibility for profiling (M1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-3  | Household counts                                                                                      | **Registered** counts derived from the registry (BR-1.39); **barangay-wide** totals manually configured (BR-1.40, BR-10.1a)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-4  | Barangay Admin vs BDRRMC                                                                              | **One role.** The same officials perform both functions in this barangay (Section 5.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-5  | Donor accounts                                                                                        | **Not required.** Superseded by D-16: the platform has no donor submission or donor record at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-6  | SMS and sirens                                                                                        | SMS and physical siren/IoT integration are not developed. A local visual/audio siren-pin simulation exists only for the prototype (FR-MAP-014, FR-ALT-012).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-7  | Scope                                                                                                 | Superseded by the maintained cut list in `frs_nfrs.md` Section 2; individual historical requirements may be retired without removing their module area.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D-8  | Donation flow boundary                                                                                | **Superseded by D-16.** The digital flow now ends at publication of an informational post; receipt and assistance are not modelled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D-9  | Safety check-in granularity                                                                           | Per member **or** whole household; either the head or the barangay can set it. Bulk actions must list members and be confirmed (BR-5.1–5.1d)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D-10 | Emergency access                                                                                      | No account required to request rescue (BR-5.9). Unregistered persons can be recorded safe, needing rescue, or checked into a center (BR-5.10, BR-6.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D-11 | Post-registration profile claiming                                                                    | **Out of scope** (M1b). Too much machinery for a pitch prototype. BHW-created records stay barangay-held; duplicates handled by detection and manual merge (BR-1.9). Revisit before live deployment                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D-12 | Safe routes and blocked roads                                                                         | **Out of scope** (M2). Needs a road network layer plus live updating during an event, when staff have least capacity. Road closures are announcements (BR-4.1), not map geometry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D-13 | Platform name and tagline (closes OI-1)                                                               | **`SAGIP-SJ`** — System for Alert, Guidance, Incident Reporting, and Preparedness for Barangay San Jose. Confirmed by the team's own concept paper, which names the platform "SAGIP-SJ" outright in its Expected Outcomes section — the candidate list this row used to carry is superseded, not just narrowed. The codebase (`apps/web/src/lib/brand.ts`, root `README.md`, `AGENTS.md`) already treated this as settled before this document did; this row brings the BRD into agreement rather than deciding anything new                                                                                                                                              |
| D-14 | Mission and vision statements (closes OI-10)                                                          | Drafted from the team's concept paper (Introduction, Problem Statement, and Project Rationale sections) rather than left as placeholder prose. See Section 1a. The substance (RA 10121's proactive-DRRM framing, household-level accountability, SDG 3/11/13) is fixed; the approved About/platform and team material is recorded in the public content source.                                                                                                                                                                                                                                                                 |
| D-15 | Clinical nutrition assessment — **cut** (closes OI-2, OI-11; retires R-10, R-13)                      | The team confirmed the platform will not collect per-member nutrition indicators, automatic malnutrition classification, or health-worker dietary guidance (M1a; BR-1.5's nutrition half; BR-1.12–1.19). Reason: the barangay is not making this resident data available to the project. General vulnerability flags (child, senior, PWD, pregnant/lactating, chronic condition, bedridden — BR-1.32) are unaffected; they were always a household risk-factor list, not a clinical assessment. The Go Bag checklist (M9/portal) and the Emergency Food Guide (BR-9.3, informational content) are also unaffected — neither depends on collecting resident nutrition data |
| D-16 | Donation drives become informational articles; donor transactions and assistance tracking are **cut** | Confirmed with stakeholders on August 11, 2026. The agreed need is a trusted publishing channel, not a logistics ledger; transaction states would imply barangay custody and verification while expanding admin/resident workflows without an agreed operating process. Retires BR-7.2–7.7 and BR-10.4 without reusing their IDs. A post may state requested support in prose and link residents to official contact/drop-off channels, but the platform stores no donor identity, pledge, target quantity, received quantity, status, payment, recipient household, or distribution.                                                                                     |

---

## 12. Alignment & Justification

**Sangguniang Kabataan mandate.** Ten percent of the barangay general fund is set aside for the SK and must be spent on youth development. This project fits the health, active citizenship, governance, and social equity thrusts of the Philippine Youth Development Plan, and is structured to be written into the Comprehensive Barangay Youth Development Plan and its annual investment program.

**Sustainable Development Goals.** SDG 13 (Climate Action), enhancing resilience and adaptive capacity to climate-related hazards through digital innovation; SDG 11 (Sustainable Cities and Communities), promoting inclusive, safe, resilient, and sustainable communities; SDG 3 (Good Health and Well-being), protecting lives through improved preparedness, timely communication, and coordinated emergency response. SDG 2 (Zero Hunger) is no longer a primary alignment — see the Aug 2026 revision note in Section 1.

**Why a youth team is the right proponent.** The barangay does not lack willingness — it lacks capacity to build and run digital tools. That is precisely the gap an SK-led, student-built project fills, and it demonstrates youth participation in governance rather than merely asking for it.

---

## Appendix A — Traceability

| Original team feature                 | Module(s)                                                     |
| ------------------------------------- | ------------------------------------------------------------- |
| 1 · Community Profiling               | M1                                                            |
| 2 · Area map visualization            | M2                                                            |
| 3 · Activities, facilities, hotlines  | M8, shared reference data                                     |
| 4 · Donation-drive posts, hazard map  | M7, M2                                                        |
| 5 · Flood Response Management Mapping | M3, M2                                                        |
| 6 · Flood Safety Marker               | M5                                                            |
| Landing page brainstorm               | M0 — surfacing read-only slices of M2, M3, M4, M6, M7, M8, M9 |

### Portal / Dashboard brainstorm → modules

| #      | Portal feature                                                                                                                 | Module                | Notes                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | User Profiling — area, household, family members, medical conditions, contacts, address, geotagging, vulnerability level       | **M1**                | One account per household held by the head. Feedback M1a · members M1c · counts M1d · privacy M1e · vulnerability criteria M1f. **Claiming (M1b) out of scope** |
| 2      | Disaster Dashboard — households, affected families, high-risk, flood-prone, statistics, active emergencies, rescue operations  | **M10**               | Merged with item 16. Registered counts derived (BR-1.39); barangay-wide totals manually configured (BR-10.1a)                                                   |
| 3      | Emergency Alerts — flood, earthquake, typhoon, rainfall, heat index, evacuation announcements                                  | **M4**                | In-platform and website notifications only; SMS not developed (BR-4.10)                                                                                         |
| 4      | Interactive Hazard Map — flood-prone areas, centers, rescue stations, hospitals, police, fire                                  | **M2**                | Same map as the public one, with admin controls. **Safe routes and blocked roads removed** (D-12) — communicated as announcements instead                       |
| 5      | Weather Monitoring — current, hourly forecast, rainfall intensity, river level, storm tracking, heat index                     | **M3**                |                                                                                                                                                                 |
| 6      | Evacuation Center Dashboard — capacity, occupancy, food, medicine, comfort rooms, contact, directions                          | **M6**                |                                                                                                                                                                 |
| 7      | Emergency Contacts — one-tap calling                                                                                           | Shared reference data | Surfaced in M0, M2, M6                                                                                                                                          |
| 8      | Community Activities — seminars, drills, trainings, tree planting, clean-ups, NGO activities, volunteer schedules, reminders   | **M8**                |                                                                                                                                                                 |
| 9      | Emergency Preparedness Guide — before/during/after for flood, earthquake, typhoon, fire, landslide; family plan; hotline guide | **M9**                |                                                                                                                                                                 |
| 10     | Go Bag Checklist — with per-item tick-off                                                                                      | **M9**                | BR-9.2                                                                                                                                                          |
| 11     | Emergency Food Guide — shelf life, nutritious canned goods, water purification, cooking, storage                               | **M9**                | BR-9.3 — Nutrition & Dietetics lead authors                                                                                                                     |
| 12     | Incident Reporting — flooding, fallen trees, fire, road blockage, landslide, power outage; photo, description, GPS             | **M5**                | BR-5.6; rescue requests accepted without an account (BR-5.9)                                                                                                    |
| ~~13~~ | ~~Assistance Tracker — relief goods, financial assistance, schedules, claimed, pending~~                                       | **Cut**               | Retired by D-16.                                                                                                                                                |
| 14     | Volunteer Management — registration, tasks, attendance, certificates, skills inventory                                         | **M8**                | Still in scope; certificates are lowest priority within the module (BR-8.7).                                                                                    |
| 15     | Barangay Announcement Board — announcements, emergency notices, road/class/power/water interruptions                           | **M4**                | Same engine as the public announcements                                                                                                                         |
| 16     | Analytics Dashboard — residents, households, high-risk families, disaster trends, participation, response time                 | **M10**               | Donation transaction/relief reporting is retired by D-16.                                                                                                       |

### Not being built — the complete list

| Capability                                    | Reference | Status                                                                                                                                   |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic SMS alert notifications             | BR-4.10   | **Not developed.** Roadmap only — requires a paid gateway and ongoing per-message cost                                                   |
| Siren / IoT alert units across barangay areas | BR-4.11   | Physical hardware out of scope; **Visual Siren Simulation & Pin Triggering feature built for map & alert demo** (FR-MAP-014, FR-ALT-012) |
| Post-registration profile claiming            | M1b, D-11 | **Not developed.** Too much machinery for a prototype; duplicates handled by BR-1.9                                                      |
| Safe routes and blocked roads on the map      | M2, D-12  | **Not developed.** Road closures communicated as announcements (BR-4.1)                                                                  |

Everything else in this document is in scope for development.

_Health worker dietary guidance (formerly BR-1.14/BR-1.15, M1a) — **cut, Aug 2026.** The team confirmed the platform will not collect nutrition assessment data, so there is nothing for a health worker to review or draft guidance from. This closed OI-11; it is not an open decision._

## Appendix B — Sources

- [San Jose, Rodriguez, Rizal Profile — PhilAtlas](https://www.philatlas.com/luzon/r04a/rizal/rodriguez/san-jose.html)
- [Vulnerability Assessment of Rodriguez, Rizal towards a Community-Engaged Flood Risk Management System](https://www.researchgate.net/publication/407299446_Vulnerability_Assessment_of_Rodriguez_Rizal_towards_the_development_of_a_Community-Engaged_Flood_Risk_Management_System)
- [PAGASA — Pasig-Marikina-Tullahan Flood Forecasting and Warning System](https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/map.do)
- [Marikina River reaches 3rd alarm, forced evacuation underway — Philippine News Agency](https://www.pna.gov.ph/articles/1229666)
- [Philippines stunting rate rises to 25.3% — Philstar](https://www.philstar.com/headlines/2026/06/19/2536252/philippines-stunting-rate-rises-253-report)
- [Get to know about Operation Timbang Plus — National Nutrition Council](https://nnc.gov.ph/visayas-region/get-to-know-about-operation-timbang-plus/)
- [Implementing Guidelines on Operation Timbang Plus (OPT+) — NNC](https://www.nnc.gov.ph/phocadownloadpap/userupload/elavapie/OPT%20Plus%20Guidelines.pdf)
- [Revised IRR of RA 10742, Sangguniang Kabataan Reform Act of 2015, as amended by RA 11768 — Supreme Court E-Library](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/97375)
