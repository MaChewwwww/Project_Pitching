"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import type { AdminField } from "@/components/features/admin/admin-form";
import { ResourceFormDialog } from "@/components/features/admin/resource-form-dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * Barangay areas (FR-SYS-013). Read-only list plus edit — creation is blocked
 * on BRD OI-3 (boundary polygons not yet supplied), so there is no "Add" here.
 */

interface Area {
  id: string;
  name: string;
  code: string | null;
  flood_exposure: string | null;
  has_boundary: boolean;
}

const floodExposures = ["low", "medium", "high"] as const;

const areaSchema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().optional().nullable(),
  flood_exposure: z.enum(floodExposures).optional().nullable(),
});
type AreaFormValues = z.infer<typeof areaSchema>;

const fields: AdminField[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "code", label: "Code", type: "text", placeholder: "A1" },
  {
    name: "flood_exposure",
    label: "Flood exposure",
    type: "select",
    options: floodExposures.map((f) => ({ value: f, label: f })),
  },
];

export default function AdminAreasPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get<Area[]>("/admin/areas").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AreaFormValues }) =>
      api.patch(`/admin/areas/${id}`, values),
    onSuccess: () => {
      toast.success("Area updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "areas"] });
    },
  });

  const columns: ResourceColumn<Area>[] = [
    { key: "name", header: "Name" },
    { key: "code", header: "Code", render: (row) => row.code ?? "—" },
    {
      key: "flood_exposure",
      header: "Flood exposure",
      render: (row) => row.flood_exposure ?? "—",
    },
    {
      key: "has_boundary",
      header: "Boundary",
      render: (row) => (row.has_boundary ? "Mapped" : "Not yet supplied (BRD OI-3)"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Barangay"
        titleAccent="areas"
        description="Zone names, codes, and flood exposure. New areas cannot be created until the barangay supplies boundary polygons (BRD OI-3)."
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No areas seeded yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <ResourceFormDialog
            title={`Edit ${row.name}`}
            fields={fields}
            schema={areaSchema}
            defaultValues={{
              name: row.name,
              code: row.code ?? "",
              flood_exposure: row.flood_exposure as never,
            }}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: row.id, values });
            }}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
        )}
      />
    </div>
  );
}
