"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { formatPhtDateTime } from "@/lib/format";

/**
 * Threshold breaches awaiting a decision (FR-WX-009). Acknowledging here is
 * deliberately **not** the same action as publishing a public alert — that is
 * `/admin/announcements`. This screen only records that an officer looked
 * (architecture.md D-4): `resulted_in_announcement_id` staying null is a
 * legitimate, recorded outcome.
 */

interface AlertPrompt {
  id: string;
  reading_id: number | null;
  level: 1 | 2 | 3;
  threshold_value: number;
  created_at: string;
  acknowledged_at: string | null;
}

export default function AdminAlertPromptsPage() {
  useRequireRole("admin");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "alert-prompts"],
    queryFn: () => api.get<AlertPrompt[]>("/admin/alert-prompts").then((r) => r.data),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/alert-prompts/${id}/acknowledge`),
    onSuccess: () => {
      toast.success("Acknowledged");
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-prompts"] });
    },
  });

  const columns: ResourceColumn<AlertPrompt>[] = [
    { key: "level", header: "Level", render: (row) => `Level ${row.level}` },
    {
      key: "threshold_value",
      header: "Threshold crossed",
      render: (row) => `${row.threshold_value} m`,
    },
    {
      key: "created_at",
      header: "Detected",
      render: (row) => formatPhtDateTime(row.created_at),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Alert Prompts"
        description="A river reading crossed a configured threshold. Acknowledge here, then decide separately whether to publish a public alert."
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No unresolved threshold breaches"
        emptyDescription="Nothing is currently awaiting a decision."
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <Button size="sm" onClick={() => acknowledgeMutation.mutate(row.id)}>
            Acknowledge
          </Button>
        )}
      />
    </div>
  );
}
