"use client";

import * as React from "react";
import {
  Ambulance,
  Building2,
  Check,
  Copy,
  Eye,
  Flame,
  LifeBuoy,
  Phone,
  PhoneCall,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HotlineEntity } from "./hotline-form-dialog";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Phone; color: string; badge: string }
> = {
  barangay: {
    label: "Barangay / BHERT",
    icon: Building2,
    color: "bg-emerald-500 text-white",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  mdrrmo: {
    label: "MDRRMO / Disaster",
    icon: ShieldAlert,
    color: "bg-rose-500 text-white",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  police: {
    label: "Police (PNP)",
    icon: ShieldAlert,
    color: "bg-blue-600 text-white",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  fire: {
    label: "Fire Station (BFP)",
    icon: Flame,
    color: "bg-amber-500 text-white",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  hospital: {
    label: "Hospital / Medical",
    icon: Stethoscope,
    color: "bg-teal-600 text-white",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
  },
  ambulance: {
    label: "Ambulance / Health",
    icon: Ambulance,
    color: "bg-indigo-600 text-white",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  rescue: {
    label: "National / Rescue",
    icon: LifeBuoy,
    color: "bg-purple-600 text-white",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

interface HotlineViewDialogProps {
  hotline: HotlineEntity;
  trigger?: React.ReactNode;
}

export function HotlineViewDialog({ hotline, trigger }: HotlineViewDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const config = TYPE_CONFIG[hotline.type] ?? {
    label: hotline.type,
    icon: Phone,
    color: "bg-neutral-700 text-white",
    badge: "bg-neutral-100 text-neutral-800 border-neutral-200",
  };
  const Icon = config.icon;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hotline.number);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const numberParts = hotline.number.split(/[\/,]/).map((s) => s.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors gap-1.5 cursor-pointer"
            title="View details"
          >
            <Eye className="size-3.5" />
            <span className="md:hidden">View</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="border-b border-neutral-100 bg-gradient-to-br from-emerald-50/40 via-white to-neutral-50/60 p-5 sm:p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("grid size-11 place-items-center rounded-2xl shadow-xs", config.color)}>
                <Icon className="size-5" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-neutral-900 line-clamp-1">
                  {hotline.label}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-neutral-500 mt-0.5">
                  Emergency Line Details & Dispatch Preview
                </DialogDescription>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border shrink-0",
                hotline.is_active
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-neutral-100 text-neutral-600 border-neutral-200",
              )}
            >
              {hotline.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Numbers Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
              <span>Registered Phone Numbers</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy numbers</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {numberParts.map((num, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-2.5"
                >
                  <span className="font-mono text-sm font-bold text-neutral-900">{num}</span>
                  <a
                    href={toTelHref(num)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/70 hover:bg-emerald-100 transition-colors"
                  >
                    <PhoneCall className="size-3.5" />
                    <span>Dial Test</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-neutral-100 bg-white p-3 space-y-1">
              <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
                Department
              </span>
              <div className="font-bold text-neutral-900">{config.label}</div>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-white p-3 space-y-1">
              <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
                Directory Sort Order
              </span>
              <div className="font-bold text-neutral-900">Index #{hotline.sort_order ?? 0}</div>
            </div>
          </div>

          {/* Public Preview Card */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Public Directory Preview
            </span>
            <div className="flex items-center justify-between rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <Icon className="size-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">{hotline.label}</div>
                  <div className="font-mono text-xs font-bold text-emerald-800">
                    {hotline.number}
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-bold text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                1-Click Call
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
