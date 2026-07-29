# Blueprint Design System: The Visual Operating System

## 1. Brand Foundation

### Brand Personality
If Blueprint was a person, they would be a **Principal Architect**.
- **How they dress:** Tailored, functional, high-quality basics. No logos, just perfect fit and material.
- **How they work:** Methodical, quiet, and decisive. They listen more than they speak.
- **How they communicate:** Precise. They use the exact word required. They don't use "synergy" or "empower."

### Voice & Tone
- **Voice:** Declarative, calm, and technical. 
- **Tone:** Professional but assistive. Not "friendly" in a bubbly way, but "reliable" like a specialized tool.

---

## 2. Color System: "Ink & Mint"

The color system is designed for prolonged focus and high legibility in a professional engineering environment.

### Primary Identity
| Name | Hex | Purpose |
| :--- | :--- | :--- |
| **Ink** | `#0B0B0B` | Deepest foundation. Primary background in Dark Mode. |
| **Mint** | `#00FF9D` | High-energy accent. Action states, active indicators. |
| **Slate** | `#1A1A1A` | Elevated surfaces, secondary backgrounds. |
| **Frost** | `#F5F5F5` | Primary Light Mode background. |

### Semantic System
- **Success:** `#10B981` (Emerald) - Approved plans, merged states.
- **Warning:** `#F59E0B` (Amber) - Architectural drift, missing context.
- **Error:** `#EF4444` (Rose) - Failed scans, invalid security rules.
- **Info:** `#3B82F6` (Blue) - System messages, sync status.

### Surface Hierarchy (Dark Mode)
- **Level 0 (Floor):** `#0B0B0B` (Application background)
- **Level 1 (Panel):** `#141414` (Sidebars, navigation rails)
- **Level 2 (Surface):** `#1E1E1E` (Command bar, modals, active cards)
- **Level 3 (Pop-over):** `#262626` (Tooltips, dropdowns)

### Border System
- **Default:** `rgba(255, 255, 255, 0.08)`
- **Strong:** `rgba(255, 255, 255, 0.15)`
- **Focus:** `#00FF9D` (The Mint accent)

---

## 3. Typography System

We prioritize high-performance legibility and technical precision.

### Typeface Selection
- **UI & Display:** **Inter** (Variable). Chosen for its clarity and neutral professional personality.
- **Technical & Data:** **JetBrains Mono**. Chosen for its excellent readability in code and terminal contexts.

### Typography Scale
| Role | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 48px | 900 | 1.1 | -0.04em |
| **Heading 1** | 32px | 700 | 1.2 | -0.02em |
| **Heading 2** | 24px | 600 | 1.3 | -0.01em |
| **Body (Default)**| 14px | 400 | 1.6 | 0 |
| **Caption** | 12px | 500 | 1.4 | 0.02em |
| **Code (UI)** | 13px | 400 | 1.5 | 0 |

---

## 4. Spacing System
Blueprint uses a strict 4px grid system. No arbitrary values.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `space-1` | 4px | Icon/Text gaps, tight micro-spacing. |
| `space-2` | 8px | Component internal padding (small). |
| `space-3` | 12px | Standard component padding. |
| `space-4` | 16px | Section gaps, container padding. |
| `space-8` | 32px | Large layout gutters. |
| `space-16` | 64px | Hero section spacing. |

---

## 5. Layout & Radius

### Layout Principles
- **Command Bar Center:** The `Cmd+K` palette is the focal point.
- **Wing Panels:** Sidebars are limited to 240px (Nav) or 320px (Context).
- **Responsive Behavior:** Below 1024px, "Wings" collapse into overlays.

### Radius Tokens
- **Small (2px):** Checkboxes, tight UI inputs.
- **Medium (6px):** Standard buttons, small cards.
- **Large (12px):** The Command Bar, large panels, modals.
- **Pill (999px):** Status badges, toggle tracks.

---

## 6. Elevation & Shadows

We use depth to communicate hierarchy, not just decoration.
- **Level 0:** Flat. No shadow. (Main workspace)
- **Level 1:** `0 2px 4px rgba(0,0,0,0.1)`. (Side panels)
- **Level 2:** `0 8px 16px rgba(0,0,0,0.2)`. (Modals, Command Bar)
- **Level 3:** `0 24px 48px rgba(0,0,0,0.4)`. (Floating alerts, high-priority dialogs)

---

## 7. Iconography
- **Style:** Linear / Outlined. **Lucide** or **React Icons (Pi)**.
- **Stroke:** 1.5px to 2px.
- **Size:** Consistent 16px or 20px grid.
- **Rules:** Never use colored icons unless semantic (Success/Error). Use monochromatic Ink/Slate icons for navigation.

---

## 8. Motion System

### Duration Tokens
- **Fast:** 150ms (Hover, scale clicks)
- **Normal:** 250ms (Panel slides, page transitions)
- **Slow:** 400ms (Major layout shifts, deep AI analysis animations)

### Easing
- **Standard:** `cubic-bezier(0.4, 0, 0.2, 1)`
- **Entrance:** `cubic-bezier(0, 0, 0.2, 1)` (Decelerate)
- **Exit:** `cubic-bezier(0.4, 0, 1, 1)` (Accelerate)

---

## 9. AI UI Patterns (The Intent Surface)

### The Proposal Surface
AI suggestions are never in a chat bubble. They are presented as a **Proposal Document**.
- **Border:** A subtle "Mint" glow when active.
- **Background:** Slate-2 (`#1E1E1E`).
- **Interaction:** Every line is editable by the user. "Ghost text" shows the AI's proposed completion.

### The Execution Progress
- **The Scan:** Instead of a generic spinner, show monospaced "log lines" of the files being indexed.
- **The Build:** Use a "progress segment" bar that fills with Mint as agents complete sub-tasks.

---

## 10. Code & Data Visualization

### Code Changes (Diffs)
- **Additions:** Mint background (`rgba(0, 255, 157, 0.1)`).
- **Deletions:** Rose background (`rgba(239, 68, 68, 0.1)`).
- **Line Numbers:** Dimmed Slate.

### Architecture Maps
- **Nodes:** Simple rectangles with 2px radius.
- **Connectors:** 1px solid lines.
- **Intelligence:** Highlighted "hot paths" where logic is most complex.

---

## 11. Accessibility System
- **Focus State:** 2px solid Mint (`#00FF9D`) with 2px offset.
- **Contrast:** Minimum 4.5:1 for all text.
- **Navigation:** Full `Tab` and `Cmd+K` support. "Skip to Content" links hidden until focused.

---

## 12. Blueprint Anti-Slop Rules
1. **No Gradients:** Colors must be flat and intentional.
2. **No Glassmorphism:** Transparency is for overlays, not for core UI surfaces.
3. **No "Magic" Buttons:** Every button must have a clear, declarative label.
4. **No Chat Bubbles:** AI is a collaborator in the document, not a chatbot in a window.
5. **No Meaningless Stats:** If a number doesn't help a developer make a decision, delete it.
6. **No Random Spacing:** Use the token grid or don't use the space.

---
*Blueprint Design System — Prepared for Implementation.*
