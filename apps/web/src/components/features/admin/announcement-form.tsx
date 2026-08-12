import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Images,
  MapPin,
  Megaphone,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyArticleDocument,
  RichTextEditor,
  type ArticleDocument,
} from "@/components/features/admin/rich-text-editor";
import { toDisplayError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Announcement / alert form — special-cased rather than driven by `AdminForm`'s
 * generic field descriptors because it has two things no other resource does:
 * multi-area targeting and a conditionally-required field (FR-ALT-005).
 */

const announcementTypes = [
  "general",
  "class_suspension",
  "road_closure",
  "utility_interruption",
  "flood_warning",
  "earthquake",
  "typhoon",
  "heavy_rainfall",
  "heat_index",
  "evacuation",
] as const;

export const announcementFormSchema = z
  .object({
    kind: z.enum(["announcement", "alert"]),
    type: z.enum(announcementTypes),
    severity: z.enum(["info", "warning", "emergency"]).optional(),
    title: z.string().min(1, "Title is required"),
    excerpt: z
      .string()
      .min(1, "Preview Summary is required")
      .max(360, "Keep the summary under 360 characters"),
    body_json: z.custom<ArticleDocument>(),
    instruction: z.string().optional(),
    is_barangay_wide: z.boolean().default(false),
    area_ids: z.array(z.string()).default([]),
    publication_status: z.enum(["draft", "published", "archived"]).default("published"),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "alert" && !values.instruction?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["instruction"],
        message: "An alert cannot be published without an instruction (FR-ALT-005).",
      });
    }
    if (!values.is_barangay_wide && (!values.area_ids || values.area_ids.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["area_ids"],
        message: "Select at least one target area or check Barangay-wide announcement.",
      });
    }
  });

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

function RenderArticleBody({ doc }: { doc: ArticleDocument }) {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return (
      <p className="text-sm text-neutral-500 italic">No detailed content provided.</p>
    );
  }

  return (
    <div className="prose prose-emerald max-w-none space-y-4 text-sm leading-relaxed text-neutral-800">
      {doc.content.map((block, idx) => {
        if (block.type === "paragraph") {
          const textContent = Array.isArray(block.content)
            ? block.content
                .map((c: Record<string, unknown>) => (c.text as string) || "")
                .join("")
            : "";
          return (
            <p key={idx} className="my-2">
              {textContent}
            </p>
          );
        }
        if (block.type === "heading") {
          const textContent = Array.isArray(block.content)
            ? block.content
                .map((c: Record<string, unknown>) => (c.text as string) || "")
                .join("")
            : "";
          const level =
            block.attrs && typeof block.attrs === "object"
              ? (block.attrs as Record<string, unknown>).level
              : 2;
          if (level === 2)
            return (
              <h2 key={idx} className="mt-4 mb-2 text-lg font-bold text-neutral-900">
                {textContent}
              </h2>
            );
          return (
            <h3 key={idx} className="mt-3 mb-1.5 text-base font-bold text-neutral-900">
              {textContent}
            </h3>
          );
        }
        if (block.type === "bulletList") {
          return (
            <ul key={idx} className="my-2 list-disc space-y-1 pl-5">
              {Array.isArray(block.content) &&
                block.content.map((li: Record<string, unknown>, liIdx: number) => {
                  const liText = Array.isArray(li.content)
                    ? li.content
                        .flatMap((p: Record<string, unknown>) =>
                          Array.isArray(p.content)
                            ? p.content.map(
                                (c: Record<string, unknown>) => (c.text as string) || "",
                              )
                            : [],
                        )
                        .join("")
                    : "";
                  return <li key={liIdx}>{liText}</li>;
                })}
            </ul>
          );
        }
        if (block.type === "blockquote") {
          const quoteText = Array.isArray(block.content)
            ? block.content
                .map((c: Record<string, unknown>) => (c.text as string) || "")
                .join("")
            : "";
          return (
            <blockquote
              key={idx}
              className="my-3 rounded-r-lg border-l-4 border-emerald-500 bg-emerald-50/50 py-1 pl-4 italic"
            >
              {quoteText}
            </blockquote>
          );
        }
        return null;
      })}
    </div>
  );
}

export interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
}

export function AnnouncementForm({
  areas,
  defaultValues,
  onSubmit,
  onCancel,
  showCoverUpload = false,
  mediaPanel,
  submitLabel = "Create",
}: {
  areas: { id: string; name: string }[];
  defaultValues: AnnouncementFormValues;
  onSubmit: (
    values: AnnouncementFormValues,
    imageItems: ImageFileItem[],
  ) => Promise<void>;
  onCancel: () => void;
  showCoverUpload?: boolean;
  mediaPanel?: React.ReactNode;
  submitLabel?: "Create" | "Update";
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [imageItems, setImageItems] = React.useState<ImageFileItem[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [formPreviewOpen, setFormPreviewOpen] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema as never),
    defaultValues,
  });

  const hasUnsavedChanges = isDirty || imageItems.length > 0;

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setCancelDialogOpen(true);
    } else {
      onCancel();
    }
  };

  const kind = useWatch({ control, name: "kind" });
  const type = useWatch({ control, name: "type" });
  const title = useWatch({ control, name: "title" });
  const excerpt = useWatch({ control, name: "excerpt" });
  const instruction = useWatch({ control, name: "instruction" });
  const bodyJson = useWatch({ control, name: "body_json" });
  const isBarangayWide = useWatch({ control, name: "is_barangay_wide" });
  const areaIds = useWatch({ control, name: "area_ids" });

  const selectedAreaNames = areas
    .filter((a) => (areaIds || []).includes(a.id))
    .map((a) => a.name);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setImageItems((prev) => {
      const hasExistingCover = prev.some((item) => item.isCover);
      const newItems: ImageFileItem[] = files.map((file, index) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isCover: !hasExistingCover && index === 0,
      }));
      return [...prev, ...newItems];
    });

    event.target.value = "";
  };

  const setCoverImage = (id: string) => {
    setImageItems((prev) =>
      prev.map((item) => ({
        ...item,
        isCover: item.id === id,
      })),
    );
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const filtered = prev.filter((item) => item.id !== id);
      if (target?.isCover && filtered.length > 0) {
        filtered[0].isCover = true;
      }
      return filtered;
    });
  };

  async function submit(values: AnnouncementFormValues) {
    setServerError(null);
    try {
      await onSubmit(values, imageItems);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="w-full">
      {serverError ? (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div
        className={
          showCoverUpload || mediaPanel
            ? "grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]"
            : "space-y-6"
        }
      >
        {/* Story details column */}
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs sm:p-8">
            <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
              <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
                <Sparkles aria-hidden className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Article Details</h2>
                <p className="text-xs text-neutral-500">
                  Classification, headline, and rich text content
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="kind"
                  className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
                >
                  Type <span className="ml-0.5 font-bold text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="kind"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="kind"
                        className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        align="start"
                        className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                      >
                        <SelectItem value="alert">Alert</SelectItem>
                        <SelectItem value="announcement">Advisory</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="type"
                  className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
                >
                  Category <span className="ml-0.5 font-bold text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="type"
                        className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        align="start"
                        className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                      >
                        {announcementTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {kind === "alert" ? (
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="severity"
                    className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
                  >
                    Alert Severity Level{" "}
                    <span className="ml-0.5 font-bold text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="severity"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="severity"
                          className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent
                          align="start"
                          className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                        >
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="title"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Title <span className="ml-0.5 font-bold text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter article title..."
                className={cn(
                  "h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20",
                  errors.title &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-xs font-semibold text-red-600">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="excerpt"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Preview Summary <span className="ml-0.5 font-bold text-red-500">*</span>
              </Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary shown in public cards..."
                className={cn(
                  "min-h-24 rounded-lg border-emerald-200/80 bg-white text-sm shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20",
                  errors.excerpt &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                aria-invalid={!!errors.excerpt}
                {...register("excerpt")}
              />
              {errors.excerpt ? (
                <p className="text-xs font-semibold text-red-600">
                  {errors.excerpt.message}
                </p>
              ) : (
                <p className="text-[11px] font-medium text-neutral-400">
                  Plain text preview shown in article cards (max 360 characters).
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                id="article-body-label"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Article Body <span className="ml-0.5 font-bold text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="body_json"
                render={({ field }) => (
                  <RichTextEditor
                    labelledBy="article-body-label"
                    value={field.value ?? emptyArticleDocument}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="instruction"
                className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
              >
                Action Instruction{" "}
                {kind === "alert" ? (
                  <span className="font-bold text-red-600">* (Required for Alerts)</span>
                ) : (
                  <span className="font-normal text-neutral-400">(Optional)</span>
                )}
              </Label>
              <Textarea
                id="instruction"
                placeholder="Key action steps for residents (e.g., Prepare 72-hour survival kits now)..."
                className={cn(
                  "min-h-20 rounded-lg border-emerald-200/80 bg-white text-sm shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20",
                  errors.instruction &&
                    "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                )}
                aria-invalid={!!errors.instruction}
                {...register("instruction")}
              />
              {errors.instruction ? (
                <p className="text-xs font-semibold text-red-600">
                  {errors.instruction.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Side Panel: Cover Upload, Targeting & Status */}
        <div className="space-y-6">
          {showCoverUpload ? (
            <div className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Images aria-hidden className="size-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    Article Media & Photos
                  </h3>
                </div>
                {imageItems.length > 0 ? (
                  <span className="text-xs font-semibold text-neutral-500">
                    {imageItems.length} {imageItems.length === 1 ? "photo" : "photos"}
                  </span>
                ) : null}
              </div>

              {imageItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {imageItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "relative aspect-video w-full overflow-hidden rounded-xl border bg-neutral-100 shadow-2xs transition-all",
                          item.isCover
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-neutral-200",
                        )}
                      >
                        <Image
                          src={item.previewUrl}
                          alt="Uploaded article photo"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(item.id)}
                          className="absolute top-2 right-2 z-10 cursor-pointer rounded-full bg-red-600 p-1.5 text-white shadow-md transition-all hover:bg-red-700"
                          title="Remove photo"
                        >
                          <Trash2 aria-hidden className="size-3.5" />
                        </button>

                        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
                          {item.isCover ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                              <Star aria-hidden className="size-3 fill-white" />
                              Cover Photo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCoverImage(item.id)}
                              className="flex cursor-pointer items-center gap-1 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-emerald-600"
                            >
                              <Star aria-hidden className="size-3" />
                              Set as Cover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-600/40 bg-emerald-50/40 px-4 py-2.5 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/70">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleImageSelect}
                    />
                    <Upload aria-hidden className="size-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      Add More Photos
                    </span>
                  </label>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/70">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleImageSelect}
                  />
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-2xs">
                    <Upload aria-hidden className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      Upload Article Photos
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      Select multiple JPEG, PNG, WebP images
                    </p>
                  </div>
                </label>
              )}
            </div>
          ) : mediaPanel ? (
            mediaPanel
          ) : null}

          {/* Location Targeting Card */}
          <div className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <MapPin aria-hidden className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Target Location <span className="ml-0.5 font-bold text-red-500">*</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="is_barangay_wide"
                render={({ field }) => (
                  <Checkbox
                    id="is_barangay_wide"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                )}
              />
              <Label
                htmlFor="is_barangay_wide"
                className="cursor-pointer text-xs font-bold text-neutral-800"
              >
                Barangay-Wide Announcement
              </Label>
            </div>

            {!isBarangayWide ? (
              <div className="flex flex-col gap-2 pt-1">
                <Label className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                  Select Specific Areas{" "}
                  <span className="ml-0.5 font-bold text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="area_ids"
                  render={({ field }) => (
                    <div
                      className={cn(
                        "flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 p-3",
                        errors.area_ids && "border-red-500 bg-red-50/30",
                      )}
                    >
                      {areas.map((area) => {
                        const checked = field.value.includes(area.id);
                        return (
                          <label
                            key={area.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all",
                              checked
                                ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-2xs"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) =>
                                field.onChange(
                                  c
                                    ? [...field.value, area.id]
                                    : field.value.filter((id) => id !== area.id),
                                )
                              }
                              className="size-3.5 data-[state=checked]:bg-emerald-600"
                            />
                            <span>{area.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.area_ids ? (
                  <p className="text-xs font-semibold text-red-600">
                    {errors.area_ids.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Publication Status Card */}
          <div className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <Megaphone aria-hidden className="size-4 shrink-0 text-emerald-600" />
                <h3 className="truncate text-sm font-bold text-neutral-900">
                  Publishing Status
                </h3>
              </div>

              <Controller
                control={control}
                name="publication_status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="publication_status"
                      className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-lg border-emerald-200/80 font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                    >
                      <SelectItem value="published">Publish Now</SelectItem>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                      <SelectItem value="archived">Archive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                type="button"
                variant="warning"
                onClick={() => setFormPreviewOpen(true)}
                className="h-10 w-full cursor-pointer justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white shadow-md shadow-amber-900/15 transition-all hover:bg-amber-600 hover:shadow-lg"
              >
                <span>Preview</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full cursor-pointer justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-700 hover:shadow-lg"
              >
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                className="h-9 w-full cursor-pointer justify-center rounded-xl border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl border border-neutral-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-neutral-900">
              Discard Unsaved Changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-600">
              Are you sure you want to cancel? Any unsaved announcement details will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-9 cursor-pointer rounded-xl text-xs font-semibold">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="h-9 cursor-pointer rounded-xl bg-red-600 text-xs font-bold text-white shadow-sm hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Live Preview Modal */}
      <Dialog open={formPreviewOpen} onOpenChange={setFormPreviewOpen}>
        <DialogContent
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[52rem] flex-col gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] md:min-w-[42rem]"
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
                    Form Live Preview
                  </span>
                  {type ? (
                    <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-800 uppercase">
                      {type.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>
                <DialogTitle className="mt-2 text-base leading-snug font-bold text-neutral-900 sm:text-lg">
                  {title || "Untitled Article"}
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  aria-label="Close preview"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {(() => {
                const coverImageItem =
                  imageItems.find((img) => img.isCover) || imageItems[0];
                if (!coverImageItem) return null;
                return (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xs">
                    <Image
                      src={coverImageItem.previewUrl}
                      alt={title || "Cover photo preview"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                );
              })()}

              <div className="flex flex-col items-start gap-2 border-b border-neutral-100 pb-4 text-xs text-neutral-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-emerald-600" />
                  Draft / Live Form Preview
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-emerald-600" />
                  {isBarangayWide
                    ? "Barangay-Wide"
                    : selectedAreaNames.length > 0
                      ? selectedAreaNames.join(", ")
                      : "Targeted Areas"}
                </span>
              </div>

              {instruction ? (
                <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-amber-950 sm:p-4">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-900 uppercase">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span>Required Action Instruction</span>
                  </div>
                  <p className="pl-6 text-sm font-semibold">{instruction}</p>
                </div>
              ) : null}

              {excerpt ? (
                <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-3.5 sm:p-4">
                  <p className="text-sm font-medium text-neutral-700 italic">
                    &ldquo;{excerpt}&rdquo;
                  </p>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-xs font-bold tracking-wider text-neutral-400 uppercase">
                  Article Body Content
                </h4>
                <RenderArticleBody doc={bodyJson} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
