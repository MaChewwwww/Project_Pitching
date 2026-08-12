"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Pencil } from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  plainValue,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  FacilityFormDialog,
  type FacilityFormValues,
} from "@/components/features/map/facility-form";
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

export default function AdminFacilitiesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

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
    onError: (error) => {
      throw toDisplayError(error);
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

  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name ?? "—";

  const emptyValues: FacilityFormValues = {
    name: "",
    type: "evacuation_center",
    address: "",
    contact_number: "",
    longitude: 121.135,
    latitude: 14.735,
    area_id: null,
    is_active: true,
  };

  const columns: ResourceColumn<Facility>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type", render: (row) => plainValue(row.type) },
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
      <AdminPageHeader
        title="Barangay Facilities"
        description="Evacuation centers, clinics, hospitals, and other facilities shown on the public map."
        action={
          <FacilityFormDialog
            title="Add facility"
            defaultValues={emptyValues}
            areas={areas}
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
            <FacilityFormDialog
              title="Edit facility"
              defaultValues={{
                name: row.name,
                type: row.type as FacilityFormValues["type"],
                address: row.address ?? "",
                contact_number: row.contact_number ?? "",
                longitude: row.location.coordinates[0],
                latitude: row.location.coordinates[1],
                area_id: row.area_id ?? null,
                is_active: row.is_active,
              }}
              areas={areas}
              onSubmit={async (values) => {
                await updateMutation.mutateAsync({ id: row.id, values });
              }}
              trigger={
                <Button
                  size="sm"
                  variant="warning"
                  className="h-8 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors px-2.5 gap-1.5 font-semibold text-xs cursor-pointer"
                  title="Edit facility"
                  aria-label="Edit facility"
                >
                  <Pencil aria-hidden className="size-3.5 shrink-0" />
                  <span className="md:hidden">Edit</span>
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
