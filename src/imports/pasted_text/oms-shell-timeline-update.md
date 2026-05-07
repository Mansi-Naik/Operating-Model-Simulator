Two-part change for the Operating Model Simulator.

PART 1 — Update the global shell across ALL existing frames.
PART 2 — Design the new Feature 6 (Timeline) screens.

==========================================================
PART 1 — GLOBAL SHELL UPDATE
==========================================================
The product no longer has 7 features. It now has 6. The old "Controls"
feature has been REMOVED. The old "Timeline" feature (previously F7) is
NOW Feature 6.

LEFT NAV — UPDATED LIST (always 6 items, in 11px caps)
F1 — INTAKE
F2 — ALLOCATION
F3 — ROLES
F4 — PODS
F5 — ECONOMICS
F6 — TIMELINE

Apply this change to EVERY existing frame in the file:
- Remove the old F6 (CONTROLS) icon and label entirely.
- Rename the old F7 (TIMELINE) to F6.
- The nav rail now has 6 buttons instead of 7. Re-distribute spacing
  so the 6 buttons sit evenly along the rail, with the SAVE and EXPORT
  buttons remaining at the bottom of the rail (separated by a 1px
  divider as before).
- Keep all other shell elements unchanged: header, footer, color rules,
  active-state coral bar, completed/in-progress/locked indicators.

ACTIVE-FEATURE STATES per existing frame (re-confirm):
- F1 frames: F1 active. Others = pending.
- F2 frames: F2 active. F1 = green check.
- F3 frames: F3 active. F1, F2 = green check.
- F4 frames: F4 active. F1, F2, F3 = green check.
- F5 frames: F5 active. F1, F2, F3, F4 = green check. F6 = small dot.
- F6 frames (NEW): F6 active. F1–F5 = green check.

FOOTER STATUS BAR — VERSION CHIPS UPDATE
The footer no longer shows a "CONTROLS V0/V1" chip. Update version
chips on every existing frame to remove any "CONTROLS" reference.
For F6 (Timeline) frames, the chip set should read:
"CONTEXT V2  MATRIX V1  ROLES V1  PODS V1  ECON V1  TIMELINE V0
V2.4.1-STABLE"

==========================================================
PART 2 — DESIGN FEATURE 6 (TIMELINE) — TWO FRAMES
==========================================================
Two desktop frames at 1440x900, both wrapped in the updated global shell
(6-feature nav). F6 is ACTIVE on both — coral icon, dark "TIMELINE"
label, 3px coral left bar.

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: primary buttons, active states, recommended badges,
  critical-path highlights
- Orange #FFAB28: AI sparkle, accents, savings progression
- White #FFFFFF: background
- Cream #FDF8F4: cards, panels
- Soft cream #FFF0DC: emphasis blocks, banners
- Dark #161916: primary text
- Medium #494949: secondary text
- Grey #6D7069: meta, breadcrumbs
- Phase colors (from Phase 1 to Phase 4, light to deep):
    Phase 1 = green tint #E2EFDA + #548235 text
    Phase 2 = soft cream #FFF0DC + #FFAB28 text
    Phase 3 = light coral #FCE4D6 + #FD4E59 text
    Phase 4 = deep coral background #FD4E59 + white text
- Risk/level chips: Low = green tint; Med = soft cream + amber; High =
  light coral + coral
- 12px radius cards, 6px buttons, thin-line icons (1.5px)

==========================================================
FRAME 1 — F6.1 IMPLEMENTATION TIMELINE
==========================================================

WORKSPACE TOP ROW
- Breadcrumb "TIMELINE" in #161916.
- Right cluster: ghost "View as Gantt" with chart icon, ghost "View
  dependencies" with network icon, solid coral "Export" with download
  icon.

TITLE ROW (16px gap below)
- Left: "Implementation timeline" in 24px bold #161916.
- Subtitle: "A phased rollout of the recommended operating model.
  Adjust phases or sequence to match your client's appetite." in 13px
  #6D7069.

PHASE SUMMARY STRIP (24px gap below subtitle)
- Full workspace width, no card background — just 4 evenly spaced
  blocks with vertical 1px #494949 12% dividers between.
- Each block (top to bottom):
    Phase number label "PHASE 1" in 11px caps #6D7069.
    Phase name in 18px bold #161916.
    Duration in 12px #494949.
- Pre-fill:
    PHASE 1 / "Foundation" / "Months 1–2"
    PHASE 2 / "Pilot" / "Months 3–4"
    PHASE 3 / "Scale" / "Months 5–7"
    PHASE 4 / "Optimize" / "Months 8–9"

PHASE CARDS ROW (24px gap below summary)
- 4 equal-width cards in a horizontal row, 16px gap between, all top-
  edges aligned, all same height (~280px).
- Each card: cream #FDF8F4 fill, 12px radius, 1px #494949 12% border,
  20px padding. Top edge of each card is colored using the Phase color
  scale (Phase 1 green tint top stripe, Phase 2 soft cream, Phase 3
  light coral, Phase 4 deep coral).

  CARD 1 — PHASE 1 (Foundation)
    Top stripe: 4px tall green-tint #E2EFDA bar.
    8px gap, then phase mini-label "PHASE 1 · FOUNDATION" in 11px caps
    #548235.
    8px gap, then a list of scope items, each row 32px tall with a
    small green check icon left of text:
      "Image classifier retrain hookups"
      "Data logging improvements"
      "Compile daily report → auto"
      "Auto-QA on spam"
    Bottom of card (8px gap above bottom): a stat row "Cumulative
    savings: 3%" with a tiny progress dot and label in 12px medium
    green #548235.

  CARD 2 — PHASE 2 (Pilot)
    Top stripe: 4px tall amber #FFAB28 bar.
    Mini-label "PHASE 2 · PILOT" in amber.
    Scope items (with amber chevron icons):
      "Auto-QA pilot in 1 pod"
      "AI Output Auditor onboard"
      "TL training (cohort 1)"
    Stat row: "Cumulative savings: 9%" in amber.

  CARD 3 — PHASE 3 (Scale)
    Top stripe: 4px tall light-coral #FCE4D6 bar.
    Mini-label "PHASE 3 · SCALE" in coral.
    Scope items (with coral arrow icons):
      "LLM summarization rollout"
      "Pod restructure across all teams"
      "Span-of-control increase"
    Stat row: "Cumulative savings: 18%" in coral.

  CARD 4 — PHASE 4 (Optimize)
    Top stripe: 4px tall deep coral #FD4E59 bar.
    Mini-label "PHASE 4 · OPTIMIZE" in deep coral.
    Scope items (with sparkle icons):
      "Refine AI confidence thresholds"
      "Reduce TL overhead further"
      "Backlog for v2"
    Stat row: "Cumulative savings: 23%" in deep coral.

QUICK WINS CALLOUT (24px gap below phase cards)
- Soft cream #FFF0DC fill, 12px radius, 1px left border 4px amber, 20px
  padding, full workspace width.
- Sparkle icon in amber on the left.
- Header in 14px bold "Quick wins (front-loaded into Phase 1)" in
  #161916.
- 4px gap, body text in 13px #494949: list of 2 items separated by
  bullet:
    "• Compile daily report → auto"
    "• Auto-QA on spam"
- Right of body, a small chip "+3% by Month 2" in green tint, 11px
  caps green text.

SAVINGS PROGRESSION CHART (24px gap below quick-wins)
- White card, 1px #494949 12% border, 12px radius, 20px padding, full
  workspace width, ~140px tall.
- Header: "Cumulative savings by phase" in 14px medium #161916.
- 8px gap, then a horizontal stacked bar chart, full card width:
  Track 24px tall, 9999px radius, soft cream background.
  4 segments left to right, each colored by phase (green tint, amber,
  light coral, deep coral). Segment widths proportional to savings
  contribution: 3%, 6%, 9%, 5% (totaling 23%).
  Each segment shows its cumulative percentage label inside in 11px
  caps text (white on the deeper colors, dark text on the lighter ones).
  Below the bar, x-axis tick labels: "P1: 3%", "P2: 9%", "P3: 18%",
  "P4: 23%" in 12px #6D7069.

FOOTER ACTION ROW (24px gap below chart, right-aligned)
- Ghost "Add custom phase" button with plus icon in #494949.
- Ghost "View dependencies" with network icon.
- Solid coral "Save as scenario" with bookmark icon, 44px tall.

==========================================================
FRAME 2 — F6.2 SCENARIO COMPARISON
==========================================================

WORKSPACE TOP ROW
- Breadcrumb "TIMELINE > SCENARIO COMPARISON" in #161916.
- Right cluster: solid coral button "+ Save current as scenario" with
  bookmark icon, 40px tall.

TITLE ROW (16px gap below)
- Left: "Scenario comparison" in 24px bold #161916.
- Subtitle: "Compare saved pipeline runs side by side. Each scenario
  captures the full state from F1 through F6." in 13px #6D7069.

THREE SCENARIO CARDS ROW (24px gap below subtitle)
- 3 equal-width cards in a horizontal row, ~360px wide × 480px tall,
  24px gap between, all top-edges aligned.
- Each card: cream fill, 12px radius, 1px #494949 12% border, 24px
  padding. The middle card (Balanced) has a coral 2px border and a
  coral STAR badge in the top-right corner (32px circle, coral fill,
  white star icon).

  Each card's structure (top to bottom):
    Header row: scenario name in 18px bold #161916, then a small meta
    "saved 2d ago" in 12px #6D7069 below the name.
    For the recommended card, add an inline pill "RECOMMENDED" beside
    the name — coral fill, white 11px caps text.
  
  16px gap, then a 5-row STAT TABLE inside the card. Each row has a
  small label in 11px caps #6D7069 and a value below in 18px bold
  #161916. 1px #494949 12% horizontal divider between rows.
    Row 1: "COST SAVING" / value
    Row 2: "HEADCOUNT DELTA" / value
    Row 3: "RISK" / value (chip-style)
    Row 4: "PAYBACK" / value
    Row 5: "TRANSITION COMPLEXITY" / value (chip-style)
  
  Bottom of card (8px gap above bottom): a full-width Load button.
  Conservative & Aggressive: outlined coral "Load" button.
  Balanced (recommended): solid coral fill, white "Loaded" label with
  check icon.

CARD 1 — CONSERVATIVE
  Header: "Conservative" + "saved 2 days ago".
  Stats: COST SAVING "13%" / HEADCOUNT DELTA "−2 (−1.7%)" / RISK chip
  "LOW" green tint / PAYBACK "M9" / TRANSITION COMPLEXITY chip "LOW"
  green tint.
  Outlined "Load" button.

CARD 2 — BALANCED (recommended, middle)
  Coral 2px border. Star badge top-right.
  Header: "Balanced" + "RECOMMENDED" pill + "saved 1 day ago".
  Stats: COST SAVING "23%" / HEADCOUNT DELTA "+3 (+2.7%)" / RISK chip
  "MED" amber / PAYBACK "M6" / TRANSITION COMPLEXITY chip "MED" amber.
  Solid coral "Loaded" button with check icon.

CARD 3 — AGGRESSIVE
  Header: "Aggressive" + "saved today".
  Stats: COST SAVING "31%" / HEADCOUNT DELTA "−8 (−7.0%)" / RISK chip
  "MED-HIGH" coral / PAYBACK "M4" / TRANSITION COMPLEXITY chip "HIGH"
  coral.
  Outlined "Load" button.

RADAR COMPARISON PANEL (24px gap below scenario cards)
- White card, 1px #494949 12% border, 12px radius, 24px padding, full
  workspace width, ~340px tall.
- Header: "Radar comparison" in 16px bold #161916.
- Helper: "How each scenario performs across 6 dimensions, normalized
  0–1." in 13px #6D7069.
- 16px gap, then split layout:
  LEFT (~50% width): a hexagonal RADAR CHART centered, ~280px diameter.
    6 axes labeled at vertices (clockwise from top): Cost, Scale,
    Agility, Transition complexity (inverted), Risk (inverted),
    Quality.
    3 overlapping polygon shapes, each translucent fill at 30% opacity:
      Conservative shape — green tint #E2EFDA + 1.5px green stroke
      Balanced shape — coral #FCE4D6 + 1.5px coral stroke
      Aggressive shape — amber #FFF0DC + 1.5px amber stroke
    Concentric grid lines at 0.25 / 0.5 / 0.75 / 1.0 in 1px #6D7069
    20% opacity.
  RIGHT (~50% width): a LEGEND + KEY DIFFERENCES panel.
    Legend rows (small color square + scenario name):
      Conservative — green
      Balanced — coral (with star)
      Aggressive — amber
    8px gap, then a sub-panel "Key differences" in 13px caps #6D7069.
    Below, 3 short bullet rows in 13px #494949:
      "• Aggressive scores highest on cost & scale, lowest on safety."
      "• Conservative best on transition simplicity & risk."
      "• Balanced is the only scenario hitting all dimensions ≥ 0.5."

NARRATIVE CALLOUT (16px gap below radar)
- Soft cream fill, 8px radius, 1px left border 3px amber, 20px padding,
  full workspace width.
- Sparkle icon in amber on the left.
- Body text in 14px #161916: "Conservative optimizes safety at the cost
  of pace. Aggressive maximizes savings but demands a high-tempo
  transition with mature AI Ops. Balanced is the recommended starting
  point — meaningful savings with manageable risk and a 6-month payback."

FOOTER ACTION ROW (24px gap below callout, right-aligned)
- Ghost "Recommend Aggressive" / "Recommend Conservative" buttons in
  #494949.
- Solid coral "Export comparison deck" with download icon, 44px tall.
  This is the primary CTA on this screen — generates the final PDF
  deck the user takes to their sponsor.

==========================================================
DELIVERABLES
==========================================================
1. The global shell update applied across every existing frame in the
   file (F1–F5 frames). Old F6 Controls removed; old F7 Timeline now
   labeled F6 in the nav.
2. Two new desktop frames at 1440x900, named "F6.1 Timeline" and
   "F6.2 Scenario comparison".

Strict adherence to the palette and Funnel Sans. No blue, no purple,
no generic stock illustrations. The phase color scale on F6.1 must be
applied consistently across the phase cards, top stripes, savings
chart segments, and any phase chips. The radar chart on F6.2 must
show three distinct, translucent overlapping polygons — not solid fills
that hide each other.