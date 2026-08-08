"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDate } from "@/lib/format";

/** Flood history (FR-WX-013). Admin only. */

interface FloodEvent {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  peak_level_m: number | null;
  households_displaced: number | null;
  notes: string | null;
}
interface Page<T> {
  items: T[];
}

const floodEventSchema = z.object({
  name: z.string().min(1, "Required"),
  started_at: z.string().min(1, "Required"),
  ended_at: z.string().optional().nullable(),
  peak_level_m: z.coerce.number().optional().nullable(),
  households_displaced: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});
type FloodEventFormValues = z.infer<typeof floodEventSchema>;

const fields: AdminField[] = [
  { name: "name", label: "Name", type: "text", placeholder: "Typhoon Ulysses (Vamco)" },
  { name: "started_at", label: "Started", type: "datetime-local" },
  { name: "ended_at", label: "Ended", type: "datetime-local" },
  { name: "peak_level_m", label: "Peak level (m)", type: "number" },
  { name: "households_displaced", label: "Households displaced", type: "number" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const emptyValues: FloodEventFormValues = {
  name: "",
  started_at: "",
  ended_at: "",
  peak_level_m: undefined,
  households_displaced: undefined,
  notes: "",
};

export default function AdminFloodEventsPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "flood-events"],
    queryFn: () =>
      api.get<Page<FloodEvent>>("/admin/flood-events").then((r) => r.data.items),
  });

  function normalize(values: FloodEventFormValues) {
    return {
      ...values,
      started_at: new Date(values.started_at).toISOString(),
      ended_at: values.ended_at ? new Date(values.ended_at).toISOString() : null,
      area_ids: [],
    };
  }

  const createMutation = useMutation({
    mutationFn: (values: FloodEventFormValues) =>
      api.post("/admin/flood-events", normalize(values)),
    onSuccess: () => {
      toast.success("Flood event recorded");
      queryClient.invalidateQueries({ queryKey: ["admin", "flood-events"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FloodEventFormValues }) =>
      api.patch(`/admin/flood-events/${id}`, normalize(values)),
    onSuccess: () => {
      toast.success("Flood event updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "flood-events"] });
    },
  });

  const columns: ResourceColumn<FloodEvent>[] = [
    { key: "name", header: "Name" },
    {
      key: "started_at",
      header: "Started",
      render: (row) => formatPhtDate(row.started_at),
    },
    {
      key: "peak_level_m",
      header: "Peak level",
      render: (row) => (row.peak_level_m ? `${row.peak_level_m} m` : "—"),
    },
    {
      key: "households_displaced",
      header: "Households displaced",
      render: (row) => row.households_displaced ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flood"
        titleAccent="history"
        description="Publicly viewable flood event history."
        action={
          <ResourceFormDialog
            title="Record a flood event"
            fields={fields}
            schema={floodEventSchema}
            defaultValues={emptyValues}
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
          />
        }
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No flood events recorded yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <ResourceFormDialog
            title="Edit flood event"
            fields={fields}
            schema={floodEventSchema}
            defaultValues={{
              name: row.name,
              started_at: row.started_at.slice(0, 16),
              ended_at: row.ended_at ? row.ended_at.slice(0, 16) : "",
              peak_level_m: row.peak_level_m ?? undefined,
              households_displaced: row.households_displaced ?? undefined,
              notes: row.notes ?? "",
            }}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: row.id, values });
            }}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
        )}
      />
    </div>
  );
}
