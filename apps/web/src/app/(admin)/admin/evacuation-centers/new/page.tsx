"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Building2 } from "lucide-react";
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
import { AdminAssetWorkspaceMap } from "@/components/features/map/admin-asset-workspace-map-dynamic";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

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

export default function NewEvacuationCenterPage() {
  useRequireRole("admin");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: facilities = [] } = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
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
      const newId = res.data?.id;
      if (newId) {
        router.push(`/admin/evacuation-centers/${newId}`);
      } else {
        router.push("/admin/evacuation-centers");
      }
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
          statusLabel: "Selected Center Pin",
          tone: "emerald" as const,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/evacuation-centers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Evacuation Centers
        </Link>
      </div>

      <AdminPageHeader
        title="Register Evacuation Center"
        description="Bind a designated barangay facility as an active disaster shelter, configure headcount capacity, and assign emergency personnel."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form Column (7 cols) */}
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="size-4 text-emerald-700" />
            Shelter Configuration & Capacity
          </h3>

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
                    className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
                  >
                    <SelectValue placeholder="Choose a registered facility..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} {f.area_name ? `(${f.area_name})` : ""}
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
            <p className="text-[11px] text-slate-500">
              Need a new building? You can add one in the{" "}
              <Link
                href="/admin/facilities"
                className="text-emerald-700 font-bold underline"
              >
                Facilities Registry
              </Link>{" "}
              first.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity" className="text-xs font-bold text-slate-800">
                Maximum Shelter Capacity (Persons)
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                placeholder="e.g. 250"
                {...register("capacity")}
                className="h-10 rounded-xl"
              />
              {errors.capacity && (
                <p className="text-xs font-semibold text-rose-600">
                  {errors.capacity.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="is_open" className="text-xs font-bold text-slate-800">
                Initial Operational State
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
                      className="h-10 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-900"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_person" className="text-xs font-bold text-slate-800">
                Center Officer / Contact Person
              </Label>
              <Input
                id="contact_person"
                placeholder="e.g. Kagawad Juan Dela Cruz"
                {...register("contact_person")}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number" className="text-xs font-bold text-slate-800">
                Contact / Hotline Number
              </Label>
              <Input
                id="contact_number"
                placeholder="e.g. 0917-000-0000"
                {...register("contact_number")}
                className="h-10 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-800">
              Operational Notes & Equipment Available
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="e.g. Equipped with backup generator, clean water station, and medical triage station on 2nd floor."
              {...register("notes")}
              className="rounded-xl resize-none text-xs"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/admin/evacuation-centers">
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
              {isSubmitting ? "Registering Center..." : "Register Center"}
            </Button>
          </div>
        </div>

        {/* Right Map Preview Column (5 cols) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-1 shadow-xl overflow-hidden flex flex-col">
            <div className="h-[360px] sm:h-[420px] w-full overflow-hidden rounded-xl">
              <AdminAssetWorkspaceMap
                items={mapItems}
                selectedId={selectedFacility?.id ?? null}
                onSelect={() => {}}
                showHazard
                showAreas
              />
            </div>
            <div className="p-4 text-xs text-white">
              <p className="font-bold text-emerald-300 text-sm">
                {selectedFacility ? selectedFacility.name : "Select a Facility"}
              </p>
              <p className="mt-1 text-emerald-100/80 text-[11.5px]">
                {selectedFacility
                  ? selectedFacility.address || "Location pinned on map"
                  : "Choose a facility on the left to verify its location and hazard exposure."}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
