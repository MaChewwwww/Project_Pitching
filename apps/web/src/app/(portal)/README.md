# `(portal)` — resident portal

**Client-side rendered, auth-guarded.** Per-user data with no SEO value; server
rendering here would buy auth-on-the-server complexity for no user-visible gain
(architecture.md A-12).

Mobile-first: a resident may be using this during a flood, on a cheap phone.

Current routes cover onboarding, household editing, safety status, and authenticated incident
reporting. The Resident Portal is deliberately **not** part of the August 16 public/admin demo
freeze: its complete workflow and design pass is next. Preserve the existing server-enforced
`/me` contracts, but do not present unfinished activity, volunteer, go-bag, notification, or
assistance-tracker screens as implemented. The assistance tracker remains cut.

Requirements: FR-REG-009, FR-REG-020 …, FR-SAF-001 …, FR-PRP-002.
