# Blueprint Roadmap

Our mission is to build the **Engineering Brain** for every software project.

> **Status honesty (2026-09-15):** every item below is marked only for work that
> exists in the codebase and is exercised by CI or a test. The previous revision
> marked roughly a dozen items complete that had no implementation (Tree-sitter
> analysis, semantic search, PR description generation, GitHub issues/PRs,
> marketplace, plan generation). Those are now correctly shown as not started.

## 📍 Phase 0: Foundation — done

- [x] Repository architecture (monorepo, pnpm workspaces, Turborepo)
- [x] Engineering standards (CI for web **and** Rust; cross-platform bundle CI)
- [x] "Ink & Mint" design system implemented as `@blueprint/ui`
- [x] Desktop packaging configuration for Windows, Linux and macOS, built in CI
- [x] Local-first credential storage, strict CSP, capability-based IPC permissions

## 🏗 Phase 1: The Architect (MVP) — partial

- [x] Local repository scanner (extension + manifest based, gitignore-aware,
      reports languages/frameworks/data stores and files examined)
- [ ] Tree-sitter based semantic parsing (dependency removed; it was advertised
      but never implemented — see ADR 0002)
- [x] Real AI providers: Gemini, Anthropic, OpenAI, local Ollama
- [x] Local secret redaction on every outbound prompt, with measured counts
- [ ] Structured implementation-plan generation (the workflow planner currently
      returns a fixed two-task scaffold)
- [ ] Project charter enforcement

## 🧠 Phase 2: The Brain — partial

- [x] Architecture Decision Records: create, list and search, persisted to SQLite
- [x] Free-form knowledge entries with tiered memory
- [x] Append-only local audit trail
- [ ] Vector indexing (LanceDB) and semantic retrieval — search is SQL `LIKE`
- [ ] Context-aware PR description generation

## 🔄 Phase 3: The Workflow — partial

- [x] Persona operating-manual registry + prompt compiler (Agent OS): 24
      personas, each with `persona.json`, a full operating manual and a thinking
      framework; the manual is compiled verbatim into the system prompt
- [x] AI Teammate conversations run through the selected persona, with
      conversation history and live git/project context in the prompt
- [x] Agent interoperability: `AGENTS.md` export plus `CLAUDE.md` / `GEMINI.md`
      import pointers, so OpenCode, Codex CLI, Claude Code and Gemini CLI inherit
      Blueprint's context (ADR 0003)
- [x] Website reference analysis (title / headings / framework detection)
- [x] Local git integration: status, ahead/behind, branch creation, release-note
      drafting from real commit history
- [x] GitHub token storage and repository listing
- [ ] GitHub issues / pull requests / sync
- [ ] Multi-agent execution loop (the planner assigns real persona ids and each
      persona compiles a prompt, but nothing yet runs a task graph end-to-end)
- [ ] Automated documentation sync

## 🔌 Phase 4: The Platform — not started

- [ ] Sandboxed plugin execution runtime (the unsandboxed Python runner was
      removed on security grounds rather than shipped). Until it exists the four
      first-party plugins are inert scaffolding, and `@blueprint/plugin-sdk`
      only declares host capabilities that really are there.
- [ ] First-party plugins that were removed for declaring an entrypoint with no
      code behind it, to be reintroduced with their implementations: API
      Explorer, Architecture Visualizer, Database Inspector, Deployment
      Intelligence, Documentation Intelligence
- [ ] Plugin marketplace / registry
- [ ] Enterprise organization memory
- [ ] Code signing and notarization for Windows, Linux and macOS

---

_Roadmap subject to change as we learn from our early users._
