# Motion sheets

A component whose job is MOVEMENT (Presence, Count, a swap, a stagger) has no
sizes and often no colour, and a static drawing of it is a mood board. The
sheet still has to be a contract. This is the format that made Presence's
sheet buildable without a single guessed number. The neighbouring
`Pattern --- Chat status motion` sheet uses the same shape.

## Sections, in order

| Section | What it holds |
| --- | --- |
| Heading | The 20% title lane, `PROPOSAL · component` badge, two intro paragraphs: what moves and why, and which ADR / sibling it belongs to |
| Principles | Five or six named rules in the 150px rule-row format. Every strip below must be one of them applied; a seventh rule means a second component |
| Anatomy | A specimen caught mid-change (one item arriving, one present, one leaving) and the parts table. Annotate each specimen row with its state and the frame it shows |
| One strip per phase | Arriving, Leaving (and any other phase). Rows = kinds, columns = frames, every cell a real item at that frame's value, captioned with the value |
| Motion levels | Kind × Full / Reduced / Off, in words. Reduced removes TRAVEL and keeps change in place; Off is 1ms (ADR 0028) |
| Dark | The main strip again with resolved dark values, and the measured contrast of the most transparent frame |
| Token map | Every duration, curve, distance and factor the sheet uses, with its value. Flag anything new |
| Gaps | The house badge vocabulary. Record what the sheet DECIDES about components that already move |

## Frames are computed, never drawn by eye

Every opacity, offset and height in a strip comes from the curve:

```bash
node scripts/motion-frames.mjs --curve "0, 0, .2, 1" --duration 200 --frames 5
node scripts/motion-frames.mjs --curve "0, 0, .2, 1" --duration 200 --delay 120 --from 40 --to 0
node scripts/motion-frames.mjs --spring 0.75   # a damped spring as a linear() easing
```

Use the four numbers of the `--ui-ease-*` token the phase actually runs on,
and the duration token's value. A phase that starts after another (a fold
after a fade) takes `--delay`. Put the time in the column header when every
row shares it; when kinds run for different lengths, label the columns
Start · ¼ · ½ · ¾ · End and put the ms in each caption.

The `--spring` mode is how `--ui-ease-spring` was made: it prints the
overshoot, when it peaks and when it reaches 90%, so a proposed curve can be
compared with the one it replaces before anyone adopts it.

## Drawing a frame

- A cell is a `bg-surface` frame with a `border-subtle` hairline and
  `radius-sm`, holding one row of the placeholder data at that frame's
  opacity / translate / height. Opacity goes on the CONTENT, never on a
  caption or a state label — those must stay readable.
- A frame of a height animation clips its content at the top, the way a
  reveal does: anchor the content to the top of the cell and let the bottom
  cut.
- A zero-height frame is drawn as the cell's closed hairline, not omitted —
  the column would otherwise read as missing.
- Measure the most transparent frame's contrast in both schemes and write the
  numbers into the Dark section. Transient frames have no floor; the numbers
  stop the next reader re-measuring.

## Decisions a motion sheet surfaces

These came up on Presence and will come up again. Draw a proposal, flag it
`Derived` in Gaps, and put the choice to the user rather than settling it in
the drawing:

- Exits shorter than entrances, and whether anything travels on the way out.
- The order of a compound exit (fade then fold, or both together).
- Whether items present on the first render animate.
- A distance: a new motion token, or an existing spacing step reused.
- Whether a behaviour-layer surface (popover, dialog, toast) already owns the
  motion — it usually does, and must not be wrapped twice.

When the user decides, update the badge to `Decided`, keep the row, and
switch the heading badge to `APPROVED · component`.

## Paper traps specific to this work

| Trap | Rule |
| --- | --- |
| The remote MCP's screenshots and exports come back dark or black | Its renderer does not resolve `var(--ui-*)`, so every token colour renders transparent on black and the font falls back. Judge colour and type in the desktop app; never commit a remote export as `design/` evidence |
| "Open a Paper file to use this tool" in the middle of a session | The open file is dropped between calls. `open_file` again and carry on; node ids are unchanged |
| An approved sheet still on the drafts page | `move_nodes` to the handoff page's root, then set `left`/`top` past the page's right-most artboard plus 80px. The node keeps its id |
| A section screenshot that clips | The artboard still has its starting height. Set `height: fit-content`, never a guessed number |
| A cloned row inherits the source's opacity | `duplicate_nodes` copies styles; reset opacity/translate/height on every clone before setting the new frame |
