# SAGIP-SJ Annex B — Existing Prototype Baseline

**Document Reference:** `SAGIP-SJ-ANNEX-B-2026-001`  
**Parent Quotation:** `SAGIP-SJ-BQ-2026-001`  
**Prepared for:** Sangguniang Kabataan of Barangay San Jose, Rodriguez, Rizal  
**Prepared by:** SAGIP-SJ Interdisciplinary Student Team  
**Status:** Champion Baseline Complete — Frozen for Barangay Turnover  
**Date:** August 25, 2026  
**Functional Code Baseline:** `cd18d0b54e83` (`cd18d0b54e8357855234319c802e15630f3ba998`)  
**Requirements Snapshot:** FRS/NFRS v1.0 · BRD v1.0  

---

## B.1 Executive Summary & Baseline Boundary

The **SAGIP-SJ** (System for Alert, Guidance, Incident Reporting, and Preparedness) platform achieved **Championship** status in the **SK Project Pitching Competition**.

This document forms **Annex B (Existing Prototype Baseline)** of the Year 1 procurement and turnover pack. It defines the verified, frozen starting baseline of software, architecture, database schemas, and datasets developed by the interdisciplinary student team (PolSci, PubAd, Nutrition & Dietetics, Information Technology).

All active in-scope competition requirements across the platform foundation and eleven functional modules are 100% completed, tested, and demonstrated end-to-end. This baseline serves as the definitive reference point for the Year 1 scope of work, production preparation, staging environment, staff training, and support services.

---

## B.2 Implemented Surfaces & Persona Boundaries

The champion prototype delivers three cohesive web surfaces:

| Surface | Target Users | Functional Capabilities Delivered | Baseline Status |
| --- | --- | --- | --- |
| **Public Information Site** (`/`) | Public residents, visitors, community | Hero, about/mission, emergency hotlines, live weather & forecast, flood history, 3 dedicated public map views, announcements feed, activities, donation-drive posts, preparedness tips (Go Bag), FAQs, public rescue request form, and responsive navigation. | **Complete & Frozen** |
| **Resident Portal** (`/portal`) | Registered Heads of Household | Calm & emergency dashboard, onboarding & member roster management, location pin & waterway proximity survey, hazard overlay context, weather watch, self/household safety check-in, authenticated rescue requests, incident reporting with photo upload, and preparedness guide access. | **Complete & Frozen** |
| **Barangay Portal** (`/admin`) | Barangay Officials, BDRRMC, BHWs, SK | Community registry, citizen directory, duplicate detection & household merge, area-scoped BHW workflows, emergency event lifecycle management, rescue queue triage, safety check-in tracking & accounted-for dashboard, evacuation center occupancy, weather reading entry, hotline directory, facility pins, siren pin visual simulation, announcement/activity/donation CMS, and analytics. | **Complete & Frozen** |

### Presentation Personas
For presentation and pitch clarity, the platform centers on two primary personas:
1. **Resident:** Head of household managing family profiles, submitting safety/rescue, and viewing alerts.
2. **Barangay Admin:** Authorized officer executing emergency operations, triage, registry, and content management.

*(Internal server-side authorization enforces six distinct roles: `public`, `head`, `bhw`, `admin`, `sk`, `superadmin`).*

---

## B.3 Module-by-Module Completion Matrix

All active in-scope prototype requirements are completed and verified in the Championship Baseline:

| Code | Module Area | Active Requirements | Completion | Championship Baseline Status |
| :---: | --- | :---: | :---: | --- |
| `SYS` | **Platform Foundation** | 20 / 20 | **100%** | Complete & Verified (Auth, RBAC, JWT, Audit log, Facility & Hotline registries) |
| `PUB` | **Public Information Site** | 20 / 20 | **100%** | Complete & Verified (12 live landing sections, article slug pages, 3 public maps) |
| `REG` | **Community Registry** | 31 / 31 | **100%** | Complete & Verified (Self/BHW registration, member flags, duplicate merge, area scoping) |
| `MAP` | **Barangay Zone Map** | 16 / 16 | **100%** | Complete & Verified (7 area boundaries, NOAH flood hazard overlay, facility pins, siren simulation, 3D zone view) |
| `WX` | **Flood & Weather Watch** | 17 / 17 | **100%** | Complete & Verified (Open-Meteo & PAGASA ingestion, Montalban FFWS 3-tier river gauge, manual overrides, flood history) |
| `ALT` | **Alerts & Announcements** | 15 / 15 | **100%** | Complete & Verified (Emergency takeover banners, area targeting, Rich CMS, image galleries, audio/visual siren trigger) |
| `SAF` | **Safety Check-In & Rescue** | 24 / 24 | **100%** | Complete & Verified (Per-member & bulk safety, unauthenticated rescue form, triage queue, incident reports with upload, emergency events) |
| `EVC` | **Evacuation Center Operations** | 9 / 9 | **100%** | Complete & Verified (14 evacuation centers, registered/unregistered check-ins, live physical occupancy tracking) |
| `DON` | **Donation Drive Posts** | 4 / 4 | **100%** | Complete & Verified (Informational donation article CMS, active date management, drop-off instructions) |
| `ACT` | **Activities & Volunteers** | 6 / 6 | **100%** | Complete & Verified (Drills, seminars, clean-ups, rich article authoring, public activity feed) |
| `PRP` | **Preparedness Hub** | 9 / 9 | **100%** | Complete & Verified (Bilingual preparedness guides: Flood, Earthquake, Fire, Typhoon, Go Bag Nutrition) |
| `ANL` | **Analytics & Reporting** | 9 / 9 | **100%** | Complete & Verified (Demographic summaries, vulnerability distribution, area risk charts, exportable records) |
| `NFR` | **Non-Functional Baseline** | 82 / 82 | **100%** | Complete & Verified (Responsive at 360px, PostGIS, TypeScript strict, Alembic, failure isolation, strict disclaimers) |

---

## B.4 Technical Architecture Baseline

| Layer | Component | Implementation Specification |
| --- | --- | --- |
| **Web Frontend** | `apps/web` | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI primitives, Lucide icons, Leaflet / React-Leaflet, Three.js WebGL canvas. |
| **API Backend** | `apps/api` | FastAPI (Python 3.12+), Pydantic v2, SQLAlchemy 2.0 (async/sync ORM), GeoAlchemy2, Alembic database migrations. |
| **Database** | `postgres` | PostgreSQL 16 with PostGIS spatial extension; WGS 84 (EPSG:4326) coordinate storage. |
| **Scheduled Jobs** | `services/cron` | Dedicated Python service executing periodic Open-Meteo, PAGASA, river level, and stale-record tasks. |
| **API Contracts** | `packages/api-types` | Automated TypeScript type generation from FastAPI OpenAPI schema via `openapi-typescript`. |
| **Infrastructure** | `infra` | Docker Compose stack orchestrated with Caddy (reverse proxy, automatic TLS/SSL, security headers, file serving). |
| **Datasets** | `dataset/derived` | Committed GeoJSON datasets: clipped Project NOAH 5-yr/25-yr/100-yr flood hazard polygons, 7 barangay area boundaries, and San Jose perimeter. |

---

## B.5 Database Schema & Core Entities Snapshot

The baseline database schema is managed through **22 Alembic migrations** (`0001_initial` through `0022_...`) in PostgreSQL 16 with PostGIS:
- **`households`:** Primary household unit, reference number (`HH-YYYY-XXXX`), area ID, street address, coordinates (`POINT`), waterway proximity, flood height history.
- **`members`:** Individual family members, head relation, vulnerability flags (`is_child`, `is_senior`, `is_pwd`, `is_pregnant`, `is_chronic_illness`, `is_bedridden`), disability type, contact.
- **`emergency_events`:** Official declared disaster events, event type, severity, affected areas, declaration timestamp, closed timestamp, linked flood history record.
- **`safety_checkins`:** Event-specific check-ins per member/household (`Safe`, `Need Assistance`, `Evacuated`), timestamp, reporting channel.
- **`rescue_requests`:** Emergency rescue tickets, contact name, phone, coordinates, persons trapped, medical notes, calculated triage priority (1–5), status lifecycle (`Pending`, `Verified`, `Dispatched`, `Resolved`), resolution notes.
- **`evacuation_centers`:** 14 designated centers, capacity, location point, manager contacts, live occupancy.
- **`evacuation_checkins`:** Evacuee check-ins (registered member ID or unregistered name/count), check-in/out timestamps.
- **`announcements` / `activities` / `donation_drives`:** Content records, Markdown body, cover image, status (`Draft`, `Published`, `Archived`), author ID, active date ranges.
- **`incident_reports`:** Citizen hazard reports, category, description, photo path, location coordinates, status.
- **`audit_logs`:** Immutable audit trail, actor ID, action type, entity name, entity ID, changes JSON, timestamp.

---

## B.6 Known Limitations & Scope Exclusions

1. **Championship Prototype Status:** The platform is presentation-ready and fully demonstrated, but is not represented as an independently security-audited or hardened production system. (Hardening is scheduled under Year 1 Scope of Work, Annex A).
2. **SMS Delivery:** SMS messaging is excluded from this prototype baseline; Annex A incorporates SMS as a required Year 1 production feature upon provider contracting.
3. **Mobile Applications:** Native Android/iOS mobile apps and installable PWAs are excluded from Year 1 and scheduled for the Year 2 roadmap.
4. **Physical IoT / Sirens:** Real hardware sirens and telecommunications IoT devices are excluded; the baseline provides visual and audio Web Audio API map simulations.
5. **Registry Coverage:** Registration is strictly opt-in and covers participating households; it does not constitute a full census of Barangay San Jose.
6. **Warning Authority:** The platform relays and visualizes weather, river, and PAGASA data; it does not replace official national warning authorities or manual barangay emergency procedures.

---

## B.7 Inventory of Turnover Deliverables

The prototype turnover package delivered under Annex D comprises:
1. **Source Code Repository:** Complete Git repository history, branch structure, and build scripts.
2. **Database Migrations:** Alembic migration scripts from baseline `0001` through `0022`.
3. **Seed Data & Fixtures:** 200 synthetic household records, 14 evacuation centers, 7 facility types, seeded emergency events, and historical flood records.
4. **Hazard Datasets:** Committed clipped GeoJSON hazard layers under `dataset/derived/`.
5. **Specification Suite:** Business Requirements Document (BRD v1.0), Functional & Non-Functional Requirements (FRS/NFRS v1.0), System Architecture, Database Schema, Design System Tokens, and Technology Stack documentation.
6. **Container & Deployment Manifests:** Docker Compose files, Dockerfiles, and Caddyfile reverse proxy configuration.

---

## B.8 Formal Acknowledgement

This document forms **Annex B** of the SAGIP-SJ Year 1 Procurement Pack and certifies the completeness of the Championship Prototype Baseline.
