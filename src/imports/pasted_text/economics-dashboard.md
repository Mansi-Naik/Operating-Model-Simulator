Design Feature 5 — Economics — for the Operating Model Simulator. Two
desktop frames at 1440x900, both wrapped in the existing global shell.

LEFT NAV (always show all 7, in 11px caps):
F1–INTAKE, F2–ALLOCATION, F3–ROLES, F4–PODS, F5–ECONOMICS, F6–CONTROLS,
F7–TIMELINE.
F5 active on both frames: coral icon, dark label, 3px coral left bar.
F1/F2/F3/F4 = green check (completed). F6 = small dot. F7 = lock icon
at 60% opacity.

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: primary buttons, savings curve, key icons
- Orange #FFAB28: AI sparkle, illustrative watermark, sensitivity bars
- White #FFFFFF: background
- Cream #FDF8F4: cards, panels
- Soft cream #FFF0DC: emphasis blocks, banners
- Dark #161916: primary text
- Medium #494949: secondary text
- Grey #6D7069: meta, breadcrumbs
- Delta colors: green #548235 for cost down (savings); coral #FD4E59
  for cost up; grey #6D7069 for neutral
- Source chips: "FROM F1" = green tint #E2EFDA + #548235 text;
  "DEFAULT" = soft cream #FFF0DC + #6D7069; "MODIFIED" = light coral
  #FCE4D6 + #FD4E59
- 12px radius cards, 6px buttons, thin-line icons (1.5px)

GLOBAL SHELL
- Header 56px white: logo + "OPERATING MODEL SIMULATOR" + client "Acme
  Corp" in coral. Right: help, gear, bell with coral dot, avatar.
- Left nav 64px white with the 7 labels.
- Footer 32px dark #161916, white monospace 11px: green dot + "SYSTEM
  ENGINE: ACTIVE" left; "CONTEXT V2  MATRIX V1  ROLES V1  PODS V1
  ECON V0  V2.4.1-STABLE" right.

==========================================================
FRAME 1 — F5.1 ECONOMICS DASHBOARD (PRIMARY)
==========================================================

WORKSPACE TOP ROW
- Breadcrumb "ECONOMICS" in #161916.
- Right cluster: ghost "Re-run" with refresh icon, then settings gear.

TITLE ROW (16px gap below)
- Left: "Projected economics" in 24px bold #161916.
- Inline beside title (16px gap): a prominent ILLUSTRATIVE chip — 28px
  tall pill, 1.5px DASHED amber border, transparent fill, "ILLUSTRATIVE"
  label in 12px caps medium amber letter-spaced.
- ALSO: a faint diagonal repeating "ILLUSTRATIVE" text pattern at 5%
  opacity covering the workspace background (subtle but present).
- Subtitle: "All values are indicative. Adjust assumptions in the panel
  to explore alternatives." in 13px #6D7069.

PRIMARY STAT TILES (24px gap below subtitle)
- Four equal tiles in a horizontal row, ~265px wide × 160px tall,
  16px gap between, all top-edges aligned.
- Each tile: white fill, 1px #494949 12% border, 12px radius, 20px
  padding, subtle shadow.

  Tile 1 — MONTHLY COST
    Top label "MONTHLY COST" in 11px caps #6D7069.
    Big value row: "$412k" in 18px medium #6D7069, then thin "→",
    then "$318k" in 28px bold #161916.
    Delta row: "−22.9%" in 18px bold green #548235.
    Range row: "Range: 18–28%" in 12px italic #6D7069.
    Tiny descending sparkline at the bottom in coral on cream track.

  Tile 2 — COST PER ITEM
    Same layout. Values "$0.275 → $0.21". Delta "−22.9%" green.
    Range: "Range: 18–28%".

  Tile 3 — HEADCOUNT
    Values "113 → 116". Delta "+3 (+2.7%)" in 18px bold grey (neutral).
    Sub-label "Net change after redesign" in 12px #6D7069.

  Tile 4 — SUPERVISOR OVERHEAD
    Values "18.5% → 12.0%". Delta "−6.5pp" in 18px bold green.
    Sub-label "% of total cost" in 12px #6D7069.

SECONDARY STATS ROW (16px gap below tiles)
- Two smaller cream blocks side by side, ~545px wide × 80px tall, 16px
  gap, 20px padding. Layout: icon left + label and value right.
  Block 1: green check icon + "Quality projection: 95%" + chip
  "TARGET MET" in green tint #E2EFDA.
  Block 2: trending-up coral icon + "Items per FTE: +18%" + chip
  "VS TODAY" in soft cream.

CUMULATIVE SAVINGS CHART (24px gap below)
- White card, 1px #494949 12% border, 12px radius, 24px padding, full
  workspace width, ~340px tall.
- Header: "Cumulative savings over time" in 16px bold #161916.
- Right-aligned legend: small swatches "─ Cumulative", "┊ Payback".
- Chart area (~280px tall):
  Y-axis (left): labels "$0" at midline, "−$340k" at bottom,
  intermediate gridlines at 25%/50%/75%.
  X-axis (bottom): month labels "M1, M2, M3, M4, M5, M6, M9, M12".
  Horizontal "$0" reference line in 1px #6D7069 dashed.
  An S-CURVE LINE in coral, 2.5px stroke:
    - Starts at M0 at value approximately −$340k.
    - Dips slightly through M1–M2.
    - Crosses $0 at M6.
    - Continues climbing through M12.
  Negative band (M0 to where line crosses $0): faint coral fill
  (#FCE4D6 at 30% opacity) below the curve.
  Positive band (after $0 crossing): faint green fill (#E2EFDA at 30%
  opacity) above $0.
  Annotation: vertical dashed amber line at M6 with a chip "PAYBACK: M6"
  pointing to the crossing — chip in soft cream fill, amber 11px caps
  text.

SENSITIVITY PANEL (24px gap below chart)
- White card, 1px #494949 12% border, 12px radius, 24px padding, full
  workspace width.
- Header: "Sensitivity — top 3 drivers" in 16px bold #161916.
- Helper: "How much do the savings change if each assumption is off?"
  in 13px #6D7069.
- 16px gap, then 3 horizontal RANGE BARS, each 64px tall, vertically
  spaced 16px apart. Each row layout (left to right):
    Left (200px fixed): driver name in 14px medium #161916.
    Middle (flex-grow): the range bar visual:
      Outer track 8px tall, soft cream #FFF0DC fill, 9999px radius.
      A coral filled segment from low value to high value position.
      A round 16px diameter handle at the BASE CASE point.
      Two anchor labels above the bar at the endpoints (low and high
      percentages).
      Center handle label below "BASE: 23%" as a small chip — coral
      fill, white 11px caps text.
    Right (60px fixed): info-circle icon in #6D7069 (hover for tooltip).

  Bar 1 — "Image classifier coverage": low "13%", high "28%", base 23%.
  Bar 2 — "Agent fully-loaded cost": low "18%", high "27%", base 23%.
  Bar 3 — "Ramp speed": low "21%", high "25%", base 23%.

SENSITIVITY NARRATIVE CALLOUT (16px gap below sensitivity panel)
- Soft cream #FFF0DC fill, 8px radius, 1px left border 3px amber, 20px
  padding, full workspace width.
- Sparkle icon in amber on the left.
- Body text in 14px #161916: "The biggest driver of projected savings
  is image classifier coverage. If it lands at 60% instead of 90%,
  savings shrink to 13%. Agent fully-loaded cost is the second driver.
  Ramp speed has minor impact in the modeled range."

FOOTER ACTION ROW (24px gap below callout)
- Right-aligned: solid coral button "Edit assumptions →" with arrow-
  right icon, 44px tall, 24px horizontal padding. This is the trigger
  to open the F5.2 assumption editor drawer.

==========================================================
FRAME 2 — F5.2 ASSUMPTION EDITOR (DRAWER)
==========================================================
Background: render the F5.1 dashboard slightly dimmed at 20% black
overlay. The illustrative watermark stays visible through the dim.

DRAWER specs:
- Slides in from the right edge.
- 480px wide, full height below the header.
- White fill, left 1px border #494949 12%, subtle shadow on left edge,
  24px padding throughout.

DRAWER CONTENT (top to bottom)

HEADER ROW
- Title "Assumptions" in 20px bold #161916.
- Right-aligned X close icon in #6D7069.
- Subtitle: "Edit any input — the dashboard recomputes instantly." in
  13px #494949.

SECTION 1 — COSTS PER FTE PER MONTH (16px gap below subtitle)
- Section label "COSTS PER FTE PER MONTH" in 11px caps #6D7069.
- 8px gap, then 4 input rows. Each row layout:
    Left (~140px): role name in 14px #161916.
    Middle (flex): input field 36px tall, white fill, 1px #494949 30%
    border, 6px radius, "$" prefix, value pre-filled.
    Right: source chip in 11px caps.
  Pre-fill:
    Agent — input "$2,500" — chip "FROM F1"
    TL — input "$4,500" — chip "FROM F1"
    QA Officer — input "$5,000" — chip "FROM F1"
    AI Output Auditor — input "$3,500" — chip "DEFAULT"

SECTION 2 — TRANSITION (24px gap, 1px top divider #494949 12%)
- Section label "TRANSITION" in 11px caps #6D7069.
- 8px gap, 4 input rows:
    Ramp curve — dropdown "S-curve" with chevron — chip "DEFAULT"
    Months to steady — number input "9" — chip "MODIFIED"
    Tech build cost — input "$180,000" — chip "DEFAULT"
    Retraining / FTE — input "$1,000" — chip "DEFAULT"

SECTION 3 — TECH (24px gap, 1px top divider)
- Section label "TECH" in 11px caps #6D7069.
- 8px gap, 2 input rows:
    Image classifier coverage — input "90%" — chip "FROM F1"
    LLM tooling cost / mo — input "$8,000" — chip "DEFAULT"

RECOMPUTE INDICATOR (16px gap below Tech section)
- Inline panel: soft cream #FFF0DC fill, 4px radius, 12px padding.
- Sparkle icon in amber + text "Dashboard recomputed: −22.9% savings"
  in 13px #161916.

DRAWER FOOTER (sticky at bottom of drawer, 1px top border #494949 12%,
16px padding)
- Left: ghost button "Reset all" with reset icon, label in coral.
- Right: solid coral "Apply & close" with check icon.

==========================================================
DELIVERABLES
==========================================================
2 frames at 1440x900, named "F5.1 Economics dashboard" and
"F5.2 Assumption editor".

Strict adherence to the palette and Funnel Sans. No blue, no purple,
no generic stock illustrations. The illustrative watermark must
appear as both a chip beside the title AND a faint diagonal
background pattern at 5% opacity. The savings curve must be a true
S-curve crossing $0 at M6 with the negative band shaded faint coral
and the positive band shaded faint green.