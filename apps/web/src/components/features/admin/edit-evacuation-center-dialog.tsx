"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BedDouble, MapPin, Pencil } from "lucide-react";
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
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { api, toDisplayError } from "@/lib/api/client";

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
    area_name?: string | null;
    address?: string | null;
    is_active?: boolean;
  };
}

const editSchema = z.object({
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").optional().nullable(),
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
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
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
        capacity: center.capacity ?? 100,
        contact_person: center.contact_person ?? "",
        contact_number: center.contact_number ?? "",
        is_open: center.is_open,
        notes: center.notes ?? "",
      });
    }
  }, [open, center, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch(`/admin/evacuation-centers/${center.id}`, values),
    onSuccess: () => {
      toast.success("Evacuation center updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", center.id],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update center");
    },
  });

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync(values);
  }

  const mapItem = {
    id: center.id,
    name: center.facility.name,
    category: "evacuation_center" as const,
    location: center.facility.location,
    area_name: center.facility.area_name,
    statusLabel: center.is_open ? "Open Shelter" : "Closed Shelter",
    tone: center.is_open ? ("emerald" as const) : ("slate" as const),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
            title="Edit Evacuation Center"
            aria-label={`Edit ${center.facility.name}`}
          >
            <Pencil className="size-3.5 text-slate-700" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <DialogHeader className="border-b border-emerald-900/40 bg-gradient-to-r from-[#064e3b] to-[#022c22] p-5 text-white">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Pencil className="size-3.5 text-emerald-400" />
              Shelter Configuration
            </div>
            <DialogTitle className="mt-1 flex items-center gap-2 text-xl font-black text-white">
              <BedDouble className="size-5 text-emerald-400 shrink-0" />
              Edit {center.facility.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-200/80">
              Update capacity limits, operational availability, contact information, and intake notes.
            </DialogDescription>
          </DialogHeader>

          {/* Form Body */}
          <div className="flex flex-col gap-5 p-6">
            {/* Facility Fixed Info Badge */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-800">
              <div>
                <p className="font-bold text-slate-900">{center.facility.name}</p>
                <p className="text-slate-500 text-[11px]">
                  {center.facility.area_name ? `Area: ${center.facility.area_name}` : "San Jose Municipality"}
                  {center.facility.address ? ` • ${center.facility.address}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                Registered Asset
              </span>
            </div>

            {/* Capacity & Operational State */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_capacity" className="text-xs font-bold text-slate-800">
                  Maximum Shelter Capacity (Persons) <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  id="edit_capacity"
                  type="number"
                  min="1"
                  {...register("capacity")}
                  className="h-10 rounded-xl border-slate-300"
                />
                {errors.capacity && (
                  <p className="text-xs font-semibold text-rose-600">
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_is_open" className="text-xs font-bold text-slate-800">
                  Operational State <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Controller
                  name="is_open"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? "true" : "false"}
                      onValueChange={(v) => field.onChange(v === "true")}
                    >
                      <SelectTrigger
                        id="edit_is_open"
                        className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Open (Active for Intake)</SelectItem>
                        <SelectItem value="false">Closed (Standby Reserve)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Contact Person & Number */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_contact_person" className="text-xs font-bold text-slate-800">
                  Center Officer / Contact Person
                </Label>
                <Input
                  id="edit_contact_person"
                  placeholder="e.g. Kagawad Juan Dela Cruz"
                  {...register("contact_person")}
                  className="h-10 rounded-xl border-slate-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_contact_number" className="text-xs font-bold text-slate-800">
                  Contact / Hotline Number
                </Label>
                <Input
                  id="edit_contact_number"
                  placeholder="e.g. 09171234567"
                  {...register("contact_number")}
                  className="h-10 rounded-xl border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Intake Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_notes" className="text-xs font-bold text-slate-800">
                Intake Notes & Facility Equipment
              </Label>
              <Textarea
                id="edit_notes"
                rows={2}
                placeholder="Special instructions, generator status, water supplies..."
                {...register("notes")}
                className="rounded-xl border-slate-300 resize-none text-xs"
              />
            </div>

            {/* Mini Map Location Preview */}
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-emerald-700" />
                  Facility Coordinates
                </span>
                <span className="font-mono text-[11px] text-emerald-800">
                  {center.facility.location.coordinates[1].toFixed(5)}, {center.facility.location.coordinates[0].toFixed(5)}
                </span>
              </div>
              <div className="h-40 w-full overflow-hidden rounded-lg border border-emerald-300">
                <AdminAssetWorkspaceMap
                  items={[mapItem]}
                  selectedId={center.id}
                  onSelect={() => {}}
                  center={[
                    center.facility.location.coordinates[1],
                    center.facility.location.coordinates[0],
                  ]}
                  zoom={15.5}
                  showLegend={false}
                  showDataSources={false}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || updateMutation.isPending}
              className="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
