# Getting Started with Blueprint

Welcome to the command center. This guide will help you set up Blueprint for development and connect your first project.

## 1. System Requirements

- **OS:** macOS (Intel/M1/M2), Windows 10/11, or Linux.
- **Node.js:** v20.0.0 or higher.
- **pnpm:** v9.0.0 or higher.
- **Rust:** Latest stable version (via `rustup`).

## 2. Environment Setup

### Clone the Repository
```bash
git clone https://github.com/blueprint/blueprint.git
cd blueprint
```

### Install Dependencies
```bash
pnpm install
```

## 3. Connecting AI Providers

Blueprint requires an AI provider for high-level reasoning. We recommend **Google Gemini** or **Anthropic Claude**.

1. Open Blueprint (see Development below).
2. Navigate to `Settings` -> `AI Providers`.
3. Enter your API Key. Your key is stored securely in your system's keychain.

## 4. Development

To run Blueprint in development mode (with hot-reloading for both Rust and React):

```bash
pnpm dev
```

This will launch the Tauri window.

## 5. Your First Project

1. Click **"Import Repository"** on the home screen.
2. Select your project folder.
3. Wait for the **"Initial Handshake"** (Indexing).
4. Try asking Blueprint: *"Explain the core architecture of this project."*

---

## 📖 Next Steps
- Read the [Contributing Guide](CONTRIBUTING_GUIDE.md).
- Explore the [Architecture Overview](../../ARCHITECTURE.md).
