"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserPlus, UsersRound } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { PortalPageHeader } from "@/components/features/portal/portal-page-header";
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
      toast.success("Citizen added to your household roster");
      router.push("/portal/household");
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
      <PortalPageHeader
        icon={UserPlus}
        title="Add Household"
        titleAccent="Member"
        description="Register a family member to your household. Make sure to accurately declare age and any special care flags (PWD, pregnancy, chronic illness)."
        backHref="/portal/household"
        backLabel="Back to Household"
      />

      <Card className="border-neutral-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 lg:p-7">
          <RegistryMemberForm
            submitLabel="Save & Add Household Member"
            onSubmit={(values) =>
              create.mutateAsync(values).then(() => undefined)
            }
            onCancel={() => router.push("/portal/household")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
