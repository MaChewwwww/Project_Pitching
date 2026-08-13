"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
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
  onRefresh,
}: {
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
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

  const prompts = data ?? [];
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
    <div className="space-y-6 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs sm:p-8">
      {/* Header row: title/description + create alert CTA */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
            <Waves aria-hidden className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">River Alert</h2>
            <p className="text-xs text-neutral-500">
              A prompt records a threshold crossing; it does not publish anything by itself.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 shadow-sm"
        >
          <Link href="/admin/announcements/create-announcement?kind=alert">
            Create alert
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Prompt list */}
      <div className="flex flex-col divide-y divide-neutral-100">
        {prompts.map((prompt) => (
          <article
            key={prompt.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
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
                    River threshold crossed at {prompt.threshold_value} m
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
              {/* Acknowledge */}
              {prompt.acknowledged_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <Check aria-hidden className="size-3.5" />
                  Acknowledged
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => acknowledgeMutation.mutate(prompt.id)}
                >
                  <Check aria-hidden className="size-4" />
                  Acknowledge
                </Button>
              )}

              {/* Delete (unacknowledged only) */}
              {!prompt.acknowledged_at ? (
                <ConfirmDeleteButton
                  itemLabel="this threshold prompt"
                  actionLabel="Delete false prompt"
                  onConfirm={() => deleteMutation.mutate(prompt.id)}
                />
              ) : null}

              {/* Alert status */}
              {prompt.resulted_in_announcement_id ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <AlertCircle aria-hidden className="size-3.5" />
                  Alert created
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
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

      <Card className="overflow-visible p-0">
        <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
          {/* Tab bar — plain div so shadcn TabsList defaults don't interfere */}
          <div className="border-b border-neutral-200">
            <div
              role="tablist"
              className="flex"
            >
              {/* Overview */}
              <button
                role="tab"
                aria-selected={activeTab === "overview"}
                onClick={() => selectTab("overview")}
                className={`inline-flex h-12 flex-1 items-center justify-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "overview"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
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
                  className={`inline-flex h-12 flex-1 items-center justify-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
                    activeTab === "river-alert"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Droplets aria-hidden className="size-4 shrink-0" />
                  River Alert
                  {pendingPromptCount > 0 ? (
                    <span className="ml-0.5 min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-amber-900">
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
                className={`inline-flex h-12 flex-1 items-center justify-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
                  activeTab === "manual-entry"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <PenLine aria-hidden className="size-4 shrink-0" />
                Manual Entry
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-6">
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
                <RiverAlertPanel isAdmin={canReview} onRefresh={refreshFeed} />
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
