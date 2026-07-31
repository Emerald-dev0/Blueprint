# Contributing to Blueprint

We're excited that you're interested in contributing to Blueprint! As an AI Engineering Command Center, we hold ourselves to the highest standards of engineering excellence.

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛠 Development Workflow

1. **Fork and Clone:** Fork the repository and clone it to your machine.
2. **Install Dependencies:** Run `pnpm install`.
3. **Branching:** Create a feature branch from `develop`. We follow `feature/`, `fix/`, and `refactor/` naming conventions.
4. **Commits:** We follow **Conventional Commits**. Your commit messages should look like `feat(ai): add vector indexing`.
5. **Testing:** Ensure your changes pass all tests and linting.
6. **Pull Request:** Submit a PR to the `develop` branch. Fill out the PR template completely.

## 🏗 Repository Structure

Blueprint is a monorepo:
- `apps/desktop`: The main Tauri application.
- `packages/`: Modular SDKs for AI, Git, Memory, and UI.
- `docs/`: Engineering and product documentation.

## 🧪 Testing Standards

- **Rust:** Use `cargo test` for backend logic.
- **TypeScript:** Use `vitest` for frontend and shared packages.
- **E2E:** Playwright-based end-to-end flows are planned but not yet configured. Until then, cover new functionality with Vitest tests.

## 💬 Communication

Join our community on [GitHub Discussions](https://github.com/blueprint/blueprint/discussions) to ask questions or propose major architectural changes.
