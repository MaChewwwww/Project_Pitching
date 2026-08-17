"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HouseholdDetailOut, HouseholdUpdate } from "@/lib/api/registry-types";
import type {
  LatLng,
  PointResolution,
} from "@/components/features/registry/location-picker";

interface AreaOption {
  id: string;
  name: string;
}

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-neutral-100" /> },
);

export function RegistryHouseholdForm({
  household,
  areas,
  protectedHead,
  onSubmit,
  onCancel,
}: {
  household: HouseholdDetailOut;
  areas: AreaOption[];
  protectedHead?: boolean;
  onSubmit: (values: HouseholdUpdate) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = React.useState<HouseholdUpdate>({
    head_name: household.head_name,
    contact_number: household.contact_number,
    is_unreachable_by_phone: household.is_unreachable_by_phone,
    area_id: household.area_id,
    street_address: household.street_address,
    waterway_proximity:
      (household.waterway_proximity as HouseholdUpdate["waterway_proximity"]) ?? null,
    latitude: household.location?.coordinates[1] ?? null,
    longitude: household.location?.coordinates[0] ?? null,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [locationMessage, setLocationMessage] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.area_id) return setError("Select an area.");
    if (!values.is_unreachable_by_phone && !values.contact_number?.trim())
      return setError(
        "Contact number is required unless the household is unreachable by phone.",
      );
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        head_name: values.head_name?.trim() || null,
        contact_number: values.contact_number?.trim() || null,
        street_address: values.street_address?.trim() || null,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this household.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLocationChange(next: LatLng) {
    setValues((current) => ({ ...current, latitude: next.lat, longitude: next.lng }));
  }

  function handleLocationResolved(resolution: PointResolution) {
    if (!resolution.within_barangay || !resolution.area_id) {
      setValues((current) => ({
        ...current,
        area_id: "",
        latitude: null,
        longitude: null,
        waterway_proximity: null,
      }));
      setLocationMessage(
        "That pin is outside the Barangay San Jose boundary. Choose a location inside the barangay.",
      );
      return;
    }
    setValues((current) => ({
      ...current,
      area_id: resolution.area_id ?? current.area_id,
      waterway_proximity: resolution.waterway_proximity ?? current.waterway_proximity,
    }));
    setLocationMessage(
      `${resolution.area_name} selected. Enter the specific house number, street, or subdivision if known.`,
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm font-medium text-red-800"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="head_name" className="text-xs font-bold text-neutral-700">
            Head of household <span className="text-red-600">*</span>
          </Label>
          <Input
            id="head_name"
            value={values.head_name ?? ""}
            disabled={protectedHead}
            onChange={(event) =>
              setValues((v) => ({ ...v, head_name: event.target.value }))
            }
            className="mt-1.5 rounded-xl border-neutral-200/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
          {protectedHead ? (
            <p className="mt-1 text-[11px] text-neutral-500">
              This head is linked to a resident account; the account owns the name.
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-700">
            Contact number
          </Label>
          <Input
            id="contact_number"
            type="tel"
            value={values.contact_number ?? ""}
            onChange={(event) =>
              setValues((v) => ({ ...v, contact_number: event.target.value }))
            }
            placeholder="09XX XXX XXXX"
            className="mt-1.5 rounded-xl border-neutral-200/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <Label htmlFor="area_id" className="text-xs font-bold text-neutral-700">
            Purok / Area <span className="text-red-600">*</span>
          </Label>
          <div className="mt-1.5">
            <Select
              value={values.area_id || undefined}
              onValueChange={(val) => setValues((v) => ({ ...v, area_id: val }))}
            >
              <SelectTrigger
                id="area_id"
                className="h-10 w-full rounded-xl border-neutral-200/90 bg-white text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              >
                <SelectValue placeholder="Select Area" />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={values.is_unreachable_by_phone}
              onChange={(event) =>
                setValues((v) => ({
                  ...v,
                  is_unreachable_by_phone: event.target.checked,
                }))
              }
              className="size-4 rounded border-neutral-300 accent-emerald-600"
            />
            <span>No reliable mobile phone number</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="street_address" className="text-xs font-bold text-neutral-700">
            House no. / Street Address
          </Label>
          <Input
            id="street_address"
            value={values.street_address ?? ""}
            onChange={(event) =>
              setValues((v) => ({ ...v, street_address: event.target.value }))
            }
            className="mt-1.5 rounded-xl border-neutral-200/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="e.g. Block 33 Lot 8b Kasiglahan Village"
          />
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs font-bold text-neutral-700">
            Pin Household Coordinates on Map
          </Label>
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-neutral-200/90 shadow-2xs">
            <LocationPicker
              value={
                values.latitude !== null && values.longitude !== null
                  ? { lat: values.latitude, lng: values.longitude }
                  : null
              }
              onChange={handleLocationChange}
              restrictToBarangay
              onBoundaryViolation={() => {
                setValues((current) => ({
                  ...current,
                  area_id: "",
                  latitude: null,
                  longitude: null,
                  waterway_proximity: null,
                }));
                setLocationMessage(
                  "That pin is outside the Barangay San Jose boundary. Choose a location inside the barangay.",
                );
              }}
              onResolve={handleLocationResolved}
              caption="Drag and position the pin precisely over your rooftop."
            />
          </div>
          {locationMessage ? (
            <p className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
              {locationMessage}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="waterway_proximity" className="text-xs font-bold text-neutral-700">
            Waterway Proximity Assessment
          </Label>
          <div className="mt-1.5">
            <Select
              value={values.waterway_proximity ?? "none"}
              onValueChange={(val) =>
                setValues((v) => ({
                  ...v,
                  waterway_proximity:
                    val === "none" ? null : (val as HouseholdUpdate["waterway_proximity"]),
                }))
              }
            >
              <SelectTrigger
                id="waterway_proximity"
                className="h-10 w-full rounded-xl border-neutral-200/90 bg-white text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              >
                <SelectValue placeholder="Select Waterway Proximity" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Not recorded</SelectItem>
                <SelectItem value="very_near">Very near (Under 1 km)</SelectItem>
                <SelectItem value="near">Near (1 – 5 km)</SelectItem>
                <SelectItem value="far">Far (6 km or more)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2.5 border-t border-neutral-100 pt-4">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-9 rounded-full border-neutral-300 px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          size="sm"
          disabled={saving}
          className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
        >
          {saving ? "Saving Changes…" : "Save Household Details"}
        </Button>
      </div>
    </form>
  );
}
