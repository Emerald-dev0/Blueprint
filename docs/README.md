# Documentation index

Blueprint's docs fall into two groups, and the difference matters: one describes
the system that ships, the other describes a system that was planned. Read the
first as truth and the second as history.

## Authoritative — describes what is built

| Document                                                                                                 | Covers                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [README](../README.md)                                                                                   | What Blueprint is, the feature-status table, limitations, repository layout, development commands      |
| [ARCHITECTURE](../ARCHITECTURE.md)                                                                       | The process model as built: what runs in Rust, what runs in the renderer, where secrets and state live |
| [CHANGELOG](../CHANGELOG.md)                                                                             | Every change on this branch, including what was removed and why                                        |
| [ROADMAP](../ROADMAP.md)                                                                                 | What is deliberately not built yet                                                                     |
| [ADR 0001](adr/0001-choice-of-tauri-v2.md)                                                               | Choosing Tauri v2 over Electron, Flutter and native                                                    |
| [ADR 0002](adr/0002-cross-platform-packaging-and-truthful-surface.md)                                    | Cross-platform packaging, and the rule that the UI may not claim what the core cannot do               |
| [ADR 0003](adr/0003-agent-interop-through-agents-md.md)                                                  | Interop with other coding agents through generated markdown at the repository root                     |
| [Getting started](guides/GETTING_STARTED.md)                                                             | Setup on Windows / Linux / macOS, development, providers, packaging                                    |
| [Contributing guide](guides/CONTRIBUTING_GUIDE.md)                                                       | Engineering standards, branching, commit conventions, what to run before pushing                       |
| [Contributing](../CONTRIBUTING.md), [Security](../SECURITY.md), [Code of conduct](../CODE_OF_CONDUCT.md) | Repository policy                                                                                      |
| [Strategic assessment](product/STRATEGIC_ASSESSMENT.md)                                                  | The unvarnished product critique the roadmap is built from                                             |

## Design specs — written before implementation

Everything under [`architecture/`](architecture), plus
[the founding charter](product/FOUNDING_CHARTER.md) and
[product discovery](product/PRODUCT_DISCOVERY.md). Each carries a banner saying
so.

They are kept for the reasoning, not as a description of reality. Among other
things they still reference:

- `packages/core`, `packages/brain` and `packages/ai-adapters` — deleted as empty
  placeholders and an unused second AI surface. The core and the "brain" (the
  SQLite memory layer) are Rust, under `apps/desktop/src-tauri/src/`.
- A workspace tab system and a plugin panel registry — both removed; the shell
  routes between pages and the palette renders plugin commands instead.
- Tree-sitter / AST analysis, vector memory, GitHub pull-request and issue
  automation, and a sandboxed plugin runtime — none of which exist. See
  [ROADMAP](../ROADMAP.md).
- A `develop` integration branch. The repository has `main`.

Where a spec and the code disagree, the code wins. The README's feature-status
table is the fastest way to see what actually exists, and the CHANGELOG records
what was removed along the way.
