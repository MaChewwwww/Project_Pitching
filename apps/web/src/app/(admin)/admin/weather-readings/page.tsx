"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudLightning,
  CloudRain,
  ClipboardCheck,
  Droplets,
  Gauge,
  RefreshCw,
  Waves,
  PenLine,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";


import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { Badge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";
import type { PublicRiverLevel, PublicWeatherCurrent } from "@/lib/api/public-types";

/**
 * The unified Weather & Flood Watch workspace (FR-WX-*).
 *
 * Overview, manual entry, and river alert review belong together operationally:
 * the officer sees the same cached public feed before deciding whether to add
 * a manual reading or review a human-issued alert prompt. Flood History stays
 * as its own record-management route because it has a different lifecycle.
 */

type WeatherWatchTab = "overview" | "manual-entry" | "river-alert";

interface AlertPrompt {
  id: string;
  reading_id: number | null;
  level: 1 | 2 | 3;
  threshold_value: number;
  created_at: string;
  acknowledged_by_user_id: string | null;
  acknowledged_at: string | null;
  resulted_in_announcement_id: string | null;
}

const metrics = [
  "river_level",
  "rainfall",
  "temperature",
  "humidity",
  "heat_index",
  "precipitation_probability",
] as const;

const readingSchema = z.object({
  metric: z.enum(metrics),
  value: z.coerce.number(),
  unit: z.string().min(1, "Required"),
  observed_at: z.string().optional(),
});
type ReadingFormValues = z.infer<typeof readingSchema>;

const emptyValues: ReadingFormValues = {
  metric: "river_level",
  value: 0,
  unit: "m",
  observed_at: "",
};

interface SimulateTyphoonResult {
  readings: unknown[];
  alert_prompts_created: number;
  highest_alert_level: 0 | 1 | 2 | 3;
}

/* ─────────────────────────────────────── Overview ── */

function OverviewPanel({
  weather,
  river,
  isLoading,
  isError,
  onRetry,
}: {
  weather: PublicWeatherCurrent | undefined;
  river: PublicRiverLevel | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]"
        aria-label="Loading weather data"
      >
        {["weather", "river"].map((key) => (
          <Card key={key} className="min-h-[280px] animate-pulse bg-neutral-50">
            <CardContent className="flex flex-col gap-5">
              <div className="h-4 w-40 rounded bg-neutral-200" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-xl bg-neutral-200" />
                <div className="h-20 rounded-xl bg-neutral-200" />
              </div>
              <div className="h-32 rounded-xl bg-neutral-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !weather || !river) {
    return (
      <ErrorState
        sectionName="Weather and river data"
        description="The cached operational feed could not be loaded. Manual entry remains available in the next tab."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
      <WeatherPanel weather={weather} />
      <RiverLevelPanel river={river} weather={weather} density="compact" />
    </div>
  );
}

/* ─────────────────────────────────── Manual Entry ── */

function ManualEntryPanel({
  canSimulate,
  onReadingRecorded,
}: {
  canSimulate: boolean;
  onReadingRecorded: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    // zodResolver generic is structurally incompatible with coerce.number()
    // producing `unknown` internally — the `as never` cast is the standard
    // escape hatch used by AdminForm for the same reason.
  } = useForm<ReadingFormValues>({
    resolver: zodResolver(readingSchema as never),
    defaultValues: emptyValues as never,
  });

  const submitMutation = useMutation({
    mutationFn: (values: ReadingFormValues) =>
      api.post("/admin/readings", {
        ...values,
        observed_at: values.observed_at
          ? new Date(values.observed_at).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success("Reading recorded");
      queryClient.invalidateQueries({ queryKey: ["admin", "weather-watch"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "river-history"] });
      onReadingRecorded();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      api
        .post<SimulateTyphoonResult>("/admin/readings/simulate-typhoon")
        .then((response) => response.data),
    onSuccess: (result) => {
      toast.success(
        `Scenario recorded: ${result.readings.length} readings, ${result.alert_prompts_created} prompt(s) created.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "weather-watch"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "river-history"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  async function onSubmit(values: ReadingFormValues) {
    await submitMutation.mutateAsync(values as ReadingFormValues);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      {/* Reading form — styled to match announcement-form field cards */}
      <div className="space-y-6 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs sm:p-8">
        <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
          <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
            <PenLine aria-hidden className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Record a field reading</h2>
            <p className="text-xs text-neutral-500">
              Use this when a gauge or automated fetch is unavailable.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          {/* Metric */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="metric"
              className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
            >
              Metric <span className="ml-0.5 font-bold text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="metric"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="metric"
                    className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.metric && (
              <p className="text-xs text-red-600">{String(errors.metric.message)}</p>
            )}
          </div>

          {/* Value + Unit side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="value"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Value <span className="ml-0.5 font-bold text-red-500">*</span>
              </Label>
              <Input
                id="value"
                type="number"
                className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                aria-invalid={!!errors.value}
                {...register("value", { valueAsNumber: true })}
              />
              {errors.value && (
                <p className="text-xs text-red-600">{String(errors.value.message)}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="unit"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Unit <span className="ml-0.5 font-bold text-red-500">*</span>
              </Label>
              <Input
                id="unit"
                type="text"
                placeholder="m, mm, °C, %"
                className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                aria-invalid={!!errors.unit}
                {...register("unit")}
              />
              {errors.unit && (
                <p className="text-xs text-red-600">{String(errors.unit.message)}</p>
              )}
            </div>
          </div>

          {/* Observed at */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="observed_at"
              className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
            >
              Observed at
              <span className="ml-1.5 text-[10px] font-medium normal-case text-neutral-400">
                blank = now
              </span>
            </Label>
            <Input
              id="observed_at"
              type="datetime-local"
              className="h-10 rounded-lg border-emerald-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              {...register("observed_at")}
            />
            <p className="text-[11px] text-neutral-400">
              Leave blank if you are reading this right now.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || submitMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {isSubmitting || submitMutation.isPending ? "Recording…" : "Record reading"}
            </Button>
          </div>
        </form>
      </div>

      {/* Demo scenario card */}
      <Card className="h-fit border-amber-200/80 bg-amber-50/35">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <CloudLightning aria-hidden className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Demo scenario</h2>
              <p className="text-xs text-neutral-600">
                Exercise the gauge &amp; human-review workflow without publishing alerts.
              </p>
            </div>
          </div>
          {canSimulate ? (
            <Button
              variant="outline"
              className="w-full justify-center border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              disabled={simulateMutation.isPending}
              onClick={() => simulateMutation.mutate()}
            >
              <CloudLightning aria-hidden className="size-4" />
              {simulateMutation.isPending ? "Recording scenario…" : "Simulate typhoon"}
            </Button>
          ) : (
            <p className="text-caption font-semibold text-amber-900">
              Demo simulation is available to admins only.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────── River Alert ── */

interface RiverHistoryPoint {
  observed_at: string;
  value: number;
  source: string;
}

interface ThresholdLine {
  level: 1 | 2 | 3;
  label: string;
  value: number;
  color: string;
  surface: string;
}

type HistoryHours = 6 | 24 | 168;
type PromptFilter = "all" | "to-review" | "acknowledged";

const PROMPTS_PER_PAGE = 6;

const HISTORY_OPTIONS: { label: string; value: HistoryHours }[] = [
  { label: "Past 6 hours", value: 6 },
  { label: "Past 24 hours", value: 24 },
  { label: "Past 7 days", value: 168 },
];

const RIVER_HISTORY_SOURCE_LABELS: Record<string, string> = {
  pagasa: "DOST-PAGASA · Montalban (Rodriguez) River Gauge",
  manual: "Verified staff entry",
};

function RiverHistoryChart({
  thresholds,
  river,
}: {
  thresholds: PublicRiverLevel["thresholds"] | undefined;
  river: PublicRiverLevel | undefined;
}) {
  const [hours, setHours] = React.useState<HistoryHours>(168);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin", "river-history", hours],
    queryFn: () =>
      api
        .get<RiverHistoryPoint[]>(`/admin/readings/river-history?hours=${hours}`)
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const chartData = React.useMemo(() => {
    const byObservedAt = new Map<number, RiverHistoryPoint>();
    for (const point of data ?? []) {
      byObservedAt.set(new Date(point.observed_at).getTime(), point);
    }
    return Array.from(byObservedAt.entries()).map(([t, point]) => ({
      t,
      v: point.value,
      observedAt: point.observed_at,
      source: point.source,
    }));
  }, [data]);

  const thresholdRows = React.useMemo<ThresholdLine[]>(() => {
    const rows: ThresholdLine[] = [];
    if (thresholds?.level_1_m != null) {
      rows.push({
        level: 1,
        label: "Prepare",
        value: thresholds.level_1_m,
        color: "#d97706",
        surface: "bg-amber-500",
      });
    }
    if (thresholds?.level_2_m != null) {
      rows.push({
        level: 2,
        label: "Evacuate",
        value: thresholds.level_2_m,
        color: "#ea580c",
        surface: "bg-orange-500",
      });
    }
    if (thresholds?.level_3_m != null) {
      rows.push({
        level: 3,
        label: "Critical",
        value: thresholds.level_3_m,
        color: "#dc2626",
        surface: "bg-red-500",
      });
    }
    return rows;
  }, [thresholds]);

  const yDomain = React.useMemo<[number, number]>(() => {
    const values = [...chartData.map((point) => point.v), ...thresholdRows.map((row) => row.value)];
    if (values.length === 0) return [0, 1];

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = Math.max(maximum - minimum, 1);
    return [Math.max(0, minimum - span * 0.35), maximum + span * 0.25];
  }, [chartData, thresholdRows]);

  const xDomain =
    chartData.length > 1
      ? ["dataMin", "dataMax"]
      : chartData.length === 1
        ? [
            chartData[0].t - Math.min(hours * 60 * 60 * 1000, 60 * 60 * 1000),
            chartData[0].t + Math.min(hours * 60 * 60 * 1000, 60 * 60 * 1000),
          ]
        : [0, hours * 60 * 60 * 1000];

  const xFormatter = (ts: number) =>
    hours <= 24
      ? format(new Date(ts), "HH:mm")
      : format(new Date(ts), "MMM d");

  const isEmpty = !isLoading && !isError && chartData.length === 0;
  const hasTrend = chartData.length > 1;
  const latestPoint = chartData.at(-1);
  const latestValue = latestPoint?.v ?? river?.reading?.value ?? null;
  const latestObservedAt = latestPoint?.observedAt ?? river?.reading?.observed_at ?? null;
  const latestSource = latestPoint?.source ?? river?.reading?.source ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-neutral-200 bg-white shadow-sm-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Droplets aria-hidden className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">River level history</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Measured at the DOST-PAGASA Montalban (Rodriguez) River Gauge.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 min-w-8 px-0 text-neutral-500 hover:bg-sky-50 hover:text-sky-700"
            disabled={isFetching}
            aria-label={isFetching ? "Refreshing river level history" : "Refresh river level history"}
            title={isFetching ? "Refreshing river level history" : "Refresh river level history"}
            onClick={() => void refetch()}
          >
            <RefreshCw
              aria-hidden
              className={`size-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </Button>
          <Select value={String(hours)} onValueChange={(value) => setHours(Number(value) as HistoryHours)}>
            <SelectTrigger className="h-8 w-34 border-neutral-200 bg-neutral-50 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-neutral-100 bg-neutral-50/70 px-5 py-3">
        <div className="min-w-20 border-r border-neutral-200 pr-3">
          <p className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">Latest level</p>
          <p className="mt-0.5 text-xl font-black tracking-tight text-neutral-950">
            {latestValue != null ? `${latestValue.toFixed(2)} m` : "—"}
          </p>
        </div>
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold text-neutral-800">
            {isLoading
              ? "Loading measurements…"
              : latestObservedAt
                ? `Observed ${formatPhtDateTime(latestObservedAt)}`
                : "No river measurement recorded"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500">
            {latestSource
              ? `${RIVER_HISTORY_SOURCE_LABELS[latestSource] ?? latestSource} · ${chartData.length} distinct observation${chartData.length === 1 ? "" : "s"} in this view`
              : "DOST-PAGASA Montalban gauge reports or verified staff entries will appear here."}
          </p>
        </div>
      </div>

      <div className="h-64 px-3 pt-4 sm:px-4">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-neutral-100" />
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <AlertCircle aria-hidden className="size-5 text-red-500" />
            <p className="text-xs font-semibold text-neutral-700">River history could not be loaded.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <Waves aria-hidden className="size-7 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-700">No measured levels in this period</p>
            <p className="max-w-xs text-xs leading-5 text-neutral-500">
              The chart plots DOST-PAGASA Montalban gauge reports and verified staff entries. It never fills gaps with estimates.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 8, left: -14, bottom: 4 }}>
              <defs>
                <linearGradient id="riverHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.24} />
                  <stop offset="92%" stopColor="#0284c7" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={xDomain}
                scale="time"
                tickFormatter={xFormatter}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={yDomain}
                width={42}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}m`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as {
                    t: number;
                    v: number;
                    observedAt: string;
                    source: string;
                  };
                  return (
                    <div className="min-w-38 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-bold text-neutral-950">{point.v.toFixed(2)} m</p>
                      <p className="mt-0.5 text-neutral-600">{formatPhtDateTime(point.observedAt)}</p>
                      <p className="mt-1 text-[10px] font-semibold tracking-wide text-sky-700 uppercase">
                        {RIVER_HISTORY_SOURCE_LABELS[point.source] ?? point.source}
                      </p>
                    </div>
                  );
                }}
              />
              {thresholdRows.map((threshold) => (
                <ReferenceLine
                  key={threshold.level}
                  y={threshold.value}
                  stroke={threshold.color}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `L${threshold.level} · ${threshold.value.toFixed(1)}m`,
                    fill: threshold.color,
                    fontSize: 10,
                    fontWeight: 700,
                    position: "insideTopRight",
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="v"
                stroke="#0284c7"
                strokeWidth={2.5}
                fill="url(#riverHistoryGradient)"
                dot={{ r: 3.5, fill: "#ffffff", stroke: "#0284c7", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#0284c7", stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isEmpty && !hasTrend ? (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p>
            One distinct measurement is available here, so a trend cannot be shown yet. A new Montalban gauge report or verified staff entry will extend the line.
          </p>
        </div>
      ) : null}

      <div className="mt-auto border-t border-neutral-200 bg-neutral-50/70" aria-label="River level chart legend">
        <div className="grid grid-cols-3 divide-x divide-neutral-200">
          {thresholdRows.map((threshold) => (
            <div key={threshold.level} className="relative px-3 py-3 first:pl-5">
              <span className={`absolute top-0 left-0 h-0.5 w-full ${threshold.surface}`} />
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-8 border-t-2 border-dashed"
                  style={{ borderColor: threshold.color }}
                />
                <p className="text-[10px] font-bold tracking-[0.08em] text-neutral-500 uppercase">
                  Level {threshold.level} · {threshold.label}
                </p>
              </div>
              <p className="mt-1 text-xs font-bold text-neutral-900">{threshold.value.toFixed(1)} m</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function PromptLevelBadge({ level }: { level: AlertPrompt["level"] }) {
  const tone = level === 3 ? "danger" : level === 2 ? "orange" : "warning";
  const label = level === 3 ? "Critical" : level === 2 ? "Evacuate" : "Prepare";
  return (
    <Badge tone={tone}>
      Level {level} · {label}
    </Badge>
  );
}

function RiverAlertPanel({
  isAdmin,
  river,
  onRefresh,
}: {
  isAdmin: boolean;
  river: PublicRiverLevel | undefined;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [promptFilter, setPromptFilter] = React.useState<PromptFilter>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const { data, isLoading, isError, refetch } = useQuery<AlertPrompt[]>({
    queryKey: ["admin", "alert-prompts"],
    queryFn: () =>
      api
        .get<AlertPrompt[]>("/admin/alert-prompts?unresolved_only=false")
        .then((response) => response.data),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/alert-prompts/${id}/acknowledge`),
    onSuccess: () => {
      toast.success("Prompt acknowledged");
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/alert-prompts/${id}`),
    onSuccess: () => {
      toast.success("Prompt deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const prompts = data ?? [];
  const filterCounts = {
    all: prompts.length,
    "to-review": prompts.filter((prompt) => !prompt.acknowledged_at).length,
    acknowledged: prompts.filter((prompt) => Boolean(prompt.acknowledged_at)).length,
  };
  const filteredPrompts = prompts.filter((prompt) => {
    if (promptFilter === "to-review") return !prompt.acknowledged_at;
    if (promptFilter === "acknowledged") return Boolean(prompt.acknowledged_at);
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * PROMPTS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(pageStart, pageStart + PROMPTS_PER_PAGE);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ClipboardCheck}
            size="sm"
            title="River Alert review is admin-only"
            description="BHW staff can record field readings. An admin reviews threshold breaches and decides whether to publish a public alert."
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="min-h-[260px] animate-pulse bg-neutral-50">
        <CardContent className="flex flex-col gap-4">
          <div className="h-4 w-48 rounded bg-neutral-200" />
          <div className="h-16 rounded-xl bg-neutral-200" />
          <div className="h-16 rounded-xl bg-neutral-200" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <ErrorState sectionName="River Alert review" onRetry={() => void refetch()} />;
  }

  const content = (() => {
    if (!isAdmin) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardCheck}
              size="sm"
              title="River Alert review is admin-only"
              description="BHW staff can record field readings. An admin reviews threshold breaches and decides whether to publish a public alert."
            />
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card className="min-h-[260px] animate-pulse bg-neutral-50">
          <CardContent className="flex flex-col gap-4">
            <div className="h-4 w-48 rounded bg-neutral-200" />
            <div className="h-16 rounded-xl bg-neutral-200" />
            <div className="h-16 rounded-xl bg-neutral-200" />
          </CardContent>
        </Card>
      );
    }

    if (isError) {
      return <ErrorState sectionName="River Alert review" onRetry={onRefresh} />;
    }

    if (prompts.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={Waves}
              title="No threshold breaches awaiting review"
              description="When a river reading crosses a configured level, it will appear here for a human decision."
              action={
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw aria-hidden className="size-4" />
                  Refresh feed
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-neutral-200 bg-white shadow-sm-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-200/60 bg-emerald-50 text-emerald-700">
              <Waves aria-hidden className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">River Alert Review</h2>
              <p className="text-xs text-neutral-500">
                Review recorded river-level crossings before issuing a public alert.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={promptFilter}
              onValueChange={(value) => {
                setPromptFilter(value as PromptFilter);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                className="h-8 w-fit border-neutral-200 bg-white text-xs font-semibold text-neutral-800"
                aria-label="Filter river alert prompts by review status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all" className="text-xs">
                  <span>All</span>
                  <span className="tabular-nums text-neutral-500"> ({filterCounts.all})</span>
                </SelectItem>
                <SelectItem value="to-review" className="text-xs">
                  <span>To review</span>
                  <span className="tabular-nums text-neutral-500"> ({filterCounts["to-review"]})</span>
                </SelectItem>
                <SelectItem value="acknowledged" className="text-xs">
                  <span>Acknowledged</span>
                  <span className="tabular-nums text-neutral-500"> ({filterCounts.acknowledged})</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="bg-emerald-700 shadow-sm hover:bg-emerald-800">
              <Link href="/admin/announcements/create-announcement?kind=alert">
                Create alert
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col divide-y divide-neutral-100">
          {paginatedPrompts.map((prompt) => (
            <article
              key={prompt.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ${
                    prompt.level === 3
                      ? "bg-red-50 text-red-700 ring-red-200"
                      : prompt.level === 2
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  <Waves aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PromptLevelBadge level={prompt.level} />
                    <span className="text-body-sm font-semibold text-neutral-900">
                      River level reached {prompt.threshold_value.toFixed(1)} m
                    </span>
                  </div>
                  <p className="text-caption mt-1 text-neutral-500">
                    {prompt.acknowledged_at
                      ? `Acknowledged ${formatPhtDateTime(prompt.acknowledged_at)}`
                      : `Detected ${formatPhtDateTime(prompt.created_at)}`}
                    {prompt.reading_id ? ` · Reading #${prompt.reading_id}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {prompt.acknowledged_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Check aria-hidden className="size-3.5" />
                    Acknowledged
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-9 min-w-9 border-neutral-300 px-0 text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800"
                    disabled={acknowledgeMutation.isPending}
                    aria-label={`Acknowledge Level ${prompt.level} river threshold prompt`}
                    title="Acknowledge threshold prompt"
                    onClick={() => acknowledgeMutation.mutate(prompt.id)}
                  >
                    <Check aria-hidden className="size-4" />
                  </Button>
                )}

                {!prompt.acknowledged_at ? (
                  <ConfirmDeleteButton
                    itemLabel="this threshold prompt"
                    actionLabel="Delete false prompt"
                    onConfirm={() => deleteMutation.mutate(prompt.id)}
                  />
                ) : null}

                {prompt.resulted_in_announcement_id ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <AlertCircle aria-hidden className="size-3.5" />
                    Alert created
                  </span>
                ) : null}
              </div>
            </article>
          ))}
          {filteredPrompts.length === 0 ? (
            <div className="flex min-h-48 flex-1 flex-col items-center justify-center px-6 text-center">
              <ClipboardCheck aria-hidden className="size-6 text-neutral-300" />
              <p className="mt-2 text-sm font-semibold text-neutral-800">
                {promptFilter === "acknowledged" ? "No acknowledged prompts" : "No prompts to review"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Try another review status to see recorded river-level crossings.</p>
            </div>
          ) : null}
        </div>

        {filteredPrompts.length > 0 ? (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/70 px-5 py-3">
            <p className="text-xs text-neutral-600">
              Showing <span className="font-semibold text-neutral-900">{pageStart + 1}–{Math.min(pageStart + PROMPTS_PER_PAGE, filteredPrompts.length)}</span> of {filteredPrompts.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(activePage - 1)}
              >
                <ChevronLeft aria-hidden className="size-3.5" />
                Previous
              </Button>
              <span className="min-w-18 text-center text-[11px] font-semibold text-neutral-600">
                Page {activePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(activePage + 1)}
              >
                Next
                <ChevronRight aria-hidden className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-2">
      <div>{content}</div>
      <RiverHistoryChart thresholds={river?.thresholds} river={river} />
    </div>
  );
}

/* ─────────────────────────────────────── Page ── */

export default function AdminWeatherReadingsPage() {
  const { user } = useRequireRole("admin", "bhw");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const canReview = user?.role === "admin" || user?.role === "superadmin";
  const canSimulate = canReview;
  const requestedTab = searchParams.get("tab") as WeatherWatchTab | null;
  const activeTab: WeatherWatchTab =
    requestedTab === "manual-entry" || (requestedTab === "river-alert" && canReview)
      ? requestedTab
      : "overview";

  const { data: promptData } = useQuery({
    queryKey: ["admin", "alert-prompts"],
    queryFn: () =>
      api
        .get<AlertPrompt[]>("/admin/alert-prompts?unresolved_only=false")
        .then((response) => response.data),
    enabled: canReview,
    refetchInterval: 60_000,
  });
  const pendingPromptCount =
    promptData?.filter((prompt) => !prompt.acknowledged_at).length ?? 0;

  const {
    data: weather,
    isLoading: weatherLoading,
    isError: weatherError,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ["admin", "weather-watch", "weather"],
    queryFn: () =>
      api
        .get<PublicWeatherCurrent>("/public/weather/current")
        .then((response) => response.data),
  });
  const {
    data: river,
    isLoading: riverLoading,
    isError: riverError,
    refetch: refetchRiver,
  } = useQuery({
    queryKey: ["admin", "weather-watch", "river"],
    queryFn: () =>
      api.get<PublicRiverLevel>("/public/river-level").then((response) => response.data),
  });

  const isOverviewLoading = weatherLoading || riverLoading;
  const isOverviewError = weatherError || riverError;

  function selectTab(tab: string) {
    if (tab !== "overview" && tab !== "manual-entry" && tab !== "river-alert") return;
    if (tab === "river-alert" && !canReview) return;
    router.replace(`/admin/weather-readings?tab=${tab}` as Route, { scroll: false });
  }

  function refreshFeed() {
    void refetchWeather();
    void refetchRiver();
    queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        icon={CloudRain}
        title="Weather & Flood Watch"
        description="Monitor the live weather feed, record field readings, and review threshold breaches before issuing public guidance."
      />

      <Card className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm flex flex-col">
        <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
          {/* Connected Underline Tab Bar */}
          <div className="border-b border-neutral-200 bg-white">
            <div
              role="tablist"
              className="flex border-b border-neutral-200 bg-white overflow-x-auto scrollbar-none"
            >
              {/* Overview */}
              <button
                role="tab"
                aria-selected={activeTab === "overview"}
                onClick={() => selectTab("overview")}
                className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <Gauge aria-hidden className="size-4 shrink-0" />
                Overview
              </button>

              {/* River Alert (admin only) */}
              {canReview ? (
                <button
                  role="tab"
                  aria-selected={activeTab === "river-alert"}
                  onClick={() => selectTab("river-alert")}
                  className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all cursor-pointer ${
                    activeTab === "river-alert"
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  <Droplets aria-hidden className="size-4 shrink-0" />
                  River Alert
                  {pendingPromptCount > 0 ? (
                    <span className="ml-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold">
                      {pendingPromptCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {/* Manual Entry */}
              <button
                role="tab"
                aria-selected={activeTab === "manual-entry"}
                onClick={() => selectTab("manual-entry")}
                className={`inline-flex h-13 flex-1 min-w-[160px] items-center justify-center gap-2 border-b-2 px-5 text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === "manual-entry"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/30"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <PenLine aria-hidden className="size-4 shrink-0" />
                Manual Entry
              </button>
            </div>
          </div>

          {/* Tab content panel */}
          <div className="bg-slate-50/50 p-5 sm:p-7 flex-1">
            <TabsContent value="overview" className="mt-0">
              <OverviewPanel
                weather={weather}
                river={river}
                isLoading={isOverviewLoading}
                isError={isOverviewError}
                onRetry={refreshFeed}
              />
            </TabsContent>

            <TabsContent value="manual-entry" className="mt-0">
              <ManualEntryPanel
                canSimulate={canSimulate}
                onReadingRecorded={refreshFeed}
              />
            </TabsContent>

            {canReview ? (
              <TabsContent value="river-alert" className="mt-0">
                <RiverAlertPanel isAdmin={canReview} river={river} onRefresh={refreshFeed} />
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
