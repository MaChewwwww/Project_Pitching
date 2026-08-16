"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, Eye, Save } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDisplayError } from "@/lib/api/client";

const hazards = [
  "flood",
  "earthquake",
  "typhoon",
  "fire",
  "landslide",
  "general",
  "food",
] as const;
const phases = ["before", "during", "after", "n/a"] as const;

export const guideEditorSchema = z.object({
  slug: z
    .string()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  hazard_type: z.enum(hazards),
  phase: z.enum(phases),
  title_fil: z.string().min(1, "Required"),
  title_en: z.string().min(1, "Required"),
  body_fil: z.string().min(1, "Required"),
  body_en: z.string().min(1, "Required"),
  source_attribution: z.string(),
  last_reviewed_at: z.string(),
  sort_order: z.coerce.number().int().min(0),
  is_published: z.boolean(),
});

export type GuideEditorValues = z.infer<typeof guideEditorSchema>;

export const emptyGuideValues: GuideEditorValues = {
  slug: "",
  hazard_type: "flood",
  phase: "before",
  title_fil: "",
  title_en: "",
  body_fil: "",
  body_en: "",
  source_attribution: "",
  last_reviewed_at: "",
  sort_order: 0,
  is_published: false,
};

export function guidePayload(values: GuideEditorValues) {
  return {
    ...values,
    source_attribution: values.source_attribution || null,
    last_reviewed_at: values.last_reviewed_at
      ? new Date(`${values.last_reviewed_at}T00:00:00`).toISOString()
      : null,
  };
}

export function GuideEditor({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues: GuideEditorValues;
  onSubmit: (values: GuideEditorValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [language, setLanguage] = React.useState<"fil" | "en">("fil");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GuideEditorValues>({
    resolver: zodResolver(guideEditorSchema) as never,
    defaultValues,
  });
  const values = watch();

  async function submit(values: GuideEditorValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(toDisplayError(error).detail);
    }
  }

  const title = language === "fil" ? values.title_fil : values.title_en;
  const body = language === "fil" ? values.body_fil : values.body_en;

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div className="shadow-sm-card rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
        {serverError ? (
          <p
            role="alert"
            className="border-danger-border bg-danger-bg text-danger mb-6 rounded-xl border p-3 text-sm"
          >
            {serverError}
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Slug" error={errors.slug?.message}>
            <Input
              {...register("slug")}
              aria-invalid={!!errors.slug}
              placeholder="paghahanda-sa-baha"
            />
          </Field>
          <Field label="Sort order" error={errors.sort_order?.message}>
            <Input type="number" min="0" {...register("sort_order")} />
          </Field>
          <Field label="Hazard">
            <select
              {...register("hazard_type")}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm capitalize"
            >
              {hazards.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="When to use">
            <select
              {...register("phase")}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm capitalize"
            >
              {phases.map((item) => (
                <option key={item} value={item}>
                  {item === "n/a" ? "Preparedness essential" : item}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-8 border-b border-neutral-200">
          <div role="tablist" aria-label="Guide language" className="flex gap-5">
            <button
              type="button"
              role="tab"
              aria-selected={language === "fil"}
              onClick={() => setLanguage("fil")}
              className={`border-b-2 px-1 pb-3 text-sm font-bold ${language === "fil" ? "border-primary-700 text-primary-800" : "border-transparent text-neutral-500"}`}
            >
              Filipino
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={language === "en"}
              onClick={() => setLanguage("en")}
              className={`border-b-2 px-1 pb-3 text-sm font-bold ${language === "en" ? "border-primary-700 text-primary-800" : "border-transparent text-neutral-500"}`}
            >
              English
            </button>
          </div>
        </div>
        <div className="mt-6 space-y-5">
          {language === "fil" ? (
            <>
              <Field label="Pamagat" error={errors.title_fil?.message}>
                <Input {...register("title_fil")} />
              </Field>
              <Field label="Gabay" error={errors.body_fil?.message}>
                <Textarea
                  {...register("body_fil")}
                  rows={13}
                  placeholder="Gumamit ng ## para sa subheading."
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Title" error={errors.title_en?.message}>
                <Input {...register("title_en")} />
              </Field>
              <Field label="Guide" error={errors.body_en?.message}>
                <Textarea
                  {...register("body_en")}
                  rows={13}
                  placeholder="Use ## for section headings."
                />
              </Field>
            </>
          )}
        </div>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900">
            <CalendarCheck className="text-primary-700 size-4" /> Review record
          </h2>
          <div className="mt-4 space-y-4">
            <Field label="Source attribution">
              <Input
                {...register("source_attribution")}
                placeholder="NDRRMC, DOH, PRC…"
              />
            </Field>
            <Field label="Last reviewed">
              <Input type="date" {...register("last_reviewed_at")} />
            </Field>
            <Controller
              control={control}
              name="is_published"
              render={({ field }) => (
                <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="accent-primary-700 mt-0.5 size-4"
                  />
                  <span>
                    <strong className="block text-neutral-900">Publish guide</strong>
                    <span className="mt-1 block text-neutral-500">
                      Published guides need both a source and review date.
                    </span>
                  </span>
                </label>
              )}
            />
          </div>
        </section>
        <section className="border-primary-100 bg-primary-50/60 rounded-2xl border p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900">
            <Eye className="text-primary-700 size-4" /> Reading preview
          </h2>
          <p className="text-primary-700 mt-4 text-xs font-bold tracking-wide uppercase">
            {values.hazard_type} · {values.phase}
          </p>
          <h3 className="mt-2 text-lg leading-snug font-bold text-neutral-900">
            {title || "Guide title"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-neutral-700">
            {body || "The selected language appears here as the public guide is written."}
          </p>
          <p className="border-primary-100 mt-4 border-t pt-3 text-xs text-neutral-600">
            {values.source_attribution || "Source attribution"}
            {values.last_reviewed_at ? ` · Reviewed ${values.last_reviewed_at}` : ""}
          </p>
        </section>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            <Save aria-hidden className="size-4" />
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}
