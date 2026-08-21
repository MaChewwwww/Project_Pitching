# Guided staging demo capture

The capture suite creates editable footage for the project pitch. It is deliberately separate
from `apps/web` and `apps/api`: no product UI changes, database reset, cleanup, or FR/NFR status
update is part of a capture run.

## One-time setup

```powershell
Copy-Item tools/demo-capture/.env.capture.example .env.capture
```

Fill in `CAPTURE_ADMIN_EMAIL` and `CAPTURE_ADMIN_PASSWORD` locally. Keep `CAPTURE_MUTATIONS=false` while checking setup;
the checked-in example never contains a secret. Install the root dependencies and Chromium:

```powershell
npm install
npx playwright install chromium
```

The suite refuses any `CAPTURE_BASE_URL` whose host is not `57-155-90-155.sslip.io`.

The default pace is tuned for the two-core staging server: `CAPTURE_SETTLE_MS=550` lets a page
finish drawing before the next action, and `CAPTURE_SCROLL_PAUSE_MS=280` keeps long pages moving
without adding unnecessary idle time. These are local-only settings; raise them when a page
needs more time, or lower them slightly for a faster rehearsal.

The landing page moves its visible `<main>` surface in recorder-only position steps rather than
invoking document scrolling or stacking browser-native smooth-scroll requests. About,
informational, portal, and admin pages use the normal scroll position. The short pause after each
step keeps the page readable without letting an overloaded scroll handler stall the recording; the
footage is intentionally easy to cut between positions during manual editing.

The recorder also asks the browser for reduced motion. This disables scroll-triggered reveals and
page-transition animation work in the recording context only, keeping the product’s normal motion
unchanged for visitors.

The landing-page hero is a continuously rendered WebGL scene. For that clip only, the recorder
captures its first finished frame and places it over the canvas before the long scroll. This keeps
the 3D visual in the footage without asking the video encoder to follow an always-running render
loop; the public page still uses its live scene outside capture.

The recorder also waits for the site-wide SAGIP splash screen to finish before it clicks or
types. `CAPTURE_LOADER_TIMEOUT_MS=8000` is the maximum wait for that screen, while
`CAPTURE_LOADER_SETTLE_MS=300` gives its fade-out a moment to complete.

## Read-only preflight and public footage

The first spec checks `/api/v1/health` and the public route inventory, then records a smoke clip.
Run it (and all public information clips) without creating records:

```powershell
$env:CAPTURE_MUTATIONS = "false"
npm run capture:demo:public
```

`capture:demo:public` includes the preflight spec so the route check remains first in the run.
Use `npm run capture:demo:preflight` when you only want the read-only smoke clip. Use the
generated `manifest.json` to select the
full landing/About, hazard map, weather/river history, facilities/hotlines, announcements,
guides/donations, and activities/help clips.

## Registration, safety, and operations footage

These scenarios create staging data and therefore require an explicit opt-in:

```powershell
$env:CAPTURE_MUTATIONS = "true"
npm run capture:demo:registration
npm run capture:demo:safety
npm run capture:demo:operations
```

The registration and safety specs use deterministic run-tagged names/emails. The safety spec
declares a new concurrent flood event, submits and triages a rescue request through verified →
dispatched → resolved, records the resident safe check-in, and verifies the selected event's
accounted-for ledger. If staging has multiple active events, the resident portal form remains
on screen while the capture routes only that rescue write through the public endpoint; the
event-specific safety flag, admin triage, and safe check-in remain event-selected. The
operations spec deploys and triggers a visual siren, then records the public map and hotline
directory. Existing staging exercises are not edited, and no `tel:` or external links are opened.

## Artifacts and review

Each run is written to the ignored path `artifacts/demo-captures/<run-id>/`:

- `test-results/` — Playwright WebM recordings, traces, screenshots, and per-test metadata;
- `mp4/` — full H.264 clips plus timeline subclips;
- `manifest.json` — title, scenario, persona, duration/timeline, source WebM, MP4, and created IDs.

The teardown validates every MP4 with ffmpeg and records failures. Before editing, watch each
clip for readable guidance, cut-safe starts/ends, and the expected state transition. Keep the
artifact directory local; it is ignored and is not a deployment input.
