# Blueprint Project Intelligence Engine

## 1. Executive Summary
The Project Intelligence Engine (PIE) is the "Senses" of Blueprint. It allows the system to reverse-engineer websites, analyze complex repositories, and ingest documents to build a unified **Project Understanding Model**. It is designed to bridge the gap between "Looking at code" and "Understanding the project."

---

## 2. Website Intelligence Engine
PIE can deconstruct any website into its core engineering components.

### Extraction Pipeline
- **Structure:** Parses DOM hierarchy to identify semantic patterns (Headers, Footers, Bento grids, Navigation).
- **Visuals:** Viewport screenshots at 360/768/1440px to analyze responsiveness and layout shifts.
- **Tech Detection:** Fingerprints libraries (React, Next.js, Framer Motion, GSAP) via script tags and CSS classes.
- **Asset Collection:** Extracts SVGs, Font paths, and high-res images with context of where they are used.

### CSS Deconstruction
PIE extracts a **Foundational Design System** from any URL:
- **Palette:** Identifies primary, secondary, and background colors via frequency analysis.
- **Typography:** Maps font families, sizes, and line-heights to a hierarchy (H1-H6, Body).
- **Tokens:** Suggests spacing, radius, and shadow tokens based on observed patterns.

---

## 3. Repository Intelligence Engine
PIE performs deep structural analysis of local or remote codebases.

### Cross-Language Parsing (Tree-sitter)
- Supports TS, Python, Go, Rust, and Java.
- **Logic Mapping:** Identifies core business logic (Services, Models) vs. boilerplate (Configs, Tests).
- **Dependency Graph:** Visualizes how modules interact and identifies "Hot Paths" (highly coupled modules).

### Technical Health Audit
- **Debt Detection:** Flags "Todo" comments, circular dependencies, and overly complex functions.
- **Security Scan:** Local scan for hardcoded secrets and known vulnerable patterns.
- **Architecture Validation:** Checks if the project follows its stated architecture (e.g., "Is UI logic leaking into the DB layer?").

---

## 4. Document & Asset Intelligence
- **Document Parser:** Extracts requirements and technical constraints from PDFs, Markdown, and Word docs.
- **Asset Classifier:** Automatically tags images as "Hero," "Icon," "Logo," or "Placeholder."
- **OCR Integration:** Extracts text from UI screenshots or diagrams to understand intended flows.

---

## 5. The AI Analysis Pipeline: From Extraction to Understanding

1. **Raw Input:** URL, Folder, or File upload.
2. **Extraction Layer:** Local tools (Puppeteer, Tree-sitter, OCR) extract raw data.
3. **Filtering & Contextualization:** Raw data is pruned to fit context windows; relevant snippets are prioritized.
4. **AI Interpretation:** Specialized agents analyze the data to find patterns and constraints.
5. **Synthesis:** Generates a **Project Understanding Model (PUM)**.

---

## 6. The Project Understanding Model (PUM)
The final output of PIE is a structured JSON/Markdown representation of the project's soul:
- **Project Intent:** Why does this exist?
- **Technical Stack:** How is it built?
- **Design Language:** How does it look and move?
- **Architecture:** What is the system structure?
- **Constraints:** What are the non-negotiables?
- **Risks:** Where will it likely break?

---

## 7. Storage & Search Architecture
- **Metadata Index:** SQLite stores file relationships and asset metadata.
- **Semantic Index:** LanceDB stores vector embeddings of extracted knowledge.
- **Cache Layer:** Extracted assets (images/fonts) are stored locally in a project-specific cache for instant previewing.

---

## 8. Ethical & Security Guardrails
- **Robots.txt Respect:** PIE honors scraping rules for public URLs.
- **Local-First:** All repository scanning stays on the machine.
- **No Scraping PII:** PIE is tuned to ignore user data and focus exclusively on engineering and design patterns.
- **Copyright Awareness:** Warns users when extracting proprietary assets for reference.

---
*Blueprint Project Intelligence Engine — Finalized.*
