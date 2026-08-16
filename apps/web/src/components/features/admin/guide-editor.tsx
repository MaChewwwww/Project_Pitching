"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, CalendarCheck, Eye, Save } from "lucide-react";

import { Button } from "@/components/common/button";
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

function guideLabel(value: string) {
  return value === "n/a"
    ? "Preparedness Essential"
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const guideEditorSchema = z
  .object({
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
  })
  .superRefine((values, context) => {
    if (values.is_published && !values.source_attribution.trim()) {
      context.addIssue({
        code: "custom",
        path: ["source_attribution"],
        message: "Required when publishing",
      });
    }
    if (values.is_published && !values.last_reviewed_at) {
      context.addIssue({
        code: "custom",
        path: ["last_reviewed_at"],
        message: "Required when publishing",
      });
    }
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
    formState: { errors, isSubmitting },
  } = useForm<GuideEditorValues>({
    resolver: zodResolver(guideEditorSchema) as never,
    defaultValues,
  });
  const values = useWatch({ control }) as GuideEditorValues;

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
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div className="space-y-6">
        <section className="space-y-6 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs sm:p-8">
          {serverError ? (
            <p
              role="alert"
              className="border-danger-border bg-danger-bg text-danger mb-6 rounded-xl border p-3 text-sm"
            >
              {serverError}
            </p>
          ) : null}
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
              <BookOpen aria-hidden className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Guide Details</h2>
              <p className="text-xs text-neutral-500">
                Set the guide identity, language versions, and preparedness content.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Slug" htmlFor="slug" required error={errors.slug?.message}>
              <Input
                id="slug"
                {...register("slug")}
                aria-invalid={!!errors.slug}
                placeholder="paghahanda-sa-baha"
                className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </Field>
            <Field
              label="Sort Order"
              htmlFor="sort_order"
              required
              error={errors.sort_order?.message}
            >
              <Input
                id="sort_order"
                type="number"
                min="0"
                {...register("sort_order")}
                aria-invalid={!!errors.sort_order}
                className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </Field>
            <Field label="Hazard Type" htmlFor="hazard_type" required>
              <Controller
                control={control}
                name="hazard_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="hazard_type"
                      aria-required="true"
                      className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <SelectValue placeholder="Select Hazard Type" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                    >
                      {hazards.map((item) => (
                        <SelectItem key={item} value={item}>
                          {guideLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Phase" htmlFor="phase" required>
              <Controller
                control={control}
                name="phase"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="phase"
                      aria-required="true"
                      className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <SelectValue placeholder="Select Phase" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                    >
                      {phases.map((item) => (
                        <SelectItem key={item} value={item}>
                          {guideLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="mt-8 border-b border-neutral-200">
            <div role="tablist" aria-label="Guide Language" className="flex gap-5">
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
                <Field
                  label="Pamagat"
                  htmlFor="title_fil"
                  required
                  error={errors.title_fil?.message}
                >
                  <Input
                    id="title_fil"
                    {...register("title_fil")}
                    aria-invalid={!!errors.title_fil}
                    className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
                <Field
                  label="Gabay"
                  htmlFor="body_fil"
                  required
                  error={errors.body_fil?.message}
                >
                  <Textarea
                    id="body_fil"
                    {...register("body_fil")}
                    aria-invalid={!!errors.body_fil}
                    rows={13}
                    placeholder="Gumamit ng ## para sa subheading."
                    className="rounded-lg border-emerald-200/80 bg-white text-sm shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field
                  label="Title"
                  htmlFor="title_en"
                  required
                  error={errors.title_en?.message}
                >
                  <Input
                    id="title_en"
                    {...register("title_en")}
                    aria-invalid={!!errors.title_en}
                    className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
                <Field
                  label="Guide"
                  htmlFor="body_en"
                  required
                  error={errors.body_en?.message}
                >
                  <Textarea
                    id="body_en"
                    {...register("body_en")}
                    aria-invalid={!!errors.body_en}
                    rows={13}
                    placeholder="Use ## for section headings."
                    className="rounded-lg border-emerald-200/80 bg-white text-sm shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </Field>
              </>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900">
            <CalendarCheck className="text-primary-700 size-4" /> Review Record
          </h2>
          <div className="space-y-4">
            <Field
              label="Source Attribution"
              htmlFor="source_attribution"
              required={values.is_published}
              error={errors.source_attribution?.message}
            >
              <Input
                id="source_attribution"
                {...register("source_attribution")}
                aria-required={values.is_published}
                aria-invalid={!!errors.source_attribution}
                placeholder="NDRRMC, DOH, PRC…"
                className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </Field>
            <Field
              label="Last Reviewed"
              htmlFor="last_reviewed_at"
              required={values.is_published}
              error={errors.last_reviewed_at?.message}
            >
              <Input
                id="last_reviewed_at"
                type="date"
                {...register("last_reviewed_at")}
                aria-required={values.is_published}
                aria-invalid={!!errors.last_reviewed_at}
                className="h-11 rounded-lg border-emerald-200/80 bg-white text-sm font-medium shadow-2xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
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
                    <strong className="block text-neutral-900">Publish Guide</strong>
                    <span className="mt-1 block text-neutral-500">
                      Published guides need both a source and review date.
                    </span>
                  </span>
                </label>
              )}
            />
          </div>
        </section>
        <section className="border-primary-100 bg-primary-50/60 rounded-2xl border p-6">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900">
            <Eye className="text-primary-700 size-4" /> Public Preview
          </h2>
          <p className="text-primary-700 mt-4 text-xs font-bold tracking-wide uppercase">
            {guideLabel(values.hazard_type)} · {guideLabel(values.phase)}
          </p>
          <h3 className="mt-2 text-lg leading-snug font-bold text-neutral-900">
            {title || "Guide Title"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-neutral-700">
            {body || "The selected language appears here as the public guide is written."}
          </p>
          <p className="border-primary-100 mt-4 border-t pt-3 text-xs text-neutral-600">
            {values.source_attribution || "Source Attribution"}
            {values.last_reviewed_at ? ` · Reviewed ${values.last_reviewed_at}` : ""}
          </p>
        </section>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg bg-emerald-700 font-bold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md active:scale-[0.99]"
          >
            <Save aria-hidden className="size-4" />
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 w-full rounded-lg border-neutral-300 font-semibold"
          >
            Cancel
          </Button>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-bold tracking-wider text-neutral-600 uppercase"
      >
        {label}
        {required ? <span className="ml-1 font-bold text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}
