# SAGIP-SJ Annex B — Existing Prototype Baseline Specification & Inventory

**Document Reference:** `SAGIP-SJ-ANNEX-B-2026-001`  
**Parent Quotation:** `SAGIP-SJ-BQ-2026-001`  
**Prepared for:** Sangguniang Kabataan of Barangay San Jose, Rodriguez, Rizal  
**Prepared by:** SAGIP-SJ Interdisciplinary Student Team (PolSci, PubAd, Nutrition & Dietetics, IT)  
**Status:** Approved & Frozen — Official Championship Competition Turnover Baseline  
**Date:** August 25, 2026  
**Functional Code Baseline:** `cd18d0b54e83` (`cd18d0b54e8357855234319c802e15630f3ba998`)  
**Requirements Snapshot:** FRS/NFRS v1.0 · BRD v1.0  

---

## B.1 Executive Summary & Championship Baseline Boundary

The **SAGIP-SJ** (System for Alert, Guidance, Incident Reporting, and Preparedness) platform was awarded **Championship** in the **Sangguniang Kabataan (SK) Project Pitching Competition**. Built by a 5-person interdisciplinary student team across Political Science, Public Administration, Nutrition & Dietetics, and Information Technology, the platform unifies community health profiling, flood hazard mapping, river level monitoring, emergency rescue dispatch, and evacuation management into a single, cohesive digital ecosystem for Barangay San Jose, Rodriguez (Montalban), Rizal.

This document serves as **Annex B (Existing Prototype Baseline)** of the Year 1 procurement and turnover pack. It defines the verified, frozen baseline of software, user interfaces, data models, geospatial hazard layers, and operational workflows completed by the team.

All active in-scope competition requirements across the platform foundation and eleven functional modules are 100% completed, tested, and demonstrated end-to-end. This baseline serves as the definitive reference point for the Year 1 scope of work, production rollout, staging environment setup, staff training, and support services.

---

## B.2 Implemented Surfaces & Practical User Journeys

The champion prototype delivers three cohesive web portals tailored to the everyday needs of residents, healthcare workers, and disaster managers:

### 1. Public Information Site (`/`)
- **Target Audience:** Open to all public residents, visitors, and mobile users without requiring an account.
- **Everyday Purpose:** Acts as the official digital bulletin board and public safety gateway for Barangay San Jose.
- **Key Capabilities:**
  - **Real-Time Weather & River Watch:** Ingests live weather forecasts and displays the Montalban River gauge status.
  - **Interactive Public Hazard Maps:** Panned and zoomed to San Jose with official Project NOAH flood hazard overlays.
  - **Emergency Takeover Banner:** Prominently displays active emergency advisories at the top of every screen.
  - **Public Rescue Request Form:** Allows anyone trapped or in immediate danger to submit an emergency rescue request without logging in.
  - **Community Information:** Verified announcements, disaster preparedness guides, donation drives, and official emergency hotlines.

### 2. Resident Portal (`/portal`)
- **Target Audience:** Registered Heads of Household representing families across Barangay San Jose.
- **Everyday Purpose:** Provides families with an all-in-one disaster readiness and personal safety hub.
- **Key Capabilities:**
  - **Family Household Rosters:** Profile all family members and record critical health vulnerabilities (infants, seniors, PWDs, pregnant women, bedridden).
  - **Household Map Pin & Waterway Survey:** Place home location pins on an interactive map and record nearby creek/river proximity.
  - **Household Risk Overlay:** Private view showing the family's exact home location against official flood hazard return periods.
  - **One-Tap Emergency Safety Check-In:** Confirm whether the whole household or specific members are safe, need assistance, or have evacuated.
  - **Direct Rescue Requests:** Fast emergency dispatch requests automatically linked to the family's pre-registered medical notes and vulnerabilities.
  - **Citizen Incident Reporting:** Submit geotagged reports of rising floodwaters, blocked drainage, or downed utility lines with uploaded photo evidence.
  - **Go Bag Essentials Checklist:** Track family emergency preparation progress against a curated San Jose disaster kit checklist.

### 3. Barangay Administration Portal (`/admin`)
- **Target Audience:** Barangay Captain and Council, BDRRMC disaster responders, Barangay Health Workers (BHWs), and SK officers.
- **Everyday Purpose:** Delivers central operational command, family profiling, rescue coordination, and shelter management.
- **Key Capabilities:**
  - **Community Registry Management:** Authoritative directory of households, family members, and vulnerability indicators across all 7 barangay areas.
  - **BHW Door-to-Door Assisted Entry:** Area-scoped interface allowing BHWs to profile offline or low-income families without smartphones.
  - **Duplicate Detection & Record Merge:** Identifies suspected duplicate household records using smart name and birthdate matching, allowing clean administrative merges.
  - **Emergency Event Declaration & Lifecycles:** Declare, manage concurrent, and officially close disaster events with linked flood history logs.
  - **Vulnerability-Weighted Rescue Queue:** Automatically triages incoming rescue tickets, prioritizing households with bedridden, senior, PWD, or child members.
  - **Live Safety & Accounted-For Dashboard:** Monitors real-time safety check-in status across all 7 barangay zones to pinpoint unconfirmed families.
  - **Evacuation Center Occupancy Tracking:** Live capacity monitors across 14 designated evacuation shelters with registered and walk-in evacuee check-ins.
  - **Official Publishing CMS:** Publish verified emergency alerts, news advisories, donation drive posts, and volunteer activity schedules.
  - **Demographic & Disaster Analytics:** Real-time summary charts and exportable records for BDRRMC resource planning.

---

## B.3 Module-by-Module Completion Matrix

| Code | Module Area | Active Req. | Completion | Championship Baseline Deliverable Summary |
| :---: | --- | :---: | :---: | --- |
| `SYS` | **Platform Foundation & Security** | 20 / 20 | **100%** | Secure login, role-based access, BHW area scoping, immutable audit ledger, emergency hotline and facility directories. |
| `PUB` | **Public Information Site** | 20 / 20 | **100%** | 12 live landing sections, weather & river watch cards, emergency takeover banners, public rescue request forms, responsive design. |
| `REG` | **Community & Household Registry** | 31 / 31 | **100%** | Household unit model, family rosters, 6 vulnerability risk flags, draggable map pins, BHW assisted registration, duplicate detection & merge. |
| `MAP` | **Barangay Zone Map** | 16 / 16 | **100%** | 7 area boundary polygons, Project NOAH 5/25/100-yr flood overlays, facility pins, interactive 3D risk terrain, visual/audio siren simulations. |
| `WX` | **River Level & Flood Watch** | 17 / 17 | **100%** | Automated weather & PAGASA telemetry, Montalban FFWS 3-tier river gauge (Alert/Alarm/Critical), manual overrides, historical flood archives. |
| `ALT` | **Alerts & Announcements** | 15 / 15 | **100%** | Emergency alert publishing with required safety instructions, community news CMS, image galleries, author attribution. |
| `SAF` | **Safety Check-In & Rescue Triage** | 24 / 24 | **100%** | Family safety check-in, anonymous rescue form, automated vulnerability triage, live accounted-for dashboard, photo incident reports. |
| `EVC` | **Evacuation Operations** | 9 / 9 | **100%** | 14 designated evacuation centers, live occupancy tracking, registered/unregistered check-ins, capacity advisory notices. |
| `DON` | **Community Donation Drives** | 4 / 4 | **100%** | Informational publishing for relief drives, verified drop-off points, active date management (excluding financial transactions). |
| `ACT` | **Activities & Volunteer Board** | 6 / 6 | **100%** | Scheduled disaster drills, first aid seminars, clean-ups, resident volunteer skill inventories. |
| `PRP` | **Disaster Preparedness Hub** | 9 / 9 | **100%** | Bilingual emergency guides (Flood, Earthquake, Typhoon, Fire, Nutrition), interactive San Jose Go Bag checklist, community FAQs. |
| `ANL` | **Barangay Analytics & Reports** | 9 / 9 | **100%** | Executive disaster dashboards, demographic aggregations against 143,000 population benchmark, area vulnerability charts. |
| `NFR` | **Non-Functional Baseline** | 82 / 82 | **100%** | Mobile responsive at 360px, PostGIS spatial queries, TypeScript strict mode, Alembic migrations, section failure isolation. |

---

## B.4 Detailed Module Specifications & Practical Capabilities

### Module I: Platform Foundation & Security (SYS)
The platform foundation manages user security, account permissions, area assignments, audit trails, and core directories.
- **User Accounts & Access:** Heads of household register accounts securely; authorized staff log in to the administrative portal with protected sessions.
- **Role-Based Permissions:** Six clear user roles (`public`, `head`, `bhw`, `admin`, `sk`, `superadmin`) ensure users only see data appropriate to their responsibilities.
- **Area-Scoped BHW Workflows:** Barangay Health Workers are assigned specific areas (e.g. Area 1, Area 2) and can manage family records only within their assigned zones.
- **Immutable Audit Trail:** Automatically logs administrative actions (who made the change, what record was altered, before/after values, timestamp) for accountability.
- **Directory Registries:** Centralized management of official emergency hotlines and community facility locations (clinics, barangay halls, evacuation sites).

### Module II: Public Information Site (PUB)
The public website delivers accessible community disaster information without login barriers.
- **12 Live Sections:** Hero banner, emergency hotlines, live weather, river levels, flood history, 3 public maps, announcements, activities, donation drives, Go Bag guide, and FAQs.
- **Emergency Takeover Banner:** When a disaster is declared, an urgent, non-dismissible alert bar appears at the very top of all screens with specific safety instructions.
- **Public Emergency Rescue Form:** A streamlined, large-button form allowing any resident or guest in distress to call for rescue without creating an account.
- **Failure Isolation:** If an external weather feed is temporarily down, the rest of the site remains fully operational.

### Module III: Community & Household Registry (REG)
The registry profiles families and identifies high-risk members before disaster strikes.
- **Household-Centric Model:** One head of household manages the profiles, contact info, and medical details of all family members.
- **Vulnerability Risk Flags:** Captures 6 critical flags per member: Infant/Child (<5), Senior (60+), Person with Disability (PWD), Pregnant/Lactating Mother, Chronic Illness, Bedridden.
- **Interactive Map Pin:** Residents or BHWs drop a pin on a Leaflet map with GPS support to pinpoint the family home.
- **BHW Door-to-Door Assisted Entry:** BHWs can register offline families in a single visit without requiring them to own smartphones or email accounts.
- **Duplicate Detection & Merge:** Automatically detects duplicate household entries using name and birthdate similarity, giving administrators a clean merge interface.

### Module IV: Barangay Zone Map & Hazard Visualization (MAP)
Transforms tabular community statistics into an interactive spatial risk map.
- **7 Barangay Areas:** Displays the official boundaries of Areas 1 through 7 with interactive area selection and demographic summaries.
- **Committed Project NOAH Flood Layers:** Renders official 5-year (Low), 25-year (Medium), and 100-year (High) flood return periods using standard Philippine government yellow/orange/red risk colors.
- **Facility Pins & Navigation:** Pinpoints evacuation centers, medical clinics, and barangay halls with contact details and capacities.
- **Interactive 3D Zone View:** Visualizes extruded 3D terrain highlighting high-risk zones across San Jose.
- **Audio/Visual Siren Simulation:** Demonstrates emergency alert siren pins with expanding soundwave animations and audio tone triggers.

### Module V: River Level & Flood Monitoring (WX)
Monitors the Montalban River water level and provides automated early warning guidance.
- **Automated Weather Feeds:** Ingests live temperature, precipitation, and forecasts every 10 minutes.
- **Montalban FFWS 3-Tier River Gauge:** Maps water height against official thresholds: **Alert (Prepare: 22.40m)**, **Alarm (Evacuate: 23.00m)**, **Critical (Forced Evacuation: 23.60m)**.
- **Manual Reading Override:** Allows disaster officers to manually enter gauge readings if automated feeds are offline.
- **BDRRMC Action Prompts:** Generates internal prompts for disaster officers when thresholds are crossed (never auto-publishing unverified alerts).
- **Historical Flood Archives:** Maintains an official historical log of peak flood events, affected areas, and displaced families.

### Module VI: Alerts & Announcements (ALT)
Official publishing channel for verified barangay communications.
- **Emergency Alert Publisher:** Issues critical disaster alerts with mandatory actionable instructions (e.g. "Move to 2nd floor", "Evacuate to San Jose Gym").
- **Rich News CMS:** Publishes news updates, class suspensions, and community bulletins with formatted text, cover photos, and image galleries.
- **Official Author Attribution:** Stamps all published articles with the issuing officer's name and publication timestamp.

### Module VII: Safety Check-In, Rescue Triage & Incident Reporting (SAF)
The primary life-safety response engine of SAGIP-SJ.
- **Family Safety Check-In:** Heads of household confirm their family's status (`Safe`, `Need Assistance`, `Evacuated`) during declared emergencies.
- **Public Rescue Requests:** Distressed citizens submit location details, trapped persons count, and special medical needs.
- **Vulnerability-Weighted Priority Triage:** Automatically scores incoming rescue tickets (Levels 1 to 5), placing households with bedridden, senior, PWD, or infant members at the top of the response queue.
- **Live Accounted-For Dashboard:** Visualizes the percentage of residents accounted for in real time across all 7 areas, identifying pockets of unconfirmed families.
- **Citizen Hazard Reports:** Residents upload geotagged photos of rising waters, clogged drainage, or road blockages directly to barangay staff.
- **Emergency Event Lifecycles:** Declare, manage concurrent, and formally conclude emergency events with full audit logging.

### Module VIII: Evacuation Center Operations (EVC)
Prevents shelter overcrowding and ensures orderly evacuee tracking.
- **14 Evacuation Centers:** Maintains facility records, maximum capacities, manager contacts, and live occupancy.
- **Real-Time Occupancy Gauges:** Visual progress bars show physical capacity usage (e.g. 75% full, 100% at capacity).
- **Registered & Walk-In Check-Ins:** Check in registered residents (linking their health profile) or unregistered walk-in evacuees.
- **Capacity Advisories:** Alerts staff when a shelter reaches full capacity so arrivals can be redirected to nearby open facilities.

### Modules IX–XII: Community Mobilization, Preparedness & Analytics
- **Donation Drives (DON):** Informational bulletin for relief drives, authorized drop-off points, and needed supply checklists.
- **Community Activities (ACT):** Schedules volunteer drills, first aid seminars, and community clean-ups.
- **Disaster Preparedness Hub (PRP):** Bilingual guides for Flood, Typhoon, Earthquake, Fire, and Nutrition, plus an interactive San Jose Go Bag checklist.
- **Barangay Analytics (ANL):** Executive dashboards showing population coverage, vulnerability distribution, and area hazard comparisons.

---

## B.5 Technical Architecture & Infrastructure Overview

| Layer | Component | Practical Operational Purpose |
| --- | --- | --- |
| **Web Interface** | `apps/web` | High-speed, mobile-responsive web portal built with Next.js 14, providing fast load times on smartphones and desktop computers. |
| **Application Server** | `apps/api` | FastAPI application server enforcing security, processing rescue triage scores, and managing database transactions. |
| **Spatial Database** | `postgres` (PostGIS) | Secure PostgreSQL 16 database with PostGIS spatial extension storing family GPS coordinates, area boundaries, and NOAH flood polygons. |
| **Background Monitor** | `services/cron` | Automated scheduled worker checking Open-Meteo weather and PAGASA river levels every 10 minutes. |
| **Security Proxy** | `infra` (Caddy) | Secure reverse proxy providing automated HTTPS encryption, data protection, and firewall headers. |
| **Committed Datasets** | `dataset/derived` | Official GeoJSON spatial layers: clipped Project NOAH 5/25/100-yr flood polygons and 7 Barangay San Jose area boundaries. |

---

## B.6 Master Data & Entity Dictionary

The baseline database schema is organized across **22 Alembic migrations**, managing 10 core operational records:
1. **Households (`households`):** Unique reference number (`HH-YYYY-XXXX`), assigned area (Area 1–7), street address, GPS point coordinates, waterway proximity, and flood height history.
2. **Family Members (`members`):** Full name, relationship to head, contact info, and 6 vulnerability flags (child, senior, PWD, pregnant, chronic illness, bedridden).
3. **Emergency Events (`emergency_events`):** Declared disaster events, severity level, affected areas, start/end timestamps, and linked flood history.
4. **Safety Check-Ins (`safety_checkins`):** Member safety status (`Safe`, `Need Assistance`, `Evacuated`), reporting channel, and timestamp.
5. **Rescue Requests (`rescue_requests`):** Emergency rescue tickets, contact details, trapped count, medical notes, triage priority score (1–5), and dispatch lifecycle (`Pending` → `Verified` → `Dispatched` → `Resolved`).
6. **Evacuation Centers (`evacuation_centers`):** 14 designated evacuation shelters, capacities, map pins, manager contacts, and live occupancy counts.
7. **Evacuation Check-Ins (`evacuation_checkins`):** Evacuee check-in/out records for registered residents or unregistered walk-in persons.
8. **Announcements & Content (`announcements`):** Official news, emergency alert takeover banners, cover photos, status (`Draft`, `Published`, `Archived`), and author attribution.
9. **Incident Reports (`incident_reports`):** Geotagged citizen reports of local hazards with verified image uploads.
10. **Audit Logs (`audit_logs`):** Permanent ledger recording user ID, action type, entity altered, before/after changes diff, and timestamp.

---

## B.7 Scope Exclusions & Year 1 Roadmap

To ensure total clarity for procurement and turnover, the following boundaries are established:
1. **Championship Prototype Status:** The platform is presentation-ready and demonstrated end-to-end; independent security hardening is scheduled under Year 1 Scope of Work (Annex A).
2. **SMS Alert Notifications:** Direct cellular SMS messaging is excluded from this baseline; Annex A includes SMS gateway integration and prepaid credits under Year 1 production rollout.
3. **Mobile Applications:** Native Android/iOS mobile apps and installable PWAs are excluded from Year 1 and scheduled for the Year 2 roadmap.
4. **Physical IoT / Sirens:** Real physical siren hardware and transmission towers are excluded; the baseline provides visual and audio Web Audio API map simulations.
5. **Opt-In Coverage:** Household registration is opt-in and covers participating families; it does not constitute a full census of San Jose's 143,000 residents.
6. **Advisory Role:** The platform relays official weather, river, and PAGASA data; it assists decision-making but does not replace official national warning authorities.

---

## B.8 Inventory of Turnover Deliverables

The prototype turnover package delivered under Annex D comprises:
1. **Source Code Repository:** Complete Git repository history, branch structure, and automated build scripts.
2. **Database Migrations:** Alembic migration scripts from baseline `0001` through `0022`.
3. **Seed Data & Fixtures:** 200 synthetic household records, 14 evacuation centers, emergency events, and historical flood records.
4. **Hazard Datasets:** Committed clipped GeoJSON hazard layers under `dataset/derived/`.
5. **Specification Suite:** Business Requirements Document (BRD v1.0), Functional & Non-Functional Requirements (FRS/NFRS v1.0), System Architecture, Database Schema, Design System Tokens, and Technology Stack documentation.
6. **Container & Deployment Manifests:** Docker Compose files, Dockerfiles, and Caddyfile reverse proxy configuration.

---

## B.9 Interdisciplinary Team Attribution & Formal Turnover Approval

The SAGIP-SJ platform represents the collaborative output of a 5-member interdisciplinary student team:

| No. | Original Team Member | Degree Program / Academic Domain | Project Responsibility | Signature | Date |
| :---: | --- | --- | --- | :---: | :---: |
| 1 | **Christian Matthew** | Information Technology (IT) | Project Lead & Full-Stack Systems Architecture | ________________ | ____/____/2026 |
| 2 | **Co-Developer / Technical** | Information Technology (IT) | Backend API, Spatial Database & Sensor Ingestion | ________________ | ____/____/2026 |
| 3 | **Public Administration Lead** | Public Administration (PubAd) | LGU Operations, Policy & Disaster Governance | ________________ | ____/____/2026 |
| 4 | **Political Science Lead** | Political Science (PolSci) | Legal Frameworks (RA 10121, RA 10173, SK Reform) | ________________ | ____/____/2026 |
| 5 | **Nutrition & Dietetics Lead** | Nutrition & Dietetics | Community Health Profiling & Evacuation Nutrition | ________________ | ____/____/2026 |

### Formal Turnover Certification

| Execution Field | Developer Signatory | Barangay / SK Signatory |
| --- | --- | --- |
| **Executing Entity** | SAGIP-SJ Interdisciplinary Development Team | Sangguniang Kabataan of Barangay San Jose |
| **Authorized Representative** | **Christian Matthew** | **SK Chairperson** |
| **Designation / Title** | Project Lead & Full-Stack Architect | SK Chairperson / Authorized Signatory |
| **Signature & Date** | ________________________  ____/____/2026 | ________________________  ____/____/2026 |
