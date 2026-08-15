"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, MapPin, Pencil, Radio, Sparkles } from "lucide-react";
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

const sirenSchema = z.object({
  name: z.string().min(1, "Siren name is required"),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  area_id: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof sirenSchema>;

export interface EditSirenDialogProps {
  siren: {
    id: string;
    name: string;
    location: { coordinates: [number, number] };
    area_id: string | null;
    area_name?: string | null;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditSirenDialog({
  siren,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditSirenDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setUncontrolledOpen;

  const [autoAreaName, setAutoAreaName] = React.useState<string | null>(
    siren.area_name || null,
  );
  const queryClient = useQueryClient();

  const [lng, lat] = siren.location.coordinates;

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
      name: siren.name,
      longitude: lng,
      latitude: lat,
      area_id: siren.area_id,
    },
  });

  // Re-sync form values whenever the dialog opens or siren data changes
  React.useEffect(() => {
    if (open) {
      const [currentLng, currentLat] = siren.location.coordinates;
      reset({
        name: siren.name,
        longitude: currentLng,
        latitude: currentLat,
        area_id: siren.area_id,
      });
      setAutoAreaName(siren.area_name || null);
    }
  }, [open, siren, reset]);

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
      api.patch(`/admin/sirens/${siren.id}`, values),
    onSuccess: () => {
      toast.success("Siren unit updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "sirens", siren.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "sirens", "audits"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "sirens", siren.id, "audits"],
      });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update siren unit");
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
            Edit Early Warning Siren Unit
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modify the station name or re-pin its GIS coordinates. Area division and coverage radius will update automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          {/* Station Name Input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_siren_name" className="text-xs font-bold text-slate-800">
              Siren Station Name / Label *
            </Label>
            <Input
              id="edit_siren_name"
              placeholder="e.g. Area 1 Riverbank Early Warning Station"
              {...register("name")}
              className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-600"
            />
            {errors.name && (
              <p className="text-[11px] font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Interactive Map Pinning & Integrated Telemetry */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="size-3.5 text-emerald-700" />
                Place Siren Tower Location *
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
                caption="Click anywhere on the map to place the siren tower position"
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

              {/* Metric 3: Acoustic Buffer */}
              <div className="flex flex-col justify-center px-3 py-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Radio className="size-3 text-sky-600" />
                  Acoustic Reach
                </span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 truncate">
                  500m Buffer
                </p>
              </div>
            </div>
          </div>

          {/* Contextual notice */}
          <div className="flex items-start gap-2 px-1 text-slate-500">
            <Radio className="size-3.5 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>500m Omnidirectional Propagation:</strong> Changing the position will adjust the siren acoustic radius and area boundary mapping on all active GIS views.
            </p>
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
