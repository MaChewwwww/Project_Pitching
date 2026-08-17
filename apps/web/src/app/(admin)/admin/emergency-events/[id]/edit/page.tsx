"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Flame,
  Pencil,
  RefreshCw,
  Siren,
  Waves,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { FormFieldsSkeleton } from "@/components/common/portal-loading";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  EmergencyEventDetailOut,
  EmergencyEventPatch,
  EmergencyEventType,
} from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { cn } from "@/lib/utils";

function toLocalDatetimeString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

const types = [
  {
    value: "flood" as const,
    label: "Flood Hazard",
    icon: Waves,
    color: "text-sky-600 bg-sky-50 border-sky-300",
  },
  {
    value: "typhoon" as const,
    label: "Typhoon / Severe Weather",
    icon: Wind,
    color: "text-teal-600 bg-teal-50 border-teal-300",
  },
  {
    value: "earthquake" as const,
    label: "Earthquake",
    icon: AlertTriangle,
    color: "text-amber-600 bg-amber-50 border-amber-300",
  },
  {
    value: "fire" as const,
    label: "Fire Incident",
    icon: Flame,
    color: "text-rose-600 bg-rose-50 border-rose-300",
  },
  {
    value: "other" as const,
    label: "Other Emergency",
    icon: Siren,
    color: "text-emerald-600 bg-emerald-50 border-emerald-300",
  },
];

function EditEmergencyEventForm({ event }: { event: EmergencyEventDetailOut }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState(event.name);
  const [type, setType] = React.useState<EmergencyEventType>(event.type);
  const [startedAt, setStartedAt] = React.useState(() =>
    toLocalDatetimeString(event.started_at),
  );
  const [endedAt, setEndedAt] = React.useState(() =>
    toLocalDatetimeString(event.ended_at),
  );
  const [isActive, setIsActive] = React.useState(event.is_active);
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  const saveMutation = useMutation({
    mutationFn: (body: EmergencyEventPatch) =>
      api.patch(`/admin/emergency-events/${event.id}`, body),
    onSuccess: () => {
      toast.success("Emergency event updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "emergency-workspace", event.id],
      });
      router.push(`/admin/emergency-events/${event.id}` as Route);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Event name is required" });
      return;
    }

    const payload: EmergencyEventPatch = {
      name: name.trim(),
      type,
      started_at: startedAt ? new Date(startedAt).toISOString() : null,
      ended_at: !isActive
        ? endedAt
          ? new Date(endedAt).toISOString()
          : new Date().toISOString()
        : null,
      is_active: isActive,
    };

    await saveMutation.mutateAsync(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      {/* Name Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-900">
          Emergency Event Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors({});
          }}
          placeholder="e.g. Typhoon Carina — Severe Flooding & Evacuation"
          className={cn(
            "w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:ring-2 focus:outline-none sm:text-sm",
            errors.name
              ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20",
          )}
        />
        {errors.name && (
          <span className="text-[11px] font-bold text-rose-600">{errors.name}</span>
        )}
      </div>

      {/* Hazard Classification Grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-900">
          Hazard / Incident Classification
        </label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {types.map((t) => {
            const Icon = t.icon;
            const isSelected = type === t.value;
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition-all",
                  isSelected
                    ? cn(t.color, "border-current shadow-xs ring-2 ring-emerald-600/30")
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-slate-100",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Switcher */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <p className="text-xs font-bold text-slate-900">Operational Emergency Status</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            {isActive
              ? "Live incident — actively tracked in resident portal and command dashboard"
              : "Concluded archive — saved in historical records ledger"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextActive = !isActive;
            setIsActive(nextActive);
            if (!nextActive && !endedAt) {
              setEndedAt(toLocalDatetimeString(new Date()));
            }
          }}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isActive ? "bg-rose-600" : "bg-slate-300",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
              isActive ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {/* Start Date & Time */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Calendar className="size-3.5 shrink-0 text-emerald-600" />
            Incident Start Date & Time
          </label>
          <button
            type="button"
            onClick={() => setStartedAt(toLocalDatetimeString(new Date()))}
            className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
          >
            <RefreshCw className="size-3" />
            Set to Now
          </button>
        </div>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Concluded Date & Time */}
      {!isActive ? (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className="size-3.5 shrink-0 text-rose-600" />
              Incident Concluded Date & Time
            </label>
            <button
              type="button"
              onClick={() => setEndedAt(toLocalDatetimeString(new Date()))}
              className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-rose-700 hover:underline"
            >
              <RefreshCw className="size-3" />
              Set to Now
            </button>
          </div>
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-rose-500 focus:outline-none"
          />
        </div>
      ) : null}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/emergency-events/${event.id}` as Route)}
          className="rounded-xl border-slate-200 text-xs font-bold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="gap-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
        >
          <Pencil className="size-3.5" />
          <span>{saveMutation.isPending ? "Saving Changes…" : "Save Changes"}</span>
        </Button>
      </div>
    </form>
  );
}

export default function EditEmergencyEventPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();

  const eventQuery = useQuery({
    queryKey: ["admin", "emergency-event", id],
    queryFn: () =>
      api
        .get<EmergencyEventDetailOut>(`/admin/emergency-events/${id}`)
        .then((r) => r.data),
  });

  if (eventQuery.isFetching)
    return <FormFieldsSkeleton label="Loading emergency event editor" fields={8} />;

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        Emergency event could not be loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="size-9 shrink-0 rounded-xl border-slate-200 p-0 text-slate-700 hover:bg-slate-100"
        >
          <Link href={`/admin/emergency-events/${id}` as Route}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href="/admin/emergency-events?tab=events"
              className="hover:text-emerald-700 hover:underline"
            >
              Emergency Events
            </Link>
            <span>/</span>
            <Link
              href={`/admin/emergency-events/${id}` as Route}
              className="hover:text-emerald-700 hover:underline"
            >
              {eventQuery.data.name}
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-900">Edit Details</span>
          </div>
          <h1 className="mt-0.5 text-xl leading-tight font-black tracking-tight text-slate-950 sm:text-2xl">
            Edit Emergency Event
          </h1>
        </div>
      </div>

      <EditEmergencyEventForm key={eventQuery.data.id} event={eventQuery.data} />
    </div>
  );
}
