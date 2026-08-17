"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Check, Droplets, Home, MapPin, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { FormFieldsSkeleton } from "@/components/common/portal-loading";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { HouseholdMemberRepeater } from "@/components/features/admin/household-member-repeater";
import type { PointResolution } from "@/components/features/registry/location-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  HouseholdCreateBhw,
  HouseholdCreateResponse,
  HouseholdDetailOut,
  HouseholdWorkspaceUpdate,
} from "@/lib/api/registry-types";
import { cn } from "@/lib/utils";
import type { UnregisteredPersonOut } from "@/lib/api/safety-types";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-xl bg-neutral-100" />,
  },
);

interface Area {
  id: string;
  name: string;
  code: string | null;
}

const memberSchema = z.object({
  record_id: z.string().optional(),
  full_name: z.string().trim().min(1, "Enter the member's full name"),
  birth_date: z.string().min(1, "Enter the member's birth date"),
  sex: z.enum(["male", "female"], { message: "Select the member's sex" }),
  contact_number: z.string().optional(),
  relationship_to_head: z.string().min(1, "Select the relationship to the head"),
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
  area_id: z.string().min(1, "Select an area"),
  street_address: z.string().trim().min(1, "Enter the household address"),
  waterway_proximity: z
    .enum(["very_near", "near", "far"], {
      message: "Select the household's proximity to a waterway",
    })
    .optional()
    .refine((value) => Boolean(value), {
      message: "Select the household's proximity to a waterway",
    }),
  head_birth_date: z.string().min(1, "Enter the household head's birthday"),
  head_sex: z
    .enum(["male", "female"], { message: "Select the household head's sex" })
    .optional()
    .refine((value) => Boolean(value), {
      message: "Select the household head's sex",
    }),
  head_is_pwd: z.boolean(),
  head_is_pregnant: z.boolean(),
  head_is_lactating: z.boolean(),
  head_has_chronic_condition: z.boolean(),
  head_is_bedridden: z.boolean(),
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .refine((value) => Boolean(value), {
      message: "Pin the household location on the map",
    }),
  members: z.array(memberSchema),
});

type BhwFormValues = z.infer<typeof bhwFormSchema>;

const emptyValues: BhwFormValues = {
  head_name: "",
  contact_number: "",
  area_id: "",
  street_address: "",
  waterway_proximity: undefined,
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

function toCreateBody(values: BhwFormValues): HouseholdCreateBhw {
  if (!values.location) {
    throw new Error("Pin the household location on the map.");
  }

  return {
    head_name: values.head_name,
    contact_number: values.contact_number || null,
    area_id: values.area_id,
    street_address: values.street_address,
    waterway_proximity: values.waterway_proximity,
    latitude: values.location.lat,
    longitude: values.location.lng,
    head_member: {
      full_name: values.head_name,
      birth_date: values.head_birth_date || null,
      sex: values.head_sex ?? null,
      contact_number: values.contact_number || null,
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
      sex: member.sex,
      contact_number: member.contact_number?.trim() || null,
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
  };
}

function toWorkspaceBody(values: BhwFormValues): HouseholdWorkspaceUpdate {
  const body = toCreateBody(values);
  return {
    ...body,
    is_unreachable_by_phone: !values.contact_number?.trim(),
    head_member: body.head_member,
    members: values.members.map((member) => ({
      ...member,
      id: member.record_id ?? null,
      contact_number: member.contact_number?.trim() || null,
      chronic_condition_note: member.chronic_condition_note || null,
    })),
  };
}

function valuesFromHousehold(household: HouseholdDetailOut): BhwFormValues {
  const head = household.members.find((member) => member.is_head);
  return {
    head_name: household.head_name,
    contact_number: household.contact_number ?? "",
    area_id: household.area_id,
    street_address: household.street_address ?? "",
    waterway_proximity:
      (household.waterway_proximity as BhwFormValues["waterway_proximity"]) ?? undefined,
    head_birth_date: head?.birth_date ?? "",
    head_sex: (head?.sex as BhwFormValues["head_sex"]) ?? undefined,
    head_is_pwd: head?.is_pwd ?? false,
    head_is_pregnant: head?.is_pregnant ?? false,
    head_is_lactating: head?.is_lactating ?? false,
    head_has_chronic_condition: head?.has_chronic_condition ?? false,
    head_is_bedridden: head?.is_bedridden ?? false,
    location: household.location
      ? { lat: household.location.coordinates[1], lng: household.location.coordinates[0] }
      : null,
    members: household.members
      .filter((member) => !member.is_head)
      .map((member) => ({
        record_id: member.id,
        full_name: member.full_name,
        birth_date: member.birth_date ?? "",
        // Older records may not have a sex recorded. Keep it empty so the
        // required field asks staff to correct it rather than inventing data.
        sex: ((member.sex as "male" | "female" | null) ??
          undefined) as BhwFormValues["members"][number]["sex"],
        contact_number: member.contact_number ?? "",
        relationship_to_head: member.relationship_to_head ?? "",
        is_child: member.is_child,
        is_senior: member.is_senior,
        is_pwd: member.is_pwd,
        is_pregnant: member.is_pregnant,
        is_lactating: member.is_lactating,
        has_chronic_condition: member.has_chronic_condition,
        chronic_condition_note: member.chronic_condition_note ?? "",
        is_bedridden: member.is_bedridden,
      })),
  };
}

const WATERWAY_OPTIONS = [
  {
    value: "very_near" as const,
    label: "Very Near",
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

const formFieldClassName =
  "h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20";
const formCheckboxClassName =
  "border-emerald-300 data-checked:border-emerald-600 data-checked:bg-emerald-600 data-checked:text-white focus-visible:ring-emerald-500/30";

const REGISTRATION_STEPS = [
  { id: "details", label: "Household Details", Icon: Home },
  { id: "address", label: "Address and Map Pin", Icon: MapPin },
  { id: "waterway", label: "Waterway Proximity", Icon: Droplets },
  { id: "members", label: "Household Members", Icon: Users },
] as const;

/** FR-REG-002/003/004/024/025 — one BHW-assisted household visit. */
export function HouseholdWorkspace({
  household,
  unregisteredPerson,
}: {
  household?: HouseholdDetailOut;
  unregisteredPerson?: UnregisteredPersonOut;
}) {
  useRequireRole("admin", "bhw");
  const { user } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [locationHint, setLocationHint] = React.useState<string | null>(null);
  const [locationHintIsError, setLocationHintIsError] = React.useState(false);
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<BhwFormValues | null>(null);
  const isEdit = Boolean(household);

  const { data: allAreas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((response) => response.data),
  });

  const areas =
    user?.role === "bhw"
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
  React.useEffect(() => {
    if (household) reset(valuesFromHousehold(household));
    else if (unregisteredPerson) {
      reset({
        ...emptyValues,
        head_name: unregisteredPerson.full_name,
        contact_number: unregisteredPerson.contact_number ?? "",
        head_is_pwd: unregisteredPerson.is_pwd,
        head_is_pregnant: unregisteredPerson.is_pregnant,
        head_is_lactating: unregisteredPerson.is_lactating,
        head_has_chronic_condition: unregisteredPerson.has_chronic_condition,
        head_is_bedridden: unregisteredPerson.is_bedridden,
      });
    }
  }, [household, reset, unregisteredPerson]);
  const watchedValues = useWatch({ control });
  const memberEntries = watchedValues.members ?? [];
  const completedSteps = {
    details: Boolean(
      watchedValues.head_name?.trim() &&
      watchedValues.head_birth_date &&
      watchedValues.head_sex &&
      watchedValues.area_id,
    ),
    address: Boolean(watchedValues.street_address?.trim() && watchedValues.location),
    waterway: Boolean(watchedValues.waterway_proximity),
    members:
      memberEntries.length > 0 &&
      memberEntries.every(
        (member) =>
          Boolean(member.full_name?.trim()) &&
          Boolean(member.birth_date) &&
          Boolean(member.sex) &&
          Boolean(member.relationship_to_head),
      ),
  };

  const submitMutation = useMutation({
    mutationFn: (body: HouseholdCreateBhw | HouseholdWorkspaceUpdate) =>
      (isEdit
        ? api.put<HouseholdDetailOut>(
            `/admin/households/${household?.id}/workspace`,
            body,
          )
        : unregisteredPerson
          ? api.post<HouseholdCreateResponse>("/admin/households/from-unregistered", {
              unregistered_person_id: unregisteredPerson.id,
              area_id: body.area_id,
              street_address: body.street_address,
              waterway_proximity: body.waterway_proximity,
              latitude: body.latitude,
              longitude: body.longitude,
              birth_date: body.head_member.birth_date,
              sex: body.head_member.sex,
              members: body.members,
            })
          : api.post<HouseholdCreateResponse>("/admin/households", body)
      ).then((response) => response.data),
    onSuccess: (result) => {
      setConfirmationOpen(false);
      setPendingValues(null);
      const saved = "household" in result ? result.household : result;
      toast.success(
        isEdit
          ? `Household ${saved.reference_no} updated`
          : `Household ${saved.reference_no} created`,
      );
      if ("duplicate_candidates" in result && result.duplicate_candidates.length > 0) {
        toast.warning(
          `Possible duplicate: ${result.duplicate_candidates[0].head_name} (${result.duplicate_candidates[0].reference_no})`,
        );
      }
      router.push(isEdit ? `/admin/households/${household?.id}` : "/admin/households");
    },
    onError: (error) => {
      setServerError(toDisplayError(error).detail);
    },
  });
  const archiveMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/admin/members/${memberId}`),
    onSuccess: () => toast.success("Citizen archived"),
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  async function onSubmit(values: BhwFormValues) {
    setServerError(null);
    if (!values.location) {
      setServerError("Pin the household location on the map.");
      return;
    }
    setPendingValues(values);
    setConfirmationOpen(true);
  }

  async function confirmCreate() {
    if (!pendingValues) return;
    setServerError(null);
    try {
      await submitMutation.mutateAsync(
        isEdit ? toWorkspaceBody(pendingValues) : toCreateBody(pendingValues),
      );
    } catch {
      // The mutation's onError handler places the API message in the modal.
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28 sm:pb-24">
      <AdminPageHeader
        title={isEdit ? `Edit ${household?.reference_no}` : "Create Household"}
        description={
          isEdit
            ? "Update the household, map location, waterway proximity, and citizen roster in one workspace."
            : unregisteredPerson
              ? `Complete the official household record for ${unregisteredPerson.full_name}. Known contact and support details are prefilled from the emergency record.`
              : "Record a household, its location, waterway proximity, and every known member in one barangay visit."
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4 lg:grid-cols-12 lg:items-start"
      >
        {serverError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 lg:col-span-12"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="space-y-4 lg:col-span-7">
          <Card className="border-neutral-200/90 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Home aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Household Details
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Start with the household head, contact details, and assigned area.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="head_name">
                  Head of Household <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="head_name"
                  aria-invalid={!!errors.head_name}
                  placeholder="Full name"
                  className={formFieldClassName}
                  {...register("head_name")}
                />
                {errors.head_name ? (
                  <p className="text-danger text-xs">{errors.head_name.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="head_birth_date">
                    Birthday <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="head_birth_date"
                    type="date"
                    aria-invalid={!!errors.head_birth_date}
                    className={formFieldClassName}
                    {...register("head_birth_date")}
                  />
                  {errors.head_birth_date ? (
                    <p className="text-danger text-xs">
                      {errors.head_birth_date.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="head_sex">
                    Sex <span className="text-red-600">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="head_sex"
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="head_sex"
                            aria-invalid={!!fieldState.error}
                            className={`${formFieldClassName} w-full`}
                          >
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldState.error ? (
                          <p className="text-danger text-xs">
                            {fieldState.error.message}
                          </p>
                        ) : null}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact_number">
                    Contact Number{" "}
                    <span className="font-normal text-neutral-400">(Optional)</span>
                  </Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    placeholder="09XX XXX XXXX"
                    className={formFieldClassName}
                    {...register("contact_number")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="area_id">
                    Area <span className="text-red-600">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="area_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="area_id"
                          aria-invalid={!!errors.area_id}
                          className={`${formFieldClassName} w-full`}
                        >
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

              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-1 text-sm leading-none font-medium text-neutral-950">
                  Does Any of This Apply to the Head?
                </legend>
                {(
                  [
                    ["head_is_pwd", "PWD"],
                    ["head_is_pregnant", "Pregnant"],
                    ["head_is_lactating", "Lactating"],
                    ["head_has_chronic_condition", "Chronic Condition"],
                    ["head_is_bedridden", "Bedridden / Mobility-Limited"],
                  ] as const
                ).map(([name, label]) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-neutral-700 hover:bg-emerald-50/60"
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
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/80 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <HouseholdMemberRepeater
                control={control}
                onArchiveExisting={
                  isEdit && user?.role === "admin"
                    ? async (memberId) => {
                        await archiveMemberMutation.mutateAsync(memberId);
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:col-span-5 lg:h-fit">
          <Card className="border-neutral-200/90 bg-white">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <MapPin aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Address and Map Pin
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Pin the home to confirm its area, then enter the specific address
                    below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3 text-xs">
                <p className="text-neutral-500">
                  Region{" "}
                  <span className="block pt-0.5 font-semibold text-neutral-800">
                    IV-A (CALABARZON)
                  </span>
                </p>
                <p className="text-neutral-500">
                  Province{" "}
                  <span className="block pt-0.5 font-semibold text-neutral-800">
                    Rizal
                  </span>
                </p>
                <p className="text-neutral-500">
                  City / Municipality{" "}
                  <span className="block pt-0.5 font-semibold text-neutral-800">
                    Rodriguez (Montalban)
                  </span>
                </p>
                <p className="text-neutral-500">
                  Barangay{" "}
                  <span className="block pt-0.5 font-semibold text-neutral-800">
                    San Jose
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>
                  Pin Household Location <span className="text-red-600">*</span>
                </Label>
                <Controller
                  control={control}
                  name="location"
                  render={({ field }) => (
                    <LocationPicker
                      value={field.value}
                      onChange={field.onChange}
                      restrictToBarangay
                      onBoundaryViolation={() => {
                        field.onChange(null);
                        setValue("area_id", "", { shouldValidate: true });
                        setValue("waterway_proximity", undefined, {
                          shouldValidate: true,
                        });
                        setLocationHintIsError(true);
                        setLocationHint("Choose a pin inside Barangay San Jose.");
                      }}
                      onResolve={(resolution: PointResolution) => {
                        if (!resolution.within_barangay || !resolution.area_id) {
                          setValue("area_id", "", { shouldValidate: true });
                          setValue("waterway_proximity", undefined, {
                            shouldValidate: true,
                          });
                          setLocationHintIsError(true);
                          setLocationHint("Choose a pin inside Barangay San Jose.");
                          return;
                        }
                        setLocationHintIsError(false);
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
                          `${resolution.area_name} selected. ${proximityNote} Enter the specific house number, street, or subdivision below.`,
                        );
                      }}
                    />
                  )}
                />
                {errors.location ? (
                  <p className="text-danger text-xs">{errors.location.message}</p>
                ) : null}
                {locationHint ? (
                  <p
                    role={locationHintIsError ? "alert" : undefined}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      locationHintIsError
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-sky-100 bg-sky-50 text-sky-800",
                    )}
                  >
                    {locationHint}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="street_address">
                  House No. / Street / Subdivision <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="street_address"
                  aria-invalid={!!errors.street_address}
                  className={formFieldClassName}
                  {...register("street_address")}
                  placeholder="e.g. 12, Sampaguita St., Greenview Subdivision"
                />
                {errors.street_address ? (
                  <p className="text-danger text-xs">{errors.street_address.message}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/70">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start gap-3 border-b border-sky-100 pb-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                  <Droplets aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Waterway Proximity <span className="text-red-600">*</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Set from the flood hazard map after pinning; adjust if field
                    observation differs.
                  </p>
                </div>
              </div>

              <Controller
                control={control}
                name="waterway_proximity"
                render={({ field }) => (
                  <div className="space-y-2">
                    {WATERWAY_OPTIONS.map((option) => {
                      const selected = field.value === option.value;
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                            option.tone,
                            selected ? option.selectedTone : "hover:border-neutral-300",
                          )}
                        >
                          <input
                            type="radio"
                            name="waterway_proximity"
                            value={option.value}
                            checked={selected}
                            onChange={() => field.onChange(option.value)}
                            className="size-4 shrink-0 accent-emerald-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-neutral-900">
                              {option.label}
                            </span>
                            <span className="block text-[11px] text-neutral-600">
                              {option.description}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full border border-current/20 bg-white/70 px-2 py-1 text-[10px] font-bold">
                            {option.risk}
                          </span>
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
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t border-neutral-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:left-64 xl:px-8">
          <nav
            aria-label="Registration progress"
            className="min-w-0 flex-1 overflow-x-auto pb-0.5"
          >
            <ol className="flex min-w-max items-center gap-2">
              {REGISTRATION_STEPS.map((step, index) => {
                const complete = completedSteps[step.id];
                const Icon = step.Icon;
                return (
                  <React.Fragment key={step.id}>
                    <li
                      aria-label={`${step.label}: ${complete ? "complete" : "not complete"}`}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors",
                        complete ? "text-emerald-800" : "text-neutral-500",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all",
                          complete
                            ? "border-emerald-500 bg-emerald-600 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
                            : "border-neutral-300 bg-neutral-50 text-neutral-400",
                        )}
                      >
                        {complete ? (
                          <Check aria-hidden className="size-3.5 stroke-[3]" />
                        ) : (
                          <Icon aria-hidden className="size-3.5" />
                        )}
                      </span>
                      <span className="whitespace-nowrap">{step.label}</span>
                    </li>
                    {index < REGISTRATION_STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className={cn(
                          "h-px w-4 shrink-0 transition-colors",
                          complete ? "bg-emerald-300" : "bg-neutral-200",
                        )}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </ol>
          </nav>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/households")}
              className="rounded-xl border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
              onClick={() => reset(emptyValues)}
              className="rounded-xl"
            >
              {isEdit ? "Reset changes" : "Clear form"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || submitMutation.isPending}
              className="rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              {isSubmitting || submitMutation.isPending
                ? isEdit
                  ? "Saving changes…"
                  : "Creating household…"
                : isEdit
                  ? "Save changes"
                  : "Create household"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!submitMutation.isPending) setConfirmationOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Confirm household changes" : "Confirm household registration"}
            </DialogTitle>
            <DialogDescription>
              Review the visit details before saving. The household head and every added
              member will be registered as citizens.
            </DialogDescription>
          </DialogHeader>

          {pendingValues ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Head of Household
                  </p>
                  <p className="mt-1 font-bold text-neutral-900">
                    {pendingValues.head_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Area
                  </p>
                  <p className="mt-1 font-bold text-neutral-900">
                    {areas.find((area) => area.id === pendingValues.area_id)?.name ??
                      "Selected area"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Address
                  </p>
                  <p className="mt-1 text-neutral-800">{pendingValues.street_address}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Registered Citizens
                  </p>
                  <p className="mt-1 font-bold text-neutral-900">
                    {pendingValues.members.length + 1}
                  </p>
                </div>
              </div>
              <p className="border-t border-emerald-200/70 pt-3 text-xs leading-relaxed text-neutral-600">
                Possible duplicate household records are checked during save. If a match
                is found, the new record will be marked{" "}
                <span className="font-bold text-amber-700">Possible Duplicate</span> in
                the household list for follow-up.
              </p>
            </div>
          ) : null}

          {serverError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {serverError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmationOpen(false)}
              disabled={submitMutation.isPending}
            >
              Go back
            </Button>
            <Button
              type="button"
              onClick={confirmCreate}
              disabled={submitMutation.isPending}
              className="bg-emerald-600 font-bold hover:bg-emerald-700"
            >
              {submitMutation.isPending
                ? "Saving household…"
                : isEdit
                  ? "Confirm changes"
                  : "Confirm and create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewHouseholdPage() {
  const searchParams = useSearchParams();
  const unregisteredId = searchParams.get("from_unregistered");
  const personQuery = useQuery({
    queryKey: ["admin", "unregistered-person", unregisteredId],
    queryFn: () =>
      api
        .get<UnregisteredPersonOut>(`/admin/unregistered-persons/${unregisteredId}`)
        .then((response) => response.data),
    enabled: Boolean(unregisteredId),
  });
  if (unregisteredId && personQuery.isFetching)
    return (
      <FormFieldsSkeleton
        label="Loading emergency record for household registration"
        fields={8}
      />
    );
  if (unregisteredId && personQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-red-700">
          The unregistered-person record could not be loaded.
        </CardContent>
      </Card>
    );
  }
  return <HouseholdWorkspace unregisteredPerson={personQuery.data} />;
}
