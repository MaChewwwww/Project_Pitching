"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/** Emergency hotline directory (FR-SYS-014). Admin only. */

interface Hotline {
  id: string;
  label: string;
  number: string;
  type: string;
  sort_order: number;
  is_active: boolean;
}

const hotlineTypes = [
  "barangay",
  "police",
  "fire",
  "ambulance",
  "hospital",
  "rescue",
  "mdrrmo",
] as const;

const hotlineSchema = z.object({
  label: z.string().min(1, "Required"),
  number: z.string().min(1, "Required"),
  type: z.enum(hotlineTypes),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});
type HotlineFormValues = z.infer<typeof hotlineSchema>;

const fields: AdminField[] = [
  {
    name: "label",
    label: "Label",
    type: "text",
    placeholder: "Barangay Emergency Response",
  },
  { name: "number", label: "Number", type: "text", placeholder: "0917-555-0101" },
  {
    name: "type",
    label: "Type",
    type: "select",
    options: hotlineTypes.map((t) => ({ value: t, label: t })),
  },
  { name: "sort_order", label: "Sort order", type: "number" },
  { name: "is_active", label: "Active", type: "checkbox" },
];

const emptyValues: HotlineFormValues = {
  label: "",
  number: "",
  type: "barangay",
  sort_order: 0,
  is_active: true,
};

export default function AdminHotlinesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "hotlines"],
    queryFn: () => api.get<Hotline[]>("/admin/hotlines").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: HotlineFormValues) => api.post("/admin/hotlines", values),
    onSuccess: () => {
      toast.success("Hotline added");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: HotlineFormValues }) =>
      api.patch(`/admin/hotlines/${id}`, values),
    onSuccess: () => {
      toast.success("Hotline updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hotlines/${id}`),
    onSuccess: () => {
      toast.success("Hotline removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "hotlines"] });
    },
    onError: () => toast.error("Could not remove hotline"),
  });

  const columns: ResourceColumn<Hotline>[] = [
    { key: "label", header: "Label" },
    { key: "number", header: "Number" },
    { key: "type", header: "Type" },
    { key: "sort_order", header: "Order" },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Emergency Hotlines"
        description="One-tap callable numbers shown on the public site and in the utility bar."
        action={
          <ResourceFormDialog
            title="Add hotline"
            fields={fields}
            schema={hotlineSchema}
            defaultValues={emptyValues}
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
          />
        }
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No hotlines yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ResourceFormDialog
              title="Edit hotline"
              fields={fields}
              schema={hotlineSchema}
              defaultValues={row as unknown as HotlineFormValues}
              onSubmit={async (values) => {
                await updateMutation.mutateAsync({ id: row.id, values });
              }}
              trigger={
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              }
            />
            <ConfirmDeleteButton
              itemLabel={row.label}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
