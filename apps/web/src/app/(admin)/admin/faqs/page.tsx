"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  Globe,
  HelpCircle,
  Layers,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/** FAQs (FR-PRP-005, FR-PUB-011). Admin only. */

export interface FaqItem {
  id: string;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  category: string;
  sort_order: number;
  is_published: boolean;
}

const CATEGORY_OPTIONS = [
  "Registration",
  "Emergencies",
  "Preparedness",
  "Evacuation & Assistance",
  "Community",
  "Donations",
  "Using the Website",
  "Alerts & Notifications",
  "Profile & Privacy",
  "Website Help",
] as const;

const faqSchema = z.object({
  question_fil: z.string().min(1, "Filipino question is required"),
  question_en: z.string().min(1, "English question is required"),
  answer_fil: z.string().min(1, "Filipino answer is required"),
  answer_en: z.string().min(1, "English answer is required"),
  category: z.string().min(1, "Category is required"),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
});

type FaqFormValues = z.infer<typeof faqSchema>;

const emptyValues: FaqFormValues = {
  question_fil: "",
  question_en: "",
  answer_fil: "",
  answer_en: "",
  category: "Registration",
  sort_order: 1,
  is_published: true,
};

/* --- Faq Detail View Dialog --- */
function FaqDetailDialog({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-semibold">
          <Eye className="size-3.5 text-neutral-500" />
          <span>View</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:max-w-xl">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-100 bg-neutral-50/70 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                <HelpCircle className="size-4.5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-900">
                  FAQ Knowledge Record
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Category: {faq.category} · Sort Order: #{faq.sort_order}
                </DialogDescription>
              </div>
            </div>
            <Badge tone={faq.is_published ? "success" : "neutral"}>
              {faq.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* English Version */}
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                English (EN)
              </span>
            </div>
            <h4 className="text-sm font-bold text-neutral-900 leading-snug">
              {faq.question_en}
            </h4>
            <p className="text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
              {faq.answer_en}
            </p>
          </div>

          {/* Filipino Version */}
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Filipino (FIL)
              </span>
            </div>
            <h4 className="text-sm font-bold text-emerald-950 leading-snug">
              {faq.question_fil}
            </h4>
            <p className="text-xs leading-relaxed text-emerald-900/80 whitespace-pre-wrap">
              {faq.answer_fil}
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-neutral-100 bg-neutral-50/50">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --- Faq Form Dialog (Create / Edit) --- */
function FaqFormDialog({
  faq,
  trigger,
  onSubmit,
}: {
  faq?: FaqItem;
  trigger?: React.ReactNode;
  onSubmit: (values: FaqFormValues) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [form, setForm] = React.useState<FaqFormValues>(
    faq
      ? {
          question_fil: faq.question_fil,
          question_en: faq.question_en,
          answer_fil: faq.answer_fil,
          answer_en: faq.answer_en,
          category: faq.category,
          sort_order: faq.sort_order,
          is_published: faq.is_published ?? true,
        }
      : emptyValues,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(
        faq
          ? {
              question_fil: faq.question_fil,
              question_en: faq.question_en,
              answer_fil: faq.answer_fil,
              answer_en: faq.answer_en,
              category: faq.category,
              sort_order: faq.sort_order,
              is_published: faq.is_published ?? true,
            }
          : emptyValues,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      faqSchema.parse(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Please check form fields");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setOpen(false);
    } catch (error) {
      toast.error(toDisplayError(error).detail || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 font-bold shadow-sm">
            <Plus className="size-4" />
            <span>Add FAQ</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-100 bg-neutral-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                {faq ? <Pencil className="size-4.5" /> : <Plus className="size-4.5" />}
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-neutral-900">
                  {faq ? "Edit FAQ Question" : "Add FAQ Question"}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  Provide both English and Filipino translations for the public knowledge base.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {/* Top row: Category, Order & Published Switch */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-bold text-neutral-700">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white border-neutral-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="z-[3000] rounded-xl border-neutral-200">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-medium">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                  }
                  className="h-9 text-xs rounded-xl bg-white border-neutral-200"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 h-9 px-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50">
                <Label htmlFor="published-toggle" className="text-xs font-bold text-neutral-700 cursor-pointer">
                  Published
                </Label>
                <Switch
                  id="published-toggle"
                  checked={form.is_published}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_published: checked }))
                  }
                />
              </div>
            </div>

            {/* English Section */}
            <div className="rounded-xl border border-neutral-200 p-4 space-y-3 bg-neutral-50/30">
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                  English Translation
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Question (EN)</Label>
                <Input
                  value={form.question_en}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, question_en: e.target.value }))
                  }
                  placeholder="e.g. How do I register my household?"
                  className="h-9 text-xs rounded-xl bg-white border-neutral-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Answer (EN)</Label>
                <Textarea
                  value={form.answer_en}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, answer_en: e.target.value }))
                  }
                  placeholder="Provide clear, concise guidance..."
                  rows={3}
                  className="text-xs rounded-xl bg-white border-neutral-200"
                />
              </div>
            </div>

            {/* Filipino Section */}
            <div className="rounded-xl border border-emerald-200/70 p-4 space-y-3 bg-emerald-50/20">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Filipino Translation
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-950">Tanong (FIL)</Label>
                <Input
                  value={form.question_fil}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, question_fil: e.target.value }))
                  }
                  placeholder="hal. Paano ko mairehistro ang aking sambahayan?"
                  className="h-9 text-xs rounded-xl bg-white border-neutral-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-950">Kasagutan (FIL)</Label>
                <Textarea
                  value={form.answer_fil}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, answer_fil: e.target.value }))
                  }
                  placeholder="Magbigay ng malinaw na paliwanag sa Tagalog..."
                  rows={3}
                  className="text-xs rounded-xl bg-white border-neutral-200"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-neutral-100 bg-neutral-50/70 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? "Saving..." : faq ? "Update FAQ" : "Create FAQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFaqsPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: () => api.get<FaqItem[]>("/admin/faqs").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: FaqFormValues) => api.post("/admin/faqs", values),
    onSuccess: () => {
      toast.success("FAQ created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to create FAQ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FaqFormValues }) =>
      api.patch(`/admin/faqs/${id}`, values),
    onSuccess: () => {
      toast.success("FAQ updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to update FAQ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/faqs/${id}`),
    onSuccess: () => {
      toast.success("FAQ removed successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail || "Failed to remove FAQ");
    },
  });

  const metrics = React.useMemo(() => {
    const list = data ?? [];
    const total = list.length;
    const categories = new Set(list.map((f) => f.category)).size;
    const published = list.filter((f) => f.is_published !== false).length;
    const drafts = total - published;
    return { total, categories, published, drafts };
  }, [data]);

  const columns: ResourceColumn<FaqItem>[] = [
    {
      key: "sort_order",
      header: "#",
      className: "w-12 text-center",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-neutral-500">
          #{row.sort_order}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "w-44",
      render: (row) => (
        <span className="inline-flex items-center rounded-lg border border-neutral-200/90 bg-neutral-100/70 px-2.5 py-1 text-xs font-bold text-neutral-800">
          {row.category}
        </span>
      ),
    },
    {
      key: "question_en",
      header: "Question & Answer (English / Filipino)",
      render: (row) => (
        <div className="flex flex-col gap-1 py-1 max-w-xl">
          <span className="text-xs font-bold text-neutral-900 line-clamp-1">
            {row.question_en}
          </span>
          <span className="text-[11px] font-medium text-emerald-800/80 line-clamp-1">
            FIL: {row.question_fil}
          </span>
          <p className="text-[11px] text-neutral-500 line-clamp-1">
            {row.answer_en}
          </p>
        </div>
      ),
    },
    {
      key: "is_published",
      header: "Status",
      className: "w-28 text-center",
      render: (row) => (
        <Badge
          tone={row.is_published !== false ? "success" : "neutral"}
          className="font-bold"
        >
          {row.is_published !== false ? "Published" : "Draft"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Frequently Asked Questions"
        description="Manage bilingual knowledge base entries published on the public help and inquiry pages."
        action={
          <FaqFormDialog
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
          />
        }
      />

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total FAQs */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Total FAQ Questions
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <HelpCircle className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.total}
            </span>
            <span className="text-xs font-semibold text-emerald-700">active entries</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Knowledge Scope:</span>
            <span className="font-bold text-emerald-800">Community Support</span>
          </div>
        </div>

        {/* Card 2: Categories */}
        <div className="flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Topic Categories
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
              <Layers className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.categories}
            </span>
            <span className="text-xs font-semibold text-teal-700">structured topics</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-teal-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Coverage:</span>
            <span className="font-bold text-neutral-800">Registration to Alerts</span>
          </div>
        </div>

        {/* Card 3: Published Live */}
        <div className="flex flex-col justify-between rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/20 to-sky-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Published Status
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
              <CheckCircle2 className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              {metrics.published}
            </span>
            <span className="text-xs font-semibold text-blue-700">live / public</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-blue-100/80 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Drafts / Review:</span>
            <span className="font-bold text-neutral-800">{metrics.drafts} unpublished</span>
          </div>
        </div>

        {/* Card 4: Bilingual */}
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Bilingual Support
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 shadow-2xs">
              <Globe className="size-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900">
              100%
            </span>
            <span className="text-xs font-semibold text-emerald-700">localized</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs">
            <span className="font-medium text-neutral-600">Languages:</span>
            <span className="font-bold text-neutral-800">English & Filipino</span>
          </div>
        </div>
      </div>

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="Search question, keyword, answer, or category..."
        filterChoices={() => [
          {
            value: "status:published",
            label: "Published FAQs Only",
            matches: (r) => r.is_published !== false,
          },
          {
            value: "cat:registration",
            label: "Registration (Sambahayan)",
            matches: (r) => r.category.toLowerCase().includes("registration"),
          },
          {
            value: "cat:emergencies",
            label: "Emergencies & Rescue",
            matches: (r) => r.category.toLowerCase().includes("emergenc"),
          },
          {
            value: "cat:preparedness",
            label: "Preparedness & Go Bag",
            matches: (r) => r.category.toLowerCase().includes("preparedness"),
          },
          {
            value: "cat:evacuation",
            label: "Evacuation & Assistance",
            matches: (r) => r.category.toLowerCase().includes("evacuation"),
          },
          {
            value: "cat:community",
            label: "Community & Volunteer",
            matches: (r) => r.category.toLowerCase().includes("community"),
          },
          {
            value: "cat:donations",
            label: "Donations",
            matches: (r) => r.category.toLowerCase().includes("donation"),
          },
          {
            value: "cat:website",
            label: "Using the Website & Help",
            matches: (r) =>
              r.category.toLowerCase().includes("website") ||
              r.category.toLowerCase().includes("help"),
          },
          {
            value: "cat:alerts",
            label: "Alerts & Notifications",
            matches: (r) => r.category.toLowerCase().includes("alert"),
          },
          {
            value: "cat:privacy",
            label: "Profile & Privacy",
            matches: (r) => r.category.toLowerCase().includes("privacy"),
          },
          {
            value: "status:draft",
            label: "Drafts / Unpublished",
            matches: (r) => r.is_published === false,
          },
        ]}
        emptyTitle="No FAQs in knowledge base yet"
        emptyDescription="Add frequent questions and bilingual answers to populate the help repository."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <>
            <FaqDetailDialog faq={row} />
            <FaqFormDialog
              faq={row}
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-semibold">
                  <Pencil className="size-3.5 text-neutral-500" />
                  <span>Edit</span>
                </Button>
              }
              onSubmit={async (values) => {
                await updateMutation.mutateAsync({ id: row.id, values });
              }}
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
