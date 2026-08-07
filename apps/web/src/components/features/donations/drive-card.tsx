import * as React from "react";
import { Info, Package } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { MeterBar } from "@/components/common/meter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicDonationDrive } from "@/lib/api/public-types";

/**
 * A donation drive with its needs (FR-PUB-010, FR-DON-004).
 *
 * **Progress is what arrived, not what was promised.** Each bar divides
 * `received_quantity` by `target_quantity`; the pledged figure is shown in
 * smaller type beside it. schema.md Section 9: "a drive never appears funded
 * while shelves are empty." A drive showing 90% because of pledges, with nothing
 * on the shelf, is how relief planning goes wrong.
 *
 * The no-money notice is required (FR-DON-010) — the platform has no payment
 * fields anywhere and monetary donations go through official channels.
 */

export function DriveCard({
  drive,
  className,
}: {
  drive: PublicDonationDrive;
  className?: string;
}) {
  return (
    <Card radius="xl" className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-h3 text-neutral-900">{drive.title}</h3>
            {drive.event_name ? (
              <span className="text-caption text-neutral-500">
                Responding to: {drive.event_name}
              </span>
            ) : null}
          </div>
          <StatusBadge kind="drive" status={drive.status} className="shrink-0" />
        </div>

        {drive.description ? (
          <p className="text-body text-neutral-600">{drive.description}</p>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-overline inline-flex items-center gap-1.5 text-neutral-500">
              <Package aria-hidden className="size-3" />
              What is needed
            </span>
            <span className="text-body-sm tabular text-primary-700 font-semibold">
              {drive.overall_progress_pct}% received
            </span>
          </div>

          <ul className="flex flex-col gap-3">
            {drive.needs.map((need) => (
              <li key={need.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-body-sm font-semibold text-neutral-800">
                    {need.item_name}
                  </span>
                  <span className="text-body-sm tabular text-neutral-600">
                    {formatQuantity(need.received_quantity)} /{" "}
                    {formatQuantity(need.target_quantity)} {need.unit}
                  </span>
                </div>
                <MeterBar
                  value={need.received_quantity}
                  max={need.target_quantity}
                  tone={need.progress_pct >= 100 ? "success" : "primary"}
                  label={`${need.item_name} received`}
                  valueText={`${formatQuantity(need.received_quantity)} of ${formatQuantity(need.target_quantity)} ${need.unit} received`}
                />
                {need.pledged_quantity > need.received_quantity ? (
                  <span className="text-caption text-neutral-500">
                    {formatQuantity(need.pledged_quantity)} {need.unit} pledged
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-caption bg-info-bg/60 mt-auto inline-flex items-start gap-1.5 rounded-md p-2.5 text-neutral-700">
          <Info aria-hidden className="text-info mt-0.5 size-3.5 shrink-0" />
          The barangay accepts goods only. No money is collected through this site —
          monetary donations go through the barangay&apos;s official channels.
        </p>
      </CardContent>
    </Card>
  );
}
