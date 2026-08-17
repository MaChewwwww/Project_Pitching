# `apps/api` documentation

How this codebase works. **What** it is supposed to do is in the root
[`docs/`](../../../docs/README.md) — nothing here restates a requirement or a column.

| Document                                 | Read it when                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| [`modules.md`](./modules.md)             | Adding a module or an endpoint, or wondering where a piece of logic belongs |
| [`migrations.md`](./migrations.md)       | Changing the schema, or a migration behaves strangely                       |
| [`auth.md`](./auth.md)                   | Touching login, roles, or anything a BHW can see                            |
| [`observability.md`](./observability.md) | Adding logging, raising an error, or writing an audit entry                 |

Demo article galleries are bundled under `src/seed_media/article-covers/`. `seed.py` copies them
to the configured upload volume and creates the normal article-image rows only when an article
has no officer-managed media. Use `make reseed-content` only to intentionally replace all demo
activities, announcements, donation notices, and their media; the ordinary seed stays safe on
application start.

Adding a file here? Add a row above too (`AGENTS.md` Section 6).
