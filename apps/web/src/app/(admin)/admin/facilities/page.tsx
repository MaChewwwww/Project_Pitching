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

/** Barangay facility registry (FR-SYS-015, FR-MAP-005/006). Admin only. */

interface Facility {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_number: string | null;
  location: { coordinates: [number, number] };
  area_id: string | null;
  is_active: boolean;
}
interface Area {
  id: string;
  name: string;
}

const facilityTypes = [
  "evacuation_center",
  "hospital",
  "clinic",
  "barangay_hall",
  "police",
  "fire",
  "rescue_station",
] as const;

const facilitySchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(facilityTypes),
  address: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  area_id: z.string().min(1, "Required"),
  is_active: z.boolean().default(true),
});
type FacilityFormValues = z.infer<typeof facilitySchema>;

export default function AdminFacilitiesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
  });
  const { data: areas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const fields: AdminField[] = [
    { name: "name", label: "Name", type: "text" },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: facilityTypes.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
    },
    { name: "address", label: "Address", type: "text" },
    { name: "contact_number", label: "Contact number", type: "text" },
    {
      name: "longitude",
      label: "Longitude",
      type: "number",
      description: "e.g. 121.135",
    },
    { name: "latitude", label: "Latitude", type: "number", description: "e.g. 14.735" },
    {
      name: "area_id",
      label: "Area",
      type: "select",
      options: (areas ?? []).map((a) => ({ value: a.id, label: a.name })),
    },
    { name: "is_active", label: "Active", type: "checkbox" },
  ];

  const emptyValues: FacilityFormValues = {
    name: "",
    type: "evacuation_center",
    address: "",
    contact_number: "",
    longitude: 121.135,
    latitude: 14.735,
    area_id: "",
    is_active: true,
  };

  const createMutation = useMutation({
    mutationFn: (values: FacilityFormValues) => api.post("/admin/facilities", values),
    onSuccess: () => {
      toast.success("Facility added");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FacilityFormValues }) =>
      api.patch(`/admin/facilities/${id}`, values),
    onSuccess: () => {
      toast.success("Facility updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/facilities/${id}`),
    onSuccess: () => {
      toast.success("Facility removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
    onError: () => toast.error("Could not remove facility"),
  });

  const areaName = (id: string | null) => areas?.find((a) => a.id === id)?.name ?? "—";

  const columns: ResourceColumn<Facility>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type", render: (row) => row.type.replace(/_/g, " ") },
    { key: "area", header: "Area", render: (row) => areaName(row.area_id) },
    { key: "address", header: "Address", render: (row) => row.address ?? "—" },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Barangay"
        titleAccent="facilities"
        description="Evacuation centres, clinics, hospitals, and other facilities shown on the public map."
        action={
          <ResourceFormDialog
            title="Add facility"
            fields={fields}
            schema={facilitySchema}
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
        emptyTitle="No facilities yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ResourceFormDialog
              title="Edit facility"
              fields={fields}
              schema={facilitySchema}
              defaultValues={{
                name: row.name,
                type: row.type as (typeof facilityTypes)[number],
                address: row.address ?? "",
                contact_number: row.contact_number ?? "",
                longitude: row.location.coordinates[0],
                latitude: row.location.coordinates[1],
                area_id: row.area_id ?? "",
                is_active: row.is_active,
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
              itemLabel={row.name}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
