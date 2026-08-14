"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/common/button";

/**
 * Destructive actions require confirmation (NFR-UX-009). One component so
 * every delete/deactivate button in the console asks the same way.
 */
export function ConfirmDeleteButton({
  onConfirm,
  itemLabel,
  actionLabel = "Delete",
  confirmLabel = "Delete",
  className,
  iconOnly = false,
  disabled = false,
}: {
  onConfirm: () => void;
  itemLabel: string;
  actionLabel?: string;
  confirmLabel?: string;
  className?: string;
  iconOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className={
            className ??
            "h-8 cursor-pointer rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
          }
          title={actionLabel}
          aria-label={actionLabel}
          disabled={disabled}
        >
          <Trash2 aria-hidden className="size-3.5 shrink-0" />
          {!iconOnly ? <span className="md:hidden">{actionLabel}</span> : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionLabel} {itemLabel}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone from this screen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
