"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import type { MemberUpdate } from "@/lib/api/registry-types";

export default function PortalNewMemberPage() {
  const router = useRouter();
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: (body: MemberUpdate) => api.post("/me/household/members", body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Household member added");
      router.push("/portal/household");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
        Household record
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Add a household member</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Add one person at a time so their needs can be checked carefully.
      </p>
      <div className="border-primary-900/10 mt-6 rounded-3xl border bg-white p-5">
        <RegistryMemberForm
          submitLabel="Add member"
          onSubmit={(values) => create.mutateAsync(values).then(() => undefined)}
          onCancel={() => router.push("/portal/household")}
        />
      </div>
    </div>
  );
}
