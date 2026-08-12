"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Merge as MergeIcon, Plus } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { api, toDisplayError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { DuplicateCandidate, HouseholdOut } from "@/lib/api/registry-types";

/**
 * FR-REG-010 — a minimal registry list, built around the two things this pass
 * actually needs: seeing what's flagged as a possible duplicate, and merging
 * a confirmed pair. Editing a household is explicitly out of scope
 * (FR-REG-009) — there is no row-level "edit" here on purpose.
 */
export default function AdminHouseholdsPage() {
  useRequireRole("admin", "bhw", "sk");
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [mergeTarget, setMergeTarget] = React.useState<HouseholdOut | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "households", { flagged: flaggedOnly }],
    queryFn: () =>
      api
        .get<{ items: HouseholdOut[]; total: number }>("/admin/households", {
          params: { size: 100, flagged: flaggedOnly },
        })
        .then((r) => r.data),
  });

  const mergeMutation = useMutation({
    mutationFn: (body: { kept_household_id: string; merged_household_id: string }) =>
      api.post("/admin/households/merge", body),
    onSuccess: () => {
      toast.success("Households merged");
      queryClient.invalidateQueries({ queryKey: ["admin", "households"] });
      setMergeTarget(null);
    },
    onError: (error) => {
      toast.error(toDisplayError(error).detail);
    },
  });

  // Fetched fresh per household, not filtered from the list snapshot — the
  // list's `has_possible_duplicate` only says "this row is flagged", not
  // which other household(s) it's actually correlated with.
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["admin", "households", mergeTarget?.id, "duplicates"],
    queryFn: () =>
      api
        .get<DuplicateCandidate[]>(`/admin/households/${mergeTarget!.id}/duplicates`)
        .then((r) => r.data),
    enabled: !!mergeTarget,
  });

  const columns: ResourceColumn<HouseholdOut>[] = [
    { key: "reference_no", header: "Reference" },
    { key: "head_name", header: "Head of household" },
    { key: "area_name", header: "Area", render: (row) => row.area_name ?? "—" },
    { key: "member_count", header: "Members" },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <Badge tone={row.source === "self" ? "success" : "neutral"}>
          {row.source === "self" ? "Self-registered" : "BHW-assisted"}
        </Badge>
      ),
    },
    {
      key: "flag",
      header: "",
      render: (row) =>
        row.has_possible_duplicate ? (
          <Badge tone="warning">Possible duplicate</Badge>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Registered Households"
        description="Self- and BHW-registered households. Flagged pairs may be the same family registered twice (FR-REG-010)."
        action={
          authUser?.role !== "sk" ? (
            <Button asChild size="sm">
              <Link href="/admin/households/new">
                <Plus aria-hidden className="size-4" />
                New household
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Checkbox
          id="flagged-only"
          checked={flaggedOnly}
          onCheckedChange={(checked) => setFlaggedOnly(!!checked)}
        />
        <Label htmlFor="flagged-only" className="font-normal">
          Flagged only
        </Label>
      </div>

      <ResourceTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={
          flaggedOnly ? "No flagged duplicates" : "No households registered yet"
        }
        getRowKey={(row) => row.id}
        rowActions={(row) =>
          row.has_possible_duplicate && authUser?.role === "admin" ? (
            <Dialog
              open={mergeTarget?.id === row.id}
              onOpenChange={(open) => setMergeTarget(open ? row : null)}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MergeIcon aria-hidden className="size-3.5" />
                  Merge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Merge into {row.head_name}</DialogTitle>
                </DialogHeader>
                <p className="text-body-sm text-neutral-600">
                  Pick the duplicate record to fold into this one. Its members move here
                  and the duplicate record is retired — this cannot be undone.
                </p>
                <div className="flex flex-col gap-2">
                  {candidatesLoading ? (
                    <p className="text-body-sm text-neutral-500">Checking for matches…</p>
                  ) : !candidates || candidates.length === 0 ? (
                    <p className="text-body-sm text-neutral-500">
                      No specific match found for this household anymore — it may have
                      already been merged or edited. Try refreshing the list.
                    </p>
                  ) : (
                    candidates.map((candidate) => (
                      <Button
                        key={candidate.household_id}
                        type="button"
                        variant="outline"
                        className="h-auto flex-col items-start py-2"
                        disabled={mergeMutation.isPending}
                        onClick={() =>
                          mergeMutation.mutate({
                            kept_household_id: row.id,
                            merged_household_id: candidate.household_id,
                          })
                        }
                      >
                        <span>
                          {candidate.head_name} · {candidate.reference_no}
                        </span>
                        <span className="text-caption text-neutral-500">
                          {candidate.match_reason === "name_similarity"
                            ? "Similar head name"
                            : "Shared member name + birth date"}
                        </span>
                      </Button>
                    ))
                  )}
                </div>
                <DialogFooter />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
    </div>
  );
}
