# Design System

**Project:** `SAGIP-SJ` (System for Alert, Guidance, Incident Reporting, and Preparedness) — Barangay San Jose Disaster Readiness & Community Health Platform

**Companion to:** `business-requirements.md`, `tech_stack.md`
**Version:** 0.2 · **Date:** August 16, 2026

> **Scope.** Visual language, tokens, and the component inventory. Screen-by-screen layouts and user flows belong in a separate UI spec.

---

## 1. Design Principles

Four rules, derived from what the platform is actually for. When a decision is unclear, these break the tie.

1. **Readable under stress, on a cheap phone.** Someone may be reading this in the dark, on 3G, while water rises. Large tap targets, high contrast, no thin grey text on white. **Design at 360px first** (Section 9).
2. **Emergency information outranks everything.** An active alert takes the top of the screen (BR-0.18). The hotline is always one tap away (BR-0.15).
3. **Always say how fresh the data is.** Every reading carries a timestamp, and stale data is visibly marked (BR-3.8). A number with no age is a lie waiting to happen.
4. **Trustworthy, not flashy.** This represents a barangay government. Restrained, institutional, competent — the 3D map is the one place to be showy.

---

## 2. Brand

### Name

`SAGIP-SJ` — System for Alert, Guidance, Incident Reporting, and Preparedness for Barangay San Jose. Defined as constants in `lib/brand.ts`:

```ts
// lib/brand.ts
export const APP_NAME = "SAGIP-SJ";
export const APP_TAGLINE =
  "System for Alert, Guidance, Incident Reporting, and Preparedness for Barangay San Jose";
export const BARANGAY = "Barangay San Jose, Rodriguez, Rizal";
```

### Logo

Not yet designed. Reserve the slot and build against a placeholder component so the swap is trivial.

| Context            | Size                 | Form                                                                 |
| ------------------ | -------------------- | -------------------------------------------------------------------- |
| Public navbar      | 40px height          | Full lockup — mark + wordmark                                        |
| Admin sidebar      | 32px mark + wordmark | Mark + name + "ADMIN PORTAL" descriptor beneath, as in the reference |
| Collapsed sidebar  | 32px                 | Mark only                                                            |
| Favicon / app icon | 32, 180, 512         | Mark only                                                            |
| Footer             | 40px                 | Full lockup, single colour                                           |

Requirements for whoever designs it: legible at 32px, works on both `primary-950` (dark sidebar) and white, and has a mark that stands alone.

---

## 3. Colour

### 3.1 Primary — Forest Green

The institutional green from the references: deep and slightly desaturated, not a bright commercial green.

| Token         | Hex       | Used for                                      |
| ------------- | --------- | --------------------------------------------- |
| `primary-50`  | `#F2FAF5` | Table row tint, section backgrounds           |
| `primary-100` | `#DFF3E6` | Badge backgrounds, avatar fills, hover states |
| `primary-200` | `#BFE7CE` | Borders on tinted surfaces                    |
| `primary-300` | `#92D4AC` | Chart fills, disabled primary                 |
| `primary-400` | `#5BB983` | Accents on dark backgrounds                   |
| `primary-500` | `#2E9D62` | Success text, positive indicators             |
| `primary-600` | `#1F8049` | **Primary buttons**, links, active states     |
| `primary-700` | `#196A3D` | Primary button hover                          |
| `primary-800` | `#17532F` | **Table headers**, stat bands, dark buttons   |
| `primary-900` | `#123F25` | Deep surfaces                                 |
| `primary-950` | `#0C2A19` | **Sidebar**, top utility bar, darkest panels  |

### 3.2 Neutrals

| Token         | Hex       | Used for                   |
| ------------- | --------- | -------------------------- |
| `neutral-50`  | `#F8FAFA` | App background             |
| `neutral-100` | `#F1F4F3` | Subtle fills               |
| `neutral-200` | `#E3E8E6` | Borders, dividers          |
| `neutral-300` | `#CBD3D0` | Input borders              |
| `neutral-400` | `#9AA5A1` | Placeholder text, disabled |
| `neutral-500` | `#6B7772` | Secondary text             |
| `neutral-600` | `#4E5A55` | Body text on light         |
| `neutral-700` | `#3A4541` | Strong body text           |
| `neutral-800` | `#252E2B` | Headings                   |
| `neutral-900` | `#141A18` | Display headings           |

Neutrals carry a slight green cast so they sit naturally beside the primary scale.

### 3.3 Semantic

| Purpose     | Text/Icon | Background | Border    |
| ----------- | --------- | ---------- | --------- |
| **Success** | `#15803D` | `#DCFCE7`  | `#BBF7D0` |
| **Warning** | `#B45309` | `#FEF3C7`  | `#FDE68A` |
| **Danger**  | `#B91C1C` | `#FEE2E2`  | `#FECACA` |
| **Info**    | `#1D4ED8` | `#DBEAFE`  | `#BFDBFE` |

> Success is a _different_ green from `primary-600` on purpose. When the whole interface is green, a green "verified" badge reads as decoration. The success green is brighter and used only for state.

### 3.4 Domain palettes

These are not decorative. Each maps to a defined concept in the BRD, and the mapping must stay consistent everywhere it appears.

**River alert levels** (BR-3.2)

| Level            | Meaning                                                    | Colour    | Background |
| ---------------- | ---------------------------------------------------------- | --------- | ---------- |
| Normal           | Below threshold                                            | `#15803D` | `#DCFCE7`  |
| **1 · Prepare**  | Ready to move                                              | `#B45309` | `#FEF3C7`  |
| **2 · Evacuate** | Move now                                                   | `#C2410C` | `#FFEDD5`  |
| **3 · Critical** | Mandatory action, including forced evacuation when ordered | `#B91C1C` | `#FEE2E2`  |

**Flood hazard** (Project NOAH / LiPAD hazard attribute, tech_stack Section 6)

Matches the **official Philippine hazard map convention** used by UP NOAH, LiPAD, MGB, and PHIVOLCS. Do not invent a different ramp.

| Value | Level                    | Depth     | Fill              | Opacity |
| ----- | ------------------------ | --------- | ----------------- | ------- |
| `1`   | Low                      | 0–0.5 m   | `#FFED4A`         | 0.55    |
| `2`   | Medium                   | 0.5–1.5 m | `#F59E0B`         | 0.60    |
| `3`   | High                     | >1.5 m    | `#EF4444`         | 0.60    |
| —     | Area assessed, no hazard | —         | `#E5E7EB`         | 0.35    |
| —     | Area not assessed        | —         | hatched `#9CA3AF` | 0.25    |

> **Why not a custom palette.** An earlier draft specified blue on the reasoning that water reads as blue and it would separate hazard depth from alert urgency. That was wrong. Residents and barangay officials have seen yellow/orange/red on every hazard map the government has ever published; re-teaching them a private colour scheme costs more than the visual conflict it avoids. Match the convention.
>
> **Handling the overlap with alert levels.** Hazard and alert levels now share warm hues, which is acceptable because they never appear in the same visual form: hazard is a **translucent map polygon**, alert level is a **solid badge or banner with a number and a word**. Keep that distinction absolute — never render an alert level as a map fill, and never render hazard as a badge.

**Household vulnerability** (BR-1.48)

| Level        | Colour    | Background |
| ------------ | --------- | ---------- |
| Low          | `#15803D` | `#DCFCE7`  |
| Moderate     | `#CA8A04` | `#FEF9C3`  |
| High         | `#C2410C` | `#FFEDD5`  |
| **Priority** | `#B91C1C` | `#FEE2E2`  |

~~**Nutrition status colour ramp**~~ — **cut, Aug 2026.** The platform does not collect nutrition-assessment data (BRD D-15), so there is no status to colour. Closes D-OI-4.

**Safety status** (M5)

| Status                        | Colour                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| Safe — confirmed individually | `#15803D` solid                                                     |
| Safe — via household action   | `#15803D` outlined _(BR-5.1c: lower confidence, shown differently)_ |
| Unaccounted for               | `#6B7772`                                                           |
| Needs rescue                  | `#B91C1C` + pulse animation                                         |

### 3.5 Chart palette (M10)

Ordered for categorical series. Colour-blind safe and distinguishable in greyscale.

```
1  #1F8049   forest      5  #7C3AED   violet
2  #F59E0B   amber       6  #DB2777   pink
3  #2563EB   blue        7  #0891B2   cyan
4  #DC2626   red         8  #65A30D   lime
```

Convention from the reference dashboard: **solid lines are actuals, dashed lines are forecasts.** Keep it.

### 3.6 CSS variables

shadcn/ui convention, HSL triplets. Drop into `globals.css`.

> **As implemented — Tailwind v4.** The app is on Tailwind v4, where the same tokens are exposed through `@theme inline` rather than a `tailwind.config.ts`, and each value must be a complete colour (`#1F8049`) rather than a bare triplet. **The palette is unchanged**; only the syntax differs.
>
> One correction fell out of implementing it: several triplets below are rounded and do not resolve to the hex they name. `hsl(149 61% 31%)` is `#1F7F4D`, not `#1F8049` — close enough to read the same in isolation, but it makes `bg-primary` and `bg-primary-600` visibly different swatches side by side. **`globals.css` uses the hex values from Sections 3.1–3.3**, which are the authoritative ones, and keeps the HSL in a comment on each line.

```css
@layer base {
  :root {
    --background: 180 20% 98%;
    --foreground: 160 10% 9%;

    --card: 0 0% 100%;
    --card-foreground: 160 10% 9%;

    --popover: 0 0% 100%;
    --popover-foreground: 160 10% 9%;

    --primary: 149 61% 31%; /* primary-600 #1F8049 */
    --primary-foreground: 0 0% 100%;

    --secondary: 150 44% 91%; /* primary-100 */
    --secondary-foreground: 150 53% 21%;

    --muted: 160 8% 95%;
    --muted-foreground: 160 5% 45%;

    --accent: 150 44% 91%;
    --accent-foreground: 150 53% 21%;

    --destructive: 0 72% 42%;
    --destructive-foreground: 0 0% 100%;

    --border: 160 8% 89%;
    --input: 160 8% 82%;
    --ring: 149 61% 31%;

    --radius: 0.75rem;

    /* Surfaces not covered by shadcn defaults */
    --surface-dark: 150 55% 11%; /* primary-950 — sidebar, utility bar */
    --surface-header: 150 53% 21%; /* primary-800 — table headers */
    --surface-tint: 150 50% 97%; /* primary-50 — striped rows */

    /* Charts */
    --chart-1: 149 61% 31%;
    --chart-2: 38 92% 50%;
    --chart-3: 221 83% 53%;
    --chart-4: 0 72% 51%;
    --chart-5: 262 83% 58%;
  }
}
```

> **Dark mode is out of scope for now.** Barangay staff use this in a daylight office, residents on phones outdoors. Structure the tokens so it can be added later, but do not spend time on it — it is a second full theme to test (R-8).

---

## 4. Typography

### Families

| Role                                             | Font                                 | Why                                                                                                    |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Display** — page titles, hero, stat numbers    | **Plus Jakarta Sans** when available | Geometric and confident, matching the reference headlines; system fallback keeps builds self-contained |
| **UI/Body** — everything else                    | **Inter** when available             | The most legible screen typeface at small sizes; excellent tabular figures                             |
| **Mono** — reference numbers, coordinates, codes | **JetBrains Mono** when available    | Only where character disambiguation matters                                                            |

Use CSS font stacks with these families first and system fallbacks after them. Do not make the
production build fetch fonts from a CDN: the staging build must remain reproducible when external
font hosts are unavailable.

### Scale

Two columns: **mobile is the base value, desktop scales up at `md`.** A 60px headline on a 360px screen wraps to four lines and pushes everything below the fold.

| Token        | Mobile (base) | Desktop (`≥md`) | Weight                            | Use                                  |
| ------------ | ------------- | --------------- | --------------------------------- | ------------------------------------ |
| `display-xl` | 34 / 40       | 60 / 64         | 800                               | Public hero headline                 |
| `display-lg` | 30 / 36       | 44 / 50         | 800                               | Stat band numbers                    |
| `display-md` | 28 / 34       | 34 / 40         | 700                               | KPI values                           |
| `h1`         | 24 / 32       | 30 / 38         | 700                               | Page title                           |
| `h2`         | 20 / 28       | 24 / 32         | 700                               | Section heading                      |
| `h3`         | 18 / 26       | 20 / 28         | 600                               | Card title                           |
| `h4`         | 16 / 24       | 16 / 24         | 600                               | Sub-heading                          |
| `body-lg`    | 16 / 26       | 17 / 28         | 400                               | Public site body                     |
| `body`       | 15 / 24       | 15 / 24         | 400                               | Default UI                           |
| `body-sm`    | 13 / 20       | 13 / 20         | 400                               | Secondary, captions                  |
| `label`      | 13 / 16       | 13 / 16         | 600                               | Form labels                          |
| `overline`   | 11 / 16       | 11 / 16         | 700, `0.08em` tracking, uppercase | Card labels, table headers, eyebrows |
| `caption`    | 11 / 16       | 11 / 16         | 400                               | Timestamps, helper text              |

Body and below do **not** shrink on mobile. Only display and heading sizes scale — shrinking body text to fit more content is exactly wrong for this audience.

### Rules

- **`overline` is the signature.** Uppercase, letterspaced, muted — used for every KPI label, table header, and eyebrow. It carries most of the institutional feel.
- **Tabular figures on all numbers in tables and KPIs** — `font-variant-numeric: tabular-nums`. Without it, digits jitter as values update.
- **Never go below 13px** for content a resident reads. The public site minimum is 15px.
- **Two-tone headlines** on the public site: first line `neutral-900`, second line `primary-600` with an underline accent, as in the reference.

---

## 5. Layout & Spacing

### Spacing scale

4px base: `1(4) 2(8) 3(12) 4(16) 5(20) 6(24) 8(32) 10(40) 12(48) 16(64) 20(80) 24(96)`

### Shell dimensions

| Element            | Mobile (`<lg`)              | Desktop (`≥lg`)                     |
| ------------------ | --------------------------- | ----------------------------------- |
| Admin sidebar      | Hidden — opens as a `sheet` | `256px` expanded · `72px` collapsed |
| Admin topbar       | `56px`                      | `64px`                              |
| Public utility bar | Hidden — moves to footer    | `36px`                              |
| Public navbar      | `60px`                      | `72px`                              |
| Content gutters    | `16px`                      | `24px`, max width `1440px`          |
| Card padding       | `16px`                      | `24px`                              |
| Between cards      | `16px`                      | `32px`                              |
| Between sections   | `32px`                      | `48px`                              |

The admin sidebar is an operational navigation surface, not a database browser. It intentionally
has no System & Setup category: seeded area boundaries and service configuration are internal
data seams, while deployment-owned settings belong in the environment profile.

Full responsive behaviour in Section 9.3.

### Radius

| Token  | Value  | Default use                                    | Public-site override          |
| ------ | ------ | ---------------------------------------------- | ----------------------------- |
| `sm`   | 6px    | Badges, small chips                            | —                             |
| `md`   | 10px   | Inputs, buttons                                | Buttons become `full`         |
| `lg`   | 14px   | Cards                                          | Cards become `xl` (Section 8) |
| `xl`   | 20px   | Feature panels, the dark KPI panel             | Also cards                    |
| `full` | 9999px | Pills, avatars, CTA buttons on the public site | —                             |

> The public site uses **fully rounded pill buttons**; the admin console uses **`md` radius**. That difference is deliberate — it signals "public brochure" versus "working tool."

> **The public-site column is an override of the default, not a contradiction of it.** Section 8 gives the public site `xl` cards where this table's default is `lg`; both are correct for their surface. The `Card` composite takes a `radius` prop defaulting to `lg`, and public sections pass `xl` explicitly, so the override is stated in code rather than inferred.

> **The tokens carry these values; the raw shadcn primitives do not use them as assigned here.** A stock shadcn `button` is `rounded-lg` (14px by this scale) and a stock `card` is `rounded-xl` (20px), where this table wants 10px and 14px respectively. The same applies to button heights — shadcn's defaults are not the 32/40/48 of Section 7.3. **This is resolved in `components/common/`, not by editing `components/ui/`** (NFR-MNT-006): the `Button` and `Card` composites apply the right token per component. Until those composites exist, a page built on raw primitives will look subtly off-spec — which is one reason Section 12 puts them at stage 1.

### Elevation

| Token       | Shadow                           | Use                                          |
| ----------- | -------------------------------- | -------------------------------------------- |
| `flat`      | none, `1px` border `neutral-200` | Default card. **Most cards should use this** |
| `sm`        | `0 1px 3px rgb(0 0 0 / 0.06)`    | Hover on interactive cards                   |
| `md`        | `0 4px 12px rgb(0 0 0 / 0.08)`   | Dropdowns, popovers                          |
| `lg`        | `0 12px 32px rgb(0 0 0 / 0.12)`  | Modals, floating cards                       |
| `emergency` | `0 0 0 3px` danger-200           | Active alert banner                          |

Prefer borders over shadows. The reference interface is almost entirely flat with hairline borders, which is what makes dense tables readable.

### Motion

| Token     | Duration | Easing                                        |
| --------- | -------- | --------------------------------------------- |
| `instant` | 100ms    | `ease-out` — hovers, small state              |
| `fast`    | 180ms    | `ease-out` — dropdowns, tabs                  |
| `base`    | 240ms    | `cubic-bezier(0.2, 0, 0, 1)` — sheets, modals |
| `slow`    | 400ms    | same — page transitions                       |

Respect `prefers-reduced-motion`: disable the rescue-status pulse and all transforms, keep opacity fades.

---

## 6. Iconography

**lucide-react**, ships with shadcn/ui.

| Context                | Size                                         | Stroke |
| ---------------------- | -------------------------------------------- | ------ |
| Inline with text       | 16                                           | 2      |
| Buttons, table actions | 18                                           | 2      |
| Sidebar nav            | 20                                           | 2      |
| Section headers        | 20 in a 40px rounded-square tinted container | 2      |
| KPI card corner        | 18 in a 32px rounded-square                  | 2      |
| Empty states           | 40                                           | 1.5    |

**Fixed icon assignments** — keep these stable so users learn them:

| Concept              | Icon                    |
| -------------------- | ----------------------- |
| Household / registry | `Users`                 |
| Member               | `User`                  |
| Map / area           | `Map`, `MapPin`         |
| Flood / water level  | `Waves`                 |
| Weather              | `CloudRain`             |
| Alert                | `TriangleAlert`         |
| Safe                 | `ShieldCheck`           |
| Rescue               | `LifeBuoy`              |
| Evacuation center    | `Building2`             |
| Donation             | `HandHeart`             |
| Activity             | `CalendarDays`          |
| Preparedness guide   | `BookOpen`              |
| Analytics            | `BarChart3`             |
| Health worker        | `Stethoscope`           |
| Hotline              | `Phone`                 |
| Siren / alert unit   | `Megaphone` / `Volume2` |

---

## 7. Component Library

Two layers. **Install the shadcn primitives, then build the app's own composites on top of them** — never restyle a shadcn component in place, and never use a raw primitive directly in a page.

```
components/
├── ui/          ← shadcn primitives, installed via CLI. Do not edit except for token wiring
├── common/      ← app composites built FROM ui/. This is what pages import
└── features/    ← domain components (registry, map, alerts, donations…)
```

### 7.1 shadcn/ui primitives to install

```bash
make shadcn
```

The list lives in `tools/install_shadcn.py` so it exists in exactly one place and a re-run is one command. Re-running is safe and overwrites — primitives are not edited except for token wiring (NFR-MNT-006), and that wiring lives in `globals.css`.

```
accordion alert alert-dialog avatar badge breadcrumb button calendar card
chart checkbox collapsible command dialog dropdown-menu field hover-card
input label navigation-menu pagination popover progress radio-group
scroll-area select separator sheet sidebar skeleton slider sonner switch
table tabs textarea toggle tooltip
```

> **`form` became `field`.** An earlier draft listed `form`. In the current shadcn registry `form` is an empty stub — it was superseded by `field`, which composes with React Hook Form and Zod directly (`FieldError` takes RHF's error objects). Installing `form` silently does nothing, which is worse than failing. `field` also pulls in `input-group`, and `sidebar` pulls in `use-mobile`.

| Primitive                                                                                      | Used by                                                     |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `button`, `input`, `label`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `field` | Registration, all admin forms                               |
| `table`                                                                                        | `ResourceTable` and feature-local operational tables        |
| `badge`                                                                                        | Every status indicator                                      |
| `card`                                                                                         | Every panel                                                 |
| `avatar`                                                                                       | User identity cells                                         |
| `dropdown-menu`, `popover`, `hover-card`, `tooltip`                                            | Row actions, filters, info hints                            |
| `dialog`, `alert-dialog`, `sheet`                                                              | Modals, confirmations, mobile nav                           |
| `tabs`                                                                                         | Analytics tab row                                           |
| `sidebar`                                                                                      | Admin shell — shadcn's sidebar handles collapse and mobile  |
| `breadcrumb`                                                                                   | Admin topbar                                                |
| `pagination`                                                                                   | Table footers                                               |
| `sonner`                                                                                       | Toasts                                                      |
| `skeleton`                                                                                     | Loading states                                              |
| `command`                                                                                      | Global search (⌘K), area pickers                            |
| `calendar`                                                                                     | Activity scheduling, date filters                           |
| `chart`                                                                                        | Recharts wrapper for M10                                    |
| `progress`                                                                                     | Evacuation occupancy and other bounded operational progress |
| `alert`                                                                                        | Inline warnings                                             |
| `accordion`, `collapsible`                                                                     | FAQs, preparedness guides                                   |
| `scroll-area`                                                                                  | Long lists                                                  |
| `separator`                                                                                    | Dividers                                                    |

### 7.2 Custom composites — `common/` and `features/`

These are the app's actual vocabulary. Each is built from primitives above.

#### Layout

| Component         | Description                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PublicShell`     | Utility bar + navbar + content + footer                                                                                                                                                                                              |
| `AdminShell`      | Desktop-first console frame: dark forest navigation rail, 56px white breadcrumb/profile bar, and a pale work canvas. At `<lg`, the rail becomes a 320px sheet under a dark mobile bar; the breadcrumb moves into its own white strip |
| `TopUtilityBar`   | `primary-950` strip: phone, address, office hours. `36px`, `body-sm`, white                                                                                                                                                          |
| `PublicNavbar`    | White, `72px`. Logo left, nav centre; guests get Login (filled pill) + Register (outline pill), while signed-in users get one `Return to Portal` action to their role destination. Collapses to a `sheet` on mobile                  |
| `AdminSidebar`    | `primary-950`, `256px`. Logo block, grouped expandable navigation, persistent active rail, and `View public site` at the bottom. Navigation stays fully expanded after reload; officers may collapse groups temporarily              |
| `AdminTopbar`     | White, `56px`. Route breadcrumb left; staff avatar/name/role menu right. Sign-out lives in that profile menu, so the shell does not duplicate it in the rail                                                                         |
| `PageHeader`      | Title + optional description + right-aligned action slot. **Public site only** — the console uses `AdminPageHeader`                                                                                                                  |
| `AdminPageHeader` | Soft green/teal, rounded work-surface header: route icon, `h1`, one context line, optional action, and optional metadata. It remains compact relative to the public hero; on small screens the action separates beneath the title    |
| `SectionHeader`   | Tinted rounded-square icon + title + description line. Used at the top of every content card                                                                                                                                         |
| `Footer`          | Barangay info, contacts, socials, hotline, copyright (BR-0.12)                                                                                                                                                                       |
| `LogoLockup`      | Inline SVG mark + `APP_NAME` wordmark, with a variant for dark surfaces; the final logo asset remains an open brand decision                                                                                                         |
| `Reveal`          | Public-site scroll reveal using CSS `animation-timeline: view()` behind `@supports`, so it needs no observer or JavaScript                                                                                                           |

#### Data display

| Component                              | Description                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResourceTable`                        | The console directory composite. Owns search, categorical filtering, three-state sorting, ten-row paging, loading/error/empty states, and its responsive switch from a dark-green headed table to labelled record cards. Pages provide data, columns, filters, and row actions rather than recreating its chrome                                        |
| `StatCard`                             | White card, `overline` label, `display-md` value, optional caption and trend                                                                                                                                                                                                                                                                            |
| `AssetMetricStrip` / `AssetMetricCard` | Five-or-fewer compact, tinted operational cards: icon chip and label above a tabular value/unit and a right-aligned consequence. Tone signals readiness, capacity, occupancy, or asset state; it is used before the linked asset map, not as generic dashboard decoration                                                                               |
| Contextual metric groups               | Registry ribbons, announcement summary cards, emergency snapshots, and weather tiles deliberately share hierarchy (label → value → consequence) but retain domain-specific grouping. Do not force them into one universal card                                                                                                                          |
| `StatusBadge`                          | `badge` wrapper mapping a domain status to its palette (Section 3.4). Variants: `verified`, `pending`, `safe`, `unaccounted`, `needs-rescue`, `alert-1/2/3`, `vulnerability-*`                                                                                                                                                                          |
| `TagList`                              | Row of small outline pills with a `+N` overflow chip — the systems column in the reference                                                                                                                                                                                                                                                              |
| `UserIdentityCell`                     | Avatar with initials (`primary-100` fill, `primary-800` text) + name + email stacked                                                                                                                                                                                                                                                                    |
| `RelativeDateCell`                     | Absolute date above, relative time below in `caption`                                                                                                                                                                                                                                                                                                   |
| `DataFreshness`                        | Timestamp + source + a **stale** marker past a threshold. **Required on every weather and river reading** (BR-3.8)                                                                                                                                                                                                                                      |
| Weather & Flood Watch workspace        | Console tabs for the cached weather/river overview, river-alert review, and role-gated manual field entry. It reuses the resident-facing panels so staff and residents interpret the same measurement, while retaining the human-issued alert boundary                                                                                                  |
| `EmergencyResponseMap`                 | Private, event-selected Leaflet view for area-scoped household safety operations. Warm hazard-risk pin fills come from exact static-layer intersection (survey fallback labelled); gray means every current member is safe, while rescue keeps the risk fill with a high-contrast outline. Never shares or mutates a finalized public map configuration |
| `AdminAssetWorkspaceMap`               | Private dark-base asset map for facilities, evacuation centres, and sirens. It pairs persistent legend/layer cards with a selected asset/filter rail; map selection and table selection remain one state                                                                                                                                                |
| `ResponseOperationsWorkspace`          | Live rescue/incident worklist: priority metrics, independently filterable map and table, 60-second refresh, and a contextual detail/triage surface. Rescue and incident routes share anatomy, not terminology                                                                                                                                           |
| `RegistrySummaryRibbon`                | Area-scoped coverage strip for the household and citizen workspaces: four plain-language metrics plus compact area bars. It derives from the same summary endpoint as the registry tables and stacks at narrow widths                                                                                                                                   |
| `RegistryHouseholdForm`                | Shared household edit surface for BHW/admin console records and resident heads; protects account-linked head names and keeps contact/address fields aligned                                                                                                                                                                                             |
| `RegistryMemberForm`                   | Shared citizen profile editor for support flags, relationship, and birth/sex fields. Reused by console and resident portal so the PII form has one validation shape                                                                                                                                                                                     |
| `EmptyState`                           | Icon, title, description, optional action                                                                                                                                                                                                                                                                                                               |
| `TableSkeleton` / `CardSkeleton`       | Loading placeholders                                                                                                                                                                                                                                                                                                                                    |
| `WaterSpinner`                         | The public site's loading indicator: a droplet falling into a rippling surface inside two counter-precessing rings. Green — a spinner in the hazard ramp (Section 3.4) would read as an active warning. Pure CSS on static markup, so it renders inside a Server Component's `<Suspense fallback>` and ships no JavaScript                              |
| `Section*Skeleton`                     | One `<Suspense fallback>` per landing section, each reproducing its section's real grid so nothing shifts when content streams in. Pairs grey shapes with a `WaterSpinner` — shapes alone cannot distinguish "still loading" from "broken" (FR-PUB-016)                                                                                                 |
| `ErrorState`                           | Failure message + retry. Section-level, so one dead feed does not blank the page (BR-0.17)                                                                                                                                                                                                                                                              |

> **Known August 11 gap.** Staging uses green/yellow/red freshness colour and a relative timestamp,
> but the stale state is not consistently named in text. Keep the explicit stale label/icon
> requirement: colour alone fails NFR-UX-002. This remains later UI work, not a reason to weaken
> the requirement.

#### Controls

| Component               | Description                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                | Wraps shadcn `button`. Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`, `emergency`. Sizes `sm/md/lg`. `pill` prop for the public site                                                                             |
| `ResourceTable` toolbar | Rounded search field with explicit clear control, an outlined filter select with record counts, and a reset action only while the result set is changed. It is one control band, not separate page-specific search/filter widgets |
| Directory row actions   | Small coloured actions remain visible at desktop and become labelled actions inside the responsive record-card footer. View is emerald, edit amber, and destructive action rose/red; no action relies on hover alone              |
| `ConfirmDeleteButton`   | High-contrast destructive `alert-dialog`: identifies the record, explains the consequence, and presents Cancel before the destructive action. It confirms the action; it does not claim typed confirmation                        |

#### Emergency-specific

| Component              | Description                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmergencyAlertBanner` | Full-width takeover at the top of the page when an alert is active (BR-0.18). Danger palette, alert level, instruction, timestamp. Not dismissible while active |
| `HotlineButton`        | Persistent floating action, always reachable without scrolling (BR-0.15). `tel:` links on mobile                                                                |
| `HotlineList`          | One-tap callable directory (BR-0.7)                                                                                                                             |
| `AlertLevelIndicator`  | Three-segment gauge showing current river alert level with the threshold value                                                                                  |
| `SafetyStatusControl`  | Per-member and whole-household marking. **The bulk action lists the members it covers and requires explicit confirmation** (BR-5.1b)                            |
| `RescueRequestForm`    | Works without an account (BR-5.9). Minimal fields, large tap targets                                                                                            |

#### Maps

| Component        | Description                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `HazardMap`      | Leaflet + OSM. Hazard polygon layers, facility pins, layer toggles, legend, attribution                               |
| `LocationPicker` | **Draggable pin, primary path.** GPS button appears only when `window.isSecureContext` is true (tech_stack Section 9) |
| `ZoneMap3D`      | React Three Fiber. Extruded area polygons coloured by risk. Orbit controls, click-to-select, `Suspense` fallback      |
| `MapLegend`      | Shared legend, driven by the domain palettes in Section 3.4                                                           |

**Protected public map views.** These three configurations were finalized on August 11, 2026.
Do not change their center, zoom, or hazard-layer default while building portal/admin maps.

| Public view         | Route                  | Center `[lat, lon]`   | Zoom    | Hazard overlay |
| ------------------- | ---------------------- | --------------------- | ------- | -------------- |
| Landing preview     | `/`                    | `[14.7415, 121.1315]` | `13.38` | Enabled        |
| Flood Hazard Map    | `/hazard-map`          | `[14.7415, 121.1315]` | `14.25` | Enabled        |
| Barangay Facilities | `/barangay-facilities` | `[14.7435, 121.1305]` | `14.15` | Disabled       |

Future resident/admin map requirements get isolated views or wrapper components. They must not
change shared defaults in a way that alters these three public presentations.

**Structure and support**

| Component         | Description                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SectionBoundary` | Wraps one section in an error boundary so a single failed feed degrades that section only (FR-PUB-016). Built on Next's `catchError`. **This, not `error.tsx`, is the mechanism** — a route-level boundary replaces the whole page body, which is the failure BR-0.17 forbids |
| `MeterBar`        | Zero-JavaScript `role="progressbar"` bar for evacuation occupancy and other bounded operational progress. Exists instead of `ui/progress`, which carries `"use client"` and would pull a client boundary into the landing page for a static bar                               |
| `Attribution`     | Data credits and legal disclaimers (NFR-LGL-001…005, FR-MAP-008). Licence terms, not footer decoration — the NOAH data is ODC-ODbL                                                                                                                                            |

#### Article content

Announcements, activities, and donation drives remain separate modules but use the same visual
authoring and reading patterns. This is the presentation contract for `FR-ALT-013`–`015`,
`FR-ACT-010`–`012`, `FR-DON-015`–`017`, and `FR-PUB-019`–`020`. Emergency alerts remain
text-first and do not require media.

The announcement CMS is the reference portal composition: future admin content screens should
preserve its page-header → primary editor → right-rail anatomy, responsive behaviour, and
publication workflow rather than inventing a parallel layout.

| Composite                   | Contract                                                                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AnnouncementForm`          | Shared create/edit admin surface: constrained Tiptap body, type/category/severity classification, title/excerpt/instruction, targeting, and publication controls. The right rail is media → targeting → publishing; edit injects its persistent media manager.                          |
| `RichTextEditor`            | Client-only Tiptap toolbar limited to H2/H3, paragraph, bold, italic, bullet/ordered list, blockquote, and safe links. No inline image, raw HTML, table, script, iframe, or embed node.                                                                                                 |
| `ArticleImageManager`       | Upload/reorder gallery, cover selection, count `n/10`, and per-file validation errors. Drafts may be image-free; Publish stays disabled until exactly one cover exists. Alt text and captions are intentionally not collected.                                                          |
| `AnnouncementCard`          | 16:10 cover (or styled gradient header fallback), kind/severity badge, title, excerpt, PHT timestamp, location, and canonical detail link. Emergency alerts retain high-contrast guidance treatment.                                                                                    |
| `AnnouncementImageCarousel` | Cover-first ordered media carousel for public announcement details. It waits for the page splash to finish, then auto-advances every three seconds when motion is allowed, pauses during pointer/keyboard interaction, and exposes 44px previous/next controls.                         |
| `ArticlePreviewDialog`      | Responsive viewport-bounded admin/form preview with a stable header, 44px close target, and one internal scroll region for long articles and cover images.                                                                                                                              |
| `AnnouncementDetailView`    | Constrained announcement reading column with domain metadata and one responsive media carousel. The cover is the initial slide; auto-advance starts after the page splash and runs every three seconds when motion is allowed, while previous/next controls expose every ordered image. |
| `ArticleDetail`             | Constrained reading column, full rich body, domain metadata, then ordered article media for activity and donation-drive detail pages.                                                                                                                                                   |
| `PublicationStatusBadge`    | `draft`, `published`, and `archived`; text and icon accompany colour.                                                                                                                                                                                                                   |

Article media uses `next/image` with explicit dimensions. Preserve the original file; the UI uses
`object-fit: cover` only for preview crops. Announcement detail keeps all ordered images in one
fixed-aspect carousel, while activity and donation-drive details retain their ordered media layout.
On 360px screens the editor toolbar wraps without horizontal scrolling. The announcement form keeps
Type and Category in one compact row, stacks long-form content below, and moves the right rail below
the editor.
Emergency takeover banners remain text-first and never wait for article media.

### 7.2.1 Canonical coded patterns — Public Site and Barangay Portal

The current code is the pattern library for the pitch. A **component** has a reusable API and is
used by several screens; a **composition** is a repeatable arrangement of components, data, and
actions. Both are design-system assets. Do not duplicate a composition just because it is not one
file, and do not extract a new `common/` component until it has stable behaviour across domains.

| Surface                          | Canonical composition                                                                                                                                                                                                                           | Reuse before writing another                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public shell                     | Service-first utility bar, public navigation, content, footer, alert/hotline affordances, and one splash lifecycle                                                                                                                              | `PublicShell`, `PublicNavbar`, `PageSplashLoader`, `EmergencyAlertBanner`, `HotlineButton`                                                             |
| Public route intro               | Breadcrumb → expressive page title/description → optional action, on a light green-to-white band                                                                                                                                                | `PageHeader`; do not use an admin header or make a one-off hero                                                                                        |
| Public content section           | Overline/icon → two-tone section heading → explanatory copy → optional View All → purpose-built content deck                                                                                                                                    | `SectionHeader`, `SectionBoundary`, section skeletons, domain cards                                                                                    |
| Public editorial reading         | Calm article reading column with domain metadata and ordered media; announcement detail may add a recent-content rail                                                                                                                           | `AnnouncementDetailView`, `ArticleDetail`, cards and media carousels                                                                                   |
| Barangay Portal shell            | Dark forest navigation rail, route-aware breadcrumbs, compact white workspace, staff profile menu                                                                                                                                               | `AdminShell`, `AdminBreadcrumbs`, `ADMIN_CATEGORIES`; never recreate local navigation                                                                  |
| Barangay Portal workspace        | Compact action-oriented header → optional KPI/metric strip → single connected work surface → contextual dialogs/drawers                                                                                                                         | `AdminPageHeader`, `AssetMetricStrip`, `EmptyState`, `ErrorState`, skeletons                                                                           |
| Barangay Portal directory        | Header action → domain summary where it changes a decision → one shared search/filter band → sortable forest-green table → labelled record cards below `md`                                                                                     | `ResourceTable`, registry summaries, `ConfirmDeleteButton`; pages provide columns, filters, and domain actions rather than reimplementing table chrome |
| Barangay Portal authoring        | Header → primary editor/form → contextual right rail for media, targeting, publishing, or provenance; rail stacks below on narrow screens                                                                                                       | `AnnouncementForm`, `ActivityForm`, `DonationDriveForm`, `GuideEditor`, `ArticleImageManager`, preview dialogs                                         |
| Barangay Portal asset operations | Five-card operational strip → dark spatial workspace with a left legend and right layer/filter or selected-asset rail → filtered directory below. Creation/edit/details stay in focused dialogs so map context is not discarded                 | `AdminAssetWorkspaceMap`, `AssetMetricStrip`, facility/evacuation/siren dialogs                                                                        |
| Emergency event control room     | Dark event-context band first (live state, incident type, declared time, elapsed time, high-consequence action) → four task tabs → selected operation. The tab changes the work surface without losing the selected event                       | emergency overview, `EmergencyResponseMap`, `SafetyLedgerTab`, `SafetyJourneyDrawer`                                                                   |
| Emergency response worklist      | Priority/status snapshot → dark operational map with independent filters → worklist with its own filters and a contextual triage/detail surface. The map and table are coordinated, not duplicate presentations                                 | `ResponseOperationsWorkspace`, `ResponseOperationsMap`, `ResourceTable`, rescue/incident dialogs                                                       |
| Weather & flood watch            | Header → three operational tabs. Overview keeps weather forecast and river gauge side-by-side; the gauge remains authoritative for alert level while the forecast provides context. Manual entry and prompt review remain focused task surfaces | `WeatherPanel`, `RiverLevelPanel`, `DataFreshness`, threshold-review and manual-entry panels                                                           |

The public site earns attention through roomy hierarchy, descriptive copy, and restrained reveal
motion. The Barangay Portal earns trust through information density, stable locations for actions,
green operational chrome, and plain-language status. They share tokens and accessible primitives,
not the same header or page anatomy.

**Extraction test.** Keep a pattern feature-local when it carries domain terminology, workflow, or
data ownership (for example, an evacuation check-in dialog). Promote it to `features/admin` when
several portal modules share the same operational behaviour (for example, `ResourceTable`), and to
`common` only when it is equally valid outside that domain (for example, `EmptyState` or `Button`).
This avoids both copy-paste drift and a vague “universal card” that makes every screen look alike.

**Primitive exception.** A specialist, single-route portal interaction may use a raw shadcn
mechanic (such as a dialog, select, or field control) when no composite fits. That is an
implementation detail, not a visual pattern: it must remain inside the canonical portal
composition and use its established chrome. Do not use the exception to reconstruct shared
headers, cards, buttons, tables, or form-dialog layouts. Promote a behaviour used by a second
route to `features/admin`.

### 7.3 Component specs

**Buttons**

| Variant     | Fill          | Text          | Border        | Hover                        |
| ----------- | ------------- | ------------- | ------------- | ---------------------------- |
| `primary`   | `primary-600` | white         | —             | `primary-700`                |
| `secondary` | `primary-100` | `primary-800` | —             | `primary-200`                |
| `outline`   | white         | `neutral-700` | `neutral-300` | `neutral-50`                 |
| `ghost`     | transparent   | `neutral-600` | —             | `neutral-100`                |
| `danger`    | `#B91C1C`     | white         | —             | `#991B1B`                    |
| `emergency` | `#B91C1C`     | white         | —             | pulse animation, larger size |

Heights: `sm` 32 · `md` 40 · `lg` 48.

The `danger` hover value `#991B1B` is carried in `globals.css` as `--color-danger-hover`. It belongs to this table rather than Section 3.3, which is why the original token transcription missed it.

**Tap targets:** 44×44 minimum on touch, **48×48 for anything used during an emergency** — safety check-in, rescue request, hotline. Where a visual button is smaller than its target, pad the hit area rather than enlarging the button (Section 9.7).

> **The mechanism is `.tap-44` / `.tap-48`** in `globals.css`: a centred `::after` pseudo-element with a minimum size, under `@media (pointer: coarse)`. A 32px `sm` button therefore keeps its 32px appearance and gains a 44px hit region, and the rule costs nothing with a mouse. `Button` applies `.tap-44` to `size="sm"` and forces `.tap-48` plus `min-h-12` on `variant="emergency"` whatever size the caller passed — the emergency floor is not something a call site can opt out of.

**Table** (matching the reference)

- Header: `primary-800` background, white `overline` text, sort arrows
- Rows: white / `primary-50` alternating, `neutral-200` hairline separators
- Row hover: `primary-50`; selected: `primary-100`
- Cell padding: `12px 16px`; row height `64px` where a cell has two lines
- Sticky header on scroll
- Footer: `primary-50`, result count left, pagination right
- Pagination: active page is a filled `primary-800` square

**Badges**

`sm` radius, `11px` weight 600, `2px 8px` padding, background + text from the relevant palette. Outline variant for neutral tags.

**Cards**

White, `lg` radius, `1px` `neutral-200` border, no shadow at rest. `24px` padding. `SectionHeader` at the top where the card has a title.

**Forms**

- Labels above inputs, `label` token
- Input height `40px`, `md` radius, `neutral-300` border, `ring` on focus
- Errors below in danger text with an icon — never colour alone
- Required marked with `*` **and** described in the field's helper text
- Group household member fields into repeatable collapsible cards

---

## 8. Public Site vs Admin Console

The same tokens, deliberately different personalities.

|         | Public site                         | Admin console                                                         |
| ------- | ----------------------------------- | --------------------------------------------------------------------- |
| Density | Generous — `48px+` section spacing  | Compact — `24px`                                                      |
| Radius  | `full` on buttons, `xl` on cards    | `md` on buttons, `lg` on cards                                        |
| Type    | `body-lg` (17px)                    | `body` (15px)                                                         |
| Imagery | 3D illustration, photography        | Functional previews only — article media management is not decorative |
| Colour  | Green gradients, tinted hero panels | White surfaces, green accents                                         |
| Motion  | Scroll reveals, carousel            | Minimal — state changes only                                          |
| Goal    | Reassure and inform                 | Get work done quickly                                                 |

**Demo-freeze boundary, not a screen spec.** The August 16 demo freeze approves the Public
Information Site and Barangay Portal presentation as the pitch baseline. The Resident Portal is
still limited to its existing household, safety, and incident-report routes pending its full design
pass; the About page also awaits its team-profile content and revision. Preserve the
verified workflows; define future household editing, alerts, activities, volunteer, go-bag, and
notification screens with stakeholders before drawing them. The cut assistance tracker must not
return through the redesign.

> For the comprehensive inventory of finished and implemented pages across Public, Resident Portal,
> and Barangay Admin surfaces, see [`apps/web/docs/structure.md#core-routes--architectural-reference`](../apps/web/docs/structure.md#core-routes--architectural-reference).

---

## 9. Responsive & Device Strategy

### 9.1 Who is on what

Responsiveness is not one problem here. Different users hit this from genuinely different devices, and two of the flows are **mobile-first, not mobile-tolerant**.

| User                               | Primary device                                        | Priority                                                  |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Resident — public site             | Low-end Android phone, 360–412px, slow connection     | **Mobile-first**                                          |
| Resident — portal, safety check-in | Same phone, possibly during a flood                   | **Mobile-first**                                          |
| **BHW — assisted registration**    | Phone or budget tablet, standing in someone's doorway | **Mobile-first.** This is field data entry, not desk work |
| Barangay admin — console           | Desktop in the barangay hall                          | Desktop-first, must remain usable on tablet               |
| BDRRMC — during an emergency       | Whatever is in their hand                             | **All admin emergency screens must work on a phone**      |

> **The BHW case is the one usually missed.** BR-1.2 and BR-1.36 describe a health worker registering a whole household — head plus every member, with vulnerability flags — in a single visit. That is a long form completed one-handed, on a phone, possibly outdoors in sunlight, likely offline-ish. Designing it desktop-first and shrinking it will not work.

### 9.2 Breakpoints

Tailwind defaults, with a note on what each actually represents here.

| Token    | Min width | Represents                                                        |
| -------- | --------- | ----------------------------------------------------------------- |
| _(base)_ | 320px     | Smallest Android phones — **must not break**                      |
| `sm`     | 640px     | Large phones, small phones landscape                              |
| `md`     | 768px     | Tablets portrait                                                  |
| `lg`     | 1024px    | Tablets landscape, small laptops — **admin sidebar appears here** |
| `xl`     | 1280px    | Desktop                                                           |
| `2xl`    | 1536px    | Large desktop                                                     |

**Design at 360px first.** If it works there it works everywhere; the reverse is not true.

### 9.3 Shell behaviour

| Component       | `<lg`                                                                                                               | `≥lg`                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `AdminSidebar`  | Hidden; opens as a 320px `sheet` from the dark 56px mobile bar                                                      | Sticky 256px forest rail                                           |
| `AdminTopbar`   | Dark 56px mobile bar with hamburger, mark, and avatar-only profile menu; breadcrumb moves to a separate white strip | White 56px bar: breadcrumb left, staff identity/profile menu right |
| `PublicNavbar`  | Logo + hamburger; nav in a `sheet`. **Login and the hotline stay visible outside the menu**                         | Full horizontal nav                                                |
| `TopUtilityBar` | Hidden — the information moves to the footer. Exception: hotline number stays                                       | Full strip                                                         |
| `PageHeader`    | Title stacks above actions; actions become full-width or an overflow menu                                           | Title left, actions right                                          |
| Content gutters | 16px                                                                                                                | 24px, then 32px at `xl`                                            |
| Card padding    | 16px                                                                                                                | 24px                                                               |

### 9.4 `ResourceTable` on small screens

An eight-column table does not fit 360px, and horizontal scrolling through a directory is miserable.
Below `md`, `ResourceTable` switches to its one deliberate mobile form: a record card with the
first column as identity, remaining fields in a two-column label/value grid, and a labelled action
footer. Search and categorical filtering remain visible above the cards; sorting is desktop-only.

This is the appropriate pattern for registries and content directories. Map and emergency
workspaces use their own task-specific lists rather than pretending they are generic directories.

### 9.5 Component-level rules

| Component                              | Small-screen behaviour                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AssetMetricStrip`                     | Two columns at base, three at `sm`, five at `lg`. It may wrap; it must preserve label, value, unit, and consequence without a horizontal carousel                     |
| `StatCard`                             | Full width stacked; `display-md` drops to 28px                                                                                                                        |
| `ResourceTable` toolbar                | Search becomes full width; filter/reset/action controls wrap below or beside it. The active query remains visible and clearable                                       |
| Directory row actions                  | Stay in a labelled, wrapping action footer on the mobile record card                                                                                                  |
| Charts                                 | Fixed 240px height, legend below not beside, fewer x-axis ticks, tooltip on tap. **Consider a summary table fallback** — a 6-series line chart on 360px is unreadable |
| Forms                                  | Single column always. Sticky footer for the primary action. `inputMode` set correctly — `numeric` for age and weight, `tel` for phone                                 |
| **Member repeater** (BHW registration) | One member per collapsible card, one open at a time. Progress indicator: "Member 2 of 5". Sticky "Add member" and "Save". The form starts fresh on each visit.        |
| `HazardMap`                            | Full-bleed, min 320px tall. Layer toggles in a bottom sheet, not a side panel. Legend collapsible                                                                     |
| `ZoneMap3D`                            | See Section 9.6                                                                                                                                                       |
| `EmergencyAlertBanner`                 | Full width, sticky at top, above everything including the navbar                                                                                                      |
| `HotlineButton`                        | Fixed bottom-right FAB, 56px, above all content and safe-area inset aware                                                                                             |
| Dialogs                                | Retain their focused modal composition; use a page-local or feature dialog only when it preserves the current workspace context                                       |
| `Tabs`                                 | Horizontal scroll with snap; never wrap to two rows                                                                                                                   |

### 9.6 Performance on low-end devices

BR-0.16 requires the public site to be usable on cheap phones over congested connections. That is a design constraint, not just an engineering one.

| Concern             | Rule                                                                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3D map**          | `ZoneMap3D` is **desktop and tablet only** by default. Below `md`, or where `navigator.hardwareConcurrency ≤ 4`, render a static image or the 2D Leaflet map instead. Provide an explicit "View 3D map" opt-in. R3F on a low-end Android will drain battery and stutter |
| Public landing hero | The 3D illustration ships as an optimised static image below `md`, not a live scene                                                                                                                                                                                     |
| Images              | `next/image`, AVIF/WebP, explicit dimensions to prevent layout shift                                                                                                                                                                                                    |
| Fonts               | Two families maximum, `display: swap`, latin subset only                                                                                                                                                                                                                |
| Maps                | Hazard GeoJSON pre-simplified (tech_stack Section 6). Load tiles lazily; never on first paint of the landing page                                                                                                                                                       |
| Charts              | Import Recharts dynamically — it is heavy and only the analytics page needs it                                                                                                                                                                                          |
| Bundle              | Route-level code splitting. Public landing page should be usable well before the portal bundle loads                                                                                                                                                                    |

**Unreliable connections.** A BHW filling a long household form in an alley can lose signal mid-form. The form keeps its in-memory values when a submit fails so the officer can retry, but the product does not persist or restore local household drafts.

Full offline support is **not** in scope — it means a service worker, local storage, and conflict resolution, which is a project of its own against R-8. But the cheap mitigation is worth building:

- **Queue the submit and retry** rather than failing outright when a connection-aware queue is added.
- **Never clear the form on a failed submit.** This is the single most common way field data-entry tools lose people's trust.

Full offline sync and local household drafts are out of scope (D-OI-8).

### 9.7 Touch and ergonomics

| Rule                      | Detail                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Tap targets               | **44×44 minimum**, 48×48 for anything used during an emergency                                          |
| Spacing between targets   | ≥8px — mis-taps in a rescue form are costly                                                             |
| Thumb zone                | Primary actions in the lower third. Sticky form footers, bottom sheets, bottom-right FAB                |
| No hover-only affordances | Anything revealed on hover must have a tap equivalent                                                   |
| Safe areas                | Respect `env(safe-area-inset-*)` for notches and home indicators                                        |
| Orientation               | Both supported. Tables and maps benefit from landscape; nothing may _require_ it                        |
| Sunlight                  | Contrast floor above WCAG AA on outdoor screens — another reason the palette avoids light grey on white |

### 9.8 Testing matrix

Minimum before the pitch:

| Device class                    | Width     | Why                                    |
| ------------------------------- | --------- | -------------------------------------- |
| Small Android                   | 360px     | The realistic resident device          |
| Standard phone                  | 390–412px | Most common                            |
| Tablet portrait                 | 768px     | BHW field device                       |
| Tablet landscape / small laptop | 1024px    | Sidebar breakpoint boundary            |
| Desktop                         | 1440px    | Barangay hall, and the pitch projector |

Test the **deployed** URL on a real phone, not just the browser's device emulator — emulators do not reproduce touch accuracy, real network conditions, or the secure-context behaviour noted in tech_stack Section 9 (T-9).

---

## 10. Accessibility

Not optional — this is a government service used under stress.

| Requirement        | Standard                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrast           | WCAG AA: 4.5:1 body, 3:1 for large text and UI boundaries. **`primary-600` on white passes; `primary-400` does not — never use it for text on light** |
| Never colour alone | Every status carries an icon or text label as well. Alert levels always show the number                                                               |
| Focus              | Visible 2px `ring` on every interactive element. Never remove outlines                                                                                |
| Tap targets        | 44×44 minimum on touch                                                                                                                                |
| Keyboard           | Full traversal; modals trap focus; Esc closes                                                                                                         |
| Screen readers     | Landmarks, live regions for alerts, alt text on map imagery                                                                                           |
| Motion             | Honour `prefers-reduced-motion`                                                                                                                       |
| Zoom               | Usable at 200% without horizontal scrolling                                                                                                           |

**Alert banners must announce via `aria-live="assertive"`.** A resident using a screen reader needs to hear an evacuation order without hunting for it.

---

## 11. Language

Filipino is primary, English secondary (BR-0.19).

- Allow **~30% more width** than the English string for Filipino equivalents — buttons and labels must not clip
- Never concatenate translated fragments; use full parameterised strings
- Keep hotline numbers, area names, and facility names untranslated
- Dates in Filipino locale on the public site

---

### 9.7 Visual Siren Simulation & Audio Feedback (FR-MAP-014, FR-ALT-012)

Although physical IoT siren hardware procurement is out of scope (BR-4.11), a **Visual Siren Simulation & Pin Triggering feature** is built into the interactive map and alert surfaces:

- **`SirenMarker` Component:**
  - **Idle State:** Pin icon with a subtle beacon ring.
  - **Sounding State:** Expanding radial soundwave animation (`animate-ping` + translucent red/amber ripple rings), accompanied by visual pulse vibration feedback on the pin container.
- **Synthesized Audio Playback:**
  - When triggered, the web client initializes a synthesized siren alarm sweep (oscillating between 600 Hz and 1200 Hz over a 1-second period) using the browser's native **Web Audio API** (`AudioContext`).
  - No external audio file assets are required, ensuring instant execution without bandwidth overhead.

---

## 12. Implementation Order

Aligns with the build order in BRD 8.

| Stage | Deliverable                                                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1     | Tokens in `globals.css` + Tailwind config; fonts; `Button`, `Card`, `Badge`, `SectionHeader`                                  |
| 2     | `AdminShell` (sidebar + topbar) and `PublicShell`; `PageHeader` — **including the `<lg` sheet behaviour, not as a follow-up** |
| 3     | **`ResourceTable`** with its record-card mobile variant — directories depend on it                                            |
| 4     | `StatCard`, `AssetMetricStrip`, `StatusBadge`, `EmptyState`, skeletons                                                        |
| 5     | Emergency components — `EmergencyAlertBanner`, `HotlineButton`, `SafetyStatusControl`                                         |
| 6     | Map components, including the `<md` fallback for `ZoneMap3D`                                                                  |
| 7     | Chart theming for M10                                                                                                         |

> Build the shell and `ResourceTable` before any directory screen. Retrofitting its mobile record-card layout later means touching every directory.

> **Build responsive from the start, not as a pass at the end.** Retrofitting a mobile variant onto `ResourceTable` after ten screens depend on it is the single most expensive rework available on this project. Do 360px first for every component.

---

## 13. Open Design Decisions

| #          | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owner                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| ~~D-OI-1~~ | **Resolved: `SAGIP-SJ`** — System for Alert, Guidance, Incident Reporting, and Preparedness (BRD Section 11, D-13). Confirmed by the team's own concept paper, which names the platform outright                                                                                                                                                                                                                                                                    | Resolved                              |
| D-OI-2     | **Logo design** — mark + wordmark, per Section 2                                                                                                                                                                                                                                                                                                                                                                                                                    | Whoever on the team has design skills |
| D-OI-3     | Confirm **Plus Jakarta Sans + Inter**, or substitute                                                                                                                                                                                                                                                                                                                                                                                                                | Whole team                            |
| ~~D-OI-4~~ | **Resolved: moot.** Nutrition-assessment data is cut from scope (BRD D-15, closes OI-2) — there is no status to colour                                                                                                                                                                                                                                                                                                                                              | Resolved                              |
| ~~D-OI-5~~ | **Resolved: the 3D scene is a hero element on the public landing page.** Section 1's fourth principle already licences it — "the 3D map is the one place to be showy". Section 9.6 still binds: it is desktop and tablet only (≥`md` **and** `hardwareConcurrency > 4`), dynamic-imported so `three` never enters the landing bundle (NFR-PERF-007), and every device below the gate gets an inline-SVG isometric illustration plus an explicit "View in 3D" opt-in | Resolved                              |
| D-OI-7     | **Which tables use which mobile variant** (Section 9.4) — decide per table as each screen is designed                                                                                                                                                                                                                                                                                                                                                               | IT lead                               |
| ~~D-OI-8~~ | **Resolved: local BHW household drafts retired from scope** — the form starts fresh per operator workflow; full offline sync with conflict resolution remains out of scope                                                                                                                                                                                                                                                                                          | Resolved                              |
| D-OI-9     | **Print stylesheet** for exported reports (BR-10.7) — the barangay will print for MDRRMO submission. Low effort, easy to forget                                                                                                                                                                                                                                                                                                                                     | IT lead                               |
| D-OI-6     | **Barangay seal usage** — whether the official seal appears, and any LGU brand rules that constrain the palette                                                                                                                                                                                                                                                                                                                                                     | PubAd lead, via barangay              |
