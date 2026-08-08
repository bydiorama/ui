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
- Match the file's existing handoff convention. On this file that is
  `Component --- <Name>`, a title with a one-line subtitle, and numbered
  sections. A sheet that looks unlike its neighbours reads as a draft.

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
| Reading dark values off the Paper token list | It is light-only. Resolve from `packages/tokens` (§ 2) |
| Hover and selected drawn from `--ui-bg-hover` and `--ui-bg-selected` | Identical in light (`#EDE8E3`). Two states that must differ and don't = a missing token, not a design choice |
| A 2px accent edge on its own subtle tint | `--ui-bg-accent` is a *light* blue; on `--ui-bg-accent-subtle` it vanishes. `--ui-bg-accent-legible` exists for this |
| The dark card put on `--ui-bg-base` | It is the page ground in dark. On `bg-surface` the hover/pressed ramp is monotonic; on `bg-base` it straddles (§ 6) |
| A cloned full-width block dropped into a padded frame | `flexShrink: 0` children overflow the padding silently. Recompute the width against the container's **content** box |
| A gutter of labels beside a table | Row pitch is the declared height (border-box); the spacer must be container border + header + its border. Screenshot and trace the lanes |
| Rewriting HTML to change one row | `duplicate_nodes` → `descendantIdMap` → one batched `update_styles` + `set_text_content` |
| Editing the artboard the user linked | It is reference. New artboard, distinct name |
| A state drawn in light only | Half a spec. The dark half is where the ramp bugs are |
| Judging a hairline or a 2px edge from a 1x screenshot | `scale: 2`, or you will "fix" something that was already right |
| A value on the sheet that is not a token | It is a design bug by the time it reaches `add-component`. Either it is a role, or it is a **new** role you name and flag |

## Definition of done

Every state the component can enter, drawn · all three sizes · **both
schemes, with the interaction ramp checked as a sequence** · every colour a
role token or a named new one · a token map section · new tokens and unresolved
gaps reported to the user · exported to `design/` with the Paper URL ·
`finish_working_on_nodes` called.

A sheet missing any of these is a mood board, whatever it looks like.
