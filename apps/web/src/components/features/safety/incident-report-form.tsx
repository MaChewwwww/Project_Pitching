"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertTriangle,
  Camera,
  Flame,
  HelpCircle,
  Send,
  ShieldAlert,
  TreePine,
  UserCheck,
  Waves,
  X,
  Zap,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { PublicEmergencyEvent } from "@/lib/api/public-types";
import type { IncidentReportOut, IncidentType } from "@/lib/api/safety-types";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-neutral-100 text-xs font-medium text-neutral-500">
        Loading interactive map picker…
      </div>
    ),
  },
);

const MAX_PHOTO_MB = 5;

const INCIDENT_CONFIG: Record<
  IncidentType,
  { label: string; tagalog: string; icon: typeof Waves; color: string }
> = {
  flooding: {
    label: "Flooding",
    tagalog: "Baha / Tumataas na tubig",
    icon: Waves,
    color: "text-blue-600",
  },
  fire: {
    label: "Fire Incident",
    tagalog: "Sunog sa kabahayan o istruktura",
    icon: Flame,
    color: "text-red-600",
  },
  fallen_tree: {
    label: "Fallen Tree",
    tagalog: "Nabunot na puno / Nakaharang",
    icon: TreePine,
    color: "text-emerald-600",
  },
  road_blockage: {
    label: "Road Blockage",
    tagalog: "Baradong daan / Evacuation route",
    icon: ShieldAlert,
    color: "text-amber-600",
  },
  landslide: {
    label: "Landslide",
    tagalog: "Guho ng lupa / Erisyon",
    icon: AlertTriangle,
    color: "text-orange-600",
  },
  power_outage: {
    label: "Power Outage / Broken Lines",
    tagalog: "Nawalan ng kuryente / Putol na kable",
    icon: Zap,
    color: "text-yellow-600",
  },
  other: {
    label: "Other Hazard",
    tagalog: "Iba pang emergency insidente",
    icon: HelpCircle,
    color: "text-neutral-600",
  },
};

const schema = z
  .object({
    type: z.enum([
      "flooding",
      "fire",
      "fallen_tree",
      "road_blockage",
      "landslide",
      "power_outage",
      "other",
    ]),
    description: z.string().trim().min(1, "Please provide details about the incident."),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    location_note: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.location && !values.location_note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a pin on the map or describe the specific landmark/location.",
        path: ["location_note"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function IncidentReportForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [eventId, setEventId] = React.useState("");

  const { data: activeEvents = [] } = useQuery({
    queryKey: ["public", "active-emergency-events"],
    queryFn: () =>
      api
        .get<PublicEmergencyEvent[]>("/public/emergency-events/active")
        .then((response) => response.data),
  });

  const resolvedEventId =
    eventId || (activeEvents.length === 1 ? activeEvents[0].id : "");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "flooding",
      description: "",
      location: null,
      location_note: "",
    },
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Photo must be under ${MAX_PHOTO_MB} MB.`);
      return;
    }
    setPhotoError(null);
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
  }

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post<IncidentReportOut>("/me/incident-reports", formData, {
        headers: { "Content-Type": undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "incident-reports"] });
      toast.success("Incident report submitted to Barangay Operations Desk");
      onDone();
    },
    onError: (err: unknown) => setServerError(toDisplayError(err).detail),
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (activeEvents.length > 1 && !resolvedEventId) {
      setServerError("Select which active emergency this report belongs to.");
      return;
    }
    const formData = new FormData();
    formData.append("type", values.type);
    formData.append("description", values.description);
    if (values.location) {
      formData.append("latitude", String(values.location.lat));
      formData.append("longitude", String(values.location.lng));
    }
    if (values.location_note) formData.append("location_note", values.location_note);
    if (resolvedEventId) formData.append("event_id", resolvedEventId);
    if (photo) formData.append("photo", photo);
    mutation.mutate(formData);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ── Verified Resident Account Lockup ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <UserCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900">
                {user?.full_name ?? "Resident Account"}
              </span>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[10px] font-black uppercase text-emerald-800">
                Verified Resident
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Barangay San Jose Official Portal • Report will be logged under your household record
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Event Linking ── */}
      {activeEvents.length > 0 ? (
        <div className="space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <Label htmlFor="incident-event" className="text-xs font-bold text-neutral-800">
            Active Emergency Event Link
          </Label>
          <select
            id="incident-event"
            value={resolvedEventId}
            onChange={(event) => setEventId(event.target.value)}
            className="w-full h-11 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium text-neutral-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
          >
            {activeEvents.length > 1 ? (
              <option value="">Select active disaster event</option>
            ) : null}
            {activeEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.type.replace(/_/g, " ")})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-amber-800/80">
            {activeEvents.length > 1
              ? "Multiple emergency operations are underway. Select the appropriate event."
              : "This report will automatically link to the ongoing barangay disaster operations."}
          </p>
        </div>
      ) : null}

      {/* ── Field 1: Incident Hazard Type ── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-neutral-800">
          Incident Hazard Type <span className="text-red-500">*</span>
        </Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-11 w-full rounded-xl border-neutral-300 bg-neutral-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(INCIDENT_CONFIG).map(([value, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <SelectItem key={value} value={value} className="text-xs py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("size-4", cfg.color)} />
                        <div>
                          <strong className="text-neutral-900 block">{cfg.label}</strong>
                          <span className="text-[10.5px] text-neutral-500 block">{cfg.tagalog}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Field 2: Description ── */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs font-bold text-neutral-800">
          Incident Situation & Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          rows={4}
          className="rounded-xl border-neutral-300 bg-neutral-50/50 p-3 text-sm focus:border-emerald-500 focus:bg-white"
          placeholder="Describe what you see: estimated water depth, severity, passable vehicles, or any stranded individuals..."
          {...register("description")}
        />
        {errors.description ? (
          <p className="text-red-600 text-xs font-semibold">{errors.description.message}</p>
        ) : null}
      </div>

      {/* ── Field 3: Interactive Location Map ── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-neutral-800">
          Geographic Incident Pin
        </Label>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationPicker
              value={field.value}
              onChange={field.onChange}
              caption="Drag the pin or tap on the map to pinpoint the exact location of the hazard."
            />
          )}
        />
      </div>

      {/* ── Field 4: Location Note / Landmark ── */}
      <div className="space-y-1.5">
        <Label htmlFor="location_note" className="text-xs font-bold text-neutral-800">
          Street Landmark or Specific Location Note
        </Label>
        <Input
          id="location_note"
          className="h-11 rounded-xl border-neutral-300 bg-neutral-50/50 px-3 text-sm focus:border-emerald-500 focus:bg-white"
          placeholder="e.g., Harap ng Phase 1 Chapel, Tabing Creek Alleyway"
          {...register("location_note")}
        />
        {errors.location_note ? (
          <p className="text-red-600 text-xs font-semibold">{errors.location_note.message}</p>
        ) : (
          <span className="text-[11px] text-neutral-400 block pt-0.5">
            Helpful for responders to navigate if GPS signal is imprecise.
          </span>
        )}
      </div>

      {/* ── Field 5: Photo Upload ── */}
      <div className="space-y-1.5">
        <Label htmlFor="photo" className="text-xs font-bold text-neutral-800">
          Incident Photo (Optional)
        </Label>
        {photoPreview ? (
          <div className="relative w-fit">
            <Image
              src={photoPreview}
              alt="Attached incident photo preview"
              width={160}
              height={160}
              unoptimized
              className="h-40 w-40 rounded-2xl border border-neutral-200 object-cover shadow-2xs"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
              aria-label="Remove photo"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="photo"
            className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 text-neutral-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
          >
            <div className="grid size-9 place-items-center rounded-xl bg-white text-neutral-600 shadow-2xs">
              <Camera aria-hidden className="size-5" />
            </div>
            <span className="text-xs font-bold text-neutral-700">Attach a photo of the incident</span>
            <span className="text-[10.5px] text-neutral-400">JPG, PNG, or WebP up to 5 MB</span>
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
        )}
        {photoError ? <p className="text-red-600 text-xs font-semibold">{photoError}</p> : null}
      </div>

      {serverError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
          {serverError}
        </div>
      ) : null}

      {/* ── Submit Action Button ── */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || isSubmitting}
          className="h-11 w-full cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98] text-xs sm:text-sm"
        >
          <Send className="size-4" />
          <span>
            {mutation.isPending || isSubmitting
              ? "Transmitting Incident Report…"
              : "Transmit Incident Report to Operations"}
          </span>
        </Button>
      </div>
    </form>
  );
}
