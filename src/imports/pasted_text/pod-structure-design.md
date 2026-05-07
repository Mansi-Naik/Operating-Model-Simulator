Design Feature 4 (Pod Structure) for the Operating Model Simulator.
Three desktop frames, 1440x900 each, all wrapped in the existing global
shell (header, left nav F1–F7, footer status bar).

LEFT NAV LABELS (always show all 7, in 11px caps):
F1–INTAKE, F2–ALLOCATION, F3–ROLES, F4–PODS, F5–ECONOMICS, F6–CONTROLS,
F7–TIMELINE.
F4 active on every frame: coral icon, label in #161916, 3px coral left
bar. F1/F2/F3 = green check (completed). F5 = small dot (in-progress).
F6/F7 = lock icon at 60% opacity.

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: buttons, active states, primary CTAs
- Orange #FFAB28: AI sparkle, accents
- White #FFFFFF: main background
- Cream #FDF8F4: cards, panels
- Soft cream #FFF0DC: emphasis blocks
- Dark #161916: primary text
- Medium #494949: secondary text, dividers
- Grey #6D7069: meta text, breadcrumbs
- Risk chips: low = green tint #E2EFDA + #548235 text; med = #FFF0DC
  + #FFAB28; med-high = #FCE4D6 + #FD4E59
- 12px radius on cards, 6px on buttons
- Subtle card shadows
- Thin-line icons (1.5px)

GLOBAL SHELL
- Header 56px white: logo + "OPERATING MODEL SIMULATOR" + client "Acme
  Corp" in coral. Right: help, gear, bell w/ coral dot, avatar.
- Left nav 64px white with the 7 labels above.
- Footer 32px dark #161916, white monospace 11px: green dot + "SYSTEM
  ENGINE: ACTIVE" left; "CONTEXT V2  MATRIX V1  ROLES V1  PODS V0
  V2.4.1-STABLE" right.

==========================================================
FRAME 1 — F4.1 VARIANT SELECTOR
==========================================================
Title: "Pod structure" + subtitle "AI-synthesized team shape and span
of control."

CONSTRAINTS BAR (cream card, full width): horizontal row of 5 controls
labelled "Risk profile" (dropdown HIGH), "Target span" (input <=12),
"Max pod size" (input 20), "Must include" (chips: TL, QA Officer),
"Shared support" (chips: SME, AI Ops).

THREE VARIANT CARDS side-by-side (each ~360x480, cream fill, 12px
radius). The middle (BALANCED) card has a 2px coral border and a coral
star badge top-right.

Each card contains:
- Variant name in caps bold.
- POD VISUAL: a "TL" rectangle on top (coral fill, white text), vertical
  line down, a horizontal stack of small agent boxes (cream fill, grey
  border) below. Number label next to stack. Below the agent row, three
  dotted-line connectors going DOWN to small support-role boxes (these
  connectors must NOT cross through the agent row).
- 2x2 STATS: SPAN, CAPACITY/DAY, COST INDEX, RISK chip.
- Italic narrative (2 sentences).
- Bottom: full-width "Select" button.

CARD 1 — CONSERVATIVE: 8 agents, support 0.5 QA / 0.25 AI Auditor /
0.2 SME. Span 1:8, capacity 4500/day, cost index 1.05, risk LOW.
Narrative: "Tight span, high support density. Best when regulated or
early in transition." Outlined Select button.

CARD 2 — BALANCED (recommended): 12 agents, support 0.4 QA / 0.3 AI
Auditor / 0.15 SME. Span 1:12, capacity 6800/day, cost index 1.00,
risk MED. Add a "RECOMMENDED" pill in coral. Narrative: "Industry
benchmark midpoint for safety work. Recommended default." Solid coral
"Selected" button with check icon.

CARD 3 — AGGRESSIVE: 18 agents, support 0.3 QA / 0.4 AI Auditor / 0.1
SME (note AI Auditor is INTENTIONALLY higher). Span 1:18, capacity
10200/day, cost index 0.85, risk MED-HIGH. Narrative: "Wide span, lean
support. Requires mature AI Ops." Outlined Select button.

FOOTER ROW: ghost "Show math" left; solid coral "View org rollup →"
right.

==========================================================
FRAME 2 — F4.2 ORG ROLLUP
==========================================================
Title: "Org rollup" + chip "BALANCED VARIANT" (coral). Right: ghost
"Show math", solid coral "Export org chart".

LARGE ORG CARD (cream, full width):
- Top: single "Unit Head" rounded rectangle (coral fill, white text).
- Vertical connector down, branching out.
- POD ROW: 4 explicit pod nodes side-by-side + 1 stack-icon
  abbreviation "POD 5–8 (+4 more)". Each pod is a small rectangle
  (cream fill, coral border) with "POD N" label, mini glyph, and
  "TL + 12 + s" caption.

SUPPORT LAYER row: 4 small cards labelled "Central QA x2", "AI Ops x3",
"SME (shared)", "WFM x1". Each card has an icon, role name, and stat.

SUMMARY STAT STRIP (3 sections divided by dividers):
- TOTAL HEADCOUNT: 116 (32px bold)
- TODAY: 113
- DELTA: +3 (+2.7%) in green

VOLUME SENSITIVITY panel (cream card):
- Header "Volume sensitivity"
- Helper: "Adjust target volume to see how the pod count scales."
- Slider (coral fill, cream track) with two annotation labels above:
  "Today: 8 pods" at start, "+50%: 12 pods" at the midpoint.
- Tick labels below: "0.5x | 4 pods", "1x | 8 pods", "1.5x | 12 pods",
  "2x | 16 pods".

==========================================================
FRAME 3 — F4.3 SHOW MATH DRAWER
==========================================================
Background: F4.1 dimmed at 30% black.
Drawer slides in from right, ~520px wide, white fill, left border.

Drawer content (top to bottom):
- Header: "Show math — Balanced variant" + subtitle "Every calculation,
  traceable back to your inputs."
- 4 calculation sections, each labelled in coral caps:
  1. POD COMPOSITION — cream formula card showing "Agents per pod =
     min(target_span, max_pod_size, derived_from_volume) = min(12, 20,
     12.4) → 12 agents". Italic note linking back to F1 inputs.
  2. QA SAMPLING — formula card: "(24 audits × 6 min) / (6.5 hrs × 60)
     = 0.37 FTE → 0.4 QA". Note linking to KPI sheet.
  3. SPAN OF CONTROL — small lookup table for low/medium/high risk;
     highlight the matching row (cream fill, amber left border): "Your
     risk is HIGH → recommended span 1:12 (max)".
  4. POD COUNT — formula: "50,000 / 6,800 = 7.35 → ceiling = 8 pods".
- INPUTS USED key-value list (link icons): Volume/day → 50,000; Risk
  profile → HIGH; QA sampling rate → 10%; Items per agent → ~340/day;
  Coaching capacity → 6.5 hrs/wk per agent.
- Footer: ghost "Copy math" + solid coral "Close".

Use monospace 12px for all formula content. The math should LOOK like
calculations, not like prose paragraphs.

==========================================================
DELIVERABLES
==========================================================
3 frames at 1440x900, named "F4.1 Variants", "F4.2 Org rollup",
"F4.3 Show math".

Strict adherence to the palette and Funnel Sans. No blue, no purple,
no generic stock illustrations. Pod-visual connectors must never
cross through the agent rows.