"use client";

import * as React from "react";
import { FileText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RegistrationTermsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
};

export function RegistrationTermsDialog({
  open,
  onOpenChange,
  onAccept,
}: RegistrationTermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary-200 max-h-[min(86vh,44rem)] max-w-2xl gap-0 overflow-hidden bg-white p-0 shadow-2xl">
        <div className="flex min-h-0 flex-col">
          <DialogHeader className="border-primary-100 from-primary-50 shrink-0 border-b bg-gradient-to-br via-white to-emerald-50/70 px-5 py-5 pr-12 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="bg-primary-100 text-primary-700 border-primary-200 flex size-11 shrink-0 items-center justify-center rounded-2xl border">
                <FileText aria-hidden className="size-5" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-display text-lg font-extrabold tracking-tight text-neutral-900 sm:text-xl">
                  SAGIP-SJ Terms &amp; Conditions
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed font-medium text-neutral-500">
                  Please review the terms for creating and using a resident account.
                </DialogDescription>
                <span className="text-primary-700 border-primary-200 mt-3 inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase">
                  <ShieldCheck aria-hidden className="size-3.5" />
                  Last updated August 10, 2026
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="space-y-5 text-sm leading-relaxed text-neutral-600">
              <section className="border-primary-100 bg-primary-50/60 rounded-2xl border p-4 sm:p-5">
                <h3 className="font-display text-primary-900 text-sm font-extrabold">
                  Agreement to our legal terms
                </h3>
                <p className="mt-2">
                  SAGIP-SJ is a disaster preparedness and emergency response platform for
                  Barangay San Jose, Rodriguez, Rizal. By creating an account, you confirm
                  that you have read, understood, and agree to these terms.
                </p>
              </section>

              <section>
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  Using your account
                </h3>
                <ul className="marker:text-primary-500 mt-2 list-disc space-y-2 pl-5">
                  <li>Provide information that is accurate and belongs to you.</li>
                  <li>
                    Keep your sign-in details private and notify the barangay if you
                    suspect misuse.
                  </li>
                  <li>
                    Use the portal for household preparedness, community information, and
                    emergency assistance.
                  </li>
                  <li>
                    Do not misuse the service, submit false reports, or interfere with
                    another person&apos;s access.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  Household information and privacy
                </h3>
                <p className="mt-2">
                  Registration begins your resident account. Household, member, location,
                  and vulnerability details are collected later to provide the
                  portal&apos;s preparedness and response features. Only provide
                  information you are authorized to submit, and review the barangay&apos;s
                  privacy process before adding other household members.
                </p>
              </section>

              <section>
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  Emergency information
                </h3>
                <p className="mt-2">
                  Portal notices, maps, and reports support official response work but do
                  not replace instructions from barangay officials or emergency
                  responders. For immediate danger, use the emergency hotlines shown on
                  the site.
                </p>
              </section>

              <section className="border-t border-neutral-200 pt-5">
                <h3 className="font-display text-sm font-extrabold text-neutral-900">
                  Changes and ending access
                </h3>
                <p className="mt-2">
                  These terms may be updated when the service or its legal requirements
                  change. Continued use after an updated version is posted means you
                  accept the revised terms. Access may be suspended for misuse or activity
                  that threatens the safety or privacy of the community.
                </p>
              </section>

              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                You can close this window without agreeing. Selecting “Accept terms”
                confirms your agreement and enables account creation.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              pill
              size="md"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Not now
            </Button>
            <Button
              type="button"
              pill
              size="md"
              onClick={onAccept}
              className="w-full gap-2 sm:w-auto"
            >
              <ShieldCheck aria-hidden className="size-4" />
              Accept terms
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
