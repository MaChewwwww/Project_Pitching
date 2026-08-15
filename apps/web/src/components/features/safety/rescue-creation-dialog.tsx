"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, MapPin, Phone, User, Users, X } from "lucide-react";
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
import type { LatLng, PointResolution } from "@/components/features/registry/location-picker";

const LocationPicker = dynamic(
  () => import("@/components/features/registry/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-xl bg-neutral-100" />
    ),
  },
);

const SAN_JOSE_AREAS = [
  "Area 1",
  "Area 2",
  "Area 3",
  "Area 4",
  "Area 5",
  "Area 6",
];

const AREA_APPROX_COORDS: Record<string, [number, number]> = {
  "Area 1": [14.7525, 121.1345],
  "Area 2": [14.7475, 121.129],
  "Area 3": [14.7385, 121.1265],
  "Area 4": [14.7315, 121.1235],
  "Area 5": [14.7265, 121.1315],
  "Area 6": [14.7395, 121.1415],
};

interface RescueCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescueCreationDialog({ open, onOpenChange }: RescueCreationDialogProps) {
  const queryClient = useQueryClient();

  const [requesterName, setRequesterName] = React.useState("");
  const [contactNumber, setContactNumber] = React.useState("");
  const [selectedArea, setSelectedArea] = React.useState<string>("Area 1");
  const [locationNote, setLocationNote] = React.useState("");
  const [peopleCount, setPeopleCount] = React.useState<number>(1);
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState<LatLng | null>({
    lat: 14.7415,
    lng: 121.1315,
  });

  const resetForm = () => {
    setRequesterName("");
    setContactNumber("");
    setSelectedArea("Area 1");
    setLocationNote("");
    setPeopleCount(1);
    setDescription("");
    setLocation({
      lat: 14.7415,
      lng: 121.1315,
    });
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    if (AREA_APPROX_COORDS[area]) {
      const [lat, lng] = AREA_APPROX_COORDS[area];
      setLocation({ lat, lng });
    }
  };

  const handleLocationResolve = (resolution: PointResolution) => {
    if (resolution.area_name && SAN_JOSE_AREAS.includes(resolution.area_name)) {
      setSelectedArea(resolution.area_name);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const lat = location?.lat ?? null;
      const lng = location?.lng ?? null;

      const note = locationNote.trim()
        ? selectedArea ? `[${selectedArea}] ${locationNote.trim()}` : locationNote.trim()
        : selectedArea ? `Area: ${selectedArea}` : null;

      const body = {
        requester_name: requesterName.trim(),
        contact_number: contactNumber.trim() || null,
        latitude: lat,
        longitude: lng,
        location_note: note,
        description: description.trim(),
        people_count: peopleCount > 0 ? peopleCount : 1,
      };

      return api.post("/public/rescue-requests", body);
    },
    onSuccess: () => {
      toast.success("Rescue request documented and queued for triage.");
      queryClient.invalidateQueries({ queryKey: ["admin", "rescue"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to record rescue request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      toast.error("Please provide the requester or caller name.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe the emergency situation.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 rounded-2xl shadow-2xl">
        <DialogHeader className="relative border-b border-neutral-100 bg-emerald-950 p-5 sm:p-6 text-white shrink-0">
          {/* High-contrast close button */}
          <button
            type="button"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/20 shadow-md"
            title="Close dialog"
          >
            <X className="size-4 text-white" />
          </button>

          <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase pr-8">
            <LifeBuoy className="size-4 text-emerald-400" />
            Intake Operations
          </div>
          <DialogTitle className="mt-1 text-xl font-black text-white pr-8">
            Record Rescue Request
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-200/80 pr-8">
            Log an incoming telephone call or walk-in report from a resident needing immediate evacuation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 text-xs">
          {/* Requester Name & Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <User className="size-3.5 text-neutral-500" />
                Caller / Requester Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Juan dela Cruz"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Phone className="size-3.5 text-neutral-500" />
                Contact Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 09171234567"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Area & People Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-neutral-500" />
                Barangay Area <span className="text-rose-500">*</span>
              </label>
              <Select value={selectedArea} onValueChange={handleAreaChange}>
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

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Users className="size-3.5 text-neutral-500" />
                Individuals Needing Rescue
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={peopleCount}
                onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Landmark / Location Note */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-neutral-800">
              Landmarks & Specific Location Details
            </label>
            <input
              type="text"
              placeholder="e.g. Near the old basketball court, blue two-storey gate"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Emergency Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-neutral-800">
              Emergency Situation & Critical Vulnerabilities <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Floodwater waist-deep and rising. 1 bedridden elder, 2 children on second floor."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Interactive Map Pinning */}
          <div className="flex flex-col gap-1.5 border-t border-neutral-200/80 pt-3">
            <label className="font-bold text-neutral-800 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-emerald-700" />
              Map Pinning
            </label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              onResolve={handleLocationResolve}
              caption="Drag the pin, or tap the map, to mark the exact rescue location."
              className="h-44 w-full"
            />
          </div>

          <DialogFooter className="mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 shrink-0">
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
              {createMutation.isPending ? "Queuing Request…" : "Queue Rescue Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
