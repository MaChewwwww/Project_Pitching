"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BedDouble, Building2, MapPin, Plus, Sparkles } from "lucide-react";
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

interface Facility {
  id: string;
  name: string;
  type: string;
  location: { coordinates: [number, number] };
  area_name?: string | null;
  address?: string | null;
}

const evacCenterSchema = z.object({
  facility_id: z.string().min(1, "Please select an existing facility"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  is_open: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof evacCenterSchema>;

export function CreateEvacuationCenterDialog({
  trigger,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  onSuccess?: (newId?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: facilities = [] } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(evacCenterSchema) as any,
    defaultValues: {
      facility_id: "",
      capacity: 100,
      contact_person: "",
      contact_number: "",
      is_open: true,
      notes: "",
    },
  });

  const selectedFacilityId = watch("facility_id");
  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post("/admin/evacuation-centers", values),
    onSuccess: (res) => {
      toast.success("Evacuation center registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      reset();
      setOpen(false);
      onSuccess?.(res.data?.id);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to register evacuation center");
    },
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync(values);
  }

  const mapItems = selectedFacility
    ? [
        {
          id: selectedFacility.id,
          name: selectedFacility.name,
          category: "evacuation_center" as const,
          location: selectedFacility.location,
          area_name: selectedFacility.area_name,
          statusLabel: "Designated Shelter Pin",
          tone: "emerald" as const,
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="primary"
            size="sm"
            className="h-9 gap-1.5 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
          >
            <Plus className="size-4" />
            Designate Evacuation Center
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <DialogHeader className="border-b border-emerald-900/40 bg-gradient-to-r from-[#064e3b] to-[#022c22] p-5 text-white">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="size-3.5 text-emerald-400" />
              Shelter Designation
            </div>
            <DialogTitle className="mt-1 flex items-center gap-2 text-xl font-black text-white">
              <BedDouble className="size-5 text-emerald-400 shrink-0" />
              Designate Evacuation Center
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-200/80">
              Bind a designated barangay facility as an active disaster shelter, configure capacity, and assign emergency officers.
            </DialogDescription>
          </DialogHeader>

          {/* Form Body */}
          <div className="flex flex-col gap-5 p-6">
            {/* Facility Selector */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility_id" className="text-xs font-bold text-slate-800">
                Select Barangay Facility <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Controller
                name="facility_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="facility_id"
                      className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900 shadow-2xs"
                    >
                      <SelectValue placeholder="Choose a registered facility..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span className="font-semibold">{f.name}</span>{" "}
                          {f.area_name ? (
                            <span className="text-slate-500 text-[11px]">({f.area_name})</span>
                          ) : (
                            ""
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.facility_id && (
                <p className="text-xs font-semibold text-rose-600">
                  {errors.facility_id.message}
                </p>
              )}
            </div>

            {/* Capacity & Initial State */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity" className="text-xs font-bold text-slate-800">
                  Maximum Shelter Capacity (Persons) <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="e.g. 150"
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
                <Label htmlFor="is_open" className="text-xs font-bold text-slate-800">
                  Initial Operational State <span className="text-rose-500 font-bold">*</span>
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
                        id="is_open"
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
                <Label htmlFor="contact_person" className="text-xs font-bold text-slate-800">
                  Center Officer / Contact Person
                </Label>
                <Input
                  id="contact_person"
                  placeholder="e.g. Kagawad Juan Dela Cruz"
                  {...register("contact_person")}
                  className="h-10 rounded-xl border-slate-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_number" className="text-xs font-bold text-slate-800">
                  Contact / Hotline Number
                </Label>
                <Input
                  id="contact_number"
                  placeholder="e.g. 09171234567"
                  {...register("contact_number")}
                  className="h-10 rounded-xl border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Intake Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-slate-800">
                Intake Notes & Facility Equipment
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Special instructions, backup power generator, water filtration unit, medical cot capacity..."
                {...register("notes")}
                className="rounded-xl border-slate-300 resize-none text-xs"
              />
            </div>

            {/* Mini Map Preview */}
            {selectedFacility && (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-700" />
                    Facility Geolocation: {selectedFacility.name}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-800">
                    {selectedFacility.location.coordinates[1].toFixed(5)}, {selectedFacility.location.coordinates[0].toFixed(5)}
                  </span>
                </div>
                <div className="h-40 w-full overflow-hidden rounded-lg border border-emerald-300">
                  <AdminAssetWorkspaceMap
                    items={mapItems}
                    selectedId={selectedFacility.id}
                    onSelect={() => {}}
                    center={[
                      selectedFacility.location.coordinates[1],
                      selectedFacility.location.coordinates[0],
                    ]}
                    zoom={15.5}
                    showLegend={false}
                    showDataSources={false}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
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
              disabled={isSubmitting || createMutation.isPending}
              className="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              {createMutation.isPending ? "Designating..." : "Confirm Designation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
