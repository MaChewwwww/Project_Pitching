"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Compass,
  MapPin,
  Pencil,
  Phone,
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

export interface FacilityEditable {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_number: string | null;
  location: { coordinates: [number, number] };
  area_id: string | null;
  area_name?: string | null;
  is_active: boolean;
}

export interface EditFacilityDialogProps {
  facility: FacilityEditable;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditFacilityDialog({
  facility,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditFacilityDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  const [autoAreaName, setAutoAreaName] = React.useState<string | null>(
    facility.area_name || null,
  );
  const queryClient = useQueryClient();

  const [lng, lat] = facility.location.coordinates;
  const initialTypeConfig = getFacilityTypeConfig(facility.type);

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
      name: facility.name,
      type: initialTypeConfig.type,
      address: facility.address || "",
      contact_number: facility.contact_number || "",
      longitude: lng,
      latitude: lat,
      area_id: facility.area_id,
      is_active: facility.is_active,
    },
  });

  // Re-sync when dialog opens or facility changes
  React.useEffect(() => {
    if (open) {
      const [currentLng, currentLat] = facility.location.coordinates;
      const typeCfg = getFacilityTypeConfig(facility.type);
      reset({
        name: facility.name,
        type: typeCfg.type,
        address: facility.address || "",
        contact_number: facility.contact_number || "",
        longitude: currentLng,
        latitude: currentLat,
        area_id: facility.area_id,
        is_active: facility.is_active,
      });
      setAutoAreaName(facility.area_name || null);
    }
  }, [open, facility, reset]);

  const selectedType = watch("type");
  const currentTypeConfig = getFacilityTypeConfig(selectedType);

  const currentLat = watch("latitude");
  const currentLng = watch("longitude");
  const pinValue: LatLng | null =
    currentLat && currentLng ? { lat: currentLat, lng: currentLng } : null;

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
    mutationFn: (values: FormValues) =>
      api.patch(`/admin/facilities/${facility.id}`, values),
    onSuccess: () => {
      toast.success("Facility details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "facilities", facility.id],
      });
      queryClient.invalidateQueries({ queryKey: ["public", "facilities"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update facility");
    },
  });

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-6 text-slate-900">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <div className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <Pencil className="size-4.5" />
            </div>
            Edit Barangay Facility
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modify facility attributes, contact details, or re-pin its exact GPS coordinate on the map.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_facility_name" className="text-xs font-bold text-slate-800">
                Facility Name <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                id="edit_facility_name"
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
              <Label htmlFor="edit_facility_type" className="text-xs font-bold text-slate-800">
                Category <span className="text-rose-500 font-bold">*</span>
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
                      id="edit_facility_type"
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
              <Label htmlFor="edit_address" className="text-xs font-bold text-slate-800">
                Street Address
              </Label>
              <Input
                id="edit_address"
                placeholder="e.g. Phase 1B, Kasiglahan Village"
                {...register("address")}
                className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_contact_number" className="text-xs font-bold text-slate-800">
                Contact Number
              </Label>
              <div className="relative">
                <Input
                  id="edit_contact_number"
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
                Place Facility Location on Map <span className="text-rose-500 font-bold">*</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" />
                </span>
                Click map to re-pin
              </span>
            </div>

            <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-slate-900">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                onResolve={handleResolve}
                caption="Click anywhere inside Barangay San Jose to update the facility coordinates"
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
                  {currentLat ? `${currentLat.toFixed(5)}°, ${currentLng?.toFixed(5)}°` : "—"}
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
              {isSubmitting ? "Saving Changes…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
