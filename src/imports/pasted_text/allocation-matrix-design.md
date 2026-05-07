Design the complete Feature 2 — AI-Predicted Allocation Matrix — for the
Operating Model Simulator. Render six desktop frames at 1440x900 px each,
all wrapped in the previously designed global shell (top header, left
navigation rail F1–F7, footer status bar).

IMPORTANT — UPDATE THE LEFT-NAV FEATURE NAME
On every frame in this feature, update the F2 entry in the left navigation
rail to read "ALLOCATION MATRIX" (not just "F2" or generic placeholder
text). The F2 nav button must show as ACTIVE on all six frames: icon
stroked in #FD4E59, label in #161916, and a 3px coral left bar pinned to
the left edge of the F2 button. Make sure the label is short enough to fit
in the 64px-wide rail (truncate or stack as needed).

DESIGN SYSTEM (apply on every frame)
- Font: Funnel Sans, all weights
- Primary (coral red) #FD4E59 — buttons, active states, key icons
- Secondary (warm orange) #FFAB28 — accents, AI sparkle markers, advisories
- Background #FFFFFF
- Card background #FDF8F4 — warm off-white for cards, panels, drawers
- Muted background #FFF0DC — soft cream for emphasis blocks, info banners
- Text/borders dark #161916 — primary text and borders
- Text/borders medium #494949 — secondary text, dividers
- Accent gray #6D7069 — meta text, breadcrumb separators, disabled states
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
- Left nav rail: 64px wide, white, right 1px border at 10%.
  Vertical list F1–F7. F1 shows green check (completed). F2 ACTIVE,
  labelled "ALLOC MATRIX" or "ALLOCATION MATRIX" (whichever fits),
  coral icon, coral 3px left bar. F3, F4, F5 are in-progress dots.
  F6, F7 are locked with lock icon at 60% opacity.
  Bottom of rail: SAVE and EXPORT icons.
- Footer status bar: 32px tall, dark #161916 background, white 11px
  monospace text. Left: green dot + "SYSTEM ENGINE: ACTIVE" + last saved
  time. Right: "CONTEXT V2  MATRIX V1  V2.4.1-STABLE".

==================================================================
FRAME 1 — F2.0 PRE-RUN / FIRST VISIT
==================================================================
A configuration screen the user sees on first arrival to F2 before any
matrix has been generated.

Workspace content (centered, max-width 720px):
- Breadcrumb: "ALLOCATION MATRIX" in #161916 (no parent crumbs).
- Workspace title: "Generate allocation predictions" in 28px bold #161916.
- 16px gap, then a paragraph in 15px #494949:
  "We'll analyze your 12 tasks and recommend the optimal touchpoint —
   human-only, tech-assisted, or tech-automated — for each. Based on your
   context readiness 83/100 (GREEN)."
- 32px gap, then a large illustrative graphic block (240px tall) showing
  a stylized matrix grid in #FFF0DC with 3 row dots highlighted in
  #FD4E59, #FFAB28, and #6D7069 (representing the three allocation states).
- 32px gap, then a panel titled "Automation appetite" in 16px bold #161916.
  Below it: a horizontal segmented control with 3 options:
    "Conservative" | "Balanced" (active) | "Aggressive"
  Active option has #FD4E59 fill, white label. Others have #FDF8F4 fill,
  #494949 label, 1px #494949 12% border. Below the control, a 13px
  #6D7069 helper line: "Balanced — recommended for most engagements."
- 24px gap, then a small meta line: "Estimated generation time: ~45 seconds"
  in 13px #6D7069 with a clock icon.
- 32px gap, then a centered primary button "Generate matrix" — solid
  #FD4E59, white label, sparkle icon left of label, 48px tall, 24px
  horizontal padding.

==================================================================
FRAME 2 — F2.1 GENERATION IN PROGRESS
==================================================================
A loading state shown while the AI runs the 5-stage pipeline. The user
sees real-time progress because each task is a separate LLM call.

Workspace content (centered, max-width 640px):
- Workspace title: "Generating allocation predictions…" in 28px bold #161916.
- 16px gap, then a large progress bar:
  - Track 8px tall, fill #FFF0DC, 9999px radius.
  - Filled portion in #FD4E59 representing roughly 65% complete.
  - Above the bar (right-aligned): "Task 8 of 12" in 13px monospace #161916.
- 32px gap, then a pipeline stages list inside a card (#FDF8F4 fill, 12px
  radius, 1px #494949 12% border, 24px padding). Each row 56px tall:
    Row 1 — green check icon + "Applied hard constraints" + meta in
    #6D7069: "1 task locked: regulatory"
    Row 2 — green check icon + "Matched candidate capabilities" + meta:
    "12 tasks evaluated against capability library"
    Row 3 — animated coral spinner + "Predicting allocation for: Sample-
    audit moderator decisions" in #161916 bold
    Row 4 — empty circle in #6D7069 + "Calibrating confidence" in #6D7069
    Row 5 — empty circle in #6D7069 + "Cross-task validation" in #6D7069
- 24px gap, then a centered ghost button "Cancel" — no fill, label in
  #494949, 1px #494949 30% border.

==================================================================
FRAME 3 — F2.2 MATRIX VIEW (PRIMARY)
==================================================================
The main F2 screen. Wide table with filters, summary strip, and a
collapsed advisories bar at the bottom. Designed for density without
overwhelm. Make sure this frame uses workspace width fully (~1140px).

Workspace content:
- Top row: breadcrumb "ALLOCATION MATRIX" in #161916. Right-aligned:
  two icon buttons "Re-run" (with refresh icon) and a settings gear,
  both ghost style in #494949.
- 16px gap, then the workspace title "Allocation matrix" in 24px bold
  #161916 with subtitle "12 tasks · Generated 2 min ago" in 13px #6D7069.
- 24px gap, then a CONTROLS BAR (horizontal, 56px tall, #FDF8F4 fill,
  12px radius, 1px #494949 12% border, 16px horizontal padding):
    Left cluster — "Appetite:" label in 13px #6D7069, then a dropdown
    "Balanced" with chevron-down, 36px tall, white fill, 1px border.
    Vertical divider (1px, #494949 20%).
    "Filters:" label, then four small dropdown chips: "Role: All",
    "Confidence: All", "Source: All", "Allocation: All". Each chip has
    #FFFFFF fill, #494949 30% border, 13px label, chevron-down.
    Right cluster — small icon for column visibility menu.
- 16px gap, then a SUMMARY STAT STRIP (horizontal row of clickable stats,
  separated by vertical 1px #494949 20% dividers, 48px tall):
    "3 AUTOMATED" with green dot
    "5 ASSISTED" with #FFAB28 dot
    "4 HUMAN" with #6D7069 dot
    "AVG CONFIDENCE 78%"
    "3 ADVISORIES" with #FFAB28 warning triangle
  Each stat label in 11px caps #6D7069, value below in 18px bold #161916.
- 16px gap, then the MATRIX TABLE (full workspace width):
    Header row, 13px caps #6D7069 letter-spaced:
    # | TASK | ROLE | RECOMMENDED | CONFIDENCE | SOURCE
    
    Pre-fill 8 rows (64px tall, alternating between #FFFFFF and #FDF8F4):
    Row 1: 01 | "Review flagged post against policy" | "Agent" chip
    (#FFF0DC fill) | green-fill chip "ASSIST" | "78%" amber | sparkle
    icon in #FFAB28 + "AI"
    Row 2: 02 | "Classify violation category" | "Agent" chip | amber
    chip "ASSIST" | "65%" red | sparkle "AI"
    Row 3: 03 | "Escalate severe safety case" | "Agent" chip | grey
    chip "HUMAN" with lock icon | "100%" green | lock icon + "LOCKED"
    Row 4: 04 | "Sample-audit moderator decisions" | "QA Officer" chip
    | amber chip "ASSIST" | "72%" amber | sparkle "AI"
    Row 5: 05 | "Weekly calibration session" | "QA Officer" chip | grey
    chip "HUMAN" | "85%" green | sparkle "AI"
    Row 6: 06 | "Coach agent on missed audit" | "TL" chip | grey chip
    "HUMAN" | "80%" green | pencil icon in #FD4E59 + "USER"
    Row 7: 07 | "Resolve agent escalation" | "TL" chip | amber chip
    "ASSIST" | "60%" red | sparkle "AI"
    Row 8: 08 | "Compile daily quality report" | "TL" chip | green-fill
    chip "AUTO" | "85%" green | sparkle "AI"
  
  Recommendation chip styling:
    AUTO — solid green-tint fill (#E2EFDA), green dot, 13px medium #161916
    ASSIST — solid #FFF0DC fill, amber dot, 13px medium #161916
    HUMAN — solid #FDF8F4 fill, grey dot, 13px medium #161916, lock icon
    if regulatory-locked
  
  Confidence cells: green text if ≥85, amber if 70–84, red if <70.
  
  Each row is clickable (hover state: #FFF0DC tint, cursor pointer).
- 16px gap, then a COLLAPSED ADVISORIES BAR (full width, 48px tall,
  #FFF0DC fill, 8px radius, 1px left border 3px #FFAB28, 16px padding):
    Left: warning triangle in #FFAB28, then "Advisories (3)" in 14px
    medium #161916, then short preview "Coverage check, role hollowing,
    capability concentration" in 13px #494949.
    Right: ghost button "Expand" with chevron-down icon.

==================================================================
FRAME 4 — F2.3 TASK DETAIL SIDE DRAWER
==================================================================
Render the full F2.2 matrix view in the background (slightly dimmed with
a 30% black overlay), with the side drawer sliding in from the right.

Drawer specs:
- Width 480px, full height below header, white background, left 1px
  border #494949 at 12%, slide-in animation hint (subtle shadow on left
  edge).
- 24px padding throughout.

Drawer content (top to bottom):

1. CLOSE ROW
   - Right-aligned X close icon in #6D7069.

2. TASK HEADER BLOCK
   - Small meta "TASK T_001" in 11px monospace #6D7069.
   - 4px gap, then task name "Review flagged post against policy" in
     20px bold #161916 (wraps if needed).
   - 12px gap, then a row of 3 meta chips: "Role: Agent", "Type: rule-
     based", "Volume: 38,000/day". Chips: 24px tall, #FFF0DC fill, 13px.
   - 8px gap, then "Avg time per execution: 1.5 min" in 13px #6D7069.

3. RECOMMENDATION BLOCK (24px gap above, in a #FDF8F4 card, 16px padding,
   8px radius)
   - Label in 11px caps #6D7069: "RECOMMENDED"
   - 4px gap, big chip: "TECH-ASSISTED" — #FFF0DC fill, amber dot,
     16px medium #161916, 32px tall.
   - 12px gap, "Confidence" label + bar: track #FFF0DC, fill #FFAB28,
     78% filled. Right-aligned "78%" in 14px monospace #161916.

4. CONFIDENCE BREAKDOWN (collapsible section, expanded by default)
   - Header row "▾ Confidence breakdown" in 13px medium #494949.
   - Below, a small table:
     "LLM raw                0.85"
     "In-prod boost          +0.10"
     "No-time penalty         0.00"
     "Context readiness      -0.07"
     1px divider #494949 12%
     "Calibrated             0.78" in #161916 bold
   - Use 13px monospace, right-aligned numbers, signs colored: + in
     green, − in #FD4E59.

5. PRIMARY CAPABILITY (24px gap, separate panel)
   - Label "PRIMARY CAPABILITY" in 11px caps #6D7069.
   - 4px gap, capability name "Image classifier" in 16px medium #161916.
   - Inline link "Why this capability?" in #FD4E59 underlined, 13px,
     with info-circle icon.

6. RATIONALE (24px gap)
   - Label "RATIONALE" in 11px caps #6D7069.
   - 4px gap, body text in 14px #161916: "Pre-classification by existing
     image classifier handles 70% of volume; human review for ambiguous
     cases. Not recommended for full automation due to medium consequence
     of error and need for human judgment on edge cases."

7. RISK FACTORS (16px gap)
   - Label "RISK FACTORS" in 11px caps #6D7069.
   - 4px gap, bullet list (#FD4E59 small dots, 13px #494949):
     • Classifier drift over time
     • New violation categories not in training data

8. PREREQUISITES (16px gap)
   - Label "PREREQUISITES" in 11px caps #6D7069.
   - 4px gap, bullet list (green dots, 13px #494949):
     • Maintain monthly classifier retraining
     • Human review queue for confidence < 80%

9. OVERRIDE BLOCK (24px gap, in #FFF0DC card with 1px left border 3px
   #FFAB28, 8px radius, 16px padding)
   - Label "OVERRIDE THIS RECOMMENDATION" in 11px caps #161916 bold.
   - 8px gap, segmented control with 3 options: "Human" | "Tech-assisted"
     (currently selected, #FD4E59 fill white label) | "Tech-automated".
   - 12px gap, "Reason for override (optional)" label in 12px #6D7069.
     Below, a 2-line textarea, white fill, 1px #494949 30% border, 6px
     radius, placeholder "Why are you changing this?".

10. ASK THE AI (16px gap)
    - Label "ASK THE AI" in 11px caps #6D7069.
    - 8px gap, text input with sparkle icon in #FFAB28 on the left,
      placeholder "Why didn't you fully automate?", 40px tall, 6px radius.
    - Send-arrow icon button on the right (#FFAB28).

11. DRAWER FOOTER (sticky at bottom, full drawer width, 1px top border
    #494949 12%, 16px padding)
    - Left: ghost "Cancel" button.
    - Right: solid #FD4E59 "Save override" button with check icon left
      of label.

==================================================================
FRAME 5 — F2.4 ADVISORIES PANEL (EXPANDED)
==================================================================
Same as Frame 3 (matrix view), but with the advisories bar expanded into
a full panel below the matrix. Render the matrix table in a slightly
compressed form (top of frame) and the expanded advisories below.

Expanded advisories panel:
- Full workspace width, #FFF0DC fill, 12px radius, 1px left border 3px
  #FFAB28, 24px padding.
- Header row: warning triangle in #FFAB28 + "Advisories (3)" in 16px
  bold #161916. Right: ghost "Collapse" button with chevron-up.
- 16px gap, then 3 advisory cards stacked vertically (12px gap between):

  Advisory 1 — INFO Coverage
    - Severity chip "INFO" in #6D7069 fill, white text, 11px caps.
    - Title "Coverage check" in 14px medium #161916.
    - Body in 13px #494949: "Recommendations would shift 62% of total
      task-hours to tech-assisted or automated. Aligns with your stated
      scale_target of 1.5x."
    - Right: two ghost action buttons "Dismiss" and "Mark for follow-up".
  
  Advisory 2 — WARN Role hollowing
    - Severity chip "WARN" in #FFAB28 fill, white text.
    - Title "Role hollowing — QA Officer" in 14px medium #161916.
    - Body in 13px #494949: "QA Officer would lose 75% of current tasks.
      Treat as transformation, not a tweak. F3 will handle role redesign."
    - Right: same ghost buttons.
  
  Advisory 3 — INFO Capability concentration
    - Severity chip "INFO".
    - Title "Capability concentration risk" in 14px medium #161916.
    - Body in 13px #494949: "55% of automated tasks rely on
      image_classifier. Single-vendor risk; consider failover plan."
    - Right: same ghost buttons.

  Each card: white background, 1px #494949 12% border, 8px radius,
  16px padding, 64px min-height.

==================================================================
FRAME 6 — F2.5 BULK ACTIONS & RE-RUN MODAL
==================================================================
A combined frame showing two F2.5 elements: the bulk-actions menu open
on the matrix, and a re-run confirmation modal centered over the dimmed
workspace.

Layout:
- Render the F2.2 matrix in the background (slightly dimmed with a 30%
  black overlay).
- In the top-right corner of the matrix toolbar, render a dropdown menu
  open from the gear icon. Menu specs:
    Width 280px, white fill, 8px radius, 1px #494949 12% border, subtle
    shadow, 8px padding.
    Menu sections separated by 1px #494949 12% dividers.
    
    Section 1 — "BULK ACTIONS" label in 11px caps #6D7069 (8px padding):
      • "Apply override pattern" with branching icon, 13px #161916
      • "Lock as human-only (selected)" with lock icon, 13px #161916
      • "Reset all overrides" with reset icon, 13px #FD4E59
    
    Section 2 — "EXPORT" label in 11px caps #6D7069:
      • "Export as CSV" with file-csv icon
      • "Export as PNG" with image icon
      • "Export as JSON" with code-brackets icon
    
    Each menu item 36px tall, hover state #FFF0DC fill.

- In the center of the screen, render a RE-RUN CONFIRMATION MODAL on top
  of everything (highest z-index). Modal specs:
    Width 480px, white fill, 12px radius, 24px padding, drop shadow.
    
    Header: "Re-run allocation predictions?" in 20px bold #161916.
    Close X icon top-right in #6D7069.
    
    16px gap, body text in 14px #494949: "This will replace 9 AI
    predictions with new ones based on the new appetite (Aggressive).
    Constraint-locked tasks (1) won't change."
    
    20px gap, a checkbox row: empty checkbox + label "Also reset my 2
    user overrides" in 14px #161916. Below in 12px #6D7069:
    "Off by default — your overrides will be preserved."
    
    20px gap, meta line with clock icon: "Estimated time: ~30 seconds"
    in 13px #6D7069.
    
    24px gap, footer action row (right-aligned):
      Ghost "Cancel" button + solid #FD4E59 "Re-run" button with refresh
      icon left of label.

==================================================================
DELIVERABLES
==================================================================
- Six 1440x900 desktop frames, named clearly:
  "F2.0 Pre-run", "F2.1 Generation", "F2.2 Matrix view",
  "F2.3 Task drawer", "F2.4 Advisories", "F2.5 Bulk + re-run modal".
- All six frames must wrap the global shell with F2 ACTIVE in the left
  nav, labelled "ALLOCATION MATRIX" (or "ALLOC MATRIX" if the full label
  doesn't fit in the 64px rail). Update the F2 entry across all frames.
- Strict adherence to the color palette and Funnel Sans font. Do not
  introduce any other colors, fonts, or illustration styles. Do not use
  generic blue or purple highlights.

