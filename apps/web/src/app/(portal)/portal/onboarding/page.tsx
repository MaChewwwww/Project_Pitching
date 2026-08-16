"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Droplets,
  Info,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { LogoLockup } from "@/components/common/logo";
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
import { useAuth } from "@/lib/auth/auth-context";
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
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-500">
        Loading map picker…
      </div>
    ),
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
    area_id: z.string().min(1, "Pumili ng inyong area / purok sa San Jose"),
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
    if (!values.is_unreachable_by_phone && !values.contact_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Maglagay ng contact number, o piliin ang “Wala akong regular na numero ng telepono”",
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

const WATERWAY_OPTIONS = [
  {
    value: "very_near" as const,
    label: "Very Near: 1 km below",
    tagalogLabel: "Sobrang Lapit: Isang kilometro pababa",
    description: "Within 1 km of a river, creek, or main water channel",
    risk: "High Risk Classification",
    badgeTone: "bg-red-100 text-red-700 border-red-200",
    cardTone: "border-red-200/80 bg-red-50/30 hover:bg-red-50/70",
    selectedTone: "border-red-500 bg-red-50/90 ring-2 ring-red-500/20 shadow-xs",
  },
  {
    value: "near" as const,
    label: "Near: 1 – 5 km",
    tagalogLabel: "Malapit: Isa hanggang Limang kilometro",
    description: "About 1 to 5 km from the nearest active waterway",
    risk: "Medium Risk Classification",
    badgeTone: "bg-amber-100 text-amber-700 border-amber-200",
    cardTone: "border-amber-200/80 bg-amber-50/30 hover:bg-amber-50/70",
    selectedTone: "border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/20 shadow-xs",
  },
  {
    value: "far" as const,
    label: "Far: 6 km o higit pa",
    tagalogLabel: "Malayo: Anim na kilometro o higit pa",
    description: "More than 6 km away from rivers or major waterways",
    risk: "Low Risk Classification",
    badgeTone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cardTone: "border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/70",
    selectedTone: "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/20 shadow-xs",
  },
] as const;

const formFieldClassName =
  "h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20";
const formCheckboxClassName =
  "border-emerald-300 data-checked:border-emerald-600 data-checked:bg-emerald-600 data-checked:text-white focus-visible:ring-emerald-500/30";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [location, setLocation] = React.useState<LatLng | null>(null);
  const [locationHint, setLocationHint] = React.useState<string | null>(null);
  const [locationHintIsError, setLocationHintIsError] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isAutoDetectedArea, setIsAutoDetectedArea] = React.useState(false);
  const [isAutoDetectedProximity, setIsAutoDetectedProximity] = React.useState(false);

  const { data: areas } = useQuery({
    queryKey: ["public", "areas"],
    queryFn: () => api.get<PublicArea[]>("/public/areas").then((r) => r.data),
  });

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: emptyValues,
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const watchedValues = useWatch({ control });
  const hasChronicCondition = watchedValues.has_chronic_condition;
  const isUnreachableByPhone = watchedValues.is_unreachable_by_phone;

  const submitMutation = useMutation({
    mutationFn: (body: HouseholdCreateSelf) =>
      api.post<HouseholdCreateResponse>("/me/household", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Household registered successfully!");
      router.push("/portal");
    },
    onError: (error) => {
      setServerError(toDisplayError(error).detail);
    },
  });

  async function onSubmit(values: OnboardingFormValues) {
    setServerError(null);
    await submitMutation.mutateAsync({
      street_address: values.street_address?.trim() || null,
      waterway_proximity: values.waterway_proximity,
      area_id: values.area_id,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      contact_number: values.is_unreachable_by_phone
        ? null
        : values.contact_number?.trim() || null,
      is_unreachable_by_phone: values.is_unreachable_by_phone,
      head_member: {
        birth_date: values.birth_date || null,
        sex: values.sex ?? null,
        is_pwd: values.is_pwd,
        is_pregnant: values.is_pregnant,
        is_lactating: values.is_lactating,
        has_chronic_condition: values.has_chronic_condition,
        chronic_condition_note: values.has_chronic_condition
          ? values.chronic_condition_note?.trim() || null
          : null,
        is_bedridden: values.is_bedridden,
      },
    });
  }

  const completedSteps = {
    location: Boolean(location && watchedValues.area_id),
    waterway: Boolean(watchedValues.waterway_proximity),
    contact: Boolean(
      (watchedValues.is_unreachable_by_phone || watchedValues.contact_number?.trim()) &&
        Boolean(watchedValues.birth_date || watchedValues.sex),
    ),
  };

  const selectedAreaName =
    areas?.find((a) => a.id === watchedValues.area_id)?.name ?? null;

  return (
    <div className="min-h-screen bg-[#f7faf7] text-neutral-950 flex flex-col">
      {/* ── Top Navigation Header with Brand & Sign Out ── */}
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoLockup size={32} />
            <span className="hidden h-5 w-px bg-neutral-200 sm:inline-block" />
            <span className="hidden rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-emerald-800 uppercase sm:inline-block">
              Resident Portal Setup
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden items-center gap-2.5 rounded-full border border-emerald-100 bg-emerald-50/60 py-1 pr-3 pl-1.5 text-xs sm:flex">
                <span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-xs">
                  {user.full_name?.trim().charAt(0).toUpperCase() || "U"}
                </span>
                <div className="text-left">
                  <span className="block max-w-36 truncate font-bold text-neutral-800 leading-none">
                    {user.full_name}
                  </span>
                  <span className="block max-w-36 truncate text-[10px] text-neutral-500 leading-tight">
                    {user.email}
                  </span>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              className="rounded-xl border-neutral-200 text-neutral-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="size-3.5" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">
          {/* ── Hero Banner ── */}
          <section className="relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 p-6 shadow-xs sm:rounded-3xl sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-12 -right-12 size-56 rounded-full bg-emerald-500/10 blur-3xl"
            />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 shadow-xs">
                <Sparkles className="size-3.5 text-emerald-700" />
                <span>Barangay San Jose · Resident Portal</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
                Complete Your <span className="text-emerald-700">Registration</span>
              </h1>
              <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-neutral-600">
                Pin your home location on the map to automatically detect your area and
                flood hazard waterway proximity. These details help Barangay San Jose coordinate
                emergency alerts, evacuation support, and family readiness.
              </p>

              {/* Progress Step Pills */}
              <div className="mt-2 flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-950/5">
                {[
                  {
                    id: "location",
                    label: "1. Address & Map Pin",
                    complete: completedSteps.location,
                  },
                  {
                    id: "waterway",
                    label: "2. Waterway Proximity",
                    complete: completedSteps.waterway,
                  },
                  {
                    id: "contact",
                    label: "3. Contact & Profile",
                    complete: completedSteps.contact,
                  },
                ].map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                      step.complete
                        ? "border border-emerald-300 bg-emerald-100/90 text-emerald-900 shadow-xs"
                        : "border border-neutral-200 bg-white/80 text-neutral-500",
                    )}
                  >
                    {step.complete ? (
                      <Check className="size-3.5 text-emerald-700 stroke-[3]" />
                    ) : (
                      <span className="size-2 rounded-full bg-neutral-300" />
                    )}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {serverError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          ) : null}

          {/* ── Form Grid ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="grid gap-6 lg:grid-cols-12 lg:items-start"
          >
            {/* ── Left Column: Address & Map Location (Auto-detection) ── */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card 1: Address & Map Location */}
              <Card className="border-neutral-200/90 bg-white shadow-xs">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                        <MapPin aria-hidden className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-neutral-950">
                          Address and Map Pin
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          Pin your home on the map to automatically detect your area and
                          hazard proximity.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PSGC Hierarchy Display */}
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Region
                      </span>
                      <p className="font-bold text-neutral-800">IV-A (CALABARZON)</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Province
                      </span>
                      <p className="font-bold text-neutral-800">Rizal</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        City / Municipality
                      </span>
                      <p className="font-bold text-neutral-800">Rodriguez (Montalban)</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Barangay
                      </span>
                      <p className="font-bold text-emerald-800">San Jose</p>
                    </div>
                  </div>

                  {/* Interactive Map Picker */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        Pin Household Location <span className="text-red-600">*</span>
                      </Label>
                      {location ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="size-3.5" />
                          Pin placed ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                        </span>
                      ) : null}
                    </div>

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
                        setIsAutoDetectedArea(false);
                        setIsAutoDetectedProximity(false);
                        setLocationHintIsError(true);
                        setLocationHint(
                          "Pumili ng lokasyon sa loob ng Barangay San Jose.",
                        );
                      }}
                      onResolve={(resolution: PointResolution) => {
                        if (!resolution.within_barangay || !resolution.area_id) {
                          setValue("area_id", "", { shouldValidate: true });
                          setValue("waterway_proximity", undefined, {
                            shouldValidate: true,
                          });
                          setIsAutoDetectedArea(false);
                          setIsAutoDetectedProximity(false);
                          setLocationHintIsError(true);
                          setLocationHint(
                            "Pumili ng lokasyon sa loob ng Barangay San Jose.",
                          );
                          return;
                        }
                        setLocationHintIsError(false);
                        setValue("area_id", resolution.area_id, {
                          shouldValidate: true,
                        });
                        setIsAutoDetectedArea(true);

                        if (resolution.waterway_proximity) {
                          setValue(
                            "waterway_proximity",
                            resolution.waterway_proximity,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                          setIsAutoDetectedProximity(true);
                        } else {
                          setIsAutoDetectedProximity(false);
                        }

                        const proximityNote = resolution.waterway_proximity
                          ? "Flood proximity was automatically detected from the official hazard map."
                          : "Select waterway proximity manually because the hazard layer is unavailable.";
                        setLocationHint(
                          `${resolution.area_name} selected. ${proximityNote} Enter your specific house number or street below if known.`,
                        );
                      }}
                    />

                    {locationHint ? (
                      <div
                        role={locationHintIsError ? "alert" : undefined}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed",
                          locationHintIsError
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-sky-200 bg-sky-50 text-sky-800",
                        )}
                      >
                        {locationHintIsError ? (
                          <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                        ) : (
                          <Info className="size-4 shrink-0 text-sky-600 mt-0.5" />
                        )}
                        <span>{locationHint}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Area Selection with Auto-detection Indicator */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="area_id" className="text-xs font-bold text-neutral-800">
                        Area / Purok <span className="text-red-600">*</span>
                      </Label>
                      {isAutoDetectedArea && selectedAreaName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Zap className="size-3 text-emerald-600" />
                          Auto-detected
                        </span>
                      ) : null}
                    </div>
                    <Controller
                      control={control}
                      name="area_id"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setIsAutoDetectedArea(false);
                          }}
                        >
                          <SelectTrigger
                            id="area_id"
                            aria-invalid={!!errors.area_id}
                            className={`${formFieldClassName} w-full`}
                          >
                            <SelectValue placeholder="Pumili ng area / purok" />
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

                  {/* Specific Street Address Input */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="street_address" className="text-xs font-bold text-neutral-800">
                      House No. / Street / Subdivision{" "}
                      <span className="font-normal text-neutral-400">(Optional)</span>
                    </Label>
                    <Input
                      id="street_address"
                      type="text"
                      className={formFieldClassName}
                      {...register("street_address")}
                      placeholder="Halimbawa: 12 Sampaguita St., Phase 2, Greenview"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Contact Details & Head Profile */}
              <Card className="border-neutral-200/90 bg-white shadow-xs">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                      <Phone aria-hidden className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-neutral-950">
                        Contact and Personal Details
                      </h2>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Required for urgent barangay emergency notifications and verification.
                      </p>
                    </div>
                  </div>

                  {/* Contact Number */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-800">
                      Contact Number {!isUnreachableByPhone ? <span className="text-red-600">*</span> : null}
                    </Label>
                    <Input
                      id="contact_number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      disabled={isUnreachableByPhone}
                      aria-invalid={!!errors.contact_number}
                      placeholder="09XX XXX XXXX"
                      className={cn(
                        formFieldClassName,
                        isUnreachableByPhone && "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                      )}
                      {...register("contact_number")}
                    />
                    {errors.contact_number ? (
                      <p className="text-danger text-xs">{errors.contact_number.message}</p>
                    ) : null}
                  </div>

                  {/* Unreachable by phone checkbox */}
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/50 p-3">
                    <Controller
                      control={control}
                      name="is_unreachable_by_phone"
                      render={({ field }) => (
                        <Checkbox
                          id="is_unreachable_by_phone"
                          className={formCheckboxClassName}
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              setValue("contact_number", "", { shouldValidate: true });
                            }
                          }}
                        />
                      )}
                    />
                    <Label
                      htmlFor="is_unreachable_by_phone"
                      className="cursor-pointer text-xs font-medium text-neutral-700"
                    >
                      Wala akong regular na numero ng telepono (Unreachable by phone)
                    </Label>
                  </div>

                  {/* Birthday & Sex Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="birth_date" className="text-xs font-bold text-neutral-800">
                        Birthday <span className="font-normal text-neutral-400">(Optional)</span>
                      </Label>
                      <Input
                        id="birth_date"
                        type="date"
                        className={formFieldClassName}
                        {...register("birth_date")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sex" className="text-xs font-bold text-neutral-800">
                        Kasarian (Sex) <span className="font-normal text-neutral-400">(Optional)</span>
                      </Label>
                      <Controller
                        control={control}
                        name="sex"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger id="sex" className={`${formFieldClassName} w-full`}>
                              <SelectValue placeholder="Piliin ang kasarian" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male (Lalaki)</SelectItem>
                              <SelectItem value="female">Female (Babae)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Right Column: Waterway Proximity, Vulnerabilities, & Submission ── */}
            <div className="space-y-6 lg:col-span-5">
              {/* Card 3: Waterway Proximity with Auto-Detection */}
              <Card className="border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/40 shadow-xs">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                        <Droplets aria-hidden className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-neutral-950">
                            Waterway Proximity <span className="text-red-600">*</span>
                          </h2>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500 italic">
                          Gaano ka kalapit sa daanan ng tubig (Ilog, Creek)?
                        </p>
                      </div>
                    </div>
                  </div>

                  {isAutoDetectedProximity ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      <Zap className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Auto-detected from official hazard flood map</span>
                    </div>
                  ) : null}

                  <Controller
                    control={control}
                    name="waterway_proximity"
                    render={({ field }) => (
                      <div className="space-y-2.5">
                        {WATERWAY_OPTIONS.map((opt) => {
                          const selected = field.value === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-150",
                                opt.cardTone,
                                selected ? opt.selectedTone : "border-neutral-200 bg-white hover:bg-neutral-50/80",
                              )}
                            >
                              <input
                                type="radio"
                                name="waterway_proximity"
                                value={opt.value}
                                checked={selected}
                                onChange={() => {
                                  field.onChange(opt.value);
                                  setIsAutoDetectedProximity(false);
                                }}
                                className="mt-1 size-4 shrink-0 cursor-pointer accent-emerald-600"
                              />
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-neutral-900">
                                    {opt.label}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight",
                                      opt.badgeTone,
                                    )}
                                  >
                                    {opt.risk}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-neutral-600">
                                  {opt.tagalogLabel}
                                </p>
                                <p className="text-[10px] text-neutral-500">
                                  {opt.description}
                                </p>
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
                </CardContent>
              </Card>

              {/* Card 4: Health and Special Needs / Vulnerabilities */}
              <Card className="border-neutral-200/90 bg-white shadow-xs">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                      <ShieldCheck aria-hidden className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-neutral-950">
                        Health & Special Needs
                      </h2>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Does any of this apply to you as the household head?
                      </p>
                    </div>
                  </div>

                  <fieldset className="space-y-2">
                    {(
                      [
                        ["is_pwd", "Person With Disability (PWD)"],
                        ["is_pregnant", "Pregnant (Buntis)"],
                        ["is_lactating", "Lactating Mother (Nagpapasuso)"],
                        ["has_chronic_condition", "Chronic Condition / Maintenance Medicine"],
                        ["is_bedridden", "Bedridden or Mobility-Limited"],
                      ] as const
                    ).map(([name, label]) => (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-neutral-200/80 bg-white p-2.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-emerald-50/50"
                      >
                        <Controller
                          control={control}
                          name={name}
                          render={({ field }) => (
                            <Checkbox
                              id={name}
                              className={formCheckboxClassName}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <span className="select-none">{label}</span>
                      </label>
                    ))}
                  </fieldset>

                  {hasChronicCondition ? (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-100">
                      <Label htmlFor="chronic_condition_note" className="text-xs font-bold text-neutral-800">
                        Condition or Medication Note{" "}
                        <span className="font-normal text-neutral-400">(Optional)</span>
                      </Label>
                      <Textarea
                        id="chronic_condition_note"
                        placeholder="Halimbawa: Hypertension (Maintenance), Diabetes..."
                        className="text-xs min-h-[70px] rounded-lg border-emerald-200/80"
                        {...register("chronic_condition_note")}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Card 5: Action & Submission */}
              <Card className="border-emerald-300/80 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-md">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Ready to activate?</h3>
                    <p className="text-xs text-emerald-200 leading-relaxed">
                      You can register more family members and view evacuation centers once inside your portal.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || submitMutation.isPending}
                    className="w-full h-11 rounded-xl bg-white font-bold text-emerald-950 shadow-md hover:bg-emerald-50 hover:text-emerald-900 text-sm transition-all"
                  >
                    {isSubmitting || submitMutation.isPending
                      ? "Saving household profile…"
                      : "Complete Registration"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

