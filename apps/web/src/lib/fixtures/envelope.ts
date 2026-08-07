import type { Page } from "@/lib/api/public-types";

/**
 * Wrap fixture rows in the list envelope from architecture.md Section 6.1.
 *
 * Sections consume `Page<T>` rather than a bare array so that the day the real
 * endpoint is wired in, nothing downstream changes shape. Paginating locally is
 * pointless work today — it exists so `.items`, `.total` and `.pages` are already
 * the things components read.
 */
export function paginate<T>(items: T[], page = 1, size = 20): Page<T> {
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    page,
    size,
    pages: Math.max(1, Math.ceil(items.length / size)),
  };
}
