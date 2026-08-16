"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  CheckCircle2,
  Compass,
  MapPin,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type {
  LatLng,
  PointResolution,
} from "@/components/features/registry/location-picker";
import { api, toDisplayError } from "@/lib/api/client";
import {
  FACILITY_TYPE_CONFIGS,
  type FacilityType,
  getFacilityTypeConfig,
} from "@/lib/facility-types";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-900" />,
  },
);

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  type: z.enum([
    "evacuation_center",
    "clinic",
    "hospital",
    "police",
    "fire",
    "rescue_station",
    "barangay_hall",
  ]),
  address: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof facilitySchema>;

export function RegisterFacilityDialog({
  trigger,
  defaultOpen = false,
}: {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [autoAreaName, setAutoAreaName] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      type: "evacuation_center",
      address: "",
      contact_number: "",
      longitude: 121.132,
      latitude: 14.7435,
      area_id: null,
      is_active: true,
    },
  });

  const selectedType = watch("type");
  const currentTypeConfig = getFacilityTypeConfig(selectedType);

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

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/admin/facilities", values),
    onSuccess: () => {
      toast.success("Barangay facility registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "facilities"] });
      reset();
      setAutoAreaName(null);
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to register facility");
    },
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="primary"
            className="h-9 gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="size-3.5" />
            Register Facility
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-6 text-slate-900">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Building2 className="size-4.5" />
            </div>
            Register Barangay Facility
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Add a public infrastructure asset or emergency service site to the Barangay San Jose GIS database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          {/* Row 1: Name and Facility Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility_name" className="text-xs font-bold text-slate-800">
                Facility Name / Label *
              </Label>
              <Input
                id="facility_name"
                placeholder="e.g. San Jose Central Evacuation Hall"
                {...register("name")}
                className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
              {errors.name && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility_type" className="text-xs font-bold text-slate-800">
                Infrastructure Category *
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as FacilityType)}
                  >
                    <SelectTrigger
                      id="facility_type"
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    >
                      <SelectValue placeholder="Select facility type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPE_CONFIGS.map((cfg) => {
                        const Icon = cfg.icon;
                        return (
                          <SelectItem key={cfg.type} value={cfg.type}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-2 rounded-full shrink-0",
                                  cfg.dot,
                                )}
                              />
                              <Icon className={cn("size-3.5 shrink-0", cfg.color)} />
                              <span className="font-semibold text-slate-900">
                                {cfg.singleLabel}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 2: Address & Hotline */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-xs font-bold text-slate-800">
                Street / Sitio Address
              </Label>
              <Input
                id="address"
                placeholder="e.g. Phase 1B, Kasiglahan Village"
                {...register("address")}
                className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number" className="text-xs font-bold text-slate-800">
                Contact Number / Hotline Desk
              </Label>
              <div className="relative">
                <Input
                  id="contact_number"
                  placeholder="e.g. (02) 8942-0123"
                  {...register("contact_number")}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-8 text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
                />
                <Phone className="absolute left-2.5 top-3 size-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Interactive Map Pinning & Integrated Telemetry */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="size-3.5 text-emerald-700" />
                Place Facility Location on Map *
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" />
                </span>
                Click map to pin
              </span>
            </div>

            <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-slate-900">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                onResolve={handleResolve}
                caption="Click anywhere inside Barangay San Jose to pin the facility coordinates"
                className="h-full"
                restrictToBarangay
              />
            </div>

            {/* Unified 3-Metric Telemetry Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              {/* Metric 1: Auto-Detected Area */}
              <div className="flex flex-col justify-center px-3 py-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="size-3 text-emerald-600" />
                  Assigned Area
                </span>
                <p className="mt-0.5 text-xs font-bold text-emerald-950 truncate">
                  {autoAreaName || "Auto-detecting…"}
                </p>
              </div>

              {/* Metric 2: Geocoded GPS */}
              <div className="flex flex-col justify-center px-3 py-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Geocoded GPS
                </span>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-800 truncate">
                  {lat ? `${lat.toFixed(5)}°, ${lng?.toFixed(5)}°` : "—"}
                </p>
              </div>

              {/* Metric 3: Type Classification */}
              <div className="flex flex-col justify-center px-3 py-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Compass className="size-3 text-emerald-600" />
                  Category
                </span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 truncate">
                  {currentTypeConfig.singleLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 px-4 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-10 gap-1 bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmitting ? "Registering…" : "Register Facility"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
