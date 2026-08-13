"use client";

import * as React from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MemberIn, MemberOut, MemberUpdate, RegistryMemberOut } from "@/lib/api/registry-types";

type MemberValues = MemberUpdate;

const EMPTY: MemberValues = {
  full_name: "",
  birth_date: null,
  sex: null,
  contact_number: null,
  relationship_to_head: "",
  is_child: false,
  is_senior: false,
  is_pwd: false,
  is_pregnant: false,
  is_lactating: false,
  has_chronic_condition: false,
  chronic_condition_note: null,
  is_bedridden: false,
};

function fromMember(member?: Partial<MemberValues> | MemberOut | RegistryMemberOut): MemberValues {
  return {
    ...EMPTY,
    full_name: member?.full_name ?? "",
    birth_date: member?.birth_date ?? null,
    sex: member?.sex === "male" || member?.sex === "female" ? member.sex : null,
    contact_number: member?.contact_number ?? null,
    is_child: member?.is_child ?? false,
    is_senior: member?.is_senior ?? false,
    is_pwd: member?.is_pwd ?? false,
    is_pregnant: member?.is_pregnant ?? false,
    is_lactating: member?.is_lactating ?? false,
    has_chronic_condition: member?.has_chronic_condition ?? false,
    is_bedridden: member?.is_bedridden ?? false,
    relationship_to_head: member?.relationship_to_head ?? "",
    chronic_condition_note: member?.chronic_condition_note ?? null,
  };
}

export function RegistryMemberForm({
  initial,
  submitLabel = "Save citizen",
  protectedName = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<MemberValues> | MemberOut | RegistryMemberOut;
  submitLabel?: string;
  protectedName?: boolean;
  onSubmit: (values: MemberUpdate) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = React.useState<MemberValues>(() => fromMember(initial));
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof MemberValues>(key: K, value: MemberValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const setFlag = (key: keyof MemberValues) =>
    setValues((current) => ({ ...current, [key]: !current[key] }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        full_name: values.full_name.trim(),
        birth_date: values.birth_date || null,
        contact_number: values.contact_number?.trim() || null,
        relationship_to_head: values.relationship_to_head || null,
        chronic_condition_note: values.chronic_condition_note || null,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save this citizen.");
    } finally {
      setSaving(false);
    }
  }

  const flags: Array<[keyof MemberValues, string]> = [
    ["is_pwd", "Person with disability"],
    ["is_pregnant", "Pregnant"],
    ["is_lactating", "Lactating"],
    ["has_chronic_condition", "Chronic condition"],
    ["is_bedridden", "Bedridden / mobility-limited"],
  ];

  // Keep MemberIn structurally visible to this shared form: the create and
  // update contracts intentionally carry the same vulnerability flags.
  void ({} as MemberIn);

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="full_name">Full name <span className="text-red-600">*</span></Label>
          <Input id="full_name" value={values.full_name} disabled={protectedName} onChange={(event) => set("full_name", event.target.value)} className="mt-1.5" />
          {protectedName ? <p className="mt-1 text-xs text-neutral-500">This name is linked to a resident account and can only be changed by the resident.</p> : null}
        </div>
        <div>
          <Label htmlFor="birth_date">Birth date</Label>
          <Input id="birth_date" type="date" value={values.birth_date ?? ""} onChange={(event) => set("birth_date", event.target.value || null)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="sex">Sex</Label>
          <select id="sex" value={values.sex ?? ""} onChange={(event) => set("sex", (event.target.value || null) as MemberValues["sex"])} className="mt-1.5 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </div>
        <div>
          <Label htmlFor="contact_number">Contact number (optional)</Label>
          <Input id="contact_number" type="tel" value={values.contact_number ?? ""} onChange={(event) => set("contact_number", event.target.value || null)} className="mt-1.5" placeholder="09XX XXX XXXX" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="relationship_to_head">Relationship to head</Label>
          <Input id="relationship_to_head" value={values.relationship_to_head ?? ""} onChange={(event) => set("relationship_to_head", event.target.value)} className="mt-1.5" placeholder="e.g. spouse, child, parent" />
        </div>
      </div>
      <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
        <legend className="px-1 text-sm font-bold text-neutral-800">Support and vulnerability flags</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {flags.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-neutral-700 hover:bg-white">
              <input type="checkbox" checked={Boolean(values[key])} onChange={() => setFlag(key)} className="size-4 rounded border-neutral-300 accent-emerald-600" />
              {label}
            </label>
          ))}
        </div>
        {values.has_chronic_condition ? <div className="mt-3"><Label htmlFor="chronic_condition_note">Condition note</Label><Textarea id="chronic_condition_note" value={values.chronic_condition_note ?? ""} onChange={(event) => set("chronic_condition_note", event.target.value)} className="mt-1.5" /></div> : null}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
