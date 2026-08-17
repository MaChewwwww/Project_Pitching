# Components

The August 16 demo freeze preserves the public-site and Barangay Portal presentation patterns
documented here. Resident Portal and About/team-profile work are the next intentional design
changes; do not use that work to alter the frozen public or admin map and workspace defaults.

Three layers, and the boundaries between them are the whole point.

```
components/
├── ui/         shadcn primitives — installed by `make shadcn`, never edited
├── common/     the app's own composites, built FROM ui/. Pages import these
└── features/   domain components, mirroring apps/api/src/modules/
```

The inventory — every composite, what it does, what it must handle — is
[`design.md`](../../../docs/design.md) Section 7.2. This file is about the mechanics.

## Component or composition?

Both are reusable design work, but they have different homes:

| It is a…              | When it qualifies                                                                    | Home                            | Examples                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Common component**  | Stable UI behaviour that works across public, portal, and console contexts           | `components/common/`            | `Button`, `EmptyState`, `PageHeader`, `SectionHeader`                                           |
| **Feature component** | Reusable behaviour with one domain or portal responsibility                          | `components/features/<domain>/` | `ResourceTable`, `AdminPageHeader`, `AnnouncementForm`, `AssetMetricStrip`                      |
| **Composition**       | A documented page/workspace anatomy made from components plus route data and actions | Route page + this documentation | public content section, admin directory, authoring surface, asset workspace, emergency worklist |

The Barangay Portal's repeated look is therefore not accidental and it is not limited to
`common/`. Its `features/admin/` components are part of the system: use them before making a
screen-local table, header, generic form, metric strip, or CRUD dialog. The canonical Public and
Barangay Portal compositions live in [`design.md`](../../../docs/design.md) Section 7.2.1.

**Extraction rule:** duplicate one-off domain workflow only when its language, state, or
authorization differs. Extract it after the behaviour is stable across two or more callers; do not
promote every similarly styled card into a vague shared component.

## Why pages default away from `ui/`

A raw shadcn primitive is not this app's component. `design.md` assigns heights (32/40/48),
radii, and variants (`emergency`, `danger`) that shadcn's defaults do not have. If pages import
primitives, those specs get reapplied by hand on every page and drift immediately.

Worse: `make shadcn` **overwrites `ui/`**. Any styling put there is lost on the next reinstall,
silently, and probably during a rebase nobody is reading closely.

So: `ui/` is vendored source. `common/` and `features/` are where this app's design decisions
live.

The narrow exception already present in the final Barangay Portal is a specialist, single-route
interaction mechanic: for example, a `Dialog`, `AlertDialog`, `Select`, or field control where no
portal composite fits. It must sit inside the route's canonical portal composition and use the
established tokens and chrome; it does not license re-creating a shared header, card, table,
button, or form-dialog layout from primitives. When a second route needs that behaviour, promote
it to `features/`.

## How a composite overrides a primitive without editing it

`ui/button.tsx` ends with `cn(buttonVariants({ variant, size, className }))`. cva appends
`className` **last** in the string, and `cn` is `twMerge` — so a class passed in from
`common/Button` wins the conflict against the primitive's own variant and size classes.

That single detail is what makes the whole two-layer rule practical. We never restyle the
vendored file; we out-specify it. `common/Button` still passes a `variant` down (mapping
`danger` and `emergency` onto `destructive`) so the primitive's focus-ring and
`aria-expanded` handling comes along, then replaces every dimension and colour.

`size` is always passed as `"default"`. Letting the primitive's size classes through would
mean two sources of truth for button height, and `twMerge` would arbitrate by class order
rather than by intent.

## Traps in the primitives

- **`ui/card` sets `overflow-hidden`.** Anything meant to overlap a card's edge — the offset
  badge in the reference layout's alternating split — must be an absolutely-positioned
  **sibling** inside a `relative` wrapper, never a child. It will be silently clipped
  otherwise.
- **`ui/separator` and `ui/progress` carry `"use client"`.** For a decorative divider use a
  bordered `div`; for a progress bar use `common/MeterBar`. Both exist to keep client
  boundaries off the landing page, which has the only hard bundle budget in the project
  (NFR-PERF-006). `ui/progress` is fine in the admin console.
- **`ui/card` drives its padding through `--card-spacing`**, so overriding that one variable
  moves the header, content and footer together. Setting `p-*` on the card fights it.

## The two mismatches you will notice first

`make shadcn` gives you components whose defaults do not match `design.md`:

|               | shadcn default      | `design.md`                                                 |
| ------------- | ------------------- | ----------------------------------------------------------- |
| Button height | 32–36px             | 32 / **40** / 48 (Section 7.3)                              |
| Button radius | `rounded-lg` → 14px | `md` → 10px on the admin console, `full` on the public site |
| Card radius   | `rounded-xl` → 20px | `lg` → 14px                                                 |

**The tokens are right; the primitives just pick different steps.** `--radius-md` _is_ 10px and
`--radius-lg` _is_ 14px, exactly as Section 5 specifies. The fix is `common/Button` and
`common/Card` applying the right token — not editing `ui/button.tsx`.

Until those composites exist, anything built on raw primitives looks subtly off-spec. That is
one reason `design.md` Section 12 puts them at stage 1.

## Token wiring

All of it is in `src/app/globals.css`, and that is the only file that should contain a colour.

- `@theme inline` exposes tokens as Tailwind utilities — `bg-primary-600`, `text-alert-2`,
  `bg-hazard-high`, `bg-surface-dark`.
- `:root` holds the shadcn semantic variables (`--primary`, `--border`, …).
- Type scale classes — `text-display-xl`, `text-h1`, `text-overline` — are component classes
  with the `md` breakpoint built in, so `text-h1` is 24px on a phone and 30px on a desktop
  without a responsive prefix at the call site.

Two things worth knowing:

- **Values are hex, not the HSL from `design.md` Section 3.6.** Those triplets are rounded and
  do not resolve to the hex they name — `hsl(149 61% 31%)` is `#1F7F4D`, not `#1F8049`. Side by
  side, `bg-primary` and `bg-primary-600` were visibly different greens. The hex in Sections
  3.1–3.3 is authoritative; the HSL is kept in a comment on each line.
- **No dark mode.** Deliberate (Section 3.6) — barangay staff work in a daylight office,
  residents are outdoors. The `@theme inline` indirection means adding a `.dark` block later is
  the only change needed.

## Domain palettes are not decorative

Each maps to a defined concept, and the mapping must stay consistent everywhere:

- **Flood hazard** is `#FFED4A` / `#F59E0B` / `#EF4444` — the official Philippine convention
  used by UP NOAH, LiPAD, MGB, and PHIVOLCS. Not blue. Residents have seen this ramp on every
  hazard map the government has published; re-teaching them a private scheme costs more than it
  buys.
- **Hazard is always a translucent map polygon. Alert level is always a solid badge** with a
  number and a word. They share warm hues, which is fine _because they never appear in the same
  visual form_. Keep that absolute — never render an alert level as a map fill.

## Responsive is not a later pass

Retrofitting a mobile record-card layout onto `ResourceTable` after ten directories depend on it
is the single most expensive rework available on this project (`design.md` Section 12).

Below `md`, `ResourceTable` renders each row as an identity-first card, then a two-column
label/value grid and a labelled action footer. Search and filters remain visible; sorting remains
desktop-only. A map or emergency workspace owns its task-specific list rather than using this
directory surface by default.

Tap targets: **44×44 minimum, 48×48 for anything used during an emergency** — safety check-in,
rescue request, hotline. Where the visual button is smaller, pad the hit area rather than
enlarging the button.

## The console has its own header — do not use `PageHeader` there

`common/page-header.tsx` is the **public site's** band: a 44px display title with a gradient
accent inside a tinted hero. It is sized to be the first thing a resident sees on a marketing
page. `features/admin/admin-page-header.tsx` is the console equivalent, and the two are
deliberately not the same component.

The console header is a compact, soft-green work-surface header — route icon, `h1` title, one
line of context, optional action, and optional metadata — because it labels a worklist rather
than competing with it. On narrow screens, its action separates below the title. It takes no `titleAccent` and no
`eyebrow`: the split-colour title was decoration that forced awkward phrasing ("Register a" /
"household"), and the eyebrow duplicated what the breadcrumb now states outright. Its icon
defaults to the sidebar entry for the current route, so a page never restates what the nav
already knows.

## Console navigation is defined once, in `lib/admin-nav.ts`

The sidebar and the topbar breadcrumb read the same `ADMIN_CATEGORIES` array. Every category starts
open after a reload so the complete console navigation is visible; officers can still collapse a group
temporarily. On desktop the sidebar is viewport-sticky and does not create a second scroll container.
That is the point
of the module — when the sidebar owned the list privately, any route rename would have left the
breadcrumb showing the old label with nothing to catch it.

The category list intentionally excludes System & Setup. `/admin/areas` and `/admin/config` are
not authoring screens: area boundaries are seeded reference geometry, and operational settings
are service/deployment data. Feature pages may still read those API seams when they need area
options or configured thresholds.

`resolveAdminBreadcrumbs()` renders "Barangay Admin → Announcements & Alerts → Edit". A detail
route's last segment is an opaque UUID, which is noise in a trail, so it reads as the verb the
page performs instead of the id. The topbar previously showed a static "Barangay San Jose /
Operations console" lockup, which said the same thing on all 28 screens and so located nobody.

## Console `ResourceTable` and article CMS

`features/admin/resource-table.tsx` is the shared console list surface. It owns search,
categorical filtering, sortable headings, pagination, empty/loading/error states, and the
stacked-card small-screen layout. A resource page supplies its columns and actions; it must not
recreate those controls in a page.

For a large directory, pass its controlled search value and `serverPagination` instead of loading
the full registry into the browser. In that mode the API owns search and page boundaries, the footer
uses the API total, and sortable headings are disabled unless the endpoint gains a matching sort
contract. `/admin/households` and `/admin/citizens` are the reference consumers.

Pages may supply `toolbarAction` for a contextual link or action. It stays in the shared search
toolbar, aligned with the list controls rather than competing with the page header.

Its chrome is green — `primary-900` heading band, gradient toolbar, `emerald-50/35` zebra rows.
A neutral variant was tried and rejected: the console is a green interface throughout, and a
grey list reads as a foreign component dropped into it. Keep new console surfaces on the green.

Two behaviours are worth preserving if this component is restyled again. Unsorted columns carry
a dimmed `ChevronsUpDown`, so a heading reads as sortable before anyone clicks it. And a search
matching nothing renders an `EmptyState` with a reset action rather than a bare line of text —
required by Definition of Done item 3 (NFR-UX-008).

**Sorting is a three-state cycle: ascending → descending → unsorted.** The third click matters
— without it there is no way back to the order the API sent, which is usually most-recent-first
and so the order an officer wants restored after checking one column. `Reset` clears sorting
too, but only appears once something is active and also wipes search and filters.

Sort direction uses plain `ArrowUp` / `ArrowDown`. Do **not** use lucide's `ArrowUpAZ` /
`ArrowDownAZ` here: those glyphs draw the letters "A" and "Z" beside the arrow, which at 14px
in a table heading renders as an unreadable smudge rather than reading as alphabetical.

Known gap: the `<md` stacked-card layout has no sort control, so sorting is desktop-only on
small screens. Search and filter both work there.

Article creation starts on its own route rather than inside a scrolling dialog. The first save
creates a draft, and the activity create surface can stage up to ten photos with its cover before
that save. The full editor pairs the form with `ArticleImageManager` for persistent upload,
cover selection, ordering, and removal. This keeps media validation visible without weakening the
server-side publication rule.

Both admin announcement previews use a viewport-bounded dialog with a fixed header and one
internal scroll area. This preserves the title and 44px close target on a short mobile viewport
while leaving long articles and cover images fully readable.

The create and edit announcement routes share the same `AnnouncementForm` two-column surface.
Editing supplies its persistent image manager into the form's native right rail, above targeting and
publication controls, instead of introducing a second layout beside the form.

### Announcement CMS is the portal authoring pattern

Treat the announcement CMS as the reference composition for future portal CRUD screens. Keep the
same separation of concerns and visual anatomy when adding activities, donation notices, or other
admin-managed content:

- `AnnouncementForm` owns the React Hook Form + Zod fields, validation messaging, responsive
  article-details surface, targeting controls, and publication actions. Create and edit pages supply
  defaults, API mutations, the context-appropriate Create/Update action label, and (for edit) the
  persistent media rail rather than duplicating the form.
- `ArticleImageManager` is the right-rail media pattern: upload, cover selection, reorder, and remove.
  It intentionally has no alt-text or caption fields; image metadata is not part of the article CMS
  contract.
- `RichTextEditor` is the constrained body editor. `ArticlePreviewDialog` is the shared live/admin
  preview: viewport-bounded, keyboard reachable, with a stable header and one internal scroll region.
- `ActivityForm` follows the same two-column anatomy with date/location and publication cards in
  the right rail. Its create mode uploads staged activity photos after the draft is created;
  edit mode supplies the persistent `ArticleImageManager` rail.
- The page shell is an `AdminPageHeader` followed by a primary white work surface and a right rail
  for media, targeting, and publishing. On narrow screens the rail stacks below the form, while the
  compact Type/Category classification row stays usable at 360px and the publication selector stays
  beside its section heading.
- Public reading uses `AnnouncementCard`, `AnnouncementDetailView`, and `ArticleDetail`. Announcement
  detail media is one responsive, keyboard-accessible carousel: it starts on the cover, advances
  every three seconds after the page splash completes (when motion is allowed), and exposes
  previous/next controls for every ordered image. There is no separate photo-gallery section.
  Admin deletion is a deactivation, so public readers never receive a deactivated announcement.

This is a reusable portal pattern, not an announcements-only exception. New feature pages should
reuse these composites or extract a clearly named variant when their domain fields genuinely differ;
they should not introduce a second authoring layout or a second publication workflow.

### Weather Watch workspace

`/admin/weather-readings` is the weather-specific counterpart to the announcement console pattern. It keeps
three related jobs in one responsive surface: `Overview` reuses the public weather and river panels,
`Manual entry` records a first-class staff reading, and `Threshold review` exposes unresolved prompts
to admins. The tab is addressable with `?tab=overview|manual-entry|threshold-review`, so a review link
can return an officer to the exact queue they were using.

The public feed remains database-cached and every value keeps its source, observed time, age, stale
state, and last-known-good behavior. A manual river reading uses the same threshold evaluator as the
scheduler and may create an `alert_prompt`; it never publishes an announcement. Admins can acknowledge
the prompt or open the announcement authoring route with Alert preselected. BHW staff can view the feed
and enter readings but cannot access the review queue or demo simulation.

### Flood History workspace

`/admin/flood-events` keeps history management separate from live Weather Watch work. Its wide
record log uses `ResourceTable`; its toolbar year selector filters the table and the adjacent
insights rail from the same in-memory view, so comparisons never present a second source of truth.
Weather Watch belongs in the insights heading because it is a companion live-data destination, not a
table filter. `FloodEventEditorDialog` is the domain form because the generic resource dialog cannot
restore the optional many-area history relationship; its responsive two-column layout collapses to a
single scrollable form on small screens. The areas card includes a `Barangay-Wide Flood` shortcut
that selects every available area; individual choices remain available when the shortcut is off, and
the list uses the dialog's single scroll surface rather than a nested scrollbar. Auto-synced records
retain their Emergency Event link and must not expose a delete action; the API enforces the same rule.
The insights rail keeps its scorecard and charts on the same filtered event set: peak bars use the
18m/21m severity bands, displacement bars omit missing counts, and the area-reach chart ranks the
areas mentioned most often. Each chart carries an empty state, direct labels, and a text summary
for keyboard and screen-reader users; hover tooltips provide the detailed comparison. On desktop, the scorecard sits above the event table in the
left column while the comparison charts form the right rail; the columns stack on small screens.

### Community registry workspace

The registry uses two console routes, `/admin/households` and `/admin/citizens`, backed by the same
area-scoped summary query. Their directories page and search on the server; the shared household
picker only requests a short matching slice while it is open. `RegistrySummaryRibbon` is a plain coverage surface rather than a
dashboard-only chart: every figure is derived from the active rows officers can access. Detail pages
keep management beside the data, while `RegistryHouseholdForm` and `RegistryMemberForm` are shared
with the resident head editor at `/portal/household/edit` so field validation and account-linked
protections do not drift between roles.

The household route layers `HouseholdRegistrySummary` above its worklist: a two-item review queue,
a three-column low/medium/high flood-risk household count row, and a compact two-ring population pie
keep household and citizen coverage together without changing the citizen route's summary surface
before its own redesign.

The household worklist keeps the operational scan order (`Household Number`, `Head of household`,
`Members`, `Area`, `Flood Risk`, `Review`, `Actions`). Flood Risk is the selected area's precomputed
exposure class; it is displayed as context, not as a household-specific assessment.
Admin rows also expose a confirmed Delete action backed by the archive endpoint; account-linked
households remain protected by the server and surface the conflict as feedback.

`LocationPicker` accepts an optional boundary resolver callback. Registry forms use it to select the
matching area and derive the initial waterway-proximity band from the static flood layer after a map
click, drag, or GPS fix; it never invents a street address, so the user enters the precise house number,
street, or subdivision. Household forms show a blocking error dialog for pins outside Barangay San Jose.
The `readOnly` variant renders a saved coordinate and marker for household detail pages without
geolocation, drag, or click behavior.

`/admin/households/[id]/edit` reuses the creation workspace with the current household and citizen
data prefilled. One save updates the household, head profile, existing members, and new members together;
removal remains an admin-only confirmed archive. The detail page shows only linked safety, evacuation,
rescue, and resident-head incident report records, keeping unfinished operational modules factual.
The detail layout uses the full console width, keeps the saved map beside the household record, and
omits a redundant back action because the breadcrumb provides the return path. Its member roster is a
compact `Current Household Members` surface: each row exposes icon-only view, edit, and protected
remove actions, while the view dialog carries the less-frequent head-assignment action and the full
member facts. The detail cards use the same colored operational accents as the registry and weather
workspaces so the page reads as a working dossier rather than a plain record dump. Its query-backed
`Overview`, `Members`, and `Operations` tabs keep identity/location, roster management, and linked
operational history separate; do not place those three groups on one continuously mixed canvas.

The registered-citizen route is the person-focused counterpart, not a second household dashboard.
`CitizenRegistrySummary` uses one citizen-only area ring with direct labels, plus separate population
and support-readiness cards. Its directory keeps household context visible but routes view actions to
the citizen detail page. The server-backed directory filter exposes areas, household heads, and
priority support needs; other profile-readiness figures remain in the summary rather than filtering
only the currently loaded page.

Citizen detail persists `Overview`, `Household`, and `Safety & Activity` in the query string. The
Household tab owns transfer, head assignment, and adult promotion; profile editing deliberately does
not mix lifecycle changes into identity fields. Person-linked evacuation and safety data remain
visually separate from household-linked rescue requests and reports. Create and edit reuse one
RHF/Zod workspace, confirmation dialog, green field accents, and sticky actions. Account-linked head
names and head relationships render as protected values.

`/admin/households/new` is the BHW-assisted creation workspace. It uses the announcement-style
primary work surface with identity and head details on the left, while the right rail keeps the
required street address, map pin, and waterway-proximity survey together. The survey exposes the
same very-near/near/far flood-risk bands used during resident onboarding. The member repeater stays
under the household details card in the left column so adding a member expands that column in place;
the map and survey rail is sticky beneath the console header without introducing a second scrollbar,
and stacks normally on small screens. The action bar stays fixed to the viewport while the form reserves
bottom space for it. The household head requires a birthday and sex; every added member requires a name,
birth date, sex, and relationship to the head;
their contact number is optional and is carried into the Registered Citizens directory. The create action
opens a confirmation review before saving, then the API duplicate check flags possible matches in the
household list. Vulnerability flags remain optional because they record what the BHW knows. Household
contact number is optional; the API normalizes a missing number to the `No Contact Number` review state automatically.
The fixed action bar keeps a compact icon timeline on the left, lighting each step when its required fields
are complete, while the color-coded cancel, clear, and create actions stay right-aligned.

### Emergency event operations workspace

`/admin/emergency-events` owns event selection and the addressable `Overview`, `Map`, and
`Accounted For` tabs through `?event=<uuid>&tab=...`. Active rows expose management actions;
ended rows keep the same read model as read-only history. `/admin/safety` only redirects to the
embedded Accounted For tab. The event selector separates active events from history rather than
assuming one global event.

`EmergencyResponseMap` is an isolated client-only Leaflet component. It intersects household pins
with the staged NOAH layer in the browser and labels the stored survey fallback when the layer is
missing or no polygon is available. Desktop hover and keyboard focus use the same roster content as
the touch sheet. Optional pins are handled by the adjacent searchable unmapped list. Map filters are
operational state, not URL state; the selected event and tab are URL state.

Safety actions start in the household detail sheet. Each per-member or exact-roster bulk confirmation
dialog carries its own optional evacuation-center selector; the bulk dialog repeats the acknowledged
live roster before submission. Mutation success invalidates the selected workspace, Accounted For,
center occupancy, and portal safety queries together. Center capacity is visibly advisory.

`/admin/unregistered-persons` remains its own route under Community Registry. Event, safety,
conversion, support-need, and center filters operate over retained emergency records. Conversion to
an existing household is an inline dialog; creation routes through the full assisted household
workspace with known name/contact/support flags prefilled.

### Response operations worklists

`/admin/rescue-requests` and `/admin/incident-reports` share a client-only operational map and
worklist. Search, status, and event controls filter both surfaces together; records without a pin
are counted explicitly and stay in the table. Selecting either a map pin or worklist row opens a
right-side detail sheet with the audit timeline, event linking, and only the next valid response
actions. The rescue view starts with the flood layer visible; the incident view starts without it.

### Operational asset maps

`AdminAssetMap` is the client-only Leaflet island used by facility, evacuation-center, and siren
registries. The selected row and selected marker share one ID; never duplicate that state in the
map. Each registry keeps its own filters and layer defaults, so the finalized public map views do
not inherit console-only controls. The siren map may animate a sounding marker, but local Web Audio
starts only after the administrator presses Trigger and never resumes from server state on reload.

### Portal splash loading

`AdminGate` and `PortalGate` reuse `PageSplashLoader` with a 1.5-second minimum presentation.
The splash only fades once the session and portal gate checks are ready, so a slow refresh may
remain visible longer without exposing an incomplete shell. The loader dispatches the same
`splash-ready` event as the public shell so shared entrance reveals keep one lifecycle.

### Authenticated portal data loading

`common/portal-loading.tsx` owns the authenticated portals' data-loading language. Use a
shape-matched skeleton for metrics, details, fields, timelines, charts, and map containers. Use
`DataSurfaceLoading` for a table or large operational workspace; it centres the shared
`WaterSpinner` and announces a concrete label.

`ResourceTable` retains its toolbar and frame while fetching, then replaces its desktop rows and
mobile cards with `DataSurfaceLoading`. Pass `loadingLabel` from each directory. Query-backed
portal regions use `isFetching`, not just their first `isLoading`, so paging, filtering, and an
explicit refresh have the same clear state. Do not use a loader for a disabled dependent query,
an empty result, an error, or a mutation button.

Portal entry helpers use 400ms entrances and 90ms staggers; hover transitions use 260ms and
press feedback stays quick. The calm `WaterSpinner` tempo is portal-only, leaving public-site
streaming fallbacks unchanged.

## Animation lives in `globals.css`, not in a client component

`WaterSpinner` and the hero illustrations are animated entirely by CSS classes defined in
`globals.css` (`.ws-*`, `.hero-*`) over static markup. None of them carry `"use client"`.

That is a hard constraint, not a preference. A spinner is needed inside `<Suspense fallback>` on
the landing page, and anything with `"use client"` there would pull a JavaScript boundary into
every section it guards — precisely the cost `SectionBoundary` is designed to keep to one
component per page (NFR-PERF-006). Reach for a client component only when the animation
genuinely needs state or measurement, as `StatBandAnimator` does.

**Infinite ambient loops need their own `prefers-reduced-motion` guard.** The global kill-switch
in `@layer base` sets `animation-duration: 0.01ms`, which is right for an entrance animation that
ends in a visible state — but a loop whose keyframes start and end at `opacity: 0` gets frozen
invisible by it. So `.ws-*` is gated on `prefers-reduced-motion: no-preference`, and the ungated
rules are authored to stand alone as a legible static resting state. Test any new loop with
reduced motion enabled before calling it done.

**3D depth comes from `perspective` + `transform-style: preserve-3d` on inline elements**, not a
canvas or a WebGL dependency. `WaterSpinner` tilts a ripple plane with `rotateX` and precesses
two rings by spinning wrappers about Y while the ring inside holds a fixed tilt — so the tilt
axis rotates rather than the ring spinning flat. Keep transforms that must compose on separate
nested elements; stacking a squash and a rotation on one node makes both fight.

## Adding a composite

1. Build it in `common/` from `ui/` primitives.
2. Make it work at 360px **first**, then widen.
3. Handle loading, empty, and error states — not just the happy path (Definition of Done item 3).
4. Keyboard reachable, visible focus ring, contrast at WCAG AA.
5. Never colour alone — every status carries an icon or a text label as well. Alert levels
   always show the number.
6. If it is a new entry in the inventory, add it to `design.md` Section 7.2 in the same PR.

## `lucide-react` icon assignments

`design.md` Section 6 fixes an icon per concept — `Users` for household, `Waves` for river
level, `LifeBuoy` for rescue. Keep them stable. Users learn icons faster than labels, and
re-teaching them costs more than a better-looking icon is worth.

## Section headers and article preview cards

- `SectionHeader` action buttons must consistently include `<span className="hidden sm:inline">View All</span>` alongside `ArrowRight` so desktop screens display legible text while small phone views collapse to the icon button.
- `AnnouncementCard` presents announcements and alerts in a symmetrical, equal-height card container with matching 16:10 cover imagery (or fallback gradient header graphics). Badges render at top-left ("Announcement", "Advisory", "Warning", "Emergency Alert") and PHT dates render at top-right over the header image. Author attribution in the footer uses a `User` icon. Emergency alerts feature a high-contrast `<ImmediateGuidance />` callout box (`bg-red-50 border-red-200 text-red-950`) without asymmetric side borders.
- `AnnouncementDetailView` presents announcement detail pages in a space-maximizing 2-column layout (`lg:grid-cols-12`): main article content on the left (`lg:col-span-8`) with the ordered media carousel and a Recent Announcements sidebar on the right (`lg:col-span-4`) with compact article previews and an emergency hotline callout.
- `ActivityCard` keeps its calendar date block as the primary recognition device; `ActivityDetailView` repeats that date treatment and pairs the article with schedule metadata and upcoming activities.
- `GuideEditor` is the bilingual, source-dated authoring surface. `GuideDetailView` reads the selected language and keeps source/review provenance in a dedicated guide-record rail.
