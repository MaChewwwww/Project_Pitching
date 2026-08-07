import type { PublicDonationDrive, PublicDriveNeed } from "@/lib/api/public-types";
import { daysAgo } from "./clock";

/**
 * Donation drives (FR-DON-*, FR-PUB-010).
 *
 * **Progress is measured in what arrived, never in what was promised.**
 * `progress_pct` divides `received_quantity` by `target_quantity`;
 * `pledged_quantity` is carried alongside as secondary information only.
 * schema.md Section 9 puts it plainly: a drive must never appear funded while the
 * shelves are still empty.
 *
 * There is no monetary field here and none may be added (FR-DON-010) — the
 * platform never handles money.
 */
function need(
  n: number,
  itemName: string,
  target: number,
  unit: string,
  received: number,
  pledged: number,
  sortOrder: number,
): PublicDriveNeed {
  return {
    id: `21000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    item_name: itemName,
    target_quantity: target,
    unit,
    sort_order: sortOrder,
    received_quantity: received,
    pledged_quantity: pledged,
    progress_pct: Math.min(100, Math.round((received / target) * 100)),
  };
}

function drive(
  id: string,
  title: string,
  description: string,
  status: PublicDonationDrive["status"],
  openedDaysAgo: number,
  eventName: string | null,
  needs: PublicDriveNeed[],
): PublicDonationDrive {
  const target = needs.reduce((sum, x) => sum + x.target_quantity, 0);
  const received = needs.reduce((sum, x) => sum + x.received_quantity, 0);
  return {
    id,
    title,
    description,
    status,
    opened_at: daysAgo(openedDaysAgo),
    closed_at: null,
    event_id: eventName ? "31000000-0000-4000-8000-000000000001" : null,
    event_name: eventName,
    needs,
    overall_progress_pct:
      target > 0 ? Math.min(100, Math.round((received / target) * 100)) : 0,
  };
}

export const DONATION_DRIVES: PublicDonationDrive[] = [
  drive(
    "41000000-0000-4000-8000-000000000001",
    "Relief Goods for Riverside Households",
    "Supporting the households in Areas 1 and 2 currently sheltering at San Jose Elementary School. Drop-off at the barangay hall, any day between 8:00 AM and 6:00 PM.",
    "open",
    3,
    "Continuous Heavy Rainfall — Riverside Areas",
    [
      need(1, "Rice", 400, "kg", 285, 340, 1),
      need(2, "Canned goods", 600, "cans", 512, 640, 2),
      need(3, "Drinking water", 500, "litres", 190, 420, 3),
      need(4, "Blankets", 200, "pcs", 64, 150, 4),
    ],
  ),
  drive(
    "41000000-0000-4000-8000-000000000002",
    "Go Bag Supplies for Priority Households",
    "Building ready-to-issue Go Bags for households with seniors, infants, or members who need help evacuating.",
    "open",
    11,
    null,
    [
      need(5, "Flashlights", 150, "pcs", 138, 145, 1),
      need(6, "Power banks", 120, "pcs", 41, 88, 2),
      need(7, "First aid kits", 150, "kits", 96, 120, 3),
    ],
  ),
];
