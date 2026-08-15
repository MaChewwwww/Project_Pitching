"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import * as React from "react";
import { Crosshair } from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

import { EvacCheckinManagerDialog } from "@/components/features/admin/evac-checkin-manager-dialog";
import { AdminAssetMap } from "@/components/features/map/admin-asset-map-dynamic";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";

/** Evacuation centre operations (FR-EVC-001..003). Admin only. */

interface EvacCenter {
  id: string;
  capacity: number | null;
  occupancy?: number;
  is_open: boolean;
  notes: string | null;
  facility: {
    id: string;
    name: string;
    location: { coordinates: [number, number] };
    area_name?: string | null;
    is_active?: boolean;
  };
  is_active?: boolean;
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
    queryFn: () => api.get<EvacCenter[]>("/admin/evacuation-centers").then((r) => r.data),
  });
  const { data: boundaries = [] } = useQuery({
    queryKey: ["public", "area-boundaries", "admin-evacuation"],
    queryFn: () =>
      api
        .get<{ features: AreaBoundaryFeature[] }>("/public/area-boundaries")
        .then((r) => r.data.features),
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
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
    {
      key: "occupancy",
      header: "Occupancy",
      render: (row) => (
        <span className="rounded border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 tabular-nums">
          {row.occupancy ?? 0} / {row.capacity ?? "—"}
        </span>
      ),
    },
    {
      key: "is_open",
      header: "Status",
      render: (row) => (row.is_open ? "Open" : "Closed"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Evacuation Centers"
        description="Capacity, live check-ins, and open/closed status."
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

      <section
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
        aria-label="Evacuation center map workspace"
      >
        <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg sm:h-[460px]">
          <AdminAssetMap
            items={(data ?? []).map((center) => {
              const inactive =
                center.is_active === false || center.facility.is_active === false;
              const ratio = center.capacity
                ? (center.occupancy ?? 0) / center.capacity
                : 0;
              return {
                id: center.id,
                name: center.facility.name,
                location: center.facility.location,
                area_name: center.facility.area_name,
                statusLabel: inactive
                  ? "Inactive"
                  : !center.is_open
                    ? "Closed"
                    : center.capacity && ratio >= 1
                      ? "At capacity"
                      : ratio >= 0.8
                        ? "Near capacity"
                        : "Open",
                tone:
                  inactive || !center.is_open
                    ? ("slate" as const)
                    : center.capacity && ratio >= 1
                      ? ("rose" as const)
                      : ratio >= 0.8
                        ? ("amber" as const)
                        : ("emerald" as const),
                detail: `${center.occupancy ?? 0} / ${center.capacity ?? "—"} occupants`,
              };
            })}
            selectedId={selectedId}
            onSelect={setSelectedId}
            areaBoundaries={boundaries}
            showHazard
          />
        </div>
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-overline font-bold tracking-wider text-neutral-500">
            Evacuation readiness
          </p>
          <p className="mt-2 text-3xl font-black text-neutral-900 tabular-nums">
            {data?.filter((item) => item.is_open && item.is_active !== false).length ?? 0}
          </p>
          <p className="text-sm text-neutral-500">centers currently open</p>
          <dl className="mt-6 space-y-3 border-t border-neutral-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">At capacity</dt>
              <dd className="font-bold text-rose-700">
                {data?.filter(
                  (item) => item.capacity && (item.occupancy ?? 0) >= item.capacity,
                ).length ?? 0}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Total capacity</dt>
              <dd className="font-bold text-neutral-800">
                {data?.reduce((total, item) => total + (item.capacity ?? 0), 0) ?? 0}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-neutral-500">
            Flood depth is a planning overlay; availability remains an operational
            decision.
          </p>
        </aside>
      </section>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No evacuation centers yet"
        emptyDescription='Add a facility of type "evacuation_center" first, then register it here.'
        getRowKey={(row) => row.id}
        selectedRowKey={selectedId}
        onRowSelect={(row) => setSelectedId(row.id)}
        rowActions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedId(row.id)}
              aria-label={`Locate ${row.facility.name}`}
            >
              <Crosshair aria-hidden className="size-3.5" />
            </Button>
            <EvacCheckinManagerDialog
              centerId={row.id}
              centerName={row.facility.name}
              capacity={row.capacity}
            />
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
          </div>
        )}
      />
    </div>
  );
}
