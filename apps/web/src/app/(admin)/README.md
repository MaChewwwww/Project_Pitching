# `(admin)` — barangay console

**Client-side rendered, role-guarded.** An application, not a document.

UI guards are convenience only. Authorization is enforced server-side on every
endpoint (FR-SYS-006); hiding a button is not access control.

All emergency screens must work on a phone — the BDRRMC uses whatever is in their
hand (design.md Section 9.1).

The demo release preserves this Barangay Portal alongside the public site and Resident Portal.
Preserve its workspace shells, content-authoring patterns, and the public-map isolation rule.
The About/platform and team content is now supplied and belongs to the public-site content source;
a release freeze does not bypass the FR Definition of Done or server-side authorization requirements.

Requirements: FR-SYS-009, FR-REG-_, FR-ALT-_, FR-SAF-_, FR-EVC-_, FR-ANL-*.
