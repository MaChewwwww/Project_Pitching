"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HouseholdDetailOut, HouseholdUpdate } from "@/lib/api/registry-types";
import type { LatLng, PointResolution } from "@/components/features/registry/location-picker";

interface AreaOption { id: string; name: string }

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
    waterway_proximity: (household.waterway_proximity as HouseholdUpdate["waterway_proximity"]) ?? null,
    latitude: household.location?.coordinates[1] ?? null,
    longitude: household.location?.coordinates[0] ?? null,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [locationMessage, setLocationMessage] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.area_id) return setError("Select an area.");
    if (!values.is_unreachable_by_phone && !values.contact_number?.trim()) return setError("Contact number is required unless the household is unreachable by phone.");
    setError(null); setSaving(true);
    try { await onSubmit({ ...values, head_name: values.head_name?.trim() || null, contact_number: values.contact_number?.trim() || null, street_address: values.street_address?.trim() || null }); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not save this household."); }
    finally { setSaving(false); }
  }

  function handleLocationChange(next: LatLng) {
    setValues((current) => ({ ...current, latitude: next.lat, longitude: next.lng }));
  }

  function handleLocationResolved(resolution: PointResolution) {
    if (!resolution.within_barangay || !resolution.area_id) {
      setLocationMessage("That pin is outside the Barangay San Jose boundary. Choose a location inside the barangay.");
      return;
    }
    setValues((current) => ({
      ...current,
      area_id: resolution.area_id ?? current.area_id,
      street_address:
        !current.street_address || current.street_address.startsWith("Area ")
          ? resolution.address_label
          : current.street_address,
    }));
    setLocationMessage(`${resolution.area_name} selected. The address is an approximate boundary label; add a house number or purok if known.`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="head_name">Head of household <span className="text-red-600">*</span></Label><Input id="head_name" value={values.head_name ?? ""} disabled={protectedHead} onChange={(event) => setValues((v) => ({ ...v, head_name: event.target.value }))} className="mt-1.5" />{protectedHead ? <p className="mt-1 text-xs text-neutral-500">This head is linked to a resident account; the account owns the name.</p> : null}</div>
        <div><Label htmlFor="contact_number">Contact number</Label><Input id="contact_number" type="tel" value={values.contact_number ?? ""} onChange={(event) => setValues((v) => ({ ...v, contact_number: event.target.value }))} className="mt-1.5" /></div>
        <div><Label htmlFor="area_id">Area <span className="text-red-600">*</span></Label><select id="area_id" value={values.area_id} onChange={(event) => setValues((v) => ({ ...v, area_id: event.target.value }))} className="mt-1.5 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={values.is_unreachable_by_phone} onChange={(event) => setValues((v) => ({ ...v, is_unreachable_by_phone: event.target.checked }))} className="size-4 rounded border-neutral-300 accent-emerald-600" /> No reliable phone number</label></div>
        <div className="sm:col-span-2"><Label htmlFor="street_address">House no. / street / purok</Label><Input id="street_address" value={values.street_address ?? ""} onChange={(event) => setValues((v) => ({ ...v, street_address: event.target.value }))} className="mt-1.5" placeholder="Optional address context" /></div>
        <div className="sm:col-span-2"><Label>Pin household location</Label><div className="mt-1.5"><LocationPicker value={values.latitude !== null && values.longitude !== null ? { lat: values.latitude, lng: values.longitude } : null} onChange={handleLocationChange} onResolve={handleLocationResolved} caption="Pin the home to derive its area and an approximate Barangay San Jose address label." /></div>{locationMessage ? <p className="mt-2 text-xs text-neutral-500">{locationMessage}</p> : null}</div>
        <div><Label htmlFor="waterway_proximity">Waterway proximity</Label><select id="waterway_proximity" value={values.waterway_proximity ?? ""} onChange={(event) => setValues((v) => ({ ...v, waterway_proximity: (event.target.value || null) as HouseholdUpdate["waterway_proximity"] }))} className="mt-1.5 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"><option value="">Not recorded</option><option value="very_near">Very near</option><option value="near">Near</option><option value="far">Far</option></select></div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">{onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save household"}</Button></div>
    </form>
  );
}
