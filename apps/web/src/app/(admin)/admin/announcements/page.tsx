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
  AnnouncementForm,
  type AnnouncementFormValues,
} from "@/components/features/admin/announcement-form";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

/** Announcements & alerts (FR-ALT-*). Admin and SK officer. */

interface Announcement {
  id: string;
  kind: "announcement" | "alert";
  type: string;
  title: string;
  published_at: string | null;
  deactivated_at: string | null;
  is_active: boolean;
  area_names: string[];
  issued_by_name: string;
}
interface Area {
  id: string;
  name: string;
}

const emptyValues: AnnouncementFormValues = {
  kind: "announcement",
  type: "general",
  title: "",
  excerpt: "",
  body_json: emptyArticleDocument,
  instruction: "",
  is_barangay_wide: true,
  area_ids: [],
  expires_at: "",
  publication_status: "draft",
};

export default function AdminAnnouncementsPage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => api.get<Announcement[]>("/admin/announcements").then((r) => r.data),
  });
  const { data: areas } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      api.post("/admin/announcements", {
        ...values,
        instruction: values.instruction || null,
        severity: values.severity || null,
        alert_level: values.alert_level || null,
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      }),
    onSuccess: (response) => {
      toast.success("Draft created. Add a cover image before publishing.");
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setCreateOpen(false);
      router.push(`/admin/announcements/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      toast.success("Announcement deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });

  const columns: ResourceColumn<Announcement>[] = [
    { key: "title", header: "Title" },
    { key: "kind", header: "Kind" },
    { key: "type", header: "Type" },
    {
      key: "published_at",
      header: "Published",
      render: (row) => (row.published_at ? formatPhtDateTime(row.published_at) : "Draft"),
    },
    {
      key: "area_names",
      header: "Areas",
      render: (row) =>
        row.area_names.length > 0 ? row.area_names.join(", ") : "Barangay-wide",
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        titleAccent="& alerts"
        description="Publishing here is the only way a public alert reaches the site — nothing is ever automated (D-4)."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden className="size-4" />
            Publish
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish an announcement or alert</DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            areas={areas ?? []}
            defaultValues={emptyValues}
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
        emptyTitle="No announcements yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/announcements/${row.id}` as Route}>Edit</Link>
            </Button>
            {row.is_active ? (
              <ConfirmDeleteButton
                itemLabel={row.title}
                actionLabel="Deactivate"
                confirmLabel="Deactivate"
                onConfirm={() => deactivateMutation.mutate(row.id)}
              />
            ) : null}
          </>
        )}
      />
    </div>
  );
}
