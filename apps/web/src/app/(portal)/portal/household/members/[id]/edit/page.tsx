"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, UserCheck, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
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
      toast.success("Citizen profile updated successfully");
      router.push("/portal/household");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  if (household.isLoading || !member) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-emerald-100/40" />
        <div className="h-64 rounded-3xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      <PortalPageHeader
        icon={UserCheck}
        title="Edit Profile:"
        titleAccent={member.full_name}
        description={`Update birth date, relationship, or special vulnerability flags for ${member.full_name}.`}
        backHref="/portal/household"
        backLabel="Back to Household"
      />

      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7">
          <RegistryMemberForm
            initial={member}
            protectedName={member.is_head}
            submitLabel="Save Profile Changes"
            onSubmit={(values) =>
              update.mutateAsync(values).then(() => undefined)
            }
            onCancel={() => router.push("/portal/household")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
