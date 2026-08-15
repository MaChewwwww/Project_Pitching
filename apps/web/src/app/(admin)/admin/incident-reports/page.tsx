"use client";

import { ResponseOperationsWorkspace } from "@/components/features/safety/response-operations-workspace";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * FR-SAF-015/016 — reports submitted by residents, reviewed by staff.
 * `refetchInterval` matches the other emergency-response screens so a
 * genuinely new report during an event surfaces without a manual refresh.
 */
export default function AdminIncidentReportsPage() {
  useRequireRole("admin");
  return <ResponseOperationsWorkspace mode="incident" />;
}
