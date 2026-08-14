"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Check, HeartHandshake, UserRound } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MemberUpdate, RegistryMemberOut } from "@/lib/api/registry-types";

const relationships = ["Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "Others"];
const schema = z.object({
  full_name: z.string().trim().min(1, "Full name is required."),
  birth_date: z.string().min(1, "Birthday is required."),
  sex: z.union([z.literal(""), z.enum(["male", "female"])]),
  contact_number: z.string(),
  relationship_to_head: z.string(),
  is_pwd: z.boolean(), is_pregnant: z.boolean(), is_lactating: z.boolean(),
  has_chronic_condition: z.boolean(), chronic_condition_note: z.string(), is_bedridden: z.boolean(),
}).refine((value) => value.sex !== "", { path: ["sex"], message: "Sex is required." }).refine((value) => !value.has_chronic_condition || value.chronic_condition_note.trim().length > 0, { path: ["chronic_condition_note"], message: "Describe the chronic condition." });
type Values = z.infer<typeof schema>;

const empty: Values = { full_name: "", birth_date: "", sex: "", contact_number: "", relationship_to_head: "", is_pwd: false, is_pregnant: false, is_lactating: false, has_chronic_condition: false, chronic_condition_note: "", is_bedridden: false };

export function RegistryMemberForm({ initial, isHead = false, protectedName = false, submitLabel = "Save Citizen", onSubmit, onCancel }: { initial?: RegistryMemberOut; isHead?: boolean; protectedName?: boolean; submitLabel?: string; onSubmit: (values: MemberUpdate) => Promise<void>; onCancel: () => void }) {
  const [review, setReview] = React.useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial ? { ...empty, full_name: initial.full_name, birth_date: initial.birth_date ?? "", sex: initial.sex === "female" || initial.sex === "male" ? initial.sex : "", contact_number: initial.contact_number ?? "", relationship_to_head: initial.relationship_to_head ?? "", is_pwd: initial.is_pwd, is_pregnant: initial.is_pregnant, is_lactating: initial.is_lactating, has_chronic_condition: initial.has_chronic_condition, chronic_condition_note: initial.chronic_condition_note ?? "", is_bedridden: initial.is_bedridden } : empty });
  const values = useWatch({ control: form.control });
  const proceed = form.handleSubmit((next) => {
    if (!isHead && !next.relationship_to_head) {
      form.setError("relationship_to_head", { message: "Choose a relationship." });
      return;
    }
    setReview(true);
  });
  const save = async () => {
    const value = form.getValues();
    await onSubmit({ ...value, sex: value.sex as "male" | "female", contact_number: value.contact_number.trim() || null, relationship_to_head: isHead ? null : value.relationship_to_head, chronic_condition_note: value.has_chronic_condition ? value.chronic_condition_note.trim() : null, is_child: false, is_senior: false });
    setReview(false);
  };
  const fieldClass = "mt-1.5 border-emerald-200 focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20";
  return <form onSubmit={proceed} className="space-y-4 pb-24">
    <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <Card className="border-emerald-200"><CardContent className="p-5"><SectionHead icon={UserRound} title="Citizen Profile" subtitle="Record the person’s identity and place in the household." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Full Name" error={form.formState.errors.full_name?.message}><Input {...form.register("full_name")} disabled={protectedName} className={fieldClass} /></Field>
          <Field label="Birthday" error={form.formState.errors.birth_date?.message}><Input type="date" {...form.register("birth_date")} className={fieldClass} /></Field>
          <Field label="Sex" error={form.formState.errors.sex?.message}><select {...form.register("sex")} className="mt-1.5 h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm focus:border-emerald-600"><option value="">Select Sex</option><option value="female">Female</option><option value="male">Male</option></select></Field>
          <Field label="Contact Number" optional><Input {...form.register("contact_number")} placeholder="09XX XXX XXXX" className={fieldClass} /></Field>
          {!isHead ? <Field label="Relationship to Head" error={form.formState.errors.relationship_to_head?.message}><select {...form.register("relationship_to_head")} className="mt-1.5 h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm"><option value="">Select Relationship</option>{relationships.map((item) => <option key={item}>{item}</option>)}</select></Field> : <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-800"><b>Household Head</b><p className="mt-1 text-xs">The head relationship is protected.</p></div>}
        </div>
      </CardContent></Card>
      <Card className="border-violet-200 bg-gradient-to-br from-white to-violet-50/40"><CardContent className="p-5"><SectionHead icon={HeartHandshake} title="Support & Readiness" subtitle="Select only needs that are currently recorded." />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{([ ["is_pwd", "PWD"], ["is_pregnant", "Pregnant"], ["is_lactating", "Lactating"], ["has_chronic_condition", "Chronic Condition"], ["is_bedridden", "Bedridden / Mobility-Limited"] ] as const).map(([name, label]) => <Controller key={name} name={name} control={form.control} render={({ field }) => <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-medium"><input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-emerald-600" />{label}</label>} />)}</div>
        {values.has_chronic_condition ? <Field className="mt-4" label="Chronic Condition Note" error={form.formState.errors.chronic_condition_note?.message}><Textarea {...form.register("chronic_condition_note")} className={fieldClass} /></Field> : null}
      </CardContent></Card>
    </div>
    <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-neutral-200 bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur lg:left-72"><div className="mx-auto flex max-w-[1584px] items-center justify-between gap-4"><div className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex"><span className="grid size-7 place-items-center rounded-full bg-emerald-100"><Check className="size-4" /></span>Citizen Profile <span className="text-neutral-300">→</span> Support &amp; Readiness</div><div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">{submitLabel}</Button></div></div></div>
    <Dialog open={review} onOpenChange={setReview}><DialogContent><DialogHeader><DialogTitle>Review Citizen Record</DialogTitle><DialogDescription>Confirm the citizen’s identity, household relationship, and recorded support needs before saving.</DialogDescription></DialogHeader><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm"><b>{values.full_name || "Unnamed Citizen"}</b><p className="mt-1 text-neutral-600">{values.birth_date} · {values.sex ? values.sex[0].toUpperCase() + values.sex.slice(1) : "Sex not selected"}{isHead ? " · Household Head" : ` · ${values.relationship_to_head || "Relationship not selected"}`}</p></div><DialogFooter><Button variant="outline" onClick={() => setReview(false)}>Keep Editing</Button><Button onClick={save} disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Confirm & Save"}</Button></DialogFooter></DialogContent></Dialog>
  </form>;
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) { return <div className="flex items-center gap-3 border-b border-neutral-100 pb-4"><span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="size-4" /></span><div><h2 className="font-bold">{title}</h2><p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p></div></div>; }
function Field({ label, optional, error, className, children }: { label: string; optional?: boolean; error?: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label} {optional ? <span className="font-normal text-neutral-400">(Optional)</span> : <span className="text-red-600">*</span>}</Label>{children}{error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}</div>; }
