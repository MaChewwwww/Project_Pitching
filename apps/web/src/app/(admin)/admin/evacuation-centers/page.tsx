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

/** Evacuation centre operations (FR-EVC-001..003). Admin only. */

interface EvacCenter {
  id: string;
  capacity: number | null;
  is_open: boolean;
  notes: string | null;
  facility: { id: string; name: string };
}
interface Facility {
  id: string;
  name: string;
  type: string;
}

const evacCenterSchema = z.object({
  facility_id: z.string().min(1, "Required"),
  capacity: z.coerce.number().int().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  is_open: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});
type EvacCenterFormValues = z.infer<typeof evacCenterSchema>;

export default function AdminEvacCentersPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "evacuation-centers"],
    queryFn: () =>
      api
        .get<{ items: EvacCenter[] }>("/admin/evacuation-centers")
        .then((r) => r.data.items),
  });
  const { data: facilities } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
  });

  const evacFacilities = (facilities ?? []).filter((f) => f.type === "evacuation_center");

  const fields: AdminField[] = [
    {
      name: "facility_id",
      label: "Facility",
      type: "select",
      options: evacFacilities.map((f) => ({ value: f.id, label: f.name })),
      description:
        'Only facilities of type "evacuation_center" appear here — add one under Facilities first.',
    },
    { name: "capacity", label: "Capacity", type: "number" },
    { name: "contact_person", label: "Contact person", type: "text" },
    { name: "contact_number", label: "Contact number", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "is_open", label: "Open", type: "checkbox" },
  ];

  const emptyValues: EvacCenterFormValues = {
    facility_id: "",
    capacity: undefined,
    contact_person: "",
    contact_number: "",
    is_open: true,
    notes: "",
  };

  const createMutation = useMutation({
    mutationFn: (values: EvacCenterFormValues) =>
      api.post("/admin/evacuation-centers", values),
    onSuccess: () => {
      toast.success("Evacuation center registered");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EvacCenterFormValues }) =>
      api.patch(`/admin/evacuation-centers/${id}`, values),
    onSuccess: () => {
      toast.success("Evacuation center updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
    },
  });

  const columns: ResourceColumn<EvacCenter>[] = [
    { key: "facility", header: "Facility", render: (row) => row.facility.name },
    { key: "capacity", header: "Capacity", render: (row) => row.capacity ?? "—" },
    {
      key: "is_open",
      header: "Status",
      render: (row) => (row.is_open ? "Open" : "Closed"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Evacuation"
        titleAccent="centers"
        description="Capacity and open/closed status shown on the public site."
        action={
          <ResourceFormDialog
            title="Register an evacuation center"
            fields={fields}
            schema={evacCenterSchema}
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
        emptyTitle="No evacuation centers yet"
        emptyDescription='Add a facility of type "evacuation_center" first, then register it here.'
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <ResourceFormDialog
            title="Edit evacuation center"
            fields={fields}
            schema={evacCenterSchema}
            defaultValues={{
              facility_id: row.facility.id,
              capacity: row.capacity ?? undefined,
              contact_person: "",
              contact_number: "",
              is_open: row.is_open,
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
