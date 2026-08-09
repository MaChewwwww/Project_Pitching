"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { UnregisteredPersonForm } from "@/components/features/safety/unregistered-person-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { Page } from "@/lib/api/public-types";
import type { UnregisteredPersonOut } from "@/lib/api/safety-types";

/**
 * FR-SAF-012/013 — people the registry never captured, recorded with a name
 * and a location, nothing else (BR-5.10). Counted separately from
 * registered coverage everywhere in this platform, including here: this
 * list only ever shows unregistered persons, never a household.
 */
export default function AdminUnregisteredPersonsPage() {
  useRequireRole("admin", "bhw");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "unregistered-persons"],
    queryFn: () =>
      api
        .get<Page<UnregisteredPersonOut>>("/admin/unregistered-persons", {
          params: { size: 50 },
        })
        .then((r) => r.data),
  });

  const columns: ResourceColumn<UnregisteredPersonOut>[] = [
    { key: "full_name", header: "Name" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge kind="safety" status={row.status} setMethod="assisted" />
      ),
    },
    { key: "contact_number", header: "Contact", render: (row) => row.contact_number ?? "—" },
    {
      key: "location_note",
      header: "Location",
      render: (row) => row.location_note ?? (row.location ? "Pinned on map" : "—"),
    },
    { key: "recorded_by_name", header: "Recorded by", render: (row) => row.recorded_by_name ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Unregistered"
        titleAccent="persons"
        description="People the registry never captured — recorded with a name and a location, nothing else (FR-SAF-012). Kept separate from registered coverage figures everywhere (FR-SAF-013)."
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button">
                <UserPlus aria-hidden className="size-4" />
                Record person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record an unregistered person</DialogTitle>
              </DialogHeader>
              <UnregisteredPersonForm onDone={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <ResourceTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No unregistered persons recorded"
        emptyDescription="Record someone the registry doesn't cover as safe or needing rescue."
        getRowKey={(row) => row.id}
      />
    </div>
  );
}
