"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudLightning } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { AdminForm, type AdminField } from "@/components/features/admin/admin-form";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

/**
 * Manual river/weather reading entry (FR-WX-007) — a first-class source, not a
 * fallback bolted on. When the PAGASA gauge is dry or the scraper is down, a
 * barangay officer types the number in here and every downstream feature
 * (river-level panel, threshold evaluation) keeps working unchanged.
 */

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
    options: metrics.map((m) => ({ value: m, label: m.replace(/_/g, " ") })),
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

export default function AdminReadingsPage() {
  useRequireRole("admin", "bhw");
  const queryClient = useQueryClient();

  const { data: river } = useQuery({
    queryKey: ["public", "river-level"],
    queryFn: () => api.get("/public/river-level").then((r) => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (values: ReadingFormValues) =>
      api.post("/admin/readings", {
        ...values,
        observed_at: values.observed_at
          ? new Date(values.observed_at).toISOString()
          : undefined,
      }),
    onSuccess: () => toast.success("Reading recorded"),
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      api
        .post<SimulateTyphoonResult>("/admin/readings/simulate-typhoon")
        .then((r) => r.data),
    onSuccess: (result) => {
      toast.success(
        `Simulated typhoon: ${result.readings.length} readings, ` +
          `${result.alert_prompts_created} alert prompt(s), ` +
          `highest level ${result.highest_alert_level}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["public", "river-level"] });
    },
    onError: () => toast.error("Could not run the simulation"),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="River & Weather Readings"
        description="Enter a reading directly when the automated PAGASA/Open-Meteo fetch is unavailable."
      />

      <Card className="max-w-lg border-dashed">
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-body font-semibold text-neutral-900">Simulate typhoon</p>
            <p className="text-body-sm text-neutral-500">
              Demo tool only. Writes a rising sequence of river-level and weather readings
              and the alert prompts they trigger, so a live pitch does not depend on real
              weather cooperating. Never publishes a public alert on its own.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                disabled={simulateMutation.isPending}
              >
                <CloudLightning aria-hidden className="size-3.5" />
                Simulate typhoon
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Simulate a typhoon?</AlertDialogTitle>
                <AlertDialogDescription>
                  This writes real manual readings and alert prompts to this environment.
                  Only use it on the demo stack.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => simulateMutation.mutate()}>
                  Run simulation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {river?.reading ? (
        <Card>
          <CardContent>
            <p className="text-body-sm text-neutral-500">Latest river level on record</p>
            <p className="text-h2 text-neutral-900">
              {river.reading.value} {river.reading.unit}
              <span className="text-body-sm ml-2 font-normal text-neutral-500">
                {formatPhtDateTime(river.reading.observed_at)} · {river.reading.source}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="max-w-lg">
        <CardContent>
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
    </div>
  );
}
