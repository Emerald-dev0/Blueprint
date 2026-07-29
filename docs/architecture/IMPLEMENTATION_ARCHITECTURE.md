# Blueprint Implementation Architecture: Master Specification

## 1. Stack Evaluation: The Desktop Foundation

Choosing the right foundation is critical for a high-performance "Command Center."

| Feature | Electron + React | Tauri + React | Flutter Desktop | Native (Swift/Rust) |
| :--- | :--- | :--- | :--- | :--- |
| **Performance** | Low (V8 Overhead) | **High (Rust Core)** | High | Ultra High |
| **Security** | Medium (Node.js surface) | **High (Isolated Backend)** | Medium | High |
| **Bundle Size** | ~100MB+ | **~5MB - 10MB** | ~30MB | < 5MB |
| **Ecosystem** | Massive | **Strong (Web + Rust)** | Medium | Fragmented |
| **Native APIs** | Via Node/Addons | **Direct Rust Access** | Plugins | Direct |
| **Verdict** | Rejected (Heavy/Slop) | **Selected (Blueprint Standard)**| Rejected (UX mismatch)| Rejected (Too slow to ship) |

**Final Choice: Tauri v2 + React (Next.js SSG).** 
*Rationale:* Tauri allows us to use Rust for high-performance indexing, file-system operations, and security, while maintaining the industry-leading DX of the React ecosystem for the UI.

---

## 2. Monorepo Architecture: Turborepo

We use a monorepo to maintain strict modularity and shared type-safety.

```text
/apps
  /desktop              # Tauri Application (Rust core + Next.js UI)
  /docs                 # Documentation site (Nextra/Docusaurus)
/packages
  /ui                   # "Ink & Mint" UI System (Shadcn/UI primitives)
  /core                 # Shared business logic and domain models
  /ai-adapters          # Unified interface for Gemini, Anthropic, OpenAI, Local
  /git-engine           # Rust-bound Git operations and GitHub API services
  /brain                # Memory indexing, LanceDB integration, vector logic
  /types                # Shared TS interfaces (generated via Specta)
/tools
  /configs              # Shared ESLint, Prettier, Tailwind, TS configs
```

---

## 3. Desktop Application Architecture

Blueprint operates on a **Bicameral Architecture**:

### Main Process (Rust)
- **Responsibilities:** File scanning (Tree-sitter), Local DB (SQLite/LanceDB), Git operations, Security (Keychain), AI Network routing.
- **Background Workers:** Dedicated OS threads for non-blocking indexing.

### Renderer Process (WebView/Next.js)
- **Responsibilities:** UI rendering, user interaction, spatial navigation, local workspace state.
- **Isolation:** The renderer has zero direct access to the Node.js API or the OS. It communicates exclusively via Tauri Commands.

### IPC (Inter-Process Communication)
- **Tauri Commands:** Request-response for specific actions (e.g., `cmd_analyze_repo`).
- **Global Events:** Push notifications for long-running tasks (e.g., `evt_scan_progress`).
- **Type Safety:** We use `specta` to export Rust types to TypeScript, ensuring the IPC bridge is never out of sync.

---

## 4. Frontend Architecture

### Application Shell
The shell is a persistent layout that provides the "Spatial Navigation" (Rail, Workspace, Wings). It handles:
- **Navigation Context:** Which project is active.
- **Command Palette:** The global `Cmd+K` listener.
- **Notification Bus:** Toasts and system-level alerts.

### Routing & Layouts
- **Next.js App Router:** Used in SSG mode.
- **Layouts:** Nested layouts for `Settings`, `ProjectWorkspace`, and `Home`.
- **Feature Modules:** Logic is grouped by feature (e.g., `features/ai-planner`, `features/repo-browser`) rather than by type (components/hooks).

---

## 5. Component Architecture

We follow a strict hierarchy to avoid "Component Slop":
1. **UI Primitives (`/packages/ui`):** Raw, stateless atoms (Button, Input, Badge).
2. **Feature Components:** State-aware components restricted to a specific domain (e.g., `ProjectCard`, `IssueList`).
3. **Business Components:** High-level orchestrators that connect feature components to stores (e.g., `AIProposalSurface`).
4. **Layout Components:** Pure structural shells.

---

## 6. State Management Strategy

| Layer | Solution | Data Example |
| :--- | :--- | :--- |
| **Global UI** | **Zustand** | Sidebar state, active project ID, theme. |
| **Server/Rust Data** | **TanStack Query** | Project lists, file trees, Git status (cached). |
| **Local Feature** | **React Context** | A single implementation plan's edit state. |
| **Persistent** | **Rust Core / SQLite** | User preferences, API keys, Project Charter. |

---

## 7. Local Database Architecture

Blueprint is local-first. We use two databases working in tandem:

### Relational Layer (SQLite)
*For structured, relational project data.*
- **Schema:**
  - `projects`: Root path, ID, creation date.
  - `implementation_plans`: Markdown content, status, parent project.
  - `git_metadata`: Last sync, tracked branches.
  - `activity_log`: History of decisions made.

### Memory Layer (LanceDB)
*For semantic search and project intelligence.*
- **Storage:** Vector embeddings of code snippets (indexed via Tree-sitter) and documentation.
- **Retrieval:** Semantic similarity search used by the AI Orchestrator to find relevant code context.

---

## 8. AI Integration Architecture (Adapter Pattern)

We use an **AI Orchestration Layer** to ensure provider independence.

```typescript
// Unified Adapter Interface
interface AIAdapter {
  id: "gemini" | "claude" | "openai" | "ollama";
  chat(prompt: Prompt): Promise<Response>;
  stream(prompt: Prompt): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
}
```

- **The Router:** A central service that selects the best provider for the task (e.g., Gemini for fast code scans, Claude for complex architectural planning).
- **The Redactor:** A local pre-processing step that removes secrets/PII before the prompt leaves the machine.

---

## 9. File System Architecture

Blueprint treats the filesystem as the primary source of truth.
- **The Scanner:** A Rust-based engine using `ignore` (like ripgrep) to respect `.gitignore` and `tree-sitter` to parse code.
- **Monorepo Support:** Blueprint detects `package.json`, `go.mod`, or `Cargo.toml` at multiple levels and maps the project structure accordingly.
- **Permissions:** Blueprint requests specific access to directories; it never scans the entire disk.

---

## 10. Plugin Architecture

Future extensibility is handled via a **Sandboxed Plugin System**:
- **Host:** Rust-based runner.
- **Guest:** WebAssembly (Wasm) or high-level DSL plugins.
- **Lifecycle:** `onProjectOpen`, `onFileChange`, `onPlanGenerated`.
- **API Surface:** Plugins can register new commands in `Cmd+K` or add custom analysis metrics.

---

## 11. GitHub Integration Service

A dedicated `GitEngine` package handles:
- **Auth:** OAuth via a system browser flow.
- **Operations:** Raw `git` commands (via `git2-rs`) for speed, falling back to the GitHub API for issues/PRs.
- **Isolation:** Git credentials never touch the UI layer; they are handled securely in the Rust backend.

---

## 12. Background Job System

Heavy operations are offloaded to **Rust Worker Threads**:
- **Queueing:** A priority-based queue (1. User Input, 2. File Indexing, 3. Background Sync).
- **Progress:** The frontend subscribes to `evt_job_progress` to show real-time feedback (e.g., "Indexing: 45%").
- **Cancellation:** Every job is tracked with a `CancellationToken` to allow instant user aborts.

---

## 13. Error Handling & Testing

### Error Strategy
- **Rust Errors:** Result types with custom `Error` enums, serialized to JSON for the frontend.
- **Frontend Errors:** Error Boundaries for UI crashes; "Call-to-Action" error states for logic failures (e.g., "AI Provider Down: [Switch to Gemini]").

### Testing Strategy
- **Unit (Rust):** Core logic, database migrations, parsing logic.
- **Unit (TS):** UI components, state stores.
- **Integration (Tauri):** IPC command testing.
- **E2E (Playwright):** Full application flows (Project creation -> Plan generation).

---

## 14. Performance Strategy
- **Zero-Lag UI:** No heavy computation on the JS main thread.
- **Incremental Indexing:** We store file hashes; we only re-parse what changed.
- **Virtualization:** All lists (files, terminal logs, plans) are virtualized to handle 10k+ items.
- **Asset Optimization:** Next.js Image optimization for project references.

---

## 15. Security Architecture

- **Secrets:** API keys are stored in the system's **Secure Enclave** (Keychain/Credential Manager).
- **File Access:** Strict scoping to the project root directory.
- **Prompt Safety:** Local "Safety Guardrails" that check for PII before transmission.
- **Audit Log:** Every AI interaction is logged locally for user review.

---

## 16. Developer Experience (DX)

- **One-Command Setup:** `pnpm install && pnpm dev` starts the entire stack.
- **Storybook:** For isolated UI component development.
- **Specta:** Instant TS types for any Rust backend change.
- **Linting:** Strict ESLint/Prettier/Clippy rules.

---

## 17. Final Folder Structure

```text
/
├── apps/
│   └── desktop/
│       ├── src/            # Next.js UI
│       └── src-tauri/      # Rust Core
├── packages/
│   ├── ui/                 # Design System components
│   ├── ai-adapters/        # AI logic
│   ├── git-engine/         # Git/GitHub logic
│   └── core/               # Shared logic
├── docs/                   # Engineering docs
└── pnpm-workspace.yaml
```

---

## 18. Implementation Order

### Phase 1: Foundation (Weeks 1-2)
- Monorepo setup, Tauri shell, `Cmd+K` bar, basic "Ink & Mint" styles.

### Phase 2: The Architect (Weeks 3-4)
- Rust file scanner, SQLite storage, basic AI planning (Gemini).

### Phase 3: The Brain (Weeks 5-6)
- LanceDB vector indexing, semantic code search.

### Phase 4: The Workflow (Weeks 7-8)
- GitHub integration, PR drafting, Activity logs.

---
*Blueprint Implementation Architecture — Finalized for Construction.*
