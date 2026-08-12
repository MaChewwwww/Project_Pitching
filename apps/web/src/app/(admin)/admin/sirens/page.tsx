"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Volume2, VolumeX } from "lucide-react";

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

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-52 animate-pulse rounded-lg bg-neutral-100" /> },
);

interface Siren {
  id: string;
  name: string;
  status: "idle" | "sounding";
  location: { coordinates: [number, number] };
  area_id: string | null;
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
  status: z.enum(["idle", "sounding"]).default("idle"),
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
            <Input id="siren-name" {...register("name")} placeholder="e.g. Area 1 Primary Siren" />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siren-area">
              Area{" "}
              <span className="text-neutral-400 font-normal text-xs">
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
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="siren-lat" className="text-xs">Latitude</Label>
                <Input
                  id="siren-lat"
                  type="number"
                  step="0.000001"
                  {...register("latitude")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="siren-lon" className="text-xs">Longitude</Label>
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
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "sirens"],
    queryFn: () => api.get<Siren[]>("/admin/sirens").then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

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
      toast.success(
        res.data.status === "sounding" ? "Siren triggered (sounding)" : "Siren silenced (idle)"
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
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
    status: "idle",
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
              ? "bg-red-100 text-red-800 animate-pulse"
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

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No sirens registered yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <Button
              variant={row.status === "sounding" ? "danger" : "outline"}
              size="sm"
              onClick={() => triggerMutation.mutate(row.id)}
              disabled={triggerMutation.isPending}
            >
              {row.status === "sounding" ? "Silence" : "Trigger"}
            </Button>
            <SirenFormDialog
              title="Edit siren unit"
              defaultValues={{
                name: row.name,
                longitude: row.location.coordinates[0],
                latitude: row.location.coordinates[1],
                area_id: row.area_id ?? null,
                status: row.status,
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
