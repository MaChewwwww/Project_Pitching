"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  CalendarClock,
  Images,
  MapPin,
  Megaphone,
  PencilLine,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  RichTextEditor,
  type ArticleDocument,
} from "@/components/features/admin/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDisplayError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const activityTypes = [
  "drill",
  "seminar",
  "first_aid",
  "cleanup",
  "tree_planting",
  "ngo_program",
  "other",
] as const;

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const activityFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().max(360, "Keep the preview under 360 characters").default(""),
  body_json: z.custom<ArticleDocument>(),
  type: z.enum(activityTypes),
  starts_at: z.string().min(1, "Starts At is required"),
  ends_at: z.string().optional(),
  venue: z.string().optional(),
  area_id: z.string().optional(),
  publication_status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
    >
      {children}
      {required ? <span className="ml-1 font-bold text-red-500">*</span> : null}
    </Label>
  );
}

export function ActivityForm({
  areas,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save Activity",
  showPublication = true,
  showCoverUpload = false,
  mediaPanel,
}: {
  areas: { id: string; name: string }[];
  defaultValues: ActivityFormValues;
  onSubmit: (values: ActivityFormValues, imageItems: ImageFileItem[]) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  showPublication?: boolean;
  showCoverUpload?: boolean;
  mediaPanel?: React.ReactNode;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [imageItems, setImageItems] = React.useState<ImageFileItem[]>([]);
  const imageItemsRef = React.useRef(imageItems);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema as never),
    defaultValues,
  });

  const hasUnsavedChanges = isDirty || imageItems.length > 0;

  React.useEffect(() => {
    imageItemsRef.current = imageItems;
  }, [imageItems]);

  React.useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setImageItems((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${current.length + index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isCover: current.length === 0 && index === 0,
      })),
    ]);
    event.target.value = "";
  };

  const setCoverImage = (id: string) => {
    setImageItems((current) =>
      current.map((item) => ({ ...item, isCover: item.id === id })),
    );
  };

  const removeImage = (id: string) => {
    setImageItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const remaining = current.filter((item) => item.id !== id);
      if (target?.isCover && remaining.length > 0) remaining[0].isCover = true;
      return remaining;
    });
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm("Discard Unsaved Changes?")) return;
    onCancel();
  };

  async function submit(values: ActivityFormValues) {
    setServerError(null);
    try {
      await onSubmit(values, imageItems);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  const hasMediaColumn = showCoverUpload || Boolean(mediaPanel);

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
          hasMediaColumn ? "grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]" : "space-y-6"
        }
      >
        <div className="space-y-6">
          <section className="space-y-6 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs sm:p-8">
            <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
              <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
                <PencilLine aria-hidden className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Activity Details</h2>
                <p className="text-xs text-neutral-500">
                  Write the public story residents will see on the activity page.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="title" required>
                  Activity Title
                </FieldLabel>
                <Input
                  id="title"
                  placeholder="e.g. Community First Aid Training"
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
                <FieldLabel htmlFor="type" required>
                  Activity Type
                </FieldLabel>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="type"
                        className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <SelectValue placeholder="Select Activity Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {activityTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {titleCase(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="excerpt">Preview Summary</FieldLabel>
              <Textarea
                id="excerpt"
                placeholder="Brief summary shown on activity cards and previews..."
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
                  Plain-Text Preview Shown On Public Activity Cards (Maximum 360
                  Characters).
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="activity-body-label">Article Body</FieldLabel>
              <Controller
                control={control}
                name="body_json"
                render={({ field }) => (
                  <RichTextEditor
                    labelledBy="activity-body-label"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {showCoverUpload ? (
            <section className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Images aria-hidden className="size-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    Activity Media & Photos
                  </h2>
                </div>
                {imageItems.length > 0 ? (
                  <span className="text-xs font-semibold text-neutral-500">
                    {imageItems.length} {imageItems.length === 1 ? "Photo" : "Photos"}
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
                          "relative aspect-video w-full overflow-hidden rounded-xl border bg-neutral-100 shadow-2xs",
                          item.isCover
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-neutral-200",
                        )}
                      >
                        <Image
                          src={item.previewUrl}
                          alt="Activity Photo Preview"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(item.id)}
                          className="absolute top-2 right-2 z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                          title="Remove Photo"
                          aria-label="Remove Photo"
                        >
                          <Trash2 aria-hidden className="size-3.5" />
                        </button>
                        <div className="absolute bottom-2 left-2 z-10">
                          {item.isCover ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                              <Star aria-hidden className="size-3 fill-white" />
                              Cover Photo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCoverImage(item.id)}
                              className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full bg-neutral-900/85 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            >
                              <Star aria-hidden className="size-3" />
                              Set As Cover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <UploadControl compact onChange={handleImageSelect} />
                </div>
              ) : (
                <UploadControl onChange={handleImageSelect} />
              )}
              <p className="text-[11px] font-medium text-neutral-500">
                Add one cover photo before publishing. You can add up to ten ordered
                photos.
              </p>
            </section>
          ) : mediaPanel ? (
            mediaPanel
          ) : null}

          <section className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <CalendarClock aria-hidden className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-neutral-900">Schedule & Location</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="starts_at" required>
                  Starts At
                </FieldLabel>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  className={cn(
                    "h-10 rounded-lg border-emerald-200/80 bg-white text-xs font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20",
                    errors.starts_at &&
                      "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                  )}
                  aria-invalid={!!errors.starts_at}
                  {...register("starts_at")}
                />
                {errors.starts_at ? (
                  <p className="text-xs font-semibold text-red-600">
                    {errors.starts_at.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="ends_at">Ends At</FieldLabel>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  className="h-10 rounded-lg border-emerald-200/80 bg-white text-xs font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  {...register("ends_at")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="venue">Venue</FieldLabel>
              <Input
                id="venue"
                placeholder="e.g. Barangay Multi-Purpose Hall"
                className="h-10 rounded-lg border-emerald-200/80 bg-white text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                {...register("venue")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="area_id">Area</FieldLabel>
              <Controller
                control={control}
                name="area_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "all"}
                    onValueChange={(value) =>
                      field.onChange(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="area_id"
                      className="h-10 rounded-lg border-emerald-200/80 bg-white text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <SelectValue placeholder="Select Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barangay-Wide</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <p className="inline-flex items-start gap-1.5 text-[11px] font-medium text-neutral-500">
              <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              Schedule and venue details help residents plan their visit.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <Megaphone aria-hidden className="size-4 shrink-0 text-emerald-600" />
                <h2 className="truncate text-sm font-bold text-neutral-900">
                  Publishing Status
                </h2>
              </div>
              {showPublication ? (
                <Controller
                  control={control}
                  name="publication_status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="publication_status"
                        className="h-10 min-w-[9.5rem] rounded-lg border-emerald-200/80 text-xs font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="published">Publish Now</SelectItem>
                        <SelectItem value="draft">Save As Draft</SelectItem>
                        <SelectItem value="archived">Archive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  Draft
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed font-medium text-neutral-500">
              {showPublication
                ? "Publishing requires exactly one cover photo. Drafts can be saved without media."
                : "New activities start as drafts. Add photos and publish them from the editor."}
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full cursor-pointer justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-700 hover:shadow-lg"
              >
                {isSubmitting ? "Saving…" : submitLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="h-10 w-full cursor-pointer justify-center rounded-xl border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </Button>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

function UploadControl({
  onChange,
  compact = false,
}: {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  compact?: boolean;
}) {
  return (
    <Label
      className={cn(
        "cursor-pointer transition-colors hover:border-emerald-600 hover:bg-emerald-50/70",
        compact
          ? "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-600/40 bg-emerald-50/40 px-4 py-2.5 text-center"
          : "flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center",
      )}
    >
      <Input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
      />
      {compact ? (
        <Upload aria-hidden className="size-4 text-emerald-700" />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-2xs">
          <Upload aria-hidden className="size-5" />
        </div>
      )}
      <span className="text-xs font-bold text-emerald-950">
        {compact ? "Add More Photos" : "Upload Activity Photos"}
      </span>
      {!compact ? (
        <span className="text-[11px] text-neutral-500">
          JPEG, PNG, or WebP · Up To 10 Photos
        </span>
      ) : null}
    </Label>
  );
}
