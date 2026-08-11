import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/common/button";

export function PaginationControls({
  page,
  pages,
  pathname,
}: {
  page: number;
  pages: number;
  pathname: string;
}) {
  if (pages <= 1) return null;

  const visiblePages = Array.from(
    { length: Math.min(pages, 5) },
    (_, index) => Math.max(1, Math.min(pages - 4, page - 3)) + index,
  );
  const href = (nextPage: number) => `${pathname}?page=${nextPage}`;

  return (
    <nav
      aria-label="Article pagination"
      className="mt-9 flex flex-wrap items-center justify-center gap-2"
    >
      <Button asChild size="sm" variant="outline" disabled={page <= 1}>
        {page <= 1 ? (
          <span aria-disabled="true"><ChevronLeft aria-hidden className="size-4" />Previous</span>
        ) : (
          <Link href={href(page - 1) as Route}><ChevronLeft aria-hidden className="size-4" />Previous</Link>
        )}
      </Button>
      {visiblePages.map((number) => (
        <Button key={number} asChild size="sm" variant={number === page ? "primary" : "outline"}>
          <Link href={href(number) as Route} aria-current={number === page ? "page" : undefined}>
            {number}
          </Link>
        </Button>
      ))}
      <Button asChild size="sm" variant="outline" disabled={page >= pages}>
        {page >= pages ? (
          <span aria-disabled="true">Next<ChevronRight aria-hidden className="size-4" /></span>
        ) : (
          <Link href={href(page + 1) as Route}>Next<ChevronRight aria-hidden className="size-4" /></Link>
        )}
      </Button>
    </nav>
  );
}
