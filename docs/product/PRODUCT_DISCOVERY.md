# Blueprint Product Discovery

## 1. The Core Problem: The Fragmented Engineering Brain

Current AI tools focus on **execution** (generating code) but neglect **engineering intelligence** (intent, architecture, and memory). 

### The Industry Gap
- **Context Loss:** Every time a developer starts a new chat, the "engineering brain" resets. Previous architectural decisions, design constraints, and project history are lost.
- **Architectural Drift:** AI code generators often suggest the "shortest path" to a solution, which frequently violates established project patterns and accrues technical debt.
- **Disconnected Workflows:** Developers jump between Notion (planning), Figma (design), VS Code (coding), and separate browser tabs (AI chat). There is no "command center" that connects these signals into a coherent implementation strategy.
- **Documentation Rot:** Readmes and docs are rarely updated to reflect the *actual* state of the codebase.
- **Review Overhead:** Reviewing AI-generated code is exhausting because the reviewer lacks the "thought process" behind the changes.

**Blueprint solves for the "State of Intent." It is the persistent, intelligent layer that sits above the IDE and below the project management tool.**

---

## 2. User Personas

### P1: The Solo Founder / Indie Hacker
- **Experience:** Senior engineer, multi-disciplinary.
- **Workflow:** Rapid prototyping, "Context Switching" between marketing, design, and code.
- **Pain Points:** Hard to maintain high quality when moving fast; "What was I thinking two weeks ago?" syndrome.
- **Tools:** Cursor, Figma, Linear, Twitter.
- **Why Blueprint:** They need a "Second Brain" to keep their project quality consistent as it grows. Blueprint acts as their CTO, ensuring they don't build "spaghetti" while rushing to launch.

### P2: The High-End Freelancer
- **Experience:** Expert-level, handles complex client handoffs.
- **Workflow:** Managing 3-5 disparate projects simultaneously.
- **Pain Points:** Re-learning project context when switching clients; providing "professional" documentation and implementation plans to justify high rates.
- **Tools:** GitHub, Notion, Slack, Raycast.
- **Why Blueprint:** Blueprint allows them to "swap" project brains instantly. It generates high-fidelity implementation plans and architectural summaries that they can share with clients as "deliverables."

### P3: The Startup Core Engineer
- **Experience:** Mid-to-Senior, working in a fast-paced team.
- **Workflow:** Feature delivery, PR reviews, firefighting.
- **Pain Points:** Onboarding new team members; ensuring PRs follow the "V1 vision"; maintaining internal documentation.
- **Tools:** VS Code, Slack, GitHub, Linear.
- **Why Blueprint:** It acts as the "Team Memory." When a new dev joins, Blueprint explains the architecture. When a PR is submitted, Blueprint checks it against the "Project Charter" for consistency.

### P4: The Product Agency
- **Experience:** Diverse teams, highly structured workflows.
- **Workflow:** Scoping → Design → Implementation → Handoff.
- **Pain Points:** Inconsistent code quality across developers; loss of "Design Intent" when moving from Figma to Code.
- **Tools:** Figma, Jira, GitHub, Slack.
- **Why Blueprint:** Standardization. Blueprint enforces a shared "Engineering Standard" across all agency projects. It links Figma references directly to architectural decisions.

---

## 3. The User Journey: From Inspiration to Deployment

### Phase: Discovery & Research
- **Input:** The user drops a folder containing Figma screenshots, a PDF spec from a client, and 3 links to "competitor" websites.
- **Blueprint Action:** Analyzes the "External References." It extracts design patterns, tech stack requirements, and functional constraints. It creates a "Project Knowledge Base" before a single line of code is written.

### Phase: Planning & Architecture
- **Action:** The user says, "We need to add a subscription billing system."
- **Blueprint Action:** 
    1. Scans the current codebase for existing data models.
    2. Cross-references the "Founding Charter" for security/privacy rules.
    3. Generates an **Implementation Plan** (not code) that outlines:
        - Schema changes.
        - API endpoints.
        - Security implications.
        - UI components needed.

### Phase: Orchestrated Implementation
- **Action:** User approves the plan.
- **Blueprint Action:** Coordinates with "Execution Agents" (like Claude Code or Cursor). It feeds them the *exact* context needed for each sub-task, ensuring they don't deviate from the plan.

### Phase: Review & Memory
- **Action:** The code is written.
- **Blueprint Action:** Summarizes the *decisions* made during coding (e.g., "We chose X library over Y because of Z"). It updates the `PROJECT_MEMORY.md` so that six months later, the "Why" is still clear.

---

## 4. Feature Discovery

### CORE FEATURES (Product Identity)
1. **The Project Brain (Context Management):** A persistent vector store/graph of the project's intent, rules, and history.
2. **Implementation Plan Generator:** A structured, reviewable document format that precedes code generation.
3. **Reference Analyzer:** Tools to ingest screenshots, PDFs, and URLs to extract engineering requirements.
4. **Project Charter Enforcement:** A system to "flag" when proposed changes violate the core values of the project.

### SUPPORTING FEATURES (Usefulness)
1. **GitHub Workflow Manager:** Auto-generation of PR descriptions based on the *Implementation Plan* and *Actual Changes*.
2. **Architectural Diffing:** Visualizing how a new feature changes the system diagram.
3. **Documentation Sync:** Auto-updating `docs/` as the implementation evolves.

### EXPERIMENTAL FEATURES (Future)
1. **Multi-Agent Orchestration:** Spinning up 3 parallel agents to handle Frontend, Backend, and Tests based on a single Blueprint plan.
2. **"Time Travel" Debugging:** Using project memory to find exactly when an architectural decision (that led to a bug) was made.

---

## 5. Competitor Analysis & Differentiation

| Product | Mental Model | Where it Fails | Blueprint's Opportunity |
| :--- | :--- | :--- | :--- |
| **Cursor / Windsurf** | "Smart Editor" | Focused on the *current* file/task. Lacks long-term "Why" and cross-tool planning. | Blueprint sits *above* the editor, managing the strategy Cursor executes. |
| **Claude Code / Copilot** | "Terminal / CLI Assistant" | Transactional. The context "dies" with the session. | Blueprint is the "Permanent Memory" that feeds the CLI. |
| **Linear** | "Task Management" | Disconnected from the code. Tickets don't know about `User.kt`. | Blueprint bridges the "Linear Ticket" to the "Code implementation." |
| **Notion** | "Wiki / Documentation" | Static and manual. Becomes outdated instantly. | Blueprint is a "Living Document" that updates itself from code/design signals. |

**The Unfair Advantage:** 
Blueprint owns the **Logic of Intent**. While others race to generate code faster, Blueprint ensures that the code being generated is *correct for the project's soul.*

---

## 6. MVP Definition

### Version 0.1: The Architect (Discovery & Planning)
- **Features:** 
    - "Project Charter" creator.
    - Codebase context indexer (RAG).
    - Structured "Implementation Plan" generator.
- **Value:** Stops developers from starting a feature without a plan.
- **Success Criteria:** A developer can generate a plan that another developer (or AI) can execute with zero questions.

### Version 0.5: The Command Center (Orchestration)
- **Features:** 
    - Integration with GitHub (PR management).
    - Integration with Reference files (PDF/Image analysis).
    - Multi-provider AI support (use your own keys).
- **Value:** Unifies planning with the first step of execution.

### Version 1.0: The Engineering Brain (Full Lifecycle)
- **Features:** 
    - Living documentation (Auto-updating docs).
    - Architectural "Health Check" (Detecting drift).
    - Agent handoff protocol (Standardized context for Cursor/Claude Code).

---

## 7. Edge Case Analysis

- **The Messy Legacy Project:** Blueprint's first job is a "Sanity Audit" to map the mess before planning new features.
- **Sensitive Code / Privacy:** Local-first RAG and "Redaction Layers" to ensure secret keys or PII never hit the LLM.
- **Offline Mode:** Local vector DB and support for local LLMs (Ollama) for architectural queries.
- **Huge Repositories:** Intelligent pruning. Only "active context" and "relevant core modules" are loaded into the immediate brain.
- **Abandonment & Return:** Blueprint provides a "Welcome Back" summary: "Here is where you left off, and the 3 open threads in your implementation plan."

---

## 8. The Quality Bar

**Is this enough information to build Blueprint?**
Yes. We have a clear understanding of the "Intent Layer" vs. "Execution Layer." We have a defined user base and a roadmap that avoids the "generic AI chatbot" trap.

---
*Blueprint Product Discovery — Phase 1 Complete.*
