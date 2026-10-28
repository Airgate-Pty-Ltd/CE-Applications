# Implementation Checklist

## Phase 1: Project Setup
- [ ] Copy all color tokens to CSS/Tailwind/CSS variables
- [ ] Establish component folder structure (CommandBar, ContextRail, IntelligenceCanvas, Workbench, Lineage)
- [ ] Create data models and TypeScript types for all data structures
- [ ] Set up API endpoints/mocking

## Phase 2: Static Layout & Components
- [ ] Build CommandBar with brand + tabs + actions
- [ ] Build ContextRail intro section
- [ ] Build ContextRail three sections (Attention, Patterns, Review)
- [ ] Build IntelligenceStrip (5 KPI cards)
- [ ] Build LearningMap SVG container
- [ ] Build WorkbenchHeader
- [ ] Build WorkbenchTabs
- [ ] Build WorkbenchBody (diff sections, info box, readiness, impact)
- [ ] Build WorkbenchActions (buttons)
- [ ] Build Lineage (step list with nodes and connectors)

## Phase 3: Styling & Visual Polish
- [ ] Apply all color tokens throughout
- [ ] Verify spacing/padding matches spec
- [ ] Implement all hover/active/focus states
- [ ] Match typography scales (sizes, weights, letter-spacing)
- [ ] Implement shadows and glow effects
- [ ] Test scrolling and overflow on independent sections
- [ ] Verify border radiuses and visual consistency

## Phase 4: SVG Learning Map
- [ ] Render gradient path connecting 5 nodes
- [ ] Render circular stage nodes with labels and values
- [ ] Render pattern signal (dashed line + label)
- [ ] Render three info boxes below map
- [ ] Make SVG responsive (viewBox scaling)
- [ ] Test clickability of nodes (if interactive)

## Phase 5: Data Integration
- [ ] Connect dashboard summary endpoint (metrics, attention, patterns, reviews)
- [ ] Populate KPI strip with real data
- [ ] Populate learning map metrics (18, 3, 1, 128, 2)
- [ ] Populate context rail sections with real items
- [ ] Fetch and display current change proposal (HF-012 details)
- [ ] Populate lineage steps with real workflow data
- [ ] Handle loading/error states

## Phase 6: Interactivity
- [ ] Implement command tab switching (Intelligence is default)
- [ ] Implement workbench tab switching (Track Changes is default)
- [ ] Implement map view toggle (Map/List)
- [ ] Add click handlers to attention rows (drill-down)
- [ ] Add click handlers to pattern rows (drill-down)
- [ ] Add click handlers to KPI cards (drill-down)
- [ ] Add click handlers to SVG nodes (drill-down)
- [ ] Implement "Send Back for Edits" button workflow
- [ ] Implement "Approve for Release" button workflow
- [ ] Implement lineage step click navigation

## Phase 7: Real-time Updates & Behavior
- [ ] Set up real-time subscription (WebSocket/polling) for new evidence
- [ ] Update metrics on new lessons
- [ ] Update patterns on new evidence
- [ ] Update lineage on workflow progress
- [ ] Add notification badges if applicable

## Phase 8: Accessibility & QA
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure color-coded elements have text labels
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test screen reader compatibility
- [ ] Verify color contrast ratios
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Responsive design verification (1200px+)
- [ ] Performance profiling (Lighthouse)
- [ ] Test all data loading states

## Phase 9: Refinement & Polish
- [ ] User testing & feedback
- [ ] Bug fixes and edge cases
- [ ] Animation/transition tweaks if needed
- [ ] Final visual polish

---

## Effort Estimate
**2–4 weeks** depending on:
- Backend API readiness
- Design system integration complexity
- Team size and experience with the tech stack
- Requirements for additional modes (Review, Training, etc.)

## Complexity: Medium
- Layout complexity: High (4-area grid with independent scrolling)
- SVG rendering: Medium (static or simple data-driven)
- Data integration: Medium (multiple endpoints, real-time updates)
- Interactivity: Medium (multiple drill-down flows, modal/navigation)
