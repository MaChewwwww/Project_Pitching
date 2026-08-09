"use client";

import { AuthProvider } from "@/lib/auth/auth-context";
import { AdminGate } from "@/components/features/admin/admin-gate";

/**
 * `(admin)` — barangay console. Client-side rendered, role-guarded
 * (`apps/web/src/app/(admin)/README.md`, architecture.md A-12).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
