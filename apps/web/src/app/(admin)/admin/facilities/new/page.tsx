"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const FACILITY_TYPES = [
  { value: "evacuation_center", label: "Evacuation Center" },
  { value: "barangay_hall", label: "Barangay Hall / Outpost" },
  { value: "health_center", label: "Health Center / Clinic" },
  { value: "hospital", label: "Hospital / Medical Facility" },
  { value: "school", label: "Public / Private School" },
  { value: "covered_court", label: "Covered Court / Gymnasium" },
  { value: "police_station", label: "Police / Security Station" },
  { value: "fire_station", label: "Fire Station" },
  { value: "other", label: "Other Community Asset" },
];

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof facilitySchema>;

interface Area {
  id: string;
  name: string;
}

export default function NewFacilityPage() {
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
    resolver: zodResolver(facilitySchema) as any,
    defaultValues: {
      name: "",
      type: "evacuation_center",
      address: "",
      contact_number: "",
      longitude: 121.135,
      latitude: 14.735,
      area_id: null,
      is_active: true,
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
    mutationFn: (values: FormValues) => api.post("/admin/facilities", values),
    onSuccess: (res) => {
      toast.success("Facility registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      const newId = res.data?.id;
      if (newId) {
        router.push(`/admin/facilities/${newId}`);
      } else {
        router.push("/admin/facilities");
      }
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to register facility");
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
          href="/admin/facilities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Facilities Directory
        </Link>
      </div>

      <AdminPageHeader
        title="Register Barangay Facility"
        description="Add a new physical facility or infrastructure asset to the Barangay San Jose GIS database with exact coordinates."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form Column (7 cols) */}
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="size-4 text-emerald-700" />
            Facility Specifications & Roles
          </h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-800">
              Facility Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g. San Jose Elementary School - Main Gym"
              {...register("name")}
              className="h-10 rounded-xl"
            />
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type" className="text-xs font-bold text-slate-800">
                Infrastructure Type *
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="type"
                      className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area_id" className="text-xs font-bold text-slate-800">
                Assigned Area Division{" "}
                <span className="text-[10.5px] font-normal text-slate-400">
                  (or auto-detect from pin)
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number" className="text-xs font-bold text-slate-800">
                Direct Contact / Hotline
              </Label>
              <Input
                id="contact_number"
                placeholder="e.g. (02) 8888-0000"
                {...register("contact_number")}
                className="h-10 rounded-xl font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="is_active" className="text-xs font-bold text-slate-800">
                Operational Status
              </Label>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <SelectTrigger
                      id="is_active"
                      className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active Asset</SelectItem>
                      <SelectItem value="false">Inactive / Under Construction</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address" className="text-xs font-bold text-slate-800">
              Address & Landmarks
            </Label>
            <Textarea
              id="address"
              rows={2}
              placeholder="e.g. Purok 4, Riverside Road, near Barangay Health Station 2"
              {...register("address")}
              className="rounded-xl resize-none text-xs"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/admin/facilities">
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
              {isSubmitting ? "Registering…" : "Register Facility"}
            </Button>
          </div>
        </div>

        {/* Right Pinning Map Column (5 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-700" />
                GIS Map Location Pin *
              </h4>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                {lat?.toFixed(5)}, {lng?.toFixed(5)}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Click anywhere on the map or drag the marker to position the facility
              accurately within Barangay San Jose.
            </p>

            <div className="h-80 w-full overflow-hidden rounded-xl border border-slate-300">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                caption="Click on map to drop facility pin"
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
