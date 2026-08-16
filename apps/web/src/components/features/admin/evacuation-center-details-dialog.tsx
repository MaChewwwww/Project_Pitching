"use client";

import * as React from "react";
import Link from "next/link";
import {
  BedDouble,
  CheckCircle2,
  Copy,
  Crosshair,
  ExternalLink,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { googleMapsDirectionsUrl, osmDirectionsUrl, toTelHref } from "@/lib/format";
import { EditEvacuationCenterDialog, type EvacCenterEditable } from "./edit-evacuation-center-dialog";
import { cn } from "@/lib/utils";

export function EvacuationCenterDetailsDialog({
  center,
  onLocateOnMap,
  trigger,
}: {
  center: EvacCenterEditable;
  onLocateOnMap?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const occupancy = center.occupancy ?? 0;
  const capacity = center.capacity ?? 0;
  const pct = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
  const remainingSlots = capacity > 0 ? Math.max(0, capacity - occupancy) : "—";
  const isFull = capacity > 0 && occupancy >= capacity;
  const isNear = capacity > 0 && occupancy / capacity >= 0.8 && !isFull;

  const [lng, lat] = center.facility.location.coordinates;
  const coordsStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const googleMapsUrl = googleMapsDirectionsUrl(lat, lng);
  const osmUrl = osmDirectionsUrl(lat, lng);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coordsStr);
    setCopiedCoords(true);
    toast.success("Coordinates copied to clipboard");
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer shrink-0"
            title="View Details"
            aria-label={`View Details for ${center.facility.name}`}
          >
            <Eye className="size-3.5 text-emerald-700" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-xl flex flex-col p-0 overflow-hidden text-slate-900 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Clean Standard Header matching all admin modals */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 shrink-0 text-left">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shadow-2xs">
                <BedDouble className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                  {center.facility.name}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    Designated Shelter
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      center.is_open
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-100 text-slate-600",
                    )}
                  >
                    {center.is_open ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-600" />
                        Open for Intake
                      </>
                    ) : (
                      "Closed (Standby)"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Evacuation center details and intake metrics for {center.facility.name}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body with Custom Green Scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4 text-xs [scrollbar-width:thin] [scrollbar-color:#059669_#f1f5f9] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-600/90 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-400">
          {/* Capacity and Occupancy Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between font-bold text-slate-900 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="size-4 text-emerald-700" />
                Live Headcount & Capacity Meter
              </span>
              <span
                className={cn(
                  "font-mono text-xs",
                  isFull ? "text-rose-600 font-black" : isNear ? "text-amber-600 font-bold" : "text-emerald-700",
                )}
              >
                {occupancy} / {capacity > 0 ? capacity : "Unlimited"} ({pct}% Full)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isFull ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-white p-2 border border-slate-200 shadow-2xs">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Checked In</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{occupancy}</p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200 shadow-2xs">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Available Slots</p>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">{remainingSlots}</p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200 shadow-2xs">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Max Capacity</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{capacity > 0 ? capacity : "—"}</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contact Person & Hotline */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <User className="size-3 text-emerald-700" />
                Contact Person & Hotline
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {center.contact_person || "Designated Barangay Officer"}
              </p>
              <div className="mt-1">
                {center.contact_number ? (
                  <a
                    href={toTelHref(center.contact_number)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <Phone className="size-3" />
                    {center.contact_number}
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Barangay Command Center Hotline
                  </span>
                )}
              </div>
            </div>

            {/* Geolocation & Assigned Area */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-emerald-700" />
                  {center.facility.area_name || "San Jose Area"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                >
                  <Copy className="size-2.5" />
                  {copiedCoords ? "Copied" : "Copy"}
                </button>
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                {coordsStr}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-emerald-700">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:underline"
                >
                  Google Maps <ExternalLink className="size-2.5" />
                </a>
                <span>·</span>
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:underline"
                >
                  OSM <ExternalLink className="size-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Street Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MapPin className="size-3 text-slate-400" />
              Street Address
            </span>
            <p className="text-xs font-semibold text-slate-800 leading-relaxed">
              {center.facility.address || "Phase 1A, Kasiglahan Village 1, Barangay San Jose, Rodriguez (Montalban), Rizal"}
            </p>
          </div>

          {/* Intake Notes & Equipment */}
          {center.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
                <Sparkles className="size-3 text-emerald-700" />
                Intake Notes & Facility Equipment
              </span>
              <p className="text-slate-700 leading-relaxed text-[11.5px]">{center.notes}</p>
            </div>
          )}
        </div>

        {/* Fixed Footer with centered, color-styled actions */}
        <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-center sm:justify-center gap-2.5 flex-wrap shrink-0">
          {onLocateOnMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                onLocateOnMap();
              }}
              className="h-9 gap-1.5 rounded-xl border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs"
            >
              <Crosshair className="size-3.5 text-slate-700" />
              Locate on Map
            </Button>
          )}

          <EditEvacuationCenterDialog
            center={center}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-amber-300/90 bg-amber-50 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
              >
                <Pencil className="size-3.5 text-amber-700" />
                Edit Center
              </Button>
            }
          />

          <Link href={`/admin/evacuation-centers/${center.id}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-emerald-600/30 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="size-3.5 text-emerald-700" />
              Full Details
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
