"use client";

import { ResponseOperationsWorkspace } from "@/components/features/safety/response-operations-workspace";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * FR-SAF-010 — the rescue queue. Polled short-cycle like `/admin/safety`:
 * this is a screen an officer is expected to leave open during an
 * emergency, not one they refresh by hand. Not area-scoped (see the
 * `list_rescue_requests` docstring on the backend) — every admin/BHW sees
 * every request, because an anonymous request has no area to scope by.
 */
export default function AdminRescueRequestsPage() {
  useRequireRole("admin");
  return <ResponseOperationsWorkspace mode="rescue" />;
}
