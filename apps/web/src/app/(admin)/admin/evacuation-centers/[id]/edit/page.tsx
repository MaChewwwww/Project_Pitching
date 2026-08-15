"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Building2, Trash2 } from "lucide-react";
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

interface EvacCenterDetail {
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
  };
  is_active?: boolean;
}

const editSchema = z.object({
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  is_open: z.boolean(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof editSchema>;

export default function EditEvacuationCenterPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const centerId = params.id as string;

  const { data: center, isLoading, isError } = useQuery({
    queryKey: ["admin", "evacuation-centers", centerId],
    queryFn: () =>
      api
        .get<EvacCenterDetail>(`/admin/evacuation-centers/${centerId}`)
        .then((r) => r.data),
  });

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
      capacity: 100,
      contact_person: "",
      contact_number: "",
      is_open: true,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (center) {
      reset({
        capacity: center.capacity ?? undefined,
        contact_person: center.contact_person ?? "",
        contact_number: center.contact_number ?? "",
        is_open: center.is_open,
        notes: center.notes ?? "",
      });
    }
  }, [center, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch(`/admin/evacuation-centers/${centerId}`, values),
    onSuccess: () => {
      toast.success("Evacuation center updated successfully!");
      queryClient.invalidateQueries({
        queryKey: ["admin", "evacuation-centers", centerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      router.push(`/admin/evacuation-centers/${centerId}`);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update center");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.delete(`/admin/evacuation-centers/${centerId}`),
    onSuccess: () => {
      toast.success("Evacuation center deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] });
      router.push("/admin/evacuation-centers");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to deactivate center");
    },
  });

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync(values);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm">Loading center details…</div>;
  }

  if (isError || !center) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600 font-bold">Failed to load evacuation center.</p>
        <Link href="/admin/evacuation-centers" className="text-xs text-emerald-700 underline mt-2 block">
          Return to list
        </Link>
      </div>
    );
  }

  const mapItem = {
    id: center.id,
    name: center.facility.name,
    category: "evacuation_center" as const,
    location: center.facility.location,
    area_name: center.facility.area_name,
    statusLabel: center.is_open ? "Open Center" : "Closed Center",
    tone: center.is_open ? ("emerald" as const) : ("slate" as const),
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <Link
          href={`/admin/evacuation-centers/${centerId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Center Details
        </Link>
      </div>

      <AdminPageHeader
        title={`Edit ${center.facility.name}`}
        description="Update capacity limits, operational status, contact information, and equipment notes."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="size-4 text-emerald-700" />
            Center Specifications
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity" className="text-xs font-bold text-slate-800">
                Capacity (Persons)
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
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
                Operational State
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
                Contact Person
              </Label>
              <Input
                id="contact_person"
                {...register("contact_person")}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number" className="text-xs font-bold text-slate-800">
                Contact Number
              </Label>
              <Input
                id="contact_number"
                {...register("contact_number")}
                className="h-10 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-800">
              Operational Notes
            </Label>
            <Textarea
              id="notes"
              rows={4}
              {...register("notes")}
              className="rounded-xl resize-none text-xs"
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm("Are you sure you want to deactivate this evacuation center?")) {
                  deactivateMutation.mutate();
                }
              }}
              className="h-10 gap-1.5 border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="size-3.5" />
              Deactivate
            </Button>

            <div className="flex items-center gap-3">
              <Link href={`/admin/evacuation-centers/${centerId}`}>
                <Button type="button" variant="outline" className="h-10 px-5 text-xs font-bold">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="h-10 bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Map preview */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-1 shadow-xl overflow-hidden flex flex-col">
            <div className="h-[360px] sm:h-[420px] w-full overflow-hidden rounded-xl">
              <AdminAssetWorkspaceMap
                items={[mapItem]}
                selectedId={center.id}
                onSelect={() => {}}
                showHazard
                showAreas
              />
            </div>
            <div className="p-4 text-xs text-white">
              <p className="font-bold text-emerald-300 text-sm">{center.facility.name}</p>
              <p className="mt-1 text-emerald-100/80 text-[11.5px]">
                {center.facility.address || "Geocoded in Barangay San Jose"}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
