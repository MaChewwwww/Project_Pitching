"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import type { IncidentReportOut, IncidentReportPatch } from "@/lib/api/safety-types";

/** FR-SAF-016 — verify or dismiss, with a reason if dismissing. */
function ReviewDialog({
  report,
  onOpenChange,
}: {
  report: IncidentReportOut;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [dismissalReason, setDismissalReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: IncidentReportPatch) =>
      api.patch<IncidentReportOut>(`/admin/incident-reports/${report.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "incident-reports"] });
      toast.success("Report updated");
      onOpenChange(false);
    },
    onError: (err: unknown) => setError(toDisplayError(err).detail),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review report</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-neutral-700">{report.description}</p>
          {report.photo_url ? (
            <Image
              src={report.photo_url}
              alt="Reported incident"
              width={400}
              height={160}
              // Next's image optimizer does a server-side fetch to resolve
              // this, but /uploads/* is only reachable through Caddy — the
              // `web` container itself has no filesystem or network path to
              // it. `unoptimized` renders a plain <img> instead, matching
              // the local blob-preview case in incident-report-form.tsx.
              unoptimized
              className="h-40 w-full rounded-lg border border-neutral-200 object-cover"
            />
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dismissal_reason">Reason (required to dismiss)</Label>
            <Textarea
              id="dismissal_reason"
              rows={2}
              value={dismissalReason}
              onChange={(e) => setDismissalReason(e.target.value)}
            />
          </div>

          {error ? <p className="text-danger text-body-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending || !dismissalReason}
            onClick={() =>
              mutation.mutate({ status: "dismissed", dismissal_reason: dismissalReason })
            }
          >
            Dismiss
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status: "verified" })}
          >
            {mutation.isPending ? "Saving…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentReviewTable({
  items,
  isLoading,
  isError,
  onRetry,
}: {
  items: IncidentReportOut[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const [reviewing, setReviewing] = React.useState<IncidentReportOut | null>(null);

  const columns: ResourceColumn<IncidentReportOut>[] = [
    { key: "type", header: "Type" },
    {
      key: "description",
      header: "Description",
      render: (row) => <span className="line-clamp-2">{row.description}</span>,
    },
    {
      key: "photo",
      header: "Photo",
      render: (row) =>
        row.photo_url ? (
          <a
            href={row.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-700 underline"
          >
            View
          </a>
        ) : (
          <ImageOff aria-hidden className="size-4 text-neutral-400" />
        ),
    },
    {
      key: "location_note",
      header: "Location",
      render: (row) => row.location_note ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
          {row.status.replaceAll("_", " ")}
        </span>
      ),
    },
    {
      key: "reported_by_name",
      header: "Reported by",
      render: (row) => row.reported_by_name ?? "—",
    },
  ];

  return (
    <>
      <ResourceTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        loadingLabel="Loading incident reports"
        isError={isError}
        onRetry={onRetry}
        emptyTitle="No incident reports"
        emptyDescription="Reports submitted by residents will appear here."
        getRowKey={(row) => row.id}
        rowActions={(row) =>
          row.status === "pending" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReviewing(row)}
            >
              Review
            </Button>
          ) : null
        }
      />
      {reviewing ? (
        <ReviewDialog
          key={reviewing.id}
          report={reviewing}
          onOpenChange={(open) => {
            if (!open) setReviewing(null);
          }}
        />
      ) : null}
    </>
  );
}
