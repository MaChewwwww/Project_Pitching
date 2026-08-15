"use client";

/**
 * Bespoke facility create/edit form with an embedded LocationPicker.
 *
 * Separate from `ResourceFormDialog` + `AdminField[]` deliberately — wiring a
 * Leaflet map into the generic AdminField schema would contaminate 12 other
 * admin screens with a react-leaflet import. This component stands alone.
 *
 * FR-MAP-006 (facility geo-pin in admin), FR-SYS-015 (facility CRUD).
 */

import dynamic from "next/dynamic";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { LatLng } from "@/components/features/registry/location-picker";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-52 animate-pulse rounded-lg bg-neutral-100" />,
  },
);

/* --- form schema ---------------------------------------------------------- */

export const facilityTypes = [
  "evacuation_center",
  "hospital",
  "clinic",
  "barangay_hall",
  "police",
  "fire",
  "rescue_station",
] as const;

export const facilitySchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(facilityTypes),
  address: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type FacilityFormValues = z.infer<typeof facilitySchema>;

/* --- area option --------------------------------------------------------- */

interface AreaOption {
  id: string;
  name: string;
}

/* --- props --------------------------------------------------------------- */

interface FacilityFormDialogProps {
  title: string;
  defaultValues: FacilityFormValues;
  areas: AreaOption[];
  onSubmit: (values: FacilityFormValues) => Promise<void>;
  trigger?: React.ReactNode;
}

/* --- component ----------------------------------------------------------- */

export function FacilityFormDialog({
  title,
  defaultValues,
  areas,
  onSubmit,
  trigger,
}: FacilityFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FacilityFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(facilitySchema) as any,
    defaultValues,
  });

  // Keep the map pin in sync with the form lat/lng.
  const lat = watch("latitude");
  const lng = watch("longitude");
  const pinValue: LatLng | null = lat && lng ? { lat, lng } : null;

  function handlePinChange(latlng: LatLng) {
    setValue("latitude", latlng.lat, { shouldValidate: true });
    setValue("longitude", latlng.lng, { shouldValidate: true });
  }

  async function submit(values: FacilityFormValues) {
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
        {trigger ?? <Button size="sm">Add facility</Button>}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 pt-1">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fac-name">Name *</Label>
            <Input
              id="fac-name"
              {...register("name")}
              placeholder="e.g. San Jose Covered Court"
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fac-type">Type *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fac-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fac-address">Address</Label>
            <Input
              id="fac-address"
              {...register("address")}
              placeholder="Street / landmark"
            />
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fac-contact">Contact number</Label>
            <Input
              id="fac-contact"
              {...register("contact_number")}
              placeholder="e.g. 0917-000-0000"
            />
          </div>

          {/* Area */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fac-area">
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
                  <SelectTrigger id="fac-area">
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

          {/* Map pin */}
          <div className="flex flex-col gap-1.5">
            <Label>Location *</Label>
            <p className="text-xs text-neutral-500">
              Click or drag the pin to place the facility. Coordinates update
              automatically.
            </p>
            <div className="h-52 overflow-hidden rounded-lg border border-neutral-200">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                caption="Click to place the facility."
                className="h-full"
                restrictToBarangay
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="fac-lat" className="text-xs">
                  Latitude
                </Label>
                <Input
                  id="fac-lat"
                  type="number"
                  step="0.000001"
                  {...register("latitude")}
                />
                {errors.latitude && (
                  <p className="text-xs text-red-600">{errors.latitude.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="fac-lon" className="text-xs">
                  Longitude
                </Label>
                <Input
                  id="fac-lon"
                  type="number"
                  step="0.000001"
                  {...register("longitude")}
                />
                {errors.longitude && (
                  <p className="text-xs text-red-600">{errors.longitude.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Active */}
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="fac-active"
                />
                <Label htmlFor="fac-active" className="cursor-pointer">
                  Active
                </Label>
              </label>
            )}
          />

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
