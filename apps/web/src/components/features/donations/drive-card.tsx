import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { CalendarDays, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { cn } from "@/lib/utils";
import type { PublicDonationDrive } from "@/lib/api/public-types";

/** Informational donation-drive preview; no transaction or pledge progress exists. */
export function DriveCard({
  drive,
  className,
}: {
  drive: PublicDonationDrive;
  className?: string;
}) {
  return (
    <Link
      href={`/donation-drives/${drive.slug}` as Route}
      className="group block h-full rounded-[20px] focus-visible:ring-primary-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={`Read donation drive: ${drive.title}`}
    >
    <Card radius="xl" className={cn("h-full overflow-hidden", className)} interactive>
      {drive.cover_image ? (
        <div className="relative block aspect-video bg-neutral-100">
          <Image
            src={drive.cover_image.url}
            alt={drive.cover_image.alt_text}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-overline text-primary-700">Collection notice</span>
          <h3 className="text-h3 text-neutral-900">
            {drive.title}
          </h3>
          <p className="text-body text-neutral-600">{drive.excerpt}</p>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
          {drive.active_until ? (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="text-primary-600 size-4" /> Active until{" "}
              {new Date(drive.active_until).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          ) : null}
          {drive.drop_off_instructions ? (
            <span className="inline-flex items-start gap-2">
              <MapPin className="text-primary-600 mt-0.5 size-4 shrink-0" />{" "}
              {drive.drop_off_instructions}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
