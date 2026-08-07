"use client";

import { catchError, type ErrorInfo } from "next/error";

import { ErrorState } from "./error-state";

/**
 * Isolates one section's failure from the rest of the page (FR-PUB-016).
 *
 * BR-0.17 is specific: if the weather feed or the map fails, the rest of the page
 * — **and the hotlines in particular** — must still work. A route-level
 * `error.tsx` cannot deliver that, because it replaces the entire page body. So
 * error boundaries go around sections, not around the page.
 *
 * `catchError` is Next's component-level counterpart to `error.js`. Its `retry`
 * re-renders inside a Transition, and `notFound()` / `redirect()` pass through
 * rather than being swallowed as errors — both of which a hand-rolled React error
 * boundary gets wrong.
 *
 * The boundary is a Client Component; the section inside it stays a Server
 * Component and ships no JavaScript. That is the whole reason this is worth
 * doing per-section rather than once per page.
 */
export const SectionBoundary = catchError(
  ({ sectionName }: { sectionName: string }, { retry }: ErrorInfo) => (
    <ErrorState sectionName={sectionName} onRetry={retry} />
  ),
);
