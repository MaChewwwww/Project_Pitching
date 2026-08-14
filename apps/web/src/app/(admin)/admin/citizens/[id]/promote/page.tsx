"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Droplets, Home, MapPinned } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdDetailOut, RegistryMemberDetailOut } from "@/lib/api/registry-types";

const LocationPicker = dynamic(() => import("@/components/features/registry/location-picker"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-neutral-100" />,
});

type Area = { id: string; name: string };
type Proximity = "very_near" | "near" | "far";

export default function PromoteCitizenPage() {
  useRequireRole("admin", "bhw");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const citizen = useQuery({
    queryKey: ["admin", "citizen", id],
    queryFn: () => api.get<RegistryMemberDetailOut>(`/admin/members/${id}`).then((r) => r.data),
  });

  const areas = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const [form, setForm] = React.useState({
    area_id: "",
    contact_number: "",
    street_address: "",
    waterway_proximity: "" as Proximity | "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [review, setReview] = React.useState(false);
  const [error, setError] = React.useState("");

  const promote = useMutation({
    mutationFn: () =>
      api.post<HouseholdDetailOut>(`/admin/members/${id}/promote`, {
        ...form,
        contact_number: form.contact_number.trim() || null,
      }),
    onSuccess: () => {
      toast.success("New household created for citizen");
      router.push(`/admin/citizens/${id}?tab=household` as Route);
    },
    onError: (value) => {
      setReview(false);
      setError(toDisplayError(value).detail);
    },
  });

  const validate = () => {
    if (
      !form.area_id ||
      !form.street_address.trim() ||
      !form.waterway_proximity ||
      form.latitude === null ||
      form.longitude === null
    ) {
      setError("Please complete the area, exact address, map pin location, and waterway proximity.");
      return;
    }
    setError("");
    setReview(true);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <AdminPageHeader
        title="Create Household"
        description={`Establish ${citizen.data?.full_name ?? "this citizen"} as the head of a new, mapped San Jose household while preserving their history.`}
      />

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white">
          <CardContent className="space-y-4 p-5">
            <p className="flex items-center gap-2 font-bold text-neutral-950">
              <Home className="size-5 text-emerald-700" />
              New Household Details
            </p>
            <div>
              <Label>New Household Head</Label>
              <Input value={citizen.data?.full_name ?? "Loading…"} disabled className="mt-1.5 border-emerald-200/80 bg-neutral-50 font-semibold" />
            </div>
            <div>
              <Label>
                Area <span className="text-red-600">*</span>
              </Label>
              <Select
                value={form.area_id}
                onValueChange={(val) => setForm((v) => ({ ...v, area_id: val }))}
              >
                <SelectTrigger className="mt-1.5 h-10 w-full rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder="Select Area" />
                </SelectTrigger>
                <SelectContent align="start" className="w-[var(--radix-select-trigger-width)] min-w-[12rem]">
                  {(areas.data ?? []).map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Contact Number <span className="font-normal text-neutral-400">(Optional)</span>
              </Label>
              <Input
                value={form.contact_number}
                onChange={(e) => setForm((v) => ({ ...v, contact_number: e.target.value }))}
                className="mt-1.5 border-emerald-200/80"
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div>
              <Label>
                House No. / Street / Subdivision <span className="text-red-600">*</span>
              </Label>
              <Input
                value={form.street_address}
                onChange={(e) => setForm((v) => ({ ...v, street_address: e.target.value }))}
                className="mt-1.5 border-emerald-200/80"
                placeholder="e.g. Blk 12 Lot 4, Riverside St."
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/40">
            <CardContent className="p-5">
              <p className="mb-4 flex items-center gap-2 font-bold text-neutral-950">
                <MapPinned className="size-5 text-sky-700" />
                Pin Household Location <span className="text-red-600">*</span>
              </p>
              <LocationPicker
                value={
                  form.latitude !== null && form.longitude !== null
                    ? { lat: form.latitude, lng: form.longitude }
                    : null
                }
                onChange={(point) => setForm((v) => ({ ...v, latitude: point.lat, longitude: point.lng }))}
                restrictToBarangay
                onBoundaryViolation={() => setForm((v) => ({ ...v, latitude: null, longitude: null }))}
                onResolve={(resolution) => {
                  if (!resolution.within_barangay) return;
                  setForm((v) => ({
                    ...v,
                    area_id: resolution.area_id ?? v.area_id,
                    waterway_proximity: resolution.waterway_proximity ?? v.waterway_proximity,
                  }));
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-sky-200/80">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-bold text-neutral-950">
                <Droplets className="size-5 text-sky-700" />
                Waterway Proximity <span className="text-red-600">*</span>
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["very_near", "Very Near", "High Risk"],
                    ["near", "Near", "Medium Risk"],
                    ["far", "Far", "Low Risk"],
                  ] as const
                ).map(([value, label, risk]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${
                      form.waterway_proximity === value
                        ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-2xs"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-800"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mr-2 accent-emerald-600"
                      checked={form.waterway_proximity === value}
                      onChange={() => setForm((v) => ({ ...v, waterway_proximity: value }))}
                    />
                    <b>{label}</b>
                    <span className="mt-1 block text-xs text-neutral-500">{risk}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-neutral-200 bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur-md lg:left-72">
        <div className="ml-auto flex max-w-[1500px] justify-end gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => router.push(`/admin/citizens/${id}?tab=household` as Route)}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800"
            onClick={validate}
          >
            Review &amp; Create Household
          </Button>
        </div>
      </div>

      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Household?</DialogTitle>
            <DialogDescription>
              The citizen ID and history will be preserved. Their old household roster will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-neutral-800">
            <b>{citizen.data?.full_name}</b>
            <p className="mt-1 text-neutral-600">
              {areas.data?.find((area) => area.id === form.area_id)?.name} · {form.street_address}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setReview(false)}>
              Keep Editing
            </Button>
            <Button
              disabled={promote.isPending}
              className="cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={() => promote.mutate()}
            >
              {promote.isPending ? "Creating…" : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
