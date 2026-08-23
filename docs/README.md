# Specification set

**The contract.** What we are building and why — the product, not the code.

Implementation detail lives beside the code it describes, in each unit's own `docs/`. The split
and the rules for keeping the two tiers from drifting are in [`AGENTS.md`](../AGENTS.md)
Section 6.

## Read in this order

| #   | Document                                                 | Answers                                                                                                                                                      |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [`frs_nfrs.md`](./frs_nfrs.md)                           | **What** to build. Every feature has an FR/NFR ID here. **The source of truth** — if a task doesn't map to an ID, stop and say so instead of inventing scope |
| 2   | [`architecture.md`](./architecture.md)                   | **How** the system is structured — services, boundaries, API design, repository layout, deployment                                                           |
| 3   | [`schema.md`](./schema.md)                               | The physical database — every table, column, constraint, index                                                                                               |
| 4   | [`design.md`](./design.md)                               | **How it looks** — colour, type, components, responsive and accessibility rules                                                                              |
| 5   | [`tech_stack.md`](./tech_stack.md)                       | **Which tools**, why, and what was deliberately rejected                                                                                                     |
| 6   | [`business-requirements.md`](./business-requirements.md) | **Why**. Only needed when you want the rationale behind a requirement                                                                                        |

## Commercial and procurement planning

[`year-1-budget-overview.md`](./year-1-budget-overview.md) records the approved PHP 700,000-
PHP 880,000 working budget range for prototype turnover, production preparation, independent
security review, staff training, infrastructure, first-year maintenance, required SMS alerts,
optional technical project management, and optional Android-first mobile development.

[`SAGIP-SJ-Year-1-Budgetary-Quotation-Draft.docx`](./SAGIP-SJ-Year-1-Budgetary-Quotation-Draft.docx)
turns that overview into the developer-side quotation, payment schedule, scope boundaries, and
negotiation protections. It remains a draft until the contracting developer or supplier details,
tax treatment, final revision list, selections, and signatures are completed.

## Local documentation

| Unit            | Docs                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`      | [modules](../apps/api/docs/modules.md) · [migrations](../apps/api/docs/migrations.md) · [auth](../apps/api/docs/auth.md) · [observability](../apps/api/docs/observability.md) |
| `apps/web`      | [structure](../apps/web/docs/structure.md) · [components](../apps/web/docs/components.md) · [data & state](../apps/web/docs/data-and-state.md)                                |
| `services/cron` | [jobs](../services/cron/docs/jobs.md)                                                                                                                                         |
| `infra`         | [deployment](../infra/docs/deployment.md) · [backup & restore](../infra/docs/backup-restore.md)                                                                               |

## Demo tooling

The guided staging capture suite and runbook are documented in
[`demo-capture.md`](./demo-capture.md). It is presentation tooling only; generated recordings
remain under the ignored `artifacts/demo-captures/` directory.

## Open items

Each document ends with a table of unresolved decisions, owned by a named lead. They are the
reason several tables and colour ramps are provisional. Before building something that depends
on one, check whether it has been resolved — and if you resolve it, update the table.

| Document                   | Section                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `business-requirements.md` | Open items — the upstream ones everything else waits on                             |
| `frs_nfrs.md`              | Section 2 lists what is explicitly **not** being built. Read it before adding scope |
| `architecture.md`          | Section 17                                                                          |
| `schema.md`                | Section 17                                                                          |
| `design.md`                | Section 13                                                                          |
| `tech_stack.md`            | Section 12                                                                          |

## Demo release and remaining content

The canonical docs distinguish two kinds of truth:

- **Demo-release/current** statements describe the completed Public Information Site, Resident
  Portal, and Barangay Portal flows. The route inventory is in
  [`apps/web/docs/structure.md`](../apps/web/docs/structure.md).
- **About/platform and team content** is now sourced from the project team's approved four-person
  profiles and portraits. Keep future edits grounded in project-supplied material; do not replace
  it with invented profiles, images, or claims.

The article CMS, informational donation-drive schema, resident self-service workflows, and active
flood-response exercise are deployed in this snapshot. Their physical definition belongs in
[`schema.md`](./schema.md), implementation mechanics in local unit docs, and requirement evidence
in [`frs_nfrs.md`](./frs_nfrs.md). Do not promote an individual row to `✅` without its Definition
of Done evidence.

[`demo-freeze.md`](./demo-freeze.md) records the exact boundary. The August stakeholder decision
makes announcements, activities, and donation drives separate article modules with shared
authoring/media behavior. Donation drives are informational posts only: no donor submission,
targets/progress, receipt status, payment, distribution, or household assistance tracker.

## Keeping these honest

- A correction to one document usually belongs in others too. Inconsistency between docs is a
  bug, not a cosmetic issue (`AGENTS.md` Section 7).
- Update the doc in the **same PR** as the code. A doc that lags is a doc that is wrong.
- A stakeholder-approved documentation pass may lead later code only when planned behavior is
  labelled explicitly; the implementation PR must then promote those sections to deployed truth.
- These are read by teammates in PolSci, PubAd, and Nutrition. Prefer the plain explanation over
  the clever one.
