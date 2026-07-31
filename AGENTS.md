# AGENTS.md — Blueprint Engineering Constitution

This document is the engineering constitution for Blueprint. Every contributor, automated agent, and reviewer is bound by it. When in doubt, this document wins.

---

## 1. What Blueprint Is

Blueprint is **an AI Engineering Operating System**, not an AI model and not a chat wrapper.

- The **AI model** (Claude, OpenAI, Gemini, OpenCode, Ollama, or future providers) is a swappable *intelligence provider*.
- **Blueprint owns** orchestration, personas, workflows, memory, tools, GitHub automation, project intelligence, plugins, and user experience.
- The user selects the provider; Blueprint stays provider-agnostic at the architectural boundary.

## 2. Engineering Philosophy

1. **Local-first.** Sensitive data never leaves the machine unless the user explicitly requests it. Secrets are redacted locally.
2. **Verify before you believe.** No feature, file, or dependency is assumed to work because it exists. Every implementation must build, pass CI, and have tests.
3. **Honesty over optimism.** Docs describe what exists, not what is aspirational. Stubs and placeholders are labeled as such and tracked in `PROJECT_AUDIT.md`.
4. **One source of truth.** No duplicated subsystems. If two modules do the same thing, consolidate.
5. **Small, reviewable increments.** Every change is a scoped PR with meaningful commits.
6. **Premiums first.** The product must feel like Linear, VS Code, Raycast, or Figma — or we don't ship it.

## 3. Branching Strategy

The repository uses a **trunk-based flow with release branches**:

- `main` — production-ready. Protected. Every commit reachable from `main` has passed CI and review.
- `develop` — integration branch for all feature work. Protected. The only merge target for features.
- `feature/<scope>-<name>` — every new implementation, branched from `develop`.
- `release/<version>` — release preparation and stabilization.
- `hotfix/<scope>-<name>` — urgent production fixes, branched from `main`, merged back to both `main` and `develop`.

Rules:

- Feature branches **never** target `main` directly. They target `develop`.
- Hotfixes target `main` and are then back-merged into `develop`.
- Long-lived personal branches are forbidden. Work is pushed continuously and merged when complete.
- Delete branches after merge.

## 4. GitHub Workflow

Every implementation follows this lifecycle:

1. **Issue first.** Every feature, bug, or meaningful doc change starts with a GitHub Issue describing the problem and acceptance criteria.
2. **Branch.** Create `feature/<scope>-<name>` from the latest `develop`.
3. **Commit.** Make meaningful, conventional commits as you work. Push after each significant milestone.
4. **Pull Request.** Open a PR against `develop`, referencing the issue (e.g. `Closes #12`). Fill out the PR template.
5. **CI.** All required checks must pass: `validate` (lint, typecheck, test, build) and `audit` (npm + cargo).
6. **Review.** At least one maintainer approval. Author resolves all conversations.
7. **Merge.** Merge into `develop` (squash or merge commit per the PR's context).
8. **Document.** Update `ARCHITECTURE.md`, `PROJECT_AUDIT.md`, `ROADMAP.md`, or `CHANGELOG.md` where appropriate.
9. **Clean up.** Delete the feature branch. Close the issue (PRs auto-close referenced issues).

Never bypass this workflow: no direct pushes to `develop`/`main`, no large unstructured commits, no unreviewed merges.

## 5. Commit Discipline

- Follow **Conventional Commits**: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`, `refactor(scope):`, `test(scope):`, `ci(scope):`, `style(scope):`, `perf(scope):`.
- One logical change per commit. Keep commits small and individually reviewable.
- Commit messages explain **why**, not just **what**.
- Never commit build artifacts, `.tsbuildinfo`, `node_modules`, `target/`, `.next/`, `out/`, `gen/`, or secrets.
- Enforced locally by `commitlint` via the Husky `commit-msg` hook.

## 6. CI Requirements

- Every push and PR to `main`/`develop` triggers:
  - **Frontend** — `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
  - **Backend** — `cargo check --all-targets`, `cargo clippy`, `cargo test` (Rust).
  - **IPC contract** — `scripts/check-ipc-contract.mjs` (frontend/backend command parity).
  - **audit** — `pnpm audit` (npm) and `cargo audit` (Rust).
- A PR is not mergeable until all checks are green (`Frontend`, `Backend`, `IPC contract`, `audit`).
- Dependency changes must regenerate `pnpm-lock.yaml`/`Cargo.lock` and must not raise new vulnerabilities without documented justification.

## 7. Testing Requirements

- **TypeScript/React:** Vitest unit tests for all non-trivial logic. No test is optional for new behavior.
- **Rust:** `cargo test` for all core services (memory, git, intelligence, AOS). 27 provider/redaction tests exist; extend, don't reduce.
- **IPC contract:** `pnpm check:ipc` must stay green — never invoke an unregistered command and never leave a registered command unwired.
- **E2E:** Playwright planned; until configured, cover functionality with Vitest. Never claim E2E coverage that does not exist.
- Run the full test suite before opening a PR.

## 8. Coding Standards

- **TypeScript:** strict mode, `noImplicitAny`. No `any` where a type is expressible. Follow the existing flat ESLint config; no new lint violations.
- **Rust:** idiomatic, clippy-clean where possible. All errors returned as typed results, not panics. No `unwrap()` in library paths (only in tests).
- **Formatting:** Prettier for TS/TSX/MD/JSON; `rustfmt` for Rust.
- **Imports:** no unused imports (fix existing warnings — tracked in audit).
- **Dead code:** no unused modules, components, or dependencies. Stubs are allowed only behind an explicit `TODO` reference in `PROJECT_AUDIT.md`.

## 9. UI Quality Standards

The bar is a premium developer tool (Linear, VS Code, Raycast, Figma). Rejected: generic AI-generated dashboards.

- **Design tokens only.** Never hardcode colors/radii/spacing in components — use the Ink & Mint tokens in `globals.css` / `packages/ui/src/styles/*`.
- **Visual hierarchy:** clear type scale, restrained accent color (`mint`), deliberate negative space.
- **States:** every interactive surface has loading, empty, error, and disabled states.
- **Accessibility:** semantic HTML, keyboard navigable, focus-visible rings, WCAG AA contrast.
- **Motion:** purposeful and subtle (framer-motion); no gratuitous animation.
- **Consistency:** reuse `packages/ui` components; do not reimplement primitives per page.
- One source of truth for tokens — do not duplicate token files.

## 10. Plugin Standards

- Plugins are versioned packages built on `@blueprint/plugin-sdk`, declaring explicit `permissions` in `manifest.json`.
- Plugins integrate through the documented `BlueprintAPI` only: workspace, ai, github, events. No direct filesystem or network access unless permitted and declared.
- Every official plugin ships with: a manifest, `src/index.ts` activation, and tests. No scaffold-only plugins in the official suite.
- Python tools are exposed as **reusable tools** through the plugin bridge, not hardcoded workflow logic.
- The runtime must actually load plugins (from the configured plugin directory) and enforce declared permissions. The current frontend "fake plugin" registration is not a plugin system — see audit.

## 11. Security Standards

- Secrets (API keys, GitHub tokens) are stored in the OS keyring via the Rust `keyring` crate — never in plaintext, never in the renderer, never committed.
- Redaction engine must run before any payload is sent to an AI provider.
- IPC surface is minimal and typed; every command validates its inputs.
- Tauri v2 capabilities file must exist and grant only what the app needs (currently missing — P0 debt).
- `pnpm audit` and `cargo audit` are part of CI. Zero *fixable* vulnerabilities in production dependencies. Unpatched upstream advisories require a documented, time-boxed exception.
- Provider API keys are entered only in Settings and stored via keyring.

## 12. Documentation Standards

- Docs describe **reality**. If a doc describes a system that does not exist, the doc must be updated (or the system built).
- Required living docs:
  - `AGENTS.md` — this constitution.
  - `ARCHITECTURE.md` — accurate architecture, diagrams, data flow, package relationships.
  - `PROJECT_AUDIT.md` — the honest state of every subsystem, including debt.
  - `ROADMAP.md` — remaining implementation phases.
  - `CONTRIBUTING.md` — how to contribute.
  - `CHANGELOG.md` — user-visible changes.
- Every PR that changes a subsystem updates the relevant docs in the same PR.

## 13. Definition of Done

A task is done only when **all** of the following hold:

- [ ] GitHub Issue exists and is linked.
- [ ] Implementation is on a `feature/*` branch from `develop`.
- [ ] CI is green: lint, typecheck, tests, build, audits (npm + cargo).
- [ ] Rust crate compiles (`cargo check`) and passes `cargo test` where it exists.
- [ ] New behavior has tests.
- [ ] No new `TODO`/stub/placeholder introduced without an audit reference.
- [ ] UI changes meet the UI quality standards in §9.
- [ ] Secrets are handled per §11.
- [ ] Docs (`ARCHITECTURE.md`, `PROJECT_AUDIT.md`, `ROADMAP.md`, `CHANGELOG.md`) updated where relevant.
- [ ] PR reviewed and approved, conversations resolved.
- [ ] Branch deleted after merge.
