"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  RescueRequestOut,
  RescueRequestPatch,
  RescueRequestStatus,
} from "@/lib/api/safety-types";

/** Mirrors `RESCUE_TRANSITIONS` in `safety/service.py` — kept here so the
 * dropdown only ever offers a move the server will actually accept. */
const NEXT_STATUS: Record<RescueRequestStatus, RescueRequestStatus[]> = {
  pending: ["verified", "dismissed"],
  verified: ["dispatched", "dismissed"],
  dispatched: ["resolved", "dismissed"],
  resolved: [],
  dismissed: [],
};

const STATUS_LABEL: Record<RescueRequestStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  dispatched: "Dispatched",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function RescueTriageDialog({
  request,
  open,
  onOpenChange,
}: {
  request: RescueRequestOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Lazy initializers, not an effect syncing on `request` — the caller
  // remounts this component with `key={request.id}` whenever a different
  // request is opened, so a fresh mount is exactly when these need to
  // reset, and there is nothing to resync while the same request stays open.
  const [status, setStatus] = React.useState<RescueRequestStatus>(() => request.status);
  const [resolutionNote, setResolutionNote] = React.useState(
    () => request.resolution_note ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: RescueRequestPatch) =>
      api.patch<RescueRequestOut>(`/admin/rescue-requests/${request.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "rescue-requests"] });
      toast.success("Rescue request updated");
      onOpenChange(false);
    },
    onError: (err: unknown) => setError(toDisplayError(err).detail),
  });

  const options: RescueRequestStatus[] = [request.status, ...NEXT_STATUS[request.status]];
  const needsNote = status === "resolved" || status === "dismissed";

  function handleSave() {
    setError(null);
    const body: RescueRequestPatch = {};
    if (status !== request.status) body.status = status;
    if (resolutionNote !== (request.resolution_note ?? "")) {
      body.resolution_note = resolutionNote || null;
    }
    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }
    mutation.mutate(body);
  }

  function handleAssignToMe() {
    if (!user) return;
    mutation.mutate({ assigned_to_user_id: user.id });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Triage — {request.requester_name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-neutral-700">{request.description}</p>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as RescueRequestStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsNote ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resolution_note">Resolution note (required)</Label>
              <Textarea
                id="resolution_note"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          ) : null}

          {request.assigned_to_name ? (
            <p className="text-body-sm text-neutral-600">
              Assigned to <span className="font-semibold">{request.assigned_to_name}</span>
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={handleAssignToMe}
              disabled={mutation.isPending}
            >
              Assign to me
            </Button>
          )}

          {error ? <p className="text-danger text-body-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending || (needsNote && !resolutionNote)}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
