# Blueprint UI/UX Experience System

## 1. Core Experience: The First 30 Seconds

When a developer opens Blueprint, they should feel an immediate sense of **clarity and capability**. It should feel like stepping into a well-organized, high-end workshop—calm, focused, and ready for work.

- **First Impression:** A premium, "quiet" interface. No clutter, no flashing notifications, just a clear entry point into their engineering world.
- **Emotional Response:** "This tool understands my project better than I do right now." A transition from chaos to control.
- **Mental Model:** A **Command Center**. It’s not where you write every line of code; it’s where you govern the *intent* of your code.
- **Expected Action:** "Search or Create." The interface invites the user to find a project or start defining a new one immediately via a central command bar.

---

## 2. Design Philosophy

### Visual Personality: **The Technical Editorial**
Blueprint blends the precision of a technical blueprint with the readability of a high-end editorial layout.
- **Technical:** Clean lines, monospace accents for data, and a focus on hierarchy.
- **Professional:** High-contrast typography, a restrained "Mint & Ink" palette, and intentional whitespace.
- **Human:** Muted secondary tones and soft edges on containers to avoid "mechanical coldness."

### Interaction Personality: **Assistive Speed**
- **Calm:** Information is progressively disclosed. We never show 100% of the data if 20% is what’s needed for the current task.
- **Fast:** Every action has a keyboard shortcut. Zero-latency transitions.
- **Powerful:** Commands are "multi-step" but feel like a single thought.

---

## 3. Information Architecture

Blueprint uses a **Spatial Hierarchy** to manage complexity.

- **Global Navigation (The Rail):** A slim, collapsible vertical rail on the far left for high-level switching:
    - `Workspace` (The home base)
    - `Library` (References, specs, templates)
    - `Extensions` (Plugins and tools)
    - `Settings`
- **Workspace Navigation (The Surface):** The main area where the "Active Project" lives.
- **Context Panels (The Wings):** Collapsible side panels that appear based on the task (e.g., an "AI Planning" wing on the right, or a "File Explorer" wing on the left).
- **The Command Bar (The Heart):** A floating central command palette (`Cmd+K`) that acts as the primary driver for all navigation and actions.

---

## 4. User States

### The New User (The Explorer)
- **Home View:** A "Getting Started" checklist that isn't a sidebar, but a beautifully laid out sequence of cards:
    - *Index your first repository*
    - *Define your Project Charter*
    - *Connect GitHub*
- **Empty States:** Interactive. Instead of "No projects," it says "Where should we start?" with two large, clear buttons: `[Import Repository]` and `[New Blueprint]`.

### The Returning User (The Resident)
- **Home View:** A "Project Grid" sorted by `Last Intent`.
- **Contextual Memory:** "You were halfway through the 'OAuth Migration' plan for Project X. Continue?"
- **Stat Strip:** A minimalist row showing active PRs, unaddressed architectural notes, and project health.

### The Advanced User (The Pilot)
- **Home View:** Minimalist. Just the command bar and a "Recent" list.
- **Workflow:** Keyboard-first. They use `Cmd+K` -> `p-o-a-u` -> `Enter` to jump into the "OAuth" project and `Cmd+Shift+P` to start a new implementation plan.

---

## 5. Project Workspace: What Deserves Attention?

Generic dashboards show "Commits per day." Blueprint shows **Project Intelligence**:
- **Architecture Health:** "3 modules deviate from the established 'Repository Pattern'."
- **Intent Drift:** "Last 5 PRs were merged without updating the Project Charter."
- **Active Threads:** Ongoing implementation plans that aren't yet closed.
- **Memory Map:** A visual graph of how the latest changes affect the core system.

---

## 6. AI Interaction: Beyond the Chatbot

Blueprint rejects the "Chat Bubble" as the primary interface. Instead, it uses **Intent Surfaces**.

- **The Proposal Block:** When the AI suggests a plan, it appears as a structured document (Rich Text + Code Blocks + Checklists) that the user can edit directly.
- **Inline Ghosting:** In planning views, the AI "ghosts" suggestions into the text. You don't "chat" with it; you "collaborate" on the document.
- **The Approval Gate:** Every AI action ends with an **Action Proposal**.
    - *AI:* "I've drafted the schema changes. [Review & Apply to GitHub] | [Edit Plan]"

---

## 7. The Command System

Inspired by Raycast and Linear, the `Cmd+K` palette is the engine of Blueprint.
- **Fuzzy Search:** Projects, Files, Implementation Plans, Documentation.
- **Actions:** 
    - `> Analyze Repository`
    - `> Generate PR Description`
    - `> Review Architecture`
    - `> Sync GitHub Issues`
- **Smart Shortcuts:** Typing `plan auth` immediately initiates the AI planning flow for "Authentication."

---

## 8. Visual & Layout Philosophy

### Adaptive Progressive Disclosure
- **Level 1 (Summary):** High-level health and intent.
- **Level 2 (Detail):** Click a health warning to see the specific files and architectural violation.
- **Level 3 (Action):** Open the AI Planner to fix the violation.

### Spacing & Density
- **Wide Gutters:** High-level planning pages have wide margins for focus.
- **Condensed Grids:** Data-heavy views (like the File Scanner) use tight, high-density monospaced tables.

---

## 9. Motion Design Principles

Motion in Blueprint must **Guide**, not **Decorate**.
- **The Slide-In:** Panels slide in from the right to represent "Contextual Assistance."
- **The Fade-Up:** New plans fade in to represent "Emerging Intelligence."
- **The Pulse:** A subtle, non-intrusive pulse on a module in the architecture graph when it's being analyzed.
- **Zero-Bounces:** We use smooth, linear-out or cubic-bezier eases. No "cartoonish" bounces.

---

## 10. Signature Blueprint Moments

1. **The Handshake:** When you first import a repo, Blueprint "draws" the architecture graph in real-time as it scans.
2. **The Intent Seal:** When a plan is approved, a subtle "Seal" animation confirms it's now part of the Project Memory.
3. **The Brain Sync:** A tiny, unobtrusive indicator that glows when Blueprint is "thinking" about a background code change.
4. **The Ghost Writer:** AI suggestions appearing in the Implementation Plan as if a senior dev is typing over your shoulder.
5. **The Architecture Diff:** A "Before & After" visualization of the system diagram before merging a PR.
6. **The Jump-Cut:** Instantly switching between projects with `Cmd+K` feels like a camera cut in a movie—instant and seamless.
7. **The Charter Audit:** Highlighting a block of code and asking "Does this follow the Charter?" results in a side-by-side comparison.
8. **The Knowledge Handoff:** Exporting a "Project Brain" for a new team member creates a beautiful, interactive README.
9. **The Command Combo:** Chaining actions (e.g., `Scan repo` then `Find security flaws`) in the command bar.
10. **The Deep Focus:** A one-click "Focus Mode" that hides everything except the current Implementation Plan and the relevant code references.

---

## 11. Accessibility & Dark Mode

- **Dark Mode (Ink & Neon):** A deep charcoal (`#0B0B0B`) background with vibrant mint accents. It’s not just inverted; it’s optimized for reduced eye strain during late-night coding.
- **Keyboard First:** 100% of Blueprint can be operated without a mouse.
- **Screen Readers:** All diagrams and graphs have semantic ARIA descriptions (e.g., "Architecture graph showing 5 controllers linked to 2 services").

---
*Blueprint UI/UX Experience System — Version 1.0.*
