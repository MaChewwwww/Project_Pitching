"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  Crosshair,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Shield,
  Sparkles,
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
import { getFacilityTypeConfig } from "@/lib/facility-types";
import { EditFacilityDialog, type FacilityEditable } from "@/components/features/admin/edit-facility-dialog";
import { cn } from "@/lib/utils";

export interface FacilityDetailsDialogProps {
  facility: FacilityEditable;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLocate?: (id: string) => void;
  onToggleStatus?: (facility: FacilityEditable) => void;
}

export function FacilityDetailsDialog({
  facility,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onLocate,
  onToggleStatus,
}: FacilityDetailsDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const typeConfig = getFacilityTypeConfig(facility.type);
  const Icon = typeConfig.icon;

  const [lng, lat] = facility.location.coordinates;
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
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto p-6 text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-2xs",
                    typeConfig.bg,
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                    {facility.name}
                  </DialogTitle>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                        typeConfig.badge,
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", typeConfig.dot)} />
                      {typeConfig.singleLabel}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        facility.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-100 text-slate-600",
                      )}
                    >
                      {facility.is_active ? (
                        <>
                          <CheckCircle2 className="size-2.5 text-emerald-600" />
                          Operational
                        </>
                      ) : (
                        "Inactive / Archived"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Facility dossier and GIS attributes for {facility.name}
            </DialogDescription>
          </DialogHeader>

          {/* Dossier Body */}
          <div className="mt-4 flex flex-col gap-4">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Metric 1: Assigned Area */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin className="size-3 text-emerald-700" />
                  Assigned Area
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {facility.area_name || "Barangay San Jose"}
                </p>
              </div>

              {/* Metric 2: GPS Coordinates */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3 text-emerald-700" />
                    GIS Coordinates
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
              </div>
            </div>

            {/* Address and Contact Information */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-2xs">
              <div className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Physical Address / Location
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {facility.address || "No specific street address provided"}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Contact Hotline
                  </span>
                  {facility.contact_number ? (
                    <a
                      href={toTelHref(facility.contact_number)}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                    >
                      <Phone className="size-3" />
                      {facility.contact_number}
                    </a>
                  ) : (
                    <span className="mt-0.5 text-xs text-slate-500 font-mono">
                      None registered
                    </span>
                  )}
                </div>

                {/* External Maps Links */}
                <div className="flex items-center gap-1.5">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                  >
                    Google Maps
                    <ExternalLink className="size-2.5" />
                  </a>
                  <a
                    href={osmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                  >
                    OSM
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Contextual Notice */}
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-950">
              <Shield className="size-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-relaxed text-emerald-900">
                This facility is geocoded in the Barangay San Jose GIS network and visible on public disaster readiness and evacuation maps.
              </p>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <DialogFooter className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              {onLocate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onLocate(facility.id);
                    setOpen(false);
                  }}
                  className="h-9 gap-1.5 rounded-xl border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <Crosshair className="size-3.5 text-slate-700" />
                  Locate on Map
                </Button>
              )}

              {onToggleStatus && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onToggleStatus(facility);
                    setOpen(false);
                  }}
                  className="h-9 gap-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {facility.is_active ? (
                    <>
                      <PowerOff className="size-3.5 text-neutral-600" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="size-3.5 text-emerald-600" />
                      Reactivate
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-9 gap-1.5 rounded-xl border-amber-300/80 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                <Pencil className="size-3.5" />
                Edit Facility
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Edit Modal */}
      <EditFacilityDialog
        facility={facility}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
