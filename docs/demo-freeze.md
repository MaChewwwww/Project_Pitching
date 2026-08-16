# Demo freeze — August 16, 2026

**Snapshot:** `ce66a7e` on `main` is the approved code and design baseline for the SK Project
Pitching demo. It covers the Public Information Site and Barangay Portal (the officer/admin
console). Treat visual and workflow changes on those surfaces as deliberate demo changes, not
opportunistic cleanup.

This is a release-scope record, not a change to the Definition of Done. The FR tables continue
to use `◐` until the required peer review and final responsive/accessibility verification are
recorded. A demo-ready implementation is not silently promoted to `✅` by this document.

## Owner validation

The project owner has manually tested and fine-tuned the Public Information Site and Barangay
Portal frontend and backend. Those two frozen surfaces are **complete portions of the pitch demo**.
The overall pitch demo remains in progress until the Resident Portal pass and the About/team page
are complete. This is a demo-readiness decision, not a replacement for the peer-review evidence
needed to mark an individual FR `✅`.

## Demo personas

The pitch uses exactly two user types:

| Persona            | Demonstrates                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Resident**       | The public information site, registration/sign-in, and the resident-facing promise of the platform        |
| **Barangay Admin** | The complete Barangay Portal: registry, operations, maps, weather, alerts, assets, and content management |

BHW, SK Officer, and Super Admin are **not separate pitch personas**. They remain internal role
values in the current code and schema so existing authorization paths are not changed for the
demo; do not present or describe them as additional user types.

## Frozen for the demo

| Surface             | Included, current experience                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public site         | Landing overview; announcements; activities; donation drives; preparedness guides and help; weather and flood history; flood hazard and barangay-facilities maps; emergency rescue request; login and registration |
| Barangay Portal     | Emergency-event, safety, rescue, incident, walk-in, registry, facilities, evacuation, siren, weather, content, hotline, FAQ, donation-drive, activity, and guide operations                                        |
| Shared presentation | Finalized public-map viewports, page shells, splash lifecycle, public article patterns, and the admin workspace/`ResourceTable` language                                                                           |

The three protected public-map configurations remain exactly as recorded in
[`design.md`](./design.md) Section 7.2 and [`AGENTS.md`](../AGENTS.md): landing preview,
Flood Hazard Map, and Barangay Facilities Map. New portal or console maps use isolated views.

## Remaining pitch-demo work

| Surface         | Status and next work                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resident Portal | Existing onboarding, household edit, safety, and incident-report routes remain available, but its complete design and workflow pass is required before the overall pitch demo is complete.             |
| About page      | The existing page remains a public route, but its design revision and approved team-profile content are required before the overall pitch demo is complete. Do not invent team details or photographs. |

## Returning to active development

1. Start a new FR/NFR-scoped branch from this snapshot.
2. Preserve public-map defaults and the public/admin presentation patterns unless a requirement
   explicitly changes them.
3. Update the affected root and local documentation in the same change, then record the actual
   review and verification evidence before moving any FR to `✅`.
