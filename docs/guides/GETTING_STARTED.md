# Getting Started with Blueprint

Welcome to the command center. This guide covers setting up Blueprint for
development on **Windows, Linux and macOS**, and packaging it for distribution.

## 1. System Requirements

- **OS:** Windows 10/11, any glibc-based Linux distribution (Ubuntu 22.04+,
  Debian 12+, Fedora 38+), or macOS 12+.
- **Node.js:** v22 or higher (the repository is developed and CI-tested on 22).
- **pnpm:** v11 (`corepack enable pnpm` or `npm i -g pnpm@11`).
- **Rust:** latest stable, via [rustup](https://rustup.rs).

### Linux build dependencies

Tauri v2 needs WebKitGTK 4.1 and GTK3 headers, plus OpenSSL headers for the
HTTP client:

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev libssl-dev pkg-config build-essential file

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
  librsvg2-devel openssl-devel pkg-config gcc-c++
```

### Linux runtime note (credentials)

API keys are stored in the OS credential store. On Linux that is the freedesktop
**Secret Service**, so a provider such as `gnome-keyring`, KeePassXC or a
KWallet compatibility layer must be running. Desktop sessions ship one; minimal
containers usually do not, and saving a key there will report a clear error
rather than silently failing.

### Windows build dependencies

Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
and [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled
on Windows 11 and recent Windows 10). NSIS/MSI tooling is downloaded automatically
by the Tauri CLI on first bundle.

## 2. Environment Setup

### Clone the repository

```bash
git clone https://github.com/Emerald-dev0/Blueprint.git
cd Blueprint
```

### Install dependencies

```bash
pnpm install
```

## 3. Running in development

The renderer and the Rust core are two processes:

```bash
# 1. Start the Next.js renderer (serves http://localhost:3000)
pnpm --filter blueprint-desktop dev

# 2. In a second terminal, start the Tauri shell (compiles Rust, opens the window)
pnpm --filter blueprint-desktop tauri:dev
```

`pnpm dev` at the repository root starts **only the renderer in a browser**; it
does not open a Tauri window. Use `tauri:dev` for the desktop app.

The renderer is also viewable in a plain browser at `http://localhost:3000` for
UI work; every Tauri command degrades to a visible error there because there is
no Rust backend.

## 4. Connecting AI providers

1. Open the desktop app (`tauri:dev`).
2. Navigate to **Settings → AI Providers**.
3. Paste a key for Gemini, Anthropic or OpenAI. The key is written to the OS
   credential store (Windows Credential Manager / macOS Keychain / Secret
   Service) and never to disk in plaintext.
4. For fully offline analysis, run [Ollama](https://ollama.com) locally
   (`ollama serve && ollama pull llama3`); it is exposed as the `ollama`
   provider and needs **no API key** — the credential store is not consulted for
   it.
5. You do not have to configure the provider the router prefers. Reasoning tasks
   prefer Anthropic, but if no Anthropic key is stored Blueprint falls back to a
   provider you did configure (then to local Ollama) and records the substitution
   in the session panel and the audit log.

## 5. Your first project

1. Open **Intelligence** in the navigation rail.
2. Click **Import Local Directory** and choose a repository in the native
   picker.
3. Blueprint walks it locally (respecting `.gitignore`) and reports the
   languages, frameworks and data stores it found — nothing is uploaded.
4. Open **Memory** to seal your first ADR; it persists to the local SQLite
   brain in your per-user data directory.

## 6. Talking to a persona

Blueprint ships 24 persona operating manuals in `packages/personas` (see the
[registry README](../../packages/personas/README.md) for the file contract).

1. Open **Agent OS** (`/ai/aos`) to see what the registry actually loaded:
   identity, mission, labels, parsed responsibilities and framework steps per
   persona. If a directory is broken it is skipped and named in the log
   (`RUST_LOG=debug`), not silently dropped.
2. Open **AI Teammate** (`/ai`), pick a persona in the right-hand list — for
   example Principal Engineer — and send your goal.
3. The Rust core compiles that persona's manual into the system prompt: identity
   and mission, capabilities, core responsibilities, the verbatim operating
   manual, the thinking framework, its quality checklist and output format, plus
   live git state, the open project root and the last eight turns of the
   conversation. Secrets are redacted locally before anything is sent.
4. The header badge shows which model actually answered, and the session log
   shows the persona, provider, model and redaction count for every run.
5. Edited a manual? Click **Reload** on the Agent OS page — no restart needed.

## 7. Exporting context to other agents

Your other tools (OpenCode, Codex CLI, Claude Code, Gemini CLI, Amp, Cursor,
Zed) do not read Blueprint's database. They read markdown at the repository root.

1. Open **Intelligence** and click **Export agent context**.
2. Blueprint writes:
   - `AGENTS.md` — the full generated context: repository facts and detected
     stack, the commands actually declared in the repo (`package.json` scripts
     with the right package manager, `make` targets), your recorded ADRs, sealed
     knowledge, the persona standards table, and Always / Ask-first / Never
     boundaries;
   - `CLAUDE.md`, `GEMINI.md` and `knowledge.md` — short pointers that tell the
     agent to read `AGENTS.md` (and import it, for tools that parse `@` imports).
     `knowledge.md` exists because Freebuff and Codebuff look for that filename
     before they look for `AGENTS.md`.
3. The result panel lists what was written and how many bytes, what was skipped
   and why, and how many secret-looking spans were redacted before writing.
4. A file Blueprint did not generate is **never overwritten** — it is reported as
   skipped. Remove or rename it if you want Blueprint to own it.
5. Commit `AGENTS.md` if you want the team (and every agent) to share it. It is
   regenerated wholesale, so re-export rather than editing it by hand.

Rationale and trade-offs: [ADR 0003](../adr/0003-agent-interop-through-agents-md.md).

## 8. Packaging installers

```bash
# From apps/desktop; produces the bundles for the current OS
pnpm exec tauri build
```

| OS      | Outputs                       |
| ------- | ----------------------------- |
| Linux   | `.deb`, `.rpm`, `.AppImage`   |
| Windows | NSIS `.exe` installer, `.msi` |
| macOS   | `.app`, `.dmg`                |

`.github/workflows/desktop.yml` builds all three and uploads the artifacts. It
runs on pushes to `main`, on manual dispatch, and on a pull request only when the
`build:bundles` label is applied - three cold Rust compiles per run is too slow
for ordinary PR feedback, which `ci.yml` covers by compiling and linting the
crate graph instead.

## 9. Useful environment variables

| Variable                 | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `BLUEPRINT_PERSONAS_DIR` | Override where persona operating manuals are read from |
| `OLLAMA_HOST`            | Point the local-model provider at another host/port    |
| `RUST_LOG`               | Diagnostic log level (e.g. `RUST_LOG=debug`)           |

---

## 📖 Next Steps

- Read the [Contributing Guide](CONTRIBUTING_GUIDE.md).
- Explore the [Architecture Overview](../../ARCHITECTURE.md).
- Browse the [persona registry](../../packages/personas/README.md) and add a
  persona for the role your team keeps re-explaining.
- Read the [strategic assessment](../product/STRATEGIC_ASSESSMENT.md) if you want
  to know what Blueprint is deliberately _not_ trying to be.
