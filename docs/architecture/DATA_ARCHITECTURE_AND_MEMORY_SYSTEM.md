# Blueprint Data Architecture & Project Memory System

## 1. Executive Summary
Blueprint is designed as an "Intelligence Storage System." Unlike traditional applications that merely store state, Blueprint captures the **Project Brain**—a combination of structured metadata, semantic memory, and relational intelligence. This document defines the local-first data architecture that allows Blueprint to maintain institutional memory across sessions, years, and administrations.

---

## 2. Storage Strategy: The Triple-Threat Architecture

We reject a single-database approach. Blueprint uses a hybrid model optimized for high-performance engineering workflows.

| Technology | Role | Rationale |
| :--- | :--- | :--- |
| **SQLite** | **Structured Logic** | Relational consistency for projects, tasks, ADRs, and metadata. |
| **LanceDB** | **Semantic Memory** | Local-first vector storage for code embeddings and documentation. |
| **Filesystem**| **Raw Truth** | The source code and assets remain the primary source of truth. |

**Decision:** We use **SQLite + LanceDB**. This ensures that we have rigid relational links (e.g., this ADR belongs to this File) while maintaining fuzzy semantic search (e.g., "Find where we handle auth").

---

## 3. Data Model Design (Relational)

### Core Entities
- **Workspaces:** High-level groupings of related projects.
- **Projects:** The primary unit of intelligence (Linked to a filesystem root).
- **Files & Folders:** Virtual representation of the project structure for metadata tracking.
- **Project Charters:** The "Constitution" of the project (Principles, Style, Constraints).

### Intelligence Entities
- **Architecture Decision Records (ADRs):** The "Why" behind the code.
- **Implementation Plans:** Historical records of how features were proposed and executed.
- **AI Conversations:** Context-aware threads linked to specific files or plans.
- **Requirements:** Extracted from docs/PDFs/Websites and linked to code modules.

---

## 4. The Memory Tier Model

Memory is segregated to ensure relevance and performance.

### Session Memory (Short-Term)
- **Scope:** Current active window/chat.
- **Storage:** In-memory + WAL (Write-Ahead Log) for crash recovery.
- **Purpose:** Temporary context like "the file I just opened" or "the last error I saw."

### Project Memory (Working Memory)
- **Scope:** Current project lifecycle.
- **Storage:** SQLite + LanceDB.
- **Purpose:** Technology stack, architecture rules, and current feature status.

### User Memory (Global Memory)
- **Scope:** Across all projects.
- **Storage:** Global SQLite.
- **Purpose:** Preferred coding styles (e.g., "I prefer functional over OOP"), API keys, and workflow habits.

### Organization Memory (Long-Term)
- **Scope:** Shared across teams/generations.
- **Storage:** Synced SQLite (Future).
- **Purpose:** Shared engineering standards and "Institutional Knowledge" that survives developer turnover.

---

## 5. Knowledge Graph & Relationship Mapping

Blueprint maintains a **Logical Graph** above the database to understand system dependencies:
- **Developer** `authored` **Commit** `implemented` **Feature**.
- **ADR** `modified` **Component** `depends on` **Service**.
- **Requirement** `satisfied by` **File**.

**Benefit:** When a user asks "What happens if I remove this service?", Blueprint can trace the path from the original Requirement to the ADR that justified the service, and finally to the dependent components.

---

## 6. Vector Search & Indexing System

### Embedding Strategy
- **Granularity:** We index at the **Function/Class level**, not just the file level.
- **Content:** We embed Code, Comments, and associated ADR summaries.
- **Local Indexing:** Uses **Tree-sitter** for incremental parsing and **LanceDB** for zero-latency retrieval.

### Indexing Lifecycle
1. **FS Watcher:** Detects file change.
2. **Incremental Scan:** Only re-index modified files.
3. **Context Enrichment:** Update the semantic index with the "Reason for Change" extracted from the latest Git commit.

---

## 7. AI Context Generation Pipeline

This is how Blueprint decides what to feed the AI:
1. **Retrieval:** Semantic search for relevant code + Keyword search for ADRs.
2. **Ranking:** Scores information based on `Recency`, `Relevance`, and `Relationship Depth`.
3. **Pruning:** Fits the most critical information into the model's context window.
4. **Synthesis:** Packages the data into a "Context Pack" for the AI Agent.

---

## 8. Privacy & Security Model

> [!IMPORTANT]
> **Data Sovereignty:** All SQLite and LanceDB files are stored locally in the user's application data folder.

- **Encryption:** Database files are encrypted at rest using AES-256 (User-provided master key optional).
- **Redaction:** Before any context is sent to an external LLM, it passes through a local **Redaction Engine** that masks PII and secrets.
- **Ownership:** Blueprint exports are standard JSON/Markdown, ensuring no vendor lock-in of project memory.

---

## 9. Scaling & Performance
- **Large Repos:** Uses SQLite indices and vector partitioning to handle projects with 100k+ files.
- **Background Jobs:** Heavy indexing happens in low-priority OS threads (Rust core).
- **Caching:** Fingerprinted file hashes ensure we never process the same code twice.

---

## 10. Edge Case Handling
- **File Deletion:** Missing files are marked as "Orphaned" in the memory system, preserving the "Historical Why" even if the code is gone.
- **Drift Detection:** Blueprint warns if the code deviates significantly from the stored ADRs or Project Charter.
- **Corrupted Memory:** Automated weekly backups of the SQLite database.

---
*Blueprint Data Architecture — Finalized.*
