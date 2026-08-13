"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Droplets, Home, MapPin, UserRound, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { HouseholdMemberRepeater } from "@/components/features/admin/household-member-repeater";
import type { PointResolution } from "@/components/features/registry/location-picker";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { HouseholdCreateBhw, HouseholdCreateResponse } from "@/lib/api/registry-types";
import { useRegistrationDraft } from "@/lib/hooks/use-registration-draft";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-72 w-full rounded-xl bg-neutral-100" /> },
);

interface Area {
  id: string;
  name: string;
  code: string | null;
}

const DRAFT_KEY = "bhw-household-draft";

const memberSchema = z.object({
  full_name: z.string().min(1, "Required"),
  birth_date: z.string().optional(),
  sex: z.enum(["male", "female"]).optional(),
  relationship_to_head: z.string().optional(),
  is_child: z.boolean(),
  is_senior: z.boolean(),
  is_pwd: z.boolean(),
  is_pregnant: z.boolean(),
  is_lactating: z.boolean(),
  has_chronic_condition: z.boolean(),
  chronic_condition_note: z.string().optional(),
  is_bedridden: z.boolean(),
});

const bhwFormSchema = z.object({
  head_name: z.string().min(1, "Enter the household head's full name"),
  contact_number: z.string().optional(),
  is_unreachable_by_phone: z.boolean(),
  area_id: z.string().min(1, "Select an area"),
  street_address: z.string().optional(),
  waterway_proximity: z.enum(["very_near", "near", "far"], {
    message: "Select the household's proximity to a waterway",
  }),
  head_birth_date: z.string().optional(),
  head_sex: z.enum(["male", "female"]).optional(),
  head_is_pwd: z.boolean(),
  head_is_pregnant: z.boolean(),
  head_is_lactating: z.boolean(),
  head_has_chronic_condition: z.boolean(),
  head_is_bedridden: z.boolean(),
  // Part of the form so the local draft keeps the selected map pin.
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  members: z.array(memberSchema),
});

type BhwFormValues = z.infer<typeof bhwFormSchema>;

const emptyValues: BhwFormValues = {
  head_name: "",
  contact_number: "",
  is_unreachable_by_phone: false,
  area_id: "",
  street_address: "",
  waterway_proximity: "far",
  head_birth_date: "",
  head_sex: undefined,
  head_is_pwd: false,
  head_is_pregnant: false,
  head_is_lactating: false,
  head_has_chronic_condition: false,
  head_is_bedridden: false,
  location: null,
  members: [],
};

const WATERWAY_OPTIONS = [
  {
    value: "very_near" as const,
    label: "Very near",
    description: "Within 1 km of a river, creek, or waterway",
    risk: "High flood risk",
    tone: "border-red-200 bg-red-50/70 text-red-800",
    selectedTone: "border-red-500 ring-2 ring-red-500/20",
  },
  {
    value: "near" as const,
    label: "Near",
    description: "About 1 to 5 km from a waterway",
    risk: "Medium flood risk",
    tone: "border-amber-200 bg-amber-50/70 text-amber-800",
    selectedTone: "border-amber-500 ring-2 ring-amber-500/20",
  },
  {
    value: "far" as const,
    label: "Far",
    description: "More than 6 km from a waterway",
    risk: "Low flood risk",
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    selectedTone: "border-emerald-500 ring-2 ring-emerald-500/20",
  },
];

/** FR-REG-002/003/004/024/025 — one BHW-assisted household visit. */
export default function NewHouseholdPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [locationHint, setLocationHint] = React.useState<string | null>(null);

  const { data: allAreas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((response) => response.data),
  });

  const areas = user?.role === "bhw"
    ? (allAreas ?? []).filter((area) => user.assigned_area_ids.includes(area.id))
    : (allAreas ?? []);

  const form = useForm<BhwFormValues>({
    resolver: zodResolver(bhwFormSchema as never),
    defaultValues: emptyValues,
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { hasDraft, resume, discard, clearOnSuccess } = useRegistrationDraft(DRAFT_KEY, form);

  const submitMutation = useMutation({
    mutationFn: (body: HouseholdCreateBhw) =>
      api.post<HouseholdCreateResponse>("/admin/households", body).then((response) => response.data),
    onSuccess: (result) => {
      clearOnSuccess();
      toast.success(`Household ${result.household.reference_no} created`);
      if (result.duplicate_candidates.length > 0) {
        toast.warning(`Possible duplicate: ${result.duplicate_candidates[0].head_name} (${result.duplicate_candidates[0].reference_no})`);
      }
      router.push("/admin/households");
    },
    onError: (error) => {
      setServerError(toDisplayError(error).detail);
    },
  });

  async function onSubmit(values: BhwFormValues) {
    setServerError(null);
    await submitMutation.mutateAsync({
      head_name: values.head_name,
      contact_number: values.contact_number || null,
      is_unreachable_by_phone: values.is_unreachable_by_phone,
      area_id: values.area_id,
      street_address: values.street_address || null,
      waterway_proximity: values.waterway_proximity,
      latitude: values.location?.lat ?? null,
      longitude: values.location?.lng ?? null,
      head_member: {
        full_name: values.head_name,
        birth_date: values.head_birth_date || null,
        sex: values.head_sex ?? null,
        relationship_to_head: null,
        is_child: false,
        is_senior: false,
        is_pwd: values.head_is_pwd,
        is_pregnant: values.head_is_pregnant,
        is_lactating: values.head_is_lactating,
        has_chronic_condition: values.head_has_chronic_condition,
        chronic_condition_note: null,
        is_bedridden: values.head_is_bedridden,
      },
      members: values.members.map((member) => ({
        full_name: member.full_name,
        birth_date: member.birth_date || null,
        sex: member.sex ?? null,
        relationship_to_head: member.relationship_to_head || null,
        is_child: member.is_child,
        is_senior: member.is_senior,
        is_pwd: member.is_pwd,
        is_pregnant: member.is_pregnant,
        is_lactating: member.is_lactating,
        has_chronic_condition: member.has_chronic_condition,
        chronic_condition_note: member.chronic_condition_note || null,
        is_bedridden: member.is_bedridden,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <AdminPageHeader
        title="Create Household"
        description="Record a household, its location, waterway proximity, and every known member in one barangay visit."
      />

      {hasDraft ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-950">Continue an unfinished registration</p>
              <p className="mt-0.5 text-xs text-amber-800">This device has a saved household draft.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={resume} className="rounded-lg">Resume draft</Button>
              <Button type="button" size="sm" variant="outline" onClick={discard} className="rounded-lg bg-white">Discard</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 lg:grid-cols-12 lg:items-start">
        {serverError ? (
          <div role="alert" className="lg:col-span-12 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="space-y-4 lg:col-span-7">
          <Card className="border-neutral-200/90 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Home aria-hidden className="size-4" /></span>
                <div><h2 className="text-base font-bold text-neutral-950">Household details</h2><p className="mt-0.5 text-xs text-neutral-500">Start with the household head, contact details, and assigned area.</p></div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="head_name">Head of household <span className="text-red-600">*</span></Label>
                <Input id="head_name" aria-invalid={!!errors.head_name} placeholder="Full name" {...register("head_name")} />
                {errors.head_name ? <p className="text-danger text-xs">{errors.head_name.message}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5"><Label htmlFor="contact_number">Contact number <span className="text-neutral-400 font-normal">(optional)</span></Label><Input id="contact_number" type="tel" placeholder="09XX XXX XXXX" {...register("contact_number")} /></div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="area_id">Area <span className="text-red-600">*</span></Label>
                  <Controller control={control} name="area_id" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="area_id" aria-invalid={!!errors.area_id} className="w-full"><SelectValue placeholder="Select area" /></SelectTrigger>
                      <SelectContent>{areas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                  {errors.area_id ? <p className="text-danger text-xs">{errors.area_id.message}</p> : null}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3.5 py-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-100">
                <Controller control={control} name="is_unreachable_by_phone" render={({ field }) => <Checkbox id="is_unreachable_by_phone" checked={field.value} onCheckedChange={field.onChange} />} />
                <span><span className="font-semibold text-neutral-900">No reliable phone number</span><span className="block text-xs text-neutral-500">The household can still be registered and followed up in person.</span></span>
              </label>
            </CardContent>
          </Card>

          <Card className="border-neutral-200/90 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MapPin aria-hidden className="size-4" /></span>
                <div><h2 className="text-base font-bold text-neutral-950">Address and map pin</h2><p className="mt-0.5 text-xs text-neutral-500">The pin suggests the area and a coarse address label. Add house or purok details when known.</p></div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs">
                <p className="text-neutral-500">Region <span className="block pt-0.5 font-semibold text-neutral-800">IV-A (CALABARZON)</span></p>
                <p className="text-neutral-500">Province <span className="block pt-0.5 font-semibold text-neutral-800">Rizal</span></p>
                <p className="text-neutral-500">City / Municipality <span className="block pt-0.5 font-semibold text-neutral-800">Rodriguez (Montalban)</span></p>
                <p className="text-neutral-500">Barangay <span className="block pt-0.5 font-semibold text-neutral-800">San Jose</span></p>
              </div>

              <div className="flex flex-col gap-1.5"><Label htmlFor="street_address">House no. / Street / Purok <span className="text-neutral-400 font-normal">(optional)</span></Label><Input id="street_address" {...register("street_address")} placeholder="e.g. 12 Sampaguita St., Purok 3" /></div>

              <div className="flex flex-col gap-2">
                <Label>Pin household location <span className="text-neutral-400 font-normal">(optional)</span></Label>
                <Controller control={control} name="location" render={({ field }) => (
                  <LocationPicker
                    value={field.value}
                    onChange={field.onChange}
                    onResolve={(resolution: PointResolution) => {
                      if (!resolution.within_barangay || !resolution.area_id) {
                        setLocationHint("Choose a pin inside Barangay San Jose.");
                        return;
                      }
                      setValue("area_id", resolution.area_id, { shouldValidate: true });
                      const currentAddress = form.getValues("street_address");
                      if (!currentAddress || currentAddress.startsWith("Area ")) setValue("street_address", resolution.address_label ?? "");
                      setLocationHint(`${resolution.area_name} selected. The address label is approximate; add a house number or purok if known.`);
                    }}
                  />
                )} />
                {locationHint ? <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">{locationHint}</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:col-span-5 lg:sticky lg:top-4">
          <Card className="border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/70">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-sky-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white"><Droplets aria-hidden className="size-4" /></span>
                <div><h2 className="text-base font-bold text-neutral-950">Waterway proximity <span className="text-red-600">*</span></h2><p className="mt-0.5 text-xs text-neutral-500">How close is the home to a river, creek, or other waterway?</p></div>
              </div>

              <Controller control={control} name="waterway_proximity" render={({ field }) => (
                <div className="space-y-2">
                  {WATERWAY_OPTIONS.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <label key={option.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all", option.tone, selected ? option.selectedTone : "hover:border-neutral-300")}>
                        <input type="radio" name="waterway_proximity" value={option.value} checked={selected} onChange={() => field.onChange(option.value)} className="size-4 shrink-0 accent-emerald-600" />
                        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-neutral-900">{option.label}</span><span className="block text-[11px] text-neutral-600">{option.description}</span></span>
                        <span className="shrink-0 rounded-full border border-current/20 bg-white/70 px-2 py-1 text-[10px] font-bold">{option.risk}</span>
                      </label>
                    );
                  })}
                </div>
              )} />
              {errors.waterway_proximity ? <p className="text-danger text-xs font-semibold">{errors.waterway_proximity.message}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-neutral-200/90 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UserRound aria-hidden className="size-4" /></span>
                <div><h2 className="text-base font-bold text-neutral-950">Head&apos;s profile</h2><p className="mt-0.5 text-xs text-neutral-500">Record what is known. Optional details help readiness planning.</p></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="flex flex-col gap-1.5"><Label htmlFor="head_birth_date">Birth date</Label><Input id="head_birth_date" type="date" {...register("head_birth_date")} /></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="head_sex">Sex</Label><Controller control={control} name="head_sex" render={({ field }) => (<Select value={field.value ?? ""} onValueChange={field.onChange}><SelectTrigger id="head_sex" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select>)} /></div>
              </div>

              <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <legend className="mb-1 text-xs font-semibold text-neutral-600">Does any of this apply to the head?</legend>
                {([ ["head_is_pwd", "PWD"], ["head_is_pregnant", "Pregnant"], ["head_is_lactating", "Lactating"], ["head_has_chronic_condition", "Chronic condition"], ["head_is_bedridden", "Bedridden / mobility-limited"] ] as const).map(([name, label]) => (
                  <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"><Controller control={control} name={name} render={({ field }) => <Checkbox id={name} checked={field.value} onCheckedChange={field.onChange} />} /><span>{label}</span></label>
                ))}
              </fieldset>
            </CardContent>
          </Card>
        </aside>

        <Card className="lg:col-span-12 border-neutral-200/90 bg-white">
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Users aria-hidden className="size-4" /></span>
              <div><h2 className="text-base font-bold text-neutral-950">Household members</h2><p className="mt-0.5 text-xs text-neutral-500">Add every member available during this visit. You can add more than one.</p></div>
            </div>
            <HouseholdMemberRepeater control={control} />
          </CardContent>
        </Card>

        <div className="lg:col-span-12 sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">Fields marked <span className="font-bold text-red-600">*</span> are required. Your work is saved as a local draft while you type.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/households")} className="rounded-xl">Cancel</Button>
            <Button type="button" variant="outline" onClick={() => reset(emptyValues)} className="rounded-xl">Clear form</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 font-bold hover:bg-emerald-700">{isSubmitting ? "Creating household…" : "Create household"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
