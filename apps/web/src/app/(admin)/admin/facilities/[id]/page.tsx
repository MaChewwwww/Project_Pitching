import { redirect } from "next/navigation";

/**
 * Facility details are now presented via modal popups on /admin/facilities.
 * Redirect legacy route visitors to the main facilities workspace.
 */
export default function FacilityDetailRedirectPage() {
  redirect("/admin/facilities");
}
