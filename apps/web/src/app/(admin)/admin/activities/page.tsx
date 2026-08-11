"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/common/page-header";
import {
  ActivityForm,
  type ActivityFormValues,
} from "@/components/features/admin/activity-form";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { emptyArticleDocument } from "@/components/features/admin/rich-text-editor";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

interface Activity {
  id: string;
  title: string;
  type: string;
  excerpt: string;
  starts_at: string;
  area_name: string | null;
  published_at: string | null;
  archived_at: string | null;
}
interface Area {
  id: string;
  name: string;
}
const emptyValues: ActivityFormValues = {
  title: "",
  excerpt: "",
  body_json: emptyArticleDocument,
  type: "drill",
  starts_at: "",
  ends_at: "",
  venue: "",
  area_id: "",
  publication_status: "draft",
};

export default function AdminActivitiesPage() {
  useRequireRole("admin", "sk");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "activities"],
    queryFn: () => api.get<Activity[]>("/admin/activities").then((r) => r.data),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });
  const createMutation = useMutation({
    mutationFn: (values: ActivityFormValues) =>
      api.post("/admin/activities", {
        ...values,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
        venue: values.venue || null,
        area_id: values.area_id || null,
        publication_status: "draft",
      }),
    onSuccess: (response) => {
      toast.success("Activity draft created. Add a cover image before publishing.");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
      setCreateOpen(false);
      router.push(`/admin/activities/${response.data.id}` as Route);
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/activities/${id}`),
    onSuccess: () => {
      toast.success("Activity removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
    },
  });
  const columns: ResourceColumn<Activity>[] = [
    { key: "title", header: "Title" },
    { key: "type", header: "Type" },
    {
      key: "starts_at",
      header: "When",
      render: (row) => formatPhtDateTime(row.starts_at),
    },
    {
      key: "area_name",
      header: "Area",
      render: (row) => row.area_name ?? "Barangay-wide",
    },
    {
      key: "published_at",
      header: "Status",
      render: (row) =>
        row.archived_at ? "Archived" : row.published_at ? "Published" : "Draft",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Community"
        titleAccent="activities"
        description="Create the public activity story, then add a cover image and publish when it is ready."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden className="size-4" />
            New activity
          </Button>
        }
      />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create activity draft</DialogTitle>
          </DialogHeader>
          <ActivityForm
            areas={areas}
            defaultValues={emptyValues}
            submitLabel="Create draft"
            showPublication={false}
            onSubmit={(values) =>
              createMutation.mutateAsync(values).then(() => undefined)
            }
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
        emptyTitle="No activities yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/activities/${row.id}` as Route}>Edit</Link>
            </Button>
            <ConfirmDeleteButton
              itemLabel={row.title}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
