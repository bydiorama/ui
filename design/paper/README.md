# Design artifacts — Paper handover

Exported snapshots of the approved design, so this repo stays self-sufficient
if Paper is unavailable (plan §2.3). **The design source of truth for values is
`packages/tokens` — these artifacts are evidence of what was approved, not an
editable source.** Token flow is repo → Paper, never the reverse.

| What | Where |
|---|---|
| Design file | [Diorama UI — Handover](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0) (artboards: `Style Guide`, `Modal Example`, 6 layout examples) |
| Approved | 2026-08-03 (colour, type, spacing, radius, borders, intents, light/dark portal stress tests, first components, modal + micro-elevation + warm scrim, brand-panel layouts) |
| Adopted into code | ledger `2026-08-03-adopt-approved-handover-tokens`, ADRs 0008–0010 |
| Token snapshot at adoption | `tokens.snapshot.json` (Paper's token list the day the values were ported) |
| Section exports | `exports/` (PNG, 1x) |
| Geometry, as numbers | `specs/<item>.geometry.json` — see below |

## `specs/` — the one part of this folder that is not evidence

Everything else here is a picture. `specs/` is what the sheet **lays out**,
node by node: padding, border, radius, each child's rect, and the four gaps
computed from Paper's world coordinates. Two gates read it — `pnpm
check:design-spec` and `registry/visual/geometry.browser.test.tsx` — so a drift
between the sheet and the component fails rather than waiting to be noticed.

It does not contradict the rule above. `packages/tokens` still owns *values*;
a spec records the **arrangement** of already-token-bound values in one
artboard, and every number carries the Paper node id it came from. ADR 0019.

Two traps, both paid for once: gaps must come from world coordinates rather
than the styles panel (a transcribed gap checks the author's arithmetic against
itself), and the border must be the **used** width — Paper's canvas snaps
`1.5px` to 1px at DPR 1 exactly as Chromium does, and reading the declared
value makes a correct sheet look 1px out.

## Pattern sheets

Page-level contracts live on the **Patterns** page, one artboard per pattern.
They do not redraw components — the component sheets win on anything they
specify — they fix what falls *between* components: which region sits where,
which control size belongs to which placement, and which states the page frame
must keep.

| Sheet | Where |
|---|---|
| Index page — the contract | [Patterns page](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/B-0), artboard `Patterns --- Index Page` |
| App header — the contract | same page, artboard `Patterns --- App Header` |
| Index page — specimen | same page, artboard `Patterns --- Index Page Specimen` · `exports/pattern-index-page-specimen.pdf` |
| Index page — Gallery body (Brand Library) | [File Management drafts page](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/D-0), artboard `Brand Library --- Redesign` · `exports/pattern-index-page-gallery-brand-library.pdf` |
| Index page in the sidebar shell (Brand Profile · Logos) | [Brand Profile drafts page](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/F-0), artboard `Brand Profile --- Handoff` · `exports/pattern-index-page-brand-profile-logos.pdf` |
| Open decisions | [Open Decisions page](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/E-0), artboard `Decisions --- Open items, drawn as proposed` · `exports/decisions-open-items.pdf` |

The specimen renders the index-page contract at shipping width (Contacts, 1152)
in both schemes, adds the two regions the contract names but nothing had drawn
— the toolbar under an active selection and an occupied feedback slot — and
carries the measured spec, token map and Gaps. Where it departs from the
contract sheet the difference is a **correction against `registry/ui`**, and
every one is listed in its Gaps section rather than left to be noticed.

**Open Decisions** collects what is still unsettled across all three sheets and
**draws each answer** rather than describing it — where two readings are live,
both are drawn at the same width so the choice is made by looking. It splits
them: items an existing rule already answers (applied, needing confirmation
rather than a decision) and items that need a person. Approve a row and it
becomes canon on its own sheet and leaves this one, so the page should only
ever shrink.

## Component handoff sheets

`Components - Handoff` (page `8-0`) carries the sheets drawn with
`design-component`. Each is 1280 wide, both schemes, with a token map and a
Gaps section that mirrors the component's `needsDesign` / `knownGaps`. The
`Draft --- *` artboards beside them are the designer's originals, kept as
provenance and never edited.

| Sheet | Where | Export |
|---|---|---|
| Radio — the draft, finalised | [artboard `2AIX-0`](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2AIX-0) | `exports/component-radio.pdf` |
| Tooltip — drawn from scratch | [artboard `2AV2-0`](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2AV2-0) | `exports/component-tooltip.pdf` |
| Empty State — validated against the shipped component | [artboard `2B7F-0`](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2B7F-0) | `exports/component-empty-state.pdf` |

**All three are now implemented**, and each sheet carries what building it
corrected. That order — draw, build, then amend the sheet — is the only one in
which a sheet ends up true, and the amendments are the interesting part:

- **Tooltip's two proposed tokens are not tokens.** `--ui-delay-hover-intent`
  and its skip window ship as `HOVER_INTENT_DELAY_MS` and
  `HOVER_INTENT_SKIP_MS` in `registry/lib/motion`, because a delay is read by a
  JavaScript prop and a CSS custom property cannot be read by one. A
  `--ui-delay-*` would have been a token nothing could consume. `check:motion`
  now rejects a bare number handed to `delay`, `closeDelay` or `timeout`.
- **Tooltip's disabled-trigger state cannot happen.** A disabled form control
  receives no mouse events in Chromium and is out of the tab order, so both
  paths to the tooltip are closed. The row is corrected and the recipe — a
  focusable wrapper the caller owns — is in the doc and a story.
- **Base UI supplies no ARIA for a tooltip**, measured at 1.7.0: no
  `role="tooltip"`, no `aria-describedby`. The component sets both itself.
- **The emphasis chip's case is an argument about light.** It is 1.62:1
  against the page in dark and about 1.2:1 against the Menu panel it exists to
  be told apart from. Recorded as a Conflict rather than quietly restyled.
- **Radio's 2px label-to-description gap** is off the 4px scale; corrected to
  `--ui-space-xs`.

## Drawing into the file

Sheets are built with the **`design-component`** skill, which carries the
handoff format (the 20% title lane, the annotation rows, the Gaps badges).
Icons come from the installed set via **`griddy-icons-in-paper`** — extracted,
never hand-drawn, and every glyph layer named for its export so the sheet
records which icon it means.

## Known deltas between the sheet and the code (accepted)

- `caption` renders 11px in the specimen; the contract says 12px (floor).
- Modal panel ("Section options") uses a 12px radius — off the approved
  4/8/16/24/32 scale; queued for designer fine-tune.
- The Drafts-page Share-Link modal still wears pre-redesign fonts/colours; its
  *shadow geometry* is what was adopted (`--ui-shadow-xl`).
- Dark-scheme borders in the portal are raw rgba literals — expected; a flat
  Paper file cannot hold `light-dark()` pairs. The resolver owns dark values.

## Still undesigned (blocks Phase 2 states work, not tokens)

Focus/hover/active/disabled/busy/error states; open floating elements
(Select-open, Menu, Popover, Toast); Textarea, Tabs, Tag,
Divider, Skeleton, Avatar, Progress, Table, Calendar, Drawer,
Banner; motion sign-off; dark-scheme modal/scrim; elevation steps above the
micro shadow (lg/xl are engineering defaults).

Closed since: behaviour layer and state designs are in progress; the mono-face
question is settled — there is no mono face (ADR 0011); **Radio, Tooltip and
EmptyState are drawn** — see § Component handoff sheets. Other items above are
stale too (Tabs, Table and Avatar all have artboards; Skeleton shipped with
`design: null` and genuinely has none). The list is not maintained
per-component — read it as the 2026-08-03 snapshot it is, and trust each
component's own `design` field.

## Fields use `--ui-bg-field`, not `--ui-bg-base`

The surface scale **inverts between schemes**: in light `bg-base` is the
lightest value, in dark it is the *lightest surface* while `surface` and
`sunken` sit below it. A field must be recessed from whatever contains it —
lighter in light, darker in dark — which no single existing role expresses.
`--ui-bg-field` does, and every field fill in this file now points at it.

The dark column of the Color Scheme sheet carries the **literal** dark value
(`#1D1B19`) rather than the token, for the same reason the dark borders do: a
flat Paper file cannot hold a `light-dark()` pair, so the resolver owns dark
and this sheet only mocks it.
