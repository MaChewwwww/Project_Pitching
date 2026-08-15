"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import type { EmergencyEventOut, EmergencyEventPatch } from "@/lib/api/safety-types";
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
    label: "Flood",
    icon: Waves,
    color: "text-sky-600 bg-sky-50 border-sky-300",
  },
  {
    value: "typhoon" as const,
    label: "Typhoon",
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
    label: "Fire",
    icon: Flame,
    color: "text-rose-600 bg-rose-50 border-rose-300",
  },
  {
    value: "other" as const,
    label: "Other Hazard",
    icon: Siren,
    color: "text-emerald-600 bg-emerald-50 border-emerald-300",
  },
];

function EditEventForm({
  event,
  onClose,
  onUpdated,
}: {
  event: EmergencyEventOut;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(event.name);
  const [type, setType] = React.useState(event.type);
  const [startedAt, setStartedAt] = React.useState(() => toLocalDatetimeString(event.started_at));
  const [endedAt, setEndedAt] = React.useState(() => toLocalDatetimeString(event.ended_at));
  const [isActive, setIsActive] = React.useState(event.is_active);
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  const updateMutation = useMutation({
    mutationFn: (values: EmergencyEventPatch) =>
      api.patch(`/admin/emergency-events/${event.id}`, values),
    onSuccess: async () => {
      toast.success("Emergency event updated successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "emergency-event", event.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace", event.id] }),
        queryClient.invalidateQueries({ queryKey: ["public", "emergency-events"] }),
      ]);
      onClose();
      onUpdated?.();
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
      ended_at: !isActive ? (endedAt ? new Date(endedAt).toISOString() : new Date().toISOString()) : null,
      is_active: isActive,
    };

    await updateMutation.mutateAsync(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-800 shrink-0 shadow-xs border border-amber-200">
            <Pencil className="size-5 text-amber-700" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black text-slate-950">
              Edit Emergency Event
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Update event classification, title, duration period, or active operational status.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {/* Event Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-800">
            Event Name <span className="text-rose-500">*</span>
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
              "w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2",
              errors.name
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30"
                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-white",
            )}
          />
          {errors.name && (
            <span className="text-[11px] font-bold text-rose-600">{errors.name}</span>
          )}
        </div>

        {/* Hazard Classification Grid Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-800">
            Incident / Hazard Classification
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {types.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all text-left cursor-pointer",
                    isSelected
                      ? cn(t.color, "ring-2 ring-emerald-600/30 border-current shadow-xs")
                      : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-900">Incident Operational Status</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {isActive
                ? "Live emergency — active in public alert and response workspace"
                : "Concluded archive — saved in historical records"}
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-emerald-600 shrink-0" />
              Incident Start Date & Time
            </label>
            <button
              type="button"
              onClick={() => setStartedAt(toLocalDatetimeString(new Date()))}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="size-3" />
              Set to Now
            </button>
          </div>
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Concluded Date & Time (if ended) */}
        {!isActive ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-rose-600 shrink-0" />
                Incident Concluded Date & Time
              </label>
              <button
                type="button"
                onClick={() => setEndedAt(toLocalDatetimeString(new Date()))}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="size-3" />
                Set to Now
              </button>
            </div>
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        ) : null}
      </div>

      <DialogFooter className="border-t border-slate-100 pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md gap-1.5"
        >
          <Pencil className="size-3.5" />
          <span>{updateMutation.isPending ? "Saving Changes…" : "Save Changes"}</span>
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onUpdated,
}: {
  event: EmergencyEventOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-6">
        {open ? (
          <EditEventForm
            key={`${event.id}-${event.ended_at ?? ""}-${event.is_active}`}
            event={event}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
