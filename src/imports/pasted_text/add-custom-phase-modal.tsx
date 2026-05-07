Add three new modal/overlay screens to the F6 Timeline feature for the
Operating Model Simulator. Each screen is triggered by a specific
button on the F6.1 Timeline view. Three frames at 1440x900, all
wrapped in the existing global shell with F6 active.

GLOBAL SHELL CONTEXT
- 6-feature nav: F1–INTAKE, F2–ALLOCATION, F3–ROLES, F4–PODS,
  F5–ECONOMICS, F6–TIMELINE.
- F6 ACTIVE on all three frames (coral icon, label "TIMELINE", 3px
  coral left bar). F1–F5 = green check.
- Header, footer, version chips: same as existing F6 frames.

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: primary buttons, critical-path highlights
- Orange #FFAB28: AI sparkle, accents
- White #FFFFFF: background
- Cream #FDF8F4: cards
- Soft cream #FFF0DC: emphasis blocks
- Dark #161916: primary text
- Medium #494949: secondary text
- Grey #6D7069: meta, breadcrumbs
- Phase colors:
    Phase 1 = green tint #E2EFDA + #548235 text
    Phase 2 = soft cream #FFF0DC + #FFAB28 text
    Phase 3 = light coral #FCE4D6 + #FD4E59 text
    Phase 4 = deep coral #FD4E59 + white text
- 12px radius cards, 6px buttons, thin-line icons (1.5px)

==========================================================
FRAME 1 — F6.1.A ADD CUSTOM PHASE MODAL
==========================================================
Triggered by clicking "+ Add custom phase" on F6.1.

BACKGROUND: render F6.1 Timeline view dimmed at 30% black overlay.

CENTERED MODAL on top (highest z-index):
- 560px wide, white fill, 16px radius, 32px padding, drop shadow.

HEADER ROW
- Title "Add a custom phase" in 22px bold #161916.
- Right-aligned X close icon in #6D7069.
- 4px gap, subtitle "Create a new phase or insert one between existing
  phases. Useful for client-specific milestones." in 13px #494949.

FORM CONTENT (24px gap below subtitle)

Row 1 — PHASE NAME
- Label "Phase name" in 12px #494949 above input.
- Input 40px tall, white fill, 1px #494949 30% border, 6px radius.
- Placeholder "e.g., Pre-launch readiness review".

Row 2 — INSERT POSITION
- Label "Insert position" in 12px #494949.
- Visual position picker: a horizontal strip showing the 4 existing
  phases as small chips with insertion gaps between them and at the
  ends. Each gap is a clickable + circle in coral.
  Layout from left to right:
    [+]  [P1 Foundation]  [+]  [P2 Pilot]  [+]  [P3 Scale]  [+]
    [P4 Optimize]  [+]
  Phase chips: 88x32px, color matched to phase scale.
  Insertion + circles: 24px diameter, soft cream fill, 1px coral
  border. Active insertion point shown with a coral filled + circle
  (e.g., between P2 and P3, indicating the new phase will be P2.5).
- Below: small helper line "New phase will be inserted between Pilot
  and Scale" in 12px italic #6D7069.

Row 3 — DURATION
- Label "Duration" in 12px #494949.
- Two side-by-side inputs (50/50 split, 16px gap):
  Left: "Start month" — number input, suffix "M".
  Right: "End month" — number input, suffix "M".
- Helper below: "Adjacent phase end-dates will shift automatically."
  in 12px italic #6D7069.

Row 4 — PHASE COLOR
- Label "Phase color" in 12px #494949.
- 4 color-tile options in a horizontal row, 12px gap. Each tile is a
  48x32px rectangle with a phase color and a small label below:
    Green tint + "Foundation-like"
    Amber tint + "Pilot-like"
    Light coral + "Scale-like"
    Deep coral + "Optimize-like"
- Active selection has a 2px coral ring around the tile.

Row 5 — SCOPE ITEMS
- Label "Scope items (what happens in this phase?)" in 12px #494949.
- Repeatable text input list:
  - Each row: 32px tall, with a small drag handle icon left, an input
    field, and a small × delete icon right.
  - Pre-fill 2 empty rows.
- Below: "+ Add item" link in coral with plus icon.

Row 6 — EXPECTED CUMULATIVE SAVINGS (optional)
- Label "Expected cumulative savings (optional)" in 12px #494949.
- Number input with "%" suffix.
- Helper: "We'll fold this into the savings progression chart." in
  12px italic #6D7069.

MODAL FOOTER (24px gap below form, 1px top divider #494949 12%, 16px
padding on top of divider)
- Left: ghost "Cancel" button in #494949.
- Right cluster: outlined "Save as draft" + solid coral "Add phase"
  with check icon.

==========================================================
FRAME 2 — F6.1.B VIEW DEPENDENCIES (FULL-SCREEN OVERLAY)
==========================================================
Triggered by clicking "View dependencies" on F6.1.

Replaces the F6.1 workspace content entirely with a dependency-graph
view. Global shell remains visible with F6 active.

WORKSPACE CONTENT

TOP ROW
- Left: ghost link "← Back to timeline" in #494949 with chevron-left.
- Center title: "Dependencies" in 24px bold #161916, with subtitle
  below "What blocks what. Critical path highlighted in coral." in
  13px #6D7069.
- Right cluster: ghost "View as Gantt" with chart icon, ghost "Reset
  layout" with refresh icon.

LEGEND ROW (16px gap below title)
- Horizontal bar with 4 inline legend items, each: small visual swatch
  + label. Items separated by vertical 1px #494949 12% dividers.
    1. Coral solid line + "Critical path"
    2. Grey dashed line + "Soft dependency"
    3. Coral filled circle + "Bottleneck"
    4. Green check icon + "Quick win"

GRAPH AREA (24px gap below legend)
- Cream #FDF8F4 fill, 12px radius, 1px #494949 12% border, 24px padding,
  full workspace width, ~520px tall. Subtle dotted-grid background at
  5% opacity so users sense the canvas is interactive.

NODE LAYOUT
- A directed acyclic graph laid out left-to-right (Phase 1 nodes on
  the left, Phase 4 nodes on the right). Nodes grouped vertically by
  phase. Roughly 4 swim-lane bands, one per phase, with subtle phase-
  color tinted backgrounds on each band (very light, 8% opacity).
- Each node: rounded rectangle, ~140x60px, white fill, 1px border in
  the phase color, 8px radius. Node content: scope item name in 12px
  medium #161916 (max 2 lines).
- Critical-path nodes have a 2px coral border and a small filled coral
  dot in the top-left corner.
- Quick-win nodes have a green check icon in the top-right corner.
- Bottleneck nodes (where multiple paths converge) have a coral filled
  circle replacing the corner dot, slightly larger.

NODES TO RENDER (placement guidance)

Phase 1 swim-lane (leftmost):
  Node A: "Image classifier retrain hookups" (critical-path)
  Node B: "Data logging improvements" (critical-path)
  Node C: "Compile daily report → auto" (quick-win)
  Node D: "Auto-QA on spam" (quick-win)

Phase 2 swim-lane:
  Node E: "Auto-QA pilot in 1 pod" (critical-path, depends on A, B)
  Node F: "AI Output Auditor onboard" (depends on E)
  Node G: "TL training cohort 1" (depends on B)

Phase 3 swim-lane:
  Node H: "LLM summarization rollout" (critical-path, bottleneck —
  depends on E, F)
  Node I: "Pod restructure" (depends on G, H)
  Node J: "Span-of-control increase" (depends on I)

Phase 4 swim-lane (rightmost):
  Node K: "Refine AI confidence thresholds" (depends on H)
  Node L: "Reduce TL overhead further" (depends on J)
  Node M: "Backlog for v2" (terminal)

EDGES (connecting lines)
- Critical-path edges: 2px solid coral lines with arrow heads (A→E,
  B→E, E→H, H→K, I→L). The continuous coral path from leftmost to
  rightmost is the critical path.
- Soft-dependency edges: 1.5px dashed grey lines (B→G, G→I, J→L).
- Edges curve gently; do not let edges cross through node bodies.

SIDE PANEL (right of graph, 280px wide, white card, 1px border, 12px
radius, 20px padding)
- Header "Critical path summary" in 14px bold.
- 8px gap, body in 13px #494949: "5 nodes form the critical path. Total
  duration: 9 months. Any delay on these nodes pushes the whole
  rollout."
- 16px gap, then a numbered list of the 5 critical-path nodes, each
  row 28px tall, with a small coral number circle and the node name
  in 12px #161916.
- 16px gap, then a flag callout in soft-cream fill with 3px amber left
  border, 12px padding: amber warning icon + text in 13px #494949:
  "LLM summarization rollout is the project bottleneck — 2 paths
  converge here. Ensure capacity planning is locked in by Phase 2 end."

==========================================================
FRAME 3 — F6.1.C GANTT VIEW (FULL-SCREEN OVERLAY)
==========================================================
Triggered by clicking "View as Gantt" on F6.1.

Replaces the F6.1 workspace content with a Gantt chart. Global shell
visible with F6 active.

WORKSPACE CONTENT

TOP ROW
- Left: ghost link "← Back to timeline" in #494949 with chevron-left.
- Center title: "Gantt view" in 24px bold #161916, subtitle "Each
  scope item plotted across the 9-month timeline. Critical path
  highlighted." in 13px #6D7069.
- Right cluster: ghost "View dependencies" with network icon, solid
  coral "Export Gantt" with download icon.

GANTT CONTAINER (24px gap below title, full workspace width)
- White card, 1px #494949 12% border, 12px radius, 24px padding,
  ~580px tall.

HEADER ROW INSIDE CONTAINER
- Two-column layout: left column 280px (task labels), right column
  flex-grow (timeline).
- Left header: "SCOPE ITEM" in 11px caps #6D7069.
- Right header: a horizontal month axis with 9 evenly-spaced tick
  labels "M1 M2 M3 M4 M5 M6 M7 M8 M9" in 11px #6D7069. Light vertical
  gridlines #494949 8% opacity at each month.

PHASE SWIM-LANE BANDS
- Background of the right column subtly shaded by phase to anchor
  the visual:
  M1–M2 band: green tint at 6% opacity
  M3–M4 band: amber tint at 6% opacity
  M5–M7 band: light coral at 6% opacity
  M8–M9 band: deep coral at 6% opacity
- Phase labels in 11px caps #6D7069 sit above the timeline header,
  centered on each band: "PHASE 1", "PHASE 2", "PHASE 3", "PHASE 4".

TASK ROWS (each 36px tall, alternating subtle background — white and
#FDF8F4 cream)

Pre-fill these 11 rows in this order:

Row 1: "Image classifier retrain hookups" | bar from M1 → M2 in green
       tint with coral 1.5px outline (critical-path)
Row 2: "Data logging improvements" | bar M1 → M2.5 green tint, coral
       outline
Row 3: "Compile daily report → auto" | bar M1.5 → M2 green tint solid
       fill (no outline) + small green check icon in the bar
Row 4: "Auto-QA on spam" | bar M1.5 → M2 green tint solid + green check
Row 5: "Auto-QA pilot in 1 pod" | bar M3 → M4 amber tint + coral
       outline (critical-path)
Row 6: "AI Output Auditor onboard" | bar M3.5 → M4 amber tint
Row 7: "TL training cohort 1" | bar M3 → M4 amber tint
Row 8: "LLM summarization rollout" | bar M5 → M6.5 light coral + coral
       outline (critical-path)
Row 9: "Pod restructure" | bar M5.5 → M7 light coral + coral outline
       (critical-path)
Row 10: "Span-of-control increase" | bar M6.5 → M7 light coral
Row 11: "Refine AI confidence + Reduce TL overhead" | bar M8 → M9 deep
        coral fill, white text inside if labeled

BAR STYLING
- Bar height: 20px, 4px radius.
- Critical-path bars: 1.5px coral outline.
- Quick-win bars: small green check icon overlaid on the right end.
- Bar fill colors match the phase the task belongs to.
- Tooltip hint: each bar has a small dot at the start (start date) and
  a small chevron at the end (end date).

TODAY MARKER
- A vertical 2px dashed coral line at M2.5 with a small label
  "TODAY" at the top in 11px caps coral. (Demonstrates how progress
  would be tracked in a live tool.)

LEGEND STRIP (12px gap below the gantt, full container width)
- 4 legend items horizontal, each: small visual swatch + 12px label:
    1. Coral 1.5px outline + "Critical path"
    2. Green check + "Quick win"
    3. Coral dashed line + "Today marker"
    4. Phase-color bars + "Bar fill = phase"

==========================================================
DELIVERABLES
==========================================================
3 desktop frames at 1440x900, named:
- "F6.1.A Add custom phase modal"
- "F6.1.B Dependencies view"
- "F6.1.C Gantt view"

Strict adherence to the palette and Funnel Sans. The dependency graph
must show edges that curve cleanly without crossing node bodies. The
Gantt bars must stay within their month boundaries — no bars
extending past M9 or starting before M1. Critical-path styling
(coral outline, coral edges) must be consistent across both the
Dependencies and Gantt frames so users recognize the same path.