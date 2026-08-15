"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Pencil } from "lucide-react";
import * as React from "react";
import { Crosshair } from "lucide-react";

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
import { AdminAssetMap } from "@/components/features/map/admin-asset-map-dynamic";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";

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
  const { data: boundaries = [] } = useQuery({
    queryKey: ["public", "area-boundaries", "admin-assets"],
    queryFn: () =>
      api
        .get<{ features: AreaBoundaryFeature[] }>("/public/area-boundaries")
        .then((r) => r.data.features),
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

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
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/facilities/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Facility reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
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

      <section
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
        aria-label="Facility map workspace"
      >
        <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg sm:h-[460px]">
          <AdminAssetMap
            items={(data ?? []).map((facility) => ({
              id: facility.id,
              name: facility.name,
              location: facility.location,
              area_name: areaName(facility.area_id),
              statusLabel: facility.is_active ? "Active facility" : "Inactive facility",
              tone: facility.is_active ? "emerald" : "slate",
              detail: facility.type.replaceAll("_", " "),
            }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
            areaBoundaries={boundaries}
          />
        </div>
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-overline font-bold tracking-wider text-neutral-500">
            Facility registry
          </p>
          <p className="mt-2 text-3xl font-black text-neutral-900 tabular-nums">
            {data?.length ?? 0}
          </p>
          <p className="text-sm text-neutral-500">mapped facilities</p>
          <dl className="mt-6 space-y-3 border-t border-neutral-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Active</dt>
              <dd className="font-bold text-emerald-700">
                {data?.filter((item) => item.is_active).length ?? 0}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Inactive</dt>
              <dd className="font-bold text-neutral-700">
                {data?.filter((item) => !item.is_active).length ?? 0}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-neutral-500">
            Select a pin or registry row to keep the map and list in sync.
          </p>
        </aside>
      </section>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No facilities yet"
        getRowKey={(row) => row.id}
        selectedRowKey={selectedId}
        onRowSelect={(row) => setSelectedId(row.id)}
        rowActions={(row) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(row.id)}
              aria-label={`Locate ${row.name}`}
            >
              <Crosshair aria-hidden className="size-3.5" />
              <span className="sr-only">Locate</span>
            </Button>
            {row.is_active ? (
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
                    className="h-8 cursor-pointer gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
                    title="Edit facility"
                    aria-label="Edit facility"
                  >
                    <Pencil aria-hidden className="size-3.5 shrink-0" />
                    <span className="md:hidden">Edit</span>
                  </Button>
                }
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => reactivateMutation.mutate(row.id)}
              >
                Reactivate
              </Button>
            )}
            {row.is_active ? (
              <ConfirmDeleteButton
                itemLabel={row.name}
                onConfirm={() => deleteMutation.mutate(row.id)}
              />
            ) : null}
          </>
        )}
      />
    </div>
  );
}
