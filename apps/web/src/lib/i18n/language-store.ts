"use client";

import { create } from "zustand";

export type Language = "fil" | "en";

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggle: () => void;
}

/**
 * Which language column renders.
 *
 * Filipino is primary, English secondary (BR-0.19). Because `schema.md` Section
 * 11 stores content as `*_fil` / `*_en` column pairs rather than in a translation
 * table, this toggle does something real today: it picks which column a guide or
 * FAQ renders from.
 *
 * The chrome — navigation, buttons, section headings — stays English until
 * `next-intl` is wired, which is its own change. Zustand rather than Context
 * because `architecture.md` Section 10.3 reserves Zustand for exactly this: small
 * cross-cutting UI state that is not server data.
 */
export const useLanguage = create<LanguageState>((set) => ({
  lang: "fil",
  setLang: (lang) => set({ lang }),
  toggle: () => set((s) => ({ lang: s.lang === "fil" ? "en" : "fil" })),
}));

/** Pick the field matching the active language from a bilingual row. */
export function pick<T>(lang: Language, fil: T, en: T): T {
  return lang === "fil" ? fil : en;
}
