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
  { value: "en", label: "ENG", full: "English" },
  { value: "fil", label: "FIL", full: "Filipino" },
];

export function LanguageToggle({
  onDark = false,
  fullWidth = false,
  className,
}: {
  onDark?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);

  return (
    <div
      role="group"
      aria-label="Content language"
      className={cn(
        "inline-flex items-center rounded-full border transition-colors",
        fullWidth ? "flex w-full p-1" : "h-10 gap-1 p-1",
        onDark
          ? "border-white/15 bg-white/10"
          : "border-neutral-200/80 bg-neutral-100/90",
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
              "flex cursor-pointer items-center justify-center rounded-full text-center font-bold transition-all duration-200",
              fullWidth
                ? "text-caption flex-1 px-3 py-2"
                : "h-8 px-3.5 text-[13px] leading-none font-bold",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              active
                ? onDark
                  ? "text-primary-950 bg-white shadow-xs"
                  : "bg-primary-600 shadow-primary-600/30 text-white shadow-sm"
                : onDark
                  ? "text-primary-100/80 hover:text-white"
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
