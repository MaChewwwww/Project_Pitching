# `(portal)` — resident portal

**Client-side rendered, auth-guarded.** Per-user data with no SEO value; server
rendering here would buy auth-on-the-server complexity for no user-visible gain
(architecture.md A-12).

Mobile-first: a resident may be using this during a flood, on a cheap phone.

The resident portal is intentionally distinct from the editorial public site and the barangay
operations console: its calm default view becomes emergency-led when an event is active. The
mobile shell is a bottom navigation with a safe-area inset; desktop uses a resident rail. Do not
reuse the admin shell or alter a finalized public map configuration.

Current routes cover household members, event safety check-in, authenticated rescue requests,
incident reporting, history, notifications, preparedness, weather, and a household-centred flood
map. Activities remain public informational posts only and have no resident route.

The household hazard map uses the saved pin as a read-only context marker. A missing household
location is an actionable empty state; the map must never silently fall back to one of the public
map viewports. Its flood layer may degrade independently of the private marker.

Requirements: FR-SYS-019/020, FR-REG-027, FR-SAF-022 … 024, FR-EVC-009, FR-MAP-016, FR-PRP-002/006.
