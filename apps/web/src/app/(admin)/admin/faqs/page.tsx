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

/** FAQs (FR-PRP-005, FR-PUB-011). Admin only. */

interface Faq {
  id: string;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  category: string;
  sort_order: number;
}

const faqSchema = z.object({
  question_fil: z.string().min(1, "Required"),
  question_en: z.string().min(1, "Required"),
  answer_fil: z.string().min(1, "Required"),
  answer_en: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
});
type FaqFormValues = z.infer<typeof faqSchema>;

const fields: AdminField[] = [
  { name: "category", label: "Category", type: "text", placeholder: "Registration" },
  { name: "question_fil", label: "Question (Filipino)", type: "text" },
  { name: "question_en", label: "Question (English)", type: "text" },
  { name: "answer_fil", label: "Answer (Filipino)", type: "textarea" },
  { name: "answer_en", label: "Answer (English)", type: "textarea" },
  { name: "sort_order", label: "Sort order", type: "number" },
  { name: "is_published", label: "Published", type: "checkbox" },
];

const emptyValues: FaqFormValues = {
  question_fil: "",
  question_en: "",
  answer_fil: "",
  answer_en: "",
  category: "",
  sort_order: 0,
  is_published: true,
};

export default function AdminFaqsPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: () => api.get<Faq[]>("/admin/faqs").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: FaqFormValues) => api.post("/admin/faqs", values),
    onSuccess: () => {
      toast.success("FAQ added");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (error) => {
      throw toDisplayError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FaqFormValues }) =>
      api.patch(`/admin/faqs/${id}`, values),
    onSuccess: () => {
      toast.success("FAQ updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/faqs/${id}`),
    onSuccess: () => {
      toast.success("FAQ removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
  });

  const columns: ResourceColumn<Faq>[] = [
    { key: "category", header: "Category" },
    { key: "question_en", header: "Question" },
    { key: "sort_order", header: "Order" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Frequently asked"
        titleAccent="questions"
        description="Published on the public help page."
        action={
          <ResourceFormDialog
            title="Add FAQ"
            fields={fields}
            schema={faqSchema}
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
        emptyTitle="No FAQs yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <ResourceFormDialog
              title="Edit FAQ"
              fields={fields}
              schema={faqSchema}
              defaultValues={{ ...row, is_published: true }}
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
              itemLabel={row.question_en}
              onConfirm={() => deleteMutation.mutate(row.id)}
            />
          </>
        )}
      />
    </div>
  );
}
