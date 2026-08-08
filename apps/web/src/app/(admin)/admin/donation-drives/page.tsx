"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import {
  DonationDriveForm,
  type DonationDriveFormValues,
} from "@/components/features/admin/donation-drive-form";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/** Donation drives (FR-DON-001, 009). Admin only. */

interface DonationDrive {
  id: string;
  title: string;
  status: "open" | "closed";
  overall_progress_pct: number;
  needs: {
    item_name: string;
    received_quantity: number;
    target_quantity: number;
    unit: string;
  }[];
}

export default function AdminDonationDrivesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "donation-drives"],
    queryFn: () => api.get<DonationDrive[]>("/admin/donation-drives").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: DonationDriveFormValues) =>
      api.post("/admin/donation-drives", {
        title: values.title,
        description: values.description || null,
        needs: values.needs.map((n, i) => ({ ...n, sort_order: i })),
      }),
    onSuccess: () => {
      toast.success("Donation drive created");
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
      setCreateOpen(false);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/donation-drives/${id}/close`),
    onSuccess: () => {
      toast.success("Drive closed");
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
    },
  });

  const columns: ResourceColumn<DonationDrive>[] = [
    { key: "title", header: "Title" },
    { key: "status", header: "Status" },
    {
      key: "overall_progress_pct",
      header: "Progress",
      render: (row) => `${row.overall_progress_pct}%`,
    },
    {
      key: "needs",
      header: "Items",
      render: (row) => row.needs.map((n) => n.item_name).join(", ") || "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Donation"
        titleAccent="drives"
        description="What the barangay is collecting, and how much has actually arrived. Update quantities received via the API's donation status endpoint as items come in."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden className="size-4" />
            New drive
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a donation drive</DialogTitle>
          </DialogHeader>
          <DonationDriveForm
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No donation drives yet"
        getRowKey={(row) => row.id}
        rowActions={(row) =>
          row.status === "open" ? (
            <ConfirmDeleteButton
              itemLabel={row.title}
              actionLabel="Close"
              confirmLabel="Close drive"
              onConfirm={() => closeMutation.mutate(row.id)}
            />
          ) : null
        }
      />
    </div>
  );
}
