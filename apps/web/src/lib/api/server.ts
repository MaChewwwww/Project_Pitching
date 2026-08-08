import { z } from "zod";

/**
 * The server-side fetch used by every public page (architecture.md Section 10.1
 * — the public site is ISR, and ISR's revalidation window is `fetch`'s own
 * cache, not TanStack Query's).
 *
 * **Deliberate exception to "nothing calls `fetch` directly"**
 * (`apps/web/docs/data-and-state.md`). That rule protects the axios client used
 * by client components and the admin console, where TanStack Query owns the
 * cache. Here, in a Server Component, axios would bypass Next's own data cache
 * entirely — there would be nothing for `next: { revalidate }` to attach to —
 * and ISR is the whole rendering strategy for this surface. `fetch` is the
 * correct tool for exactly this one job.
 *
 * Talks to `API_INTERNAL_BASE_URL` (container-to-container, no proxy hop) rather
 * than `NEXT_PUBLIC_API_BASE_URL` (the browser's URL) — see `.env.example`.
 */

const API_INTERNAL_BASE_URL =
  process.env.API_INTERNAL_BASE_URL ?? "http://api:8000/api/v1";

const DEFAULT_REVALIDATE_SECONDS = 60;

export class ApiFetchError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

interface ServerGetOptions {
  /** Seconds before Next revalidates this fetch. Defaults to the public site's
   * standard 60s ISR window (architecture.md Section 10.1). */
  revalidate?: number;
  searchParams?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, searchParams?: ServerGetOptions["searchParams"]): string {
  const url = new URL(`${API_INTERNAL_BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Fetch and Zod-parse a public endpoint. Throws `ApiFetchError` on a network
 * failure, a non-2xx response, or a schema mismatch — callers decide how to
 * degrade (architecture.md Section 8.2, FR-PUB-016): most wrap this and return
 * an empty/null fallback so one failed section never takes the page down.
 */
export async function serverGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options: ServerGetOptions = {},
): Promise<T> {
  const { revalidate = DEFAULT_REVALIDATE_SECONDS, searchParams } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiFetchError(`Network error reaching ${path}`, null);
  }

  if (!response.ok) {
    throw new ApiFetchError(`${path} responded ${response.status}`, response.status);
  }

  const json = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // A backend change CI somehow missed shows up here as a clear parse error
    // rather than `undefined` on the landing page (architecture.md AR-7).
    console.error(`[serverGet] schema mismatch for ${path}:`, parsed.error.flatten());
    throw new ApiFetchError(`${path} did not match the expected shape`, response.status);
  }
  return parsed.data;
}
