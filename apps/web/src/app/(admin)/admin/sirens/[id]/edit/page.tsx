"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
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
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-xl bg-slate-900" />,
  },
);

const sirenSchema = z.object({
  name: z.string().min(1, "Siren name is required"),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof sirenSchema>;

interface Area {
  id: string;
  name: string;
}

interface SirenDetail {
  id: string;
  name: string;
  status: string;
  location: { coordinates: [number, number] };
  area_id: string | null;
  is_active: boolean;
}

export default function EditSirenPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sirenId = params.id as string;

  const { data: siren, isLoading, isError } = useQuery({
    queryKey: ["admin", "sirens", sirenId],
    queryFn: () =>
      api.get<SirenDetail>(`/admin/sirens/${sirenId}`).then((r) => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sirenSchema) as any,
    defaultValues: {
      name: "",
      longitude: 121.135,
      latitude: 14.735,
      area_id: null,
    },
  });

  React.useEffect(() => {
    if (siren) {
      reset({
        name: siren.name,
        longitude: siren.location.coordinates[0],
        latitude: siren.location.coordinates[1],
        area_id: siren.area_id ?? null,
      });
    }
  }, [siren, reset]);

  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  function handlePinChange(latlng: LatLng) {
    setValue("latitude", latlng.lat, { shouldValidate: true });
    setValue("longitude", latlng.lng, { shouldValidate: true });
  }

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch(`/admin/sirens/${sirenId}`, values),
    onSuccess: () => {
      toast.success("Siren station updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens", sirenId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      router.push(`/admin/sirens/${sirenId}`);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update siren");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/sirens/${sirenId}`),
    onSuccess: () => {
      toast.success("Siren unit deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      router.push("/admin/sirens");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to deactivate siren");
    },
  });

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync(values);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm">Loading siren station…</div>;
  }

  if (isError || !siren) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600 font-bold">Failed to load siren station.</p>
        <Link href="/admin/sirens" className="text-xs text-emerald-700 underline mt-2 block">
          Return to siren network
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <Link
          href={`/admin/sirens/${sirenId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Siren Station Details
        </Link>
      </div>

      <AdminPageHeader
        title={`Edit ${siren.name}`}
        description="Modify siren tower label, Sitio coverage assignment, and GPS mount coordinates."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Megaphone className="size-4 text-emerald-700" />
            Station Configuration
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-800">
              Siren Unit Name *
            </Label>
            <Input id="name" {...register("name")} className="h-10 rounded-xl" />
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area_id" className="text-xs font-bold text-slate-800">
              Sitio Area
            </Label>
            <Controller
              name="area_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v === "" ? null : v)}
                >
                  <SelectTrigger
                    id="area_id"
                    className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
                  >
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
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

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm(`Are you sure you want to deactivate ${siren.name}?`)) {
                  deleteMutation.mutate();
                }
              }}
              className="h-10 gap-1.5 border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="size-3.5" />
              Deactivate
            </Button>

            <div className="flex items-center gap-3">
              <Link href={`/admin/sirens/${sirenId}`}>
                <Button type="button" variant="outline" className="h-10 px-5 text-xs font-bold">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="h-10 bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Map Pinning Column */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-700" />
                Siren Pin Location *
              </h4>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                {lat?.toFixed(5)}, {lng?.toFixed(5)}
              </span>
            </div>

            <div className="h-80 w-full overflow-hidden rounded-xl border border-slate-300">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                caption="Click or drag pin to adjust siren tower position"
                className="h-full"
                restrictToBarangay
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="lat" className="text-[11px] font-bold text-slate-600">
                  Latitude
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  {...register("latitude")}
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="lng" className="text-[11px] font-bold text-slate-600">
                  Longitude
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.000001"
                  {...register("longitude")}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
