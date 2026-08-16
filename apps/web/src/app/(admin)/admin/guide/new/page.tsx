import { redirect } from "next/navigation";
import type { Route } from "next";

/** Keep the singular legacy URL pointed at the canonical guide editor. */
export default function NewGuideAliasPage() {
  redirect("/admin/guides/new" as Route);
}
