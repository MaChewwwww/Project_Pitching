"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
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

/** Preparedness guides (FR-PRP-001/003/004/007). Admin only. */

interface Guide {
  id: string;
  slug: string;
  hazard_type: string;
  title_fil: string;
  title_en: string;
  body_fil: string;
  body_en: string;
  phase: string;
  source_attribution: string | null;
  is_published: boolean;
  sort_order: number;
}

const hazardTypes = [
  "flood",
  "earthquake",
  "typhoon",
  "fire",
  "landslide",
  "general",
  "food",
] as const;
const phases = ["before", "during", "after", "n/a"] as const;

const guideSchema = z.object({
  slug: z
    .string()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  hazard_type: z.enum(hazardTypes),
  title_fil: z.string().min(1, "Required"),
  title_en: z.string().min(1, "Required"),
  body_fil: z.string().min(1, "Required"),
  body_en: z.string().min(1, "Required"),
  phase: z.enum(phases).default("n/a"),
  source_attribution: z.string().optional().nullable(),
  is_published: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});
type GuideFormValues = z.infer<typeof guideSchema>;

const fields: AdminField[] = [
  { name: "slug", label: "Slug", type: "text", placeholder: "paghahanda-sa-baha" },
  {
    name: "hazard_type",
    label: "Hazard type",
    type: "select",
    options: hazardTypes.map((h) => ({ value: h, label: h })),
  },
  {
    name: "phase",
    label: "Phase",
    type: "select",
    options: phases.map((p) => ({ value: p, label: p })),
  },
  { name: "title_fil", label: "Title (Filipino)", type: "text" },
  { name: "title_en", label: "Title (English)", type: "text" },
  { name: "body_fil", label: "Body (Filipino)", type: "textarea" },
  { name: "body_en", label: "Body (English)", type: "textarea" },
  { name: "source_attribution", label: "Source attribution", type: "text" },
  { name: "sort_order", label: "Sort order", type: "number" },
  { name: "is_published", label: "Published", type: "checkbox" },
];

const emptyValues: GuideFormValues = {
  slug: "",
  hazard_type: "flood",
  title_fil: "",
  title_en: "",
  body_fil: "",
  body_en: "",
  phase: "n/a",
  source_attribution: "",
  is_published: true,
  sort_order: 0,
};

export default function AdminGuidesPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "guides"],
    queryFn: () => api.get<Guide[]>("/admin/guides").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: GuideFormValues) => api.post("/admin/guides", values),
    onSuccess: () => {
      toast.success("Guide created");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GuideFormValues }) =>
      api.patch(`/admin/guides/${id}`, values),
    onSuccess: () => {
      toast.success("Guide updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/guides/${id}`),
    onSuccess: () => {
      toast.success("Guide removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "guides"] });
    },
  });

  const columns: ResourceColumn<Guide>[] = [
    { key: "title_en", header: "Title" },
    { key: "hazard_type", header: "Hazard" },
    { key: "phase", header: "Phase" },
    {
      key: "is_published",
      header: "Status",
      render: (row) => (row.is_published ? "Published" : "Draft"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Preparedness"
        titleAccent="guides"
        description="Bilingual hazard guides shown on the public site."
        action={
          <ResourceFormDialog
            title="Create guide"
            fields={fields}
            schema={guideSchema}
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
        emptyTitle="No guides yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ResourceFormDialog
              title="Edit guide"
              fields={fields}
              schema={guideSchema}
              defaultValues={{
                slug: row.slug,
                hazard_type: row.hazard_type as (typeof hazardTypes)[number],
                title_fil: row.title_fil,
                title_en: row.title_en,
                body_fil: row.body_fil,
                body_en: row.body_en,
                phase: row.phase as (typeof phases)[number],
                source_attribution: row.source_attribution ?? "",
                is_published: row.is_published,
                sort_order: row.sort_order,
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
            <ConfirmDeleteButton
              itemLabel={row.title_en}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
