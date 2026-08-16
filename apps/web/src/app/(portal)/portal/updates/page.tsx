"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";

import { Button } from "@/components/common/button";
import { api } from "@/lib/api/client";

type Notice = {
  id: string;
  title: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
  type: string;
};
type NoticePage = { items: Notice[] };

export default function PortalUpdatesPage() {
  const client = useQueryClient();
  const notices = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => api.get<NoticePage>("/me/notifications").then((r) => r.data),
  });
  const readAll = useMutation({
    mutationFn: () => api.post("/me/notifications/read-all"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
            Inbox
          </p>
          <h1 className="mt-1 text-3xl font-extrabold">Updates</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Emergency alerts and updates to your household requests appear here.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => readAll.mutate()}
          disabled={readAll.isPending}
        >
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>
      {notices.isLoading ? (
        <div className="bg-primary-50 h-40 animate-pulse" />
      ) : notices.data?.items.length ? (
        <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
          {notices.data.items.map((notice) => (
            <li key={notice.id}>
              <Link
                href={(notice.link_path ?? "/portal/updates") as never}
                className="flex min-h-20 items-start gap-3 py-4"
              >
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${notice.read_at ? "bg-neutral-100 text-neutral-500" : "bg-primary-700 text-white"}`}
                >
                  <Bell className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">{notice.title}</span>
                    {!notice.read_at ? (
                      <span className="bg-primary-600 size-2 rounded-full" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600">
                    {notice.body}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-400">
                    {new Intl.DateTimeFormat("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(notice.created_at))}
                  </span>
                </span>
                <ChevronRight className="mt-2 ml-auto size-4 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-y border-neutral-200 py-12 text-center">
          <Bell className="mx-auto size-7 text-neutral-400" />
          <p className="mt-3 text-sm font-bold">No updates yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Published emergency alerts and request updates will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
