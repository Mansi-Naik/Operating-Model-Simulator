Design the complete Feature 4 — Pod Structure — for the Operating Model
Simulator. Render three desktop frames at 1440x900 px each, all wrapped
in the previously designed global shell (top header, left navigation rail
F1–F7, footer status bar).

IMPORTANT — UPDATE THE LEFT-NAV FEATURE NAMES
On every frame in this feature, the left navigation rail must show all 7
feature labels in 11px caps under each icon:
  F1 — INTAKE
  F2 — ALLOCATION
  F3 — ROLES
  F4 — PODS
  F5 — ECONOMICS
  F6 — CONTROLS
  F7 — TIMELINE
F4 is the ACTIVE feature on every frame in this set: icon stroked in
#FD4E59, label "PODS" in #161916, and a 3px coral left bar pinned to the
left edge of the F4 button.
F1, F2, F3 should show as completed (green check next to icon).
F5 should show as in-progress (small filled dot).
F6 and F7 should show as locked (lock icon at 60% opacity).

DESIGN SYSTEM (apply on every frame)
- Font: Funnel Sans, all weights
- Primary (coral red) #FD4E59 — buttons, active states, key icons,
  recommended badge
- Secondary (warm orange) #FFAB28 — accents, AI sparkle markers,
  amber risk badges
- Background #FFFFFF
- Card background #FDF8F4 — warm off-white for cards, panels, drawers
- Muted background #FFF0DC — soft cream for emphasis blocks, info banners
- Text/borders dark #161916 — primary text and borders
- Text/borders medium #494949 — secondary text, dividers
- Accent gray #6D7069 — meta text, breadcrumb separators, disabled states
- Risk level colors:
    low = green tint #E2EFDA fill, dark green #548235 text
    med = #FFF0DC fill, #FFAB28 text
    med-high = #FCE4D6 fill, #FD4E59 text
    high = #FCE4D6 fill, #FD4E59 text bold
- Rounded corners: 12px on cards, 8px on inline panels, 6px on buttons,
  4px on inputs
- Subtle card shadow 0 1px 2px rgba(22,25,22,0.04)
- Iconography: thin-line icons (1.5px stroke), 24px default
- Type scale: 32 / 24 / 18 / 15 / 13 px

GLOBAL SHELL CONTEXT (present on every frame, do not omit)
- Top header bar: 56px tall, white, bottom 1px border #494949 at 10%.
  Logo + "OPERATING MODEL SIMULATOR" wordmark in 13px caps #161916,
  vertical divider, client name "Acme Corp" in #FD4E59 15px.
  Right side: help, settings, notifications bell with coral dot, avatar.
- Left nav rail: 64px wide, white, right 1px border at 10%. Vertical
  list F1–F7 with the labels above. F4 ACTIVE.
  Bottom of rail: SAVE and EXPORT icons.
- Footer status bar: 32px tall, dark #161916 background, white 11px
  monospace text. Left: green dot + "SYSTEM ENGINE: ACTIVE" + last saved
  time. Right: "CONTEXT V2  MATRIX V1  ROLES V1  PODS V0  V2.4.1-STABLE".

==================================================================
FRAME 1 — F4.1 VARIANT SELECTOR (PRIMARY)
==================================================================
The main F4 screen. A constraint controls bar at the top, three pod
variant cards side-by-side, and action buttons below. Use full workspace
width (~1140px).

Workspace content:
- Top row: breadcrumb "PODS" in #161916. Right-aligned: two icon buttons
  "Re-run" (with refresh icon) and a settings gear, both ghost style in
  #494949.
- 16px gap, then workspace title "Pod structure" in 24px bold #161916
  with subtitle "AI-synthesized team shape and span of control. Adjust
  constraints to explore variants." in 13px #6D7069.

- 24px gap, then a CONSTRAINTS BAR (a card-like container, full workspace
  width, #FDF8F4 fill, 12px radius, 1px #494949 12% border, 24px padding):
    Header label inside: "CONSTRAINTS" in 11px caps #6D7069.
    8px gap, then a single horizontal row of 5 controls with 24px
    spacing between each:
      Control 1 — "Risk profile" label in 12px #494949 above a dropdown
      "HIGH" with chevron-down. Dropdown 36px tall, white fill, 1px
      #494949 30% border, 6px radius, 14px medium #161916 value.
      Control 2 — "Target span" label above an input "<= 12" with
      slider variant. 36px tall.
      Control 3 — "Max pod size" label above a number input "20".
      Control 4 — "Must include" label above a multi-select chip area
      with two pre-filled chips "TL" and "QA Officer" — chips have
      #FFFFFF fill, 1px #FD4E59 border, X icon to remove, 28px tall.
      Control 5 — "Shared support" label above two pre-filled chips
      "SME" and "AI Ops" — same chip styling.

- 24px gap, then a VARIANT GRID — three equal-width cards side by side,
  24px gap between, each ~360px wide × 480px tall.
  Each card: #FDF8F4 fill, 12px radius, 1px #494949 12% border, 24px
  internal padding. The BALANCED card (middle) has a 2px #FD4E59 border
  and a coral star badge in the top-right corner.

  CARD 1 — CONSERVATIVE
    Top row: variant name "CONSERVATIVE" in 16px bold #161916, 11px
    uppercase letter-spaced.
    
    16px gap, then a POD VISUAL — a centered mini org chart, 220px tall:
      Top: a single rectangle "TL" — 80px wide × 40px tall, #FD4E59 fill,
      white text, 6px radius, centered horizontally.
      Vertical 2px #6D7069 line below TL, 24px tall.
      Below: a horizontal stack of 8 agent boxes — each 28px wide × 32px
      tall, #FFF0DC fill, 1px #6D7069 border, 4px radius, 4px gap between.
      Above the agent stack, on the right side, a small label "8" in
      14px medium #161916.
      
      Below the agent row, 16px gap, then 3 dotted-line connectors going
      out to small support role boxes (placed below the main pod):
        "0.5 QA" — 64px × 28px, #FDF8F4 fill, 1px dashed #6D7069 border,
        4px radius, 12px text.
        "0.25 AI Auditor" — same styling, slightly wider.
        "0.2 SME" — same styling.
      Connectors are 1px dashed #6D7069 lines.
    
    16px gap, then a STATS GRID (2x2):
      Stat 1 — label "SPAN" in 11px caps #6D7069, value "1:8" in 18px
      bold #161916.
      Stat 2 — label "CAPACITY/DAY" in 11px caps #6D7069, value "4,500"
      in 18px bold #161916.
      Stat 3 — label "COST INDEX" in 11px caps #6D7069, value "1.05" in
      18px bold #161916.
      Stat 4 — label "RISK" in 11px caps #6D7069, then a chip "LOW" with
      green-tint fill #E2EFDA and dark green #548235 text, 11px caps.
    
    16px gap, then a NARRATIVE block in italic 13px #494949:
      "Tight span, high support density. Best when regulated or early
       in transition before AI maturity is proven."
    
    Bottom of card: full-width outlined "Select" button — 1.5px #FD4E59
    border, label in #FD4E59, transparent fill, 40px tall.

  CARD 2 — BALANCED (recommended, middle position)
    Coral 2px border around the entire card.
    Coral star badge in top-right corner: a 32px circle with #FD4E59
    fill, white star icon centered.
    
    Top row: variant name "BALANCED" in 16px bold #161916, then a small
    pill chip "RECOMMENDED" — #FD4E59 fill, white text, 11px caps,
    24px tall, 8px horizontal padding.
    
    Pod visual structure same as Card 1 but:
      TL box on top.
      Below: 12 agent boxes in a stack (use a 6+6 wrapped layout if
      they don't fit in one row at this card width).
      Above the stack, label "12" in 14px medium #161916.
      Support roles as dotted-line connectors:
        "0.4 QA"
        "0.3 AI Auditor"
        "0.15 SME"
    
    Stats:
      SPAN "1:12"
      CAPACITY/DAY "6,800"
      COST INDEX "1.00"
      RISK chip "MED" — #FFF0DC fill, #FFAB28 text
    
    Narrative:
      "Industry benchmark midpoint for safety work. Recommended default
       — balances cost, risk, and supervisory load."
    
    Bottom button: solid #FD4E59 fill, white label "Selected", check
    icon left of label, 40px tall. (This card is the currently selected
    variant.)

  CARD 3 — AGGRESSIVE
    Top row: variant name "AGGRESSIVE" in 16px bold #161916.
    
    Pod visual:
      TL box on top.
      Below: 18 agent boxes (use 9+9 wrapped layout).
      Label "18" in 14px medium #161916.
      Support roles:
        "0.3 QA"
        "0.4 AI Auditor"  (note: this is HIGHER than other variants —
        intentional; aggressive variant leans on AI ops more)
        "0.1 SME"
    
    Stats:
      SPAN "1:18"
      CAPACITY/DAY "10,200"
      COST INDEX "0.85"
      RISK chip "MED-HIGH" — #FCE4D6 fill, #FD4E59 text
    
    Narrative:
      "Wide span, lean support. Best when AI confidence is consistently
       high. Requires mature AI Ops to manage exception load."
    
    Bottom button: outlined "Select" — same as Card 1.

- 24px gap, then a FOOTER ACTION ROW (full workspace width, no card):
    Left: ghost button "Show math" with calculator icon — opens F4.3
    drawer.
    Right: solid #FD4E59 button "View org rollup" with arrow-right icon,
    44px tall.

==================================================================
FRAME 2 — F4.2 ORG ROLLUP VIEW
==================================================================
Full-screen visualization of the total org under the selected variant.
This is the "screenshot for the deck" moment, so prioritize visual
impact and clarity.

Workspace content:
- Top row: ghost link "← Back to variants" in #494949 with chevron-left.
- 16px gap, then title row:
    Left: "Org rollup" in 28px bold #161916, then a chip "BALANCED
    VARIANT" — #FD4E59 fill, white text, 11px caps, 28px tall.
    Right: ghost button "Show math" with calculator icon, then solid
    #FD4E59 "Export org chart" with download icon.

- 32px gap, then the ORG VISUAL inside a large card filling the workspace
  width: #FDF8F4 fill, 12px radius, 1px #494949 12% border, 32px padding.

  Org structure (rendered as a clean tree):

  TOP LEVEL — single node:
    "[Unit Head]" — a rounded rectangle, 120px wide × 48px tall,
    #FD4E59 fill, white text 16px medium, 8px radius, centered
    horizontally at top.

  CONNECTOR — a 2px #6D7069 vertical line from Unit Head down 32px,
  then branching horizontally.

  SECOND LEVEL — 8 POD NODES in a horizontal row:
    Each pod is a rounded rectangle 100px wide × 80px tall, #FFF0DC
    fill, 1px #FD4E59 border, 8px radius, with stacked content:
      Top: "POD N" label in 11px caps #6D7069 (POD 1, POD 2, … POD 8).
      Middle: a small mini-pod glyph (a small TL rectangle with 12 tiny
      dots underneath representing agents).
      Bottom: "TL + 12 + s" in 12px #161916, where "s" is shorthand for
      shared support.
    
    Pods are spaced evenly with 16px between. Connecting lines from
    Unit Head branch out to all 8 pods.
    
    If there's not room for all 8 pods at full size, render the first 4
    explicitly (POD 1 through POD 4) and a stack-icon abbreviation for
    "POD 5..8" as the fifth visual element with a "+4 more" label.

- 24px gap below the org tree, then a SUPPORT LAYER section:
    Section label: "SUPPORT LAYER (shared across pods)" in 11px caps
    #6D7069.
    8px gap, then 4 SUPPORT ROLE CARDS in a horizontal row, each 200px
    wide × 96px tall:
      Each card: #FFFFFF fill, 1px #494949 12% border, 8px radius,
      16px padding.
      Layout: small icon top-left in #FFAB28, role name in 14px medium
      #161916, headcount stat in 24px bold #161916 right-aligned.
    
    Card 1 — "Central QA" with x2
    Card 2 — "AI Ops" with x3
    Card 3 — "SME" with "shared" (italic, no number)
    Card 4 — "WFM" with x1

- 24px gap, then a SUMMARY STAT STRIP (full workspace width, divided
  into 3 horizontal sections by 1px #494949 20% vertical dividers):
    Section 1 — "TOTAL HEADCOUNT" in 11px caps #6D7069, value "116" in
    32px bold #161916.
    Section 2 — "TODAY" in 11px caps #6D7069, value "113" in 24px bold
    #6D7069.
    Section 3 — "DELTA" in 11px caps #6D7069, value "+3 (+2.7%)" in
    24px bold #548235 (green for positive — explain visually it's
    headcount-neutral).

- 24px gap, then a VOLUME SENSITIVITY panel:
    Inside a #FDF8F4 card, 12px radius, 1px #494949 12% border, 24px
    padding.
    Header: "Volume sensitivity" in 16px bold #161916.
    8px gap, helper line: "Adjust target volume to see how the pod
    count scales." in 13px #6D7069.
    16px gap, then a slider with two anchored markers:
      Slider track 6px tall, #FFF0DC fill, 9999px radius, 800px wide.
      Filled portion in #FD4E59 from left up to ~50% mark.
      A round draggable handle 24px diameter at the current position.
      Above the track, two annotation dots:
        At 0% position: "Today: 8 pods" label in 13px medium #161916.
        At ~62% position (1.5x volume mark): "+50%: 12 pods" in 13px
        medium #161916.
    Below the slider, three discrete tick marks with labels:
      "0.5x | 4 pods", "1x (today) | 8 pods", "1.5x | 12 pods", "2x |
      16 pods".

==================================================================
FRAME 3 — F4.3 SHOW MATH DRAWER
==================================================================
Render the F4.1 variant selector view in the background (slightly dimmed
with a 30% black overlay), with a side drawer sliding in from the right
that reveals the math behind the pod structure.

Drawer specs:
- Width 520px, full height below header, white background, left 1px
  border #494949 at 12%, slide-in animation hint (subtle shadow on left
  edge).
- 24px padding throughout.

Drawer content (top to bottom):

1. CLOSE ROW
   - Right-aligned X close icon in #6D7069.

2. DRAWER HEADER
   - Title "Show math — Balanced variant" in 20px bold #161916.
   - 4px gap, subtitle "Every calculation that produced this pod
     structure, traceable back to your inputs." in 13px #494949.

3. CALCULATION SECTION 1 — POD COMPOSITION
   - Section label "1. POD COMPOSITION" in 11px caps #FD4E59.
   - 8px gap, formula block inside a #FDF8F4 card, 8px radius, 16px
     padding:
       Line 1: "Agents per pod" in 13px medium #161916.
       Line 2 (12px monospace #494949): "= min(target_span,
       max_pod_size, derived_from_volume)"
       Line 3: "= min(12, 20, 12.4)  →  12 agents" in 13px
       monospace #161916 with the result "12 agents" in #FD4E59 bold.
       Line 4 (small italic): "↳ Drove from your engagement volume of
       50,000/day and TL coaching capacity of 6.5 hrs/agent/week."

4. CALCULATION SECTION 2 — QA SAMPLING
   - Section label "2. QA SAMPLING MATH" in 11px caps #FD4E59.
   - 8px gap, formula block:
       "QA per pod = (audits/day × time per audit) / QA capacity"
       "= (24 audits × 6 min) / (6.5 hrs × 60 min)"
       "= 0.37 FTE  →  0.4 QA"
       Italic note: "↳ Sampling rate 10% from your KPI sheet × 12 agents
       × items/agent."

5. CALCULATION SECTION 3 — SPAN OF CONTROL DERIVATION
   - Section label "3. SPAN OF CONTROL" in 11px caps #FD4E59.
   - 8px gap, formula block with a small lookup table:
       "Risk profile lookup:"
       Row 1: "low risk     → 1:18 to 1:25"
       Row 2: "medium risk  → 1:12 to 1:18"
       Row 3: "high risk    → 1:8 to 1:12"
       Highlighted row (background #FFF0DC, 1px #FFAB28 left border):
       "Your risk profile is HIGH → recommended span 1:12 (max)"

6. CALCULATION SECTION 4 — POD COUNT
   - Section label "4. POD COUNT" in 11px caps #FD4E59.
   - 8px gap, formula block:
       "Pods needed = total volume / pod capacity"
       "= 50,000 items/day / 6,800 items/day per pod"
       "= 7.35  →  ceiling = 8 pods"

7. INPUT TRACEABILITY (24px gap)
   - Section label "INPUTS USED" in 11px caps #6D7069.
   - 8px gap, a small 2-column key-value list (label in 12px #6D7069,
     value in 13px #161916, with a small link icon to jump back to F1):
       "Volume / day" — "50,000" — link icon
       "Risk profile" — "HIGH" — link icon
       "QA sampling rate" — "10%" — link icon
       "Items per agent (derived)" — "~340/day" — link icon
       "Coaching capacity (TL)" — "6.5 hrs/wk per agent" — link icon

8. DRAWER FOOTER (sticky at bottom, 1px top border #494949 12%, 16px
   padding)
   - Left: ghost "Copy math to clipboard" button.
   - Right: solid #FD4E59 "Close" button.

==================================================================
DELIVERABLES
==================================================================
- Three 1440x900 desktop frames, named clearly:
  "F4.1 Variant selector", "F4.2 Org rollup", "F4.3 Show math drawer".
- All three frames must wrap the global shell with F4 ACTIVE in the left
  nav, labelled "PODS". F1, F2, F3 show as completed; F5 as in-progress;
  F6 and F7 locked.
- The pod visuals in F4.1 must be visually clean, using consistent
  geometric shapes — TL on top, agents stacked below, dotted lines to
  support roles. This is one of the two key "screenshot for the deck"
  moments, so prioritize legibility.
- The org tree in F4.2 must be visually impressive but readable. If 8
  pods don't fit comfortably side-by-side, abbreviate as "POD 1, POD 2,
  POD 3, POD 4, +4 more" with a stack icon.
- Strict adherence to the color palette and Funnel Sans font. Do not
  introduce any other colors, fonts, or illustration styles. Do not use
  generic blue or purple highlights.