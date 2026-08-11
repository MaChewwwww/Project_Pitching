"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

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

/** Informational donation notices only (FR-DON-015 … 017, D-16). */
export const donationDriveFormSchema = z.object({
  title: z.string().min(1, "Required"),
  excerpt: z.string().max(360, "Keep the preview under 360 characters").default(""),
  body_json: z.custom<ArticleDocument>(),
  organizer_name: z.string().optional(),
  organizer_contact: z.string().optional(),
  drop_off_instructions: z.string().optional(),
  active_from: z.string().optional(),
  active_until: z.string().optional(),
  publication_status: z.enum(["draft", "published", "archived"]).default("draft"),
});
export type DonationDriveFormValues = z.infer<typeof donationDriveFormSchema>;

export function DonationDriveForm({
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = "Save notice",
  showPublication = true,
}: {
  onSubmit: (values: DonationDriveFormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues: DonationDriveFormValues;
  submitLabel?: string;
  showPublication?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DonationDriveFormValues>({
    resolver: zodResolver(donationDriveFormSchema as never),
    defaultValues,
  });

  async function submit(values: DonationDriveFormValues) {
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title ? (
          <p className="text-danger text-xs">{errors.title.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Preview summary</Label>
        <Textarea id="excerpt" {...register("excerpt")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label id="donation-body-label">Article body</Label>
        <Controller
          control={control}
          name="body_json"
          render={({ field }) => (
            <RichTextEditor
              labelledBy="donation-body-label"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organizer_name">Organizer</Label>
          <Input id="organizer_name" {...register("organizer_name")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organizer_contact">Organizer contact</Label>
          <Input id="organizer_contact" {...register("organizer_contact")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="drop_off_instructions">Drop-off instructions</Label>
        <Textarea id="drop_off_instructions" {...register("drop_off_instructions")} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="active_from">Active from</Label>
          <Input id="active_from" type="datetime-local" {...register("active_from")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="active_until">Active until</Label>
          <Input id="active_until" type="datetime-local" {...register("active_until")} />
        </div>
      </div>
      {showPublication ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publication_status">Publication</Label>
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
            A cover image and alt text are required before publishing.
          </p>
        </div>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
