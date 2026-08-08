"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
import { HouseholdMemberRepeater } from "@/components/features/admin/household-member-repeater";
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
import { useRegistrationDraft } from "@/lib/hooks/use-registration-draft";
import type { HouseholdCreateBhw, HouseholdCreateResponse } from "@/lib/api/registry-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  { ssr: false, loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" /> },
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
  head_name: z.string().min(1, "Required"),
  contact_number: z.string().optional(),
  is_unreachable_by_phone: z.boolean(),
  area_id: z.string().min(1, "Select an area"),
  street_address: z.string().optional(),
  head_birth_date: z.string().optional(),
  head_sex: z.enum(["male", "female"]).optional(),
  head_is_pwd: z.boolean(),
  head_is_pregnant: z.boolean(),
  head_is_lactating: z.boolean(),
  head_has_chronic_condition: z.boolean(),
  head_is_bedridden: z.boolean(),
  // Part of the form (not separate useState) specifically so the draft hook's
  // `form.watch()` covers it — a dropped pin used to be lost on draft resume.
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

/**
 * FR-REG-002/003/004/024/025 — a BHW's one-visit registration. Unlike
 * self-registration, everything (household + every member) is captured in a
 * single submission, `source='bhw'`, and no account is ever attached
 * (BRD D-11 — permanent, not a gap).
 */
export default function NewHouseholdPage() {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: allAreas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  // Cosmetic only — the server independently rejects an out-of-scope area_id
  // regardless of what this list shows (registry/service.py's real check).
  const areas =
    user?.role === "bhw"
      ? (allAreas ?? []).filter((a) => user.assigned_area_ids.includes(a.id))
      : (allAreas ?? []);

  const form = useForm<BhwFormValues>({
    resolver: zodResolver(bhwFormSchema as never),
    defaultValues: emptyValues,
  });
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const { hasDraft, resume, discard, clearOnSuccess } = useRegistrationDraft(DRAFT_KEY, form);

  const submitMutation = useMutation({
    mutationFn: (body: HouseholdCreateBhw) =>
      api.post<HouseholdCreateResponse>("/admin/households", body).then((r) => r.data),
    onSuccess: (result) => {
      clearOnSuccess();
      toast.success(`Household ${result.household.reference_no} registered`);
      if (result.duplicate_candidates.length > 0) {
        toast.warning(
          `Possible duplicate: ${result.duplicate_candidates[0].head_name} (${result.duplicate_candidates[0].reference_no})`,
        );
      }
      router.push("/admin/households");
    },
    onError: (error) => {
      setServerError(toDisplayError(error).detail);
      // Deliberately not clearing the draft — a failed submit must never lose
      // the officer's work (design.md 9.6).
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
      members: values.members.map((m) => ({
        full_name: m.full_name,
        birth_date: m.birth_date || null,
        sex: m.sex ?? null,
        relationship_to_head: m.relationship_to_head || null,
        is_child: m.is_child,
        is_senior: m.is_senior,
        is_pwd: m.is_pwd,
        is_pregnant: m.is_pregnant,
        is_lactating: m.is_lactating,
        has_chronic_condition: m.has_chronic_condition,
        chronic_condition_note: m.chronic_condition_note || null,
        is_bedridden: m.is_bedridden,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Register a"
        titleAccent="household"
        description="One visit, every member, no account attached (FR-REG-002)."
      />

      {hasDraft ? (
        <Card className="border-primary-200 bg-primary-50">
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-body-sm text-primary-800">
              You have an unfinished registration saved on this device.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={resume}>
                Resume draft
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={discard}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {serverError ? (
              <div
                role="alert"
                className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            ) : null}

            <h2 className="text-h4 text-neutral-900">Household</h2>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="head_name">Head of household — full name</Label>
              <Input id="head_name" aria-invalid={!!errors.head_name} {...register("head_name")} />
              {errors.head_name ? (
                <p className="text-danger text-xs">{errors.head_name.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_number">Contact number</Label>
                <Input id="contact_number" type="tel" {...register("contact_number")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="area_id">Area</Label>
                <Controller
                  control={control}
                  name="area_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="area_id" className="w-full">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.area_id ? (
                  <p className="text-danger text-xs">{errors.area_id.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="is_unreachable_by_phone"
                render={({ field }) => (
                  <Checkbox
                    id="is_unreachable_by_phone"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_unreachable_by_phone" className="font-normal">
                No reliable phone number
              </Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="street_address">Street address</Label>
              <Input id="street_address" {...register("street_address")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Location (optional)</Label>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <LocationPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <h2 className="text-h4 mt-2 text-neutral-900">Head&apos;s profile</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="head_birth_date">Birth date</Label>
                <Input id="head_birth_date" type="date" {...register("head_birth_date")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="head_sex">Sex</Label>
                <Controller
                  control={control}
                  name="head_sex"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="head_sex" className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
              <legend className="text-caption mb-1 w-full text-neutral-500">
                Does any of this apply to the head?
              </legend>
              {(
                [
                  ["head_is_pwd", "PWD"],
                  ["head_is_pregnant", "Pregnant"],
                  ["head_is_lactating", "Lactating"],
                  ["head_has_chronic_condition", "Chronic condition"],
                  ["head_is_bedridden", "Bedridden / mobility-limited"],
                ] as const
              ).map(([name, label]) => (
                <div key={name} className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <Checkbox
                        id={name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={name} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </fieldset>

            <h2 className="text-h4 mt-2 text-neutral-900">Household members</h2>
            <HouseholdMemberRepeater control={control} />

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => reset(emptyValues)}>
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Register household"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
