# Business Requirements Document

## SAGIP-SJ: Disaster Readiness & Community Health Ecosystem

**Locality:** Barangay San Jose, Rodriguez (Montalban), Rizal  
**Prepared for:** Sangguniang Kabataan of Barangay San Jose (SK Project Pitching Competition — Champion Awardee)  
**Prepared by:** SAGIP-SJ Interdisciplinary Student Team (PolSci, PubAd, Nutrition & Dietetics, Information Technology)  
**Version:** 1.0 · **Date:** August 25, 2026  
**Status:** Approved & Closed — Final Championship Prototype Baseline for Barangay San Jose Turnover (Annex B)  

---

## 1. Executive Summary

The **SAGIP-SJ** (System for Alert, Guidance, Incident Reporting, and Preparedness) is a centralized, integrated community resilience, disaster readiness, and public health platform engineered specifically for **Barangay San Jose, Rodriguez (Montalban), Rizal**. It unifies all resident-facing, emergency operational, and administrative digital services under a single coherent software ecosystem.

The platform serves three primary stakeholder tiers:
1. **Public Guests & Visitors:** Accessing open emergency hotlines, live weather watch, public flood hazard maps, advisories, preparedness guides, and unauthenticated emergency rescue requests.
2. **Authenticated Residents (Heads of Household):** Profiling family members, flagging vulnerable relatives, performing whole-household safety check-ins, tracking local flood risk, submitting authenticated rescue requests, and reporting community hazard incidents.
3. **Barangay Officials, BDRRMC First Responders, and BHWs:** Operating the community registry, executing area-scoped assisted registration, issuing flood warnings, triaging the emergency rescue queue, tracking live evacuation center occupancy, and analyzing spatial vulnerability analytics.

### The Problem Addressed
Barangay San Jose is among the most populous barangays in the Philippines (~143,000 residents) and sits within the Upper Marikina River basin, highly vulnerable to flash floods from the Montalban and Puray tributaries. Before SAGIP-SJ, disaster operations relied on fragmented paper records, unsearchable spreadsheets, and decentralized communication. During typhoons, officials could not quickly identify where bedridden, elderly, or disabled residents were located before floodwaters crested.

### Legal Basis & Mandate
Under **Republic Act No. 10121 (Philippine Disaster Risk Reduction and Management Act of 2010)**, local government units and barangays are mandated to shift from reactive disaster response to proactive risk reduction, mitigation, and community-based preparedness. SAGIP-SJ operationalizes this mandate at the barangay level: the registry, alerts, hazard mapping, evacuation tracking, and preparedness modules represent the concrete digital operationalization of what RA 10121 requires.

### Core Ecosystem Capabilities
- **Centralized Identity & Community Registry:** Household-unit registration allowing heads of household to profile their families and flag vulnerable members, supplemented by area-scoped assisted registration by Barangay Health Workers (BHWs) for offline residents.
- **Geospatial Hazard Visualization:** Interactive Leaflet maps embedding committed Project NOAH 5-year, 25-year, and 100-year flood hazard return periods, 7 barangay area boundaries, facility pins, siren simulations, and an extruded 3D zone risk view.
- **Automated Weather & River Watch:** Telemetry ingestion from Open-Meteo and PAGASA FFWS river gauge stations, mapped to a 3-tier flood alert system (Prepare, Evacuate, Critical).
- **Life-Safety Triage & Response:** Real-time whole-household/per-member safety check-ins, unauthenticated public emergency rescue requests, and automated priority queue sorting elevating households with bedridden or high-vulnerability members.
- **Evacuation Center Operations:** Real-time occupancy tracking across 14 designated evacuation centers, supporting both registered resident and unregistered evacuee check-ins.
- **Community Engagement Hub:** Official announcements with emergency takeover banners, verified donation drive posts, volunteer activity boards, and bilingual disaster preparedness guides.
- **Executive Analytics & Governance:** High-level demographic summaries, vulnerability density heatmaps, and auditable operational logs.

---

## 2. Business Objectives

### 2.1 Primary Objectives
The system aims to:
- **BO-1 · Unify Digital Services:** Consolidate all resident-facing and administrative disaster and health services into one integrated platform, eliminating disjointed channels.
- **BO-2 · Identify Vulnerable Families:** Establish an authoritative digital registry capturing family vulnerability flags (infants, seniors, PWDs, pregnant/lactating, chronic illness, bedridden) before emergencies occur.
- **BO-3 · Spatial Risk Mapping:** Bridge tabular demographic records with spatial hazard layers, visualizing household flood exposure against official Project NOAH hazard maps.
- **BO-4 · Timely Automated Warnings:** Deliver automated weather and river level warnings tied to official Montalban River alert thresholds (Alert, Alarm, Critical).
- **BO-5 · Accelerate Emergency Rescue:** Provide frictionless safety check-in and rescue dispatch mechanisms that prioritize high-vulnerability households.
- **BO-6 · Evacuation Operations:** Track live physical capacity and evacuee headcounts across all 14 barangay evacuation centers in real time.

### 2.2 Secondary Objectives
The system also aims to:
- Provide BHWs with intuitive, area-scoped tools for door-to-door assisted profiling of unconnected families.
- Maintain a verified, single-source publishing channel for official disaster advisories, donation drives, and activities.
- Enforce strict compliance with the **Data Privacy Act of 2012 (RA 10173)**, ensuring zero PII is exposed on public map layers.
- Institutionalize a sustainable, youth-led disaster governance solution funded under the 10% Sangguniang Kabataan share of the barangay general fund.

---

## 3. Project Scope

### 3.1 In-Scope
The platform delivers three unified web surfaces supporting the following operational areas:

| Surface | Target Users | Functional Capabilities Delivered |
| --- | --- | --- |
| **Public Information Site** (`/`) | Public visitors, residents | Landing page, news/announcements, activities, donation drive posts, preparedness guides, live weather & flood history, public hazard maps, emergency hotlines, FAQs, and unauthenticated rescue requests. |
| **Resident Portal** (`/portal`) | Registered Heads of Household | Dashboard, onboarding, family roster management, location geotagging, waterway proximity survey, hazard overlay context, safety check-in, authenticated rescue requests, incident reporting with photo upload, and Go Bag checklist. |
| **Barangay Portal** (`/admin`) | Barangay Officials, BDRRMC, BHWs, SK | Community registry, citizen directory, duplicate detection & merge, area-scoped BHW workflows, emergency event declarations, rescue queue triage, evacuation occupancy tracking, siren simulation, CMS authoring, and analytics. |

### 3.2 Out of Scope
The system shall **NOT**:
- Operate physical siren/IoT hardware or telecommunications transmission hardware (visual/audio Web Audio API simulation is provided in scope).
- Deliver native iOS or Android mobile applications in Year 1 (deferred to Year 2 roadmap).
- Process monetary transactions, bank payments, or financial donation ledgers (donation drives are informational publishing posts only).
- Conduct clinical or diagnostic nutrition assessments (vulnerability risk flags are captured, clinical OPT+ measurements are excluded).
- Provide post-registration account claiming for BHW-created records (handled via duplicate detection and manual merge).
- Deploy or operate in any barangay outside Barangay San Jose, Rodriguez, Rizal.
- Replace sovereign warning authorities or manual emergency operating procedures.

---

## 4. System Overview & Process Flows (TO-BE)

### 4.1 Public (Unauthenticated) Flow
1. Visitor accesses the public portal and views live weather telemetry, river levels, and emergency hotlines.
2. Visitor checks the interactive public hazard map for area flood risks and nearby evacuation centers.
3. Visitor browses official announcements, community activities, donation drives, and preparedness guides.
4. During an active emergency, visitor sees a sticky, non-dismissible Emergency Alert takeover banner.
5. In a life-threatening crisis, an unregistered resident submits a public rescue request and receives emergency hotline fallbacks without logging in.

### 4.2 Resident (Authenticated Head of Household) Flow
6. Head of household registers an account and completes onboarding (address, area selection, map coordinate pin).
7. Head adds family members and flags specific vulnerabilities (child, senior, PWD, pregnant, chronic condition, bedridden).
8. Head views their dashboard displaying household flood hazard risk, weather watch, and family Go Bag progress.
9. During an emergency, head performs a single-tap safety check-in for the entire household or marks individual members.
10. If endangered, head submits an authenticated rescue request, automatically linking their profile and vulnerability score to the queue.
11. Head submits geotagged incident reports with photographic evidence directly to the barangay.

### 4.3 Barangay Health Worker (BHW) Flow
12. BHW logs into the Barangay Portal with area-scoped credentials.
13. BHW conducts door-to-door visits and registers offline families in a single pass without requiring them to have accounts.
14. System generates a unique Household Reference Number and runs automated duplicate detection.
15. BHW flags high-vulnerability members, ensuring they appear on the priority evacuation list.

### 4.4 Emergency Response & BDRRMC Flow
16. Ingestion cron jobs detect river level or weather threshold breaches and prompt BDRRMC officers.
17. Administrator declares an official Emergency Event and issues an Emergency Alert with actionable instructions.
18. Administrator monitors the live Safety & Accounted-For Dashboard across all 7 barangay areas.
19. Rescue dispatchers manage the Rescue Queue, prioritized by automated household vulnerability scores.
20. Evacuation center managers check in evacuees, monitoring physical occupancy against maximum capacity.
21. When conditions normalize, Administrator ends the Emergency Event, archiving operational logs.

---

## 5. System Module Specifications

### Module I: Platform Foundation & Ecosystem (SYS)
The Platform Foundation module provides core authentication, role-based access control, security infrastructure, reference datasets, and shared administrative registries.

**Submodules:**
- User Authentication & Session Management (JWT, Refresh Cookies)
- Role-Based Access Control (RBAC) & Area Scoping
- Audit Logging & Activity Tracking
- Reference Data (Areas, Hotlines, Facilities)

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Account Registration** | The system shall allow heads of household to register with email and secure password, creating an active account immediately. |
| **Session Management** | The system shall issue short-lived JWT access tokens with secure httpOnly refresh cookies for persistent sessions. |
| **Role-Based Access** | The system shall enforce six distinct user roles (`public`, `head`, `bhw`, `admin`, `sk`, `superadmin`) with server-side guards. |
| **BHW Area Scoping** | The system shall restrict BHW data access to their assigned barangay areas, returning 403 Forbidden for cross-area requests. |
| **Audit Logging** | The system shall record an immutable audit log of all state-changing actions, capturing actor, action, timestamp, and target. |
| **Emergency Hotlines** | The system shall provide an administrative CRUD interface for emergency hotlines, rendered across all public and portal views. |
| **Facility Registry** | The system shall maintain geotagged records of evacuation centers, clinics, and government halls with coordinate pins. |
| **Rate Limiting** | The system shall enforce IP-based rate limiting on sensitive authentication and rescue endpoints to prevent abuse. |

#### Validation Rules
| Rule ID | Validation Rule |
| --- | --- |
| `VR-SYS-01` | User email addresses must be unique across the platform; duplicate registration returns 409 Conflict. |
| `VR-SYS-02` | Passwords must be at least 8 characters in length and hashed using bcrypt before storage. |
| `VR-SYS-03` | Protected API endpoints must validate JWT claims server-side; UI element hiding alone is prohibited. |
| `VR-SYS-04` | BHW accounts must be assigned to at least one valid barangay area before accessing the registry. |

#### Acceptance Criteria
| ID | Acceptance Criteria |
| --- | --- |
| `AC-SYS-01` | Given a new resident enters valid credentials, When registration is submitted, Then the system creates an active account and issues JWT credentials. |
| `AC-SYS-02` | Given an authenticated BHW attempts to access a household in an unassigned area, When evaluated, Then the system denies access with 403 Forbidden. |
| `AC-SYS-03` | Given an administrative state-change occurs, When the database write commits, Then an immutable audit log entry is permanently recorded. |

---

### Module II: Public Information Site (PUB)
The Public Information Site delivers real-time disaster information, weather telemetry, interactive hazard maps, announcements, emergency guides, and public rescue dispatches without requiring a login.

**Submodules:**
- Public Landing Page & Dynamic Feed Integration
- Interactive Public Map Embeds (Landing Preview, Dedicated Hazard Map, Facilities Map)
- Emergency Alert Takeover Banner
- Public Rescue Request Entry Point

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Hero & Hotlines** | The system shall display the platform mission, live emergency hotlines with one-tap dialing, and primary action buttons. |
| **Live Announcement Feed** | The system shall render published announcements, news, and emergency advisories newest-first directly from the database. |
| **Weather Overview** | The system shall display current temperature, rainfall, and weather forecasts with timestamps and data source attribution. |
| **Public Hazard Map** | The system shall embed an interactive Leaflet hazard map showing flood zones, safe areas, and pinned evacuation facilities. |
| **Emergency Takeover** | The system shall render active emergency alerts at the top of the viewport in a sticky, non-dismissible banner. |
| **Failure Isolation** | The system shall ensure that a failure in a dynamic section (e.g., weather feed) degrades gracefully without breaking the page. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-PUB-01` | Public information pages must never render personal or household-level data; only area-level aggregates are permitted. |
| `AC-PUB-01` | Given an unauthenticated visitor visits the landing page, When loaded, Then all 12 public sections render with live data. |
| `AC-PUB-02` | Given an active emergency alert is published, When any user visits the site, Then the emergency takeover banner renders prominently. |

---

### Module III: Community Registry & Household Profiling (REG)
The Community Registry manages household units, family rosters, priority vulnerability flags, duplicate detection, and BHW assisted registration.

**Submodules:**
- Self-Registration & Onboarding Workflow
- BHW-Assisted Door-to-Door Registration
- Family Roster & Vulnerability Classification
- Duplicate Detection & Household Merge Engine

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Household Unit Model** | The system shall structure registrations around the household unit, with one account held by the head managing all member profiles. |
| **BHW-Assisted Entry** | The system shall allow BHWs to create complete household records with member flags in a single visit without requiring resident logins. |
| **Vulnerability Flags** | The system shall capture specific risk flags per member: Child (<5), Senior (60+), PWD, Pregnant/Lactating, Chronic Illness, Bedridden. |
| **Geotagged Coordinates** | The system shall allow placement of household location pins via interactive draggable Leaflet map with GPS support. |
| **Duplicate Detection** | The system shall evaluate incoming records using trigram name similarity and birthdate matching to flag suspected duplicates. |
| **Household Merge** | The system shall enable authorized administrators to merge duplicate records, re-parenting members and preserving audit trails. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-REG-01` | Every household record must be assigned to one of the 7 designated barangay areas (Area 1 through Area 7). |
| `VR-REG-02` | A household record must have exactly one designated Head of Household at all times. |
| `AC-REG-01` | Given a resident completes onboarding, When details are submitted, Then the record is saved with unique reference number and coordinates. |
| `AC-REG-02` | Given two duplicate records exist, When the admin executes a merge, Then the winner retains all members and the loser is archived. |

---

### Module IV: Barangay Zone Map & Hazard Visualization (MAP)
The Barangay Zone Map delivers geospatial situational awareness, combining committed Project NOAH flood hazard layers, 7 area boundary polygons, facility pins, and interactive 3D risk representations.

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Area Polygon Shading** | The system shall render the 7 barangay areas with interactive selection and risk indicator shading. |
| **Project NOAH Flood Layers** | The system shall display committed 5-yr, 25-yr, and 100-yr flood hazard polygons with standard government yellow/orange/red styling. |
| **Facility Panning & Pins** | The system shall render evacuation centers, medical clinics, and barangay halls with distinct icons and interactive popups. |
| **3D Zone Visualization** | The system shall provide an interactive Three.js WebGL canvas visualizing extruded area polygons colored by risk level. |
| **Siren Visual Simulation** | The system shall render alert siren pin locations with expanding radial soundwave animations and Web Audio API alarm sounds upon trigger. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-MAP-01` | Public hazard maps must use client-side GeoJSON datasets without transmitting individual resident pins to public viewports. |
| `AC-MAP-01` | Given a user selects a flood layer (5/25/100-yr), When toggled, Then the map updates fill overlays smoothly with standard hazard colors. |
| `AC-MAP-02` | Given an admin triggers a siren pin, When clicked, Then the map animates radial soundwaves and synthesizes an alarm tone. |

---

### Module V: Flood & Weather Watch (WX)
The Flood & Weather Watch module ingests meteorological data, tracks Montalban River water levels against 3-tier threshold alarms, and maintains an official historical record of flood events.

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Automated Ingestion** | The system shall run scheduled cron tasks to fetch Open-Meteo forecasts and PAGASA telemetry every 10 minutes. |
| **3-Tier River Gauge** | The system shall map river water levels to Alert (Prepare), Alarm (Evacuate), and Critical (Forced Evacuation) tiers. |
| **Manual Override** | The system shall allow administrators to manually input river levels during automated sensor outages. |
| **BDRRMC Threshold Prompts** | The system shall generate action prompts for disaster officers when an alarm threshold is crossed (never auto-publishing public alerts). |
| **Flood Event History** | The system shall maintain historical flood records with peak levels reached, areas affected, and displacement metrics. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-WX-01` | Crossing a river threshold must prompt authorized officers; automated public publishing without human approval is strictly prohibited. |
| `AC-WX-01` | Given an automated water level fetch reaches 23.00m, When evaluated, Then the system flags an 'Alarm (Evacuate)' prompt in the admin console. |

---

### Module VI: Alerts & Announcements (ALT)
The Alerts & Announcements module provides authorized officers with a structured publication pipeline for emergency alerts, routine news, class suspensions, and utility notices.

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Emergency Alert Publishing** | The system shall enable administrators to issue urgent alerts with mandatory actionable instructions and area targeting. |
| **Announcement CMS** | The system shall support rich-text article authoring, excerpt generation, cover image selection, and ordered image galleries. |
| **Publication Lifecycle** | The system shall manage article states (`Draft`, `Published`, `Archived`) with automated date validity checking. |
| **Author Attribution** | The system shall record and display the issuing officer's identity and timestamp on all announcements. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-ALT-01` | An emergency alert cannot be published without a non-empty Actionable Instruction field. |
| `AC-ALT-01` | Given an emergency alert is published, When submitted, Then the public landing page immediately displays the alert banner above all content. |

---

### Module VII: Safety Check-In, Rescue & Incident Response (SAF)
The Safety Check-In & Rescue module provides the life-safety response core of SAGIP-SJ, managing family safety check-ins, unauthenticated emergency rescue dispatches, triage queue prioritization, and citizen incident reporting.

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Safety Check-In** | The system shall allow household heads to mark individual members or their entire family safe during declared emergencies. |
| **Anonymous Rescue Request** | The system shall provide an unauthenticated public rescue form with large tap targets and zero login friction. |
| **Vulnerability-Weighted Triage** | The system shall dynamically prioritize rescue requests, elevating households containing bedridden, senior, PWD, or infant members. |
| **Accounted-For Dashboard** | The system shall calculate live accounted-for vs. unaccounted resident ratios across all 7 barangay areas. |
| **Incident Reporting** | The system shall allow residents to submit geotagged incident reports with photo uploads validated via magic bytes. |
| **Emergency Event Lifecycle** | The system shall enable administrators to declare, manage concurrent, and end emergency events with full audit retention. |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-SAF-01` | Unauthenticated rescue requests must be accepted without blocking on user accounts or database reads. |
| `VR-SAF-02` | Unregistered rescue requests must never be deprioritized simply for lacking pre-existing registration data. |
| `AC-SAF-01` | Given a user submits a public rescue request, When submitted, Then the system returns an acknowledgement ID and displays hotlines. |
| `AC-SAF-02` | Given a rescue request matches a household with a bedridden senior, When sorted, Then it is assigned Priority Level 5 (top of queue). |

---

### Module VIII: Evacuation Center Operations (EVC)
The Evacuation Center Operations module tracks physical capacity, manages resident and unregistered evacuee check-ins, and prevents overcrowding across 14 designated facilities.

#### Features and Functionalities
| Feature | Description |
| --- | --- |
| **Evacuation Center Registry** | The system shall maintain records for 14 evacuation centers, including capacity, manager contacts, and map pins. |
| **Live Occupancy Tracking** | The system shall calculate current physical occupancy in real time based on active check-in records. |
| **Registered Evacuee Check-In** | The system shall allow staff to check in registered residents by linking to their member profile, feeding safety accounting. |
| **Unregistered Evacuee Entry** | The system shall allow checking in non-registered residents with basic name and support needs, counting toward occupancy. |
| **Capacity Advisory Alert** | The system shall visibly alert administrators when a facility reaches or exceeds 100% capacity (advisory, never rejecting arrivals). |

#### Validation Rules & Acceptance Criteria
| ID | Rule / Acceptance Criteria |
| --- | --- |
| `VR-EVC-01` | A person may have at most one active physical evacuation check-in across all facilities at any time. |
| `AC-EVC-01` | Given an evacuee is checked in, When saved, Then the center's live occupancy increments and the occupancy gauge updates immediately. |

---

### Modules IX–XII: Remaining Community & Analytics Modules
- **Module IX: Donation Drive Publishing (DON):** Informational publishing CMS for humanitarian aid drives with organizer details, active dates, and drop-off instructions (financial transactions excluded).
- **Module X: Activities & Volunteer Coordination (ACT):** Management of scheduled disaster drills, first aid seminars, clean-ups, and volunteer skills inventories.
- **Module XI: Preparedness Hub & Guides (PRP):** Bilingual emergency guidance, San Jose Go Bag essentials checklist, and community FAQs.
- **Module XII: Analytics & Demographics (ANL):** Executive dashboards, demographic aggregations against barangay benchmarks, vulnerability distribution heatmaps, and post-disaster reports.

---

## 6. Development Approach & Build Order

The SAGIP-SJ platform followed a structured 4-stage build order to establish a coherent, verifiable ecosystem for the competition:

| Stage | Modules Included | Operational Rationale |
| --- | --- | --- |
| **Stage 1 · Spine** | M1 Community Registry · M0 Public Site (shell) · Platform Foundation | Established the core data structures, user authentication, and landing page foundation. |
| **Stage 2 · Demo Narrative** | M2 Zone Map · M3 Flood & Weather Watch · M5 Safety Check-In & Rescue | Delivered the core flood response narrative: river telemetry → hazard map → alert → safety check-in / rescue dispatch. |
| **Stage 3 · Operational Depth** | M4 Alerts & Announcements · M6 Evacuation Centers · M7 Donation Drives | Added full disaster operations capabilities, facility occupancy tracking, and verified article publishing. |
| **Stage 4 · Sustaining Engagement** | M8 Activities & Volunteers · M9 Preparedness Hub · M10 Analytics | Completed community engagement tools, bilingual preparedness guides, Go Bag tracker, and demographic analytics. |

---

## 7. Assumptions and Constraints

### 7.1 Assumptions
- Barangay San Jose LGU assigns trained personnel and BHWs to operate the admin console and conduct assisted registration.
- Public weather, river telemetry, and Project NOAH spatial hazard feeds remain accessible without licensing fees.
- Households in flood-prone areas participate in opt-in registration to receive targeted emergency assistance.

### 7.2 Constraints
- Registration is opt-in and does not represent a full census of Barangay San Jose's 143,000 residents.
- Web-based rescue requests depend on cellular data connectivity; manual hotlines operate in parallel.
- The platform visualizes and relays official flood and weather data; it does not generate sovereign meteorological forecasts.

---

## 8. Success Criteria & Metrics

| Objective | Operational Target | Impact & Justification |
| --- | --- | --- |
| **BO-1: Registry Coverage** | 3–5% of barangay households profiled in Year 1; ≥25% captured via BHW door-to-door outreach. | Demonstrates outreach to offline and vulnerable populations. |
| **BO-2: Risk Visualization** | 100% of the 7 barangay areas have computed vulnerability and hazard density metrics. | Ensures defensible, objective resource allocation. |
| **BO-3: Warning Speed** | Time from alert threshold breach to public announcement issuance under 15 minutes. | Directly reduces flood damage and evacuation delays. |
| **BO-4: Emergency Accounting** | ≥80% of registered residents in affected zones accounted for within 24 hours of an event. | Enables focused rescue targeting for unaccounted families. |
| **BO-5: Public Communication** | 100% of published donation and activity articles pass verification and active-date checks. | Eliminates stale or unverified social media donation posts. |
| **BO-6: SK Governance** | Barangay staff operate the console independently after one structured training session. | Ensures long-term project sustainability under the SK. |

---

## 9. Resolved Decisions Register

| # | Decision Item | Settled Resolution |
| --- | --- | --- |
| `D-1` | **Registration Unit** | Household unit with one account held by the head, managing individual member profiles. |
| `D-6` | **SMS & Sirens** | Physical hardware sirens and SMS contracts excluded from baseline; visual/audio simulation provided in prototype. |
| `D-11` | **Profile Claiming** | Post-registration claiming cut; duplicate detection and manual merge implemented instead. |
| `D-13` | **Platform Name** | Formally confirmed as SAGIP-SJ (System for Alert, Guidance, Incident Reporting, and Preparedness). |
| `D-14` | **Mission & Vision** | Adopted proactive disaster risk reduction framing aligned with Republic Act No. 10121. |
| `D-15` | **Nutrition Descope** | Clinical nutrition assessment cut; general household vulnerability flags retained. |
| `D-16` | **Donation Scope** | Donation drives converted to informational publishing posts; financial transaction ledgers excluded. |
| `D-17` | **Presentation Personas** | Two primary demonstration personas: Resident (Head of Household) and Barangay Admin. |
| `D-18` | **Area Boundaries** | Seeded 7 barangay area boundary polygons deployed in PostGIS with approximate disclaimer. |
| `D-19` | **River Thresholds** | Configured Montalban FFWS gauge thresholds (22.40m Alert, 23.00m Alarm, 23.60m Critical). |
| `D-20` | **Championship Freeze** | SAGIP-SJ awarded Championship; complete prototype ecosystem frozen as Annex B for turnover. |
| `D-21` | **Privacy Baseline** | Privacy controls enforced: zero PII on public maps, area scoping for BHWs, and consent capture on onboarding. |
| `D-22` | **Prototype Completion** | All Stages 1–4 completed; all 11 prototype modules operational and demonstrated end-to-end. |
| `D-23` | **Population Analytics** | Configured barangay benchmark (~143,000 population) separated from registered opt-in registry counts. |
| `D-24` | **Household Membership** | Head of household manages family roster; members do not hold individual logins. |
| `D-25` | **Triage Prioritization** | Triage priority is calculated from member vulnerability flags with highest weight on bedridden members. |

---

## 10. Legal & Policy Alignment

SAGIP-SJ is structured in strict compliance with Philippine legal and youth development frameworks:
- **Republic Act No. 10121 (Philippine DRRM Act of 2010):** Operationalizes community-based disaster preparedness, mitigation, and response at the barangay level.
- **Republic Act No. 10173 (Data Privacy Act of 2012):** Enforces strict role-based access, consent capture, and zero PII exposure on public surfaces.
- **Republic Act No. 10742 (Sangguniang Kabataan Reform Act):** Supports youth-led health, active citizenship, and disaster governance programs funded under the 10% SK share.
- **UN Sustainable Development Goals:** Aligns directly with SDG 13 (Climate Action), SDG 11 (Sustainable Communities), and SDG 3 (Good Health & Well-being).
