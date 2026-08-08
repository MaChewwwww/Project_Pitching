"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldValues } from "react-hook-form";
import type { z } from "zod";
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
import type { ProblemDetail } from "@/lib/api/client";
import { toDisplayError } from "@/lib/api/client";

/**
 * A create/edit form for one admin resource, driven by a field descriptor list
 * rather than hand-written per screen. Twelve resources become twelve
 * `AdminField[]` arrays plus a Zod schema each — the same trade the sibling
 * `ResourceTable` makes for lists.
 *
 * Field-level errors are mapped from the RFC 7807 `errors[]` array
 * `toDisplayError()` produces (architecture.md Section 6.1), so a 422 from a
 * database constraint (e.g. `chk_alert_needs_instruction`) surfaces under the
 * right input, not as a generic toast.
 */

export type AdminField =
  | {
      name: string;
      label: string;
      type: "text" | "number" | "datetime-local";
      placeholder?: string;
      description?: string;
    }
  | {
      name: string;
      label: string;
      type: "textarea";
      placeholder?: string;
      description?: string;
    }
  | { name: string; label: string; type: "checkbox"; description?: string }
  | {
      name: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      description?: string;
    };

export interface AdminFormProps<TFieldValues extends FieldValues> {
  fields: AdminField[];
  schema: z.ZodType<TFieldValues>;
  defaultValues: TFieldValues;
  onSubmit: (values: TFieldValues) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
}

export function AdminForm<TFieldValues extends FieldValues>({
  fields,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  onCancel,
}: AdminFormProps<TFieldValues>) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    // `zodResolver`'s inferred generic and our own `TFieldValues` are
    // structurally identical but nominally distinct as far as variance
    // checking is concerned for a generic wrapper like this one — the cast is
    // the standard escape hatch for a generic RHF+Zod form component.
  } = useForm<TFieldValues>({
    resolver: zodResolver(schema as never),
    defaultValues: defaultValues as never,
  });

  async function submit(values: TFieldValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      const problem =
        error instanceof Error && "detail" in error
          ? (error as unknown as ProblemDetail)
          : toDisplayError(error);
      setServerError(problem.detail);
      for (const fieldError of problem.errors ?? []) {
        setError(fieldError.field as never, { message: fieldError.message });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      {serverError ? (
        <div
          role="alert"
          className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      {fields.map((field) => {
        const fieldError = errors[field.name as keyof TFieldValues];
        const errorId = fieldError ? `${field.name}-error` : undefined;

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            {field.type !== "checkbox" ? (
              <Label htmlFor={field.name}>{field.label}</Label>
            ) : null}

            {field.type === "textarea" ? (
              <Textarea
                id={field.name}
                placeholder={field.placeholder}
                aria-invalid={!!fieldError}
                aria-describedby={errorId}
                {...register(field.name as never)}
              />
            ) : field.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name={field.name as never}
                  render={({ field: f }) => (
                    <Checkbox
                      id={field.name}
                      checked={!!f.value}
                      onCheckedChange={f.onChange}
                    />
                  )}
                />
                <Label htmlFor={field.name} className="font-normal">
                  {field.label}
                </Label>
              </div>
            ) : field.type === "select" ? (
              <Controller
                control={control}
                name={field.name as never}
                render={({ field: f }) => (
                  <Select value={f.value ?? ""} onValueChange={f.onChange}>
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input
                id={field.name}
                type={field.type}
                placeholder={field.placeholder}
                aria-invalid={!!fieldError}
                aria-describedby={errorId}
                {...register(
                  field.name as never,
                  field.type === "number" ? { valueAsNumber: true } : undefined,
                )}
              />
            )}

            {field.description ? (
              <p className="text-caption text-neutral-500">{field.description}</p>
            ) : null}
            {fieldError ? (
              <p id={errorId} className="text-danger text-xs">
                {String(fieldError.message)}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="mt-2 flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
