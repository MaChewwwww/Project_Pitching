"use client";

import * as React from "react";
import {
  AlertTriangle,
  Globe,
  HeartHandshake,
  HelpCircle,
  Home,
  LifeBuoy,
  Lock,
  MessageSquare,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { pick, useLanguage } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type { PublicFaq } from "@/lib/api/public-types";

/**
 * FAQs, grouped by category with interactive search & filter (FR-PUB-011, FR-PRP-005).
 */

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  registration: Home,
  emergencies: ShieldAlert,
  preparedness: AlertTriangle,
  "evacuation & assistance": LifeBuoy,
  evacuation: LifeBuoy,
  community: Users,
  donations: HeartHandshake,
  "using the website": Globe,
  website: Globe,
  "alerts & notifications": MessageSquare,
  alerts: MessageSquare,
  "profile & privacy": Lock,
  privacy: Lock,
  "website help": HelpCircle,
  help: HelpCircle,
};

function getCategoryIcon(categoryName: string): React.ElementType {
  const normalized = categoryName.toLowerCase().trim();
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (normalized.includes(key)) return icon;
  }
  return HelpCircle;
}

export function FaqAccordion({
  faqs,
  className,
  compact = false,
}: {
  faqs: PublicFaq[];
  className?: string;
  compact?: boolean;
}) {
  const { lang, setLang } = useLanguage();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  // Distinct list of categories from the data
  const categoryList = React.useMemo(() => {
    const set = new Set<string>();
    for (const faq of faqs) {
      if (faq.category) set.add(faq.category);
    }
    return Array.from(set);
  }, [faqs]);

  // Filtered FAQs based on category & search
  const filteredFaqs = React.useMemo(() => {
    let list = faqs;

    if (!compact && selectedCategory !== "all") {
      list = list.filter(
        (f) => f.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (!compact && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.question_en.toLowerCase().includes(q) ||
          f.question_fil.toLowerCase().includes(q) ||
          f.answer_en.toLowerCase().includes(q) ||
          f.answer_fil.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [faqs, selectedCategory, searchQuery, compact]);

  // Group filtered faqs by category
  const groupedCategories = React.useMemo(() => {
    const map = new Map<string, PublicFaq[]>();
    for (const faq of filteredFaqs) {
      const cat = faq.category || "General";
      const existing = map.get(cat);
      if (existing) existing.push(faq);
      else map.set(cat, [faq]);
    }
    return [...map.entries()];
  }, [filteredFaqs]);

  // Counts per category
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: faqs.length };
    for (const faq of faqs) {
      const cat = faq.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [faqs]);

  if (compact) {
    return (
      <Accordion type="single" collapsible className={cn("w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start", className)}>
        {faqs.map((faq) => {
          const question = pick(lang, faq.question_fil, faq.question_en);
          const answer = pick(lang, faq.answer_fil, faq.answer_en);
          const CategoryIcon = getCategoryIcon(faq.category || "");
          return (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="rounded-2xl border border-neutral-200/90 bg-white px-5 py-1.5 shadow-2xs transition-all hover:border-primary-600/40 hover:shadow-xs data-[state=open]:border-primary-600/60 data-[state=open]:ring-2 data-[state=open]:ring-primary-600/10"
            >
              <AccordionTrigger className="text-left text-xs sm:text-sm font-bold text-neutral-900 hover:no-underline py-3.5 gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                  {faq.category ? (
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-100/90 px-2.5 py-0.5 text-[11px] font-bold text-primary-800 shrink-0">
                      <CategoryIcon className="size-3 text-primary-700" />
                      <span>{faq.category}</span>
                    </span>
                  ) : null}
                  <span className="flex-1 min-w-0 text-neutral-900 leading-snug">{question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm leading-relaxed text-neutral-600 pb-4 pt-2.5 border-t border-neutral-100 mt-1 whitespace-pre-wrap">
                {answer}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  }

  return (
    <div className={cn("space-y-6 min-w-0", className)}>
      {/* Top Search & Language Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Live Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "fil"
                ? "Maghanap ng tanong, paksa, o keyword..."
                : "Search questions, topics, or keywords..."
            }
            className="pl-10 pr-9 h-11 text-xs sm:text-sm bg-white rounded-2xl border-neutral-200 shadow-2xs focus-visible:ring-primary-600"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Language Switch Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-100/90 border border-neutral-200/80 shadow-2xs shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setLang("fil")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              lang === "fil"
                ? "bg-white text-primary-800 shadow-xs ring-1 ring-black/5"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60",
            )}
          >
            <span>Tagalog</span>
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              lang === "en"
                ? "bg-white text-primary-800 shadow-xs ring-1 ring-black/5"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60",
            )}
          >
            <span>English</span>
          </button>
        </div>
      </div>

      {/* Category Pills Scroller */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border",
            selectedCategory === "all"
              ? "bg-primary-700 text-white border-primary-700 shadow-xs"
              : "bg-white text-neutral-700 border-neutral-200 hover:border-primary-600/40 hover:bg-primary-50/40 shadow-2xs",
          )}
        >
          <span>{lang === "fil" ? "Lahat ng Paksa" : "All Topics"}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
              selectedCategory === "all"
                ? "bg-primary-800 text-primary-100"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            {categoryCounts.all}
          </span>
        </button>

        {categoryList.map((category) => {
          const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
          const count = categoryCounts[category] || 0;
          const CategoryIcon = getCategoryIcon(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border",
                isSelected
                  ? "bg-primary-700 text-white border-primary-700 shadow-xs"
                  : "bg-white text-neutral-700 border-neutral-200 hover:border-primary-600/40 hover:bg-primary-50/40 shadow-2xs",
              )}
            >
              <CategoryIcon className={cn("size-3.5", isSelected ? "text-primary-200" : "text-primary-700")} />
              <span>{category}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                  isSelected
                    ? "bg-primary-800 text-primary-100"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accordion Categories */}
      {groupedCategories.length > 0 ? (
        <div className="space-y-8">
          {groupedCategories.map(([category, items]) => {
            const CategoryIcon = getCategoryIcon(category);
            const anchorId = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section key={category} id={anchorId} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary-100 text-primary-800">
                      <CategoryIcon className="size-4" />
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-primary-950">
                      {category}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-600">
                    {items.length} {items.length === 1 ? (lang === "fil" ? "tanong" : "question") : (lang === "fil" ? "mga tanong" : "questions")}
                  </span>
                </div>

                {/* Accordion List */}
                <Accordion type="single" collapsible className="w-full space-y-2.5">
                  {items.map((faq) => {
                    const question = pick(lang, faq.question_fil, faq.question_en);
                    const answer = pick(lang, faq.answer_fil, faq.answer_en);
                    const CategoryIconItem = getCategoryIcon(faq.category || category);
                    return (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="rounded-2xl border border-neutral-200/90 bg-white px-4.5 py-1 shadow-2xs transition-all hover:border-primary-600/40 hover:shadow-xs data-[state=open]:border-primary-600/60 data-[state=open]:ring-2 data-[state=open]:ring-primary-600/10"
                      >
                        <AccordionTrigger className="text-left text-xs sm:text-sm font-bold text-neutral-900 hover:no-underline py-3.5 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CategoryIconItem className="size-4 text-primary-700 shrink-0 hidden sm:inline-block" />
                            <span className="flex-1 min-w-0">{question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm leading-relaxed text-neutral-600 pb-4 pt-1.5 border-t border-neutral-100 mt-1 whitespace-pre-wrap">
                          {answer}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center bg-white space-y-2">
          <HelpCircle className="size-8 text-neutral-400 mx-auto" />
          <p className="text-sm font-bold text-neutral-800">
            {lang === "fil" ? "Walang nahanap na tugmang tanong" : "No matching questions found"}
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {lang === "fil"
              ? "Subukan maghanap ng ibang salita o i-reset ang filter ng kategorya."
              : "Try searching with different keywords or reset your category filter."}
          </p>
          {(searchQuery || selectedCategory !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-2 text-xs font-bold text-primary-700 hover:underline cursor-pointer"
            >
              {lang === "fil" ? "I-reset ang filter" : "Reset filters"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
