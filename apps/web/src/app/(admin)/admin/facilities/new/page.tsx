import { redirect } from "next/navigation";

/** The registry action owns the location form; keep the URL stable for deep links. */
export default function NewFacilityPage() { redirect("/admin/facilities"); }
