"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Camera, MapPin, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
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
import type { Page } from "@/lib/api/public-types";
import type { EmergencyEventOut } from "@/lib/api/safety-types";

const SAN_JOSE_AREAS = [
  "Area 1",
  "Area 2",
  "Area 3",
  "Area 4",
  "Area 5",
  "Area 6",
];

const INCIDENT_TYPES = [
  { value: "flooding", label: "Flooding / Rising Water" },
  { value: "fallen_tree", label: "Fallen Tree" },
  { value: "road_blockage", label: "Road Blockage / Debris" },
  { value: "power_outage", label: "Power Outage / Downed Cable" },
  { value: "landslide", label: "Landslide / Soil Erosion" },
  { value: "fire", label: "Fire / Smoke Outbreak" },
  { value: "other", label: "Other Hazard" },
];

const AREA_APPROX_COORDS: Record<string, [number, number]> = {
  "Area 1": [14.7525, 121.1345],
  "Area 2": [14.7475, 121.129],
  "Area 3": [14.7385, 121.1265],
  "Area 4": [14.7315, 121.1235],
  "Area 5": [14.7265, 121.1315],
  "Area 6": [14.7395, 121.1415],
};

interface IncidentCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentCreationDialog({ open, onOpenChange }: IncidentCreationDialogProps) {
  const queryClient = useQueryClient();

  const [type, setType] = React.useState<string>("flooding");
  const [selectedArea, setSelectedArea] = React.useState<string>("Area 1");
  const [locationNote, setLocationNote] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventId, setEventId] = React.useState<string>("none");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);

  const { data: events } = useQuery({
    queryKey: ["admin", "emergency-events", "for-incident-creation"],
    queryFn: () =>
      api
        .get<Page<EmergencyEventOut>>("/admin/emergency-events", {
          params: { size: 50 },
        })
        .then((response) => response.data),
  });

  const resetForm = () => {
    setType("flooding");
    setSelectedArea("Area 1");
    setLocationNote("");
    setDescription("");
    setEventId("none");
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo size must be under 10MB");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let lat: number | null = null;
      let lng: number | null = null;

      if (selectedArea && AREA_APPROX_COORDS[selectedArea]) {
        [lat, lng] = AREA_APPROX_COORDS[selectedArea];
      }

      const note = locationNote.trim()
        ? selectedArea ? `[${selectedArea}] ${locationNote.trim()}` : locationNote.trim()
        : selectedArea ? `Area: ${selectedArea}` : null;

      const formData = new FormData();
      formData.append("type", type);
      formData.append("description", description.trim());
      if (lat !== null && lng !== null) {
        formData.append("latitude", lat.toString());
        formData.append("longitude", lng.toString());
      }
      if (note) {
        formData.append("location_note", note);
      }
      if (eventId && eventId !== "none") {
        formData.append("event_id", eventId);
      }
      if (photo) {
        formData.append("photo", photo);
      }

      return api.post("/me/incident-reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Incident report logged and ready for review.");
      queryClient.invalidateQueries({ queryKey: ["admin", "incident"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to log incident report");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe the incident details.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white text-slate-900">
        <DialogHeader className="border-b border-neutral-100 bg-emerald-950 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase">
            <ShieldAlert className="size-4 text-emerald-400" />
            Field Incident Logging
          </div>
          <DialogTitle className="mt-1 text-xl font-black text-white">
            Report Hazard / Incident
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-200/80">
            Document a verified community hazard, road blockage, or infrastructure disruption.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4 text-xs">
          {/* Incident Type & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-neutral-500" />
                Hazard Type <span className="text-rose-500">*</span>
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-neutral-500" />
                Barangay Area <span className="text-rose-500">*</span>
              </label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAN_JOSE_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Associated Emergency Event */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-neutral-800">
              Associated Emergency Event (Optional)
            </label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Specific Event (General Incident)</SelectItem>
                {events?.items.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Landmark / Location Note */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-neutral-800">
              Specific Location / Landmarks
            </label>
            <input
              type="text"
              placeholder="e.g. In front of Barangay Health Center, Kasiglahan"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-neutral-800">
              Incident Description & Severity <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Large acacia branch blocking two-way road access. Live electric line sparking."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Photo Attachment */}
          <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
            <label className="font-bold text-neutral-800 flex items-center gap-1.5">
              <Camera className="size-3.5 text-neutral-500" />
              Field Photo Evidence (Optional)
            </label>
            {photoPreview ? (
              <div className="relative inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                <Image
                  src={photoPreview}
                  alt="Selected preview"
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16 rounded-lg object-cover border border-neutral-200"
                />
                <div className="flex flex-col min-w-0">
                  <p className="font-bold text-neutral-900 truncate">{photo?.name}</p>
                  <p className="text-[10px] text-neutral-500">
                    {photo ? `${(photo.size / 1024).toFixed(1)} KB` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="ml-auto flex size-6 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-4 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer">
                <Camera className="size-5 text-neutral-400" />
                <span className="mt-1 text-xs font-semibold text-neutral-700">
                  Upload photo from device
                </span>
                <span className="text-[10px] text-neutral-400">PNG, JPG, WEBP up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <DialogFooter className="mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Logging Report…" : "Submit Incident Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
