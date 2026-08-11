"use client";

import * as React from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronLeft, ChevronRight, Inbox, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Shared admin DataTable. It deliberately owns discovery (search, categorical
 * filtering, sorting and paging) so every console list has the same reliable
 * mobile and desktop behavior instead of each feature shipping a plain table.
 */
export interface ResourceColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Set false for long prose or values that do not make meaningful filters. */
  filterable?: boolean;
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
  searchPlaceholder?: string;
}

const PAGE_SIZE = 10;
const FILTER_KEYS = new Set([
  "kind", "type", "status", "is_active", "area_name", "area_names", "priority", "role",
  "publication_status", "flood_exposure", "category",
]);

function plainValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return String(value).replaceAll("_", " ");
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
  searchPlaceholder = "Search this list",
}: ResourceTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);

  const filterColumn = React.useMemo(() => {
    if (!data?.length) return undefined;
    return columns.find((column) => {
      if (column.filterable === false || !FILTER_KEYS.has(column.key)) return false;
      const values = new Set(data.map((row) => plainValue((row as Record<string, unknown>)[column.key])));
      return values.size > 1 && values.size <= 8;
    });
  }, [columns, data]);
  const filterValues = React.useMemo(
    () => filterColumn && data
      ? [...new Set(data.map((row) => plainValue((row as Record<string, unknown>)[filterColumn.key])))].sort()
      : [],
    [data, filterColumn],
  );
  const rows = React.useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    const next = (data ?? []).filter((row) => {
      const record = row as Record<string, unknown>;
      const matchesQuery = !lowered || columns.some((column) => plainValue(record[column.key]).toLocaleLowerCase().includes(lowered));
      const matchesFilter = !filter || !filterColumn || plainValue(record[filterColumn.key]) === filter;
      return matchesQuery && matchesFilter;
    });
    if (!sortKey) return next;
    return [...next].sort((left, right) => {
      const compared = plainValue((left as Record<string, unknown>)[sortKey]).localeCompare(
        plainValue((right as Record<string, unknown>)[sortKey]), undefined, { numeric: true },
      );
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [columns, data, filter, filterColumn, query, sortDirection, sortKey]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <ListSkeleton rows={5} />;
  if (isError) return <ErrorState sectionName="This list" onRetry={onRetry} description="Check your connection and try again." />;
  if (!data || data.length === 0) return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;

  const reset = () => { setQuery(""); setFilter(""); setSortKey(null); setSortDirection("asc"); setPage(1); };
  const sort = (key: string) => {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
    setPage(1);
  };

  return (
    <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-white shadow-xs">
      <div className="border-b border-neutral-200 bg-neutral-50/70 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-md">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={searchPlaceholder} className="h-10 w-full rounded-md border border-neutral-300 bg-white pr-9 pl-9 text-sm outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
            {query ? <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-neutral-500 hover:bg-neutral-100" aria-label="Clear search"><X className="size-4" /></button> : null}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {filterColumn ? <label className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700"><SlidersHorizontal aria-hidden className="size-4 text-primary-700" /><span className="sr-only">Filter by {filterColumn.header}</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="bg-transparent outline-none"><option value="">All {filterColumn.header.toLowerCase()}</option>{filterValues.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : null}
            {(query || filter || sortKey) ? <Button size="sm" variant="ghost" onClick={reset}>Reset</Button> : null}
          </div>
        </div>
        {filter ? <div className="mt-3 flex items-center gap-2"><span className="text-xs font-semibold text-neutral-500">Active filter</span><button type="button" onClick={() => setFilter("")} className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800">{filterColumn?.header}: {filter}<X className="size-3" /></button></div> : null}
      </div>

      <div className="divide-y divide-neutral-200 md:hidden">
        {pagedRows.map((row) => <article key={getRowKey(row)} className="space-y-3 p-4"><dl className="grid grid-cols-2 gap-x-4 gap-y-3">{columns.map((column) => <div key={column.key} className="min-w-0"><dt className="text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">{column.header}</dt><dd className="mt-1 text-sm font-medium break-words text-neutral-800">{column.render ? column.render(row) : plainValue((row as Record<string, unknown>)[column.key])}</dd></div>)}</dl>{rowActions ? <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">{rowActions(row)}</div> : null}</article>)}
      </div>
      <Table className="hidden md:table">
        <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_var(--color-neutral-200)]"><TableRow>{columns.map((column) => <TableHead key={column.key} className={cn("h-12", column.className)}><button type="button" onClick={() => sort(column.key)} className="inline-flex items-center gap-1.5 font-bold hover:text-primary-700">{column.header}{sortKey === column.key ? sortDirection === "asc" ? <ArrowUpAZ className="size-3.5" /> : <ArrowDownAZ className="size-3.5" /> : null}</button></TableHead>)}{rowActions ? <TableHead className="text-right">Actions</TableHead> : null}</TableRow></TableHeader>
        <TableBody>{pagedRows.map((row) => <TableRow key={getRowKey(row)}>{columns.map((column) => <TableCell key={column.key} className={column.className}>{column.render ? column.render(row) : plainValue((row as Record<string, unknown>)[column.key])}</TableCell>)}{rowActions ? <TableCell className="text-right"><div className="flex justify-end gap-2">{rowActions(row)}</div></TableCell> : null}</TableRow>)}</TableBody>
      </Table>
      {rows.length === 0 ? <div className="p-8 text-center text-sm text-neutral-600">No matching records. Try clearing your search or filters.</div> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/60 px-3 py-3 text-sm text-neutral-600 sm:px-4"><span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft aria-hidden className="size-4" />Previous</Button><span className="tabular-nums">Page {currentPage} of {pages}</span><Button size="sm" variant="outline" disabled={currentPage >= pages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight aria-hidden className="size-4" /></Button></div></footer>
    </section>
  );
}
