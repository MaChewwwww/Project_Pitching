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
  // Lazy initializer, not an effect — this hook is only ever used from
  // "use client" pages, so `localStorage` is always available synchronously.
  const [hasDraft, setHasDraft] = React.useState(
    () => localStorage.getItem(draftKey) !== null,
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
