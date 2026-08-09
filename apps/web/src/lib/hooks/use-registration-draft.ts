"use client";

import * as React from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * FR-REG-012 / `design.md` Section 9.6 — the BHW-assisted form is long,
 * one-handed, and often filled in poor connectivity. Auto-saves to
 * `localStorage` as the officer types; restores only on explicit confirmation
 * (never silently, in case the officer meant to start fresh); **never clears
 * on a failed submit** — that is the single rule `design.md` calls out by
 * name as the thing that loses people's trust in a form.
 */
export function useRegistrationDraft<TFieldValues extends FieldValues>(
  draftKey: string,
  form: UseFormReturn<TFieldValues>,
) {
  // Lazy initializer, not an effect. Every consumer so far has been a
  // "use client" *page*, itself the outermost server-rendered boundary
  // (portal onboarding, the BHW form) — but a "use client" *component*
  // rendered from a Server Component page (the public rescue form) still
  // gets one SSR pass first, where `window`/`localStorage` do not exist.
  // The guard costs nothing on a real client mount and avoids a crash on
  // that first pass; hydration re-runs this initializer for real once the
  // browser takes over, at the cost of a one-frame "no draft" flash if one
  // actually exists — acceptable for a resume-prompt banner.
  const [hasDraft, setHasDraft] = React.useState(
    () => typeof window !== "undefined" && localStorage.getItem(draftKey) !== null,
  );

  React.useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
    // `form` is stable for the component's lifetime (RHF's own guarantee).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  function resume() {
    const saved = localStorage.getItem(draftKey);
    if (saved) form.reset(JSON.parse(saved));
    setHasDraft(false);
  }

  function discard() {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }

  /** Call only from a successful submit — never from a `finally`. */
  function clearOnSuccess() {
    localStorage.removeItem(draftKey);
  }

  return { hasDraft, resume, discard, clearOnSuccess };
}
