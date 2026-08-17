"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Filter,
  Layers,
  MapPin,
  MapPinOff,
  Maximize2,
  Navigation,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import type {
  EmergencyEventOut,
  IncidentReportDetailOut,
  IncidentReportOut,
  IncidentReportPatch,
  IncidentStatus,
  RescueRequestDetailOut,
  RescueRequestOut,
  RescueRequestPatch,
  RescueRequestStatus,
} from "@/lib/api/safety-types";
import { cn } from "@/lib/utils";
import type { ResponseMapItem } from "./response-operations-map";
import { RescueCreationDialog } from "./rescue-creation-dialog";
import { IncidentCreationDialog } from "./incident-creation-dialog";

const ResponseOperationsMap = dynamic(
  () =>
    import("./response-operations-map").then((module) => module.ResponseOperationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900" />
    ),
  },
);

const MiniMapPreview = dynamic(
  () => import("./mini-map-preview").then((module) => module.MiniMapPreview),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-slate-900" />,
  },
);

function LayerCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-emerald-100/90 transition-colors hover:text-white">
      <input
        type="checkbox"
        className="size-3.5 cursor-pointer rounded border-emerald-700 bg-emerald-950 text-emerald-600 accent-emerald-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function OperationalMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  badge,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  sub: string;
  badge?: React.ReactNode;
  tone?: "neutral" | "emerald" | "rose" | "amber" | "sky";
}) {
  const toneMap = {
    neutral: {
      card: "bg-white border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300",
      iconBox: "bg-slate-100 text-slate-700",
      sub: "text-slate-500",
      value: "text-slate-950",
    },
    emerald: {
      card: "bg-emerald-50/50 border-emerald-200/80 text-emerald-950 shadow-2xs hover:border-emerald-300",
      iconBox: "bg-emerald-100 text-emerald-700",
      sub: "text-emerald-700 font-medium",
      value: "text-emerald-950",
    },
    rose: {
      card: "bg-rose-50/60 border-rose-200 text-rose-950 shadow-2xs hover:border-rose-300",
      iconBox: "bg-rose-100 text-rose-700",
      sub: "text-rose-700 font-medium",
      value: "text-rose-950",
    },
    amber: {
      card: "bg-amber-50/50 border-amber-200/80 text-amber-950 shadow-2xs hover:border-amber-300",
      iconBox: "bg-amber-100 text-amber-800",
      sub: "text-amber-800 font-medium",
      value: "text-amber-950",
    },
    sky: {
      card: "bg-sky-50/50 border-sky-200 text-sky-950 shadow-2xs hover:border-sky-300",
      iconBox: "bg-sky-100 text-sky-700",
      sub: "text-sky-700 font-medium",
      value: "text-sky-950",
    },
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border p-3.5 transition-all hover:shadow-xs sm:p-4",
        toneMap.card,
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg shadow-2xs",
              toneMap.iconBox,
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </div>
          <span className="truncate text-[11px] font-black tracking-wider text-slate-700 uppercase">
            {label}
          </span>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span
            className={cn(
              "text-2xl font-black tracking-tight tabular-nums sm:text-3xl",
              toneMap.value,
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className="text-[10.5px] font-bold tracking-wide text-slate-500 uppercase sm:text-xs">
              {unit}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-1 text-right">
          <span
            className={cn(
              "line-clamp-1 text-right text-[11px] leading-tight",
              toneMap.sub,
            )}
          >
            {sub}
          </span>
        </div>
      </div>
    </div>
  );
}

type ResponseItem = RescueRequestOut | IncidentReportOut;
type ResponseDetail = RescueRequestDetailOut | IncidentReportDetailOut;
type Mode = "rescue" | "incident";

const rescueStatuses: RescueRequestStatus[] = [
  "pending",
  "verified",
  "dispatched",
  "resolved",
  "dismissed",
];
const incidentStatuses: IncidentStatus[] = [
  "pending",
  "verified",
  "in_progress",
  "resolved",
  "dismissed",
];

const SAN_JOSE_AREAS = ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5", "Area 6"];

function label(val: string): string {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusTone(status: string): "rose" | "amber" | "sky" | "emerald" | "slate" {
  switch (status) {
    case "pending":
      return "rose";
    case "verified":
      return "amber";
    case "dispatched":
    case "in_progress":
      return "sky";
    case "resolved":
      return "emerald";
    default:
      return "slate";
  }
}

function badgeClass(status: string) {
  return (
    {
      pending: "border-rose-200 bg-rose-50 text-rose-700",
      verified: "border-amber-200 bg-amber-50 text-amber-800",
      dispatched: "border-sky-200 bg-sky-50 text-sky-800",
      in_progress: "border-sky-200 bg-sky-50 text-sky-800",
      resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dismissed: "border-slate-200 bg-slate-100 text-slate-600",
    }[status] ?? "border-neutral-200 bg-neutral-50 text-neutral-700"
  );
}

function titleOf(mode: Mode, item: ResponseItem) {
  return mode === "rescue"
    ? (item as RescueRequestOut).requester_name
    : label((item as IncidentReportOut).type);
}

export function ResponseOperationsWorkspace({ mode }: { mode: Mode }) {
  const client = useQueryClient();

  /* --- Map Independent Filter Controls --- */
  const [mapStatus, setMapStatus] = React.useState("active");
  const [mapEventId, setMapEventId] = React.useState("all");
  const [mapArea, setMapArea] = React.useState("all");
  const [mapPriority, setMapPriority] = React.useState("all");
  const [showHazard, setShowHazard] = React.useState(false);
  const [showAreas, setShowAreas] = React.useState(false);
  const [selectedMapId, setSelectedMapId] = React.useState<string | null>(null);

  /* --- Table Independent Filter Controls --- */
  const [tableStatus, setTableStatus] = React.useState("all");
  const [tablePriority, setTablePriority] = React.useState("all");
  const [tableArea, setTableArea] = React.useState("all");

  /* --- Modals & Detail State --- */
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [lightboxPhoto, setLightboxPhoto] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState(60);
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const endpoint =
    mode === "rescue" ? "/admin/rescue-requests" : "/admin/incident-reports";
  const queryKey = ["admin", mode, "operations"];

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get<Page<ResponseItem>>(endpoint, { params: { size: 100 } })
        .then((response) => response.data),
    refetchInterval: 60_000,
  });

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setCountdown(60);
    try {
      await refetch();
    } finally {
      setTimeout(() => {
        setIsManualRefreshing(false);
      }, 700);
    }
  };

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: events } = useQuery({
    queryKey: ["admin", "emergency-events", "for-response-workspace"],
    queryFn: () =>
      api
        .get<Page<EmergencyEventOut>>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data),
  });

  /* Selected detail inspection query */
  const inspectedId = selectedTableId || selectedMapId;
  const { data: detail } = useQuery({
    queryKey: ["admin", mode, "detail", inspectedId],
    enabled: !!inspectedId,
    queryFn: () =>
      api
        .get<ResponseDetail>(`${endpoint}/${inspectedId}`)
        .then((response) => response.data),
  });

  const allItems = React.useMemo(() => data?.items ?? [], [data?.items]);

  const activeStatuses = React.useMemo(
    () =>
      mode === "rescue"
        ? ["pending", "verified", "dispatched"]
        : ["pending", "verified", "in_progress"],
    [mode],
  );

  /* Top metric cards summary */
  const stats = React.useMemo(() => {
    const active = allItems.filter((i) => activeStatuses.includes(i.status));
    const pending = allItems.filter((i) => i.status === "pending");
    const inProgress = allItems.filter((i) =>
      ["dispatched", "in_progress"].includes(i.status),
    );
    const resolved = allItems.filter((i) => i.status === "resolved");
    const mapped = allItems.filter((i) => Boolean(i.location));
    const unmapped = allItems.length - mapped.length;

    const p1Count =
      mode === "rescue"
        ? allItems.filter((i) => (i as RescueRequestOut).priority === 1).length
        : 0;
    const p2Count =
      mode === "rescue"
        ? allItems.filter((i) => (i as RescueRequestOut).priority === 2).length
        : 0;

    return {
      total: allItems.length,
      active: active.length,
      pending: pending.length,
      inProgress: inProgress.length,
      resolved: resolved.length,
      mapped: mapped.length,
      unmapped,
      p1Count,
      p2Count,
    };
  }, [activeStatuses, allItems, mode]);

  /* -------------------------------------------------------------------------- */
  /* Filtered Items for the Map View                                            */
  /* -------------------------------------------------------------------------- */
  const mapFilteredRows = React.useMemo(() => {
    return allItems.filter((item) => {
      const matchesStatus =
        mapStatus === "all" ||
        (mapStatus === "active"
          ? activeStatuses.includes(item.status)
          : item.status === mapStatus);

      const matchesEvent =
        mapEventId === "all" ||
        (mapEventId === "unlinked" ? !item.event_id : item.event_id === mapEventId);

      const itemArea =
        ("location_area_name" in item && item.location_area_name) ||
        ("area_name" in item ? item.area_name : null);
      const matchesArea = mapArea === "all" || itemArea === mapArea;

      const matchesPriority =
        mode !== "rescue" ||
        mapPriority === "all" ||
        String((item as RescueRequestOut).priority) === mapPriority;

      return matchesStatus && matchesEvent && matchesArea && matchesPriority;
    });
  }, [activeStatuses, allItems, mapArea, mapEventId, mapPriority, mapStatus, mode]);

  const mapMapped = mapFilteredRows.filter((item) => item.location) as Array<
    ResponseItem & { location: NonNullable<ResponseItem["location"]> }
  >;

  const mapItems: ResponseMapItem[] = mapMapped.map((item, index) => {
    const itemArea =
      ("location_area_name" in item && item.location_area_name) ||
      ("area_name" in item ? item.area_name : null);
    const priority = mode === "rescue" ? (item as RescueRequestOut).priority : null;
    return {
      id: item.id,
      title: titleOf(mode, item),
      status: label(item.status),
      location: item.location,
      label: mode === "rescue" ? String(priority ?? "!") : String(index + 1),
      tone: statusTone(item.status),
      areaName: itemArea,
      priority,
    };
  });

  /* -------------------------------------------------------------------------- */
  /* Filtered Items for the Table View                                          */
  /* -------------------------------------------------------------------------- */
  const tableFilteredItems = React.useMemo(() => {
    return allItems.filter((item) => {
      if (tableStatus !== "all" && item.status !== tableStatus) return false;
      if (tableArea !== "all") {
        const itemArea =
          ("location_area_name" in item && item.location_area_name) ||
          ("area_name" in item ? item.area_name : null);
        if (itemArea !== tableArea) return false;
      }
      if (tablePriority !== "all" && mode === "rescue") {
        const itemPriority = "priority" in item ? String(item.priority ?? "") : "";
        if (itemPriority !== tablePriority) return false;
      }
      return true;
    });
  }, [allItems, tableStatus, tableArea, tablePriority, mode]);

  /* -------------------------------------------------------------------------- */
  /* ResourceTable Columns Definition                                           */
  /* -------------------------------------------------------------------------- */
  const columns = React.useMemo<ResourceColumn<ResponseItem>[]>(() => {
    return [
      {
        key: mode === "rescue" ? "requester_name" : "type",
        header: mode === "rescue" ? "Requester & Details" : "Hazard & Details",
        render: (row) => {
          const contact = "contact_number" in row ? row.contact_number : null;

          return (
            <div className="flex max-w-sm min-w-56 items-start gap-3">
              <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-emerald-100 font-bold text-emerald-800">
                {"photo_url" in row && row.photo_url ? (
                  <Image
                    src={row.photo_url}
                    alt="Incident thumbnail"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : mode === "rescue" ? (
                  <User className="size-4 text-emerald-700" />
                ) : (
                  <ShieldAlert className="size-4 text-emerald-700" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-neutral-900">
                  {titleOf(mode, row)}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                  {row.description}
                </p>
                {contact ? (
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-emerald-700">
                    <Phone className="size-2.5" />
                    {contact}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: "kind",
        header: mode === "rescue" ? "Urgency" : "Hazard Type",
        render: (row) => {
          if (mode === "rescue") {
            const p = (row as RescueRequestOut).priority;
            if (p === 1) {
              return (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                  <span className="size-1.5 animate-pulse rounded-full bg-rose-600" />
                  P1 Critical
                </span>
              );
            }
            if (p === 2) {
              return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  <span className="size-1.5 rounded-full bg-amber-600" />
                  P2 High
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                <span className="size-1.5 rounded-full bg-sky-600" />
                P3 Moderate
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-neutral-800">
              {label((row as IncidentReportOut).type)}
            </span>
          );
        },
      },
      {
        key: "area_name",
        header: "Area & Landmarks",
        render: (row) => {
          const itemArea =
            ("location_area_name" in row && row.location_area_name) ||
            ("area_name" in row ? row.area_name : null);
          return (
            <div className="max-w-xs min-w-44 text-xs">
              <p className="font-semibold text-neutral-800">
                {itemArea || "Area Unknown"}
              </p>
              <p className="mt-0.5 truncate text-neutral-500">
                {row.location_note || "No specific landmark"}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {row.location ? (
                  <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-emerald-700">
                    <MapPin className="size-3" /> Pinned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-slate-400">
                    <MapPinOff className="size-3" /> Unmapped
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs",
              badgeClass(row.status),
            )}
          >
            {row.status === "resolved" ? (
              <CheckCircle2 className="size-3" />
            ) : row.status === "pending" ? (
              <Clock className="size-3" />
            ) : (
              <Activity className="size-3" />
            )}
            {label(row.status)}
          </span>
        ),
      },
      {
        key: "created_at",
        header: "Submitted Date",
        render: (row) => (
          <div className="min-w-32 text-xs text-neutral-600">
            <p className="font-medium">{formatTime(row.created_at)}</p>
            <p className="mt-0.5 max-w-xs truncate text-[11px] text-neutral-400">
              {row.event_name ? `Event: ${row.event_name}` : "General Intake"}
            </p>
          </div>
        ),
      },
    ];
  }, [mode]);

  /* Status update mutation */
  const patch = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RescueRequestPatch | IncidentReportPatch;
    }) => api.patch(`${endpoint}/${id}`, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
      await client.invalidateQueries({
        queryKey: ["admin", mode, "detail", inspectedId],
      });
      toast.success("Lifecycle status updated successfully.");
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update record status");
    },
  });

  const [pendingResolutionStatus, setPendingResolutionStatus] = React.useState<
    "resolved" | "dismissed" | null
  >(null);
  const [resolutionNoteInput, setResolutionNoteInput] = React.useState("");

  const handleConfirmResolution = () => {
    if (!pendingResolutionStatus || !inspectedId) return;
    if (!resolutionNoteInput.trim()) {
      toast.error(
        pendingResolutionStatus === "resolved"
          ? "Please enter a resolution note before resolving."
          : "Please enter a dismissal reason before dismissing.",
      );
      return;
    }

    if (mode === "rescue") {
      patch.mutate({
        id: inspectedId,
        body: {
          status: pendingResolutionStatus as RescueRequestStatus,
          resolution_note: resolutionNoteInput.trim(),
        },
      });
    } else {
      patch.mutate({
        id: inspectedId,
        body: {
          status: pendingResolutionStatus as IncidentStatus,
          resolution_note: resolutionNoteInput.trim(),
        },
      });
    }

    setPendingResolutionStatus(null);
    setResolutionNoteInput("");
  };

  const updateStatus = (nextStatus: RescueRequestStatus | IncidentStatus) => {
    if (!inspectedId) return;
    if (nextStatus === "resolved" || nextStatus === "dismissed") {
      setPendingResolutionStatus(nextStatus);
      setResolutionNoteInput("");
      return;
    }

    if (mode === "rescue") {
      patch.mutate({
        id: inspectedId,
        body: {
          status: nextStatus as RescueRequestStatus,
        },
      });
    } else {
      patch.mutate({
        id: inspectedId,
        body: {
          status: nextStatus as IncidentStatus,
        },
      });
    }
  };

  const current = detail;
  const isMapFiltered =
    mapStatus !== "active" ||
    mapEventId !== "all" ||
    mapArea !== "all" ||
    mapPriority !== "all";

  const heading =
    mode === "rescue" ? "Rescue Operations Queue" : "Community Incident Reports";
  const description =
    mode === "rescue"
      ? "Live rescue queue for triage, emergency dispatch, and responder mobilization across Barangay San Jose."
      : "Citizen and officer incident reporting center. Review verified reports, triage field responses, and resolve hazards.";

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* -------------------------------------------------------------------- */}
      {/* Page Header                                                          */}
      {/* -------------------------------------------------------------------- */}
      <AdminPageHeader
        title={heading}
        description={description}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 py-1 pr-1.5 pl-3 text-xs font-semibold text-emerald-900 shadow-xs">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>
                Auto Refresh{" "}
                <span className="font-bold text-emerald-950 tabular-nums">
                  ({countdown}s)
                </span>
              </span>
              <button
                type="button"
                onClick={handleManualRefresh}
                title="Refresh now"
                disabled={isManualRefreshing || isFetching}
                className="flex size-5 cursor-pointer items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-200/80 hover:text-emerald-950 disabled:opacity-80"
              >
                <RotateCcw
                  className={cn(
                    "size-3",
                    (isFetching || isManualRefreshing) && "animate-spin",
                  )}
                />
              </button>
            </div>
          </div>
        }
      />

      {/* -------------------------------------------------------------------- */}
      {/* Top Metric Cards Strip                                               */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <OperationalMetricCard
          icon={Radio}
          label={mode === "rescue" ? "Active Queue" : "Active Backlog"}
          value={stats.active}
          unit={mode === "rescue" ? "Requests" : "Reports"}
          sub={
            mode === "rescue"
              ? stats.p1Count > 0
                ? `${stats.p1Count} Critical Priority 1`
                : stats.active > 0
                  ? "Open Workload"
                  : "All Cleared"
              : stats.active > 0
                ? "In Response Pipeline"
                : "All Cleared"
          }
          badge={
            mode === "rescue" ? (
              stats.p1Count > 0 ? (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[9.5px] font-black tracking-wider text-white uppercase shadow-2xs">
                  P1 Critical
                </span>
              ) : stats.p2Count > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9.5px] font-black tracking-wider text-white uppercase shadow-2xs">
                  P2 High
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9.5px] font-bold text-rose-800">
                  Open
                </span>
              )
            ) : (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9.5px] font-bold text-rose-800">
                Active
              </span>
            )
          }
          tone={stats.active > 0 ? "rose" : "neutral"}
        />

        <OperationalMetricCard
          icon={Clock}
          label="Pending Review"
          value={stats.pending}
          unit="Queued"
          sub={stats.pending > 0 ? "Needs Triage & Validation" : "All Cases Verified"}
          badge={
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-amber-900 uppercase">
              Needs Triage
            </span>
          }
          tone={stats.pending > 0 ? "amber" : "neutral"}
        />

        <OperationalMetricCard
          icon={mode === "rescue" ? Truck : ShieldAlert}
          label={mode === "rescue" ? "Dispatched" : "In Progress"}
          value={stats.inProgress}
          unit="Active"
          sub={stats.inProgress > 0 ? "Responders Deployed" : "No Active Deployments"}
          badge={
            <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-sky-900 uppercase">
              Mobilized
            </span>
          }
          tone={stats.inProgress > 0 ? "sky" : "neutral"}
        />

        <OperationalMetricCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved}
          unit="Completed"
          sub={
            stats.total > 0
              ? `${Math.round((stats.resolved / stats.total) * 100)}% resolution rate`
              : "No resolved records"
          }
          badge={
            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9.5px] font-black tracking-wider text-emerald-800 uppercase">
              {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              Closed
            </span>
          }
          tone={stats.resolved > 0 ? "emerald" : "neutral"}
        />

        <OperationalMetricCard
          icon={MapPin}
          label="Spatial Coverage"
          value={stats.mapped}
          unit={`/ ${stats.total}`}
          sub={
            stats.unmapped > 0
              ? `${stats.unmapped} unmapped in queue`
              : "100% coordinates mapped"
          }
          badge={
            stats.unmapped > 0 ? (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-amber-900 uppercase">
                {stats.unmapped} Unmapped
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-emerald-800 uppercase">
                100% Pinned
              </span>
            )
          }
          tone={stats.unmapped > 0 ? "amber" : "neutral"}
        />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Two-Column Layout: Map Canvas (Col 1) + Map Sidebar (Col 2)          */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Column 1: Map Card */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="relative h-[480px] w-full overflow-hidden sm:h-[580px] lg:h-[640px]">
            <ResponseOperationsMap
              items={mapItems}
              selectedId={selectedMapId}
              onSelect={(id) => setSelectedMapId(id)}
              showHazard={showHazard}
              showAreas={showAreas}
              onSelectArea={(area) => setMapArea(area)}
              unmappedCount={mapFilteredRows.length - mapMapped.length}
              mode={mode}
            />
          </div>
        </div>

        {/* Column 2: Independent Map Sidebar */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          {/* Map Layers card */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">
              <Layers className="size-3.5 text-emerald-400" aria-hidden />
              Map Layers
            </p>
            <div className="flex flex-col gap-2">
              <LayerCheckbox
                checked={showHazard}
                onChange={setShowHazard}
                label="Flood Hazard (5-Year)"
              />
              <LayerCheckbox
                checked={showAreas}
                onChange={setShowAreas}
                label="Area List"
              />
            </div>
          </div>

          {/* Map Filters card */}
          <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-3 flex h-6 items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                <Filter className="size-3.5 text-emerald-400" aria-hidden />
                Map Filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setMapStatus("active");
                  setMapEventId("all");
                  setMapArea("all");
                  setMapPriority("all");
                }}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-emerald-700/60 bg-emerald-900/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow-2xs transition-all hover:bg-emerald-800 hover:text-white",
                  isMapFiltered
                    ? "visible opacity-100"
                    : "pointer-events-none invisible opacity-0",
                )}
                aria-hidden={!isMapFiltered}
                tabIndex={isMapFiltered ? 0 : -1}
              >
                <RotateCcw className="size-2.5" />
                Reset
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-emerald-200/90">
                  Status
                </label>
                <Select value={mapStatus} onValueChange={setMapStatus}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Open Workload)</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {(mode === "rescue" ? rescueStatuses : incidentStatuses).map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-emerald-200/90">
                  Area
                </label>
                <Select value={mapArea} onValueChange={setMapArea}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {SAN_JOSE_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Emergency Event */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-bold text-emerald-200/90">
                  Emergency Event
                </label>
                <Select value={mapEventId} onValueChange={setMapEventId}>
                  <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="unlinked">Unlinked Records</SelectItem>
                    {events?.items.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority filter (for rescue) */}
              {mode === "rescue" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-bold text-emerald-200/90">
                    Urgency Priority
                  </label>
                  <Select value={mapPriority} onValueChange={setMapPriority}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-neutral-300 bg-white text-xs font-semibold text-neutral-900 shadow-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="1">Priority 1 (Critical)</SelectItem>
                      <SelectItem value="2">Priority 2 (High)</SelectItem>
                      <SelectItem value="3">Priority 3 (Moderate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>

          {/* Spatial Coverage Helper Card */}
          {(() => {
            const pct =
              stats.total > 0 ? Math.round((stats.mapped / stats.total) * 100) : 100;
            const isAllMapped = stats.unmapped === 0;
            const isCritical = stats.unmapped > 2;

            const icon = isAllMapped ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            ) : isCritical ? (
              <AlertTriangle className="size-4 shrink-0 text-rose-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
            );

            const titleColor = isAllMapped
              ? "text-emerald-300"
              : isCritical
                ? "text-rose-300"
                : "text-amber-300";

            const badgeBg = isAllMapped
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
              : isCritical
                ? "bg-rose-950/80 text-rose-300 border-rose-700/60"
                : "bg-amber-950/80 text-amber-300 border-amber-700/60";

            const barColor = isAllMapped
              ? "bg-emerald-400"
              : isCritical
                ? "bg-rose-400"
                : "bg-amber-400";

            const badgeText = isAllMapped ? "100% Pinned" : `${stats.unmapped} Unpinned`;

            return (
              <div className="w-full rounded-xl border border-emerald-900/80 bg-[#052e16]/95 p-3.5 text-white shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {icon}
                    <p className={cn("truncate text-xs font-bold", titleColor)}>
                      {isAllMapped
                        ? "All records mapped"
                        : `${stats.unmapped} ${stats.unmapped === 1 ? "record missing" : "records missing"} pin`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold tracking-wider uppercase",
                      badgeBg,
                    )}
                  >
                    {badgeText}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-100/75">
                  {isAllMapped
                    ? "Full spatial coverage on terrain. All items plotted."
                    : "Actionable in the table below. Add coordinates during dispatch triage."}
                </p>

                {/* Spatial Coverage Progress Bar */}
                <div className="mt-2.5 flex flex-col gap-1 border-t border-emerald-900/60 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-300/80">
                    <span>Spatial Resolution</span>
                    <span className="font-bold text-emerald-100 tabular-nums">
                      {pct}% ({stats.mapped}/{stats.total})
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full border border-emerald-900/80 bg-slate-950">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        barColor,
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Standard Admin ResourceTable (Identical Design to /admin/households)  */}
      {/* -------------------------------------------------------------------- */}
      <ResourceTable
        columns={columns}
        data={tableFilteredItems}
        isLoading={isLoading || isFetching}
        loadingLabel={
          mode === "rescue" ? "Loading rescue queue" : "Loading incident reports"
        }
        isError={isError}
        onRetry={refetch}
        getRowKey={(row) => row.id}
        searchPlaceholder={
          mode === "rescue"
            ? "Search requester, contact, area, landmarks…"
            : "Search hazard, reporter, area, landmarks…"
        }
        filterSlots={
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select value={tableStatus} onValueChange={setTableStatus}>
              <SelectTrigger className="inline-flex h-9 w-fit min-w-[125px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                <SlidersHorizontal className="size-3 shrink-0 text-emerald-600" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-44">
                <SelectItem value="all">All Statuses</SelectItem>
                {(mode === "rescue" ? rescueStatuses : incidentStatuses).map((s) => (
                  <SelectItem key={s} value={s}>
                    {label(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter (for rescue mode) */}
            {mode === "rescue" ? (
              <Select value={tablePriority} onValueChange={setTablePriority}>
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[125px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                  <SlidersHorizontal className="size-3 shrink-0 text-emerald-600" />
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-44">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="1">Priority 1 (Critical)</SelectItem>
                  <SelectItem value="2">Priority 2 (High)</SelectItem>
                  <SelectItem value="3">Priority 3 (Moderate)</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {/* Area Filter */}
            <Select value={tableArea} onValueChange={setTableArea}>
              <SelectTrigger className="inline-flex h-9 w-fit min-w-[120px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40">
                <SlidersHorizontal className="size-3 shrink-0 text-emerald-600" />
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-40">
                <SelectItem value="all">All Areas</SelectItem>
                {SAN_JOSE_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        toolbarAction={
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="primary"
            className="h-9 shrink-0 cursor-pointer gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            {mode === "rescue" ? "Record Rescue Request" : "Report Incident"}
          </Button>
        }
        rowActions={(row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedTableId(row.id)}
            className="h-8 gap-1 rounded-lg border-neutral-300 px-2.5 text-xs font-bold shadow-2xs hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-950"
          >
            <Eye className="size-3.5" />
            Triage & Review
          </Button>
        )}
      />

      {/* -------------------------------------------------------------------- */}
      {/* Record Inspection & Triage Modal Dialog (Decoupled from Map)         */}
      {/* -------------------------------------------------------------------- */}
      <Dialog
        open={Boolean(selectedTableId)}
        onOpenChange={(open) => !open && setSelectedTableId(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl sm:max-w-2xl"
        >
          <DialogHeader className="relative shrink-0 border-b border-neutral-100 bg-emerald-950 p-5 text-white sm:p-6">
            {/* High-contrast close button */}
            <button
              type="button"
              onClick={() => setSelectedTableId(null)}
              className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-md transition-colors hover:bg-white/20"
              title="Close dialog"
            >
              <X className="size-4 text-white" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <span className="text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase">
                {mode === "rescue" ? "Rescue Request Record" : "Incident Report Record"}
              </span>
              {current ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    badgeClass(current.status),
                  )}
                >
                  {label(current.status)}
                </span>
              ) : null}
            </div>
            <DialogTitle className="mt-2 pr-8 text-xl font-black text-white">
              {current ? titleOf(mode, current) : "Loading details…"}
            </DialogTitle>
            <DialogDescription className="pr-8 text-xs text-emerald-200/80">
              {current?.event_name
                ? `Associated with ${current.event_name}`
                : "General intake incident record"}
            </DialogDescription>
          </DialogHeader>

          {current ? (
            <>
              <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 text-sm sm:p-6">
                {/* Static Non-Interactable Mini Map Preview */}
                {current.location ? (
                  <div className="relative">
                    <MiniMapPreview
                      latitude={current.location.coordinates[1]}
                      longitude={current.location.coordinates[0]}
                      label={
                        mode === "rescue" && "priority" in current
                          ? String(current.priority ?? "●")
                          : "●"
                      }
                      tone={statusTone(current.status)}
                      className="h-44 w-full sm:h-52"
                    />
                    {/* Directions button overlaid on map top-right */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${current.location.coordinates[1]},${current.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Google Maps Directions"
                      className="absolute top-2 right-2 z-[1000] inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-emerald-600"
                    >
                      <Navigation className="size-3 text-white" />
                      Directions
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-4 text-center text-xs text-neutral-500">
                    <MapPinOff className="size-4 text-neutral-400" />
                    No GPS coordinates tagged for this record. Use landmarks for field
                    response.
                  </div>
                )}

                {/* Photo attachment if present */}
                {"photo_url" in current && current.photo_url ? (
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 shadow-inner">
                    <div
                      className="group relative h-56 w-full cursor-pointer sm:h-64"
                      onClick={() => setLightboxPhoto(current.photo_url)}
                    >
                      <Image
                        src={current.photo_url}
                        alt="Incident attachment"
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/85 px-2.5 py-1 text-[11px] font-bold text-emerald-200 shadow-lg backdrop-blur-md transition-colors group-hover:bg-emerald-900">
                        <Maximize2 className="size-3.5 text-emerald-400" />
                        Expand Photo
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Requester & Contact + Location Details — compact horizontal strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-2.5 text-xs">
                  {/* Name */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      By
                    </span>
                    <span className="truncate font-bold text-neutral-900">
                      {"requester_name" in current
                        ? current.requester_name
                        : current.reported_by_name || "Anonymous Resident"}
                    </span>
                  </div>

                  {/* Phone */}
                  {"contact_number" in current && current.contact_number ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Phone className="size-3 text-neutral-400" />
                      <span className="font-mono text-neutral-700">
                        {current.contact_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if ("contact_number" in current && current.contact_number) {
                            navigator.clipboard.writeText(current.contact_number);
                            setCopiedPhone(true);
                            setTimeout(() => setCopiedPhone(false), 2000);
                          }
                        }}
                        title={copiedPhone ? "Copied!" : "Copy"}
                        className={cn(
                          "flex size-5 cursor-pointer items-center justify-center rounded border transition-all",
                          copiedPhone
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100",
                        )}
                      >
                        {copiedPhone ? (
                          <Check className="size-2.5" />
                        ) : (
                          <Copy className="size-2.5" />
                        )}
                      </button>
                      <a
                        href={`tel:${current.contact_number}`}
                        title="Call"
                        className="flex size-5 cursor-pointer items-center justify-center rounded bg-emerald-600 text-white transition hover:bg-emerald-700"
                      >
                        <Phone className="size-2.5" />
                      </a>
                    </div>
                  ) : (
                    <span className="shrink-0 text-neutral-400 italic">No phone</span>
                  )}

                  {/* Divider */}
                  <span className="shrink-0 text-neutral-300 select-none">|</span>

                  {/* Area */}
                  <div className="flex min-w-0 items-center gap-1">
                    <MapPin className="size-3 shrink-0 text-emerald-700" />
                    <span className="truncate font-bold text-neutral-900">
                      {("location_area_name" in current && current.location_area_name) ||
                        current.area_name ||
                        "Area Unknown"}
                    </span>
                  </div>

                  {/* Landmark */}
                  {current.location_note ? (
                    <span className="max-w-[200px] truncate text-neutral-500">
                      {current.location_note}
                    </span>
                  ) : null}

                  {/* Unmapped pill (only if no GPS) */}
                  {!current.location ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      <MapPinOff className="size-3 text-neutral-400" />
                      Unmapped
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                  <p className="mb-1 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    Report Description
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-700">
                    {current.description || "No specific details provided."}
                  </p>
                </div>
              </div>

              {/* Fixed Lifecycle Triage Actions — Modal: all buttons in a single row */}
              <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-100 bg-neutral-50/90 px-4 py-3 shadow-xs sm:px-6">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                  Operational Lifecycle Actions
                </p>

                {/* Single row: all actions side-by-side */}
                <div className="flex items-center gap-2">
                  {/* Progression */}
                  {current.status === "pending" ? (
                    <Button
                      variant="secondary"
                      className="flex-1 cursor-pointer border border-amber-300 bg-amber-100 px-3 text-xs font-bold text-amber-950 shadow-2xs hover:bg-amber-200"
                      onClick={() => updateStatus("verified")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5 shrink-0 text-amber-700" />
                      Verify Request
                    </Button>
                  ) : current.status === "verified" ? (
                    <Button
                      variant="primary"
                      className="flex-1 cursor-pointer bg-sky-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-sky-700"
                      onClick={() =>
                        updateStatus(mode === "rescue" ? "dispatched" : "in_progress")
                      }
                    >
                      <Truck className="mr-1.5 size-3.5 shrink-0" />
                      {mode === "rescue" ? "Dispatch Team" : "Mark In Progress"}
                    </Button>
                  ) : null}

                  {/* Mark Resolved */}
                  {current.status !== "resolved" && current.status !== "dismissed" ? (
                    <Button
                      variant="primary"
                      className="flex-1 cursor-pointer bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
                      onClick={() => updateStatus("resolved")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5 shrink-0" />
                      Mark Resolved
                    </Button>
                  ) : null}

                  {/* Dismiss */}
                  {current.status !== "dismissed" && current.status !== "resolved" ? (
                    <Button
                      variant="outline"
                      className="shrink-0 cursor-pointer border-rose-300 bg-rose-50/60 px-4 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100"
                      onClick={() => updateStatus("dismissed")}
                    >
                      <XCircle className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                      Dismiss
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-neutral-400">
              Select a record to inspect its operational timeline.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* Map Pin Inspection Drawer (Sheet for Map Selection)                  */}
      {/* -------------------------------------------------------------------- */}
      <Sheet
        open={Boolean(selectedMapId)}
        onOpenChange={(open) => !open && setSelectedMapId(null)}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full w-full flex-col gap-0 overflow-hidden border-l border-neutral-200 bg-white p-0 text-slate-900 shadow-2xl sm:max-w-md"
        >
          <SheetHeader className="relative shrink-0 border-b border-neutral-100 bg-emerald-950 p-5 text-white sm:p-6">
            {/* High-contrast close button */}
            <button
              type="button"
              onClick={() => setSelectedMapId(null)}
              className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-md transition-colors hover:bg-white/20"
              title="Close drawer"
            >
              <X className="size-4 text-white" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <span className="text-[10.5px] font-bold tracking-widest text-emerald-300 uppercase">
                {mode === "rescue" ? "Rescue Request Record" : "Incident Report Record"}
              </span>
              {current ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    badgeClass(current.status),
                  )}
                >
                  {label(current.status)}
                </span>
              ) : null}
            </div>
            <SheetTitle className="mt-2 pr-8 text-xl font-black text-white">
              {current ? titleOf(mode, current) : "Loading details…"}
            </SheetTitle>
            <SheetDescription className="pr-8 text-xs text-emerald-200/80">
              {current?.event_name
                ? `Associated with ${current.event_name}`
                : "Live terrain-pinned incident record"}
            </SheetDescription>
          </SheetHeader>

          {current ? (
            <>
              <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 text-sm sm:p-6">
                {/* Mini Map Preview with Directions overlay */}
                {current.location ? (
                  <div className="relative">
                    <MiniMapPreview
                      latitude={current.location.coordinates[1]}
                      longitude={current.location.coordinates[0]}
                      label={
                        mode === "rescue" && "priority" in current
                          ? String(current.priority ?? "●")
                          : "●"
                      }
                      tone={statusTone(current.status)}
                      className="h-44 w-full sm:h-52"
                    />
                    {/* Directions button overlaid on map top-right */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${current.location.coordinates[1]},${current.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Google Maps Directions"
                      className="absolute top-2 right-2 z-[1000] inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-emerald-600"
                    >
                      <Navigation className="size-3 text-white" />
                      Directions
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-4 text-center text-xs text-neutral-500">
                    <MapPinOff className="size-4 text-neutral-400" />
                    No GPS coordinates tagged for this record. Use landmarks for field
                    response.
                  </div>
                )}

                {/* Photo attachment if present */}
                {"photo_url" in current && current.photo_url ? (
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 shadow-inner">
                    <div
                      className="group relative h-56 w-full cursor-pointer sm:h-64"
                      onClick={() => setLightboxPhoto(current.photo_url)}
                    >
                      <Image
                        src={current.photo_url}
                        alt="Incident attachment"
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/85 px-2.5 py-1 text-[11px] font-bold text-emerald-200 shadow-lg backdrop-blur-md transition-colors group-hover:bg-emerald-900">
                        <Maximize2 className="size-3.5 text-emerald-400" />
                        Expand Photo
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Requester & Contact + Location Details — compact horizontal strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-2.5 text-xs">
                  {/* Name */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      By
                    </span>
                    <span className="truncate font-bold text-neutral-900">
                      {"requester_name" in current
                        ? current.requester_name
                        : current.reported_by_name || "Anonymous Resident"}
                    </span>
                  </div>

                  {/* Phone */}
                  {"contact_number" in current && current.contact_number ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Phone className="size-3 text-neutral-400" />
                      <span className="font-mono text-neutral-700">
                        {current.contact_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if ("contact_number" in current && current.contact_number) {
                            navigator.clipboard.writeText(current.contact_number);
                            setCopiedPhone(true);
                            setTimeout(() => setCopiedPhone(false), 2000);
                          }
                        }}
                        title={copiedPhone ? "Copied!" : "Copy"}
                        className={cn(
                          "flex size-5 cursor-pointer items-center justify-center rounded border transition-all",
                          copiedPhone
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100",
                        )}
                      >
                        {copiedPhone ? (
                          <Check className="size-2.5" />
                        ) : (
                          <Copy className="size-2.5" />
                        )}
                      </button>
                      <a
                        href={`tel:${current.contact_number}`}
                        title="Call"
                        className="flex size-5 cursor-pointer items-center justify-center rounded bg-emerald-600 text-white transition hover:bg-emerald-700"
                      >
                        <Phone className="size-2.5" />
                      </a>
                    </div>
                  ) : (
                    <span className="shrink-0 text-neutral-400 italic">No phone</span>
                  )}

                  {/* Divider */}
                  <span className="shrink-0 text-neutral-300 select-none">|</span>

                  {/* Area */}
                  <div className="flex min-w-0 items-center gap-1">
                    <MapPin className="size-3 shrink-0 text-emerald-700" />
                    <span className="truncate font-bold text-neutral-900">
                      {("location_area_name" in current && current.location_area_name) ||
                        current.area_name ||
                        "Area Unknown"}
                    </span>
                  </div>

                  {/* Landmark */}
                  {current.location_note ? (
                    <span className="max-w-[180px] truncate text-neutral-500">
                      {current.location_note}
                    </span>
                  ) : null}

                  {/* Unmapped pill (only if no GPS) */}
                  {!current.location ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      <MapPinOff className="size-3 text-neutral-400" />
                      Unmapped
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                  <p className="mb-1 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                    Report Description
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-700">
                    {current.description || "No specific details provided."}
                  </p>
                </div>
              </div>

              {/* Fixed Lifecycle Triage Actions (2-Row Layout: Progression/Resolve on Row 1, Centered Dismiss on Row 2) */}
              <div className="flex shrink-0 flex-col gap-2.5 border-t border-neutral-100 bg-neutral-50/90 p-4 shadow-xs sm:p-5">
                <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                  Operational Lifecycle Actions
                </p>

                {/* Row 1: Progression & Resolution Actions */}
                <div
                  className={cn(
                    "grid gap-2",
                    current.status === "pending" || current.status === "verified"
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1",
                  )}
                >
                  {/* Progression Button (Verify Request or Dispatch Team / Mark In Progress) */}
                  {current.status === "pending" ? (
                    <Button
                      variant="secondary"
                      className="w-full cursor-pointer border border-amber-300 bg-amber-100 px-3 text-xs font-bold text-amber-950 shadow-2xs hover:bg-amber-200"
                      onClick={() => updateStatus("verified")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5 shrink-0 text-amber-700" />
                      Verify Request
                    </Button>
                  ) : current.status === "verified" ? (
                    <Button
                      variant="primary"
                      className="w-full cursor-pointer bg-sky-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-sky-700"
                      onClick={() =>
                        updateStatus(mode === "rescue" ? "dispatched" : "in_progress")
                      }
                    >
                      <Truck className="mr-1.5 size-3.5 shrink-0" />
                      {mode === "rescue" ? "Dispatch Team" : "Mark In Progress"}
                    </Button>
                  ) : null}

                  {/* Mark Resolved Button */}
                  {current.status !== "resolved" && current.status !== "dismissed" ? (
                    <Button
                      variant="primary"
                      className="w-full cursor-pointer bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
                      onClick={() => updateStatus("resolved")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5 shrink-0" />
                      Mark Resolved
                    </Button>
                  ) : null}
                </div>

                {/* Row 2: Dismiss Button (Centered) */}
                {current.status !== "dismissed" && current.status !== "resolved" ? (
                  <div className="flex justify-center pt-0.5">
                    <Button
                      variant="outline"
                      className="w-full min-w-[140px] cursor-pointer border-rose-300 bg-rose-50/60 px-4 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 sm:w-auto"
                      onClick={() => updateStatus("dismissed")}
                    >
                      <XCircle className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-neutral-400">
              Select a pin to inspect its operational timeline.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* -------------------------------------------------------------------- */}
      {/* Custom Resolution / Dismissal Note Modal                             */}
      {/* -------------------------------------------------------------------- */}
      <Dialog
        open={Boolean(pendingResolutionStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingResolutionStatus(null);
            setResolutionNoteInput("");
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl"
        >
          <DialogHeader
            className={cn(
              "relative shrink-0 border-b p-5 text-white",
              pendingResolutionStatus === "resolved"
                ? "border-emerald-900 bg-emerald-950"
                : "border-rose-900 bg-rose-950",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setPendingResolutionStatus(null);
                setResolutionNoteInput("");
              }}
              className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-md transition-colors hover:bg-white/20"
              title="Close modal"
            >
              <X className="size-4 text-white" />
            </button>

            <div className="flex items-center gap-2 pr-8 text-[10.5px] font-bold tracking-widest uppercase">
              {pendingResolutionStatus === "resolved" ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span className="text-emerald-300">Resolve Case Record</span>
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-rose-400" />
                  <span className="text-rose-300">Dismiss Case Record</span>
                </>
              )}
            </div>
            <DialogTitle className="mt-1 pr-8 text-lg font-black text-white">
              {pendingResolutionStatus === "resolved"
                ? "Record Operational Resolution"
                : "Record Dismissal Rationale"}
            </DialogTitle>
            <DialogDescription className="pr-8 text-xs text-white/80">
              {pendingResolutionStatus === "resolved"
                ? "Document the actions taken, evacuation destination, or emergency resolution details."
                : "Provide a reason for dismissing this record (e.g. duplicate, invalid call, test intake)."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmResolution();
            }}
            className="flex flex-col gap-4 p-5 text-xs"
          >
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-neutral-800">
                {pendingResolutionStatus === "resolved"
                  ? "Resolution Summary *"
                  : "Dismissal Reason *"}
              </label>
              <textarea
                required
                rows={3}
                autoFocus
                value={resolutionNoteInput}
                onChange={(e) => setResolutionNoteInput(e.target.value)}
                placeholder={
                  pendingResolutionStatus === "resolved"
                    ? "e.g. Safely evacuated 4 individuals to Kasiglahan Evacuation Center."
                    : "e.g. Verified with requester — duplicate request already dispatched."
                }
                className="w-full rounded-xl border border-neutral-300 p-3 text-xs leading-relaxed text-neutral-900 shadow-2xs placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingResolutionStatus(null);
                  setResolutionNoteInput("");
                }}
                disabled={patch.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className={cn(
                  "font-bold text-white shadow-xs",
                  pendingResolutionStatus === "resolved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700",
                )}
                disabled={patch.isPending}
              >
                {patch.isPending
                  ? "Saving…"
                  : pendingResolutionStatus === "resolved"
                    ? "Confirm Resolution"
                    : "Confirm Dismissal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* -------------------------------------------------------------------- */}
      {/* Lightbox Modal for Photo Attachments                                 */}
      {/* -------------------------------------------------------------------- */}
      <Dialog
        open={Boolean(lightboxPhoto)}
        onOpenChange={(open) => !open && setLightboxPhoto(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-4xl gap-0 overflow-hidden rounded-2xl border border-emerald-500/40 bg-[#031d10] p-0 text-white shadow-2xl"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-emerald-800/60 bg-emerald-950/95 px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <Camera className="size-4 text-emerald-400" />
              <span>Incident Field Photo Capture</span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-md transition-colors hover:bg-white/20"
              title="Close viewer"
            >
              <X className="size-4 text-white" />
            </button>
          </div>

          {/* Full Photo Container */}
          <div className="relative flex h-[65vh] w-full items-center justify-center bg-black/70 p-2">
            {lightboxPhoto ? (
              <Image
                src={lightboxPhoto}
                alt="Full resolution incident photo"
                fill
                unoptimized
                className="object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* Manual Record Creation Modals                                        */}
      {/* -------------------------------------------------------------------- */}
      {mode === "rescue" ? (
        <RescueCreationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      ) : (
        <IncidentCreationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      )}
    </div>
  );
}
