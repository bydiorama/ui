---
name: visual-review
description: Comparing a screen built with @bydiorama/ui against its design pixel by pixel — exporting 1× references of frames and components, reproducing the exact state with a script, diffing on a canvas in the same browser and reading the result. Use when asked whether a screen or component matches Figma or Paper, to "match the design", to fix spacing, sizes or drift against a frame, to set up visual diffs in an app, or when a design asset URL 403s and an export is needed.
---

# Visual review against the design

**Eyeballing a screenshot is not a check.** The first app built on Diorama
was 8–12px off on every section of its main screen, and nobody saw it until
a diff drew the difference in red. This is the method that found it, and the
script that runs it ships as the `visual-diff` registry item.

The loop: **export → reproduce → diff → read the red → measure → fix → rerun.**
Never skip from "read" to "fix".

## Setup, once per app

1. Install the script (from a `bydiorama/ui` checkout, like any item):
   `node --experimental-strip-types packages/cli/bin/ui.ts add visual-diff --cwd ../my-app --registry-path . --revision "$(git rev-parse HEAD)"`
   — the skill comes from the `ui` plugin, the script from the registry, so
   install it even when the skill is already loaded. It lands at
   `scripts/visual-diff.mjs`; its header documents every option.
2. `pnpm add -D playwright && pnpm exec playwright install chromium`.
3. References in `design/references/` (or pass `--refs`); cases in
   `scripts/visual-cases.mjs` (or `--cases`); the report folder `visual/` goes
   in `.gitignore`. Add `"visual": "node scripts/visual-diff.mjs"` to scripts.
4. Run the dev server, then `pnpm visual [case-id …]` and open
   `visual/report.html` — a wipe slider per case and the diff in red.

## 1 · Export references at 1×

- **Frames AND key components.** A full frame tells you something moved; an
  element case (one row, one dialog, one picker, one toolbar) tells you what.
  Export the parts a screen repeats — a row that is 2px tall is 2px × 40 rows.
- **1×, always.** The script captures at `deviceScaleFactor: 1`; a 2× export
  diffs as a different size, not as a mismatch you can read.
- **Shadow bleed.** A component export includes its drop shadow. The script
  crops an element case's reference to its opaque box (alpha ≥ 250), so
  `target` should be the element's own box. An export with an OPAQUE margin
  (a frame background around the component) defeats that — give the case an
  explicit `refCrop: [x, y, w, h]`.
- Record each reference's node URL (`CONFIG.links`) so the report links back.
- **When the tool's asset host is blocked** (Figma's MCP asset URLs return
  403 in cloud sessions), get bytes as text instead of retrying the URL.
  Figma: `get_screenshot` with `enableBase64Response` for a reference (with
  `contentsOnly` for a component); for a vector, `use_figma` running
  `await node.exportAsync({ format: "SVG_STRING" })` returns the SVG source.
  Paper: `get_screenshot` (scale 1) for a reference; `get_jsx` returns an SVG
  node's markup. A raster you need as an asset: crop it from a saved
  screenshot — never retype base64 by hand.

## 2 · Reproduce the exact state

The diff is only as honest as the state behind it.

- **Same data.** Transcribe the frame's content into fixtures — names, copy,
  counts. A different name length moves every column.
- **Same size.** `viewport` = the frame's size; `fullHeight` for a frame
  taller than the viewport.
- **Scripted setup**, by role and accessible name (`getByRole("dialog", {
  name: "Tags" })`), never by coordinates: open the menu, tick the three rows,
  type the text the frame shows. A state you set up by hand cannot be rerun.
- **Fresh state per case** (`CONFIG.reset`: clear storage, reload); hide dev
  chrome the design does not draw (`CONFIG.css`); wait for fonts; let enter
  transitions settle (`settleMs`). The script disables animations and the
  caret at capture.

## 3 · Read the red, not the number

A design tool and Chromium rasterise glyphs differently, so 0% never
happens. The percentage only compares runs of the same case.

| What the diff shows | What it is |
| --- | --- |
| A red **outline** of every glyph | Font rasterisation. Not a defect — unless the outline is offset (then it is position) |
| A **doubled** element: two copies, red where they disagree | An offset. The gap between the copies is the error in px |
| A red **block** | A missing, extra or mis-sized part |
| A red band along one edge of the whole case | The two images differ in size — the console prints `size ref … vs actual …`. Fix the size first; everything below it shifts |
| Red arcs only at the corners of an element case | The export is transparent outside a rounded box, the app has page ground there. Ignore |
| A red line where a hairline should be | Stroke placement — see the strokes trap below |

## 4 · Measure before you fix

Red says *where*; it does not say *why*. Before editing, hold two numbers:

```js
// Playwright, in the reproduced state
const box = await page.getByRole("article").first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
```

…and the design's own layout values for the same node: Figma
`get_design_context` on the section (padding, gap, sizes); Paper
`get_computed_styles` plus `get_node_info` world coordinates. Subtract.
"The row is 126px and the frame says 124" is a fix; "it looks a bit tall"
is three wrong fixes. Measure the element, then its children, until the
delta lands on one property.

## Traps already paid for

| Trap | Rule |
| --- | --- |
| A 0.5px border made a 124px row 125–126px | Figma draws an inside stroke **within** the box (check the stroke alignment in your tool); a CSS `border` adds to it. On a fixed-height box use an inset `outline` (`outline-offset` negative) or an inset `box-shadow` |
| Masking the red away | A mask (`masks`) is only for what the app cannot reproduce on purpose — a sticker menu drawn over a row, rows the frame does not draw — and every mask carries a comment saying why. A mask without a reason hides the next regression |
| An empty, collapsed element still pushed its neighbours | It is still a flex child, so the container's `gap` applies to it. Group it with its neighbour in a gap-less wrapper, or remove it from the flow |
| Text wrapped at a different word than the design | Check the text STYLE first — the frame used Body/12 where Body/13 was assumed — before suspecting the font or the renderer |
| "Fixing" a 1px hairline | Diorama's 1.5px hairline renders at 1px in Chromium at DPR 1, and Paper's canvas snaps it the same way. Compare at the same DPR, and check what your design tool draws, before changing a stroke |
| A case that passes on the second run only | An enter transition was still running. Raise `settleMs` for that case, or wait for the element's final state in `setup` |
| A component restyled until the diff is green | When the design and a Diorama component disagree on geometry, that is a design-system gap: style through `className`, and report it upstream rather than forking the component silently |
| A screenshot judged at 2× in a viewer | Zoom lies about subpixels. Judge from the diff at 1×, and from the measured numbers |

## Done means

No new red blocks on the screens you touched; what remains is glyph
outline and the masked areas, each with its reason. Paste the before → after
percentages for the touched cases into the pull request — they show the
direction, the diff images show the proof.
