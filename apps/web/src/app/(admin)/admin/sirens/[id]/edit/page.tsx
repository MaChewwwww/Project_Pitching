"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { FormFieldsSkeleton } from "@/components/common/portal-loading";
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

  const {
    data: siren,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["admin", "sirens", sirenId],
    queryFn: () => api.get<SirenDetail>(`/admin/sirens/${sirenId}`).then((r) => r.data),
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
        siren.area_name || areas.find((a) => a.id === siren.area_id)?.name || null;
      setAutoAreaName(initialArea);
    }
  }, [siren, areas, reset]);

  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  const handlePinChange = React.useCallback(
    (latlng: LatLng) => {
      setValue("latitude", latlng.lat, { shouldValidate: true });
      setValue("longitude", latlng.lng, { shouldValidate: true });
    },
    [setValue],
  );

  const handleResolve = React.useCallback(
    (resolution: PointResolution) => {
      setAutoAreaName(resolution.area_name);
      if (resolution.area_id) {
        setValue("area_id", resolution.area_id, { shouldValidate: true });
      }
    },
    [setValue],
  );

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => api.patch(`/admin/sirens/${sirenId}`, values),
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

  if (isFetching)
    return <FormFieldsSkeleton label="Loading siren unit editor" fields={7} />;

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
    <div className="flex flex-col gap-6 pb-16">
      {/* Topbar navigation */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <Link
          href={`/admin/sirens/${sirenId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 transition-colors hover:text-emerald-950"
        >
          <ArrowLeft className="size-3.5" />
          Back to Siren Details
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900">
          Edit Early Warning Siren Unit
        </h1>
        <p className="text-xs text-slate-500">
          Update the station name or re-pin the acoustic propagation coordinates on the
          map.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Left Form Column */}
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            Siren Station Profile
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-800">
              Siren Station Name / Identifier *
            </Label>
            <Input
              id="name"
              placeholder="e.g. Area 1 Riverbank Early Warning Station"
              {...register("name")}
              className="h-10 text-xs"
            />
            {errors.name && (
              <p className="text-[11px] font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[10.5px] font-bold tracking-wider text-slate-500 uppercase">
              Assigned Area Division (Auto-Geocoded)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {autoAreaName || "Auto-detecting Area…"}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                Auto-assigned
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Area division is automatically assigned based on the pin location within
              official Barangay San Jose GIS boundaries.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete siren station "${siren.name}"?\n\nThis will remove the unit from active GIS maps while preserving all historical audit logs in the backend.`,
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
              className="h-10 cursor-pointer gap-1.5 border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="size-3.5" />
              Delete Siren
            </Button>

            <div className="flex items-center gap-3">
              <Link href={`/admin/sirens/${sirenId}`}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 cursor-pointer px-5 text-xs font-bold"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="h-10 cursor-pointer bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Map Pinning Column (Strictly interactive placement) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase">
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
