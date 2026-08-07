# `lib/auth` — token handling

The access token lives in memory (`lib/api/client.ts`), never in `localStorage`.
The refresh token is an httpOnly cookie JavaScript cannot read at all. That pairing
is what makes an XSS payload unable to steal a session (architecture.md A-5).

To build here: the session context, and the axios response interceptor that
retries once through `POST /auth/refresh` on a 401.

Requirements: FR-SYS-002, FR-SYS-003.
