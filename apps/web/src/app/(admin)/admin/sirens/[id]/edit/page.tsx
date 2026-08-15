"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Megaphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  LatLng,
  PointResolution,
} from "@/components/features/registry/location-picker";
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
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
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
  area_name?: string | null;
  is_active: boolean;
}

export default function EditSirenPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sirenId = params.id as string;
  const [autoAreaName, setAutoAreaName] = React.useState<string | null>(null);

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
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(sirenSchema),
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
      const initialArea =
        siren.area_name ||
        areas.find((a) => a.id === siren.area_id)?.name ||
        null;
      setAutoAreaName(initialArea);
    }
  }, [siren, areas, reset]);

  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  function handlePinChange(latlng: LatLng) {
    setValue("latitude", latlng.lat, { shouldValidate: true });
    setValue("longitude", latlng.lng, { shouldValidate: true });
  }

  function handleResolve(resolution: PointResolution) {
    setAutoAreaName(resolution.area_name);
    if (resolution.area_id) {
      setValue("area_id", resolution.area_id, { shouldValidate: true });
    }
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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !siren) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <p className="font-bold">Siren Station Not Found</p>
        <Link href="/admin/sirens">
          <Button variant="outline" className="mt-4">
            Back to Sirens
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
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
        description="Modify siren station label and adjust tower location via interactive map placement."
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

          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                <Sparkles className="size-3.5 text-emerald-600" />
                Auto-Detected Area Division:
              </span>
              <span className="font-bold text-xs text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                {autoAreaName || "Auto-detecting from map…"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              Area division is automatically assigned based on the pin location within official Barangay San Jose GIS boundaries.
            </p>
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
              className="h-10 gap-1.5 border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              Deactivate
            </Button>

            <div className="flex items-center gap-3">
              <Link href={`/admin/sirens/${sirenId}`}>
                <Button type="button" variant="outline" className="h-10 px-5 text-xs font-bold cursor-pointer">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="h-10 bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700 shadow-md cursor-pointer"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Map Pinning Column (Strictly interactive placement) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-700" />
                Siren Pin Location *
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Click/drag to move
              </span>
            </div>

            <div className="h-80 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                onResolve={handleResolve}
                caption="Click or drag pin to adjust siren tower position"
                className="h-full"
                restrictToBarangay
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Geocoded Coordinates:
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-900">
                {lat?.toFixed(5)}°, {lng?.toFixed(5)}°
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
