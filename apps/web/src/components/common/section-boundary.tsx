"use client";

import * as React from "react";

import { ErrorState } from "./error-state";

/**
 * Isolates one section's failure from the rest of the page (FR-PUB-016).
 *
 * BR-0.17 is specific: if the weather feed or the map fails, the rest of the page
 * — **and the hotlines in particular** — must still work. A route-level
 * `error.tsx` cannot deliver that, because it replaces the entire page body. So
 * error boundaries go around sections, not around the page.
 *
 * Previously used `catchError` from `next/error`, which Turbopack's CJS/ESM
 * interop evaluates twice in the same chunk and throws
 * "Cannot redefine property: catchError" on the named import.
 *
 * Replaced with a standard React class error boundary — identical behaviour,
 * zero dependency on a Next.js internal export. `notFound()` and `redirect()`
 * both throw special sentinel errors that Next catches above this boundary at
 * the segment level, so they still pass through correctly.
 *
 * The boundary is a Client Component; the section inside it stays a Server
 * Component and ships no JavaScript. That is the whole reason this is worth
 * doing per-section rather than once per page.
 */

interface SectionBoundaryProps {
  sectionName: string;
  children: React.ReactNode;
}

interface SectionBoundaryState {
  error: Error | null;
}

export class SectionBoundary extends React.Component<
  SectionBoundaryProps,
  SectionBoundaryState
> {
  constructor(props: SectionBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): SectionBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log but don't rethrow — the section degrades, the page lives.
    console.error(`[SectionBoundary:${this.props.sectionName}]`, error, info);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          sectionName={this.props.sectionName}
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}
