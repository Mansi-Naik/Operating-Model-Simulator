Add Feature 7 — Summary — to the Operating Model Simulator. This is a
single-screen at-a-glance recap of the entire pipeline (F1 through F6)
plus a collapsible Risk & Escalation evidence section. One desktop
frame at 1440x900, wrapped in the existing global shell.

GLOBAL SHELL UPDATE
Left nav now has 7 items:
F1 — INTAKE
F2 — ALLOCATION
F3 — ROLES
F4 — PODS
F5 — ECONOMICS
F6 — TIMELINE
F7 — SUMMARY
F7 ACTIVE on this frame: coral icon, dark "SUMMARY" label, 3px coral
left bar. F1–F6 = green check (all completed).

Footer version chips: "CONTEXT V2  MATRIX V1  ROLES V1  PODS V1
ECON V1  TIMELINE V1  SUMMARY V0  V2.4.1-STABLE"

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: primary buttons, active states, recommended badge
- Orange #FFAB28: AI sparkle, accents, advisory icons
- White #FFFFFF: background
- Cream #FDF8F4: cards
- Soft cream #FFF0DC: emphasis blocks
- Dark #161916: primary text
- Medium #494949: secondary text
- Grey #6D7069: meta, breadcrumbs
- Delta colors: green #548235 cost down; coral #FD4E59 cost up; grey
  #6D7069 neutral
- Risk severity chips: low = green tint #E2EFDA + #548235; med = soft
  cream #FFF0DC + #FFAB28; high/critical = light coral #FCE4D6 +
  #FD4E59
- 12px radius cards, 6px buttons, thin-line icons (1.5px)

==========================================================
WORKSPACE LAYOUT — TOP TO BOTTOM
==========================================================

SECTION 1 — TOP ROW
- Breadcrumb "SUMMARY" in #161916.
- Right cluster: ghost "Re-run pipeline" with refresh icon, ghost
  "Save as scenario" with bookmark icon, solid coral "Export final
  deck" with download icon, 44px tall.

TITLE BLOCK (16px gap below breadcrumb)
- Title "Recommended operating model" in 28px bold #161916.
- Subtitle: "Synthesis of all six pipeline stages. This is what you
  take to your sponsor." in 13px #6D7069.

SECTION 2 — HEADLINE SCENARIO BANNER (24px gap below title)

A full-workspace-width banner card. Soft cream #FFF0DC fill, 12px
radius, 1px left border 4px coral, 24px padding, ~140px tall.

Layout: horizontal split, 60/40.

LEFT SIDE (~60%):
- Small label "RECOMMENDED SCENARIO" in 11px caps amber.
- 4px gap, scenario name "Balanced" in 32px bold #161916, with a
  coral star badge inline (24px circle, white star).
- 4px gap, one-line tagline in 14px #494949: "Industry-benchmark span,
  meaningful cost reduction, manageable transition risk."

RIGHT SIDE (~40%):
- 4 mini-stats in a 2x2 grid, each with a label in 11px caps #6D7069
  and value in 18px bold #161916:
  Top-left: "COST SAVING" / "−22.9%" (green delta)
  Top-right: "PAYBACK" / "M6"
  Bottom-left: "HEADCOUNT Δ" / "+3 (+2.7%)"
  Bottom-right: "RISK PROFILE" / chip "MED" amber

SECTION 3 — WHAT CHANGES (24px gap below banner)

Section header: "What changes" in 18px bold #161916.
Helper: "How the operating model evolves from today to the future
state." in 13px #6D7069.

16px gap, then a 3-card row showing the F2/F3/F4 highlights side by
side. Equal width (~360px each), 16px gap, ~220px tall, all cream
cards with 12px radius, 1px #494949 12% border, 20px padding.

CARD A — ALLOCATION (links to F2)
- Top label "FROM F2 ALLOCATION" in 11px caps #6D7069.
- Big value row: "62%" in 32px bold #161916 + label "of work-hours
  shifted to AI-assisted or automated" in 13px #494949 (wraps to 2
  lines).
- 12px gap, then a horizontal mini stacked-bar:
  Track 16px tall, 9999px radius, divided into 3 segments by allocation:
    HUMAN: 38% width, grey #6D7069 fill
    ASSISTED: 42% width, amber #FFAB28 fill
    AUTOMATED: 20% width, green #548235 fill
- Below the bar, 3 small legend chips: "Human 38%", "Assisted 42%",
  "Automated 20%" in 11px.
- Bottom right of card: link "View F2 →" in coral 12px.

CARD B — ROLES (links to F3)
- Top label "FROM F3 ROLES" in 11px caps #6D7069.
- Big value row: "1 transformation, 1 emergent role" in 22px bold
  #161916 (wrap to 2 lines if needed).
- 12px gap, then a small stacked role-pattern legend, 4 rows:
    Green dot + "Agent: minor evolution"
    Blue dot + "TL: meaningful shift"
    Amber dot + "QA Officer: transformation"
    Coral plus icon + "AI Output Auditor (new)"
  Each row 22px tall, 12px label.
- Bottom right of card: link "View F3 →" in coral.

CARD C — PODS (links to F4)
- Top label "FROM F4 PODS" in 11px caps #6D7069.
- Big value row: "8 pods · 1:12 span" in 28px bold #161916.
- 12px gap, then a tiny org-rollup glyph: 1 small Unit Head rectangle
  on top (coral fill), 4 small pod rectangles below in a row, plus an
  abbreviated "+4 more" stacked rectangle. All proportional, 80px
  tall maximum.
- Bottom row: meta "Total headcount: 116 (+3 vs today)" in 12px
  #494949.
- Bottom right of card: link "View F4 →" in coral.

SECTION 4 — ECONOMICS + TIMELINE STRIP (24px gap below 3-card row)

Two cards side by side, ~50/50 split, 16px gap, ~200px tall, white
fill, 1px #494949 12% border, 12px radius, 20px padding.

CARD D — ECONOMICS (links to F5)
- Top row: label "FROM F5 ECONOMICS" in 11px caps #6D7069 + small
  ILLUSTRATIVE chip on the right (dashed amber border, transparent
  fill, 11px caps amber).
- 8px gap, then 3 horizontal mini-stats separated by 1px vertical
  dividers:
    "MONTHLY COST: $412k → $318k" with green −22.9% delta below
    "COST/ITEM: $0.275 → $0.21" with green −22.9% delta
    "OVERHEAD: 18.5% → 12.0%" with green −6.5pp delta
- 12px gap, then a tiny inline savings sparkline (the S-curve from F5
  in compressed form, ~40px tall) with payback marker "M6".
- Bottom right: link "View F5 →" in coral.

CARD E — TIMELINE (links to F6)
- Top row: label "FROM F6 TIMELINE" in 11px caps #6D7069.
- 8px gap, then a horizontal stacked phase bar, full card width, 24px
  tall, 9999px radius, 4 segments colored by phase scale (green tint,
  amber, light coral, deep coral). Each segment shows its cumulative
  savings inside in 11px caps text. Widths proportional: 3% / 6% / 9%
  / 5%.
- Below the bar, x-axis tick labels: "P1: 3%", "P2: 9%", "P3: 18%",
  "P4: 23%" in 12px #6D7069.
- 8px gap, then a meta line: "9-month rollout · payback at Month 6 ·
  2 quick wins front-loaded" in 13px #494949.
- Bottom right: link "View F6 →" in coral.

SECTION 5 — RISK & ESCALATION (COLLAPSIBLE)

24px gap below the Economics+Timeline strip.

This section is COLLAPSED BY DEFAULT and rendered as a banner. When
expanded, it reveals the Risk × Control matrix and the redesigned
Escalation flow. Render the COLLAPSED state in this frame, with a
small inset preview showing what would appear when expanded (so the
user knows what to expect when they click).

COLLAPSED BANNER (full workspace width, 64px tall, soft cream #FFF0DC
fill, 12px radius, 1px left border 4px amber, 24px padding):
- Left side: shield icon in amber + label "Risk & Escalation
  evidence" in 16px medium #161916 + small body text "Governance
  score: STRONG · Preventive 100% · Detective 92% · 1 advisory" in
  13px #494949.
- Right side: a TOGGLE BUTTON labeled "Show details ▾" in coral
  outlined style, 36px tall, with chevron-down icon. (When clicked,
  rotates to "Hide details ▴" and the section below expands.)

EXPANDED PREVIEW (rendered BELOW the collapsed banner with a slight
visual hint that this is what would appear — use 60% opacity on the
expanded content to indicate "preview state"):

The expanded section contains TWO sub-blocks side by side, 50/50
split, 16px gap.

EXPANDED BLOCK 1 — RISK × CONTROL MATRIX (left)
White card, 1px #494949 12% border, 12px radius, 20px padding.
- Header: "Risk × Control matrix" in 14px bold.
- Sub-header strip with 3 KPIs separated by vertical dividers:
  "PREVENTIVE 100%" green / "DETECTIVE 92%" amber / "REGULATORY 100%"
  green. Each in 11px caps with the percentage in 18px bold below.
- 12px gap, then the matrix itself — a compact table:
  Column headers: RISK | PREV | DET | CORR (11px caps #6D7069)
  5 rows:
    "CSAM" + chip "CRIT" coral | "✓ 2" | "✓ 1+1 NEW" | "✓ 1"
    "Violent extremism" + chip "CRIT" coral | "✓ 2" | "✓ 1" | "✓ 1"
    "Self-harm content" + chip "HIGH" amber | "✓ 1" | "✓ 1" | "—"
    "Hate speech" + chip "HIGH" amber | "✓ 1" | "⚠ 1 only" coral text
        | "—"  ← row has a faint coral background tint to flag the gap
    "Spam / low-quality" + chip "LOW" grey | "✓ 1 AUTO" | "✓ 1 AUTO"
        | "—"
- 8px gap, helper text: "Click any cell to see the controls in detail
  and accept proposed additions." in 12px italic #6D7069.

EXPANDED BLOCK 2 — REDESIGNED ESCALATION FLOW (right)
White card, same styling.
- Header: "Escalation flow — today vs future" in 14px bold.
- 12px gap, then a side-by-side flow comparison, 50/50 split with a
  vertical 1px divider:

  LEFT half "TODAY" (label in 11px caps #6D7069):
    Vertical flow with arrows showing time labels next to arrows:
    [Item] → [Agent] →(15m) [TL] →(60m) [QA Off] → [Unit Head]
    Each role node: 80x32px, soft cream fill, 1px grey border, 6px
    radius.

  RIGHT half "FUTURE" (label in 11px caps coral):
    [Item] → [AI pre-triage] → (5m, conf<80%) [Agent] → (15m) [TL]
    → (60m) [QA Off] → [Unit Head]
    Plus a parallel branch from QA Off across to a new node "AI
    Output Auditor" connected with a 1.5px dashed coral line.
    AI nodes are visually distinct: hexagonal shape (or coral-bordered
    rounded rectangle if hexagons are tricky), coral 1.5px outline,
    small sparkle icon inside.
    Human role nodes: same 80x32px rounded rectangles as the TODAY
    side.

- 8px gap below the flow: small diff summary in 12px #494949: "1 new
  AI pre-triage node · 1 new role (AI Output Auditor) handling
  low-confidence flags."

WELLNESS / DOMAIN ADVISORY (below the two expanded blocks, full
expanded-section width, 16px gap above)
Soft cream #FFF0DC fill, 8px radius, 1px left border 3px amber, 16px
padding:
- Amber alert icon on the left.
- Body text in 13px #161916: "IMPORTANT — Agents in the future state
  see disproportionately more disturbing content because routine
  items are auto-handled. Increase wellness check cadence from
  bi-weekly to weekly. Already factored into F5 economics."

SECTION 6 — FINAL ACTION ROW (24px gap below the collapsible section)

A simple right-aligned action row:
- Ghost link "Edit any stage" with pencil icon — opens a small popover
  with links to F1 through F6.
- Ghost button "Save as scenario" with bookmark icon.
- Solid coral primary CTA "Export final deck" with download icon, 48px
  tall, 24px horizontal padding. This is THE button — visually
  weighted as the most important on the page.

==========================================================
INTERACTION NOTES
==========================================================
- The "Show details ▾" button in Section 5 toggles the expanded preview
  from 60% opacity to full opacity. When expanded, the chevron flips
  and label becomes "Hide details ▴". The page extends in height to
  accommodate the expanded content.
- Each "View F[N] →" link in the cards navigates back to that feature
  for editing. If anything is edited downstream, the summary is marked
  stale (small amber dot next to "SUMMARY" in the nav).
- Clicking any cell in the expanded Risk × Control matrix opens the
  F6.2 control detail drawer — same pattern as the original F6.

==========================================================
DELIVERABLE
==========================================================
1 desktop frame at 1440x900, named "F7 Summary".

The expanded Risk & Escalation section should be rendered AT 60%
OPACITY directly below the collapsed banner so the frame demonstrates
both states in a single image — collapsed state above, expanded
preview below. This makes the show/hide pattern immediately obvious
to anyone reviewing the design.

Strict adherence to the palette and Funnel Sans. No blue, no purple,
no generic stock illustrations. The recommended scenario banner must
be the visual anchor of the page — biggest, most prominent element.
The "Export final deck" button must be the most visually weighted CTA
on the entire screen.