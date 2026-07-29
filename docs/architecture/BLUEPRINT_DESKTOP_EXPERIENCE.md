# Blueprint Desktop Experience Design

## 1. Design Philosophy: The Disappearing Interface
Blueprint is not a tool you *look at*; it is a tool you *work through*. It is designed as an **Engineering Operating System** that prioritizes the developer's project above its own UI.

- **Focus First:** Complexity is hidden behind layers of progressive disclosure.
- **Intent-Driven:** Actions are initiated by defining goals, not by clicking dashboards.
- **Calm Interaction:** The interface is quiet, using "Ink & Mint" to guide the eye without causing fatigue.
- **Purposeful Motion:** Every transition explains a spatial relationship or a state change.

---

## 2. User Personas Adaptation

### Solo Developer (The Speed Runner)
- **UI Mode:** Minimalist. Expanded workspace, heavy reliance on `Cmd+K` for rapid context switching.
- **Primary Need:** Automating boilerplate and maintaining high quality while moving fast.

### Startup Founder (The Architect)
- **UI Mode:** Intelligence-heavy. Architecture maps and Project Health are prioritized.
- **Primary Need:** Ensuring the V1 vision remains intact as the codebase grows.

### Engineering Team Member (The Collaborator)
- **UI Mode:** Review-focused. GitHub issues and PR "Intent Diffs" are front-and-center.
- **Primary Need:** Understanding the "Why" behind a teammate's changes instantly.

### Technical Lead (The Guardian)
- **UI Mode:** Governance-heavy. ADR explorer and "Intent Drift" alerts.
- **Primary Need:** Maintaining engineering standards and institutional memory across generations.

---

## 3. Primary Workflows

### Journey: From Handoff to Implementation
1. **Import:** Drag folder into Blueprint → Background indexing starts.
2. **Analyze:** "Explain the core logic" → Architecture graph appears.
3. **Plan:** "We need to add Stripe billing" → AI Research Agent analyzes Stripe docs; Architecture Agent proposes schema.
4. **Draft:** Implementation Plan generated as a structured document.
5. **Approve:** Developer edits and "Seals" the plan.
6. **Execute:** Coding Agent drafts files in splits; developer reviews side-by-side.
7. **Commit:** PR description auto-generated from the sealed plan → Push to GitHub.

---

## 4. Application Layout (The Shell)

### The Navigation Rail (Global)
Slim 64px vertical bar on the left.
- `Workspace` (Projects)
- `Intelligence` (Reference Analysis)
- `GitHub` (VCS View)
- `Memory` (ADRs & History)
- `Settings`

### The Workspace (Heart)
Flexible center area. Supports:
- **Tabs:** File-based or Task-based.
- **Splits:** Vertical/Horizontal splits for side-by-side review.
- **Pins:** Important plans or architecture maps can be pinned to the "ceiling" for persistent reference.

### The Wings (Contextual)
- **Left Wing:** Project Explorer / File Tree.
- **Right Wing:** Inspector Panel / AI Teammate.
- *Behavior:* Wings auto-collapse to maintain focus on the main workspace.

---

## 5. The Command Palette (`Cmd+K`)
The engine of Blueprint. Inspired by Raycast, designed for engineers.

- **Unified Search:** Files, Projects, Plans, ADRs, and GitHub Issues.
- **AI Direct Commands:** `> Plan OAuth`, `> Review current file`, `> Ask Project: How does auth work?`
- **Actions:** `> Open in VS Code`, `> Create GitHub Issue`, `> Analyze Website`.
- **Plugin Registry:** Third-party plugins register their commands here.

---

## 6. AI Workspace: The Teammate Interface
Blueprint treats AI as a senior developer sitting beside you, not a chatbot in a window.

- **Intent Surfaces:** Proposals appear as editable Markdown documents with embedded code blocks.
- **Reasoning Trace:** An optional, collapsible "Monospace Log" showing the AI's internal logic (e.g., "Scanning User.kt... Found auth middleware... Checking config...").
- **Tool Activity:** Real-time feedback when the AI is reading files or searching documentation.
- **The Consent Seal:** A clear, mint-colored "Approve & Execute" button at the bottom of every plan.

---

## 7. Project Intelligence & Memory View

### Intelligence Viewer
- **Architecture Map:** Interactive node graph of system components.
- **Risk Report:** Monospace table highlighting circular dependencies, unhandled errors, or missing docs.
- **Tech Fingerprint:** Detailed breakdown of detected frameworks and design tokens.

### Memory Explorer
- **Instant Search:** Fuzzy search through every technical decision ever made in the project.
- **ADR Timeline:** A vertical history of "Why" decisions, linked to the specific commits that implemented them.
- **Constraint Cloud:** Visual list of project "Non-Negotiables" defined in the Project Charter.

---

## 8. GitHub Workspace
A native-feeling layer above the GitHub website.

- **Pull Request Timeline:** Visualizes the "Sealed Intent" alongside the actual code changes.
- **Review Mode:** AI-assisted review flagging deviations from the Project Brain.
- **Action Logs:** Monospace stream of CI/CD builds with one-click "Fix with AI" for failures.

---

## 9. Keyboard-First UX

| Shortcut | Action |
| :--- | :--- |
| `Cmd + K` | Open Command Palette |
| `Cmd + P` | Quick Open File |
| `Cmd + \` | Toggle Left Wing (Explorer) |
| `Cmd + J` | Toggle Right Wing (AI Teammate) |
| `Cmd + Shift + P` | Start New Implementation Plan |
| `Cmd + [ / ]` | Navigate History (Back/Forward) |
| `Cmd + T` | Create New Split View |

---

## 10. Motion & Loading States

- **Window Entrance:** A subtle 20px fade-up to represent "Focus Mode."
- **Panel Slide:** Exponential ease-out (250ms) for Wing panels.
- **Indexing Progress:** A thin mint line at the top of the workspace that pulses during background scans.
- **Skeleton Views:** Used for the Project Dashboard to ensure the interface feels "Instant."

---

## 11. Multi-Monitor Experience
- **Detached Windows:** Ability to drag an "Architecture Map" or "AI Plan" into a separate window on a secondary monitor.
- **State Persistence:** Blueprint remembers window positions and split configurations per project.

---

## 12. Anti-Slop Rules
1. **No Floating Widgets:** All interactive elements must live within the Grid or the Command Palette.
2. **No "Hero" Banners:** Every pixel on the dashboard must be actionable data.
3. **No Excessive Cards:** Prefer tables and lists for high-density engineering data.
4. **No Chat Home:** The home screen is your projects, not a "How can I help?" box.
5. **No Decorative Gradients:** Color is used for meaning (Success, Error, Active), never for decoration.

---

## 13. Usability Review (Heuristics)
- **Recognition over Recall:** The Command Palette provides fuzzy suggestions to minimize memorization.
- **Error Recovery:** Every AI-generated file change is staged in a temporary branch for 1-click revert.
- **Consistency:** Use of "JetBrains Mono" for all data ensures a consistent "Technical Editorial" feel.

---
*Blueprint Desktop Experience — Master Specification Version 1.0.*
