"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Backpack,
  BookOpen,
  Check,
  PackageCheck,
  RotateCw,
  ShieldCheck,
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
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-36 rounded-3xl bg-slate-100" />
            <div className="h-96 rounded-3xl bg-slate-100" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-72 rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const items = query.data.items || [];
  const checkedIds = query.data.checked_item_ids || [];
  const totalCount = items.length;
  const completedCount = checkedIds.length;
  const percent = Math.round((completedCount / (totalCount || 1)) * 100);

  const essentialItems = items.filter((i) => i.is_essential);
  const essentialCompleted = essentialItems.filter((i) =>
    checkedIds.includes(i.id),
  ).length;

  // Extract unique categories
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((i) => i.category === selectedCategory);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <PortalPageHeader
        icon={Backpack}
        title="72-Hour Go-Bag"
        titleAccent="Checklist"
        description="Pack essential survival supplies for each family member to sustain your household for at least 3 days during a sudden evacuation."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer gap-2 rounded-full border border-neutral-300/90 bg-white px-4 font-bold text-neutral-800 shadow-xs transition-all hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.98] max-sm:w-full max-sm:justify-center"
            >
              <Link href="/guides">
                <BookOpen aria-hidden className="size-3.5 text-neutral-600" />
                <span>Read Evacuation Guides</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 2-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* ── LEFT COLUMN: Progress & Interactive Checklist (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Progress Bar Card */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Emergency Pack Status
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900">
                    {completedCount} of {totalCount} Items Packed
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-300/80 px-3.5 py-1 text-xs font-black text-emerald-800 shadow-2xs">
                    {percent}% Complete
                  </span>
                </div>
              </div>

              <MeterBar
                value={completedCount}
                max={totalCount}
                label="Go-Bag items packed"
                className="h-3 rounded-full"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-neutral-500 font-medium">
                <span className="flex items-center gap-1.5 text-neutral-700">
                  <PackageCheck className="size-4 text-emerald-600" />
                  <span>
                    Essential supplies:{" "}
                    <strong className="text-neutral-900">
                      {essentialCompleted} of {essentialItems.length}
                    </strong>
                  </span>
                </span>
                <span>
                  {percent === 100
                    ? "✓ All recommended items are packed!"
                    : "Tap items below to toggle packed status."}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs",
                selectedCategory === "all"
                  ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/30"
                  : "bg-white text-neutral-700 border border-neutral-300/80 hover:bg-neutral-50 hover:border-neutral-400",
              )}
            >
              All Items ({totalCount})
            </button>
            {categories.map((cat) => {
              const countInCat = items.filter((i) => i.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs",
                    isSelected
                      ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/30"
                      : "bg-white text-neutral-700 border border-neutral-300/80 hover:bg-neutral-50 hover:border-neutral-400",
                  )}
                >
                  {cat} ({countInCat})
                </button>
              );
            })}
          </div>

          {/* 3. Checklist Items List */}
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
                    "group flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99]",
                    isChecked
                      ? "border-emerald-300 bg-emerald-50/60 shadow-2xs"
                      : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:bg-neutral-50/60 shadow-2xs",
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border transition-all",
                        isChecked
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                          : "border-neutral-300 bg-white text-transparent group-hover:border-emerald-500",
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
                          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">
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
                      "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors",
                      isChecked
                        ? "bg-emerald-200/80 text-emerald-900 font-black"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200/70",
                    )}
                  >
                    {isChecked ? "Packed" : "Unpacked"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Go-Bag Guidelines & Maintenance (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Key Packing Rules */}
          <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Packing Guidelines
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    BDRRMC Survival Standard
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    1
                  </span>
                  <p>
                    <strong className="text-neutral-900">1 Bag Per Person:</strong>{" "}
                    Each household member should have a lightweight backpack tailored to their needs.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    2
                  </span>
                  <p>
                    <strong className="text-neutral-900">Waterproof Seal:</strong> Place
                    government IDs, birth certificates, and medications in sealed Ziploc bags.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">
                    3
                  </span>
                  <p>
                    <strong className="text-neutral-900">Accessible Placement:</strong> Store
                    bags near the main doorway or exit route, never in locked cabinets.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Periodic Maintenance */}
          <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 shadow-2xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <RotateCw className="size-4 text-emerald-700" />
                <span className="text-xs font-black uppercase tracking-wider">
                  6-Month Inspection
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Inspect canned food expiration dates, replace drinking water bottles, test flashlight batteries, and check seasonal clothing sizes every 6 months.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
