import { redirect } from "next/navigation";

/**
 * Facility creation is now handled via the modal on /admin/facilities.
 * Redirect legacy route visitors to the main facilities workspace.
 */
export default function NewFacilityRedirectPage() {
  redirect("/admin/facilities");
}
