"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Backpack,
  BookOpen,
  Check,
  CheckCircle2,
  Droplets,
  HeartPulse,
  Info,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name_en: string;
  category: string;
  is_essential: boolean;
  has_item: boolean;
};

type Bag = { items: Item[]; checked_item_ids: string[] };

export default function PortalGoBagPage() {
  const client = useQueryClient();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const query = useQuery({
    queryKey: ["me", "go-bag"],
    queryFn: () => api.get<Bag>("/me/go-bag").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (checked: string[]) =>
      api.put("/me/go-bag", { checked_item_ids: checked }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "go-bag"] });
      toast.success("Go-bag updated for your household", { duration: 1500 });
    },
  });

  const toggle = (id: string) => {
    if (!query.data) return;
    const checked = query.data.checked_item_ids.includes(id)
      ? query.data.checked_item_ids.filter((v) => v !== id)
      : [...query.data.checked_item_ids, id];
    saveMutation.mutate(checked);
  };

  if (query.isLoading || !query.data) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="h-28 rounded-2xl bg-slate-100" />
        <div className="h-72 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const items = query.data.items || [];
  const checkedIds = query.data.checked_item_ids || [];
  const totalCount = items.length;
  const completedCount = checkedIds.length;
  const percent = Math.round((completedCount / (totalCount || 1)) * 100);

  // Extract unique categories
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((i) => i.category === selectedCategory);

  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Backpack}
        title="72-Hour Go-Bag"
        titleAccent="Checklist"
        description="Pack essential survival supplies for each family member to sustain your household for at least 3 days during a sudden evacuation."
        backHref="/portal/preparedness"
        backLabel="Back to Preparedness"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
            <Sparkles className="size-3 text-emerald-700" />
            <span>Household Supplies</span>
          </span>
        }
      />

      {/* ── 1. Progress Bar Card ── */}
      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Pack Progress
              </span>
              <h2 className="text-xl font-black text-neutral-900">
                {completedCount} of {totalCount} Items Packed
              </h2>
            </div>
            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 font-mono text-sm font-black text-emerald-800">
              {percent}% Complete
            </span>
          </div>

          <MeterBar
            value={completedCount}
            max={totalCount}
            label="Go-Bag items packed"
            className="h-3 rounded-full"
          />

          <p className="text-[11px] text-neutral-500 font-medium pt-1">
            {percent === 100
              ? "All essential supplies are packed! Inspect expiration dates periodically."
              : "Tap items below as you pack them into your emergency go-bag."}
          </p>
        </CardContent>
      </Card>

      {/* ── 2. Category Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-3">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            selectedCategory === "all"
              ? "bg-emerald-700 text-white shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          All Items ({totalCount})
        </button>
        {categories.map((cat) => {
          const countInCat = items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                selectedCategory === cat
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
              )}
            >
              {cat} ({countInCat})
            </button>
          );
        })}
      </div>

      {/* ── 3. Checklist Items List ── */}
      <div className="space-y-2.5">
        {filteredItems.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              disabled={saveMutation.isPending}
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99]",
                isChecked
                  ? "border-emerald-300 bg-emerald-50/50 shadow-2xs"
                  : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:bg-neutral-50/50",
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border transition-all",
                    isChecked
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-transparent group-hover:border-neutral-400",
                  )}
                >
                  <Check className="size-4 stroke-[3]" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isChecked
                          ? "text-emerald-950 line-through decoration-emerald-500/50"
                          : "text-neutral-900",
                      )}
                    >
                      {item.name_en}
                    </span>
                    {item.is_essential ? (
                      <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.2 text-[10px] font-black uppercase text-red-700">
                        Essential
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-medium text-neutral-400 block mt-0.5">
                    {item.category}
                  </span>
                </div>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold",
                  isChecked
                    ? "bg-emerald-200/80 text-emerald-900 font-black"
                    : "text-neutral-400 group-hover:text-neutral-700",
                )}
              >
                {isChecked ? "Packed" : "Unpacked"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Guides Footer Link ── */}
      <div className="flex items-center justify-between border-t border-neutral-200/80 pt-4">
        <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
          <Link href="/guides">
            <BookOpen className="size-4" />
            <span>Read Disaster Evacuation Guides</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
