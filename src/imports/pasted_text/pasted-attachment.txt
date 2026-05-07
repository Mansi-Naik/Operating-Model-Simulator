Design the complete Feature 3 — Future Role Definitions — for the
Operating Model Simulator. Render four desktop frames at 1440x900 px each,
all wrapped in the previously designed global shell (top header, left
navigation rail F1–F7, footer status bar).

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
F3 is the ACTIVE feature on every frame in this set: icon stroked in
#FD4E59, label "ROLES" in #161916, and a 3px coral left bar pinned to
the left edge of the F3 button.
F1 and F2 should show as completed (green check next to icon).
F4 and F5 should show as in-progress dots.
F6 and F7 should show as locked (lock icon at 60% opacity).

DESIGN SYSTEM (apply on every frame)
- Font: Funnel Sans, all weights
- Primary (coral red) #FD4E59 — buttons, active states, key icons,
  destructive actions
- Secondary (warm orange) #FFAB28 — accents, AI sparkle markers,
  amber pattern badges
- Background #FFFFFF
- Card background #FDF8F4 — warm off-white for cards, panels, drawers
- Muted background #FFF0DC — soft cream for emphasis blocks, info banners
- Text/borders dark #161916 — primary text and borders
- Text/borders medium #494949 — secondary text, dividers
- Accent gray #6D7069 — meta text, breadcrumb separators, disabled states
- Pattern badge colors:
    minor evolution = green tint #E2EFDA fill, dark green #548235 text
    meaningful shift = blue tint #DEEBF7 fill, blue #2E75B6 text
    transformation = #FFF0DC fill, #FFAB28 text
    redefinition = #FCE4D6 fill, #FD4E59 text
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
  list F1–F7 with the labels above. F3 ACTIVE.
  Bottom of rail: SAVE and EXPORT icons.
- Footer status bar: 32px tall, dark #161916 background, white 11px
  monospace text. Left: green dot + "SYSTEM ENGINE: ACTIVE" + last saved
  time. Right: "CONTEXT V2  MATRIX V1  ROLES V0  V2.4.1-STABLE".

==================================================================
FRAME 1 — F3.0 PRE-RUN / FIRST VISIT
==================================================================
A configuration screen the user sees on first arrival to F3 before any
role redesigns have been generated. Compact splash with a preview of
what the AI will produce.

Workspace content (centered, max-width 720px):
- Breadcrumb: "ROLES" in #161916.
- Workspace title: "Generate future role definitions" in 28px bold #161916.
- 16px gap, then a paragraph in 15px #494949:
  "Based on your allocation matrix, we'll redesign each role for the
   future state — what they keep, lose, gain — and identify any new
   roles needed."
- 32px gap, then an illustrative graphic block (200px tall) showing
  four stylized role cards in a 2x2 mini-grid, each with a small badge
  in different pattern colors (green, blue, amber, green again).
- 32px gap, then a "WHAT WE'LL FIND" preview panel inside a #FDF8F4
  card, 12px radius, 1px #494949 12% border, 24px padding:
    Header: "Preview from your matrix" in 13px caps #6D7069.
    8px gap, then a small list of role-pattern predictions, each row
    36px tall with a colored dot left of the text:
      • Green dot — "Agent: minor_evolution"
      • Blue dot — "TL: meaningful_shift"
      • Amber dot — "QA Officer: transformation"
      • Green dot — "Unit Head: minor_evolution"
    1px divider #494949 12% above the next line:
      • Sparkle icon in #FFAB28 — "Estimated emergent roles: 1"
- 24px gap, then a meta line: "Estimated generation time: ~30 seconds"
  in 13px #6D7069 with a clock icon.
- 32px gap, then a centered primary button "Generate redesigns" — solid
  #FD4E59, white label, sparkle icon left of label, 48px tall, 24px
  horizontal padding.

==================================================================
FRAME 2 — F3.1 ROLE CARDS GRID (PRIMARY)
==================================================================
The main F3 overview screen. A grid of cards, one per existing role,
plus a separate emergent-roles section below.

Workspace content (full workspace width ~1140px):
- Top row: breadcrumb "ROLES" in #161916. Right-aligned: two icon
  buttons "Re-run" (with refresh icon) and a settings gear, both
  ghost style in #494949.
- 16px gap, then workspace title "Future role definitions" in 24px bold
  #161916 with subtitle "4 roles redesigned · 1 emergent role suggested"
  in 13px #6D7069.

- 24px gap, then a SECTION HEADER row:
  Left: "Existing roles, redesigned" in 16px bold #161916.
  Right: ghost link "Sort by impact" with chevron-down in #6D7069.

- 16px gap, then a 2x2 GRID of ROLE CARDS, 32px gap between cards.
  Each card: 528px wide × 220px tall, #FDF8F4 fill, 12px radius, 1px
  #494949 12% border, 24px internal padding. Hover state: 1px #FD4E59
  border (render hover on the TL card to demonstrate).

  CARD 1 — AGENT (minor evolution):
    Top row: role title "Agent" in 20px bold #161916, right-aligned
    pattern badge "MINOR EVOLUTION" — green-tint fill #E2EFDA, dark
    green #548235 text, 11px caps, 24px tall pill.
    16px gap, then two stat blocks side by side:
      Stat A — label "TIME FREED" in 11px caps #6D7069, value "12%"
      in 32px bold #161916, small thin bar below in #FFF0DC track with
      green fill, 12% wide.
      Stat B — label "FEASIBILITY" in 11px caps #6D7069, value "88%"
      in 32px bold #161916, small thin bar with green fill, 88% wide.
    Bottom: right-aligned link "View redesign →" in #FD4E59 with arrow.

  CARD 2 — TL (meaningful shift) [HOVER STATE]:
    Same layout as Card 1.
    Pattern badge "MEANINGFUL SHIFT" — blue-tint fill #DEEBF7, blue
    #2E75B6 text, 11px caps.
    Time freed "32%" with amber fill bar.
    Feasibility "72%" with amber fill bar.
    1px #FD4E59 border (hover state).

  CARD 3 — QA OFFICER (transformation):
    Pattern badge "TRANSFORMATION" — #FFF0DC fill, #FFAB28 text, 11px caps.
    Time freed "62%" with #FD4E59 (red) fill bar (because it's high).
    Feasibility "45%" with #FD4E59 fill bar (because it's low).
    Above the "View redesign" link, a small inline meta in 12px #FFAB28
    bold: "✨ NEW TITLE PROPOSED" with sparkle icon.

  CARD 4 — UNIT HEAD (minor evolution):
    Pattern badge "MINOR EVOLUTION" — green-tint.
    Time freed "8%" with green fill bar.
    Feasibility "95%" with green fill bar.

- 32px gap, then EMERGENT ROLES SECTION:
  Section header row:
    Left: "Emergent roles" in 16px bold #161916, then a small count
    pill "1" in #FFAB28 fill, white text.
    Right: 13px #6D7069 helper text "New roles suggested by the AI
    based on unowned future work."

  16px gap, then ONE EMERGENT ROLE CARD, full workspace width:
    Background #FFF0DC, 12px radius, 1px left border 4px #FFAB28,
    24px padding. Distinct visually from existing-role cards.
    
    Top row: small chip "NEW" in #FFAB28 fill, white text, 11px caps,
    then title "AI Output Auditor" in 20px bold #161916.
    
    8px gap, then a meta row of 2 chips separated by vertical 1px
    divider:
      "Headcount: 1.5 FTE"
      "Sits under: QA Officer"
    Chips in 13px #494949 with #FFFFFF fill, 1px #494949 12% border.
    
    16px gap, then "Why needed" label in 11px caps #6D7069, followed
    by body text in 14px #161916: "Auto-QA covers 40% of audit volume
    but requires human validation on low-confidence flags. Currently
    unowned in your hierarchy."
    
    16px gap, bottom action row right-aligned:
      Ghost "Reject" button (label in #FD4E59, no border).
      Solid #FD4E59 "View detail" button with arrow-right icon.

==================================================================
FRAME 3 — F3.2 ROLE DETAIL (SIDE-BY-SIDE CURRENT VS FUTURE)
==================================================================
Most important screen in F3. Two columns showing the role today vs the
redesigned future. Use TL as the example role (meaningful_shift pattern).

Workspace content (full workspace width):
- Top row: ghost link "← Back to roles grid" in #494949 with chevron-left.
- 16px gap, then title row:
    Left: "TL" in 28px bold #161916, then pattern badge "MEANINGFUL
    SHIFT" — blue-tint fill, blue text — beside the title.
    Right cluster: ghost button "Show source data" with eye icon,
    ghost button "Export role spec" with download icon, primary
    outlined button "Edit redesign" in #FD4E59.

- 24px gap, then a TWO-COLUMN side-by-side comparison (32px gutter,
  equal width). Each column is wrapped in its own card.

LEFT COLUMN — "TODAY: TL"
Card: #FDF8F4 fill, 12px radius, 1px #494949 12% border, 24px padding.
  Card header: pill chip "TODAY" in #FFFFFF fill, #6D7069 text,
  11px caps; right-aligned meta "Current state" in 12px #6D7069.
  16px gap, "TL" role title repeated in 18px bold #161916.
  
  TIME SPLIT BLOCK (16px gap):
    Sub-header "Time split" in 13px caps #6D7069.
    8px gap, then a 160px circular DONUT CHART centered, with these
    segments rendered cleanly using the spec colors:
      Coaching        35%  #FD4E59
      Exception rev   30%  #FFAB28
      Reporting       20%  #6D7069
      Meetings        15%  #FFF0DC outlined
    Below the donut, a legend with 4 rows: colored dot, label, percent
    in 13px #161916.
  
  TOP TASKS BLOCK (24px gap, 1px top divider #494949 12%):
    Sub-header "Top tasks" in 13px caps #6D7069.
    8px gap, then a list of 3 tasks. Each row 32px tall with bullet
    dot in #6D7069:
      • Coach agent on missed audit
      • Resolve agent escalation
      • Compile daily quality report
  
  SKILLS BLOCK (24px gap, 1px top divider):
    Sub-header "Skills" in 13px caps #6D7069.
    8px gap, then a vertical list of 3 skills, each 32px tall with
    a small chip:
      "domain expertise" — chip #FFF0DC fill, #161916 text
      "people management" — chip #FFF0DC fill, #161916 text
      "policy knowledge" — chip #FFF0DC fill, #161916 text

RIGHT COLUMN — "FUTURE: TL"
Card: same dimensions and styling as left column.
  Card header: pill chip "FUTURE" in #FD4E59 fill, white text, 11px
  caps; right-aligned meta "Redesigned" in 12px #FD4E59.
  16px gap, "TL" role title repeated. (No title change in this case.)
  
  TIME SPLIT BLOCK:
    Sub-header "Time split" in 13px caps #6D7069.
    Donut chart segments:
      Coaching        50%  #FD4E59
      Exception rev   30%  #FFAB28
      AI validation   15%  #FFAB28 (lighter shade or pattern fill)
      Meetings         5%  #FFF0DC outlined
    Legend below the donut. Each row shows the percent and a CHANGE
    INDICATOR pill to the right:
      Coaching       50%  [↑ +15] — green pill
      Exception rev  30%  [— same] — gray pill
      AI validation  15%  [+ NEW] — #FFAB28 pill, white text
      Meetings        5%  [↓ -10] — red pill
  
  TASKS BLOCK (24px gap, 1px top divider):
    Sub-header "Tasks retained" in 13px caps #6D7069.
    Two rows with bullet dots (#6D7069):
      • Coach with AI insights
      • Resolve agent escalation
    
    8px gap, sub-header "New tasks" in 13px caps #FFAB28.
    Two rows with + icon in #FFAB28:
      + Validate AI-generated daily reports
      + Coach via AI-surfaced patterns
    
    8px gap, sub-header "Tasks lost" in 13px caps #6D7069.
    One row with strikethrough text and grey color:
      ✗ Compile daily quality report (struck through, #6D7069)
  
  SKILLS BLOCK:
    Sub-header "Skills" in 13px caps #6D7069.
    Vertical list of 5 skills, each 32px tall:
      "domain expertise" — chip #FFF0DC + green check icon (retained)
      "people management" — chip #FFF0DC + green check (retained)
      "policy knowledge" — chip #FFF0DC + green check (retained)
      "interpreting AI confidence" — chip #FFAB28 + plus icon (new)
      "exception-pattern recognition" — chip #FFAB28 + plus (new)

- 32px gap, then a TRANSITION NARRATIVE callout panel, full workspace
  width, #FFF0DC fill, 1px left border 3px #FD4E59, 12px radius,
  20px padding:
    Label "TRANSITION NARRATIVE" in 11px caps #FD4E59.
    8px gap, body text in 16px #161916 italic:
    "TL shifts from report-compiler to coach-and-validator, with AI
     absorbing routine reporting work."

- 24px gap, then DAY IN THE LIFE panel inside a #FDF8F4 card, 12px
  radius, 1px #494949 12% border, 20px padding:
    Label "DAY IN THE LIFE" in 11px caps #6D7069.
    8px gap, body text in 14px #494949:
    "Morning starts with reviewing the AI-generated overnight quality
     report, focusing on flagged anomalies. Mid-morning: 30-min
     coaching session with two agents whose patterns surfaced in
     auto-QA. Afternoon: handle three policy escalations from agents
     (complex calls AI couldn't resolve), plus pod-level review."

- 24px gap, then TRANSITION FEASIBILITY panel, full workspace width,
  #FDF8F4 fill, 12px radius, 1px #494949 12% border, 24px padding:
    Top row: "Transition feasibility" in 16px bold #161916, then a
    big numeric "72%" in 28px bold #161916, then a chip "MIXED" in
    #FFF0DC fill, #FFAB28 text, 11px caps.
    16px gap, body text in 14px #494949:
    "Most TLs upskill in place; identify 2-3 needing deeper reskilling
     on AI validation."
    8px gap, "Key risks" label in 11px caps #6D7069 followed by body
    in 13px #494949:
    "Some TLs strongly identify with reporting work — change management
     needed."

==================================================================
FRAME 4 — F3.3 EMERGENT ROLE DETAIL
==================================================================
Different from F3.2 because there is no 'today' equivalent. Single-card
detail view with rationale, headcount math, and sourcing options.

Workspace content (centered, max-width 880px):
- Top row: ghost link "← Back to roles grid" in #494949 with chevron-left.
- 16px gap, then title row:
    Left: chip "NEW ROLE" in #FFAB28 fill, white text, 11px caps,
    then role title "AI Output Auditor" in 28px bold #161916.
    Right: ghost "Edit" button with pencil icon.

- 24px gap, then a single comprehensive card, #FFF0DC fill, 1px left
  border 4px #FFAB28, 12px radius, 32px padding.

Card content:

1. WHY THIS ROLE IS NEEDED block
   - Label "WHY THIS ROLE IS NEEDED" in 11px caps #FFAB28.
   - 8px gap, body in 16px #161916:
     "Auto-QA covers 40% of audit volume but requires human validation
      on confidence <85% cases. Currently unowned in your hierarchy."

2. HEADCOUNT block (32px gap, 1px top divider #494949 12%)
   - Label "HEADCOUNT ESTIMATE" in 11px caps #6D7069.
   - 4px gap, big stat "1.5 FTE" in 32px bold #161916.
   - 8px gap, "Math:" label in 12px medium #6D7069 followed by a
     monospace breakdown in 13px #494949 inside a #FFFFFF rounded box,
     4px radius, 8px padding:
     "~120 low-confidence flags/day  ×  5 min each  =  10 hrs/day
      ÷  6.5 productive hrs per FTE  =  1.5 FTE"

3. PLACEMENT block (24px gap)
   - Two key-value rows:
     Label "SITS UNDER" in 11px caps #6D7069 → "QA Officer" in 14px
     medium #161916 with link styling.
     Label "REPORTS TO" in 11px caps #6D7069 → "QA Officer" in 14px
     medium #161916.

4. KEY SKILLS block (24px gap, 1px top divider)
   - Label "KEY SKILLS" in 11px caps #6D7069.
   - 8px gap, three skill chips horizontally (#FFFFFF fill, 1px #494949
     12% border, plus icon left of label, 13px #161916, 28px tall):
       + QA rubric mastery
       + Interpreting AI confidence
       + Calibration

5. SOURCING block (24px gap)
   - Label "COULD BE FILLED FROM" in 11px caps #6D7069.
   - 8px gap, two sourcing options as small horizontal cards (each
     #FFFFFF fill, 1px #494949 12% border, 8px radius, 16px padding,
     8px gap between):
     Option 1: icon left (people-up arrow in #FD4E59), label "Promote
     senior agents" in 14px medium #161916, meta "4-6 candidates expected"
     in 13px #6D7069.
     Option 2: icon left (people-swap in #FD4E59), label "Lateral move
     from QA Officer pool" in 14px medium #161916, meta "Requires backfill
     plan" in 13px #6D7069.

- 24px gap, then an action footer row right-aligned (outside the card):
    Ghost button "Reject role" — label in #FD4E59 with X icon left.
    Outlined "Edit" button.
    Primary solid #FD4E59 "Accept role" with check icon left of label.

==================================================================
DELIVERABLES
==================================================================
- Four 1440x900 desktop frames, named clearly:
  "F3.0 Pre-run", "F3.1 Roles grid", "F3.2 Role detail", "F3.3 Emergent role".
- All four frames must wrap the global shell with F3 ACTIVE in the left
  nav, labelled "ROLES". F1 and F2 show as completed; F4 and F5 as
  in-progress; F6 and F7 locked.
- Strict adherence to the color palette and Funnel Sans font. Do not
  introduce any other colors, fonts, or illustration styles. Do not use
  generic blue or purple highlights. Pattern badges must use the exact
  color combinations specified above.