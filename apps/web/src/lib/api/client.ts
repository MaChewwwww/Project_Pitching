import axios, { type AxiosError } from "axios";

/**
 * The single configured axios instance. TanStack Query sits on top of this;
 * nothing calls `fetch` or bare `axios` directly.
 *
 * Auth handling (architecture.md Section 7.1):
 *   - the access token lives in memory only, never in localStorage, so an XSS
 *     payload has nothing to read;
 *   - the refresh token is an httpOnly cookie the browser sends automatically,
 *     which is why `withCredentials` is on.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

/** In-memory only. Cleared on reload — the refresh cookie is what survives. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * On a 401, exchange the httpOnly refresh cookie for a new access token and
 * retry the request once (architecture.md Section 7.1, FR-SYS-003). A second
 * 401 means the session is genuinely gone — `onSessionExpired` (wired by
 * `lib/auth/auth-context.tsx`) clears local state and sends the user to
 * `/login` rather than looping.
 */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post<{ access_token: string }>("/auth/refresh")
      .then((res) => res.data.access_token)
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      (typeof error.config & { _retried?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes("/auth/");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthRoute
    ) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        setAccessToken(newToken);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);

/** The RFC 7807-shaped envelope every API error uses (architecture.md 6.1). */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors: Array<{ field: string; message: string; code: string }>;
  request_id?: string;
}

export function isProblemDetail(value: unknown): value is ProblemDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "status" in value &&
    "detail" in value
  );
}

/**
 * Turn any failure into something showable. A network error and a 500 look the
 * same to a resident, and neither should render as "[object Object]".
 */
export function toDisplayError(error: unknown): ProblemDetail {
  const axiosError = error as AxiosError;

  if (axiosError?.response && isProblemDetail(axiosError.response.data)) {
    return axiosError.response.data;
  }

  return {
    type: "about:blank",
    title: "Connection problem",
    status: axiosError?.response?.status ?? 0,
    detail:
      "Could not reach the server. Check your connection and try again — your data has not been lost.",
    errors: [],
  };
}
