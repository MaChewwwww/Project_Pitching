# Demo release status — August 17, 2026

**Baseline:** `ce66a7e` established the Public Information Site and Barangay Portal design freeze.
The subsequent resident-portal, seed-story, loading-state, and performance work is now part of the
demo release. Treat visual and workflow changes on all three implemented surfaces as deliberate
demo changes, not opportunistic cleanup.

This is a release-scope record, not a change to the Definition of Done. The FR tables continue
to use `◐` until the required peer review and final responsive/accessibility verification are
recorded. A demo-ready implementation is not silently promoted to `✅` by this document.

## Owner validation

The project owner has completed the functional development pass for the Public Information Site,
Resident Portal, and Barangay Portal. The project team has now supplied the final four-person
About/platform and team detail. This is a demo-readiness decision, not a replacement for the
peer-review evidence needed to mark an individual FR `✅`.

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
| Resident Portal     | Dashboard; onboarding and household editing; household-centred hazard map and history; weather; safety check-in; authenticated rescue and incident tracking; updates; Go Bag and family emergency plan             |
| Barangay Portal     | Emergency-event, safety, rescue, incident, walk-in, registry, facilities, evacuation, siren, weather, content, hotline, FAQ, donation-drive, activity, and guide operations                                        |
| Shared presentation | Finalized public-map viewports, page shells, splash lifecycle, public article patterns, portal loading states, and the admin workspace/`ResourceTable` language                                                    |

The three protected public-map configurations remain exactly as recorded in
[`design.md`](./design.md) Section 7.2 and [`AGENTS.md`](../AGENTS.md): landing preview,
Flood Hazard Map, and Barangay Facilities Map. New portal or console maps use isolated views.

## Remaining pitch content

| Surface    | Status and next work                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| About page | The public route uses the supplied four-person profiles, roles, biographies, and portraits. Keep future content changes grounded in approved project material. |

## Returning to active development

1. Start a new FR/NFR-scoped branch from the current release branch.
2. Preserve public-map defaults and the public/admin presentation patterns unless a requirement
   explicitly changes them.
3. Update the affected root and local documentation in the same change, then record the actual
   review and verification evidence before moving any FR to `✅`.
