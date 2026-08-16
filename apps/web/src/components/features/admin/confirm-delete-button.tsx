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
 * every delete/deactivate button in the console asks with a clear, high-contrast,
 * destructive warning modal.
 */
export function ConfirmDeleteButton({
  onConfirm,
  itemLabel,
  actionLabel = "Delete",
  confirmLabel = "Delete",
  description,
  className,
  iconOnly = false,
  disabled = false,
}: {
  onConfirm: () => void;
  itemLabel: string;
  actionLabel?: string;
  confirmLabel?: string;
  description?: string | React.ReactNode;
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

      <AlertDialogContent className="max-w-md rounded-2xl border border-rose-200/90 bg-white p-5 sm:p-6 shadow-2xl overflow-hidden">
        <AlertDialogHeader className="flex flex-col gap-1 text-left">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700 border border-rose-200/80 shadow-2xs">
              <Trash2 className="size-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base font-black text-neutral-900 leading-tight">
                {actionLabel} {itemLabel ? "" : "Record"}?
              </AlertDialogTitle>
              {itemLabel ? (
                <p className="text-xs font-bold text-rose-700 truncate mt-1" title={itemLabel}>
                  {itemLabel}
                </p>
              ) : null}
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-neutral-600 leading-relaxed mt-2.5">
            {description ?? (
              <>
                Are you sure you want to {actionLabel.toLowerCase()}{" "}
                <strong className="text-neutral-900 font-semibold">{itemLabel}</strong>?
                This action cannot be undone and will permanently remove this record from the active directory.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 flex items-center justify-end gap-2.5 border-t border-neutral-100 pt-4 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 bg-neutral-50/60">
          <AlertDialogCancel className="h-9 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs px-4 shadow-sm shadow-rose-900/10 hover:shadow-md hover:shadow-rose-900/20 transition-all cursor-pointer border border-rose-700/30 gap-1.5"
          >
            <Trash2 className="size-3.5 stroke-[2.2]" />
            <span>{confirmLabel}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
