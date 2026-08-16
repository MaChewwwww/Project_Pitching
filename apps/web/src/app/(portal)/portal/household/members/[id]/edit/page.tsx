"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RegistryMemberForm } from "@/components/features/admin/registry-member-form";
import { api, toDisplayError } from "@/lib/api/client";
import type { HouseholdDetailOut, MemberUpdate } from "@/lib/api/registry-types";

export default function PortalEditMemberPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const household = useQuery({
    queryKey: ["me", "household"],
    queryFn: () =>
      api.get<HouseholdDetailOut | null>("/me/household").then((r) => r.data),
  });
  const member = household.data?.members.find((item) => item.id === params.id);
  const update = useMutation({
    mutationFn: (body: MemberUpdate) =>
      api.patch(`/me/household/members/${params.id}`, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Member updated");
      router.push("/portal/household");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });
  if (!member) return <div className="bg-primary-50 min-h-[40vh] animate-pulse" />;
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
        Household record
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Edit {member.full_name}</h1>
      <div className="border-primary-900/10 mt-6 rounded-3xl border bg-white p-5">
        <RegistryMemberForm
          initial={member}
          protectedName={member.is_head}
          submitLabel="Save member"
          onSubmit={(values) => update.mutateAsync(values).then(() => undefined)}
          onCancel={() => router.push("/portal/household")}
        />
      </div>
    </div>
  );
}
