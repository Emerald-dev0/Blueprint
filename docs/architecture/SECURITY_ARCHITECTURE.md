# Blueprint Security Architecture & Trust Model

## 1. Security Principles
Blueprint is built on a "Trust, but Verify" foundation where security is the primary enabler of developer productivity.

- **Privacy by Default:** 100% of the project indexing and architectural analysis remains on the user's machine. Data only leaves the machine when explicitly requested for AI processing.
- **Least Privilege:** Blueprint operates within a strictly defined "Project Boundary." Access to the wider OS or sensitive user folders requires explicit OS-level permission.
- **Local-First Security:** We prioritize local computation (secret scanning, code parsing) over cloud-based analysis to minimize the attack surface.
- **Transparency:** Every AI interaction, file change, and network request is logged and visible to the user.
- **User Control:** Blueprint never executes a write operation (File Edit, Git Push, Shell Command) without an explicit user "Consent Seal."

---

## 2. Threat Model (STRIDE)

| Threat Category | Potential Attack | Blueprint Mitigation Strategy |
| :--- | :--- | :--- |
| **Spoofing** | Malicious plugin impersonating a core AI provider. | Cryptographic plugin signing and strict capability-based manifests. |
| **Tampering** | Modification of the local `Project Brain` or ADR history. | Authenticated encryption for SQLite/LanceDB files. |
| **Repudiation** | Denying that an AI agent pushed malicious code. | Immutable audit logs linked to specific user approval timestamps. |
| **Information Disclosure** | Leakage of `.env` secrets or PII to a remote LLM. | Pre-flight Local Redaction Engine (Regex + Entropy based). |
| **Denial of Service** | "Zip Bomb" or 100GB repo crashing the indexer. | Strict file-size limits (default 2MB for parsing) and resource-capping. |
| **Elevation of Privilege** | Plugin escaping the Wasm sandbox to access SSH keys. | Wasm runtime isolation with zero access to the host `std` library. |

---

## 3. Asset Identification & Protection

| Asset | Value | Risk | Protection Strategy |
| :--- | :--- | :--- | :--- |
| **Source Code** | Critical (IP) | IP Theft / Leakage | Scoped FS access; Redaction before cloud transit. |
| **API Keys** | Critical (Financial) | Unauthorized Billing | System Keychain (Hardware-backed Secure Enclave). |
| **GitHub Tokens** | High (Access) | Repo Tampering | Scoped OAuth; Tokens never stored in plaintext. |
| **Memory DB** | Medium (Context) | Knowledge Leakage | Local-only storage; AES-256 at-rest encryption. |
| **Audit Logs** | Medium (Trace) | Log Tampering | Append-only files; separate from project workspace. |
| **Plugin Data** | Low/Medium | Data Theft | Sandbox isolation; restricted IPC access. |

---

## 4. Desktop Security Architecture

### The Bicameral Model (Tauri)
- **Renderer (Next.js):** Zero node-integration. Isolated from the OS. Communicates exclusively via a strictly typed IPC bridge.
- **Backend (Rust):** The privilege-heavy layer. Handles FS access, networking, and secrets.
- **IPC Security:** Every command is validated against a "Command Permission List." No generic `eval` or `exec` commands are exposed to the UI.

### File System Security
- **Project Boundary:** Blueprint "locks" itself into the project root.
- **Symlink Protection:** PIE (Project Intelligence Engine) follows symlinks only if they point back inside the project root to prevent path traversal.
- **Sensitive Directories:** `node_modules`, `.git`, `.idea`, and `.vscode` are ignored by default for AI context.

---

## 5. AI Security & Action Permission System (AAPS)

### Prompt Injection Defense
- **Instruction Isolation:** System instructions are injected at the API level, separate from user-provided file content.
- **The "README" Sandbox:** Files known to contain untrusted data (like READMEs or issues) are wrapped in XML tags that the system prompt identifies as "untrusted data."

### AI Autonomy Levels
Blueprint uses a strict hierarchy of permissions:
- **L0 (Reader):** Can index and analyze code locally. (Default)
- **L1 (Suggester):** Can propose changes in the UI. (Default)
- **L2 (Creator):** Can create new files. (**Approval Required**)
- **L3 (Editor):** Can modify existing files. (**Approval Required**)
- **L4 (Commander):** Can execute shell commands (e.g., `npm test`). (**High-Alert Approval**)
- **L5 (Pusher):** Can push to remote Git repositories. (**High-Alert Approval**)

---

## 6. Secrets & Key Management

### Secure Storage
- **macOS:** Keychain Services.
- **Windows:** Data Protection API (DPAPI).
- **Linux:** Secret Service API (libsecret).
- **Fallback:** If no system vault exists, keys are stored in a local encrypted vault with a user-provided passphrase.

### Secret Scanning (Local)
Before any text is sent to a provider, it passes through the **Redaction Layer**:
- **Automatic:** Detects `.env` files, `.pem` keys, and `config.json` patterns.
- **Redaction:** Replaces `sk_live_...` with `[REDACTED_API_KEY]`.

---

## 7. Plugin Security (The Sandbox)
Third-party extensions run in a **WebAssembly (Wasm)** sandbox.
- **No System Access:** Plugins cannot access the network or filesystem directly.
- **Capability-Based:** Plugins must request `capabilities` (e.g., `git:status`, `ai:summarize`) in their manifest.
- **Verification:** Only plugins with a valid Blueprint Developer Signature can be installed in "Production Mode."

---

## 8. Logging & Auditing
Blueprint maintains a security audit log at `~/.blueprint/logs/security.log`.
- **Logged:** Authentication events, Permission grants (L2-L5), Model switches, Plugin installs.
- **Never Logged:** API keys, User source code, AI response content (stored in Project Memory instead), PII.

---

## 9. Secure Update System
- **Signed Releases:** All binaries are signed with a trusted developer certificate.
- **Verification:** The update engine checks the cryptographic signature of the downloaded patch before execution.
- **Safe Rollback:** A snapshot of the previous version is kept for 24 hours to allow one-click rollback if an update is unstable.

---

## 10. Compliance & Enterprise Readiness
- **GDPR:** Local-first by design. No personal data is stored on Blueprint servers (none exist).
- **SOC2 Ready:** Every administrative action (permission change) is logged.
- **Enterprise Proxy:** Support for corporate MITM proxies with custom CA certificate injection for secure AI communication.

---

## 11. Edge Case Handling

| Edge Case | Solution |
| :--- | :--- |
| **Malicious Repo Import** | Blueprint starts in "Restricted Mode" (L0 only) until explicitly trusted. |
| **Unsafe AI Command** | L4 commands are executed in a temporary sub-shell with limited permissions. |
| **AI Key Leak** | Integrated "Panic Button" to rotate/invalidate all stored keys. |
| **DB Corruption** | SQLite WAL mode + weekly automated snapshots to `~/.blueprint/backups`. |
| **Confidential Code** | Users can define `.blueprintignore` to strictly prevent specific files from ever touching the AI layer. |

---

## 12. Security Checklist
- [ ] Tauri `allowlist` minimized to essential APIs.
- [ ] CSP enforced in the WebView.
- [ ] Hardware-backed keychain integration verified.
- [ ] Local Redaction Engine tested against 100+ secret patterns.
- [ ] Wasm runtime updated to latest security patch.

---
*Blueprint Security Architecture — Version 2.0 (Master).*
