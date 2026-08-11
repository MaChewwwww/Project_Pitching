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

const activityTypes = [
  "drill",
  "seminar",
  "first_aid",
  "cleanup",
  "tree_planting",
  "ngo_program",
  "other",
] as const;

export const activityFormSchema = z.object({
  title: z.string().min(1, "Required"),
  excerpt: z.string().max(360, "Keep the preview under 360 characters").default(""),
  body_json: z.custom<ArticleDocument>(),
  type: z.enum(activityTypes),
  starts_at: z.string().min(1, "Required"),
  ends_at: z.string().optional(),
  venue: z.string().optional(),
  area_id: z.string().optional(),
  publication_status: z.enum(["draft", "published", "archived"]).default("draft"),
});
export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function ActivityForm({
  areas,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save activity",
  showPublication = true,
}: {
  areas: { id: string; name: string }[];
  defaultValues: ActivityFormValues;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  showPublication?: boolean;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema as never),
    defaultValues,
  });

  async function submit(values: ActivityFormValues) {
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
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
          {errors.title ? (
            <p className="text-danger text-xs">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Activity type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Preview summary</Label>
        <Textarea id="excerpt" {...register("excerpt")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label id="activity-body-label">Article body</Label>
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
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="starts_at">Starts at</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            aria-invalid={!!errors.starts_at}
            {...register("starts_at")}
          />
          {errors.starts_at ? (
            <p className="text-danger text-xs">{errors.starts_at.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ends_at">Ends at</Label>
          <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" {...register("venue")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="area_id">Area</Label>
          <Controller
            control={control}
            name="area_id"
            render={({ field }) => (
              <Select
                value={field.value || "all"}
                onValueChange={(value) => field.onChange(value === "all" ? "" : value)}
              >
                <SelectTrigger id="area_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barangay-wide</SelectItem>
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
