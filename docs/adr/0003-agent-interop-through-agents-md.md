# ADR 0003: Agent interoperability through `AGENTS.md`

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** Blueprint maintainers
- **Context area:** `apps/desktop/src-tauri/src/interop.rs`, Intelligence page

## Context

Blueprint's premise is that architectural memory — the reasons behind decisions —
is the missing primitive in AI-assisted development. But the memory is worthless
if it is trapped inside one application. Developers do not use a single agent: a
typical day mixes an editor assistant, a terminal agent (OpenCode, Codex CLI,
Gemini CLI, Claude Code, Amp) and Blueprint itself. Each of those tools starts
from zero and re-derives — or contradicts — the same context.

Two facts shaped the options:

1. The tools mostly agree on a convention. `AGENTS.md` at the repository root is
   read by OpenCode, Codex CLI, Amp, Jules, Cursor, Zed and Factory; Claude Code
   reads `CLAUDE.md`; Gemini CLI reads `GEMINI.md`; Codebuff and its free tier
   Freebuff resolve `knowledge.md` first, then `AGENTS.md`, then `CLAUDE.md`.
   Several of them support importing another file.
2. Blueprint already holds the content those files should contain: the repository
   scan, the ADR table, the sealed knowledge entries and 24 persona operating
   manuals that encode the project's engineering standards.

Writing per-tool integrations (an MCP server, a VS Code extension, a CLI shim per
agent) would multiply maintenance cost while solving the same problem N times.

## Decision

**Blueprint exports its project understanding into `AGENTS.md` at the open
project's root, and writes `CLAUDE.md` and `GEMINI.md` as one-line import
pointers to it.** One command, `export_agent_context`, produces all three.

Twelve decisions follow from that:

1. **One canonical file, not N copies.** `AGENTS.md` holds the content;
   `CLAUDE.md` and `GEMINI.md` contain `@AGENTS.md` plus a note. Duplication
   would guarantee drift between tools.
2. **Generated, not merged.** The file is overwritten wholesale on export.
   Merge semantics for a generated document would need conflict resolution we
   cannot do honestly, and a stale merge is worse than a clean regeneration.
3. **Never clobber human work.** A target file is overwritten only when it
   contains Blueprint's marker (`<!-- blueprint:generated -->`). A hand-written
   `CLAUDE.md` is left untouched and reported back in `skipped` with a reason the
   UI displays.
4. **Redact before writing.** The same `RedactionEngine` used for outbound
   prompts runs over the rendered document, and the count of redacted spans is
   returned and shown. Memory content is user-authored; an ADR that quotes a
   connection string must not become a committed secret.
5. **Bounded output.** Caps of 40 ADRs, 60 memory entries and 1 200 characters
   per field keep the file useful instead of window-eating. A context file is
   only valuable if an agent can afford to read it.
6. **Content is evidence, not marketing.** The file states the repository root,
   branch, working-tree state, files scanned and detected stack; then the
   declared commands; then decisions with context/decision/consequences; then
   sealed knowledge; then the persona standards table; then Always / Ask-first /
   Never boundaries. No aspirational claims.
7. **Personas are published as standards.** The persona missions are rendered
   into the export so that another agent asked to "act as the security engineer"
   inherits this project's definition of that role rather than a generic one.
8. **No new dependency.** The date is computed from `SystemTime` with the
   days-from-civil algorithm; no `chrono`/`time` crate is added for one string.
9. **Audited.** Every export appends an `interop.agent_context.exported` event
   with path, file counts, ADR/memory/persona counts and redactions — writing
   into a user's repository is a security-relevant action.
10. **Renderer stays unprivileged.** The export runs in the Rust core; the
    WebView still has no filesystem permission, so the capability model from
    ADR 0002 is unchanged.
11. **Commands are discovered, never guessed.** The published guidance on
    `AGENTS.md` is unanimous that the commands section is where agents fail most
    often — they invent `npm test` in a pnpm monorepo. Blueprint lists only what
    is declared on disk: `package.json` scripts (package manager taken from
    `packageManager`, else from the lockfile present) and `make` targets, capped
    at 20. When nothing is declared the file says so and tells the agent to
    discover the commands rather than invent them.
12. **Write the pointer under each tool's preferred filename.** Freebuff and
    Codebuff read `knowledge.md` before `AGENTS.md`, so an `AGENTS.md`-only
    export would be skipped by exactly the free tool most likely to be used on a
    side project. `POINTER_FILES` therefore lists `CLAUDE.md`, `GEMINI.md` and
    `knowledge.md`; each pointer carries both an imperative instruction to read
    `AGENTS.md` (for tools that load the file as plain text) and an `@AGENTS.md`
    import (for tools that parse imports). Adding a tool is a one-line change.

## Alternatives considered

- **MCP server exposing Blueprint's memory to any MCP client.** The right
  long-term answer for _live_ queries, but it requires the app to be running and
  reachable while another agent works, and MCP support is uneven across the
  tools above. A file works when Blueprint is closed. Not mutually exclusive —
  see Consequences.
- **Per-tool plugins/extensions (VS Code, JetBrains, OpenCode plugin).** Highest
  maintenance cost, slowest to cover new tools, and each still needs the same
  content pipeline.
- **A `blueprint` CLI that other agents shell out to.** Viable, and still the
  best route for _querying_ memory on demand, but it does not help agents that
  cannot run subprocesses, and it would not be read automatically at session
  start.
- **Copying each persona manual into the repository.** Rejected: 24 files of
  prompt engineering in every user's repo is noise, and the missions summary
  carries the standard without the bulk.
- **Doing nothing (manual copy/paste from the Memory page).** The status quo.
  Users would not do it, and the memory would stay trapped.

## Consequences

**Positive**

- Any `AGENTS.md`-reading agent inherits Blueprint's decisions with zero
  configuration and without Blueprint running.
- One content pipeline serves every tool; adding a tool that reads a different
  filename is a one-line addition to `POINTER_FILES`.
- The export doubles as a human-readable project brief: a new contributor can
  read `AGENTS.md` and learn the stack, the decisions and the standards.
- It is testable in isolation: `render_agents_md` is a pure function over plain
  data and is covered by unit tests, including the date maths.

**Negative / costs**

- The file goes stale as soon as the repository changes; regenerating is a
  manual act (mitigated by the "regenerate after significant changes" rule
  inside the file, and by the header stating the generation date).
- Generated files in a repository root can annoy users who keep their own
  `AGENTS.md`; mitigated by the marker rule and the visible `skipped` report,
  but it is still an opinionated default.
- Four small files appear in the project root even if the user only cares about
  one tool. Accepted: each pointer is a handful of lines, the marker rule protects
  hand-written files, and the skipped report makes the outcome visible. A user who
  keeps their own `knowledge.md` for Freebuff loses nothing — Blueprint declines
  to touch it.
- Content is a snapshot, not a query interface. An agent cannot ask Blueprint a
  follow-up question through the file.
- Only root-level declarations are read: a monorepo with per-package scripts gets
  the root scripts, not the workspace ones. Sub-directory exports are a follow-up.
- Freebuff and Codebuff are cloud-backed agents, so an exported `AGENTS.md` in a
  private repository can reach their model providers. The export redacts secrets,
  but committing architectural context is a disclosure decision the user should
  make deliberately — the file is generated locally and committed by choice.

**Follow-ups (not in this ADR's scope)**

- An MCP server for live queries against the memory tier, complementing the file.
- Optional `.gitignore` hint in the export result for users who do not want the
  file committed.
- Persona-level exports (`AGENTS.security.md`) if a project wants role-scoped
  context.
- Re-export triggers: on ADR creation, or when the scan detects a stack change.
