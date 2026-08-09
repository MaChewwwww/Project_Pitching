"use client";

import * as React from "react";
import { CircleCheck, TriangleAlert, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MemberSafetyOut, SafetyStatusValue } from "@/lib/api/safety-types";

export interface SafetyStatusControlProps {
  members: MemberSafetyOut[];
  onMarkMember: (memberId: string, status: SafetyStatusValue) => unknown;
  onMarkHousehold: (
    status: SafetyStatusValue,
    acknowledgedMemberIds: string[],
  ) => unknown;
  isSubmitting?: boolean;
}

/**
 * design.md Section 7.2 — per-member toggles plus one "Mark whole household
 * safe" action, gated behind a dialog that lists every member by name and
 * requires explicit confirmation (FR-SAF-003). This is never a single
 * ambiguous tap: BR-5.1b's whole argument is that an over-reported "safe"
 * removes someone from the search list, and in disaster response that is far
 * more dangerous than an under-reported one.
 */
export function SafetyStatusControl({
  members,
  onMarkMember,
  onMarkHousehold,
  isSubmitting,
}: SafetyStatusControlProps) {
  const [bulkOpen, setBulkOpen] = React.useState(false);

  async function confirmBulk() {
    await onMarkHousehold(
      "safe",
      members.map((m) => m.member_id),
    );
    setBulkOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.member_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
          >
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-semibold text-neutral-900">
                {member.full_name}
                {member.is_head ? (
                  <span className="font-normal text-neutral-500"> · Head</span>
                ) : null}
              </span>
              <StatusBadge
                kind="safety"
                status={member.status}
                setMethod={member.set_method}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onMarkMember(member.member_id, "safe")}
              >
                <CircleCheck aria-hidden className="size-3.5" />
                Safe
              </Button>
              <Button
                type="button"
                size="sm"
                variant="emergency"
                disabled={isSubmitting}
                onClick={() => onMarkMember(member.member_id, "needs_rescue")}
              >
                <TriangleAlert aria-hidden className="size-3.5" />
                Needs rescue
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting || members.length === 0}
        onClick={() => setBulkOpen(true)}
      >
        <Users aria-hidden className="size-4" />
        Mark whole household safe
      </Button>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark {members.length} member{members.length === 1 ? "" : "s"} safe?
            </DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-neutral-600">
            This covers everyone listed below. If someone is actually missing — at work,
            at school, somewhere else — mark them individually instead of using this.
          </p>
          <ul className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-3">
            {members.map((m) => (
              <li key={m.member_id} className="text-body-sm text-neutral-800">
                {m.full_name}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void confirmBulk()}
            >
              Confirm — mark all safe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
