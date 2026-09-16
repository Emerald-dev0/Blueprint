# Strategic Assessment: is the idea valid, and what to do about it

- **Date:** 2026-09-15
- **Author:** engineering audit (see `docs/adr/0002` for the technical record)

## Verdict

**The problem is real and the idea is valid. The execution plan was not.**

The pain Blueprint names — engineering context scattered across Notion/Figma/IDE/chat,
decisions forgotten, AI answers ungrounded in *your* architecture — is genuine and
under-served. "Owning the *why* (ADRs) where competitors own the *what* (code)" is a
defensible wedge: Cursor, Copilot and Claude Code all forget between sessions, and
none of them treat architectural memory as the product.

What is **not** valid is the v1 scope. The specification attempted, simultaneously:
multi-agent orchestration, a Wasm plugin sandbox, a plugin marketplace, website
reverse-engineering, global project memory, semantic vector search, deep GitHub
integration, and a full design system — before any one of them worked. The repository
at audit contained ~5,200 lines of code against ~3,300 lines of documentation and a
production-readiness checklist that checked boxes with no implementation behind them.
That ratio is the disease: the project was being *described* faster than it was being
*built*.

## The three strategic errors

1. **Scope without a wedge.** Every listed capability competed for the same scarce
   resource (engineering time), so none reached usable quality. A developer who can
   get 80% of the value from Cursor with zero documentation effort will not adopt a
   tool whose core loop requires discipline it does not yet reward.
2. **Claiming ahead of building.** Placeholder providers, hard-coded dashboards
   ("1,240 orchestrations", "48 redactions"), a fabricated fallback ADR, an unbranded
   icon, and a "final review" attributed to a fictional panel of big-tech engineers.
   Each individually is small; together they mean nobody could trust any number or
   badge in the product — including the true ones. For a product whose pitch is
   *trustworthy institutional memory*, that is fatal.
3. **Shipping nothing to anyone.** The desktop app had never been packaged on any
   OS. A desktop product with no installer has no users, no feedback, and no way to
   discover that its premises are wrong.

## What to do about it

### Cut to the wedge (do less, finish it)

Ship exactly one loop, end to end, on all three desktop OSes:

1. **Open a repository** (native picker) → local scan shows what Blueprint understood.
2. **Ask the AI teammate**, grounded in that scan plus sealed ADRs, with secrets
   redacted locally and the redaction count shown.
3. **Seal an ADR** from the answer → it persists and changes the next answer.

That loop is now *implemented* (see ROADMAP). Everything else — multi-agent graphs,
marketplace, Wasm sandbox, website intelligence, GitHub PR sync — stays in the
backlog until the loop has real users. The repository's own synthetic review said
this in 2026-07 and was ignored; this assessment repeats it with the force of an
audit behind it.

### Make truth a build gate

- No UI counter may be a constant; counters come from measured events (done for
  redactions; the pattern is the standard).
- `PRODUCTION_READY.md` checkboxes require a CI job or test name (done).
- Documentation claims are code claims: the README no longer advertises Tree-sitter
  (done), and CI now fails if the renderer cannot be exported offline (done).

### Get the installer into hands

- Cross-platform bundling is configured and CI-built for Windows (NSIS/MSI), Linux
  (deb/rpm/AppImage) and macOS (done; see `desktop.yml`).
- Sign and notarize before wide distribution (roadmap).
- Instrument activation: does a new user complete the three-step loop in under five
  minutes? That single metric decides whether the wedge is real. The synthetic
  review's "friction killer" warning is the correct risk to measure.

### If the wedge fails

The honest fallbacks, in order:
1. **CLI-first Blueprint** (`blueprint seal`, `blueprint ask`) that writes ADRs into
   the repo and plugs into the editors people already use — same memory asset, no
   new surface to adopt. The ADR file format is the portable moat.
2. **VS Code extension** that surfaces the brain inside the editor, rather than a
   second window competing for attention (the review's "tab they forgot to check"
   risk).
3. Retire the desktop shell and keep the memory/format spec as the product.

Each fallback preserves the defensible asset (structured architectural memory) while
dropping the expensive one (a cross-platform desktop application).

## What changed as a result of this assessment

- Desktop packaging made real and CI-verified on Windows/Linux/macOS (ADR 0002).
- All fabricated UI data removed; providers, git and redaction made real.
- Documentation, roadmap and readiness checklist rewritten to state only what exists.
- Scope explicitly deferred in ROADMAP with reasons, not silently dropped.
