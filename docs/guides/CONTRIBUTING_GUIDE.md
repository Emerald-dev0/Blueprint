# Contributing Guide

Thank you for contributing to Blueprint! We are building a high-performance engineering tool, and we maintain a high bar for code quality and documentation.

## ⚖️ Engineering Standards

1. **Local-First:** Never assume a feature needs a cloud backend. If it can be done locally (Rust/SQLite/Wasm), it must be done locally.
2. **Type Safety:** We use strict TypeScript and Rust. No `any` types or unhandled `unwrap()` calls in production code.
3. **Design Fidelity:** All UI must follow the [Design System](../architecture/DESIGN_SYSTEM.md).

## 🌳 Branching Strategy

- **`main`:** Production-stable.
- **`develop`:** Integration branch. All PRs should target `develop`.
- **`feature/name`:** For new features.
- **`fix/name`:** For bug fixes.

## 📝 Commit Standard

We use **Conventional Commits**:

- `feat(scope): ...`
- `fix(scope): ...`
- `docs(scope): ...`
- `refactor(scope): ...`

## 🛠 Pull Request Process

1. **Issue First:** Ensure there is an issue describing the problem/feature.
2. **Draft PR:** Create a draft PR early to discuss architecture.
3. **Testing:** PRs must include tests (Vitest for TS, Cargo test for Rust).
4. **Review:** Every PR requires at least one approval from a maintainer.

## 📁 Monorepo Structure

- `apps/desktop`: The main Tauri app.
- `packages/ui`: Shared React components.
- `packages/core`: Rust logic bridged to TS.
- `docs/adr`: Architecture Decision Records.

---

*Let's build the engineering brain together.*
