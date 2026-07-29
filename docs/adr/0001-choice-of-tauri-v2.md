# ADR 0001: Choice of Tauri v2 as Desktop Shell

## Status
Accepted

## Context
Blueprint requires a high-performance desktop shell that can interact with the local filesystem, execute background indexing, and manage secure credentials, all while maintaining a premium, low-latency UI.

### Options Considered
- **Electron:** High RAM usage, large bundle size, Node.js attack surface.
- **Tauri v2:** Rust-based core, small footprint, high security, native performance.
- **Flutter Desktop:** Excellent for UI but limited ecosystem for deep engineering tools (e.g., Tree-sitter integration).

## Decision
We have chosen **Tauri v2** with a Rust backend and Next.js (SSG) frontend.

## Consequences
- **Security:** We gain the benefits of Rust's memory safety and Tauri's "Bicameral" isolation (Renderer vs Main).
- **Performance:** Drastically lower RAM usage compared to Electron, critical for a tool that runs alongside an IDE.
- **Complexity:** Requires developers to be familiar with both Rust and React.
- **Stability:** Tauri v2 provides the latest desktop APIs and a more robust plugin system.
