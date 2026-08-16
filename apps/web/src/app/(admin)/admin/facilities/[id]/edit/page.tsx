import { redirect } from "next/navigation";

/**
 * Facility editing is now handled via the edit modal on /admin/facilities.
 * Redirect legacy route visitors to the main facilities workspace.
 */
export default function EditFacilityRedirectPage() {
  redirect("/admin/facilities");
}
