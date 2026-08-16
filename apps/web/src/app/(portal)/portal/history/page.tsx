"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileWarning, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api/client";

type Rescue = {
  id: string;
  created_at: string;
  status: string;
  description: string;
  resolution_note: string | null;
};
type Incident = {
  id: string;
  created_at: string;
  status: string;
  type: string;
  description: string;
  resolution_note: string | null;
};
type Page<T> = { items: T[] };

export default function PortalHistoryPage() {
  const rescue = useQuery({
    queryKey: ["me", "rescue-requests"],
    queryFn: () => api.get<Page<Rescue>>("/me/rescue-requests").then((r) => r.data),
  });
  const reports = useQuery({
    queryKey: ["me", "incident-reports"],
    queryFn: () => api.get<Page<Incident>>("/me/incident-reports").then((r) => r.data),
  });
  const items = [
    ...(rescue.data?.items ?? []).map((item) => ({
      ...item,
      kind: "rescue" as const,
      title: "Rescue request",
    })),
    ...(reports.data?.items ?? []).map((item) => ({
      ...item,
      kind: "incident" as const,
      title: `Incident · ${item.type.replaceAll("_", " ")}`,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
          Household record
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">History</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your rescue requests and incident reports are kept here for follow-up.
        </p>
      </div>
      {rescue.isLoading || reports.isLoading ? (
        <div className="bg-primary-50 h-40 animate-pulse" />
      ) : items.length ? (
        <ol className="border-primary-200 relative space-y-0 border-l pl-6">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="relative py-4">
              <span className="bg-primary-700 absolute top-5 -left-[37px] grid size-5 place-items-center rounded-full text-white">
                {item.kind === "rescue" ? (
                  <LifeBuoy className="size-3" />
                ) : (
                  <FileWarning className="size-3" />
                )}
              </span>
              <p className="text-sm font-bold capitalize">{item.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
              <p className="text-primary-700 mt-1 text-xs font-bold tracking-wide uppercase">
                {item.status.replaceAll("_", " ")}
              </p>
              {item.resolution_note ? (
                <p className="border-primary-200 mt-2 border-l-2 pl-3 text-sm text-neutral-600">
                  {item.resolution_note}
                </p>
              ) : null}
              <time className="mt-2 block text-xs text-neutral-400">
                {new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.created_at))}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-y border-neutral-200 py-12 text-center">
          <ClipboardList className="mx-auto size-7 text-neutral-400" />
          <p className="mt-3 text-sm font-bold">No household history yet</p>
        </div>
      )}
    </div>
  );
}
