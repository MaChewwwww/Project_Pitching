import * as React from "react";

/**
 * The isometric barangay illustration.
 *
 * Serves three roles at once, which is why it is worth drawing carefully:
 *
 * 1. The **server-rendered shell** the hero paints with on first byte.
 * 2. The **Suspense fallback** while the 3D scene's chunk downloads.
 * 3. The **permanent illustration below `md`** and on low-end devices, where
 *    design.md Section 9.6 forbids a live scene outright.
 *
 * **Why inline SVG rather than `next/image` and an AVIF.** `apps/web/public/` has
 * no binary assets, and adding one would mean a build step to produce it and a
 * download to fetch it. Because this renders from a Server Component the markup
 * ships inside the document — roughly 3 KB gzipped, and **zero bytes against the
 * 250 KB client-JS budget** (NFR-PERF-006). It also scales to any viewport with
 * no srcset and cannot shift layout.
 *
 * Colours are Tailwind classes, never hex, so the illustration follows the tokens
 * in `globals.css` — including the hazard ramp on the ground plates, which makes
 * the picture double as a legend for the hazard map further down the page.
 */

export function BarangayIsometric({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 520"
      className={className}
      role="img"
      aria-labelledby="barangay-iso-title barangay-iso-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="barangay-iso-title">
        Illustration of Barangay San Jose beside the river
      </title>
      <desc id="barangay-iso-desc">
        An isometric drawing of barangay houses, the barangay hall and an evacuation
        centre arranged on ground tinted yellow, orange and red to show low, medium and
        high flood hazard, with the river running along one edge.
      </desc>

      <defs>
        <linearGradient id="iso-river" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-primary-300)]" />
          <stop offset="100%" className="[stop-color:var(--color-primary-500)]" />
        </linearGradient>
      </defs>

      {/* ---- ground plates, tinted by hazard level ------------------------- */}
      {/* High — nearest the river */}
      <path
        d="M320 430 500 336 380 274 200 368Z"
        className="fill-hazard-high/50 stroke-hazard-high/70"
        strokeWidth="1.5"
      />
      {/* Medium */}
      <path
        d="M200 368 380 274 268 216 88 310Z"
        className="fill-hazard-medium/45 stroke-hazard-medium/70"
        strokeWidth="1.5"
      />
      {/* Low — furthest from the river */}
      <path
        d="M268 216 448 122 560 180 380 274Z"
        className="fill-hazard-low/45 stroke-hazard-low/80"
        strokeWidth="1.5"
      />

      {/* ---- river ---------------------------------------------------------- */}
      <path
        d="M500 336 620 274 620 320 560 352 396 438 320 430Z"
        fill="url(#iso-river)"
        opacity="0.85"
      />
      <path
        d="M520 330 604 286M470 356 556 312M424 382 508 338"
        className="stroke-white/40"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ---- barangay hall — the tall block with the flag ------------------- */}
      <g>
        <path d="M262 240 262 176 316 148 316 212Z" className="fill-primary-700" />
        <path d="M316 212 316 148 370 176 370 240Z" className="fill-primary-800" />
        <path d="M262 176 316 148 370 176 316 204Z" className="fill-primary-500" />
        {/* windows */}
        <path d="M276 214 276 196 292 188 292 206Z" className="fill-primary-200/80" />
        <path d="M300 200 300 182 314 175 314 193Z" className="fill-primary-200/80" />
        <path d="M340 202 340 184 356 192 356 210Z" className="fill-primary-300/60" />
        {/* flagpole */}
        <path
          d="M316 148 316 108"
          className="stroke-neutral-400"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M316 110 344 118 316 126Z" className="fill-primary-400" />
      </g>

      {/* ---- evacuation centre — wide, low, with a roof marker -------------- */}
      <g>
        <path d="M150 336 150 292 208 264 208 308Z" className="fill-primary-600" />
        <path d="M208 308 208 264 262 290 262 334Z" className="fill-primary-800" />
        <path d="M150 292 208 264 262 290 204 318Z" className="fill-primary-400" />
        {/* roof marker — a cross, so the building reads as a shelter */}
        <path
          d="M196 288 214 296M205 284 205 300"
          className="stroke-white/90"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M164 312 164 298 180 291 180 305Z" className="fill-primary-100/80" />
      </g>

      {/* ---- houses, high-hazard ground ------------------------------------ */}
      <g>
        <path d="M330 400 330 368 362 353 362 385Z" className="fill-primary-700" />
        <path d="M362 385 362 353 394 368 394 400Z" className="fill-primary-900" />
        <path d="M330 368 362 353 394 368 362 383Z" className="fill-hazard-high/80" />
      </g>
      <g>
        <path d="M398 372 398 342 428 328 428 358Z" className="fill-primary-700" />
        <path d="M428 358 428 328 458 342 458 372Z" className="fill-primary-900" />
        <path d="M398 342 428 328 458 342 428 356Z" className="fill-hazard-high/80" />
      </g>

      {/* ---- houses, medium-hazard ground ---------------------------------- */}
      <g>
        <path d="M186 372 186 344 214 331 214 359Z" className="fill-primary-600" />
        <path d="M214 359 214 331 242 344 242 372Z" className="fill-primary-800" />
        <path d="M186 344 214 331 242 344 214 357Z" className="fill-hazard-medium/85" />
      </g>
      <g>
        <path d="M252 350 252 322 280 309 280 337Z" className="fill-primary-600" />
        <path d="M280 337 280 309 308 322 308 350Z" className="fill-primary-800" />
        <path d="M252 322 280 309 308 322 280 335Z" className="fill-hazard-medium/85" />
      </g>

      {/* ---- houses, low-hazard ground ------------------------------------- */}
      <g>
        <path d="M392 232 392 206 418 194 418 220Z" className="fill-primary-500" />
        <path d="M418 220 418 194 444 206 444 232Z" className="fill-primary-700" />
        <path d="M392 206 418 194 444 206 418 218Z" className="fill-hazard-low/90" />
      </g>
      <g>
        <path d="M452 204 452 178 478 166 478 192Z" className="fill-primary-500" />
        <path d="M478 192 478 166 504 178 504 204Z" className="fill-primary-700" />
        <path d="M452 178 478 166 504 178 478 190Z" className="fill-hazard-low/90" />
      </g>

      {/* ---- trees ---------------------------------------------------------- */}
      {[
        [128, 330],
        [516, 214],
        [352, 262],
        [472, 268],
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
 * Fewer paths, no hazard plates, no trees — on a 360px screen the detail above is
 * illegible anyway, and this keeps the document smaller on exactly the
 * connections least able to afford it (NFR-PERF-001).
 */
export function BarangayIsometricCompact({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 400"
      className={className}
      role="img"
      aria-labelledby="barangay-iso-c-title"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="barangay-iso-c-title">
        Illustration of Barangay San Jose beside the river
      </title>

      <path d="M320 330 520 226 340 140 140 244Z" className="fill-primary-700/30" />
      <path
        d="M520 226 620 174 620 220 396 338 320 330Z"
        className="fill-primary-400/70"
      />

      {/* barangay hall */}
      <path d="M266 200 266 140 318 114 318 174Z" className="fill-primary-700" />
      <path d="M318 174 318 114 370 140 370 200Z" className="fill-primary-800" />
      <path d="M266 140 318 114 370 140 318 166Z" className="fill-primary-500" />

      {/* evacuation centre */}
      <path d="M158 268 158 226 214 200 214 242Z" className="fill-primary-600" />
      <path d="M214 242 214 200 266 226 266 268Z" className="fill-primary-800" />
      <path d="M158 226 214 200 266 226 212 252Z" className="fill-primary-400" />
      <path
        d="M204 224 222 232M213 220 213 236"
        className="stroke-white/90"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* two houses */}
      <path d="M352 294 352 262 384 247 384 279Z" className="fill-primary-700" />
      <path d="M384 279 384 247 416 262 416 294Z" className="fill-primary-900" />
      <path d="M352 262 384 247 416 262 384 277Z" className="fill-primary-500" />

      <path d="M414 232 414 204 442 191 442 219Z" className="fill-primary-600" />
      <path d="M442 219 442 191 470 204 470 232Z" className="fill-primary-800" />
      <path d="M414 204 442 191 470 204 442 217Z" className="fill-primary-400" />
    </svg>
  );
}
