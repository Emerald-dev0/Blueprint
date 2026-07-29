# Blueprint GitHub Engineering Ecosystem

## 1. Executive Summary
Blueprint is a professional engineering product, and its GitHub repository must reflect the same level of discipline, transparency, and quality as the tool itself. This document defines the operating model for the Blueprint ecosystem, governing how we plan, develop, review, and release software.

---

## 2. Repository Standards & Structure

### Root Files
- **`README.md`:** The entry point. Clear mission, quick start, and visual overview.
- **`CONTRIBUTING.md`:** Onboarding guide for new developers.
- **`ARCHITECTURE.md`:** High-level system design (linked to `docs/`).
- **`SECURITY.md`:** Vulnerability reporting process.
- **`CHANGELOG.md`:** Human-readable history of major changes.
- **`ROADMAP.md`:** The future vision of Blueprint.

### Directory Structure
```text
/
├── .github/            # CI/CD Workflows, Issue/PR templates
├── docs/               # Deep engineering and user documentation
├── apps/               # The Blueprint Desktop application (Tauri)
├── packages/           # Modularized SDKs (AI, Git, UI, Brain)
├── scripts/            # Automation for dev setup and releases
├── tests/              # E2E and cross-package integration tests
└── tools/              # Custom internal CLI tools for contributors
```

---

## 3. Branching & Commit Model

### Branching Strategy
We use a variation of **Git Flow** optimized for desktop releases:
- **`main`:** The production-ready state. Only merges from `release/` or `hotfix/`.
- **`develop`:** The primary integration branch.
- **`feature/*`:** Scoped work for new features (e.g., `feature/ai-memory`).
- **`fix/*`:** Bug fixes (e.g., `fix/git-auth`).
- **`release/*`:** Preparation for a new version.

### Commit Standard: Conventional Commits
All commits must follow the pattern: `<type>(<scope>): <description>`
- **`feat`:** A new feature for the user.
- **`fix`:** A bug fix for the user.
- **`docs`:** Changes to documentation only.
- **`refactor`:** Code changes that neither fix a bug nor add a feature.
- **`perf`:** A code change that improves performance.
- **`security`:** A code change that improves security.
- **`chore`:** Changes to the build process or auxiliary tools.

---

## 4. Issue & Project Management

### Issue Types & Templates
1. **Feature Request:** Requires "User Problem" and "Proposed Solution."
2. **Bug Report:** Requires "Steps to Reproduce" and "Environment Info."
3. **Security Issue:** (Private) Requires disclosure details.
4. **Architecture Decision (ADR):** For proposing structural changes.

### Label System
- **Type:** `type:feature`, `type:bug`, `type:security`.
- **Priority:** `p:critical`, `p:high`, `p:medium`.
- **Status:** `status:blocked`, `status:in-review`, `status:in-progress`.
- **Area:** `area:ai`, `area:desktop`, `area:git`.

### GitHub Projects
We use a Kanban-based workflow:
`Backlog` → `Research` → `Planning` → `In Progress` → `Review` → `Released`.

---

## 5. Pull Request & Code Review System

### PR Requirements
- **Summary:** What changed and why.
- **Testing:** Evidence of manual and automated testing.
- **Screenshots:** Mandatory for any UI change.
- **Breaking Changes:** Explicitly highlighted.

### Review Checklist
- **Architecture:** Does it follow the established patterns in `docs/`?
- **Security:** Are secrets protected? Is input sanitized?
- **Performance:** Does it introduce expensive main-thread operations?
- **Craft:** Does it follow the "Ink & Mint" design system?

---

## 6. CI/CD Strategy: The Desktop Pipeline

We use **GitHub Actions** for the full lifecycle.

### PR Validation (The Guard)
- **Lint & Format:** Ensure code standards.
- **Type Check:** Validate TypeScript and Rust types.
- **Test:** Run all unit and integration tests.
- **Build Verify:** Ensure the Tauri app compiles for at least one platform.

### Deployment Pipeline (The Release)
Triggered by a version tag (e.g., `v1.2.0`):
1. **Security Audit:** Run `npm audit` and `cargo audit`.
2. **Build Matrix:** Parallel builds for Windows (`.exe`/`.msi`), macOS (`.dmg`), and Linux (`.AppImage`).
3. **Signing:** Code sign binaries for macOS and Windows.
4. **Artifact Upload:** Attach binaries to the GitHub Release.
5. **Auto-Changelog:** Generate release notes from Conventional Commits.

---

## 7. Security & Release Management

- **Dependabot:** Weekly automated dependency updates.
- **Secret Scanning:** Block pushes containing API keys or private certificates.
- **Semantic Versioning (SemVer):** 
    - `MAJOR`: Breaking changes.
    - `MINOR`: New features (non-breaking).
    - `PATCH`: Bug fixes.

---

## 8. Open Source & Contributor Onboarding

- **Good First Issues:** Clearly labeled for newcomers.
- **Dev Container:** Standardized VS Code environment for instant setup.
- **One-Command Dev:** `pnpm dev` handles the Rust and Next.js bridge automatically.
- **Transparency:** All major decisions are discussed in GitHub Discussions or Issues.

---
*Blueprint GitHub Engineering Ecosystem — Version 1.0.*
