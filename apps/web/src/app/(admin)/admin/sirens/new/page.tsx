"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin, Megaphone, Radio } from "lucide-react";
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

export default function NewSirenPage() {
  useRequireRole("admin");
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  function handlePinChange(latlng: LatLng) {
    setValue("latitude", latlng.lat, { shouldValidate: true });
    setValue("longitude", latlng.lng, { shouldValidate: true });
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/admin/sirens", values),
    onSuccess: (res) => {
      toast.success("Siren unit deployed successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      const newId = res.data?.id;
      if (newId) {
        router.push(`/admin/sirens/${newId}`);
      } else {
        router.push("/admin/sirens");
      }
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to deploy siren unit");
    },
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync(values);
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/sirens"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Siren Network
        </Link>
      </div>

      <AdminPageHeader
        title="Deploy Siren Unit"
        description="Add a new early warning siren simulation station to the Barangay San Jose GIS network with 500m acoustic radius."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form Column (7 cols) */}
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Megaphone className="size-4 text-emerald-700" />
            Siren Station Profile
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-800">
              Siren Unit Name / Description *
            </Label>
            <Input
              id="name"
              placeholder="e.g. Area 1 Riverbank Early Warning Siren"
              {...register("name")}
              className="h-10 rounded-xl"
            />
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area_id" className="text-xs font-bold text-slate-800">
              Sitio Area{" "}
              <span className="text-[10.5px] font-normal text-slate-400">
                (or auto-detect from pin location)
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
                  <SelectTrigger
                    id="area_id"
                    className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
                  >
                    <SelectValue placeholder="Auto-detect from coordinates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-detect from Pin</SelectItem>
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

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Radio className="size-4 text-emerald-700" />
              Acoustic Radius Specs
            </span>
            <p className="mt-1 text-emerald-800 text-[11.5px] leading-relaxed">
              Standard deployment configures a 500-meter omnidirectional acoustic
              wave propagation boundary. Simulated alerts play via the Web Audio API
              synthesizer.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/admin/sirens">
              <Button type="button" variant="outline" className="h-10 px-5 text-xs font-bold">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-10 gap-1.5 bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
            >
              {isSubmitting ? "Deploying…" : "Deploy Siren Unit"}
            </Button>
          </div>
        </div>

        {/* Right Map Pinning Column (5 cols) */}
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

            <p className="text-xs text-slate-500">
              Click on the map to set the physical mount coordinates of the siren tower.
            </p>

            <div className="h-80 w-full overflow-hidden rounded-xl border border-slate-300">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                caption="Click to place siren unit"
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
