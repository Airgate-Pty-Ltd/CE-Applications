# Handoff: HF-ENGINE Intelligence Workspace

## Overview
HF-ENGINE is an organizational learning intelligence system that turns operational evidence into verified learning and performance management. This design shows the primary Intelligence dashboard where Quality Managers review emerging patterns, oversee training revisions, and manage the complete learning lifecycle from event detection through effectiveness measurement.

## About the Design Files
The bundled HTML file (`HF-ENGINE Intelligence Workspace.dc.html`) is a **high-fidelity design reference**. It is **not production code**. Your task is to recreate this design in your codebase (Next.js/React recommended) using your established patterns, connect to your backend API, and implement real data binding.

## Fidelity
**High-fidelity (hifi)** — Pixel-perfect mockup with final colors, typography, spacing, shadows, and interactive states. Recreate the UI exactly as shown.

## Primary Screen: Intelligence Dashboard

### Layout Structure
Grid-based with 4 areas:
- **Command bar** (58px, full width, top)
- **Context rail** (250–340px, left, scrollable)
- **Intelligence canvas** (620–800px, center, scrollable)
- **Workbench** (360–480px, right, scrollable)
- **Lineage footer** (118px, bottom, spans context + canvas)

Grid template: `grid-template-columns: 0.82fr 2.4fr 1.18fr; grid-template-rows: 58px 1fr 118px;`

---

## Design Tokens

### Colors
```
--hf-bg: #07111f (main)
--hf-bg-deep: #04101b
--hf-surface: #0b1726
--hf-surface-2: #0e1d30
--hf-surface-3: #12243a
--hf-border: rgba(150, 180, 220, 0.16)
--hf-border-strong: rgba(150, 190, 235, 0.28)
--hf-text: #eef5ff
--hf-text-soft: #c7d6e8
--hf-text-muted: #8298b2
--hf-evidence: #19c7c0 (teal)
--hf-learning: #8bd66c (green)
--hf-change: #f3a62d (orange)
--hf-training: #489cf6 (blue)
--hf-effectiveness: #75d96d (lime)
--hf-critical: #ff5e55 (red)
--hf-ready: #65d17c (ready green)
--hf-info: #4da4ff (info blue)
```

### Spacing
- Major gap: 24px, Large: 20px, Medium: 12px, Small: 8px
- Standard padding: 12px (panels), 10px (cards), 16px (footer), 18px (rails)

### Typography
- Font family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- H1: 1.35rem, line-height: 1.3
- H2: 1rem
- H3: 0.85rem
- Body: 0.8rem, line-height: 1.5
- Kicker: 0.72rem uppercase, letter-spacing: 0.08em
- Small: 0.75rem, Tiny: 0.7rem

### Border Radius & Shadows
- Small radius: 7px, Medium: 11px, Large: 17px, Round: 50%
- Panel shadow: 0 12px 32px rgba(0, 0, 0, 0.18)
- Glow: 0 0 18px rgba(color, 0.22–0.28)

---

## Section-by-Section Spec

### 1. Command Bar (58px)
**Background:** rgba(4, 15, 28, 0.92) + backdrop-filter: blur(14px)
**Border-bottom:** 1px solid var(--hf-border)
**Display:** Grid with 3 areas (brand | tabs | actions)

**Left (brand):**
- Rotated square icon: 31×31px, border: 1px solid rgba(71, 180, 255, 0.55), transform: rotate(45deg), box-shadow: 0 0 18px rgba(71, 180, 255, 0.12)
- Text: "HF-ENGINE" (1.05rem, letter-spacing: 0.035em), "Organizational Learning. Governed." (0.69rem, muted)

**Center (tabs):**
- Navigation: Intelligence, Review, Recurrent Training, Effectiveness, Knowledge
- Flex, gap: 24px
- Each tab: padding: 19px 2px 17px, font-size: 0.93rem, color: muted by default
- Active tab: color: var(--hf-text), ::after pseudo-element (height: 2px, background: var(--hf-training), box-shadow glow)

**Right (actions):**
- Label "The Organization" (0.9rem)
- Buttons: Search, Notifications, User chip (34×34px, border-radius: 999px, gradient: linear-gradient(135deg, #489cf6, #4da4ff), white text, font-weight: 600)

---

### 2. Context Rail (250–340px, scrollable)

**Intro** (margin-bottom: 28px):
- Kicker: "◆ LIVE SYSTEM" (0.65rem uppercase, var(--hf-training))
- H1: "Good morning,\nQuality Manager" (1.35rem)
- Paragraph: Mission (0.85rem, muted)

**Three Sections** (each 20px margin-bottom):

**A. Requires Attention** (padding: 12px, border: 1px solid var(--hf-border), border-radius: 11px, bg: rgba(14, 29, 48, 0.6))
- Header: "REQUIRES ATTENTION" (0.8rem uppercase) + "3" badge
- 3 clickable rows: title (strong), description (0.75rem muted), label (0.73rem uppercase, var(--hf-training))
- Hover: bg rgba(255,255,255,0.04)

**B. Emerging Patterns** (same structure, 2 rows, h2 color: #c77dff)

**C. Automated Review** (same, div rows with checkmarks, status: Ready/Pending)

---

### 3. Intelligence Canvas (flex column, gap: 12px, scrollable)

**A. Intelligence Strip** (grid: 5 equal columns, gap: 8px)
Five KPI cards (last is action chevron):

| # | Value | Label | Border Color |
|---|-------|-------|---|
| 1 | 3 | Lessons Identified | var(--hf-evidence) |
| 2 | 1 | Revision Awaiting | var(--hf-learning) |
| 3 | 2 | Emerging Patterns | var(--hf-change) |
| 4 | 2027 | Cycle Will Use Rev B | var(--hf-training) |
| 5 | ▶ | (action) | muted |

Each card: padding: 10px, border: 1px, border-radius: 7px, text-align: center, cursor: pointer
- Strong: 1.4rem, margin-bottom: 4px, color: stage color
- Span: 0.7rem, muted

**B. Learning Map** (flex: 1, border: 1px, border-radius: 17px, box-shadow: panel shadow)

**Header:** Kicker + subtitle | Map/List toggle buttons

**SVG (viewBox: 0 0 920 520, flex: 1, min-height: 450px):**

**Gradient flow path** connecting 5 nodes:
- Bezier curve: `M110 255 C 200 205, 220 305, 285 255 S 395 205, 460 255 S 570 305, 635 255 S 745 205, 810 255`
- Stroke: teal → green → orange → blue → lime gradient
- Double-stroked: 6px base (opacity 0.42) + 1.4px accent (opacity 0.95)
- Filter: feGaussianBlur stdDeviation="4"

**Five circular stage nodes** (r: 34, inner circle r: 19):

| Stage | cx | cy | Stroke | Label | Subtitle | Value |
|-------|----|----|--------|-------|----------|-------|
| EVIDENCE | 110 | 255 | #19c7c0 | EVIDENCE | Operational Signals | 18 |
| LESSONS | 285 | 255 | #8bd66c | LESSONS | Validated Insights | 3 |
| CHANGE | 460 | 255 | #f3a62d | CHANGE PROPOSALS | Controlled Updates | 1 |
| TRAINING | 635 | 255 | #489cf6 | TRAINING | Recurrent Delivery | 128 |
| EFFECTIVENESS | 810 | 255 | #75d96d | EFFECTIVENESS | Measured Impact | 2 |

Text positioning: title at y 167, subtitle y 185, value y 327
Font: titles 12px bold 0.055em tracking, subtitles 10px muted, values 18px bold

**Pattern signal:** Dashed red line from (495, 75) to (460, 221) pointing to label box
- Rect at (360, 35) width 150 height 58: "EMERGING PATTERN / Verification errors under…"

**Three info boxes** (below nodes):
- Box 1 (x: 270): "✓ 3 LESSONS IDENTIFIED" + "Ready for proposal consideration" + link
- Box 2 (x: 420): "◆ 1 REVISION AWAITING RELEASE" + "HF-012 Rev B" + "128 learners affected" + link
- Box 3 (x: 570): "✓ INTERVENTION EFFECTIVENESS" + metrics (48% / 79%) + link

---

### 4. Workbench Panel (flex column, scrollable, right sidebar)

**Header** (padding: 12px, border: 1px, border-radius: 11px, bg: rgba(14, 29, 48, 0.6)):
- Kicker: "Change Proposal Review" (0.65rem uppercase, muted)
- H2: "HF-012 Work Instruction: Connector Installation" (1rem)
- Subtext: "Rev A → Rev B" (0.8rem, muted)
- Label: "Major Revision" (0.9rem, #f5b84d)
- Chip: "Awaiting Human Release" (0.7rem uppercase, bg: rgba(243, 166, 45, 0.15), border: rgba(243, 166, 45, 0.3), border-radius: 4px, padding: 4px 8px, margin-top: 8px)

**Tab bar** (flex, gap: 0, border-bottom: 1px):
Tabs: Summary, **Track Changes** (active, blue underline), Impact, Reviews, History

**Body content** (flex: 1, overflow: auto, padding: 12px):

**Diff section 1: "5.2 Installation Steps"**
- Grid: 2 equal columns, gap: 8px
- Each article: border: 1px, border-radius: 11px, bg: rgba(255,255,255,0.018), min-height: 145px
  - Header: "Current (Rev A)" | "Proposed (Rev B)"
  - Content: paragraph with proposed text highlighted (color: #8ee49c, bg: rgba(101, 209, 124, 0.1))

**Diff section 2: "5.2.2 Hand-tighten connector"** (same layout, identical in both versions)

**Info box** (bg: rgba(72, 156, 246, 0.1), border: rgba(72, 156, 246, 0.3), border-radius: 11px, padding: 12px):
- Icon + text: "ℹ Training may not be appropriate as the sole corrective action."
- Link: "Why am I receiving this?" (var(--hf-training), underline)

**Readiness box** (padding: 12px, border: 1px, border-radius: 11px):
- Header: "Release Readiness"
- 5 rows (flex, justify-content: space-between):
  - ✓ Evidence linked → **Ready** (var(--hf-ready))
  - ✓ Applicability → **Ready**
  - ✓ Training impact → **Ready**
  - ✓ Change control → **Ready**
  - ◆ Required approvals → **Pending** (var(--hf-change))

**Impact summary box** (padding: 12px, border: 1px, border-radius: 11px):
- DL grid:
  - Learners affected → 128
  - Sites affected → 3
  - Next cycle → 2027 · Will use Rev B

**Action buttons** (grid: 2 columns, gap: 8px, padding: 12px, border-top: 1px):
- "Send Back for Edits" (secondary: transparent, muted text, border, padding: 10px 16px, 0.8rem uppercase, font-weight: 500, hover: bg rgba(255,255,255,0.05))
- "Approve for Release" (primary: linear-gradient(135deg, #f3a62d, #f5b84d), border: none, color: #000, font-weight: 600, hover: opacity 0.9)

---

### 5. Learning Lineage Footer (118px, scrollable horizontal)

**Container** (border: 1px, border-radius: 17px, bg: var(--hf-surface), padding: 12px 16px):

**Header** (flex, justify-content: space-between):
- "LEARNING LINEAGE" (0.7rem uppercase)
- "View full lineage" link (0.7rem, var(--hf-training), underline)

**Step list** (ol, flex, gap: 0, overflow-x: auto, align-items: flex-start):

Seven steps, each:
- Button: width: 90px, bg: transparent, border: none, color: var(--hf-text-soft), padding: 0, text-align: center, font-size: 0.7rem
- Node: 26×26px circle, border: 2px solid var(--hf-border-strong), bg: var(--hf-surface-2), border-radius: 50%, margin: 0 auto 5px
  - Complete: border-color: var(--hf-ready), box-shadow: 0 0 10px rgba(101, 209, 124, 0.22)
  - Active: border-color: var(--hf-change), box-shadow: 0 0 10px rgba(243, 166, 45, 0.28)
- Connector (between steps): height: 1px, width: 20px, linear-gradient(90deg, rgba(101, 209, 124, 0.6), rgba(72, 156, 246, 0.45))

**Steps:**
1. Event Detected (18 New) — complete ✓
2. Corrective Action (14 Open) — complete ✓
3. Lesson Learned (3 New) — complete ✓
4. Revision Proposed (1 Awaiting) — **active** ◆
5. Training Planned (128 Impacted) — complete ✓
6. Training Delivered (64 Complete) — complete ✓
7. Effectiveness Measured (2 Due) — inactive

---

## Interactions & Behavior

- **Command tabs:** Click to switch modes; active shows blue underline + glow
- **Context rows:** Clickable, drill into detail views
- **KPI cards:** Clickable, navigate to stage data
- **SVG nodes:** Clickable, drill into stage details
- **Info links:** Navigate to sub-views ("View lessons", "Review proposal", etc.)
- **Workbench tabs:** Switch tab content (Summary, Track Changes, Impact, Reviews, History)
- **"Send Back for Edits":** Revert proposal to draft, notify author
- **"Approve for Release":** Trigger release workflow, schedule training delivery
- **Lineage steps:** Click to jump to that stage in workflow

---

## State & Data

### Component State
```
{
  activeMode: "intelligence" | "review" | "training" | "effectiveness" | "knowledge",
  activeTab: "summary" | "track-changes" | "impact" | "reviews" | "history",
  mapView: "map" | "list",
  contextExpanded: { attention, patterns, review } // booleans
}
```

### Data Requirements
- Attention items (array): id, title, description, action label, count
- Emerging patterns (array): id, title, sites, evidence count, status
- Review checks (array): id, name, status (Ready/Pending)
- Learning metrics: evidence count, lessons count, proposals, training count, effectiveness count
- Learning map SVG data: stage values (18, 3, 1, 128, 2)
- Change proposal: id, title, current rev, proposed rev, diffs, readiness checks, impact summary
- Lineage steps (array): stage, label, count, status (complete/active/inactive)

### Real-time Updates
- New evidence events
- New lessons identified
- Change proposals
- Training delivery progress
- Effectiveness measurements

---

## Implementation Notes

1. **Setup:** Copy all color tokens to your CSS-in-JS, Tailwind config, or CSS variables file
2. **Components:** Build 5 main sections as reusable React/Vue components
3. **SVG map:** Either static SVG or dynamically rendered from stage data
4. **Data binding:** Connect all metrics, labels, and counts to your backend API
5. **Navigation:** Implement routing for all interactive drill-down points
6. **Styling:** Match all typography, spacing, shadows, and hover states exactly
7. **Accessibility:** Add ARIA labels, ensure color-coded elements have text labels, test keyboard navigation

---

## Files

- `HF-ENGINE Intelligence Workspace.dc.html` — High-fidelity Design Component (reference only)
- `README.md` — This file
- `IMPLEMENTATION_CHECKLIST.md` — Task breakdown for developers
