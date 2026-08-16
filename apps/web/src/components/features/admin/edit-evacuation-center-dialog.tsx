"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  MapPin,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type {
  LatLng,
  PointResolution,
} from "@/components/features/registry/location-picker";
import { api, toDisplayError } from "@/lib/api/client";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-900" />,
  },
);

export interface EvacCenterEditable {
  id: string;
  capacity: number | null;
  occupancy?: number;
  is_open: boolean;
  notes: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  facility: {
    id: string;
    name: string;
    location: { coordinates: [number, number] };
    area_id?: string | null;
    area_name?: string | null;
    address?: string | null;
    is_active?: boolean;
  };
}

const editSchema = z.object({
  name: z.string().min(1, "Shelter facility name is required"),
  address: z.string().optional().nullable(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1 person"),
  contact_person: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  is_open: z.boolean(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof editSchema>;

export function EditEvacuationCenterDialog({
  center,
  trigger,
  onSuccess,
}: {
  center: EvacCenterEditable;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [autoAreaName, setAutoAreaName] = React.useState<string | null>(
    center.facility.area_name || null,
  );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      name: center.facility.name,
      address: center.facility.address || "",
      longitude: center.facility.location.coordinates[0],
      latitude: center.facility.location.coordinates[1],
      area_id: center.facility.area_id || null,
      capacity: center.capacity ?? 100,
      contact_person: center.contact_person ?? "",
      contact_number: center.contact_number ?? "",
      is_open: center.is_open,
      notes: center.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: center.facility.name,
        address: center.facility.address || "",
        longitude: center.facility.location.coordinates[0],
        latitude: center.facility.location.coordinates[1],
        area_id: center.facility.area_id || null,
        capacity: center.capacity ?? 100,
        contact_person: center.contact_person ?? "",
        contact_number: center.contact_number ?? "",
        is_open: center.is_open,
        notes: center.notes ?? "",
      });
      setAutoAreaName(center.facility.area_name || null);
    }
  }, [open, center, reset]);

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
    mutationFn: async (values: FormValues) => {
      // 1. Update facility physical coordinates and metadata
      await api.patch(`/admin/facilities/${center.facility.id}`, {
        name: values.name,
        address: values.address || null,
        contact_number: values.contact_number || null,
        longitude: values.longitude,
        latitude: values.latitude,
        area_id: values.area_id || null,
      });

      // 2. Update evacuation center operational config
      await api.patch(`/admin/evacuation-centers/${center.id}`, {
        capacity: values.capacity,
        contact_person: values.contact_person || null,
        contact_number: values.contact_number || null,
        is_open: values.is_open,
        notes: values.notes || null,
      });
    },
    onSuccess: () => {
      toast.success("Evacuation center updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["public", "evacuation-centers"] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update evacuation center");
    },
  });

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer shrink-0"
            title="Edit Center"
            aria-label={`Edit ${center.facility.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col p-0 overflow-hidden text-slate-900 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Fixed Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <div className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <Pencil className="size-4.5" />
            </div>
            Evacuation Center: {center.facility.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Modify shelter capacity, operational status, contact information, and re-pin its GIS coordinates on the map.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body with Custom Green Scrollbar */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4 [scrollbar-width:thin] [scrollbar-color:#059669_#f1f5f9] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-600/90 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-400">
            {/* Facility Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_evac_name" className="text-xs font-bold text-slate-800">
                Shelter Facility Name <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                id="edit_evac_name"
                {...register("name")}
                className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
              {errors.name && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Capacity & Operational State */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_capacity" className="text-xs font-bold text-slate-800">
                  Maximum Shelter Capacity <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  id="edit_capacity"
                  type="number"
                  min={1}
                  {...register("capacity")}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
                />
                {errors.capacity && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Operational State <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Controller
                  name="is_open"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? "open" : "closed"}
                      onValueChange={(val) => field.onChange(val === "open")}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600">
                        <SelectValue placeholder="Select operational state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open (Active for Intake)</SelectItem>
                        <SelectItem value="closed">Closed (Standby)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Interactive Map Pinning (Re-pinning location) */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MapPin className="size-3.5 text-emerald-700" />
                  Shelter Location Pin <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" />
                  </span>
                  Click map to relocate
                </span>
              </div>

              <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-slate-900">
                <LocationPicker
                  value={pinValue}
                  onChange={handlePinChange}
                  onResolve={handleResolve}
                />
              </div>

              {/* Coordinates & Area Telemetry */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-700">Coordinates:</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    {lat ? lat.toFixed(5) : "—"}, {lng ? lng.toFixed(5) : "—"}
                  </span>
                </div>
                {autoAreaName && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="size-3 text-emerald-700" />
                    Detected: {autoAreaName}
                  </div>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_address" className="text-xs font-bold text-slate-800">
                Street Address
              </Label>
              <Input
                id="edit_address"
                placeholder="e.g. Phase 1A, Kasiglahan Village 1, Barangay San Jose"
                {...register("address")}
                className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Contact Person */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_officer" className="text-xs font-bold text-slate-800">
                  Contact Person
                </Label>
                <Input
                  id="edit_officer"
                  placeholder="e.g. Kagawad Juan Dela Cruz"
                  {...register("contact_person")}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
                />
              </div>

              {/* Contact Number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_hotline" className="text-xs font-bold text-slate-800">
                  Contact Number
                </Label>
                <Input
                  id="edit_hotline"
                  placeholder="e.g. 09171234567"
                  {...register("contact_number")}
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
                />
              </div>
            </div>

            {/* Intake Notes & Equipment */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_notes" className="text-xs font-bold text-slate-800">
                Intake Notes & Facility Equipment
              </Label>
              <Textarea
                id="edit_notes"
                rows={2}
                placeholder="Special intake instructions, generator power backup, water filtration unit, medical cot capacity…"
                {...register("notes")}
                className="rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
              />
            </div>
          </div>

          {/* Fixed Dialog Footer Actions - Centered with Color Styling */}
          <DialogFooter className="p-4 px-6 border-t border-slate-100 shrink-0 bg-slate-50/50 flex items-center justify-center sm:justify-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-10 px-5 rounded-xl text-xs font-bold border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || updateMutation.isPending}
              className="h-10 px-6 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              {updateMutation.isPending ? "Saving Changes…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
