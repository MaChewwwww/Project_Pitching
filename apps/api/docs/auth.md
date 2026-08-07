# Authentication & authorization

The highest-risk area in the codebase (`architecture.md` AR-6). Auth is invisible when it works
and catastrophic when it does not, and it demos identically either way — which is exactly why it
gets a doc.

Everything lives in `core/security.py` and `core/deps.py`. One place to review, one place to fix.

## Token flow

```
POST /auth/login
  → access token   in the JSON body,  ~15 min, kept in memory by the client
  → refresh token  in an httpOnly cookie, ~14 days
```

Why this pairing (`architecture.md` A-5): an XSS payload cannot read the access token because it
is never written to storage, and cannot read the refresh token because JavaScript has no access
to httpOnly cookies. Putting either in `localStorage` gives an injected script a session.

`COOKIE_SECURE` comes from the environment, not from code. A `Secure` cookie is silently dropped
over plain HTTP, which looks exactly like a broken login — and plain HTTP is the deployment
baseline (`tech_stack.md` Section 9).

## What is stored

| Value | Stored as |
|---|---|
| Password | argon2 hash. Never bcrypt-by-hand, never SHA-anything (NFR-SEC-001) |
| Refresh token | SHA-256 of the token. **The plaintext exists only in the cookie** |
| Access token | Not stored at all — it is verified by signature |

Refresh tokens are hashed with SHA-256 rather than argon2 deliberately: it is a 384-bit random
value, not a human-chosen password, so there is nothing to brute-force, and rotation happens
often enough that argon2's cost would be paid constantly for no gain.

## Three checks, in order

```python
# 1. authenticated?
user: CurrentUser

# 2. right role?
@router.get("/households", dependencies=[Depends(require_role("admin", "bhw"))])

# 3. right rows?  ← a query filter, not a condition
query = apply_area_scope(query, user, Household.area_id)
```

`superadmin` passes every `require_role` without being listed on each route.

## Area scoping is the one to get right

A BHW may read and write only households in their assigned areas (FR-SYS-007). This is enforced
**in the data layer as a query filter**, never as a check in the router.

The difference matters: a route that forgets an `if` leaks the whole barangay, silently, and
looks correct in review. A query that is built through `apply_area_scope` cannot return rows the
user may not see, because they were never selected.

A BHW with **no** assigned areas sees nothing. That is the correct failure direction — an
unassigned or misconfigured account must not fall through to seeing everything.

Assignments are read from `user_area` rather than carried in the token, so revoking one takes
effect immediately instead of at the next refresh.

## Roles

BRD 5.1 names six; five are stored. `public` is the *absence* of a user, so it is never a value
in the database or a claim in a token.

```
head · bhw · admin · sk · superadmin
```

## Rules

- **Authorization is server-side, always.** Hiding a button is not access control (FR-SYS-006).
  The UI guard is a convenience for the user, not a security boundary.
- **Never put a role check inside a service.** It belongs in `deps.py`, applied as a router
  dependency, where it is visible in the route declaration.
- **Test the 403 path explicitly.** FR-SYS-007 needs a test where a BHW requests a household in
  someone else's area and gets 403 — not a test where the happy path works.
- **Rate-limit login** (FR-SYS-016). And keep the rescue endpoint's limit generous: a false
  positive there means turning away a real emergency (R-11).

## If this starts eating the schedule

`tech_stack.md` Section 5 names custom auth as the single best candidate to swap for a managed
service if R-8 bites. Concentrating everything in two files is partly to keep that exit open.
