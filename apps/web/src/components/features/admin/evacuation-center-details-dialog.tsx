"use client";

import * as React from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  Crosshair,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Sparkles,
  User,
  UserCheck,
  Users,
} from "lucide-react";

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
import { EditEvacuationCenterDialog, type EvacCenterEditable } from "./edit-evacuation-center-dialog";
import { EvacCheckinManagerDialog } from "./evac-checkin-manager-dialog";
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

  const occupancy = center.occupancy ?? 0;
  const capacity = center.capacity ?? 0;
  const pct = capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;
  const remainingSlots = capacity > 0 ? Math.max(0, capacity - occupancy) : "—";
  const isFull = capacity > 0 && occupancy >= capacity;
  const isNear = capacity > 0 && occupancy / capacity >= 0.8 && !isFull;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-emerald-600/30 bg-emerald-50/50 text-xs font-bold text-emerald-800 hover:bg-emerald-100/60 hover:text-emerald-900 cursor-pointer"
          >
            Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header with Dark Green Gradient */}
        <DialogHeader className="border-b border-emerald-900/40 bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#022c22] p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="size-3.5 text-emerald-400" />
              Designated Disaster Shelter
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                center.is_open
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-slate-700 text-slate-200",
              )}
            >
              {center.is_open ? "Open for Intake" : "Closed (Standby)"}
            </span>
          </div>

          <DialogTitle className="mt-2 flex items-center gap-2 text-xl font-black text-white">
            <BedDouble className="size-5 text-emerald-400 shrink-0" />
            {center.facility.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-200/80">
            {center.facility.area_name ? `Area: ${center.facility.area_name} · ` : ""}
            {center.facility.address || "San Jose Municipality, Rodriguez (Montalban), Rizal"}
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex flex-col gap-4 p-6 text-xs">
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
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Checked In</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{occupancy}</p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Available Slots</p>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">{remainingSlots}</p>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <p className="text-slate-500 font-semibold text-[10px] uppercase">Max Capacity</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{capacity > 0 ? capacity : "—"}</p>
              </div>
            </div>
          </div>

          {/* Officer Contact & GIS Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="size-3.5 text-slate-600" />
                Shelter Officer & Hotline
              </p>
              <p className="font-bold text-slate-900">{center.contact_person || "Designated Barangay Officer"}</p>
              <p className="text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                <Phone className="size-3 text-slate-400" />
                {center.contact_number || "Barangay Command Center Hotline"}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-600" />
                Geolocation & Area
              </p>
              <p className="font-bold text-slate-900">{center.facility.area_name || "San Jose Area"}</p>
              <p className="font-mono text-[11px] text-slate-600">
                {center.facility.location.coordinates[1].toFixed(5)}, {center.facility.location.coordinates[0].toFixed(5)}
              </p>
            </div>
          </div>

          {/* Intake Notes */}
          {center.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Equipment & Intake Notes
              </p>
              <p className="text-slate-700 leading-relaxed text-[11.5px]">{center.notes}</p>
            </div>
          )}
        </div>

        {/* Centered Footer Buttons */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-center sm:justify-center flex-wrap gap-2">
          {onLocateOnMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                onLocateOnMap();
              }}
              className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <Crosshair className="size-3.5 mr-1.5 text-slate-700" />
              Locate on Map
            </Button>
          )}

          <EvacCheckinManagerDialog
            centerId={center.id}
            centerName={center.facility.name}
            capacity={center.capacity}
            trigger={
              <Button
                variant="primary"
                size="sm"
                className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
              >
                <UserCheck className="size-3.5 mr-1.5" />
                Check-In Station
              </Button>
            }
          />

          <EditEvacuationCenterDialog
            center={center}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <Pencil className="size-3.5 mr-1.5 text-slate-700" />
                Edit Center
              </Button>
            }
          />

          <Link href={`/admin/evacuation-centers/${center.id}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <ExternalLink className="size-3.5 mr-1.5 text-slate-700" />
              Full Details
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
