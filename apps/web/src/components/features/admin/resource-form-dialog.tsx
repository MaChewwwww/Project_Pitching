"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";
import type { z } from "zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminForm, type AdminField } from "./admin-form";

/**
 * A create/edit form presented in a dialog, triggered by a button (or, for the
 * edit case, controlled externally via `open`/`onOpenChange`). Reused across
 * every resource so opening a form always looks and behaves the same way.
 */
export function ResourceFormDialog<TFieldValues extends FieldValues>({
  title,
  fields,
  schema,
  defaultValues,
  onSubmit,
  trigger,
  open,
  onOpenChange,
}: {
  title: string;
  fields: AdminField[];
  schema: z.ZodType<TFieldValues>;
  defaultValues: TFieldValues;
  onSubmit: (values: TFieldValues) => Promise<void>;
  /** Omit to get the default "+ Add" trigger button. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  async function handleSubmit(values: TFieldValues) {
    await onSubmit(values);
    setDialogOpen(false);
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== undefined ? (
        trigger ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : null
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus aria-hidden className="size-4" />
            Add
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <AdminForm
          fields={fields}
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
