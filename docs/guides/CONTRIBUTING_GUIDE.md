# Contributing Guide

Thank you for contributing to Blueprint! We are building a high-performance engineering tool, and we maintain a high bar for code quality and documentation.

## ⚖️ Engineering Standards

1. **Local-First:** Never assume a feature needs a cloud backend. If it can be done locally (Rust/SQLite/Wasm), it must be done locally.
2. **Type Safety:** Strict TypeScript and strict Rust. TypeScript has no `any`
   anywhere in `apps/`, `packages/` or `plugins/`, and a new one should not
   appear. In Rust, anything fallible returns `Result` and propagates - including
   mutex locks and CSS selectors that used to be `unwrap()`ed. What is left is
   deliberate and narrow: the `tauri::Builder::run` call, schema creation at
   startup, the redaction regexes (static literals, covered by unit tests), an
   enum serialisation that cannot fail, and two mutex locks in commands whose
   signatures return plain values rather than `Result`. Comment any new one.
3. **Design Fidelity:** All UI must follow the [Design System](../architecture/DESIGN_SYSTEM.md).

## 🌳 Branching Strategy

- **`main`:** The only long-lived branch, and the base for every PR. (CI also
  triggers on a `develop` branch, so one can be introduced later without
  touching the workflows.)
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

- `apps/desktop`: The Tauri v2 app - Next.js renderer plus the Rust core.
- `packages/ui`: Shared React components ("Ink & Mint").
- `packages/types`: The contracts that cross a package boundary.
- `packages/git-engine`: The git and GitHub command surface, under contract test.
- `packages/plugin-sdk`: Plugin manifest and registration types.
- `packages/personas`: The persona operating manuals the core loads from disk.
- `plugins/`: First-party plugins (manifest plus inert scaffolding - no runtime
  loads them yet).
- `docs/adr`: Architecture Decision Records.

There is no `packages/core` or `packages/brain`: the core and the "brain" (the
SQLite memory layer) are Rust, under `apps/desktop/src-tauri/src/`.

## ✅ Before you push

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

For anything under `apps/desktop/src-tauri/`, also:

```bash
cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

CI runs all of it on every pull request, and `.github/workflows/desktop.yml`
produces real installers on pushes to `main`.

---

_Let's build the engineering brain together._
