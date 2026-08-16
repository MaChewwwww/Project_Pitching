import { redirect } from "next/navigation";

/** Keep the singular legacy URL pointed at the canonical guide workspace. */
export default function AdminGuideAliasPage() {
  redirect("/admin/guides");
}
