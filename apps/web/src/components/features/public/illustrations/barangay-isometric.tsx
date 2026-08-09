import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The hero illustration — an isometric view of the barangay in the rain.
 *
 * **Why this is not the 3D scene it replaced.** An earlier version rendered the
 * six areas as extruded blocks in React Three Fiber. It was technically live and
 * visually flat: six untextured boxes on a plane read as a chart, not a place,
 * and it dragged in `three` (890 KB) for the privilege. The 3D zone map is a real
 * requirement — FR-MAP-011 — but it belongs in the map module against surveyed
 * area geometry, which is still an open item (BRD OI-3). Faking that geometry in
 * the hero produced something authoritative-looking and untrue.
 *
 * So: hand-drawn inline SVG, animated in CSS.
 *
 * - **Zero JavaScript.** It renders from a Server Component, so it ships as
 *   markup in the document — roughly 4 KB gzipped and *nothing* against the
 *   250 KB client-JS budget (NFR-PERF-006). The animation is CSS, which the
 *   browser runs off the main thread.
 * - **Every colour is a token class.** No hex here; the hazard plates use the
 *   official Philippine ramp, so the illustration doubles as a legend for the map
 *   further down the page.
 * - **Motion is ambient and gated.** Rain, water shimmer, a beacon over the
 *   evacuation centre, a drifting flag. All of it stops under
 *   `prefers-reduced-motion` — see the keyframes block in `globals.css`.
 *
 * The scene is deliberately literal: the river is on the low side, the two
 * nearest blocks sit on red ground, the evacuation centre is uphill and marked.
 * That is the barangay's actual situation, drawn.
 */

/** Rain streaks, staggered so they do not fall in lockstep. */
const RAIN = [
  { x: 120, y: 40, d: "0s" },
  { x: 210, y: 10, d: "0.35s" },
  { x: 300, y: 60, d: "0.8s" },
  { x: 385, y: 20, d: "0.2s" },
  { x: 470, y: 70, d: "0.95s" },
  { x: 545, y: 30, d: "0.5s" },
  { x: 175, y: 90, d: "1.1s" },
  { x: 425, y: 100, d: "1.25s" },
];

export function BarangayIsometric({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 520"
      className={cn("overflow-visible", className)}
      role="img"
      aria-labelledby="iso-title iso-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="iso-title">Barangay San Jose beside the river, in the rain</title>
      <desc id="iso-desc">
        An isometric illustration of the barangay. Houses nearest the river stand on
        ground tinted red for high flood hazard, the middle of the barangay on orange for
        medium, and the higher ground on yellow for low. The barangay hall flies a flag
        and the evacuation centre is marked with a pulsing beacon.
      </desc>

      <defs>
        <linearGradient id="iso-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-primary-300)]" />
          <stop offset="100%" className="[stop-color:var(--color-primary-600)]" />
        </linearGradient>
        <radialGradient id="iso-glow" cx="50%" cy="45%" r="55%">
          <stop
            offset="0%"
            className="[stop-color:var(--color-primary-400)]"
            stopOpacity="0.35"
          />
          <stop
            offset="100%"
            className="[stop-color:var(--color-primary-400)]"
            stopOpacity="0"
          />
        </radialGradient>
        {/* Clips the rain to the sky area so streaks do not cross the buildings. */}
        <clipPath id="iso-sky">
          <rect x="0" y="0" width="640" height="300" />
        </clipPath>
      </defs>

      {/* Ambient glow, so the scene sits in light rather than on a flat panel */}
      <ellipse cx="320" cy="250" rx="300" ry="210" fill="url(#iso-glow)" />

      {/* ---- rain ---------------------------------------------------------- */}
      <g clipPath="url(#iso-sky)" className="text-white">
        {RAIN.map((drop) => (
          <line
            key={`${drop.x}-${drop.y}`}
            x1={drop.x}
            y1={drop.y}
            x2={drop.x - 7}
            y2={drop.y + 22}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.45"
            className="iso-rain"
            style={{ animationDelay: drop.d }}
          />
        ))}
      </g>

      {/* ---- ground plates, on the official hazard ramp --------------------- */}
      {/* Low — high ground, furthest from the river */}
      <path
        d="M268 214 448 120 562 178 382 272Z"
        className="fill-hazard-low/40 stroke-hazard-low/70"
        strokeWidth="1.5"
      />
      {/* Medium */}
      <path
        d="M200 368 380 274 268 216 88 310Z"
        className="fill-hazard-medium/45 stroke-hazard-medium/70"
        strokeWidth="1.5"
      />
      {/* High — the riverside strip */}
      <path
        d="M320 430 500 336 380 274 200 368Z"
        className="fill-hazard-high/50 stroke-hazard-high/70"
        strokeWidth="1.5"
      />

      {/* ---- river ---------------------------------------------------------- */}
      <path
        d="M500 336 620 274 620 322 560 354 396 440 318 430Z"
        fill="url(#iso-water)"
        opacity="0.9"
      />
      <g className="text-white">
        {[
          { d: "M520 330 596 291", delay: "0s" },
          { d: "M474 355 552 315", delay: "1.2s" },
          { d: "M430 380 506 341", delay: "2.4s" },
        ].map((line) => (
          <path
            key={line.d}
            d={line.d}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="iso-shimmer"
            style={{ animationDelay: line.delay }}
          />
        ))}
      </g>

      {/* ---- barangay hall, with the flag ---------------------------------- */}
      <g>
        <path d="M262 240 262 176 316 148 316 212Z" className="fill-primary-700" />
        <path d="M316 212 316 148 370 176 370 240Z" className="fill-primary-800" />
        <path d="M262 176 316 148 370 176 316 204Z" className="fill-primary-500" />
        <path d="M276 214 276 196 292 188 292 206Z" className="fill-primary-200/80" />
        <path d="M300 200 300 182 314 175 314 193Z" className="fill-primary-200/80" />
        <path d="M340 202 340 184 356 192 356 210Z" className="fill-primary-300/60" />
        <path
          d="M316 148 316 104"
          className="stroke-neutral-300"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M316 106 346 115 316 124Z" className="fill-primary-400 iso-flag" />
      </g>

      {/* ---- evacuation centre, beacon-marked ------------------------------- */}
      <g className="iso-float">
        <path d="M150 336 150 292 208 264 208 308Z" className="fill-primary-600" />
        <path d="M208 308 208 264 262 290 262 334Z" className="fill-primary-800" />
        <path d="M150 292 208 264 262 290 204 318Z" className="fill-primary-400" />
        <path
          d="M196 288 214 296M205 284 205 300"
          className="stroke-white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M164 312 164 298 180 291 180 305Z" className="fill-primary-100/80" />

        {/* Beacon — two rings out of phase, so it reads as a repeating signal */}
        <circle cx="205" cy="243" r="7" className="fill-primary-300" />
        <circle
          cx="205"
          cy="243"
          r="7"
          className="fill-primary-300/60 iso-beacon"
          style={{ animationDelay: "0s" }}
        />
        <circle
          cx="205"
          cy="243"
          r="7"
          className="fill-primary-300/60 iso-beacon"
          style={{ animationDelay: "1.4s" }}
        />
      </g>

      {/* ---- houses on high-hazard ground ---------------------------------- */}
      {[
        {
          b: "M330 400 330 368 362 353 362 385Z",
          r: "M362 385 362 353 394 368 394 400Z",
          t: "M330 368 362 353 394 368 362 383Z",
        },
        {
          b: "M398 372 398 342 428 328 428 358Z",
          r: "M428 358 428 328 458 342 458 372Z",
          t: "M398 342 428 328 458 342 428 356Z",
        },
      ].map((house) => (
        <g key={house.b}>
          <path d={house.b} className="fill-primary-700" />
          <path d={house.r} className="fill-primary-900" />
          <path d={house.t} className="fill-hazard-high/85" />
        </g>
      ))}

      {/* ---- houses on medium-hazard ground -------------------------------- */}
      {[
        {
          b: "M186 372 186 344 214 331 214 359Z",
          r: "M214 359 214 331 242 344 242 372Z",
          t: "M186 344 214 331 242 344 214 357Z",
        },
        {
          b: "M252 350 252 322 280 309 280 337Z",
          r: "M280 337 280 309 308 322 308 350Z",
          t: "M252 322 280 309 308 322 280 335Z",
        },
      ].map((house) => (
        <g key={house.b}>
          <path d={house.b} className="fill-primary-600" />
          <path d={house.r} className="fill-primary-800" />
          <path d={house.t} className="fill-hazard-medium/90" />
        </g>
      ))}

      {/* ---- houses on high ground ------------------------------------------ */}
      {[
        {
          b: "M392 232 392 206 418 194 418 220Z",
          r: "M418 220 418 194 444 206 444 232Z",
          t: "M392 206 418 194 444 206 418 218Z",
        },
        {
          b: "M452 204 452 178 478 166 478 192Z",
          r: "M478 192 478 166 504 178 504 204Z",
          t: "M452 178 478 166 504 178 478 190Z",
        },
      ].map((house) => (
        <g key={house.b}>
          <path d={house.b} className="fill-primary-500" />
          <path d={house.r} className="fill-primary-700" />
          <path d={house.t} className="fill-hazard-low/90" />
        </g>
      ))}

      {/* ---- trees ---------------------------------------------------------- */}
      {[
        [128, 330],
        [516, 212],
        [352, 262],
        [472, 266],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path
            d={`M${x} ${y} ${x} ${y - 14}`}
            className="stroke-primary-900"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={x} cy={y - 22} r="11" className="fill-primary-500" />
          <circle cx={x - 5} cy={y - 17} r="7" className="fill-primary-600" />
        </g>
      ))}
    </svg>
  );
}

/**
 * A lighter variant for phones.
 *
 * Fewer paths, no hazard plates, no rain. On a 360px screen the detail above is
 * illegible anyway, and this keeps the document smaller on exactly the
 * connections least able to afford it (NFR-PERF-001). The beacon stays — it is
 * the one element that carries meaning rather than texture.
 */
export function BarangayIsometricCompact({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 400"
      className={className}
      role="img"
      aria-labelledby="iso-c-title"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="iso-c-title">Barangay San Jose beside the river</title>

      <path d="M320 330 520 226 340 140 140 244Z" className="fill-primary-700/30" />
      <path
        d="M520 226 620 174 620 220 396 338 320 330Z"
        className="fill-primary-400/70"
      />

      <path d="M266 200 266 140 318 114 318 174Z" className="fill-primary-700" />
      <path d="M318 174 318 114 370 140 370 200Z" className="fill-primary-800" />
      <path d="M266 140 318 114 370 140 318 166Z" className="fill-primary-500" />

      <g>
        <path d="M158 268 158 226 214 200 214 242Z" className="fill-primary-600" />
        <path d="M214 242 214 200 266 226 266 268Z" className="fill-primary-800" />
        <path d="M158 226 214 200 266 226 212 252Z" className="fill-primary-400" />
        <path
          d="M204 224 222 232M213 220 213 236"
          className="stroke-white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="212" cy="180" r="6" className="fill-primary-300" />
        <circle cx="212" cy="180" r="6" className="fill-primary-300/60 iso-beacon" />
      </g>

      <path d="M352 294 352 262 384 247 384 279Z" className="fill-primary-700" />
      <path d="M384 279 384 247 416 262 416 294Z" className="fill-primary-900" />
      <path d="M352 262 384 247 416 262 384 277Z" className="fill-hazard-high/80" />

      <path d="M414 232 414 204 442 191 442 219Z" className="fill-primary-600" />
      <path d="M442 219 442 191 470 204 470 232Z" className="fill-primary-800" />
      <path d="M414 204 442 191 470 204 442 217Z" className="fill-hazard-medium/85" />
    </svg>
  );
}
