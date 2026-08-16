"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Backpack } from "lucide-react";
import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";
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
  const q = useQuery({
    queryKey: ["me", "go-bag"],
    queryFn: () => api.get<Bag>("/me/go-bag").then((r) => r.data),
  });
  const save = useMutation({
    mutationFn: (checked: string[]) =>
      api.put("/me/go-bag", { checked_item_ids: checked }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["me", "go-bag"] }),
  });
  const toggle = (id: string) => {
    if (!q.data) return;
    const checked = q.data.checked_item_ids.includes(id)
      ? q.data.checked_item_ids.filter((value) => value !== id)
      : [...q.data.checked_item_ids, id];
    save.mutate(checked);
  };
  if (!q.data) return <div className="bg-primary-50 min-h-[40vh] animate-pulse" />;
  const complete = q.data.checked_item_ids.length;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
        Household supplies
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Go-bag checklist</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {complete} of {q.data.items.length} essentials checked. Changes save to your
        household.
      </p>
      <div className="mt-7 divide-y divide-neutral-200 border-y border-neutral-200">
        {q.data.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            disabled={save.isPending}
            className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full border ${item.has_item ? "border-primary-700 bg-primary-700 text-white" : "border-neutral-300 bg-white text-transparent"}`}
            >
              <Check className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-bold">{item.name_en}</span>
              <span className="text-xs text-neutral-500">
                {item.category}
                {item.is_essential ? " · essential" : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/guides">
          <Backpack className="size-4" />
          View preparedness guides
        </Link>
      </Button>
    </div>
  );
}
