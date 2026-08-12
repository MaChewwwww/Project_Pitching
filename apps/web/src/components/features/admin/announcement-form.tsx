import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  ImagePlus,
  MapPin,
  Megaphone,
  Sparkles,
  Trash2,
  Upload,
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
] as const;export const announcementFormSchema = z
  .object({
    kind: z.enum(["announcement", "alert"]),
    type: z.enum(announcementTypes),
    severity: z.enum(["info", "warning", "emergency"]).optional(),
    title: z.string().min(1, "Title is required"),
    excerpt: z.string().max(360, "Keep the summary under 360 characters").default(""),
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

export function AnnouncementForm({
  areas,
  defaultValues,
  onSubmit,
  onCancel,
  showCoverUpload = false,
}: {
  areas: { id: string; name: string }[];
  defaultValues: AnnouncementFormValues;
  onSubmit: (values: AnnouncementFormValues, coverFile?: File | null, coverAltText?: string) => Promise<void>;
  onCancel: () => void;
  showCoverUpload?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [coverAltText, setCoverAltText] = React.useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema as never),
    defaultValues,
  });

  const hasUnsavedChanges = isDirty || !!coverFile;

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
  const isBarangayWide = useWatch({ control, name: "is_barangay_wide" });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const removeCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverAltText("");
  };

  async function submit(values: AnnouncementFormValues) {
    setServerError(null);
    try {
      await onSubmit(values, coverFile, coverAltText);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="w-full">
      {serverError ? (
        <div
          role="alert"
          className="mb-6 border-red-200 bg-red-50 text-red-700 flex items-start gap-2.5 rounded-xl border p-4 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className={showCoverUpload ? "grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]" : "space-y-6"}>
        {/* Story details column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <Sparkles aria-hidden className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Article Details</h2>
                <p className="text-xs text-neutral-500">Classification, headline, and rich text content</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="kind" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Type <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Controller
                  control={control}
                  name="kind"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="kind" className="h-10 rounded-xl border-neutral-200 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Category <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="h-10 rounded-xl border-neutral-200 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {announcementTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {kind === "alert" ? (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50/70 border border-amber-200/80 p-4">
                <Label htmlFor="severity" className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Alert Severity Level <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Controller
                  control={control}
                  name="severity"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="severity" className="h-10 rounded-xl border-amber-300 bg-white font-semibold text-amber-950">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Title <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter article title..."
                className={cn(
                  "h-11 rounded-xl border-neutral-200 bg-white font-medium text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs",
                  errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                )}
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-red-600 text-xs font-semibold">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="excerpt" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Preview Summary
              </Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary shown in public cards..."
                className="min-h-24 rounded-xl border-neutral-200 bg-white text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                aria-invalid={!!errors.excerpt}
                {...register("excerpt")}
              />
              <p className="text-[11px] font-medium text-neutral-400">Plain text preview shown in article cards (max 360 characters).</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label id="article-body-label" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Article Body <span className="text-red-500 font-bold ml-0.5">*</span>
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
              <Label htmlFor="instruction" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Action Instruction{" "}
                {kind === "alert" ? (
                  <span className="text-red-600 font-bold">* (Required for Alerts)</span>
                ) : (
                  <span className="text-neutral-400 font-normal">(Optional)</span>
                )}
              </Label>
              <Textarea
                id="instruction"
                placeholder="Key action steps for residents (e.g., Prepare 72-hour survival kits now)..."
                className={cn(
                  "min-h-20 rounded-xl border-neutral-200 bg-white text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs",
                  errors.instruction && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                )}
                aria-invalid={!!errors.instruction}
                {...register("instruction")}
              />
              {errors.instruction ? (
                <p className="text-red-600 text-xs font-semibold">{errors.instruction.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Side Panel: Cover Upload, Targeting & Status */}
        <div className="space-y-6">
          {showCoverUpload ? (
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <ImagePlus aria-hidden className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900">Cover Photo</h3>
              </div>

              {coverPreview ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xs">
                    <Image
                      src={coverPreview}
                      alt={coverAltText || "Cover photo preview"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeCover}
                      className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700 transition-all cursor-pointer"
                      title="Remove cover photo"
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Cover Photo
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cover-alt" className="text-xs font-bold text-neutral-600">
                      Alt Text (Accessibility)
                    </Label>
                    <Input
                      id="cover-alt"
                      value={coverAltText}
                      onChange={(e) => setCoverAltText(e.target.value)}
                      placeholder="Describe image for residents..."
                      className="h-9 rounded-lg border-neutral-200 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/70 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleImageSelect}
                  />
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-2xs">
                    <Upload aria-hidden className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Upload Cover Photo</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">JPEG, PNG, WebP up to 10MB</p>
                  </div>
                </label>
              )}
            </div>
          ) : null}

          {/* Location Targeting Card */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <MapPin aria-hidden className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Target Location <span className="text-red-500 font-bold ml-0.5">*</span>
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
              <Label htmlFor="is_barangay_wide" className="text-xs font-bold text-neutral-800 cursor-pointer">
                Barangay-wide announcement
              </Label>
            </div>

            {!isBarangayWide ? (
              <div className="flex flex-col gap-2 pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Select Specific Areas <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Controller
                  control={control}
                  name="area_ids"
                  render={({ field }) => (
                    <div className={cn(
                      "flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 max-h-48 overflow-y-auto",
                      errors.area_ids && "border-red-500 bg-red-50/30"
                    )}>
                      {areas.map((area) => {
                        const checked = field.value.includes(area.id);
                        return (
                          <label
                            key={area.id}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-all",
                              checked
                                ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-2xs"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
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
                  <p className="text-red-600 text-xs font-semibold">{errors.area_ids.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Publication Status Card */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Megaphone aria-hidden className="size-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">Publishing Status</h3>
            </div>

            <Controller
              control={control}
              name="publication_status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="publication_status" className="h-10 rounded-xl border-neutral-200 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publish Now</SelectItem>
                    <SelectItem value="draft">Save as Draft</SelectItem>
                    <SelectItem value="archived">Archive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all cursor-pointer justify-center"
              >
                {isSubmitting ? "Saving..." : "Publish Announcement"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                className="h-9 w-full rounded-xl border-neutral-300 text-neutral-700 hover:bg-neutral-100 cursor-pointer justify-center text-xs font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-white border border-neutral-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-neutral-900">
              Discard Unsaved Changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-600">
              Are you sure you want to cancel? Any unsaved announcement details will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold cursor-pointer">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
