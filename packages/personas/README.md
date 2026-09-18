# Blueprint Persona Registry

The operating manuals that drive Blueprint's AI teammates. Each persona is a
directory of plain markdown and JSON — no build step, no database, no
proprietary format — which the Rust core loads at startup and compiles into a
system prompt on demand.

**24 personas**, each with all three files.

## What a persona actually does

A persona is not a role name and a vibe. When you send a goal to a persona,
`PromptCompiler` builds the system prompt from that persona's files:

| Prompt section             | Source                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `IDENTITY`, `MISSION`      | `persona.json` → `identity`, `mission`                          |
| `EXPERTISE & CAPABILITIES` | `persona.json` → `capabilities`                                 |
| `CORE RESPONSIBILITIES`    | `instructions.md` → `## CORE RESPONSIBILITIES` numbered items   |
| `OPERATING MANUAL`         | `instructions.md`, verbatim (capped at 8 000 chars)             |
| `THINKING FRAMEWORK`       | `thinking-framework.md` → `## STEP` headings and their bullets  |
| `QUALITY STANDARDS`        | `instructions.md` → `## QUALITY CHECKLIST` items                |
| `OUTPUT FORMAT`            | `instructions.md` → `- **Format**:` under `## OUTPUT STANDARDS` |
| `PROJECT CONTEXT`          | live: git state, open project path, conversation history        |

Then the whole prompt passes through the local secret redactor before it leaves
the machine.

## File contract

```text
<persona-id>/
├── persona.json            # required — identity, mission, capabilities, labels
├── instructions.md         # the operating manual (behaviour contract)
└── thinking-framework.md   # numbered reasoning steps + their probing questions
```

**`persona.json`** — `id` must equal the directory name:

```json
{
  "id": "site-reliability-engineer",
  "name": "Site Reliability Engineer",
  "identity": "Guardian of uptime and the person who wakes up at 3am…",
  "mission": "Make the system observable, resilient and boring to operate…",
  "version": "1.0.0",
  "capabilities": ["slo_design", "observability", "incident_response"],
  "labels": ["sre", "reliability", "observability"],
  "tools": []
}
```

`tools` is optional; omit it unless the persona is meant to request named tools.

**`instructions.md`** — house structure, one level-1 heading then these level-2
sections:

```text
# <ROLE> OPERATING MANUAL (v1.0.0)
## IDENTITY            ## MISSION             ## CORE RESPONSIBILITIES
## KNOWLEDGE DOMAINS   ## DECISION FRAMEWORK  ## THINKING PROCESS
## FAILURE MODES       ## OUTPUT STANDARDS    ## QUALITY CHECKLIST
```

Two of those sections are parsed, not just read:

- `## CORE RESPONSIBILITIES` — numbered items (`1. **Name**: detail`).
- `## OUTPUT STANDARDS` — must include `- **Format**: …`, `- **Tone**: …`,
  `- **Requirements**: …`.
- `## QUALITY CHECKLIST` — `- [ ] question` items.

**`thinking-framework.md`** — steps and their probing questions:

```markdown
## STEP 1: CONTRACT FIRST

- What is the exact output schema, and who consumes it?
- Which fields may be null, and what does null mean?

## STEP 2: FAILURE ENUMERATION

- For each hop, what happens on timeout or duplicate delivery?
```

The loader keeps the hierarchy: `## STEP` lines become step headers, `- ` lines
become their sub-questions, and the renderer groups them again for display.

## Catalogue

| Persona                   | Id                          | Labels                             | Manual | Framework |
| ------------------------- | --------------------------- | ---------------------------------- | :----: | :-------: |
| Accessibility Engineer    | `accessibility-engineer`    | a11y, inclusive, standards         |  yes   |    yes    |
| API Designer              | `api-designer`              | api, contract, integration         |  yes   |    yes    |
| Backend Engineer          | `backend-engineer`          | backend, apis, services            |  yes   |    yes    |
| Data Engineer             | `data-engineer`             | data, pipelines, etl               |  yes   |    yes    |
| Database Engineer         | `database-engineer`         | data, performance, backend         |  yes   |    yes    |
| DevOps Engineer           | `devops-engineer`           | infra, automation, reliability     |  yes   |    yes    |
| Documentation Specialist  | `documentation-specialist`  | docs, knowledge, structure         |  yes   |    yes    |
| Engineering Manager       | `engineering-manager`       | management, delivery, planning     |  yes   |    yes    |
| Frontend Engineer         | `frontend-engineer`         | frontend, ui, react                |  yes   |    yes    |
| Machine Learning Engineer | `machine-learning-engineer` | ml, llm, evals                     |  yes   |    yes    |
| Mobile Engineer           | `mobile-engineer`           | mobile, ios, android               |  yes   |    yes    |
| Performance Engineer      | `performance-engineer`      | performance, speed, optimization   |  yes   |    yes    |
| Platform Engineer         | `platform-engineer`         | platform, devex, cicd              |  yes   |    yes    |
| Principal Engineer        | `principal-engineer`        | lead, review, standards            |  yes   |    yes    |
| Product Manager           | `product-manager`           | product, strategy, requirements    |  yes   |    yes    |
| QA Engineer               | `qa-engineer`               | quality, testing, assurance        |  yes   |    yes    |
| Reference Analyst         | `reference-analyst`         | research, analysis, deconstruction |  yes   |    yes    |
| Security Engineer         | `security-engineer`         | security, safety, adversarial      |  yes   |    yes    |
| Site Reliability Engineer | `site-reliability-engineer` | sre, reliability, observability    |  yes   |    yes    |
| Software Architect        | `software-architect`        | senior, strategy, design           |  yes   |    yes    |
| System Designer           | `system-designer`           | system, macro, protocol            |  yes   |    yes    |
| Technical Writer          | `technical-writer`          | writing, clarity, onboarding       |  yes   |    yes    |
| UI Designer               | `ui-designer`               | design, ui, visual                 |  yes   |    yes    |
| UX Designer               | `ux-designer`               | design, ux, usability              |  yes   |    yes    |

## Loading, resolution and hot reload

The registry directory is resolved in this order (first hit wins):

1. `$BLUEPRINT_PERSONAS_DIR` — explicit override for development and CI.
2. `<resource_dir>/personas` — the bundle resource declared in
   `apps/desktop/src-tauri/tauri.conf.json`; this is what an installed app uses.
3. `<ancestor of the executable>/packages/personas` — a monorepo checkout, so
   `cargo run` works from `src-tauri/`, `target/` or the repository root.
4. `packages/personas` relative to the working directory — last resort.

A directory without a usable `persona.json` is **skipped and logged by name**
(it used to be skipped silently, which is how two shipped personas went missing
from the registry). `reload_personas` re-reads the directory at runtime, so
edits to a manual apply without restarting the app — Agent OS → Reload.

## Adding a persona

1. Create `packages/personas/<your-id>/` with the three files above.
2. Keep `id` equal to the directory name and `version` semver.
3. Write behaviour, not adjectives: what the persona is responsible for, how it
   decides, how it fails, and what "done" means.
4. Run `pnpm test` — `tests/unit/personas.test.ts` validates every persona's
   manifest, section structure, checklist and framework headings.
5. Reload the registry in the app (or restart) and pick the persona in AI
   Teammate.

## Where personas are used

- **AI Teammate** (`/ai`) — pick a persona; its manual is compiled into the
  system prompt for every message in the conversation.
- **Agent OS** (`/ai/aos`) — browse the loaded registry: identity, mission,
  labels, responsibilities and framework steps per persona.
- **Workflow planning** — `plan_aos_workflow` assigns tasks to persona ids
  (`product-manager` → `software-architect` → `principal-engineer`).
- **`AGENTS.md` export** — the persona standards are published into the project
  so other coding agents inherit the same expectations. See
  [Agent interoperability](../../README.md#-agent-interoperability).
