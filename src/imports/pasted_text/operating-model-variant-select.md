Fix the layout of the F4.1 Variant Selector frame for the Operating
Model Simulator. The frame already exists; do not redesign it from
scratch. Goal: resolve alignment issues and overlapping elements, and
make the page feel clean, balanced, and presentation-ready.

CORE LAYOUT RULES TO ENFORCE
- Use a 12-column grid with 24px gutters and 32px margins inside the
  workspace (1140px content width centered).
- Vertical rhythm: 24px between major sections, 16px between related
  blocks, 8px between related elements.
- Nothing should overlap. If two elements collide at the current size,
  shrink whichever is non-essential or wrap content to a new line.
- All text inside cards must respect 24px internal padding minimum.

FIX 1 — CONSTRAINTS BAR (top of workspace)
- Single horizontal cream card, full workspace width, 24px padding.
- 5 controls in one row, equal vertical alignment, 24px spacing between.
- If 5 controls don't fit cleanly, wrap "Must include" and "Shared
  support" to a second row. Do NOT let labels overlap or chips spill
  outside the bar.
- Each control: label on top in 12px #494949, input/dropdown/chips
  below at 36px height, all bottom-edges aligned.

FIX 2 — THREE VARIANT CARDS
- Cards in a single horizontal row, equal width (~360px each), 24px
  gap between, all top-edges aligned, all same height (~480px).
- The middle card's coral border and star badge must NOT overlap the
  card's content. Push internal padding to 24px so the badge sits
  inside the corner cleanly, not on top of the title.
- Each card has SIX stacked sections with consistent spacing:
    1. Variant name (top, 16px bold caps)
    2. Pod visual (centered, fixed height ~200px)
    3. Stats grid (2x2, 16px gap between cells)
    4. Risk chip row
    5. Italic narrative (2 sentences, 13px, max 3 lines, ellipsis if
       longer)
    6. Full-width Select button at the bottom edge
- All six sections must be vertically separated by 16px. None should
  visually touch the next.

FIX 3 — POD VISUAL INSIDE EACH CARD (most likely source of overlap)
- Top: "TL" rectangle, 64x32px, coral fill, white text, centered
  horizontally, 8px below the variant name.
- 16px vertical gap, then a single 2px grey vertical line, 16px tall.
- Below the line: agent boxes in a single row.
    - Conservative card: 8 boxes in one row.
    - Balanced card: 12 boxes — wrap as 6+6 (two rows of 6) with 4px
      vertical gap between rows.
    - Aggressive card: 18 boxes — wrap as 9+9 (two rows of 9) with 4px
      vertical gap.
- Each agent box: 20x24px, soft-cream fill, 1px grey border, 4px
  radius, 4px gap horizontally, 4px gap vertically.
- Number label (8 / 12 / 18) sits to the RIGHT of the agent stack, not
  on top of it. Use 14px medium #161916, vertically centered next to
  the stack.
- 16px vertical gap below the agent stack, then THREE support-role
  pills laid out HORIZONTALLY in a single row, NOT stacked vertically
  and NOT connected with dotted lines that cross through agents.
    - Each pill: 92x24px, cream fill, 1px dashed grey border, 4px
      radius, 11px text centered.
    - Examples: "0.5 QA", "0.25 AI Aud", "0.2 SME"
    - 8px gap between pills.
- Replace any vertical dotted connectors with this clean horizontal
  pill row. The previous design's dotted lines crossing the agent grid
  must be removed entirely.

FIX 4 — STATS GRID (2x2 inside each card)
- Four equal cells, 8px gap between cells.
- Each cell: small caps label on top (11px #6D7069), value below
  (18px bold #161916). For RISK cell, the value is a chip not text.
- All four labels on the same horizontal baseline; all four values on
  the same horizontal baseline.

FIX 5 — NARRATIVE TEXT
- Italic 13px #494949, max 3 lines.
- 16px gap above (from stats) and 16px gap below (from button).
- Truncate with ellipsis if it would push the button below the card
  bottom edge.

FIX 6 — SELECT BUTTON
- Full card width, 40px tall, sits flush at the bottom edge of the card
  with 24px padding above the bottom border.
- Conservative & Aggressive: outlined coral, "Select" label.
- Balanced: solid coral fill, white "Selected" label with check icon.

FIX 7 — FOOTER ACTION ROW (below the 3 cards)
- 32px gap above the row.
- Left: ghost button "Show math" with calculator icon, label in #494949.
- Right: solid coral button "View org rollup →" with arrow-right icon,
  44px tall, 24px horizontal padding.
- Both buttons vertically centered. No overlap with the cards above.

INTERACTION HINT (for downstream connection)
- The "View org rollup →" button on the bottom right is the navigation
  trigger to the F4.2 Org Rollup screen. Mark it as the primary CTA on
  this frame.

DELIVERABLE
- Same frame, same content, fixed alignment.
- 1440x900 desktop frame.
- Strict adherence to the existing palette and Funnel Sans font. Do
  not introduce new colors, fonts, or illustration styles.
- The result should look balanced and presentation-ready: equal card
  heights, aligned baselines, no overlapping elements, clear visual
  hierarchy from top to bottom.