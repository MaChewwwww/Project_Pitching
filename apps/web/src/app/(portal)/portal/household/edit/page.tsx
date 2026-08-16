"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Edit2,
  Home,
  Info,
  MapPin,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
  Waves,
  Zap,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
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
import { HouseholdMemberDialog } from "@/components/features/portal/household-member-dialog";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { PublicArea } from "@/lib/api/public-types";
import type {
  HouseholdDetailOut,
  HouseholdUpdate,
  MemberOut,
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
      <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-neutral-100 text-xs text-neutral-500 font-medium">
        Loading interactive map picker…
      </div>
    ),
  },
);

const WATERWAY_OPTIONS = [
  {
    value: "very_near" as const,
    label: "Very Near: < 1 km",
    tagalogLabel: "Sobrang Lapit (1 km pababa)",
    description: "Within 1 km of river, creek, or drainage channel",
    risk: "High Risk",
    badgeTone: "bg-red-100 text-red-700 border-red-200",
    cardTone: "border-red-200/80 bg-red-50/20 hover:bg-red-50/60",
    selectedTone: "border-red-500 bg-red-50/80 ring-2 ring-red-500/20 shadow-2xs",
  },
  {
    value: "near" as const,
    label: "Near: 1 – 5 km",
    tagalogLabel: "Malapit (1 hanggang 5 km)",
    description: "About 1 to 5 km from nearest active waterway",
    risk: "Medium Risk",
    badgeTone: "bg-amber-100 text-amber-700 border-amber-200",
    cardTone: "border-amber-200/80 bg-amber-50/20 hover:bg-amber-50/60",
    selectedTone: "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-2xs",
  },
  {
    value: "far" as const,
    label: "Far: 6 km or more",
    tagalogLabel: "Malayo (6 km o higit pa)",
    description: "More than 6 km away from active waterways",
    risk: "Low Risk",
    badgeTone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cardTone: "border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/60",
    selectedTone: "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-2xs",
  },
] as const;

const editSchema = z.object({
  head_name: z.string().trim().min(1, "Head of household name is required"),
  contact_number: z.string().trim().min(1, "Contact number is required"),
  area_id: z.string().min(1, "Please select an Area / Purok in San Jose"),
  street_address: z.string().trim().min(1, "Please enter your house no. and street"),
  waterway_proximity: z
    .enum(["very_near", "near", "far"])
    .optional()
    .nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

function computeAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split("-");
  if (parts.length === 3) {
    const birthYear = parseInt(parts[0], 10);
    if (!Number.isNaN(birthYear)) {
      const currentYear = 2026;
      return Math.max(0, currentYear - birthYear);
    }
  }
  return null;
}

export default function PortalHouseholdEditPage() {
  useRequireRole("head");
  const router = useRouter();
  const client = useQueryClient();

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<MemberOut | null>(null);
  const [memberToDelete, setMemberToDelete] = React.useState<MemberOut | null>(null);

  const [locationHint, setLocationHint] = React.useState<string | null>(null);
  const [locationHintIsError, setLocationHintIsError] = React.useState(false);
  const [isAutoDetectedArea, setIsAutoDetectedArea] = React.useState(false);
  const [isAutoDetectedProximity, setIsAutoDetectedProximity] = React.useState(false);

  const householdQuery = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });

  const areasQuery = useQuery({
    queryKey: ["public", "areas"],
    queryFn: () => api.get<PublicArea[]>("/public/areas").then((r) => r.data),
  });

  const household = householdQuery.data;

  const initialLocation: LatLng | null = React.useMemo(() => {
    if (household?.location?.coordinates && household.location.coordinates.length === 2) {
      return {
        lat: household.location.coordinates[1],
        lng: household.location.coordinates[0],
      };
    }
    return null;
  }, [household]);

  const [customLocation, setCustomLocation] = React.useState<LatLng | null>(null);
  const location = customLocation ?? initialLocation;
  const setLocation = setCustomLocation;

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: household
      ? {
          head_name: household.head_name || "",
          contact_number: household.contact_number || "",
          area_id: household.area_id || "",
          street_address: household.street_address || "",
          waterway_proximity:
            (household.waterway_proximity as EditFormValues["waterway_proximity"]) ?? null,
        }
      : undefined,
    defaultValues: {
      head_name: "",
      contact_number: "",
      area_id: "",
      street_address: "",
      waterway_proximity: null,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const watchedValues = useWatch({ control });

  const updateHouseholdMutation = useMutation({
    mutationFn: (body: HouseholdUpdate) => api.patch("/me/household", body),
    onSuccess: () => {
      toast.success("Household details and coordinates updated successfully!");
      client.invalidateQueries({ queryKey: ["me", "household"] });
      client.invalidateQueries({ queryKey: ["me", "safety"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to update household");
    },
  });

  const deleteMember = useMutation({
    mutationFn: (memberId: string) => api.delete(`/me/household/members/${memberId}`),
    onSuccess: () => {
      toast.success("Member removed from household");
      setMemberToDelete(null);
      client.invalidateQueries({ queryKey: ["me", "household"] });
      client.invalidateQueries({ queryKey: ["me", "safety"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Could not remove member");
    },
  });

  async function onSaveHousehold(values: EditFormValues) {
    await updateHouseholdMutation.mutateAsync({
      head_name: values.head_name.trim() || null,
      contact_number: values.contact_number.trim(),
      is_unreachable_by_phone: false,
      area_id: values.area_id,
      street_address: values.street_address.trim(),
      waterway_proximity: values.waterway_proximity ?? null,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
    });
  }

  const handleOpenAddMember = () => {
    setSelectedMember(null);
    setMemberDialogOpen(true);
  };

  const handleOpenEditMember = (m: MemberOut) => {
    setSelectedMember(m);
    setMemberDialogOpen(true);
  };

  if (householdQuery.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-emerald-100/40" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-[650px] rounded-3xl bg-slate-100" />
          <div className="lg:col-span-5 h-[650px] rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600 shadow-xs">
        Complete onboarding before editing your household.
      </div>
    );
  }

  const members = household.members || [];
  const selectedAreaName =
    areasQuery.data?.find((a) => a.id === watchedValues.area_id)?.name ?? null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header (No "Back to Household" link per specification) ── */}
      <PortalPageHeader
        icon={Pencil}
        title="Edit Household"
        titleAccent="Details & Members"
        description="Update your address, pinpoint coordinates on the map, and manage household members for emergency records."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-neutral-300 bg-white px-4 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50"
            >
              <Link href="/portal/household">
                <Home aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>View Household</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              <Link href="/portal/hazard-map">
                <Waves aria-hidden className="size-3.5 stroke-[2.5]" />
                <span>Flood Hazard Map</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Form Container wrapping whole 2-column layout & bottom action bar ── */}
      <form
        onSubmit={handleSubmit(onSaveHousehold)}
        noValidate
        className="space-y-6 sm:space-y-8"
      >
        {/* ── 2-Column Responsive Layout (Mirrors /portal/household & /portal/onboarding) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* ── Left Column: Household Details & Interactive Map Location (7 cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Address & Location Form */}
            <Card className="rounded-3xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden">
              <CardContent className="p-5 sm:p-6 lg:p-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
                      <MapPin className="size-4.5" />
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-neutral-900">
                        Address and Map Pin
                      </h2>
                      <p className="text-xs text-neutral-500 font-normal">
                        Drag the pin to automatically detect your area and flood proximity.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-200/90 px-3.5 py-1 rounded-full shadow-2xs">
                    <Sparkles className="size-3 text-emerald-600" />
                    <span>Ref #{household.reference_no}</span>
                  </span>
                </div>

                {/* PSGC Hierarchy Banner (from Onboarding reference) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-3.5 text-xs">
                  <div>
                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Region
                    </span>
                    <p className="font-bold text-neutral-800">IV-A (CALABARZON)</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Province
                    </span>
                    <p className="font-bold text-neutral-800">Rizal</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Municipality
                    </span>
                    <p className="font-bold text-neutral-800">Rodriguez</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Barangay
                    </span>
                    <p className="font-bold text-emerald-800">San Jose</p>
                  </div>
                </div>

                {/* Interactive Location Picker Map */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                      Household Coordinates <span className="text-red-600">*</span>
                    </Label>
                    {location ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        Pin placed ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                      </span>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-neutral-200/90 shadow-2xs">
                    <LocationPicker
                      value={location}
                      onChange={setLocation}
                      restrictToBarangay
                      onBoundaryViolation={() => {
                        setLocation(null);
                        setValue("area_id", "", { shouldValidate: true });
                        setValue("waterway_proximity", null, { shouldValidate: true });
                        setIsAutoDetectedArea(false);
                        setIsAutoDetectedProximity(false);
                        setLocationHintIsError(true);
                        setLocationHint(
                          "Please choose a location within the Barangay San Jose boundary.",
                        );
                      }}
                      onResolve={(resolution: PointResolution) => {
                        if (!resolution.within_barangay || !resolution.area_id) {
                          setValue("area_id", "", { shouldValidate: true });
                          setValue("waterway_proximity", null, { shouldValidate: true });
                          setIsAutoDetectedArea(false);
                          setIsAutoDetectedProximity(false);
                          setLocationHintIsError(true);
                          setLocationHint(
                            "Selected coordinates are outside the Barangay San Jose boundary.",
                          );
                          return;
                        }

                        setLocationHintIsError(false);
                        setValue("area_id", resolution.area_id, { shouldValidate: true });
                        setIsAutoDetectedArea(true);

                        if (resolution.waterway_proximity) {
                          setValue(
                            "waterway_proximity",
                            resolution.waterway_proximity as EditFormValues["waterway_proximity"],
                            { shouldValidate: true, shouldDirty: true },
                          );
                          setIsAutoDetectedProximity(true);
                        } else {
                          setIsAutoDetectedProximity(false);
                        }

                        const proximityNote = resolution.waterway_proximity
                          ? "Waterway proximity auto-detected from the hazard map."
                          : "Select proximity manually below.";
                        setLocationHint(
                          `${resolution.area_name} selected. ${proximityNote}`,
                        );
                      }}
                      caption="Drag and position the pin precisely over your rooftop."
                    />
                  </div>

                  {locationHint ? (
                    <div
                      role={locationHintIsError ? "alert" : undefined}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed font-medium",
                        locationHintIsError
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-emerald-200 bg-emerald-50/80 text-emerald-900",
                      )}
                    >
                      {locationHintIsError ? (
                        <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                      ) : (
                        <Info className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                      )}
                      <span>{locationHint}</span>
                    </div>
                  ) : null}
                </div>

                {/* Area Selection with Auto-detection Indicator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="area_id" className="text-xs font-bold text-neutral-800">
                        Area / Purok <span className="text-red-600">*</span>
                      </Label>
                      {isAutoDetectedArea && selectedAreaName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[9.5px] font-bold text-emerald-800">
                          <Zap className="size-2.5 text-emerald-600" />
                          Auto-detected
                        </span>
                      ) : null}
                    </div>
                    <Controller
                      control={control}
                      name="area_id"
                      render={({ field }) => (
                        <Select
                          value={field.value || undefined}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setIsAutoDetectedArea(false);
                          }}
                        >
                          <SelectTrigger
                            id="area_id"
                            aria-invalid={!!errors.area_id}
                            className="h-10 w-full rounded-xl border-neutral-200/90 bg-white text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <SelectValue placeholder="Select Area / Purok" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 rounded-xl">
                            {(areasQuery.data ?? []).map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.area_id ? (
                      <p className="text-red-600 text-xs font-medium">{errors.area_id.message}</p>
                    ) : null}
                  </div>

                  {/* Contact Number */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-800">
                      Contact Number <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="contact_number"
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      className="h-10 rounded-xl border-neutral-200/90 bg-white text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      {...register("contact_number")}
                    />
                    {errors.contact_number ? (
                      <p className="text-red-600 text-xs font-medium">{errors.contact_number.message}</p>
                    ) : null}
                  </div>
                </div>

                {/* Street Address */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="street_address" className="text-xs font-bold text-neutral-800">
                    House No. / Street Address / Subdivision <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="street_address"
                    type="text"
                    placeholder="e.g. Block 33 Lot 8b Kasiglahan Village"
                    className="h-10 rounded-xl border-neutral-200/90 bg-white text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    {...register("street_address")}
                  />
                  {errors.street_address ? (
                    <p className="text-red-600 text-xs font-medium">{errors.street_address.message}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column: Registered Members & Compact Waterway Proximity (5 cols) ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Members Management */}
            <Card className="rounded-3xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden">
              <CardContent className="p-5 sm:p-6 lg:p-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
                      <UsersRound className="size-4.5" />
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-neutral-900">
                        Members ({members.length})
                      </h2>
                      <p className="text-xs text-neutral-500 font-normal">
                        Support flags & demographics
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAddMember}
                    className="h-8.5 cursor-pointer gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
                  >
                    <Plus aria-hidden className="size-3.5 stroke-[2.5]" />
                    <span>Add Member</span>
                  </Button>
                </div>

                {/* Members List */}
                <div className="space-y-3.5">
                  {members.map((member) => {
                    const age = computeAge(member.birth_date);
                    const isHead = Boolean(member.is_head);

                    const specialBadges: Array<{
                      label: string;
                      bg: string;
                      text: string;
                      border: string;
                    }> = [];

                    if (member.is_pwd) {
                      specialBadges.push({
                        label: "PWD",
                        bg: "bg-blue-50",
                        text: "text-blue-700",
                        border: "border-blue-200",
                      });
                    }
                    if (member.is_senior || (age !== null && age >= 60)) {
                      specialBadges.push({
                        label: "Senior 60+",
                        bg: "bg-amber-50",
                        text: "text-amber-800",
                        border: "border-amber-200",
                      });
                    }
                    if (member.is_pregnant) {
                      specialBadges.push({
                        label: "Pregnant",
                        bg: "bg-pink-50",
                        text: "text-pink-700",
                        border: "border-pink-200",
                      });
                    }
                    if (member.is_lactating) {
                      specialBadges.push({
                        label: "Lactating",
                        bg: "bg-purple-50",
                        text: "text-purple-700",
                        border: "border-purple-200",
                      });
                    }
                    if (member.is_bedridden) {
                      specialBadges.push({
                        label: "Bedridden",
                        bg: "bg-rose-50",
                        text: "text-rose-700",
                        border: "border-rose-200",
                      });
                    }
                    if (member.has_chronic_condition) {
                      specialBadges.push({
                        label: "Chronic Care",
                        bg: "bg-teal-50",
                        text: "text-teal-700",
                        border: "border-teal-200",
                      });
                    }

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-neutral-50/40 p-4 shadow-2xs hover:border-emerald-200/90 hover:bg-white transition-all gap-3.5"
                      >
                        <div className="space-y-2.5">
                          {/* Avatar + Name + Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-2xs",
                                  isHead ? "bg-emerald-700" : "bg-neutral-700",
                                )}
                              >
                                {member.full_name?.trim().charAt(0).toUpperCase() || "M"}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-neutral-900 truncate">
                                  {member.full_name}
                                </p>
                                <p className="text-[11px] text-neutral-500 font-medium">
                                  {member.relationship_to_head ||
                                    (isHead ? "Household Head" : "Family Member")}
                                  {age !== null ? ` · ${age} yrs old` : ""}
                                  {member.sex ? ` · ${member.sex === "male" ? "Male" : "Female"}` : ""}
                                </p>
                              </div>
                            </div>

                            {isHead ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 border border-emerald-200/80 px-2 py-0.2 text-[9.5px] font-black text-emerald-800 uppercase">
                                Head
                              </span>
                            ) : null}
                          </div>

                          {/* Special Needs Badges */}
                          {specialBadges.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {specialBadges.map((badge) => (
                                <span
                                  key={badge.label}
                                  className={cn(
                                    "inline-flex items-center rounded-md border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                                    badge.bg,
                                    badge.text,
                                    badge.border,
                                  )}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {member.has_chronic_condition && member.chronic_condition_note ? (
                            <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-2 text-xs text-teal-900">
                              <span className="font-bold text-[10.5px] uppercase tracking-wider block text-teal-800">
                                Note:
                              </span>
                              <span className="text-[11px]">{member.chronic_condition_note}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-neutral-200/60">
                          {!isHead ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToDelete(member)}
                              className="h-7.5 rounded-full px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                            >
                              <Trash2 className="size-3" />
                              <span>Remove</span>
                            </Button>
                          ) : null}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditMember(member)}
                            className="h-7.5 rounded-full border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50 gap-1"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Waterway Proximity Assessment (Compact & Clean in Right Column) */}
            <Card className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/30 shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs">
                      <Droplets aria-hidden className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-neutral-950">
                        Waterway Proximity Assessment
                      </h2>
                      <p className="text-[11px] text-neutral-500 font-normal">
                        Distance to nearest river, creek, or drainage channel
                      </p>
                    </div>
                  </div>

                  {isAutoDetectedProximity ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800 shrink-0">
                      <Zap className="size-2.5 text-emerald-600" />
                      Auto-detected
                    </span>
                  ) : null}
                </div>

                <Controller
                  control={control}
                  name="waterway_proximity"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {WATERWAY_OPTIONS.map((opt) => {
                        const selected = field.value === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-2.5 sm:p-3 transition-all duration-150",
                              opt.cardTone,
                              selected
                                ? opt.selectedTone
                                : "border-neutral-200/80 bg-white hover:bg-neutral-50/80",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="radio"
                                name="waterway_proximity"
                                value={opt.value}
                                checked={selected}
                                onChange={() => {
                                  field.onChange(opt.value);
                                  setIsAutoDetectedProximity(false);
                                }}
                                className="size-4 shrink-0 cursor-pointer accent-emerald-600"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-neutral-900 truncate">
                                  {opt.label}
                                </p>
                                <p className="text-[10.5px] text-neutral-500 truncate font-medium">
                                  {opt.tagalogLabel}
                                </p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-md border px-2 py-0.5 text-[9.5px] font-bold tracking-tight",
                                opt.badgeTone,
                              )}
                            >
                              {opt.risk}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Form Action Buttons (Always at bottom across mobile & desktop) ── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-neutral-200/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/portal/household")}
            className="h-10 rounded-full border-neutral-300 bg-white px-6 text-xs font-bold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || updateHouseholdMutation.isPending}
            className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-6 text-xs font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <Save className="size-4" />
            <span>
              {isSubmitting || updateHouseholdMutation.isPending
                ? "Saving Changes…"
                : "Save Household Changes"}
            </span>
          </Button>
        </div>
      </form>

      {/* ── Add / Edit Member Dialog ── */}
      <HouseholdMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        member={selectedMember}
      />

      {/* ── Remove Member Confirmation Dialog ── */}
      <Dialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-lg font-black text-neutral-900">
              Remove Member from Household?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-600">
              Are you sure you want to remove{" "}
              <strong className="text-neutral-900">{memberToDelete?.full_name}</strong> from
              your household emergency roster? This will archive their member profile.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMemberToDelete(null)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (memberToDelete) {
                  deleteMember.mutate(memberToDelete.id);
                }
              }}
              disabled={deleteMember.isPending}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              {deleteMember.isPending ? "Removing..." : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
