"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  emptyArticleDocument,
  RichTextEditor,
  type ArticleDocument,
} from "@/components/features/admin/rich-text-editor";
import { toDisplayError } from "@/lib/api/client";

/**
 * Announcement / alert form — special-cased rather than driven by `AdminForm`'s
 * generic field descriptors because it has two things no other resource does:
 * multi-area targeting and a conditionally-required field. The database enforces
 * the same rule with `chk_alert_needs_instruction` (FR-ALT-005) — this validator
 * is what turns that constraint into a field-level error instead of a 422 toast.
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
    alert_level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    title: z.string().min(1, "Required"),
    excerpt: z.string().max(360, "Keep the summary under 360 characters").default(""),
    body_json: z.custom<ArticleDocument>(),
    instruction: z.string().optional(),
    is_barangay_wide: z.boolean().default(true),
    area_ids: z.array(z.string()).default([]),
    expires_at: z.string().optional(),
    publication_status: z.enum(["draft", "published", "archived"]).default("draft"),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "alert" && !values.instruction?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["instruction"],
        message: "An alert cannot be published without an instruction (FR-ALT-005).",
      });
    }
  });

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export function AnnouncementForm({
  areas,
  defaultValues,
  onSubmit,
  onCancel,
}: {
  areas: { id: string; name: string }[];
  defaultValues: AnnouncementFormValues;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    // Zod's `.default()` fields make the *input* type optional while
    // `z.infer` (the *output* type `AnnouncementFormValues` uses) requires
    // them — a known variance mismatch between zodResolver and RHF's generic.
    resolver: zodResolver(announcementFormSchema as never),
    defaultValues,
  });

  // `useWatch` rather than `form.watch()` — the latter returns a function the
  // React Compiler cannot safely memoize (it skips the whole component when it
  // sees one), where `useWatch` is a normal subscribed hook.
  const kind = useWatch({ control, name: "kind" });
  const isBarangayWide = useWatch({ control, name: "is_barangay_wide" });

  async function submit(values: AnnouncementFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-6">
      {serverError ? (
        <div
          role="alert"
          className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Kind</Label>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="kind" className="w-full">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {announcementTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {kind === "alert" ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="severity">Severity</Label>
            <Controller
              control={control}
              name="severity"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="severity" className="w-full">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alert_level">River alert level</Label>
            <Controller
              control={control}
              name="alert_level"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) =>
                    field.onChange(v ? (Number(v) as 1 | 2 | 3) : undefined)
                  }
                >
                  <SelectTrigger id="alert_level" className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 · Prepare</SelectItem>
                    <SelectItem value="2">2 · Evacuate</SelectItem>
                    <SelectItem value="3">3 · Forced Evacuation</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title ? (
          <p className="text-danger text-xs">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Preview summary</Label>
        <Textarea id="excerpt" aria-invalid={!!errors.excerpt} {...register("excerpt")} />
        <p className="text-xs text-neutral-500">Plain text shown in article previews.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label id="article-body-label">Article body</Label>
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instruction">
          Instruction{" "}
          {kind === "alert" ? "(required for alerts — FR-ALT-005)" : "(optional)"}
        </Label>
        <Textarea
          id="instruction"
          aria-invalid={!!errors.instruction}
          {...register("instruction")}
        />
        {errors.instruction ? (
          <p className="text-danger text-xs">{errors.instruction.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="is_barangay_wide"
          render={({ field }) => (
            <Checkbox
              id="is_barangay_wide"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="is_barangay_wide" className="font-normal">
          Barangay-wide
        </Label>
      </div>

      {!isBarangayWide ? (
        <div className="flex flex-col gap-1.5">
          <Label>Target areas</Label>
          <Controller
            control={control}
            name="area_ids"
            render={({ field }) => (
              <div className="flex flex-wrap gap-3 rounded-md border border-neutral-200 p-3">
                {areas.map((area) => {
                  const checked = field.value.includes(area.id);
                  return (
                    <label key={area.id} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          field.onChange(
                            c
                              ? [...field.value, area.id]
                              : field.value.filter((id) => id !== area.id),
                          )
                        }
                      />
                      {area.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expires_at">Expires at (optional)</Label>
        <Input id="expires_at" type="datetime-local" {...register("expires_at")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Controller
          control={control}
          name="publication_status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="publication_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Save as draft</SelectItem>
                <SelectItem value="published">Publish now</SelectItem>
                <SelectItem value="archived">Archive</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-neutral-500">
          Routine announcements need a cover image before publishing. Alerts remain
          text-first.
        </p>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
