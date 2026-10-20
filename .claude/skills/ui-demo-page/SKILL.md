---
name: ui-demo-page
description: Build a live, animatable front-end page from a Diorama screen design — real interactions with transitions.dev snippets, a scripted looping walkthrough, per-component snippets, light/dark modes and composition framing — ready to be captured as video or stills. Use when asked to turn a Paper design into an interactive demo, animate a UI for a screen recording, add motion to a mock, or prepare a page for rendering. Part of ui-motion-media.
---

# UI demo page

One self-contained HTML file that is both a usable prototype and a
deterministic performance. Two references sit beside this file:

- **`reference/daylight-demo.html`**: a complete page (the Daylight screen,
  light and dark), synced to Paper `5F5-0` on 2026-10-19. The sync is one
  commented CSS layer at the end of the style. Open it with `#demo` or
  `#demo-light` to watch the walkthrough. Renderers load it via `PAGE=`.
- **`reference/banner-evolution.html`**: a non-interactive *iteration film*.
  Frames build one by one under a camera that moves over a fixed ground,
  carried-over elements fly between frames, and the camera pulls back to the
  artboard. Start here when the subject is how a design changed, not how it is used.

## Build order

1. **Read the design from Paper, not from a screenshot** — `get_computed_styles`
   for padding, gaps, radii, frame background. The artboard is the contract.
   No connector? See § Reading Paper. Starting from a reference page? Diff it
   first (§ Syncing to a newer design).
2. Build the static screen with the design system's tokens and real
   `griddy-icons` glyphs (inject path data at build time; never redraw).
3. Wire real interactions with transitions.dev snippets.
4. Add the scripted layer: walkthrough, snippets, compositions.
5. Add render hooks, then smoke-test every interaction in Playwright.

## Reading Paper without the connector

Paper draws its canvas as HTML, so a browser on the file can read the same
numbers `get_computed_styles` would. Signed out is enough to read.

- Each node is an element with `data-node-id`, styled inline with `var(--x-ui-*)`.
  The variables are defined per node, not on the artboard, so resolve each one
  through `getComputedStyle(node).getPropertyValue(v)` on **that** node.
- Off-screen artboards are culled and come back empty. Navigate to the node's
  URL (`…/p-2-0/<id>`) and wait before reading.
- **Shader layers** (`data-paper-shader`) are WebGL canvases with no CSS.
  `drawImage` one into a 2D canvas and sample it: pitch, dot profile, ink,
  grid phase, and whether it fades. The *Full View* dot ground had a 16 px
  pitch, ink `rgb(13 13 13 / .078)` in both schemes, dots at x ≡ 8, y ≡ 0, and
  no fade. None of that matched the reference page's dots.
- Paper's text boxes are tight. A page's padded container measures larger by
  its padding, so compare weight, size and colour exactly and position within ±2 px.

## Syncing to a newer design

A reference page is a snapshot of an older revision. Before rendering from it:

1. Extract every Paper node as `id, x, y, w, h | bg | radius | shadow | border |
   type | «text»`, and the same rows from the page rendered at 1:1.
2. Match texts by content and surfaces by rect, then list what differs. The
   Daylight diff found dropped dark shadows, a new screen paint, 450-weight
   meta text, a thread 39 px too low and a split placeholder. Each is easy to
   miss by eye, and they add up.
3. Fix it as **one CSS layer appended last**, with markup changes only where
   the structure changed, so the diff against the reference reads as a list of decisions.
4. Re-run the diff until only measurement artefacts remain. Then update the
   snippet ground and the composition ground to the new screen paint (§ Seamless ground).

## transitions.dev snippets

**Source:** the transitions.dev skills by Jakub Antalik,
<https://github.com/Jakubantalik/transitions.dev/tree/main/skills>. Install with
`npx skills add Jakubantalik/transitions.dev` and load the one the task needs:

| Skill | Use it for |
| --- | --- |
| `transitions-dev` | the `t-*` CSS transitions and their motion tokens: card resize, number pop-in, text and icon swaps, avatar hover, tooltip, text reveal, accordion, toast, checkbox, thinking states, streaming text and more |
| `transitions-polish` | tuning motion that already exists against the token scale (duration, distance, scale, blur, easing), plus open/close and hover in/out asymmetry, stagger and delay |
| `transitions-ui-generation` | an "agent is generating this" reveal: a dotted wireframe measured from the element, then the real UI behind a scan line |

**Attribution and terms.** © 2026 Jakub Antalik / Transitions.dev, under the
Transitions.dev License (`licenses/transitions-dev.LICENSE.txt`; full terms
at <https://transitions.dev/terms.html>). It is not MIT. You may use, copy and
modify the transitions in our own products, demos and media. You may not
republish the collection, or a substantial part of it, as a transitions
library, motion pack or animation kit. The reference pages carry the snippets
they use inline, marked `transitions.dev`, as part of a demo. Keep them that
way, and keep the credit in `CREDITS.md`.

Use them verbatim where they fit (card resize, number pop-in, icon swap,
avatar hover, tooltip, text reveal, accordion, toast, thinking state,
streaming text, text morph, assistant input). Adapt only where the design
system disagrees — the checkbox reveals the real `Check` glyph with a
clip-path instead of the snippet's own tick.

**Each snippet owns `transition` (and often `display`) on its element.** Two
snippets on one element overwrite each other and one silently stops
animating. Give each its own wrapper (`sugg-slot`, `asst-layer`), and restore
`display` with a two-class selector where a snippet sets it.

## The scripted layer — the API the renderers call

```js
window.runDemo()                 // full walkthrough; must END in the start state
window.runSnippet(name)          // one component's beat; ends in the start state
window.snippetRect(name, pad)    // focus rect in viewport px → the renderer's crop
window.runComposition(orient)    // "landscape" | "portrait"
window.showIntroInstant()        // skip the entrance so snippets start composed
```

Snippets are declared as `{ box, extend?, extendY?, grow?, growTop?, padX?, run }`.
`box` is the focus element; `extendY` unions only vertically — that is how the
suggestion snippet reaches its toast without widening past 60%.

**Every run must return to its first frame.** Revert what it did (untick,
fold, `setSugg("pending")`, close the toast), move the cursor back to its
park point just outside the crop, and fade it out. That is the whole loop
seam — the renderer only verifies it.

## Render hooks

| Hook | Effect |
| --- | --- |
| `#demo` / `#demo-light` | render mode: no chrome, padded stage, optional light |
| `window.__RENDER` | skip anything nondeterministic |
| `window.__STAGE_SCALE` | draw the 1512×982 stage at k× (the screencast captures CSS px only) |
| `window.__PAD` | stage padding in px (already × scale) |
| `window.__LIGHT` | light theme |
| `window.__COMPOSE = {x, y, k}` | composition mode: dotted ground, screen at x,y |

## Seamless ground

In snippet mode the page background **is** the frame's background, extended:

```css
html[data-mode="light"].is-demo:not(.is-compose) {
  background: linear-gradient(in oklab 180deg,
    #FDFCFB var(--demo-pad), #F6F3F0 calc(100% - var(--demo-pad)));
}
html.is-demo:not(.is-compose) .app { background: transparent; }
```

The stops sit exactly at the frame's top and bottom, so ground and frame agree
at every height. Verify by sampling pixels just inside and outside the frame
edge — they must match.

## Compositions

Dotted ground (`radial-gradient` dots, gap and radius × k), the screen
bleeding off the frame, and **the vignette as a `::after` layer between the
dots and the screen**. The screen is never under it.

```css
html.is-compose .page::after { content: ""; position: fixed; inset: 0;
  background: radial-gradient(ellipse 75% 75% at 50% 45%, transparent 55%, var(--vig-ink) 100%); }
/* dark: rgba(0,0,0,.42) · light: rgba(120,110,100,.16) */
```

Composition mode needs `html, body, .page { height: 100% }` and the gradient
on `html`. Without them the stage-wrap had no box: the light composition showed
only dots and the dark one was solid black.

**Full View** (Paper's *Article Asset Full View* drafts) is the whole screen at
1:1 on a 1600×1200 artboard: `__COMPOSE = { x: 44, y: 109, k }`, with no bleed,
`.page::after { display: none }` (no vignette) and no `.app` border. The screen's
own paint and radius separate it from the ground. The cursor's park point
(stage 1560, 1040) falls just off the artboard's right edge, so it still enters
and leaves unseen.

## Traps

| Trap | Rule |
| --- | --- |
| Moving this skill, or its reference pages, to the product tier | That would install the transitions.dev snippets into other people's repositories. That is distribution, not use in our own product, so read the Transitions.dev terms first. The same goes for pulling the snippets out into a shared motion file or package |
| Tooltips cropped inside a scrolling column | Flip them below (`.t-tt--below`) where the top would clip |
| The native caret in a slowed render | It blinks in real time, so at ×8 slow-down it flickers. `caret-color: transparent` in demo mode plus a drawn caret |
| Overflowing typed text | Scroll the field with the text and fade the left edge; a static line reads broken |
| A canned assistant reply | Match keywords (`includes("skip")`), or the typed question gets the fallback answer |
| A removed item vanishing | Show the state change first (tick the checkbox), then fold it away |
| `color-mix` of two tokens in Paper | Collapses; only `color-mix(var(--x) N%, transparent)` survives |
| A glow or halo that ends in a hard rectangle | A blurred layer that spreads past a scroll container (`overflow: auto` clips both axes) is cut flat. Walk the ancestors for `overflow`/`contain` and measure the room — the chat pill had 4px to its left. Paint the glow INSIDE the element's own box with radial gradients that fade to transparent; then nothing can clip it and no `filter` is needed |
| An effect class that sets `position: relative` | It silently overrides an absolutely positioned host — the generated event dropped out of its 11:30 slot into the grid's flow and was invisible until the class came off. Scope it: `.gen-host:not(.ev)` |
| A measured width written back as CSS | The renderer scales the stage (`__STAGE_SCALE = 2`), so `getBoundingClientRect()` returns twice the layout size. A text morph that set `width` from it doubled its box in every rendered video — the label and note ran out of the banner — while the browser at 1× looked fine. Use `offsetWidth`/`offsetHeight` for anything written back to styles, or divide by the stage scale; probe overflow AT the render scale |
| A row that grows to the wrong height | `scrollHeight` counts the overflow of absolutely positioned children — the generating layer's blurred blobs reach far below the row, so it grew to almost twice its height. Measure with decorative layers hidden, then restore them; check the height every frame, not at rest |
| A figure that does not follow the data | The hero's "to yourself" was a literal per state, so a task added from the chat left it untouched. Derive every summary figure from state (`updateHero()`), and call it from every flow that changes the day |
| A halo or wash under text | Measure the ink against the effect's STRONGEST stop, not the plain surface: `--ink-muted` was 8.2:1 on the pill and 4.02:1 on the halo peak. Cap the stop alpha to keep ≥ 4.5:1 |
| Resetting by cancelling `document.getAnimations()` | With the CDP Animation domain on (the renderer needs it for ×8), Chromium dropped finished, filled, unreferenced WAAPI animations from the list (127 → 6) while their effects stayed applied. The reset missed them, and the loop ended on the overview (seam 5.08). Keep your own registry of every `Animation` and cancel that |
| A `requestAnimationFrame` tween | It runs at real speed against ×8-slowed CSS and timers. Drive motion with CSS/WAAPI, or divide the tween's clock by `__SLOW` (the reference's `clock()`) |
| A shared-element flight with an even crossfade | It reads as a double exposure: "Three things" and "You have" legible on top of each other. The ghost fades 12–45 % (blur 3 px), the arrival resolves 40–80 %, and the source frame washes out at once, so the lifting copy reads against a dimmed original |
| Feedback appended after the last scroll | The reply's *In your calendar at 11:30* was appended below the thread's fold and never showed. Scroll after appending feedback, and check on the contact sheet that it is inside the focus box |