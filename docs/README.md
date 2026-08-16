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

## Local documentation

| Unit            | Docs                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`      | [modules](../apps/api/docs/modules.md) · [migrations](../apps/api/docs/migrations.md) · [auth](../apps/api/docs/auth.md) · [observability](../apps/api/docs/observability.md) |
| `apps/web`      | [structure](../apps/web/docs/structure.md) · [components](../apps/web/docs/components.md) · [data & state](../apps/web/docs/data-and-state.md)                                |
| `services/cron` | [jobs](../services/cron/docs/jobs.md)                                                                                                                                         |
| `infra`         | [deployment](../infra/docs/deployment.md) · [backup & restore](../infra/docs/backup-restore.md)                                                                               |

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

## Demo freeze and approved next work

The canonical docs distinguish two kinds of truth:

- **Demo-frozen/current** statements describe `main` at commit `ce66a7e` on August 16, 2026.
  The Public Information Site and Barangay Portal are the approved demo baseline.
- **Planned/not frozen** statements describe the remaining Resident Portal pass and the About
  page revision with team profiles. They are not represented as completed work.

The article CMS and informational donation-drive schema are deployed in this snapshot; their
physical definition belongs in `schema.md`. Do not describe a planned endpoint, column, team
profile, or resident workflow as implemented.

[`demo-freeze.md`](./demo-freeze.md) records the exact boundary and how to resume work. The
August stakeholder decision makes announcements, activities, and donation drives separate article
modules with shared authoring/media behavior. Donation drives are informational posts only: no
donor submission, targets/progress, receipt status, payment, distribution, or household assistance
tracker.

## Keeping these honest

- A correction to one document usually belongs in others too. Inconsistency between docs is a
  bug, not a cosmetic issue (`AGENTS.md` Section 7).
- Update the doc in the **same PR** as the code. A doc that lags is a doc that is wrong.
- A stakeholder-approved documentation pass may lead later code only when planned behavior is
  labelled explicitly; the implementation PR must then promote those sections to deployed truth.
- These are read by teammates in PolSci, PubAd, and Nutrition. Prefer the plain explanation over
  the clever one.
