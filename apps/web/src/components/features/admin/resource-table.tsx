"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * A list screen for one admin resource: columns, loading/empty/error states,
 * row actions. Twelve admin screens become twelve column configs against this
 * one component rather than twelve bespoke tables — the Definition of Done's
 * loading/empty/error requirement (`frs_nfrs.md` Section 1.4) is met once, here,
 * instead of once per screen.
 */

export interface ResourceColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface ResourceTableProps<T> {
  columns: ResourceColumn<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => React.ReactNode;
  getRowKey: (row: T) => string;
}

export function ResourceTable<T extends object>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  rowActions,
  getRowKey,
}: ResourceTableProps<T>) {
  if (isLoading) {
    return <ListSkeleton rows={5} />;
  }

  if (isError) {
    return (
      <ErrorState
        sectionName="This list"
        onRetry={onRetry}
        description="Check your connection and try again."
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
            {rowActions ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </TableCell>
              ))}
              {rowActions ? (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">{rowActions(row)}</div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
