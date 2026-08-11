"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import {
  DonationDriveForm,
  type DonationDriveFormValues,
} from "@/components/features/admin/donation-drive-form";
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
  excerpt: string;
  published_at: string | null;
  archived_at: string | null;
  active_from: string | null;
  active_until: string | null;
  drop_off_instructions: string | null;
}

export default function AdminDonationDrivesPage() {
  useRequireRole("admin");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "donation-drives"],
    queryFn: () => api.get<DonationDrive[]>("/admin/donation-drives").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: DonationDriveFormValues) =>
      api.post("/admin/donation-drives", {
        ...values,
        organizer_name: values.organizer_name || null,
        organizer_contact: values.organizer_contact || null,
        drop_off_instructions: values.drop_off_instructions || null,
        active_from: values.active_from
          ? new Date(values.active_from).toISOString()
          : null,
        active_until: values.active_until
          ? new Date(values.active_until).toISOString()
          : null,
        publication_status: "draft",
      }),
    onSuccess: (response) => {
      toast.success(
        "Donation notice draft created. Add a cover image before publishing.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "donation-drives"] });
      setCreateOpen(false);
      router.push(`/admin/donation-drives/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const columns: ResourceColumn<DonationDrive>[] = [
    { key: "title", header: "Title" },
    { key: "excerpt", header: "Preview" },
    {
      key: "published_at",
      header: "Status",
      render: (row) => (row.published_at ? "Published" : "Draft"),
    },
    {
      key: "drop_off_instructions",
      header: "Drop-off",
      render: (row) => row.drop_off_instructions ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Donation"
        titleAccent="drives"
        description="Informational calls for goods only. Donor records, quantities, and payment handling are out of scope."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden className="size-4" />
            New drive
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a donation drive</DialogTitle>
          </DialogHeader>
          <DonationDriveForm
            defaultValues={{
              title: "",
              excerpt: "",
              body_json: emptyArticleDocument,
              organizer_name: "",
              organizer_contact: "",
              drop_off_instructions: "",
              active_from: "",
              active_until: "",
              publication_status: "draft",
            }}
            submitLabel="Create draft"
            showPublication={false}
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
        rowActions={(row) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/donation-drives/${row.id}` as Route}>Edit</Link>
          </Button>
        )}
      />
    </div>
  );
}
