"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/**
 * Admin-editable settings (FR-SYS-010) — alert thresholds, barangay totals,
 * staleness windows. Values are typed JSON (`config.value JSONB`), so the edit
 * dialog accepts raw JSON rather than a per-key form — there is no single field
 * type that fits both a number and a description string.
 */

interface ConfigEntry {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

function EditConfigDialog({ entry }: { entry: ConfigEntry }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [raw, setRaw] = React.useState(() => JSON.stringify(entry.value));
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: unknown) => api.put(`/admin/config/${entry.key}`, { value }),
    onSuccess: () => {
      toast.success("Setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "config"] });
      setOpen(false);
    },
    onError: (err) => setError(toDisplayError(err).detail),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil aria-hidden className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry.key}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {entry.description ? (
            <p className="text-body-sm text-neutral-600">{entry.description}</p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="config-value">Value (JSON)</Label>
            <Input
              id="config-value"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='e.g. 23.0 or "text" or null'
            />
            {error ? <p className="text-danger text-xs">{error}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setError(null);
              try {
                const parsed = JSON.parse(raw);
                mutation.mutate(parsed);
              } catch {
                setError('Not valid JSON — wrap text in quotes, e.g. "active".');
              }
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminConfigPage() {
  useRequireRole("admin");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => api.get<ConfigEntry[]>("/admin/config").then((r) => r.data),
  });

  const columns: ResourceColumn<ConfigEntry>[] = [
    { key: "key", header: "Key" },
    { key: "value", header: "Value", render: (row) => JSON.stringify(row.value) },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform"
        titleAccent="settings"
        description="Alert thresholds, barangay-wide totals, and staleness windows. Seeded by migration; editable here."
      />

      <ResourceTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No settings found"
        getRowKey={(row) => row.key}
        rowActions={(row) => <EditConfigDialog entry={row} />}
      />
    </div>
  );
}
