"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { PageHeader } from "@/components/common/page-header";
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
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import type { PublicArea } from "@/lib/api/public-types";
import type {
  HouseholdCreateResponse,
  HouseholdCreateSelf,
} from "@/lib/api/registry-types";
import type {
  LatLng,
  PointResolution,
} from "@/components/features/registry/location-picker";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-lg bg-neutral-100" />,
  },
);

/**
 * FR-REG-001's second half — completes the household `/register` deliberately
 * left out. Creates the `household` + head `member` row via `POST
 * /me/household`; `PortalGate` is what routed the resident here.
 */

const onboardingSchema = z
  .object({
    street_address: z.string().optional(),
    waterway_proximity: z
      .enum(["very_near", "near", "far"], {
        message: "Kailangang piliin ang kalapitan sa daanan ng tubig",
      })
      .optional()
      .refine((value) => Boolean(value), {
        message: "Kailangang piliin ang kalapitan sa daanan ng tubig",
      }),
    area_id: z.string().min(1, "Select your area"),
    contact_number: z.string().optional(),
    is_unreachable_by_phone: z.boolean(),
    birth_date: z.string().optional(),
    sex: z.enum(["male", "female"]).optional(),
    is_pwd: z.boolean(),
    is_pregnant: z.boolean(),
    is_lactating: z.boolean(),
    has_chronic_condition: z.boolean(),
    chronic_condition_note: z.string().optional(),
    is_bedridden: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // FR-REG-005 — required unless the household is flagged unreachable by
    // phone; that checkbox is the only way around it, not a blank field.
    if (!values.is_unreachable_by_phone && !values.contact_number) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a contact number, or check “I don't have a reliable phone number”",
        path: ["contact_number"],
      });
    }
  });

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const emptyValues: OnboardingFormValues = {
  street_address: "",
  waterway_proximity: undefined,
  area_id: "",
  contact_number: "",
  is_unreachable_by_phone: false,
  birth_date: "",
  sex: undefined,
  is_pwd: false,
  is_pregnant: false,
  is_lactating: false,
  has_chronic_condition: false,
  chronic_condition_note: "",
  is_bedridden: false,
};

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [location, setLocation] = React.useState<LatLng | null>(null);
  const [locationHint, setLocationHint] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: areas } = useQuery({
    queryKey: ["public", "areas"],
    queryFn: () => api.get<PublicArea[]>("/public/areas").then((r) => r.data),
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: emptyValues,
  });

  const hasChronicCondition = watch("has_chronic_condition");

  const submitMutation = useMutation({
    mutationFn: (body: HouseholdCreateSelf) =>
      api.post<HouseholdCreateResponse>("/me/household", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Household registered");
      router.push("/portal");
    },
    onError: (error) => {
      setServerError(toDisplayError(error).detail);
    },
  });

  async function onSubmit(values: OnboardingFormValues) {
    setServerError(null);
    await submitMutation.mutateAsync({
      street_address: values.street_address || null,
      waterway_proximity: values.waterway_proximity,
      area_id: values.area_id,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      contact_number: values.contact_number || null,
      is_unreachable_by_phone: values.is_unreachable_by_phone,
      head_member: {
        birth_date: values.birth_date || null,
        sex: values.sex ?? null,
        is_pwd: values.is_pwd,
        is_pregnant: values.is_pregnant,
        is_lactating: values.is_lactating,
        has_chronic_condition: values.has_chronic_condition,
        chronic_condition_note: values.chronic_condition_note || null,
        is_bedridden: values.is_bedridden,
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Complete your"
        titleAccent="registration"
        description="Just your address and area — this only takes a minute."
      />

      <Card>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-5"
          >
            {serverError ? (
              <p
                role="alert"
                className="border-danger-border bg-danger-bg text-danger rounded-md border p-3 text-sm"
              >
                {serverError}
              </p>
            ) : null}

            {/* ── PSGC address hierarchy — pre-filled, read-only ── */}
            <div className="flex flex-col gap-3">
              <p className="text-body-sm font-semibold text-neutral-700">Address</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="psgc_region" className="text-xs text-neutral-500">
                    Region
                  </Label>
                  <Input
                    id="psgc_region"
                    value="Region IV-A (CALABARZON)"
                    readOnly
                    tabIndex={-1}
                    className="cursor-default bg-neutral-50 text-neutral-500 select-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="psgc_province" className="text-xs text-neutral-500">
                    Province
                  </Label>
                  <Input
                    id="psgc_province"
                    value="Rizal"
                    readOnly
                    tabIndex={-1}
                    className="cursor-default bg-neutral-50 text-neutral-500 select-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="psgc_city" className="text-xs text-neutral-500">
                    City / Municipality
                  </Label>
                  <Input
                    id="psgc_city"
                    value="Rodriguez (Montalban)"
                    readOnly
                    tabIndex={-1}
                    className="cursor-default bg-neutral-50 text-neutral-500 select-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="psgc_barangay" className="text-xs text-neutral-500">
                    Barangay
                  </Label>
                  <Input
                    id="psgc_barangay"
                    value="San Jose"
                    readOnly
                    tabIndex={-1}
                    className="cursor-default bg-neutral-50 text-neutral-500 select-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="street_address">
                  House no. / Street{" "}
                  <span className="font-normal text-neutral-400">(optional)</span>
                </Label>
                <Input
                  id="street_address"
                  type="text"
                  {...register("street_address")}
                  placeholder="e.g. 12 Sampaguita St."
                />
              </div>
            </div>

            {/* ── PROXIMITY FROM A WATERWAY (E.G. RIVERS, CREEKS)? ── */}
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-neutral-50/50 p-4">
              <div className="flex flex-col gap-1">
                <Label className="text-body-sm flex items-center justify-between font-black tracking-wide text-neutral-900 uppercase">
                  <span>
                    PROXIMITY FROM A WATERWAY (E.G. RIVERS, CREEKS)?:{" "}
                    <span className="text-red-500">*</span>
                  </span>
                </Label>
                <p className="font-serif text-sm text-neutral-700 italic">
                  Gaano ka kalapit sa daanan ng tubig (Halimbawa: Ilog, Creek)?
                </p>
              </div>

              <Controller
                control={control}
                name="waterway_proximity"
                render={({ field }) => (
                  <div className="flex flex-col gap-2.5 pt-1">
                    {[
                      {
                        value: "very_near",
                        label:
                          "Very Near: 1 km below (Sobrang Lapit: Isang kilometro pababa)",
                        badge: "High Risk Classification",
                        badgeColor: "bg-red-100 text-red-700 border-red-200",
                      },
                      {
                        value: "near",
                        label: "Near: 1 – 5 km (Malapit: Isa hanggang Limang kilometro)",
                        badge: "Medium Risk Classification",
                        badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
                      },
                      {
                        value: "far",
                        label:
                          "Far: 6 km o higit pa (Malayo: Anim na kilometro o higit pa)",
                        badge: "Low Risk Classification",
                        badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      },
                    ].map((opt) => {
                      const selected = field.value === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all duration-150",
                            selected
                              ? "border-emerald-600 bg-emerald-50/70 shadow-2xs"
                              : "border-neutral-200 bg-white hover:bg-neutral-50",
                          )}
                        >
                          <input
                            type="radio"
                            name="waterway_proximity"
                            value={opt.value}
                            checked={selected}
                            onChange={() => field.onChange(opt.value)}
                            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-emerald-600"
                          />
                          <div className="flex flex-col gap-0.5 text-xs font-medium text-neutral-800">
                            <span className="font-semibold text-neutral-900">
                              {opt.label}
                            </span>
                            <span
                              className={cn(
                                "py-0.2 mt-0.5 w-fit rounded border px-1.5 text-[10px] font-bold",
                                opt.badgeColor,
                              )}
                            >
                              {opt.badge}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {errors.waterway_proximity ? (
                <p className="text-danger text-xs font-semibold">
                  {errors.waterway_proximity.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area_id">Area</Label>
              <Controller
                control={control}
                name="area_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="area_id" className="w-full">
                      <SelectValue placeholder="Select your area" />
                    </SelectTrigger>
                    <SelectContent>
                      {(areas ?? []).map((area) => (
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

            <div className="flex flex-col gap-1.5">
              <Label>Your location</Label>
              <LocationPicker
                value={location}
                onChange={setLocation}
                restrictToBarangay
                onBoundaryViolation={() => {
                  setLocation(null);
                  setValue("area_id", "", { shouldValidate: true });
                  setValue("waterway_proximity", undefined, {
                    shouldValidate: true,
                  });
                  setLocationHint("Choose a pin inside Barangay San Jose.");
                }}
                onResolve={(resolution: PointResolution) => {
                  if (!resolution.within_barangay || !resolution.area_id) {
                    setLocation(null);
                    setValue("area_id", "", { shouldValidate: true });
                    setValue("waterway_proximity", undefined, {
                      shouldValidate: true,
                    });
                    setLocationHint("Choose a pin inside Barangay San Jose.");
                    return;
                  }
                  setValue("area_id", resolution.area_id, { shouldValidate: true });
                  setValue(
                    "waterway_proximity",
                    resolution.waterway_proximity ?? undefined,
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                  const proximityNote = resolution.waterway_proximity
                    ? "Flood proximity was set from the hazard map."
                    : "Select waterway proximity manually because the hazard layer is unavailable.";
                  setLocationHint(
                    `${resolution.area_name} selected. ${proximityNote} Enter the specific house number, street, or subdivision if known.`,
                  );
                }}
              />
              {locationHint ? (
                <p className="text-xs text-neutral-500">{locationHint}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_number">Contact number</Label>
              <Input
                id="contact_number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={!!errors.contact_number}
                aria-describedby={
                  errors.contact_number ? "contact_number-error" : undefined
                }
                {...register("contact_number")}
              />
              {errors.contact_number ? (
                <p id="contact_number-error" className="text-danger text-xs">
                  {errors.contact_number.message}
                </p>
              ) : null}
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
                I don&apos;t have a reliable phone number
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="birth_date">Your birth date</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sex">Sex</Label>
                <Controller
                  control={control}
                  name="sex"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="sex" className="w-full">
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

            <fieldset className="flex flex-col gap-2">
              <legend className="text-body-sm mb-1 font-semibold text-neutral-700">
                Does any of this apply to you?
              </legend>
              {(
                [
                  ["is_pwd", "Person With Disability"],
                  ["is_pregnant", "Pregnant"],
                  ["is_lactating", "Lactating"],
                  ["has_chronic_condition", "Chronic Condition On Regular Medication"],
                  ["is_bedridden", "Bedridden Or Mobility-Limited"],
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

            {hasChronicCondition ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="chronic_condition_note">Condition (optional)</Label>
                <Textarea
                  id="chronic_condition_note"
                  {...register("chronic_condition_note")}
                />
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? "Saving…" : "Finish registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
