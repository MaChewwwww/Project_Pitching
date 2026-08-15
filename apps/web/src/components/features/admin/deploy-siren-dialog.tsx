"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, MapPin, Megaphone, Plus, Radio, Sparkles } from "lucide-react";
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

export function DeploySirenDialog({
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
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(sirenSchema),
    defaultValues: {
      name: "",
      longitude: 121.135,
      latitude: 14.745,
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

  function handleResolve(resolution: PointResolution) {
    setAutoAreaName(resolution.area_name);
    if (resolution.area_id) {
      setValue("area_id", resolution.area_id, { shouldValidate: true });
    }
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/admin/sirens", values),
    onSuccess: () => {
      toast.success("Siren unit deployed successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "sirens"] });
      reset();
      setAutoAreaName(null);
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to deploy siren unit");
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
            Deploy Siren Unit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-6 text-slate-900">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Megaphone className="size-4.5" />
            </div>
            Deploy Early Warning Siren Unit
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Click the map to place the siren tower. Area division and coordinates are automatically detected and geocoded.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex flex-col gap-4">
          {/* Station Name Input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siren_name" className="text-xs font-bold text-slate-800">
              Siren Station Name / Label *
            </Label>
            <Input
              id="siren_name"
              placeholder="e.g. Area 1 Riverbank Early Warning Station"
              {...register("name")}
              className="h-9 text-xs"
            />
            {errors.name && (
              <p className="text-[11px] font-semibold text-rose-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Interactive Map Pinning (Strictly click to place) */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="size-3.5 text-emerald-700" />
                Place Siren Tower Location *
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Click map to pin
              </span>
            </div>

            <div className="h-68 w-full overflow-hidden rounded-lg border border-slate-300 shadow-inner">
              <LocationPicker
                value={pinValue}
                onChange={handlePinChange}
                onResolve={handleResolve}
                caption="Click anywhere on the map to set the siren station position"
                className="h-full"
                restrictToBarangay
              />
            </div>

            {/* Read-only Auto-detected Area & Geocoding Telemetry */}
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <Sparkles className="size-3.5 text-emerald-600" />
                  Auto-Detected Area:
                </span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {autoAreaName || "Auto-detecting Area…"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Geocoded GPS:
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-900">
                  {lat?.toFixed(5)}°, {lng?.toFixed(5)}°
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-3 text-xs flex items-start gap-2">
            <Radio className="size-4 text-sky-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-900 leading-relaxed">
              <strong>500m Omnidirectional Propagation:</strong> The station will broadcast auditory flood alarms across a 500-meter radius buffer within its assigned Area boundary.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-9 px-4 text-xs font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-9 gap-1 bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              {isSubmitting ? "Deploying…" : "Deploy Siren Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
