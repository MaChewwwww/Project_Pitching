"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, MapPin, Pencil, Plus, Waves, X } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPhtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FloodEventRecord {
  id: string;
  emergency_event_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_ongoing: boolean;
  peak_level_m: number | null;
  peak_at: string | null;
  households_displaced: number | null;
  notes: string | null;
  area_ids: string[];
  area_names: string[];
}

export interface FloodAreaOption {
  id: string;
  name: string;
}

export const floodEventFormSchema = z
  .object({
    name: z.string().trim().min(1, "Event name is required"),
    started_at: z.string().min(1, "Start date and time is required"),
    ended_at: z.string().optional(),
    peak_level_m: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().min(0, "Peak level cannot be negative").optional(),
    ),
    peak_at: z.string().optional(),
    households_displaced: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce
        .number()
        .int("Use a whole number")
        .min(0, "Displaced households cannot be negative")
        .optional(),
    ),
    notes: z.string().trim().max(2000, "Keep notes under 2,000 characters").optional(),
    area_ids: z.array(z.string()).default([]),
  })
  .superRefine((values, context) => {
    if (values.ended_at && values.started_at && values.ended_at < values.started_at) {
      context.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "End time must be after the event start.",
      });
    }
  });

export type FloodEventFormValues = z.infer<typeof floodEventFormSchema>;

function toPhtLocalInput(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function toFloodEventPayload(values: FloodEventFormValues) {
  const toIso = (value: string) => new Date(`${value}:00+08:00`).toISOString();
  return {
    name: values.name.trim(),
    started_at: toIso(values.started_at),
    ended_at: values.ended_at ? toIso(values.ended_at) : null,
    peak_level_m: values.peak_level_m ?? null,
    peak_at: values.peak_at ? toIso(values.peak_at) : null,
    households_displaced: values.households_displaced ?? null,
    notes: values.notes?.trim() || null,
    area_ids: values.area_ids,
  };
}

function defaults(event?: FloodEventRecord): FloodEventFormValues {
  return {
    name: event?.name ?? "",
    started_at: toPhtLocalInput(event?.started_at ?? null),
    ended_at: toPhtLocalInput(event?.ended_at ?? null),
    peak_level_m: event?.peak_level_m ?? undefined,
    peak_at: toPhtLocalInput(event?.peak_at ?? null),
    households_displaced: event?.households_displaced ?? undefined,
    notes: event?.notes ?? "",
    area_ids: event?.area_ids ?? [],
  };
}

export function FloodEventEditorDialog({
  event,
  areas,
  areasLoading,
  areasError,
  onRetryAreas,
  onSubmit,
  isSubmitting,
  trigger,
}: {
  event?: FloodEventRecord;
  areas: FloodAreaOption[];
  areasLoading?: boolean;
  areasError?: boolean;
  onRetryAreas?: () => void;
  onSubmit: (values: FloodEventFormValues) => Promise<void>;
  isSubmitting: boolean;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const editing = Boolean(event);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FloodEventFormValues>({
    resolver: zodResolver(floodEventFormSchema as never),
    defaultValues: defaults(event) as never,
  });

  React.useEffect(() => {
    if (open) reset(defaults(event) as never);
  }, [event, open, reset]);

  async function submit(values: FloodEventFormValues) {
    await onSubmit(values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className="h-10 cursor-pointer gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 hover:shadow-lg"
          >
            {editing ? (
              <Pencil aria-hidden className="size-4" />
            ) : (
              <Plus aria-hidden className="size-4" />
            )}
            {editing ? "Edit" : "Record flood event"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-0 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 border-b border-neutral-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-700/20">
                {editing ? (
                  <Pencil aria-hidden className="size-5" />
                ) : (
                  <Plus aria-hidden className="size-5" />
                )}
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-900 sm:text-lg">
                  {editing ? "Edit flood event" : "Record flood event"}
                </DialogTitle>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  This record appears in the public weather and river-level history.
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label="Close flood event editor"
              >
                <X aria-hidden className="size-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="min-h-0 overflow-y-auto p-4 sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
            <section className="space-y-5 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs sm:p-6">
              <div className="border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-900">Event details</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Capture the timeline and the highest recorded water level.
                </p>
              </div>
              <Field label="Event name" error={errors.name?.message} required>
                <Input
                  {...register("name")}
                  placeholder="Typhoon Ulysses (Vamco)"
                  className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Started" error={errors.started_at?.message} required>
                  <Input
                    {...register("started_at")}
                    type="datetime-local"
                    className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
                <Field
                  label="Ended"
                  error={errors.ended_at?.message}
                  hint="Leave empty while ongoing."
                >
                  <Input
                    {...register("ended_at")}
                    type="datetime-local"
                    className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
                <Field
                  label="Peak level"
                  error={errors.peak_level_m?.message}
                  hint="Meters"
                >
                  <Input
                    {...register("peak_level_m")}
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="20.7"
                    className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
                <Field label="Peak recorded at" error={errors.peak_at?.message}>
                  <Input
                    {...register("peak_at")}
                    type="datetime-local"
                    className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
              </div>
              <Field
                label="Households displaced"
                error={errors.households_displaced?.message}
              >
                <Input
                  {...register("households_displaced")}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="980"
                  className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </Field>
              <Field
                label="Notes"
                error={errors.notes?.message}
                hint="Optional public context"
              >
                <Textarea
                  {...register("notes")}
                  rows={5}
                  placeholder="What residents should know about the event and its impact."
                  className="resize-y rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </Field>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs sm:p-6">
                <div className="flex items-start gap-2.5 border-b border-neutral-100 pb-3">
                  <MapPin
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Areas affected</h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Optional. Leave clear when the extent was not recorded.
                    </p>
                  </div>
                </div>
                {areasLoading ? (
                  <div className="mt-4 h-20 animate-pulse rounded-xl bg-neutral-100" />
                ) : null}
                {areasError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    Area choices could not be loaded.{" "}
                    <button
                      type="button"
                      onClick={onRetryAreas}
                      className="font-bold underline"
                    >
                      Try again
                    </button>
                    .
                  </div>
                ) : null}
                {!areasLoading && !areasError ? (
                  <Controller
                    control={control}
                    name="area_ids"
                    render={({ field }) => (
                      <div className="mt-4 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                        {areas.map((area) => {
                          const checked = field.value.includes(area.id);
                          return (
                            <label
                              key={area.id}
                              className={cn(
                                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                                checked
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-300 hover:bg-emerald-50/40",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) =>
                                  field.onChange(
                                    next
                                      ? [...field.value, area.id]
                                      : field.value.filter((id) => id !== area.id),
                                  )
                                }
                                className="data-[state=checked]:bg-emerald-600"
                              />
                              {area.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                ) : null}
              </section>
              {event?.emergency_event_id ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-950 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold">
                    <Waves aria-hidden className="size-4 text-amber-700" /> Auto-synced
                    record
                  </div>
                  <p className="mt-2 leading-relaxed">
                    This entry is linked to an Emergency Event. Its lifecycle link stays
                    managed by the emergency workflow.
                  </p>
                </section>
              ) : null}
            </aside>
          </div>
          <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 rounded-xl">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || areasLoading || areasError}
              className="h-10 rounded-xl bg-emerald-700 font-bold text-white hover:bg-emerald-800"
            >
              {isSubmitting ? "Saving…" : editing ? "Save changes" : "Record flood event"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-bold tracking-wider text-neutral-600 uppercase">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FloodEventDetailsDialog({ event }: { event: FloodEventRecord }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View flood event details"
        aria-label={`View details for ${event.name}`}
        className="grid size-8 cursor-pointer place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
      >
        <Eye aria-hidden className="size-4" />
      </button>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-xl rounded-2xl border border-neutral-200 bg-white p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={event.is_ongoing ? "danger" : "neutral"}>
                  {event.is_ongoing ? "Ongoing" : "Completed"}
                </Badge>
                {event.emergency_event_id ? (
                  <Badge tone="info" outline>
                    Auto-synced
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-neutral-900">
                {event.name}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close details"
                className="grid size-10 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                <X aria-hidden className="size-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Started" value={formatPhtDateTime(event.started_at)} />
            <Detail
              label="Ended"
              value={event.ended_at ? formatPhtDateTime(event.ended_at) : "Still ongoing"}
            />
            <Detail
              label="Peak level"
              value={
                event.peak_level_m != null ? `${event.peak_level_m} m` : "Not recorded"
              }
            />
            <Detail
              label="Peak recorded at"
              value={event.peak_at ? formatPhtDateTime(event.peak_at) : "Not recorded"}
            />
            <Detail
              label="Displaced households"
              value={
                event.households_displaced != null
                  ? event.households_displaced.toLocaleString("en-PH")
                  : "Not recorded"
              }
            />
          </dl>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
              Areas affected
            </h3>
            <p className="mt-1.5 text-sm font-medium text-neutral-800">
              {event.area_names.length ? event.area_names.join(", ") : "Not recorded"}
            </p>
          </div>
          {event.notes ? (
            <div>
              <h3 className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                Notes
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                {event.notes}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}
