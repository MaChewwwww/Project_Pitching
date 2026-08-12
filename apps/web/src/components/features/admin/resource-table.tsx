"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ListSkeleton } from "@/components/common/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

export function plainValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => plainValue(item)).join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  const str = String(value).replaceAll("_", " ");
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAllFilterLabel(header: string): string {
  const h = header.toLowerCase().trim();
  if (h === "kind") return "All Kinds";
  if (h === "type") return "All Types";
  if (h === "status") return "All Statuses";
  if (h === "category") return "All Categories";
  if (h.endsWith("s")) return `All ${header}`;
  return `All ${header}s`;
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
      const values = new Set(
        data.map((row) => plainValue((row as Record<string, unknown>)[column.key])),
      );
      return values.size > 1 && values.size <= 8;
    });
  }, [columns, data]);

  const filterValues = React.useMemo(
    () =>
      filterColumn && data
        ? [
            ...new Set(
              data.map((row) => plainValue((row as Record<string, unknown>)[filterColumn.key])),
            ),
          ].sort()
        : [],
    [data, filterColumn],
  );

  const filterValueCounts = React.useMemo(() => {
    if (!filterColumn || !data) return {};
    const counts: Record<string, number> = { __all__: data.length };
    for (const row of data) {
      const val = plainValue((row as Record<string, unknown>)[filterColumn.key]);
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return counts;
  }, [data, filterColumn]);

  const rows = React.useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    const next = (data ?? []).filter((row) => {
      const record = row as Record<string, unknown>;
      const matchesQuery =
        !lowered ||
        columns.some((column) => plainValue(record[column.key]).toLocaleLowerCase().includes(lowered));
      const matchesFilter =
        !filter || !filterColumn || plainValue(record[filterColumn.key]) === filter;
      return matchesQuery && matchesFilter;
    });
    if (!sortKey) return next;
    return [...next].sort((left, right) => {
      const compared = plainValue((left as Record<string, unknown>)[sortKey]).localeCompare(
        plainValue((right as Record<string, unknown>)[sortKey]),
        undefined,
        { numeric: true },
      );
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [columns, data, filter, filterColumn, query, sortDirection, sortKey]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <ListSkeleton rows={5} />;
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
    return (
      <section className="border-primary-200/80 shadow-sm-card rounded-[14px] border bg-white">
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      </section>
    );
  }

  const isFiltered = Boolean(query || filter || sortKey);
  const reset = () => {
    setQuery("");
    setFilter("");
    setSortKey(null);
    setSortDirection("asc");
    setPage(1);
  };
  // Ascending → descending → unsorted. The third click has to return the list
  // to the order the API sent, which is usually most-recent-first and therefore
  // the order an officer wants back after checking one column.
  const sort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection("asc");
    }
    setPage(1);
  };

  return (
    <section className="border-primary-200/80 shadow-sm-card overflow-hidden rounded-[14px] border bg-white">
      <div className="border-b border-neutral-100 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 p-3 sm:px-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full min-w-0 sm:max-w-xs md:max-w-sm">
            <span className="sr-only">{searchPlaceholder}</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-9.5 w-full rounded-full border border-neutral-200/90 bg-white/95 pr-9 pl-9.5 text-xs sm:text-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Clear search"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
            {isFiltered ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer shrink-0"
              >
                <X aria-hidden className="size-3.5 text-neutral-500 shrink-0" />
                <span>Reset</span>
              </Button>
            ) : null}

            {filterColumn ? (
              <Select
                value={filter || "ALL_ITEMS"}
                onValueChange={(val) => {
                  setFilter(val === "ALL_ITEMS" ? "" : val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="inline-flex h-9 w-fit min-w-[130px] items-center gap-2 rounded-full border border-emerald-600/30 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-emerald-600 hover:bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer max-sm:ml-auto">
                  <SlidersHorizontal aria-hidden className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder={formatAllFilterLabel(filterColumn.header)}>
                    {!filter
                      ? formatAllFilterLabel(filterColumn.header)
                      : filter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-48 overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-1 shadow-lg backdrop-blur-md"
                >
                  <SelectItem
                    value="ALL_ITEMS"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer my-0.5",
                      !filter
                        ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                        : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950"
                    )}
                  >
                    <span className="truncate">{formatAllFilterLabel(filterColumn.header)}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ml-auto",
                        !filter
                          ? "bg-white/25 text-white"
                          : "bg-neutral-100 text-neutral-600"
                      )}
                    >
                      {filterValueCounts.__all__ ?? 0}
                    </span>
                  </SelectItem>
                  {filterValues.map((value) => {
                    const isSelected = filter === value;
                    const count = filterValueCounts[value] ?? 0;
                    return (
                      <SelectItem
                        key={value}
                        value={value}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer my-0.5",
                          isSelected
                            ? "bg-emerald-600 text-white font-bold focus:bg-emerald-600 focus:text-white"
                            : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-950 focus:bg-emerald-50 focus:text-emerald-950"
                        )}
                      >
                        <span className="truncate">{value}</span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ml-auto",
                            isSelected
                              ? "bg-white/25 text-white"
                              : "bg-neutral-100 text-neutral-600"
                          )}
                        >
                          {count}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3 bg-neutral-50/60 md:hidden">
        {pagedRows.map((row) => {
          const firstCol = columns[0];
          const remainingCols = columns.slice(1);
          return (
            <article
              key={getRowKey(row)}
              className="relative overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs space-y-3 transition-all"
            >
              {/* Subtle top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />

              {/* Card Header: Primary Identifier Column */}
              {firstCol ? (
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    {firstCol.header}
                  </span>
                  <h3 className="mt-0.5 text-sm font-bold text-neutral-900 leading-snug break-words">
                    {firstCol.render
                      ? firstCol.render(row)
                      : plainValue((row as Record<string, unknown>)[firstCol.key])}
                  </h3>
                </div>
              ) : null}

              {/* Remaining attributes in 2-column key-value grid */}
              {remainingCols.length > 0 ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-neutral-100 pt-2.5">
                  {remainingCols.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                        {column.header}
                      </dt>
                      <dd className="mt-0.5 text-xs font-semibold text-neutral-700 break-words">
                        {column.render
                          ? column.render(row)
                          : plainValue((row as Record<string, unknown>)[column.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {/* Card Action Footer */}
              {rowActions ? (
                <div className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-100 pt-2.5 w-full">
                  {rowActions(row)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <Table className="hidden md:table">
        <TableHeader className="bg-primary-900 shadow-[0_1px_0_0_var(--color-primary-800)]">
          <TableRow className="hover:bg-primary-900 border-primary-800">
            {columns.map((column) => {
              const sorted = sortKey === column.key;
              return (
                <TableHead
                  key={column.key}
                  aria-sort={sorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("text-primary-50 h-11 px-4", column.className)}
                >
                  <button
                    type="button"
                    onClick={() => sort(column.key)}
                    title={
                      !sorted
                        ? `Sort by ${column.header}, A to Z`
                        : sortDirection === "asc"
                          ? `Sort by ${column.header}, Z to A`
                          : `Clear sorting on ${column.header}`
                    }
                    className="group focus-visible:ring-primary-200 inline-flex items-center gap-1.5 rounded text-[11px] font-bold tracking-[0.08em] uppercase transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {column.header}
                    {sorted ? (
                      sortDirection === "asc" ? (
                        <ArrowUp aria-hidden className="size-3.5 text-white" strokeWidth={2.5} />
                      ) : (
                        <ArrowDown aria-hidden className="size-3.5 text-white" strokeWidth={2.5} />
                      )
                    ) : (
                      <ChevronsUpDown
                        aria-hidden
                        className="text-primary-400/70 group-hover:text-primary-200 size-3.5 transition-colors"
                      />
                    )}
                  </button>
                </TableHead>
              );
            })}
            {rowActions ? (
              <TableHead className="text-primary-50 h-11 px-4 text-right text-[11px] font-bold tracking-[0.08em] uppercase">
                Actions
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedRows.map((row, index) => (
            <TableRow
              key={getRowKey(row)}
              className={cn(
                "border-primary-100/80 hover:bg-primary-50/80 transition-colors",
                index % 2 === 1 && "bg-emerald-50/35",
              )}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn("px-4 py-3 text-neutral-700", column.className)}
                >
                  {column.render
                    ? column.render(row)
                    : plainValue((row as Record<string, unknown>)[column.key])}
                </TableCell>
              ))}
              {rowActions ? (
                <TableCell className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">{rowActions(row)}</div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon={SearchX}
          title="No matching records"
          description="No row matches the current search and filter."
          action={
            <Button size="sm" variant="outline" onClick={reset}>
              Clear search and filters
            </Button>
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <footer className="border-primary-100 bg-primary-50/60 text-primary-900/75 flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-sm sm:px-4">
          <span className="tabular-nums">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </Button>
            <span className="tabular-nums">
              Page {currentPage} of {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
