"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/features/admin/admin-page-header";
import { Button } from "@/components/common/button";
import {
  ResourceTable,
  type ResourceColumn,
} from "@/components/features/admin/resource-table";
import { api } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";

/** Donation drives (FR-DON-001, 009). Admin only. */

interface DonationDrive {
  id: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  archived_at: string | null;
  active_from: string | null;
  active_until: string | null;
  drop_off_instructions: string | null;
}

export default function AdminDonationDrivesPage() {
  useRequireRole("admin");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "donation-drives"],
    queryFn: () => api.get<DonationDrive[]>("/admin/donation-drives").then((r) => r.data),
  });


  const rows = data?.map((drive) => ({
    ...drive,
    status: drive.archived_at ? "Archived" : drive.published_at ? "Published" : "Draft",
  }));
  const columns: ResourceColumn<DonationDrive & { status: string }>[] = [
    { key: "title", header: "Title" },
    { key: "excerpt", header: "Preview" },
    {
      key: "status",
      header: "Status",
    },
    {
      key: "drop_off_instructions",
      header: "Drop-off",
      render: (row) => row.drop_off_instructions ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Donation Drives"
        description="Informational calls for goods only. Donor records, quantities, and payment handling are out of scope."
        action={
          <Button asChild size="sm">
            <Link href={"/admin/donation-drives/new" as Route}>
            <Plus aria-hidden className="size-4" />
            New drive
            </Link>
          </Button>
        }
      />

      <ResourceTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="No donation drives yet"
        getRowKey={(row) => row.id}
        rowActions={(row) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/donation-drives/${row.id}` as Route}>Edit</Link>
          </Button>
        )}
      />
    </div>
  );
}
