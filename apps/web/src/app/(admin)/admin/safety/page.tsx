import { redirect } from "next/navigation";

export default function AdminSafetyCompatibilityPage() {
  redirect("/admin/emergency-events?tab=accounted-for");
}
