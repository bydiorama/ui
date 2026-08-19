---
name: design-component
description: Designing a component in Paper against the Diorama design system — every state, every size, both colour schemes — before anyone implements it. Use when asked to design or extend a component, turn a moodboard or reference artboard into a spec, add missing states to an existing sheet, or produce a Paper handoff artboard. Covers the token workflow, the dark-scheme traps, and the placeholder-data harness.
---

# Design a component

This is the step **before** `add-component`. Its output is a Paper artboard
that an implementer can build from without guessing, plus the design gaps it
surfaced. `CONVENTIONS.md` and `AGENTS.md` win over anything here.

One rule governs the rest.

**A sheet is a contract, not a picture.** Every value on it will be
transcribed by someone who cannot see your intent — so a value that is not a
token, or a state that is not drawn, becomes an invention at implementation
time. `add-component`'s § 1 tells implementers that raw hex on a sheet is a
*design bug*. This skill is how you avoid shipping them.

Corollary: **the sheet is where a missing token gets discovered.** Designing
Table found two — a selected-plus-hover fill that no role expressed, and
`--ui-bg-hover` and `--ui-bg-selected` resolving to the same value in light,
which makes a hovered row and a selected row indistinguishable. Neither is
visible from code. Both are obvious the moment the states are drawn side by
side, which is the whole reason this step exists.

## Order of operations

### 1 · Load the Paper guide, then read what is already there

- `get_guide({ topic: "paper-mcp-instructions" })` once per session, before
  any other Paper call. `get_basic_info` for artboards and dimensions.
- **A reference artboard the user points at is a moodboard, not your canvas.**
  Screenshot it, take the ideas, and `create_artboard` for the spec. Never
  edit the references — the user is still reading them.
- Match the file's existing handoff convention — § *The handoff sheet format*
  below has the measured values. A sheet that looks unlike its neighbours
  reads as a draft.
- **Never hand-draw an icon.** Extract the real glyph from the installed icon
  set and name its layer after the export — the **`griddy-icons-in-paper`**
  skill is the method. A drawn approximation looks close enough to approve and
  is not what ships, and an icon layer called `SVG` has lost the one thing the
  sheet knew: which glyph it is.

### 1b · Read the primitive before you draw a control that already exists

**`pnpm design:primitives [name…]`** prints the size, radius, variant and
prop-default maps straight out of `registry/ui/*.tsx`. Run it before drawing
any Button, Input, Textarea, Tabs, Badge, Select or Accordion, and draw the
numbers it gives you.

Tokens are not enough, and one sheet proved it: Buttons drawn as pills, fields
with a 1px `border-control` edge, segmented rows at 32px — every value a legal
token, not one of them what ships. `shape` defaults to **`soft`**; a Button's
edge is an inset **`ring-[1.5px]`**, not a border; `secondary` carries **no
fill**; a field's resting edge is a **1.5px `border-subtle`** hairline because
the focus ring — not the border — carries SC 1.4.11.

**Never transcribe those numbers into this file.** A table here is a second
copy of `button.tsx` that goes stale the first time someone edits the real
one, and a sheet built from the stale copy still looks approvable. The script
reads source at run time and so has nothing of its own to drift.

**An off-scale value inside a component is the component's, not yours.** Tabs
insets its track `p-[2px]` and says in a comment why the scale cannot express
it. "Correcting" that on a sheet is drift wearing compliance; match it and
leave the gap recorded where it already is.

### 1c · Drawing a SCREEN? The chrome has sheets too — read them

`design:primitives` covers controls. It does not cover Header, Sidebar,
Nav Rail or the way they connect, and a screen is mostly those. Before
drawing an app frame, read **their component sheets** and **`Patterns ---
Navigation`**, which is the contract between them — the component sheets
specify the parts, the pattern sheet specifies what pressing something does.

Four screens shipped here built from a paraphrase of that chrome instead, and
every one of them was wrong in the same quiet way: a wordmark where the sheet
draws a 32px brand mark, a bare hamburger where `chromeControl` puts a
`bg-elevated` 32px square, nav items at `label-md`/500 where Header.Item is
`button-sm`/600 with the CURRENT item **receding** to `ink-muted`, a Sidebar
with gaps between rows where the real one stacks them flush and lets each
row's own 12px padding make the rhythm. Every value was a legal token. None
was the component. The reviewer's note was one line: *look at the sidebar or
navigational menu header.*

The pattern sheet also settles things a component sheet cannot: a control that
GOES somewhere is a link and one that OPENS something is a button; a layout
renders the rail **or** the bar's menu button, never both; exactly one item per
nav carries `aria-current`. Drawing two collapsed states, or a menu button with
no surface behind it, is a layout bug the components will not catch for you.

## The handoff sheet format

Measured off the Button sheet with `get_computed_styles`, not eyeballed —
which is how a new sheet ends up looking like its neighbours rather than
nearly like them. `Handoff - Components` is the page; `Component --- <Name>`
is the artboard name.

### Artboard and guides

| Setting | Value |
|---|---|
| Width | **1280px** |
| Height | `fit-content` — never a guessed number; content decides |
| Grid guide | **4px** — the spacing scale's own base, so a nudge lands on a step |
| Column guide | **centre, 12 columns, 96px wide, 4px gutter** |

The columns close at 12 × 96 + 11 × 4 = **1196**, centred in 1280, which leaves
a 42px margin each side. Guides are an editor setting — the MCP surface does
not expose them, so set them on the artboard by hand once and every later sheet
inherits the same rhythm by being duplicated from it.

**The sheets built before this was settled are 1120 wide.** They are internally
consistent and were measured that way; leave them unless you are reflowing one
for another reason, and use 1280 for anything new.

### Structure

| Part | Value |
|---|---|
| Artboard | `padding: 64px`, `bg-base`, column, `align-items: center` |
| Container | column, `align-self: stretch`, `gap: 64px` |
| Sheet heading | row, `gap: space-lg`. Title `text-title-lg` / 500 / tracking-tight, **`width: 20%`**; intro paragraphs `text-body-sm` / 400 in `text-muted` |
| Section | column, `gap: space-2xl`. Head row is the same 20% title lane at `text-title-md`, description `text-body-sm` muted |
| Annotation row | `border-top: 1px` `border-subtle`, `padding-block: space-sm`. Name lane **120–150px fixed**, `text-label-sm` / 600 primary; note `text-label-sm` / 400 muted |
| Token map row | a 16px swatch, then a **200px** name lane at `text-label-sm` on a `bg-sunken` / `radius-sm` inset, then the role in muted `label-sm` |
| Specimen | on `bg-surface` inside a `radius-md` frame with a `border-subtle` hairline — a bar or a rail painted `bg-surface` is otherwise invisible on `bg-base` |
| Icons | real glyphs from the icon set, each layer named for its export (`Search`). See **`griddy-icons-in-paper`** |

The **20% title lane is the thing that makes the page feel like one document.**
Every head — sheet, section, and the parts table's first column — lands on it.

Sections that earn their place on a handoff sheet, in this order: Anatomy ·
the component's own axis (sizes, levels, states) · behaviour that spans
components · Token map · **Gaps**.

### The Gaps section is not optional

It mirrors the doc's `needsDesign` and `knownGaps`, so the disagreement
between the drawing and the code is visible to whoever picks the work up
rather than living in a comment nobody opens. One badge per row, from a fixed
vocabulary:

| Badge | Fill | Means |
|---|---|---|
| **Not built** / **Missing** | `intent-warning-bg` | Drawn here, absent in code |
| **Conflict** | `intent-warning-bg` | The sheet and the code disagree; someone must choose |
| **Built** / **Closed** / **Decided** | `intent-success-bg` | Was open, now resolved — say which way |
| **Measured** | `intent-warning-bg` | A number was taken and it is not comfortable — the row carries the ratio and names the fix, but the choice is the reader's. Distinct from **Derived**: derived is a hypothesis nobody checked, measured is a fact nobody has acted on |
| **Derived** / **Corrected** / **Absent** | `bg-elevated` | The library's own reading, a design defect fixed, or simply not drawn |

**Update the badge when the gap closes; do not delete the row.** A resolved
decision with its reasoning attached is what stops the next person
re-deriving it — that is the whole value of the section.

### 2 · Get the token values from the REPO, not from Paper

**Paper's token list is light-only.** A flat file cannot hold a
`light-dark()` pair (`design/paper/README.md`), so the dark column of any
sheet is a mock and the resolver owns the real values. Dump both schemes
before drawing anything:

```ts
// run from the repo root: node --experimental-strip-types <file>.mts
import { resolveThemePair } from "./packages/tokens/src/resolve.ts";
import { THEME_ZERO, resolveZeroPairOptions } from "./packages/tokens/src/themes/zero.ts";
const pair = resolveThemePair(THEME_ZERO, resolveZeroPairOptions);
console.log(pair.light["--ui-bg-hover"], pair.dark["--ui-bg-hover"]);
```

Skip the mood-and-palette brief the Paper guide asks for — the design system
already is the brief. Say so in one line and start.

### 3 · Draw light first, in tokens, section by section

Use `var(--ui-*)` for every colour in the light half. It documents the role at
the same time as drawing it, and `get_computed_styles` will hand the
implementer the token name rather than a hex.

Sections that earn their place, in this order:

| Section | Why it is not optional |
|---|---|
| Anatomy | The lane system — fixed slots and which column flexes |
| Sizes | `sm`/`md`/`lg`: row height, inline padding, body size, radius |
| States | Every state the component can enter, one per row, labelled |
| Data states | Loading and empty — the frame must not collapse |
| Dark | The states matrix **and** the sizes, again |
| Token map | part → role token → light value → dark value |

The token map is the section that actually gets implemented from. Build it.

### 4 · Write small, clone rather than rewrite

One `write_html` call per visual group. For anything repeated — rows, header
variants, spec lines — write **one**, then `duplicate_nodes` and restyle from
the returned `descendantIdMap`, batching into a single `update_styles`. Seven
row states cost one row of HTML and two batched calls this way.

Repeated rows need **fixed-width slots with `flexShrink: 0`**, never gap
alone (the Paper guide's vertical-lane rule). It is what lets three sizes of
the same table stay comparable.

### 5 · Dark is a second drawing, not a filter

**CSS custom properties do not cascade in Paper.** Re-declaring `--ui-bg-base`
on a frame changes nothing for its children — Paper resolves tokens at the
document level. A cloned light section dropped into a "dark portal" frame
renders exactly as light, and looks like it worked until you screenshot it.

So: clone the light section, then apply the resolved dark hex node by node in
one batched `update_styles`, grouped by role (all primary inks, all muted
inks, all hairlines, …). Grouping by role is what keeps it reviewable.

### 6 · Check the interaction ramp, not the individual states

The surface scale **inverts between schemes** (`add-component` § 2), and the
consequence for a *ramp* is sharper than for a single role: put the container
on the wrong ground and hover steps darker while pressed steps lighter, so the
two states straddle their own background. Both values were correct in
isolation.

Draw the dark container on `--ui-bg-surface` (`#2F2C29`) over a
`--ui-bg-base` page, and read the ramp as a sequence — resting → hover →
pressed must move one direction, in both schemes.

### 7 · Review, export, hand off

- `get_screenshot` after every section, against the guide's checkpoints. Use
  `scale: 2` for anything under ~4px: a 2px selection edge read as absent at
  1x and was there.
- **List the new tokens explicitly in your reply.** A token invented on a
  sheet and mentioned nowhere is a defect the implementer inherits.
- Export the artboard into `design/` and record the Paper URL — the ledger
  entry for the implementation uses it as provenance. Anything you could not
  resolve goes to the user *and* into the doc's `needsDesign`, which
  `pnpm design:gaps` collects.
- `finish_working_on_nodes` when done. Never leave node IDs in user-facing text.

**Sweep the board before you call it done — a screenshot cannot see any of
this.** Each `find_nodes` query below must come back empty; each one is a
defect that shipped on a sheet that looked finished.

```js
find_nodes({ nodeId, filters: [{ styleName: "font-family", styleValue: "system-ui, sans-serif" }] })
find_nodes({ nodeId, filters: [{ styleName: "font-family", styleValue: "*Mono*" }] })
find_nodes({ nodeId, filters: [{ styleName: "font-size",   styleValue: "11px" }] })   // and 10px
find_nodes({ nodeId, filters: [{ styleName: "border-radius", styleValue: "6px" }] })  // and 2px, 3px
```

Then `find_nodes` for `box-shadow: *` and check every hit against a resolved
`--ui-shadow-*` value. Report the counts — "verified 0" is evidence; "looks
right" is not.

### 8 · Extract the geometry into a spec (ADR 0019)

An exported PNG is evidence of approval, not a value. The numbers the sheet
lays out belong in `design/paper/specs/<item>.geometry.json`, where
`check:design-spec` and the geometry browser test both read them.

```js
get_computed_styles({ nodeIds: [container, ...children] })  // declared: padding, radius, gap
get_node_info({ nodeId: container })                        // laid-out rect + worldX/worldY
get_children({ nodeId: container })                         // each child's worldX/worldY
```

**First check the coordinates are real.** `get_node_info` does not always have
them: on a hug-content auto-layout frame it returns the ARTBOARD origin for the
container and for every child alike, with `height: 0` — the layout has not been
resolved at the point the API answers. Three children reporting identical
`worldX`/`worldY` is that failure, not three children stacked at a point. A
child with an explicit `width`/`height` reports its real box, which is why the
same call can be trustworthy for a media frame and useless for the row above it.

When the coordinates are absent, say so and derive nothing. An arithmetic claim
built on a fabricated position is worse than "not measured": the geometry gate
will happily encode it, and the browser test will then fail against the render
for a reason nobody can find. Screenshot at `scale: 2` to reason about the
layout, verify what you CAN verify with `get_computed_styles`, and write the
spec only for the nodes whose boxes the API actually returned.

| Trap | Rule |
| --- | --- |
| Transcribing `padding` as the gap | `gaps` come from **world coordinates** — container border box to the union of the children. A gap copied from the styles panel checks the author's arithmetic against itself and can never fail. |
| Trusting `worldX` on a hug-content frame | It is the artboard origin, not a position. Check that siblings differ before subtracting them. |
| Recording the declared border | Record the **used** width. Paper's canvas snaps `1.5px` to 1px at DPR 1, exactly as Chromium does, and it is the difference between a sheet that adds up and one that appears to be 1px out. |
| A frame with a typed height | Paper stretches children to fill it. If `track-is-the-sum-of-its-parts` fails on the sheet, the typed height is the suspect — say which number wins, in `deviations`. |

## Placeholder data

**Use famous graphic designers and inventors of European descent.** Not
"John Smith", not lorem — the names below vary in length, carry diacritics,
and pair with real disciplines and four-digit years, so a sheet built on them
stress-tests truncation, lane widths, tabular figures and the typeface's
accent coverage at the same time as it looks considered.

| Name | Discipline | Year |
|---|---|---|
| Jan Tschichold | Asymmetric typography | 1928 |
| Josef Müller-Brockmann | Grid systems | 1961 |
| Wim Crouwel | New Alphabet | 1967 |
| Adrian Frutiger | Univers | 1957 |
| Otl Aicher | Munich pictograms | 1972 |
| Massimo Vignelli | Subway signage | 1972 |
| Karl Gerstner | Programme design | 1964 |
| Muriel Cooper | Visible Language Workshop | 1975 |
| Cipe Pineles | Editorial art direction | 1942 |
| Herbert Bayer | Universal typeface | 1925 |
| Johannes Gutenberg | Movable type | 1440 |
| Ottmar Mergenthaler | Linotype | 1886 |
| László Bíró | Ballpoint pen | 1938 |
| Guglielmo Marconi | Radio telegraphy | 1895 |
| Nikola Tesla | Alternating current | 1888 |
| Rudolf Diesel | Compression engine | 1893 |
| Ada Lovelace | Analytical engine notes | 1843 |
| Alan Turing | Universal machine | 1936 |
| Hedy Lamarr | Frequency hopping | 1942 |
| Joseph Marie Jacquard | Punched-card loom | 1804 |

Conventions that come with it:

- Longest name first in any list — `Josef Müller-Brockmann` is the one that
  breaks a lane, so put it where you will see it.
- Statuses are `Active` / `Pending` / `Archived`, mapping to the intent roles
  success / warning / neutral. Three values, so the neutral case is drawn.
- Emails use a reserved domain (`…@diorama.example`, RFC 2606) — a placeholder
  address must not be able to route.
- Never a real customer, colleague or account. Placeholder data ends up in
  screenshots, visual baselines and public docs.

## Traps already paid for

| Trap | Rule |
| --- | --- |
| `--ui-*` set on a frame, children unchanged | Custom properties do not cascade in Paper. Dark needs explicit values, applied per node |
| `fontFamily` set once on the artboard | **Neither does font.** Every text node needs its own `font-family: var(--ui-font-body)`, or all of them render `system-ui` — the whole board in the wrong face, and nothing looks broken. Sweep it: `find_nodes` for `font-family: "system-ui, sans-serif"` must return **0** |
| Reaching for mono for numbers or token names | There is no mono face (ADR 0011). Numeric alignment is `font-variant-numeric: tabular-nums`; token strings get a `bg-sunken` / `radius-sm` inset in the body face |
| A label at 11px because it "reads as a caption" | 12px is the floor and `--ui-text-caption` **is** 12px. ADR 0009 §2 records the 11px specimen as an annotation error — do not re-derive it |
| `--ui-bg-emphasis` for a selected chip, segment or row | The chosen item in a set is `--ui-bg-selected`, as Tabs draws it. Emphasis is a filled action; only the single primary action in a view gets a filled accent (`ui-craft` 18) |
| An invented shadow | Paper has no shadow token type, so paste the resolved `--ui-shadow-*` value and put the role in the layer name — that name is the only record the implementer gets |
| Reading dark values off the Paper token list | It is light-only. Resolve from `packages/tokens` (§ 2) |
| Hover and selected drawn from `--ui-bg-hover` and `--ui-bg-selected` | Identical in light (`#EDE8E3`). Two states that must differ and don't = a missing token, not a design choice |
| A 2px accent edge on its own subtle tint | `--ui-bg-accent` is a *light* blue; on `--ui-bg-accent-subtle` it vanishes. `--ui-bg-accent-legible` exists for this |
| A role reused on a ground it was never chosen against | A token is legible against the surface its own component sits on, and nowhere by default. `--ui-border-subtle` measures 1.21:1 on `bg-sunken` — a Dot Pattern drawn with it is invisible, and the sheet still passes every sweep because the value is a legal role. Compute the ratio against the ACTUAL ground before deciding it works, then put the number in the annotation |
| "It looks invisible" left in an annotation | A perceptual claim in a contract is the thing the next person cannot check. Replace it with the ratio and the ground — *"1.21:1 on bg-sunken, so this sheet draws it at border-default (1.76:1)"* — and, when the fix belongs to the other component, say whose doc it is |
| The dark card put on `--ui-bg-base` | It is the page ground in dark. On `bg-surface` the hover/pressed ramp is monotonic; on `bg-base` it straddles (§ 6) |
| A cloned full-width block dropped into a padded frame | `flexShrink: 0` children overflow the padding silently. Recompute the width against the container's **content** box |
| A gutter of labels beside a table | Row pitch is the declared height (border-box); the spacer must be container border + header + its border. Screenshot and trace the lanes |
| Rewriting HTML to change one row | `duplicate_nodes` → `descendantIdMap` → one batched `update_styles` + `set_text_content` |
| Editing the artboard the user linked | It is reference. New artboard, distinct name |
| A state drawn in light only | Half a spec. The dark half is where the ramp bugs are |
| Judging a hairline or a 2px edge from a 1x screenshot | `scale: 2`, or you will "fix" something that was already right |
| A value on the sheet that is not a token | It is a design bug by the time it reaches `add-component`. Either it is a role, or it is a **new** role you name and flag |
| A screenshot of a section that comes back on BLACK | Nothing is wrong. A frame with no fill is transparent, and `get_screenshot` backs transparency with black — so `text-primary` labels look like they have vanished. Screenshot the ARTBOARD to judge colour; sections are for layout |
| `get_screenshot` returning nothing at all, repeatedly | **Check the active page first.** Paper renders only the page that is open, so every screenshot of a node on any other page comes back empty — including a page YOU were working on a moment ago, because the user (or your own `open_file`) can move the cursor. `get_basic_info` names the active page; `open_file({ pageId })` fixes it in one call. Only once the page is right is the other cause in play: an artboard too tall to render (roughly 3–4k px and up), which is not transient and not worth retrying — capture the sections instead, and say in the handoff that the whole board was never seen in one frame |
| A node that reads as 0×0, or children all reporting the artboard origin | Same root cause as the blank screenshot when it is page-related: an inactive page measures as nothing. If the page IS active, it is the hug-content limitation in § 8 — not a broken layout. Never "fix" a layout on this evidence |
| A gradient that does not appear | Paper takes `background-image: linear-gradient(…)` and ignores `radial-gradient` silently. A fade under a header, or over a clipped block, works and is worth drawing; a dot grid or any repeating pattern does NOT — draw that as an SVG (`<path>` of circles) or clone the real `DotPattern`. Both failures report success |
| A cloned overlay landing as a thin strip | The source was `position: absolute` inside a phone frame; cloned into a flex column it leaves the flow and the column collapses under it. Set `position: relative` and an explicit width/height on the clone |
| Cloning a specimen by the layer name that sounds right | Open it first. "Nav Rail Level 2" was an agent-history rail in one place and a collapsed rail in another, and both captions were written before either was looked at |
| A specimen painted `bg-surface` on a `bg-base` artboard | Invisible. Give it a `radius-md` frame with a `border-subtle` hairline — the sheet is documentation, so a boundary that does not exist in the product is allowed here |
| An icon drawn by hand because it was quicker | It is a lie in a contract: close enough to approve, not what renders. Extract it (**`griddy-icons-in-paper`**) |
| An icon layer left called `SVG` | The glyph's identity is gone — path data is unreadable, so the layer name is the only record, and recovering it means matching 1159 candidates by eye. The implementer guesses instead, which is the decision the sheet existed to make |

## Definition of done

Every state the component can enter, drawn · all three sizes · **both
schemes, with the interaction ramp checked as a sequence** · every colour a
role token or a named new one · **every icon extracted from the set and its
layer named for the export** · a token map section · **a Gaps section
mirroring the doc, one badge per row** · new tokens and unresolved gaps
reported to the user · exported to `design/` with the Paper URL ·
`finish_working_on_nodes` called.

A sheet missing any of these is a mood board, whatever it looks like.
