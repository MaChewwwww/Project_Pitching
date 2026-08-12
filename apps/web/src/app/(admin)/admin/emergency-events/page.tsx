"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Siren } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import type { EmergencyEventOut } from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * Declare/end an emergency event (FR-SAF-018, FR-SAF-019). This is the
 * prerequisite every other safety surface depends on — `safety_status` and
 * `unregistered_person` are event-scoped, and nothing can be recorded there
 * until an event exists. See the Aug 2026 changelog entry in frs_nfrs.md for
 * why these two requirements exist at all: they were not in the original
 * spec, only inferred from what every other SAF row assumes.
 */

const eventTypes = ["flood", "earthquake", "typhoon", "fire", "other"] as const;

const declareSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(eventTypes),
  supersede_active: z.boolean(),
});
type DeclareFormValues = z.infer<typeof declareSchema>;

const fields: AdminField[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Continuous Heavy Rainfall — Riverside Areas",
  },
  {
    name: "type",
    label: "Type",
    type: "select",
    options: eventTypes.map((t) => ({ value: t, label: t })),
  },
  {
    name: "supersede_active",
    label: "End the currently active event, if any, and declare this one instead",
    type: "checkbox",
  },
];

export default function AdminEmergencyEventsPage() {
  useRequireRole("admin", "bhw", "sk");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 50 },
        })
        .then((r) => r.data.items),
  });

  const declareMutation = useMutation({
    mutationFn: (values: DeclareFormValues) =>
      api.post("/admin/emergency-events", values),
    onSuccess: () => {
      toast.success("Emergency event declared");
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/emergency-events/${id}/end`),
    onSuccess: () => {
      toast.success("Emergency event ended");
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const columns: ResourceColumn<EmergencyEventOut>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    {
      key: "is_active",
      header: "Status",
      render: (row) =>
        row.is_active ? (
          <Badge tone="danger">Active</Badge>
        ) : (
          <Badge tone="neutral">Ended</Badge>
        ),
    },
    {
      key: "started_at",
      header: "Started",
      render: (row) => new Date(row.started_at).toLocaleString(),
    },
    {
      key: "declared_by_name",
      header: "Declared by",
      render: (row) => row.declared_by_name ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Emergency Events"
        description="Declaring an event opens the safety check-in, rescue queue, and accounted-for dashboard for it. At most one event is active at a time."
        action={
          <ResourceFormDialog
            title="Declare emergency event"
            fields={fields}
            schema={declareSchema}
            defaultValues={{ name: "", type: "flood" as const, supersede_active: false }}
            onSubmit={async (values) => {
              await declareMutation.mutateAsync(values);
            }}
            trigger={
              <Button size="sm">
                <Siren aria-hidden className="size-4" />
                Declare event
              </Button>
            }
          />
        }
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No emergency events yet"
        getRowKey={(row) => row.id}
        rowActions={(row) =>
          row.is_active ? (
            <Button
              size="sm"
              variant="outline"
              disabled={endMutation.isPending}
              onClick={() => endMutation.mutate(row.id)}
            >
              End
            </Button>
          ) : null
        }
      />
    </div>
  );
}
