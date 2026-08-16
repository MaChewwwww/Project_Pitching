import type * as React from "react";
import {
  BedDouble,
  Building2,
  Flame,
  Hospital as HospitalIcon,
  LifeBuoy,
  Shield,
  Stethoscope,
} from "lucide-react";
import type { FacilityType } from "@/lib/api/public-types";

export type { FacilityType };

export interface FacilityTypeConfig {
  type: FacilityType;
  label: string; // Plural label (e.g. "Evacuation Centers")
  singleLabel: string; // Single label (e.g. "Evacuation Center")
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  badge: string;
  dot: string;
  hexColor: string;
  tone: "emerald" | "teal" | "rose" | "indigo" | "amber" | "orange" | "blue";
}

export const FACILITY_TYPE_CONFIGS: FacilityTypeConfig[] = [
  {
    type: "evacuation_center",
    label: "Evacuation Centers",
    singleLabel: "Evacuation Center",
    icon: BedDouble,
    color: "text-emerald-700",
    bg: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    hexColor: "#059669",
    tone: "emerald",
  },
  {
    type: "clinic",
    label: "Health Clinics & Outposts",
    singleLabel: "Health Clinic & Outpost",
    icon: Stethoscope,
    color: "text-teal-700",
    bg: "bg-teal-100/90 text-teal-800 border-teal-300/80",
    badge: "border-teal-200 bg-teal-50 text-teal-800",
    dot: "bg-teal-500",
    hexColor: "#0d9488",
    tone: "teal",
  },
  {
    type: "hospital",
    label: "Hospitals",
    singleLabel: "Hospital",
    icon: HospitalIcon,
    color: "text-rose-700",
    bg: "bg-rose-100/90 text-rose-800 border-rose-300/80",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
    hexColor: "#e11d48",
    tone: "rose",
  },
  {
    type: "police",
    label: "Police Stations",
    singleLabel: "Police Station",
    icon: Shield,
    color: "text-indigo-700",
    bg: "bg-indigo-100/90 text-indigo-800 border-indigo-300/80",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-800",
    dot: "bg-indigo-500",
    hexColor: "#4f46e5",
    tone: "indigo",
  },
  {
    type: "fire",
    label: "Fire Stations",
    singleLabel: "Fire Station",
    icon: Flame,
    color: "text-amber-700",
    bg: "bg-amber-100/90 text-amber-800 border-amber-300/80",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    hexColor: "#d97706",
    tone: "amber",
  },
  {
    type: "rescue_station",
    label: "Rescue Stations",
    singleLabel: "Rescue Station",
    icon: LifeBuoy,
    color: "text-orange-700",
    bg: "bg-orange-100/90 text-orange-800 border-orange-300/80",
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    dot: "bg-orange-500",
    hexColor: "#ea580c",
    tone: "orange",
  },
  {
    type: "barangay_hall",
    label: "Barangay Hall",
    singleLabel: "Barangay Hall",
    icon: Building2,
    color: "text-blue-700",
    bg: "bg-blue-100/90 text-blue-800 border-blue-300/80",
    badge: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-500",
    hexColor: "#2563eb",
    tone: "blue",
  },
];

export const ALL_FACILITY_TYPES: FacilityType[] = FACILITY_TYPE_CONFIGS.map(
  (t) => t.type
);

export function getFacilityTypeConfig(type: string | null | undefined): FacilityTypeConfig {
  const match = FACILITY_TYPE_CONFIGS.find((c) => c.type === type);
  if (match) return match;
  
  // Legacy / fallback mappings if any older data exists
  if (type === "health_center" || type?.includes("clinic")) {
    return FACILITY_TYPE_CONFIGS[1]; // clinic
  }
  if (type === "police_station") {
    return FACILITY_TYPE_CONFIGS[3]; // police
  }
  if (type === "fire_station") {
    return FACILITY_TYPE_CONFIGS[4]; // fire
  }
  if (type?.includes("evac")) {
    return FACILITY_TYPE_CONFIGS[0]; // evacuation_center
  }
  if (type?.includes("hall")) {
    return FACILITY_TYPE_CONFIGS[6]; // barangay_hall
  }

  return FACILITY_TYPE_CONFIGS[0];
}
