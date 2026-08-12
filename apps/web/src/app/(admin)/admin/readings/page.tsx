"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronRight,
  CloudLightning,
  CloudRain,
  ClipboardCheck,
  Gauge,
  Plus,
  RefreshCw,
  Waves,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { AdminForm, type AdminField } from "@/components/features/admin/admin-form";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { Badge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { RiverLevelPanel } from "@/components/features/weather/river-level-panel";
import { WeatherPanel } from "@/components/features/weather/weather-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";
import type { PublicRiverLevel, PublicWeatherCurrent } from "@/lib/api/public-types";

/**
 * The unified Weather & Flood Watch workspace (FR-WX-*).
 *
 * Overview, manual entry, and threshold review belong together operationally:
 * the officer sees the same cached public feed before deciding whether to add
 * a manual reading or review a human-issued alert prompt. Flood History stays
 * as its own record-management route because it has a different lifecycle.
 */

type WeatherWatchTab = "overview" | "manual-entry" | "threshold-review";

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

const fields: AdminField[] = [
  {
    name: "metric",
    label: "Metric",
    type: "select",
    options: metrics.map((metric) => ({
      value: metric,
      label: metric.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    })),
  },
  { name: "value", label: "Value", type: "number" },
  { name: "unit", label: "Unit", type: "text", placeholder: "m, mm, °C, %" },
  {
    name: "observed_at",
    label: "Observed at (blank = now)",
    type: "datetime-local",
    description: "Leave blank if you are reading this right now.",
  },
];

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

function TabIcon({ icon: Icon }: { icon: typeof Gauge }) {
  return <Icon aria-hidden className="size-4" />;
}

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
    <div className="flex flex-col gap-4">
      <div className="border-b border-neutral-200 pb-3">
        <h2 className="text-h3 text-neutral-900">Weather &amp; River Level</h2>
        <p className="text-body-sm text-neutral-600">
          Monitor real-time weather metrics and the DOST-PAGASA Montalban river gauge.
          These cached readings are the same ones shown to San Jose residents on the
          public weather page.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <WeatherPanel weather={weather} />
        <RiverLevelPanel river={river} density="compact" />
      </div>
    </div>
  );
}

function ManualEntryPanel({
  canSimulate,
  onReadingRecorded,
}: {
  canSimulate: boolean;
  onReadingRecorded: () => void;
}) {
  const queryClient = useQueryClient();
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3 border-b border-neutral-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Plus aria-hidden className="size-4" />
            </span>
            <div>
              <h2 className="text-h3 text-neutral-900">Record a field reading</h2>
              <p className="text-body-sm text-neutral-600">
                Use this when a gauge or automated fetch is unavailable. Staff entries are
                stored beside automated readings with their source and timestamp.
              </p>
            </div>
          </div>
          <AdminForm
            fields={fields}
            schema={readingSchema}
            defaultValues={emptyValues}
            submitLabel="Record reading"
            onSubmit={async (values) => {
              await submitMutation.mutateAsync(values);
            }}
          />
        </CardContent>
      </Card>

      <Card className="h-fit border-amber-200/80 bg-amber-50/35">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <CloudLightning aria-hidden className="size-4" />
            </span>
            <div>
              <h2 className="text-h3 text-neutral-900">Demo scenario</h2>
              <p className="text-body-sm text-neutral-700">
                Admins can write a rising sequence to exercise the gauge and human-review
                workflow during a presentation. It never publishes an alert automatically.
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

function PromptLevelBadge({ level }: { level: AlertPrompt["level"] }) {
  const tone = level === 3 ? "danger" : level === 2 ? "orange" : "warning";
  const label = level === 3 ? "Critical" : level === 2 ? "Evacuate" : "Prepare";
  return (
    <Badge tone={tone}>
      Level {level} · {label}
    </Badge>
  );
}

function ThresholdReviewPanel({
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
            title="Threshold review is admin-only"
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
    return <ErrorState sectionName="Threshold review" onRetry={() => void refetch()} />;
  }

  const prompts = data ?? [];
  const pendingCount = prompts.filter((prompt) => !prompt.acknowledged_at).length;
  if (prompts.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ClipboardCheck}
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-h3 text-neutral-900">Threshold review queue</h2>
            <p className="text-body-sm text-neutral-600">
              A prompt records a threshold crossing; it does not publish anything by
              itself.
            </p>
          </div>
          <Badge tone={pendingCount > 0 ? "warning" : "success"} icon={AlertCircle}>
            {pendingCount > 0
              ? `${pendingCount} awaiting review`
              : "All prompts reviewed"}
          </Badge>
        </div>

        <div className="flex flex-col divide-y divide-neutral-200">
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200">
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
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    Boolean(prompt.acknowledged_at) || acknowledgeMutation.isPending
                  }
                  onClick={() => acknowledgeMutation.mutate(prompt.id)}
                >
                  <Check aria-hidden className="size-4" />
                  {prompt.acknowledged_at ? "Acknowledged" : "Acknowledge"}
                </Button>
                {!prompt.acknowledged_at ? (
                  <ConfirmDeleteButton
                    itemLabel="this threshold prompt"
                    actionLabel="Delete false prompt"
                    onConfirm={() => deleteMutation.mutate(prompt.id)}
                  />
                ) : null}
                {prompt.resulted_in_announcement_id ? (
                  <Badge tone="success">Alert created</Badge>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800"
                  >
                    <Link href="/admin/announcements/create-announcement?kind=alert">
                      Create alert
                      <ChevronRight aria-hidden className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReadingsPage() {
  const { user } = useRequireRole("admin", "bhw");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const canReview = user?.role === "admin" || user?.role === "superadmin";
  const canSimulate = canReview;
  const requestedTab = searchParams.get("tab") as WeatherWatchTab | null;
  const activeTab: WeatherWatchTab =
    requestedTab === "manual-entry" || (requestedTab === "threshold-review" && canReview)
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
    if (tab !== "overview" && tab !== "manual-entry" && tab !== "threshold-review")
      return;
    if (tab === "threshold-review" && !canReview) return;
    router.replace(`/admin/readings?tab=${tab}`, { scroll: false });
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

      <Card className="overflow-visible p-2 sm:p-3">
        <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
          <TabsList
            variant="line"
            className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3"
          >
            <TabsTrigger
              value="overview"
              className="h-11 justify-start gap-2 rounded-lg px-3 text-sm data-active:bg-emerald-50 data-active:text-emerald-900 sm:justify-center"
            >
              <TabIcon icon={Gauge} />
              Overview
            </TabsTrigger>
            {canReview ? (
              <TabsTrigger
                value="threshold-review"
                className="h-11 justify-start gap-2 rounded-lg px-3 text-sm data-active:bg-emerald-50 data-active:text-emerald-900 sm:justify-center"
              >
                <TabIcon icon={ClipboardCheck} />
                Threshold Review
                {pendingPromptCount > 0 ? (
                  <span className="ml-0.5 min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-amber-900">
                    {pendingPromptCount}
                  </span>
                ) : null}
              </TabsTrigger>
            ) : null}
            <TabsTrigger
              value="manual-entry"
              className={
                canReview
                  ? "col-span-2 h-11 justify-start gap-2 rounded-lg px-3 text-sm data-active:bg-emerald-50 data-active:text-emerald-900 sm:col-span-1 sm:justify-center"
                  : "h-11 justify-start gap-2 rounded-lg px-3 text-sm data-active:bg-emerald-50 data-active:text-emerald-900 sm:justify-center"
              }
            >
              <TabIcon icon={Plus} />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 border-t border-neutral-200 pt-4">
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
              <TabsContent value="threshold-review" className="mt-0">
                <ThresholdReviewPanel isAdmin={canReview} onRefresh={refreshFeed} />
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
