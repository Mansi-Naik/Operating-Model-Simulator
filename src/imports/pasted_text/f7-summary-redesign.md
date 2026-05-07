Redesign the F7 Summary screen for the Operating Model Simulator.
Replace the existing crowded layout with a clean, narrative-driven
summary. One desktop frame at 1440x900, wrapped in the existing 7-
feature global shell with F7 active.

DESIGN PRINCIPLE
This screen is read-only. It is the final deliverable, not a
navigation hub. No "View F2 →" links, no "Edit" links, no in-stage
jumps. The only outcome is Export.

DESIGN SYSTEM
- Font: Funnel Sans
- Coral #FD4E59: primary CTA, recommended badge, stat highlights
- Orange #FFAB28: ILLUSTRATIVE chip, advisory accents
- White #FFFFFF: background
- Cream #FDF8F4: hero card, stat tiles
- Soft cream #FFF0DC: caveats panel, risk banner
- Dark #161916: primary text
- Medium #494949: secondary text
- Grey #6D7069: meta, captions
- Delta colors: green #548235 cost down; coral #FD4E59 cost up
- 12px radius cards, 6px buttons, thin-line icons (1.5px)

TOP HEADER ROW (small, quiet)
- Breadcrumb "SUMMARY" in #161916, 13px caps.
- Right-aligned: ONE solid coral button "Export final deck" with
  download icon, 44px tall. Nothing else.

==========================================================
SECTION 1 — RECOMMENDATION HERO (24px gap below header)
==========================================================
A full-workspace-width hero card. Cream #FDF8F4 fill, 16px radius,
1px left border 6px coral, 40px padding, ~200px tall.

Layout: vertically centered.

- Eyebrow label: "RECOMMENDED OPERATING MODEL · ACME CORP" in 11px
  caps amber, letter-spaced.
- 8px gap, scenario name "Balanced" in 48px bold #161916 with a
  coral star badge inline (28px circle, white star).
- 8px gap, one-line rationale in 16px italic #494949: "Industry-
  benchmark span, meaningful cost reduction, manageable transition
  risk."
- 16px gap, meta line in 12px #6D7069: "Synthesized from 6 pipeline
  stages · Generated today · Acme Corp moderation engagement"

==========================================================
SECTION 2 — THE PROOF (24px gap below hero)
==========================================================
Section header "The case for Balanced" in 14px caps #6D7069
letter-spaced.

12px gap, then a single horizontal row of FOUR stat tiles, equal
width, 16px gap, ~140px tall. Each tile: white fill, 1px #494949 12%
border, 12px radius, 24px padding.

Tile 1 — COST SAVING
- Label "COST SAVING" in 11px caps #6D7069
- Value "−22.9%" in 32px bold green #548235
- Sub-line "range 18–28%" in 12px italic #6D7069

Tile 2 — PAYBACK
- Label "PAYBACK"
- Value "Month 6" in 32px bold #161916
- Sub-line "full ramp by M9" in 12px italic #6D7069

Tile 3 — HEADCOUNT
- Label "HEADCOUNT Δ"
- Value "+3 (+2.7%)" in 32px bold #6D7069 (neutral grey since stable)
- Sub-line "116 vs 113 today" in 12px italic #6D7069

Tile 4 — RISK PROFILE
- Label "RISK PROFILE"
- Value chip "MED" — soft cream #FFF0DC fill, amber text, 28px tall
- Sub-line "manageable, controls strong" in 12px italic #6D7069

==========================================================
SECTION 3 — HOW WE GET THERE (24px gap below stats)
==========================================================
Section header "How we get there" in 14px caps #6D7069
letter-spaced.

12px gap, then a single white card, 1px #494949 12% border, 12px
radius, 28px padding, ~280px tall.

Inside the card, two stacked visual blocks:

BLOCK A — JOURNEY STRIP (top, ~80px tall)
- Three labeled milestones with arrows between them, evenly spaced:
    "TODAY" — 113 FTE · 100% human
       →
    "9-MONTH ROLLOUT"
       →
    "FUTURE STATE" — 116 FTE · 62% AI-augmented
- Below the strip, 4 small phase markers on a horizontal track:
    P1 Foundation (3%) · P2 Pilot (9%) · P3 Scale (18%) · P4 Optimize
    (23%)
  Each marker: small dot in phase color (green tint, amber, light
  coral, deep coral) with the phase name in 11px caps and savings %
  below in 12px medium.

12px gap, then a 1px horizontal divider #494949 12%.

BLOCK B — ALLOCATION SHIFT (bottom, ~120px tall)
- Sub-header "Where the work goes" in 13px medium #161916.
- 8px gap, then two horizontal stacked bars stacked vertically with
  16px gap between:

  Bar 1 — TODAY:
    Label "TODAY" in 11px caps #6D7069 (left, 60px wide)
    A single grey bar, full track width, 24px tall, 9999px radius.
    Inside the bar centered: "100% Human" in 12px white medium.

  Bar 2 — FUTURE:
    Label "FUTURE" in 11px caps coral
    Three segments left to right in one bar, 24px tall, 9999px radius:
      Grey #6D7069 segment, 38% width, label "Human 38%" inside in
      11px white
      Amber #FFAB28 segment, 42% width, label "Assisted 42%" inside
      in 11px white medium
      Green #548235 segment, 20% width, label "Automated 20%" inside
      in 11px white

- 8px gap, caption in 13px italic #494949: "62% of work-hours shifted
  to AI-assisted or automated. Human time refocused on judgment,
  coaching, and exception handling."

==========================================================
SECTION 4 — RISK & ESCALATION EVIDENCE (24px gap)
==========================================================
A single banner, full-width, 64px tall. Soft cream #FFF0DC fill, 12px
radius, 1px left border 4px amber, 24px padding.

Layout: horizontal.
- Left: shield icon in amber + "Risk & Escalation evidence" in 14px
  medium #161916 + meta "Governance score: STRONG · 1 advisory" in
  13px #494949.
- Right: ghost button "Show details ▾" with chevron-down, in coral
  outline. (Indicates expandability without forcing it open.)

==========================================================
SECTION 5 — WHAT THIS ANALYSIS ASSUMES (16px gap)
==========================================================
A muted panel with the caveats. Soft cream #FFF0DC fill, 12px radius,
24px padding, full workspace width.

- Header: "What this analysis assumes" in 13px caps medium #6D7069
  letter-spaced. Small info-circle icon left of label.
- 12px gap, four bullet items in 13px #494949, each on its own line
  with 8px gap between:
    "• Numbers are illustrative; real engagement values may differ"
    "• Transition costs include tech build, retraining, and change
       management — but not severance by geography"
    "• Billing model impact is not yet modeled — coordinate with
       commercial before final pricing"
    "• Client tech readiness and procurement timelines may extend
       the 9-month rollout"

==========================================================
SECTION 6 — FINAL CTA (24px gap below caveats)
==========================================================
Right-aligned, single button only.
- Solid coral "Export final deck" with download icon, 48px tall, 28px
  horizontal padding. The most visually weighted button on the entire
  page.

==========================================================
WHAT'S DELIBERATELY NOT ON THIS SCREEN
==========================================================
Do not include any of the following:
- "Save as scenario" button (already saved)
- "Re-run pipeline" button (already past run)
- "Go to Summary" button (already here)
- "Edit any stage" link
- "View F2 / F3 / F4 / F5 / F6 →" links inside the cards
- Multiple "what changes" cards (replaced by one strip)
- Floating fragments or orphan elements

==========================================================
DELIVERABLE
==========================================================
One desktop frame at 1440x900, named "F7 Summary (clean)".

Strict adherence to the palette and Funnel Sans. The hero card must
be the dominant visual element on the page. The four stat tiles
must be equal-weight. The Export button must be the most visually
weighted CTA. Reading order from top to bottom must feel like a
short narrative: recommendation → proof → journey → evidence →
caveats → export.