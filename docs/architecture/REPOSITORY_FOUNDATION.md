# Blueprint Repository Foundation

## 1. Executive Summary
This document outlines the engineering foundation of the Blueprint repository. We have established a professional, scalable, and automated monorepo structure designed to support high-performance development and high-quality contributions.

---

## 2. Monorepo Architecture

We use **Turborepo** with **pnpm** workspaces to manage our multi-package ecosystem.

### Directory Map
- `/apps/desktop`: The main Tauri v2 application (Next.js frontend).
- `/packages/ui`: Shared design system components (Ink & Mint).
- `/packages/core`: Core business logic and shared domain models.
- `/packages/ai-adapters`: Unified AI provider interfaces.
- `/packages/git-engine`: Rust-bound Git and GitHub operations.
- `/packages/brain`: Semantic memory and vector indexing logic.
- `/packages/types`: Shared TypeScript types bridged from Rust.

---

## 3. Engineering Standards

### Code Quality
- **TypeScript:** Strict mode enabled across all packages.
- **Linting:** ESLint with standard rules for React and TypeScript.
- **Formatting:** Prettier configured for consistent code style.
- **Commit Standards:** Mandatory **Conventional Commits** enforced via `commitlint`.

### Tooling Versioning
- **Node.js:** v20+
- **pnpm:** v9+
- **Rust:** Latest stable

---

## 4. Git & Workflow Strategy

### Branching Model
- `main`: Production-stable releases.
- `develop`: Primary integration branch.
- `feature/*`, `fix/*`, `refactor/*`: Short-lived feature/task branches.

### Branch Protection
- `main` and `develop` require:
    - Pull Request with at least one approval.
    - Passing CI checks (Lint, Typecheck, Test, Build).

---

## 5. Automation & CI/CD

### GitHub Actions
- **`ci.yml`**: Runs on every PR and push to `develop`. Performs dependency installation, linting, typechecking, and testing.
- **`security.yml`** (Planned): Automated secret scanning and dependency auditing.

---

## 6. Developer Experience (DX)

### Setup
A developer can go from `git clone` to a running development environment with:
```bash
pnpm install
pnpm dev
```

### Documentation
Documentation is treated as a first-class citizen. All architectural decisions and engineering rules are maintained in the `/docs` folder and linked from the root `README.md`.

---
*Blueprint Repository Foundation — Version 1.0.*
