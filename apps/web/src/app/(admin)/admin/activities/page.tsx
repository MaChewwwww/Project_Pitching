"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

/** Community activities (FR-ACT-001..003). Admin and SK officer. */

interface Activity {
  id: string;
  title: string;
  type: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  area_id: string | null;
  area_name: string | null;
  is_upcoming: boolean;
}
interface Area {
  id: string;
  name: string;
}

const activityTypes = [
  "drill",
  "seminar",
  "first_aid",
  "cleanup",
  "tree_planting",
  "ngo_program",
  "other",
] as const;

const activitySchema = z.object({
  title: z.string().min(1, "Required"),
  type: z.enum(activityTypes),
  description: z.string().optional().nullable(),
  starts_at: z.string().min(1, "Required"),
  ends_at: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  area_id: z.string().optional().nullable(),
  is_published: z.boolean().default(true),
});
type ActivityFormValues = z.infer<typeof activitySchema>;

export default function AdminActivitiesPage() {
  useRequireRole("admin", "sk");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "activities"],
    queryFn: () => api.get<Activity[]>("/admin/activities").then((r) => r.data),
  });
  const { data: areas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const fields: AdminField[] = [
    { name: "title", label: "Title", type: "text" },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: activityTypes.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
    },
    { name: "description", label: "Description", type: "textarea" },
    { name: "starts_at", label: "Starts at", type: "datetime-local" },
    { name: "ends_at", label: "Ends at", type: "datetime-local" },
    { name: "venue", label: "Venue", type: "text" },
    {
      name: "area_id",
      label: "Area (blank = barangay-wide)",
      type: "select",
      options: [
        { value: "", label: "Barangay-wide" },
        ...(areas ?? []).map((a) => ({ value: a.id, label: a.name })),
      ],
    },
    { name: "is_published", label: "Published", type: "checkbox" },
  ];

  const emptyValues: ActivityFormValues = {
    title: "",
    type: "drill",
    description: "",
    starts_at: "",
    ends_at: "",
    venue: "",
    area_id: "",
    is_published: true,
  };

  function normalize(values: ActivityFormValues) {
    return {
      ...values,
      area_id: values.area_id || null,
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
    };
  }

  const createMutation = useMutation({
    mutationFn: (values: ActivityFormValues) =>
      api.post("/admin/activities", normalize(values)),
    onSuccess: () => {
      toast.success("Activity created");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ActivityFormValues }) =>
      api.patch(`/admin/activities/${id}`, normalize(values)),
    onSuccess: () => {
      toast.success("Activity updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/activities/${id}`),
    onSuccess: () => {
      toast.success("Activity removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
  });

  const columns: ResourceColumn<Activity>[] = [
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    {
      key: "starts_at",
      header: "When",
      render: (row) => formatPhtDateTime(row.starts_at),
    },
    {
      key: "area_name",
      header: "Area",
      render: (row) => row.area_name ?? "Barangay-wide",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Community"
        titleAccent="activities"
        description="Drills, seminars, and community programs shown on the public site."
        action={
          <ResourceFormDialog
            title="Create activity"
            fields={fields}
            schema={activitySchema}
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
        emptyTitle="No activities yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ResourceFormDialog
              title="Edit activity"
              fields={fields}
              schema={activitySchema}
              defaultValues={{
                title: row.title,
                type: row.type as (typeof activityTypes)[number],
                description: row.description ?? "",
                starts_at: row.starts_at.slice(0, 16),
                ends_at: row.ends_at ? row.ends_at.slice(0, 16) : "",
                venue: row.venue ?? "",
                area_id: row.area_id ?? "",
                is_published: true,
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
            <ConfirmDeleteButton
              itemLabel={row.title}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
