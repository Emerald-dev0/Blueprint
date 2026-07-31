# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo foundation with pnpm and Turborepo.
- Comprehensive engineering documentation (Founding Charter, Architecture, Design System, Implementation Roadmap).
- Repository standards (Conventional Commits, Branching Strategy, CI/CD design).
- GitHub Issue and PR templates.

### Changed
- Standardized the toolchain on `pnpm@11` (workspace config, overrides, audit settings).
- Verified `lint`, `typecheck`, `test`, `build`, and Rust checks across all workspaces.
- Repaired the desktop Rust build and wired missing Tauri commands.
- Updated roadmap and contributing documentation to reflect current project state.
- Added MIT License.

### Security
- Remediated npm advisories via pnpm overrides (`sharp`, `postcss`); allowlisted an unpatched dev-only advisory (`GHSA-mh99-v99m-4gvg`).
- Zero cargo audit vulnerabilities (informational warnings only).
