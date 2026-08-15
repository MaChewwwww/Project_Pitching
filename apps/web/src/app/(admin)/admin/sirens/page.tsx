"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Volume2, VolumeX } from "lucide-react";
import { Crosshair } from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LatLng } from "@/components/features/registry/location-picker";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { useSirenAudio } from "@/hooks/use-siren-audio";
import { AdminAssetMap } from "@/components/features/map/admin-asset-map-dynamic";
import type { AreaBoundaryFeature } from "@/lib/api/public-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-52 animate-pulse rounded-lg bg-neutral-100" />,
  },
);

interface Siren {
  id: string;
  name: string;
  status: "idle" | "sounding" | "testing";
  location: { coordinates: [number, number] };
  area_id: string | null;
  area_name?: string | null;
  is_active: boolean;
  last_triggered_at?: string | null;
}

interface Area {
  id: string;
  name: string;
}

const sirenSchema = z.object({
  name: z.string().min(1, "Required"),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
});

type SirenFormValues = z.infer<typeof sirenSchema>;

function SirenFormDialog({
  title,
  defaultValues,
  areas,
  onSubmit,
  trigger,
}: {
  title: string;
  defaultValues: SirenFormValues;
  areas: Area[];
  onSubmit: (values: SirenFormValues) => Promise<void>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SirenFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sirenSchema) as any,
    defaultValues,
  });

  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  function handlePinChange(latlng: LatLng) {
    setValue("latitude", latlng.lat, { shouldValidate: true });
    setValue("longitude", latlng.lng, { shouldValidate: true });
  }

  async function submit(values: SirenFormValues) {
    await onSubmit(values);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) reset(defaultValues);
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Add siren unit</Button>}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siren-name">Unit name / location description *</Label>
            <Input
              id="siren-name"
              {...register("name")}
              placeholder="e.g. Area 1 Primary Siren"
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siren-area">
              Area{" "}
              <span className="text-xs font-normal text-neutral-400">
                (auto-detected from pin if blank)
              </span>
            </Label>
            <Controller
              name="area_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v === "" ? null : v)}
                >
                  <SelectTrigger id="siren-area">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-detect from pin</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location *</Label>
            <p className="text-xs text-neutral-500">
              Click or drag the pin to place the siren.
            </p>
            <div className="h-52 overflow-hidden rounded-lg border border-neutral-200">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                caption="Click to place siren unit."
                className="h-full"
                restrictToBarangay
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="siren-lat" className="text-xs">
                  Latitude
                </Label>
                <Input
                  id="siren-lat"
                  type="number"
                  step="0.000001"
                  {...register("latitude")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="siren-lon" className="text-xs">
                  Longitude
                </Label>
                <Input
                  id="siren-lon"
                  type="number"
                  step="0.000001"
                  {...register("longitude")}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSirensPage() {
  useRequireRole("admin");
  const sirenAudio = useSirenAudio();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "sirens"],
    queryFn: () => api.get<Siren[]>("/admin/sirens").then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });
  const { data: boundaries = [] } = useQuery({
    queryKey: ["public", "area-boundaries", "admin-sirens"],
    queryFn: () =>
      api
        .get<{ features: AreaBoundaryFeature[] }>("/public/area-boundaries")
        .then((r) => r.data.features),
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: SirenFormValues) => api.post("/admin/sirens", values),
    onSuccess: () => {
      toast.success("Siren unit added");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SirenFormValues }) =>
      api.patch(`/admin/sirens/${id}`, values),
    onSuccess: () => {
      toast.success("Siren unit updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/trigger`),
    onSuccess: (res: { data: Siren }) => {
      sirenAudio.start();
      toast.success(
        res.data.status === "sounding"
          ? "Siren triggered (sounding)"
          : "Siren silenced (idle)",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  const silenceMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/silence`),
    onSuccess: () => {
      sirenAudio.stop();
      toast.success("Siren silenced");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sirens/${id}/reactivate`),
    onSuccess: () => {
      toast.success("Siren reactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sirens/${id}`),
    onSuccess: () => {
      toast.success("Siren unit removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
    onError: () => toast.error("Could not remove siren unit"),
  });

  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name ?? "—";

  const emptyValues: SirenFormValues = {
    name: "",
    longitude: 121.135,
    latitude: 14.735,
    area_id: null,
  };

  const columns: ResourceColumn<Siren>[] = [
    { key: "name", header: "Unit Name" },
    { key: "area", header: "Area", render: (row) => areaName(row.area_id) },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.status === "sounding"
              ? "animate-pulse bg-red-100 text-red-800"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {row.status === "sounding" ? (
            <>
              <Volume2 className="size-3 text-red-600" />
              Sounding
            </>
          ) : (
            <>
              <VolumeX className="size-3 text-neutral-400" />
              Idle
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Siren Units"
        description="Manual-trigger siren locations for public map visualization and emergency simulation."
        action={
          <SirenFormDialog
            title="Add siren unit"
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
        aria-label="Siren map workspace"
      >
        <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg sm:h-[460px]">
          <AdminAssetMap
            items={(data ?? []).map((siren) => ({
              id: siren.id,
              name: siren.name,
              location: siren.location,
              area_name: siren.area_name ?? areaName(siren.area_id),
              statusLabel: siren.is_active
                ? siren.status === "sounding"
                  ? "Sounding"
                  : siren.status === "testing"
                    ? "Testing"
                    : "Idle"
                : "Inactive",
              tone: !siren.is_active
                ? "slate"
                : siren.status === "sounding"
                  ? "rose"
                  : siren.status === "testing"
                    ? "amber"
                    : "emerald",
              detail: siren.area_name ?? areaName(siren.area_id),
            }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
            areaBoundaries={boundaries}
          />
        </div>
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-overline font-bold tracking-wider text-neutral-500">
            Siren coverage
          </p>
          <p className="mt-2 text-3xl font-black text-neutral-900 tabular-nums">
            {data?.length ?? 0}
          </p>
          <p className="text-sm text-neutral-500">registered units</p>
          <dl className="mt-6 space-y-3 border-t border-neutral-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Sounding</dt>
              <dd className="font-bold text-rose-700">
                {data?.filter((item) => item.is_active && item.status === "sounding")
                  .length ?? 0}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Idle</dt>
              <dd className="font-bold text-emerald-700">
                {data?.filter((item) => item.is_active && item.status === "idle")
                  .length ?? 0}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-neutral-500">
            Triggering changes the simulated status only. It does not control physical
            hardware.
          </p>
        </aside>
      </section>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No sirens registered yet"
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
            </Button>
            {row.is_active ? (
              <Button
                variant={row.status === "sounding" ? "danger" : "outline"}
                size="sm"
                onClick={() =>
                  row.status === "sounding"
                    ? silenceMutation.mutate(row.id)
                    : triggerMutation.mutate(row.id)
                }
                disabled={triggerMutation.isPending || silenceMutation.isPending}
              >
                {row.status === "sounding" ? "Silence" : "Trigger"}
              </Button>
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
              <SirenFormDialog
                title="Edit siren unit"
                defaultValues={{
                  name: row.name,
                  longitude: row.location.coordinates[0],
                  latitude: row.location.coordinates[1],
                  area_id: row.area_id ?? null,
                }}
                areas={areas}
                onSubmit={async (values) => {
                  await updateMutation.mutateAsync({ id: row.id, values });
                }}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                  >
                    Edit
                  </button>
                }
              />
            ) : null}
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
