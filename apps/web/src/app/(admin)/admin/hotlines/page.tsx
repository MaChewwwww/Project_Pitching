"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ambulance,
  Building2,
  Check,
  Copy,
  Flame,
  Layers,
  LifeBuoy,
  Pencil,
  Phone,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  HotlineFormDialog,
  type HotlineEntity,
  type HotlineFormValues,
} from "@/components/features/admin/hotline-form-dialog";
import { HotlineViewDialog } from "@/components/features/admin/hotline-view-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { cn } from "@/lib/utils";

/** Emergency hotline directory (FR-SYS-014, FR-PUB-007). Admin and SK officer. */

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Phone; badge: string }
> = {
  barangay: {
    label: "Barangay / BHERT",
    icon: Building2,
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  mdrrmo: {
    label: "MDRRMO / Disaster",
    icon: ShieldAlert,
    badge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  police: {
    label: "Police (PNP)",
    icon: ShieldAlert,
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  fire: {
    label: "Fire Station (BFP)",
    icon: Flame,
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  hospital: {
    label: "Hospital / Medical",
    icon: Stethoscope,
    badge: "bg-teal-100 text-teal-800 border-teal-200",
  },
  ambulance: {
    label: "Ambulance / Health",
    icon: Ambulance,
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  rescue: {
    label: "Emergency / Rescue",
    icon: LifeBuoy,
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

function CopyNumberButton({ number }: { number: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(number);
    }
    setCopied(true);
    toast.success("Phone number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${number}`}
      aria-label={copied ? "Copied" : `Copy ${number}`}
      className={cn(
        "grid size-6 place-items-center rounded-md transition-colors cursor-pointer shrink-0",
        copied
          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 border border-neutral-200/80",
      )}
    >
      {copied ? <Check className="size-3 text-emerald-700" /> : <Copy className="size-3" />}
    </button>
  );
}

export default function AdminHotlinesPage() {
  useRequireRole("admin", "sk");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "hotlines"],
    queryFn: () => api.get<HotlineEntity[]>("/admin/hotlines").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: HotlineFormValues) => api.post("/admin/hotlines", values),
    onSuccess: () => {
      toast.success("Hotline added to directory");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: HotlineFormValues }) =>
      api.patch(`/admin/hotlines/${id}`, values),
    onSuccess: () => {
      toast.success("Hotline updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hotlines/${id}`),
    onSuccess: () => {
      toast.success("Hotline removed from directory");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  const metrics = React.useMemo(() => {
    const list = data ?? [];
    const total = list.length;
    const active = list.filter((h) => h.is_active).length;
    const municipal = list.filter((h) =>
      ["mdrrmo", "police", "fire", "hospital", "ambulance", "rescue"].includes(h.type),
    ).length;
    const bhertAndZonal = list.filter((h) => h.type === "barangay").length;
    const inactive = total - active;

    return {
      total,
      active,
      municipal,
      bhertAndZonal,
      inactive,
    };
  }, [data]);

  const columns: ResourceColumn<HotlineEntity>[] = [
    {
      key: "label",
      header: "Hotline Name / Service",
      render: (row) => {
        const config = TYPE_CONFIG[row.type] ?? {
          label: row.type,
          icon: Phone,
          badge: "bg-neutral-100 text-neutral-800 border-neutral-200",
        };
        const Icon = config.icon;

        return (
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200/80 shrink-0">
              <Icon className="size-4.5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-neutral-900 line-clamp-1">{row.label}</span>
              <span className="text-[11px] font-medium text-neutral-500">
                {config.label} • Order #{row.sort_order ?? 0}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "number",
      header: "Callable Phone Number",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-900 tracking-tight">
            {row.number}
          </span>
          <CopyNumberButton number={row.number} />
        </div>
      ),
    },
    {
      key: "type",
      header: "Classification",
      render: (row) => {
        const config = TYPE_CONFIG[row.type] ?? {
          label: row.type,
          icon: Phone,
          badge: "bg-neutral-100 text-neutral-800 border-neutral-200",
        };

        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide border",
              config.badge,
            )}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide border",
            row.is_active
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : "bg-neutral-100 text-neutral-600 border-neutral-200",
          )}
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Emergency Hotlines"
        description="Manage 24/7 emergency dispatch numbers, BHERT response teams, and zonal hotline contacts for Barangay San Jose."
        action={
          <HotlineFormDialog
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
          />
        }
      />

      {/* Summary KPI Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Callable Lines */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Active Hotlines
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100/80 text-emerald-700 shadow-2xs">
              <Phone className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.active}
            </span>
            <span className="text-xs font-semibold text-emerald-700">active lines</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Public Status:</span>
            <span className="font-bold text-emerald-800">24/7 Callable</span>
          </div>
        </div>

        {/* Card 2: Municipal & Disaster Response */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/20 to-orange-50/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Emergency & Municipal
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 text-rose-700 shadow-2xs">
              <ShieldAlert className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.municipal}
            </span>
            <span className="text-xs font-semibold text-rose-700">services</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rose-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Agencies:</span>
            <span className="font-bold text-neutral-800">MDRRMO, PNP, BFP, Hospital</span>
          </div>
        </div>

        {/* Card 3: BHERT & Zonal Hotlines */}
        <div className="flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
              BHERT & Zonal Areas
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
              <Users className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.bhertAndZonal}
            </span>
            <span className="text-xs font-semibold text-teal-700">barangay lines</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-teal-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Coverage:</span>
            <span className="font-bold text-neutral-800">Area 01 to Area 06</span>
          </div>
        </div>

        {/* Card 4: Directory Total & Health */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Directory Ledger
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 shadow-2xs">
              <Layers className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50 px-2 py-1.5 text-emerald-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Active
              </span>
              <span className="text-base font-black">{metrics.active}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200/70 bg-neutral-100 px-2 py-1.5 text-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                Inactive
              </span>
              <span className="text-base font-black">{metrics.inactive}</span>
            </div>
          </div>
        </div>
      </div>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search hotline label, phone number, category, or area..."
        filterChoices={(rows) => [
          {
            value: "status:active",
            label: "Active Hotlines Only",
            matches: (r) => r.is_active,
          },
          {
            value: "type:municipal",
            label: "Municipal & Emergency Services (MDRRMO, PNP, BFP, 911)",
            matches: (r) =>
              ["mdrrmo", "police", "fire", "hospital", "ambulance", "rescue"].includes(
                r.type,
              ),
          },
          {
            value: "type:bhert",
            label: "BHERT Health Response Teams",
            matches: (r) => r.label.toLowerCase().includes("bhert"),
          },
          {
            value: "type:zonal",
            label: "San Jose Proper & Zonal Lines",
            matches: (r) =>
              r.type === "barangay" && !r.label.toLowerCase().includes("bhert"),
          },
          {
            value: "status:inactive",
            label: "Inactive Hotlines",
            matches: (r) => !r.is_active,
          },
        ]}
        emptyTitle="No hotlines registered yet"
        emptyDescription="Add emergency contacts and BHERT response lines to populate the directory."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <HotlineViewDialog hotline={row} />

            <HotlineFormDialog
              hotline={row}
              onSubmit={async (values) => {
                await updateMutation.mutateAsync({ id: row.id, values });
              }}
              trigger={
                <Button
                  size="sm"
                  variant="warning"
                  className="h-8 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors px-2.5 gap-1.5 font-semibold text-xs cursor-pointer"
                  title="Edit hotline"
                  aria-label="Edit hotline"
                >
                  <Pencil aria-hidden className="size-3.5 shrink-0" />
                  <span className="md:hidden">Edit</span>
                </Button>
              }
            />

            <ConfirmDeleteButton
              itemLabel={row.label}
              actionLabel="Delete"
              confirmLabel="Delete Hotline"
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
