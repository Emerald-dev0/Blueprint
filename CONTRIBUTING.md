# Contributing to Blueprint

Blueprint is an **AI Engineering Operating System**. We build with the discipline of a world-class developer-tools company. Please read `AGENTS.md` — it is the engineering constitution and overrides this guide.

## 📜 Code of Conduct

Read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛠 Setup

Prerequisites: **Node.js 22+**, **pnpm 11+**, **Rust (stable)**, Tauri OS dependencies.

```bash
pnpm install           # frozen-lockfile install
pnpm lint              # ESLint (flat config)
pnpm typecheck         # tsc --noEmit across workspaces
pnpm test              # Vitest (tests/unit)
pnpm build             # Turbo production build (Next static export)
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo test  --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## 🌳 Branching & Workflow

- **Only** `main`, `develop`, `feature/<scope>-<name>`, `release/<version>`, `hotfix/<scope>-<name>`.
- Feature branches come **from** `develop`, PR into `develop`. Never push to `main`/`develop` directly.
- **Issue first.** Open a GitHub Issue with acceptance criteria; reference it in the PR (`Closes #N`).
- Commit with **Conventional Commits** (`feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`, `test(scope):`, `ci(scope):`). Commitlint is enforced by the Husky `commit-msg` hook.
- Push after each significant milestone; open the PR early (draft allowed) so CI runs.
- Delete the branch after merge.

## ✅ Definition of Done

A change is done only when **all** of `AGENTS.md` §13 hold — issue linked, feature branch from `develop`, CI green (lint, typecheck, tests, build, audits), Rust compiles and tests pass where present, new behavior has tests, no undocumented stubs, docs updated, PR reviewed and approved.

## 🧪 Testing

- **TypeScript:** Vitest for all non-trivial logic — no test is optional for new behavior.
- **Rust:** `cargo test` for core services (memory, git, intelligence, AOS). Run before opening a PR.
- **E2E:** Playwright is planned but **not yet configured**. Do not claim E2E coverage.
- The existing `true === true` test is a placeholder; replace it with real tests as the subsystems they cover land.

## 📐 Standards

- **TypeScript:** strict, no `any` where a type is expressible; follow the flat ESLint config; no new lint violations.
- **Rust:** idiomatic, no `unwrap()` in library paths, typed errors not panics.
- **UI:** design tokens only (`globals.css` / `packages/ui/src/styles/*`); premium bar (Linear/VS Code/Raycast/Figma); every interactive surface has loading, empty, error, disabled states; accessible + keyboard navigable; subtle motion.
- **Plugins:** built on `@blueprint/plugin-sdk`, explicit `permissions` in `manifest.json`, integrate via `BlueprintAPI` only, ship tests.
- **Security:** secrets via keyring, never in code; redaction before provider calls; minimal typed IPC.
- **Docs:** describe reality. Update `ARCHITECTURE.md`, `PROJECT_AUDIT.md`, `ROADMAP.md`, `CHANGELOG.md` in the same PR that changes a subsystem.

## 🔍 Review

- PRs require at least one maintainer approval and a resolved-conversation count of zero.
- Required checks: `validate` and `audit`. No merge until green.
- Reviewers verify the change matches the issue's acceptance criteria, has tests, and updates docs.

## 💬 Communication

Use [GitHub Discussions](https://github.com/Emerald-dev0/Blueprint/discussions) for proposals and questions. Major architectural changes must be discussed before code.
