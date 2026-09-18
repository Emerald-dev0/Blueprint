# Contributing to Blueprint

We're excited that you're interested in contributing to Blueprint! As an AI Engineering Command Center, we hold ourselves to the highest standards of engineering excellence.

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛠 Development Workflow

1. **Fork and Clone:** Fork the repository and clone it to your machine.
2. **Install Dependencies:** Run `pnpm install`.
3. **Branching:** Create a feature branch from `main`, which is the only long-lived branch in this repository. We follow `feature/`, `fix/`, and `refactor/` naming conventions.
4. **Commits:** We follow **Conventional Commits**. Your commit messages should look like `feat(ai): add vector indexing`.
5. **Testing:** Ensure your changes pass everything CI runs:

   ```bash
   pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
   cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
   ```

   The second line applies to changes under `apps/desktop/src-tauri/`; CI runs
   both on every pull request.

6. **Pull Request:** Submit a PR to `main`. Fill out the PR template completely.

## 🏗 Repository Structure

Blueprint is a monorepo:

- `apps/desktop`: The Tauri v2 application - a Next.js static-export renderer and
  the Rust core it talks to through typed command wrappers.
- `packages/`: `ui` (the Ink & Mint component library), `types` (contracts that
  cross a package boundary), `git-engine` (the git and GitHub command surface),
  `plugin-sdk` (plugin manifest and registration types) and `personas` (the
  operating manuals the Rust core loads).
- `plugins/`: First-party plugins. They compile against `plugin-sdk`, but nothing
  executes plugin code yet - see the SDK's header before assuming otherwise.
- `docs/`: Engineering and product documentation; `docs/README.md` says which
  documents describe the shipped system and which are pre-implementation design
  specs.

## 🧪 Testing Standards

- **Rust:** Use `cargo test` for backend logic.
- **TypeScript:** Use `vitest` for frontend and shared packages.
- **E2E:** Playwright-based end-to-end flows are planned but not yet configured. Until then, cover new functionality with Vitest tests.

## 💬 Communication

Open an [issue](https://github.com/Emerald-dev0/Blueprint/issues) to ask a question or propose a major architectural change, ideally before writing the code. Structural changes belong in an ADR under `docs/adr/` - see [ADR 0002](docs/adr/0002-cross-platform-packaging-and-truthful-surface.md) for the standard this repository holds itself to.
