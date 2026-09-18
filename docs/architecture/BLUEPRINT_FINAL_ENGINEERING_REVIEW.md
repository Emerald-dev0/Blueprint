# Blueprint: Final Principal Engineering & Design Review

> **Design spec, written before implementation.** This document records what was
> planned, not what ships. Where it disagrees with the code, the code wins: the
> current state is the [root README](../../README.md), the [ADRs](../adr) and the
> source itself. [docs/README.md](../README.md) lists what is authoritative.

> **⚠️ Provenance note (added 2026-09-15).** This document is a **synthetic
> self-review**, produced by an AI assistant role-playing a panel of industry
> engineers. It is **not** a record of an external review by named employees of
> Microsoft, GitHub, Figma, Linear, Cloudflare, Chrome or OpenAI, and it must not
> be cited as one. It is retained because several of its recommendations were
> correct and had been ignored; the table at the end of this note tracks which
> have now been actioned.
>
> | Review recommendation                   | Status 2026-09-15                                                       |
> | :-------------------------------------- | :---------------------------------------------------------------------- |
> | Drop Website Intelligence from v0.1     | Not actioned — kept, but implemented for real and de-emphasised in UI   |
> | Collapse packages to 3 for velocity     | Not actioned — empty packages retained but no longer advertised         |
> | Single orchestrator instead of 5 agents | Partially actioned — no multi-agent loop ships; prompt compilation only |
> | Prioritise editor bridge / file watcher | Not started                                                             |
> | Sandbox L4 commands / defer plugins     | **Actioned** — unsandboxed Python runner removed (ADR 0002)             |
>
> **Status:** Action Required (Critical)
> **Review Date:** 2026-07-29
> **Panel:** synthetic (AI role-play), see note above.

---

## 1. Executive Summary: The Brutal Truth

Blueprint is an ambitious architectural masterpiece that risks collapsing under its own weight before it ships. While the vision of an "Engineering Brain" is compelling, the current v1 specification attempts to solve too many complex problems simultaneously (Multi-agent orchestration, Wasm sandboxing, Website reverse-engineering, and Global Project Memory).

**The Verdict:** **APPROVED WITH MANDATORY CHANGES.** Implementation of the core shell may begin, but the intelligence layer must be aggressively simplified to reach an MVP.

---

## 2. Product Audit: The Value Gap

### The "Friction" Killer

Blueprint's value depends on developers "Sealing" plans and documenting ADRs. If a developer can achieve 80% of the result in Cursor/Windsurf with 0% documentation effort, they will choose the path of least friction.

- **Problem:** Blueprint assumes a level of discipline that exists in high-end teams (Stripe, Linear) but is rare in the mass market.
- **Risk:** If the "Initial Handshake" (indexing) and "Planning Loop" add more than 5 minutes of overhead to a task, users will churn.
- **Recommendation:** **Remove Website Intelligence from v0.1.** It is a distraction. Focus 100% on the "Local Repository Intelligence" and making the ADR capture _zero-effort_.

---

## 3. Engineering Audit: The Scaling & IPC Bottleneck

### The Tauri / Rust Bridge

- **The Million File Problem:** Indexing 1 million files with Tree-sitter in the background is fine for Rust, but piping the resulting graph/metadata to a React frontend via Tauri IPC is a significant performance risk.
- **IPC Choke:** Tauri's IPC is serial. Large data transfers (e.g., a complex dependency map) will freeze the UI main thread during serialization/deserialization.
- **Technical Debt:** The monorepo has 6+ packages before a single line of code is written. This is **Premature Abstraction**.
- **Simplification:** Collapse `ai-adapters`, `git-engine`, and `core` into a single Rust crate for Phase 1. Separate them only when the domain logic stabilizes.

---

## 4. AI Architecture Audit: Orchestration Overkill

### Multi-Agent Hallucinations

The AI Architecture proposes 5 specialized agents (Research, Architecture, Coding, Review, Documentation).

- **Brutal Critique:** Coordinating 5 agents leads to an exponential increase in token cost and latency. Agents often get stuck in loops blaming each other.
- **Constraint:** Use a **Single Orchestrator Agent** with a "Thought-Loop" capability (Chain-of-Thought) for the MVP.
- **Context Window:** Gemini 1.5 Pro's 1M+ token window is a crutch. If Blueprint relies on "dumping everything" into the prompt, it will be slow and expensive. Deep, semantic RAG (LanceDB) must be the primary driver, not a secondary one.

---

## 5. Security Audit: The Tool-Use Trap

### Elevation of Privilege (Level 4/5)

- **Prompt Injection:** A malicious `README.md` could contain an injection that tricks the "Coding Agent" into executing `rm -rf /` or stealing SSH keys via the L4 (Execute Command) permission.
- **L4 Sandbox:** The current plan for a "temporary sub-shell" is weak. L4 commands must run in a truly isolated container (e.g., Docker or a dedicated VM) if Blueprint is to be used on untrusted repositories.
- **Wasm Runtime:** Building a Wasm Host API for filesystem and AI access is a 6-month engineering task.
- **MVP Shortcut:** Use a local JS-based plugin system with restricted `eval` first, or defer plugins entirely to v0.5.

---

## 6. Design & UX Audit: Minimal vs. Obscure

### The "Disappearing Interface"

- **Cognitive Load:** If the interface "disappears" too much, the user feels lost. `Cmd+K` is powerful but has a high "Recall" requirement.
- **Information Density:** Avoid the "Linear-clonitis" of too much whitespace. Engineers like data. The "Dashboard" must show the **File Tree** and **Active Diff** by default, not hide them.
- **Anti-Slop Check:** The "No Chat Bubbles" rule is excellent. Stick to it. The **Intent Surface** (Markdown document) is our unfair advantage.

---

## 7. Competitor Comparison: Where We Win

| Competitor      | Their Edge                  | Blueprint's Counter-Attack                                                |
| :-------------- | :-------------------------- | :------------------------------------------------------------------------ |
| **Cursor**      | Native editor integration.  | Blueprint owns the **"Why" (ADRs)**. Cursor forgets; Blueprint remembers. |
| **Aider**       | Fast, CLI-based efficiency. | Blueprint provides a **Visual Architecture** mental model.                |
| **Claude Code** | Pure speed.                 | Blueprint provides **Context Persistence** across sessions.               |
| **Raycast**     | Best-in-class UX.           | Blueprint is **Domain Specific** for engineering intelligence.            |

---

## 8. Risk Register

| Risk                  | Likelihood | Impact | Mitigation                                                                       |
| :-------------------- | :--------- | :----- | :------------------------------------------------------------------------------- |
| **IPC Stutter**       | High       | High   | Use shared memory or incremental streaming for large data.                       |
| **AI Cost Explosion** | Medium     | High   | Hard token caps per "Intent Loop"; User must approve "Heavy Reasoning" tasks.    |
| **Indexing Latency**  | High       | Medium | Persistent cache for Tree-sitter hashes; ignore large binary folders by default. |
| **Knowledge Drift**   | High       | High   | Auto-detect when code changes in VS Code and prompt user to "Update Brain."      |

---

## 9. Production Readiness Scorecard

| Category            | Score | Required Improvement                                       |
| :------------------ | :---- | :--------------------------------------------------------- |
| **Architecture**    | 9/10  | Excellent separation of concerns.                          |
| **Product Focus**   | 6/10  | **Mandatory:** Drop Website Intelligence for v0.1.         |
| **Performance**     | 7/10  | **Mandatory:** Stress test Tauri IPC with 10k nodes.       |
| **AI Intelligence** | 5/10  | **Critical:** Simplify multi-agent to single orchestrator. |
| **Security**        | 8/10  | Strong local-first approach.                               |
| **DX**              | 9/10  | Monorepo setup is top-tier.                                |

---

## 10. Final Verdict

### **APPROVED WITH CHANGES**

Blueprint is ready for technical scaffolding **ONLY IF** the following "Pruning Operations" are completed:

1.  **Phase 0.1 Pruning:** Move "Website Intelligence" and "Plugin Marketplace" to the backlog. They are not part of the core value of "owning the intent."
2.  **Agent Simplification:** Consolidate the agent system into a single "Architect-Coder" loop.
3.  **Crate Consolidation:** Reduce the monorepo package count to 3 for initial velocity (App, UI, Core).
4.  **Editor Bridge:** Prioritize the "VS Code Open" and "File Watcher" features. If Blueprint doesn't stay in sync with the user's IDE, it will die as a "tab they forgot to check."

---

_Review signed by the Blueprint Founding Review Board._
