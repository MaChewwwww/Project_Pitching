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
}: {
  onConfirm: () => void;
  itemLabel: string;
  actionLabel?: string;
  confirmLabel?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger" size="sm">
          <Trash2 aria-hidden className="size-3.5" />
          {actionLabel}
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
