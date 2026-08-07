"use client";

import * as React from "react";

import { useLanguage, type Language } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";

/**
 * Filipino ⇄ English (BR-0.19, design.md Section 7.2).
 *
 * This does something real today. `schema.md` Section 11 stores content in
 * `*_fil` / `*_en` column pairs rather than a translation table, so the toggle
 * switches which column guides and FAQs render from.
 *
 * The chrome — nav labels, buttons, section headings — stays English until
 * `next-intl` is wired, which is its own change. Showing a toggle that only moves
 * part of the page is honest about where the translation work has reached; the
 * alternative is hiding it until everything is translated, which loses the point
 * that the *content* already is.
 */

const OPTIONS: { value: Language; label: string; full: string }[] = [
  { value: "fil", label: "FIL", full: "Filipino" },
  { value: "en", label: "ENG", full: "English" },
];

export function LanguageToggle({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);

  return (
    <div
      role="group"
      aria-label="Content language"
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        onDark ? "bg-white/10" : "bg-neutral-100",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={`Show content in ${option.full}`}
            onClick={() => setLang(option.value)}
            className={cn(
              "text-caption tap-44 rounded-full px-2.5 py-1 font-bold transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              active
                ? onDark
                  ? "text-primary-900 bg-white"
                  : "text-primary-800 shadow-sm-card bg-white"
                : onDark
                  ? "text-primary-100/70 hover:text-white"
                  : "text-neutral-500 hover:text-neutral-800",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
