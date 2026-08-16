import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function GuideAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/guides/${id}` as Route);
}
