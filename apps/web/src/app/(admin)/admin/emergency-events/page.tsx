"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CircleCheck, Map, Plus, Siren, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent } from "@/components/common/card";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { AccountedForPanel } from "@/components/features/safety/accounted-for-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, toDisplayError } from "@/lib/api/client";
import type {
  AccountedForOut,
  EmergencyEventOut,
  EmergencyWorkspaceOut,
} from "@/lib/api/safety-types";
import { useRequireRole } from "@/lib/auth/use-require-role";

const EmergencyResponseMap = dynamic(
  () =>
    import("@/components/features/safety/emergency-response-map").then(
      (module) => module.EmergencyResponseMap,
    ),
  { ssr: false, loading: () => <WorkspaceLoading label="Loading response map…" /> },
);

const eventTypes = ["flood", "earthquake", "typhoon", "fire", "other"] as const;
const tabs = ["overview", "map", "accounted-for"] as const;
type Tab = (typeof tabs)[number];

const declareSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(eventTypes),
});

const declareFields: AdminField[] = [
  {
    name: "name",
    label: "Event name",
    type: "text",
    placeholder: "Continuous Heavy Rainfall — Riverside Areas",
  },
  {
    name: "type",
    label: "Type",
    type: "select",
    options: eventTypes.map((type) => ({
      value: type,
      label: type[0].toUpperCase() + type.slice(1),
    })),
  },
];

export default function AdminEmergencyEventsPage() {
  const { user } = useRequireRole("admin", "bhw", "sk");
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("event");
  const requestedTab = searchParams.get("tab");
  const tab: Tab = tabs.includes(requestedTab as Tab)
    ? (requestedTab as Tab)
    : "overview";
  const canManageEvents = user?.role === "admin" || user?.role === "superadmin";
  const canSeePii = user?.role !== "sk";

  const eventsQuery = useQuery({
    queryKey: ["admin", "emergency-events"],
    queryFn: () =>
      api
        .get<{ items: EmergencyEventOut[] }>("/admin/emergency-events", {
          params: { size: 100 },
        })
        .then((response) => response.data.items),
  });
  const events = React.useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const activeCount = events.filter((event) => event.is_active).length;

  React.useEffect(() => {
    if (events.length === 0 || selected) return;
    const initial = events.find((event) => event.is_active) ?? events[0];
    const safeTab = !canSeePii && tab === "map" ? "overview" : tab;
    router.replace(`/admin/emergency-events?event=${initial.id}&tab=${safeTab}`);
  }, [canSeePii, events, router, selected, tab]);

  React.useEffect(() => {
    if (!canSeePii && selected && tab === "map") {
      router.replace(`/admin/emergency-events?event=${selected.id}&tab=overview`);
    }
  }, [canSeePii, router, selected, tab]);

  const workspaceQuery = useQuery({
    queryKey: ["admin", "emergency-workspace", selected?.id],
    queryFn: () =>
      api
        .get<EmergencyWorkspaceOut>(`/admin/emergency-events/${selected!.id}/workspace`)
        .then((response) => response.data),
    enabled: Boolean(selected && canSeePii && (tab === "map" || tab === "overview")),
  });
  const accountedQuery = useQuery({
    queryKey: ["admin", "accounted-for", selected?.id],
    queryFn: () =>
      api
        .get<AccountedForOut>("/admin/accounted-for", {
          params: { event_id: selected!.id },
        })
        .then((response) => response.data),
    enabled: Boolean(selected && tab === "accounted-for"),
    refetchInterval: selected?.is_active ? 15_000 : false,
  });

  const invalidateOperations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-events"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "emergency-workspace"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "accounted-for"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "evacuation-centers"] }),
      queryClient.invalidateQueries({ queryKey: ["portal", "safety"] }),
    ]);
  };

  const declareMutation = useMutation({
    mutationFn: (values: z.infer<typeof declareSchema>) =>
      api.post<EmergencyEventOut>("/admin/emergency-events", values),
    onSuccess: async ({ data }) => {
      toast.success("Emergency event declared");
      await invalidateOperations();
      router.replace(`/admin/emergency-events?event=${data.id}&tab=overview`);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  const endMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<EmergencyEventOut>(`/admin/emergency-events/${id}/end`),
    onSuccess: async ({ data }) => {
      toast.success(
        data.occupancy_reset_count > 0
          ? `Event ended; ${data.occupancy_reset_count} evacuees checked out`
          : "Event ended; physical occupancy preserved",
      );
      await invalidateOperations();
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const setSelection = (eventId: string, nextTab: Tab = tab) => {
    router.replace(`/admin/emergency-events?event=${eventId}&tab=${nextTab}`);
  };

  const columns: ResourceColumn<EmergencyEventOut>[] = [
    { key: "name", header: "Name" },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (
        <Badge tone={row.is_active ? "danger" : "neutral"}>
          {row.is_active ? "Active" : "Ended"}
        </Badge>
      ),
    },
    {
      key: "started_at",
      header: "Started",
      render: (row) => new Date(row.started_at).toLocaleString(),
    },
    {
      key: "declared_by_name",
      header: "Declared by",
      render: (row) => row.declared_by_name ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Emergency Events"
        description="Select an event to manage household safety, the response map, walk-ins, and evacuation occupancy. Concurrent events stay isolated."
        action={
          canManageEvents ? (
            <ResourceFormDialog
              title="Declare emergency event"
              fields={declareFields}
              schema={declareSchema}
              defaultValues={{ name: "", type: "flood" as const }}
              onSubmit={async (values) => {
                await declareMutation.mutateAsync(values);
              }}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  Declare event
                </Button>
              }
            />
          ) : undefined
        }
      />

      {eventsQuery.isLoading ? (
        <WorkspaceLoading label="Loading emergency events…" />
      ) : eventsQuery.isError ? (
        <WorkspaceError
          label="Emergency events could not be loaded."
          onRetry={() => eventsQuery.refetch()}
        />
      ) : events.length === 0 ? (
        <Card radius="lg">
          <CardContent className="py-12 text-center">
            <Siren className="mx-auto mb-3 size-8 text-neutral-400" />
            <h2 className="font-semibold">No emergency events yet</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Declare the first event to open the response workspace.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card radius="lg">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-neutral-600">
                Selected emergency event
                <select
                  value={selected?.id ?? ""}
                  onChange={(event) => setSelection(event.target.value)}
                  className="focus-visible:ring-primary-500 min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <optgroup label="Active events">
                    {events
                      .filter((event) => event.is_active)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name} · {event.type}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="History">
                    {events
                      .filter((event) => !event.is_active)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name} · ended
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>
              {selected ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={selected.is_active ? "danger" : "neutral"}>
                    {selected.is_active ? "Active" : "Read-only history"}
                  </Badge>
                  {selected.is_active && canManageEvents ? (
                    <EndEventDialog
                      event={selected}
                      activeCount={activeCount}
                      pending={endMutation.isPending}
                      onConfirm={() => endMutation.mutate(selected.id)}
                    />
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {selected ? (
            <>
              <nav
                aria-label="Emergency workspace"
                className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1"
              >
                <WorkspaceTab
                  active={tab === "overview"}
                  icon={Activity}
                  onClick={() => setSelection(selected.id, "overview")}
                >
                  Overview
                </WorkspaceTab>
                {canSeePii ? (
                  <WorkspaceTab
                    active={tab === "map"}
                    icon={Map}
                    onClick={() => setSelection(selected.id, "map")}
                  >
                    Map
                  </WorkspaceTab>
                ) : null}
                <WorkspaceTab
                  active={tab === "accounted-for"}
                  icon={CircleCheck}
                  onClick={() => setSelection(selected.id, "accounted-for")}
                >
                  Accounted For
                </WorkspaceTab>
              </nav>

              {tab === "overview" ? (
                <Overview
                  event={selected}
                  activeCount={activeCount}
                  workspace={workspaceQuery.data}
                  canSeePii={canSeePii}
                  loading={workspaceQuery.isLoading}
                  error={workspaceQuery.isError}
                  retry={() => workspaceQuery.refetch()}
                  columns={columns}
                  events={events}
                  setSelection={setSelection}
                />
              ) : null}
              {tab === "map" && canSeePii ? (
                workspaceQuery.isLoading ? (
                  <WorkspaceLoading label="Loading household response data…" />
                ) : workspaceQuery.isError ? (
                  <WorkspaceError
                    label="The response map could not be loaded."
                    onRetry={() => workspaceQuery.refetch()}
                  />
                ) : workspaceQuery.data ? (
                  <EmergencyResponseMap data={workspaceQuery.data} />
                ) : null
              ) : null}
              {tab === "accounted-for" ? (
                accountedQuery.isLoading ? (
                  <WorkspaceLoading label="Loading Accounted For…" />
                ) : accountedQuery.isError ? (
                  <WorkspaceError
                    label="The selected event summary could not be loaded."
                    onRetry={() => accountedQuery.refetch()}
                  />
                ) : accountedQuery.data ? (
                  <AccountedForPanel data={accountedQuery.data} />
                ) : null
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function Overview({
  event,
  activeCount,
  workspace,
  canSeePii,
  loading,
  error,
  retry,
  columns,
  events,
  setSelection,
}: {
  event: EmergencyEventOut;
  activeCount: number;
  workspace?: EmergencyWorkspaceOut;
  canSeePii: boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
  columns: ResourceColumn<EmergencyEventOut>[];
  events: EmergencyEventOut[];
  setSelection: (id: string, tab?: Tab) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStat icon={Siren} label="Concurrent active events" value={activeCount} />
        <OverviewStat
          icon={Users}
          label="Households in scope"
          value={canSeePii ? (workspace?.households.length ?? "—") : "Aggregate only"}
        />
        <OverviewStat
          icon={CircleCheck}
          label="Households fully safe"
          value={
            canSeePii
              ? (workspace?.households.filter((household) => household.all_safe).length ??
                "—")
              : "See Accounted For"
          }
        />
        <OverviewStat
          icon={Map}
          label="Unmapped households"
          value={canSeePii ? (workspace?.unmapped_household_count ?? "—") : "Restricted"}
        />
      </div>
      {canSeePii && loading ? (
        <WorkspaceLoading label="Loading event operations…" />
      ) : canSeePii && error ? (
        <WorkspaceError label="Event operations could not be loaded." onRetry={retry} />
      ) : null}
      <Card radius="lg">
        <CardContent className="p-4">
          <h2 className="mb-1 font-semibold text-neutral-900">Event lifecycle</h2>
          <p className="text-sm text-neutral-600">
            {event.is_active
              ? "Management actions are live for this event. Safety records and walk-ins must use this event ID."
              : `Ended ${event.ended_at ? new Date(event.ended_at).toLocaleString() : "—"}. This workspace is read-only.`}
          </p>
          {event.type === "flood" ? (
            <p className="text-primary-700 mt-2 text-sm">
              This flood is linked to Flood History and will finalize its peak reading
              when ended.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <ResourceTable
        columns={columns}
        data={events}
        isLoading={false}
        isError={false}
        emptyTitle="No emergency events"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <Button
            size="sm"
            variant={row.id === event.id ? "secondary" : "outline"}
            onClick={() => setSelection(row.id)}
          >
            {row.id === event.id ? "Selected" : "Open"}
          </Button>
        )}
      />
    </div>
  );
}

function WorkspaceTab({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: typeof Activity;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`focus-visible:ring-primary-500 flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${active ? "bg-primary-800 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Siren;
  label: string;
  value: string | number;
}) {
  return (
    <Card radius="lg">
      <CardContent className="flex items-center gap-3 py-4">
        <span className="bg-primary-50 text-primary-700 grid size-10 shrink-0 place-items-center rounded-full">
          <Icon className="size-5" />
        </span>
        <div>
          <b className="block text-xl text-neutral-900">{value}</b>
          <span className="text-xs text-neutral-500">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EndEventDialog({
  event,
  activeCount,
  pending,
  onConfirm,
}: {
  event: EmergencyEventOut;
  activeCount: number;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={pending}>
          End event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End {event.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {activeCount > 1
              ? `${activeCount - 1} other event(s) will remain active, so physical evacuation occupancy will be preserved.`
              : "This is the final active event. Every open evacuation check-in will be checked out and center occupancy will reset."}{" "}
            Historical safety and walk-in records remain available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            End event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <Card radius="lg">
      <CardContent className="animate-pulse py-10 text-center text-sm text-neutral-500">
        {label}
      </CardContent>
    </Card>
  );
}
function WorkspaceError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Card radius="lg">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-neutral-600">{label}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
