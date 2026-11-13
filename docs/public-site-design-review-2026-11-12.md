# Public site design review — 2026-11-12

Reviewed against PLAN.md (Docs site), docs/site-design-brief.md, CONVENTIONS.md §6, the live Paper Public Page, and the local Astro implementation. Existing uncommitted work was preserved.

## Confirmed and corrected drift

- Hero CTA inherited the gallery browse link’s extra margin, adding 28px on top of the lead’s 32px gap. Scope the override to the hero.
- Paper uses one primary ink role across the headline. The implementation muted the continuation; restored inherited ink.
- Desktop Paper gallery has 32px between 268px tile rows. The implementation used 28px. Restored the spacing scale’s 32px step.
- Paper’s Discard action is outline, while the example used secondary. Use the actual outline variant rather than restyling a library button.
- The 1200px reference layout rule appeared after the 1000px rule and overrode its narrower sidebar. Ordered descending breakpoints so the intended tablet layout wins.

- Scoped documentation table styles to props and keyboard tables so they cannot override library specimens.
- Fixed the agents page marking both Docs and For agents current.

Browser assertions now protect headline ink, CTA margin, desktop gallery row spacing and unique current navigation. These are site checks, not claims of full library geometry coverage.

## Radius finding: the source design also needs reconciliation

Live Paper Hockney Tabs declares outer radius 12px, selected tab radius 6px, padding 3px and border 1.5px. The site preset and Tabs implementation reproduce these declared values. This is not simply a missing theme override. The difference between outer and inner radii is 6px, whereas padding plus the DPR-1 used border is 4px. Theme zero uses 8px and 4px with the same inset and does close that equation.

The existing geometry spec covers theme zero; its green result does not establish brand conformance. Do not globally increase padding to compensate: that changes control height and layout, and diverges from Paper’s explicit 3px inset. The next library change should introduce brand cases in the geometry contract and choose a single geometry owner: derive the nested radius from the actual outer radius and inset, or constrain theme radius combinations. The former preserves density; the latter restricts brand expression. This review does not silently change the distributed Tabs contract or revise the approved Paper drawing.

The Hockney Button and Input also use `shape="full"` in Paper. The brief already records this as a prop-versus-seed gap (§5.5); larger radius seed values alone cannot select that shape. Preserve explicit component shape semantics rather than disguising this with site-only CSS.

## Remaining differences and release gaps

- The implementation adds a philosophy section below the gallery; the inspected Hockney home ends after the gallery. Preserve existing content until it is reconciled across the Paper variants.
- The final featured tile renders Sparkline, whereas Paper labels and draws a bar Chart. Both are library components, but this is a composition difference, not pixel drift.
- The full theme playground, examples routes and per-item interactive specimens remain open in PLAN.md. Existing references and a theme selector do not close those gates.
- Paper’s presentation colors must be compared to resolver output, not copied as arbitrary CSS overrides. A theme resolver may adjust colors for contrast; visual equality alone cannot justify bypassing semantic roles.

## Research used

[Radix radius](https://www.radix-ui.com/themes/docs/theme/radius) explicitly treats rounding as contextual: a fully rounded button must not make a checkbox indistinguishable from a radio. This supports role-specific geometry rather than multiplying every radius indiscriminately; it does not justify adopting another library’s components or theme.

[Radix spacing](https://www.radix-ui.com/themes/docs/theme/spacing) couples layout dimensions when scaling density. Keep density and shape separate: a brand radius change should not unexpectedly enlarge every control.

[MDN border-radius](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-radius) documents the CSS rounding model. Measure used browser geometry at the tested DPR, as this repository already does, rather than assuming a declared fractional border is the rendered inset.

## Validation

Final `pnpm verify`, `pnpm type-check`, `pnpm lint`, and `pnpm test:site` passed. The browser suite checks public pages in both schemes, accessibility, viewport overflow, search, filters, live examples, brand/scheme preferences, mobile references and no-JavaScript content. Reviewed desktop light/dark and 320px light screenshots. No library-wide visual baseline run was performed: this patch changes the site and its compositions, not distributed component implementations. Nothing was staged, committed or published.


## Substantial follow-through — 2026-11-13

The first pass above was incomplete. The following changes supersede its open
radius recommendation and its validation statement that no distributed code
changed.

- Added `SeedShape.controlShape` with independent control-radius and field-inset
  roles. Hockney now renders capsule controls without rounding unrelated
  surfaces. Explicit soft/full shapes override the brand, and theme zero
  retains its existing control sizes and default shape. Field padding includes
  the trailing-control pairing, not just a larger corner.
- Enclosed Tabs derives its nested radius from track radius minus padding and
  stroke, floored at zero. Hockney and Graphite failed the new browser tests
  before this fix; both now pass without altering track height or padding.
  Corrected the corresponding live Paper child radii to 7.5px and 1.5px.
- Button now owns its boundary through `appearance-none`. The native button
  appearance was still enabled under its inset ring. Added failing-first tests
  for secondary and outline. The reported doubled lower edge did not reproduce
  exactly in the captured browsers; the corrected Chromium/WebKit captures show
  one boundary, so the exact screenshot cause is not asserted as proven.
- The full catalog now includes all existing interactive examples, a status
  filter, list view, and short descriptions. Search uses the library Input;
  filter/view controls use the Button recipe. Filtering and view changes reuse
  the same DOM, retaining state and avoiding duplicate catalog entries.
- Fixed DatePicker example hydration drift: the server rendered “November 12,
  2026” while WebKit rendered “12 November 2026”. The example uses the existing
  formatValue seam with an explicit locale.

Research reinforced separating layout rhythm, component density and shape:
[Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/)
uses distinct layout and component spacing roles; the existing Radix sources
above distinguish contextual rounding from density. These findings informed
our own token contract; no third-party component or theme was adopted.

The philosophy section is supported by the revised brief §5.1, despite being
absent from the inspected Paper home. The earlier review should have said so.
It remains intentionally. SiteHeader currently has no search/tools slot and
its collapsed menu requires hydration, whereas the current header retains a
no-JavaScript navigation path. Replacing it blindly would trade one form of
drift for lost behavior; no API was widened merely to fit the site.

The full theme playground, missing per-item specimens and examples routes are
still planned features, not claimed complete by the catalog improvements.

Cross-engine accessibility excludes only Base UI's invisible focus guards on
WebKit: its FocusGuard implementation intentionally sets role=button so
VoiceOver can trigger the trap. Product controls remain audited. This is a
specific upstream infrastructure exception, not an exclusion of dialogs.

Visual baseline investigation: the committed HEAD in an isolated checkout
already fails 29 light cases under this installed browser. The changed run
adds Tabs dark (10 pixels) and changes Tabs light corners. No unrelated
baselines were accepted. Linux baselines require the repository's pinned
workflow; they cannot be generated from an unpushed working tree here.

### Final validation of the follow-through

- `pnpm verify`, `pnpm type-check`, `pnpm lint`, `git diff --check`: passed.
- `pnpm test`: 220 tests passed.
- Button, Input, Tabs and geometry browser contracts: 157 tests passed.
- `pnpm test:site`: passed after the final catalog changes, both schemes,
  accessibility, responsive references, filtering, shape checks and no-JS.
- `node apps/site/scripts/test-browser.mjs --interactions-only --webkit`:
  passed, including the documented focus-guard exception.
- Regenerated and inspected only the intentional macOS Tabs pair; its focused
  visual run passed. Existing unrelated baseline drift was not overwritten.
  Linux Tabs baselines remain pending the pinned workflow.
- Hockney button captures from both engines are in
  `apps/site/test-results/review-hockney-buttons-{chromium,webkit}.png`.

Nothing was staged, committed or deployed. Existing uncommitted site and CLI
work remains in place. The new seed and component contracts are documented in
ADR 0025 and the change ledger; generated registry and site data were rebuilt.

## Accepted decisions implemented — 2026-11-13

This section supersedes the earlier API-table and visual-baseline status above.
The linked [better-ui skill](https://github.com/jakubkrehel/skills/blob/main/skills/better-ui/SKILL.md)
and its [surface guidance](https://github.com/jakubkrehel/skills/blob/main/skills/better-ui/surfaces.md)
were read. The relevant rule is `outer radius = inner radius + padding + border`.
It applies to evenly inset visible surfaces; a table's first data row, below a
header, is a separate surface with asymmetric surroundings. Its top corners
keep `radius-md`. The frame's clipping contour is the concentric child.

### Reading and interaction hierarchy

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | `apps/site/src/components/ReferenceTables.tsx` | Expanding a note widened the Prop column from 34% to 44% and confined the explanation to that cell. | A disclosure opens a separate native table row spanning all lanes. Column widths stay fixed; long notes have a readable line length. | Related content stays beneath its owner without stretching empty adjacent cells or moving the comparison lanes. |
| Medium | `registry/ui/table/table.tsx` | Any focused cell control outlined its entire row, even when the row was not selectable. | Only selectable rows get the additional row outline. Other controls keep their own focus indicator. | Focus identifies the action the keyboard will activate. |
| Low | `registry/ui/button/button.doc.ts` | Variant guidance included implementation history and embedded contrast figures. | Concise descriptions explain when to choose each variant. | Public API guidance helps readers choose; source and ledger retain implementation history. |

`Table.rowDetails` is a render slot, not an expansion controller. Callers own
state, labels, and `aria-expanded`/`aria-controls`; Table owns the spanning
cell, the row's surface, and the divider. Details do not trigger selection.
The public API view supports independent disclosures, Enter/Space, focus
retention, stacked 320px layouts, and a native no-JavaScript notes fallback.
Grouped prop names containing spaces are encoded in disclosure IDs and wrap
on narrow screens; browser assertions cover every such documented entry.

### Nested surfaces

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | `registry/ui/table/table.tsx` | Inner radius was 12px inside a 16px frame with 4px padding and a 1px border. | `max(0px, radius-lg - space-xs - stroke-default)` gives 11px in theme zero. | The visible inset is 5px. Subtracting padding alone ignores the frame edge and separates the corner centers. |

The public Paper component reference was updated in light and dark. Local exports
(ignored renders, with Paper remaining the editable source):
[light](../design/paper/exports/public-api-reference-expanded-light.png) and
[dark](../design/paper/exports/public-api-reference-expanded-dark.png).
[The geometry spec](../design/paper/specs/table.geometry.json) records the real
world-coordinate offsets, not a copy of declared padding. Both the Node
geometry gate and Chromium render test enforce it. Additional Table tests
cover larger/smaller radii, a thicker border, and a radius smaller than its inset.
The old component sheet's unrelated open questions remain open; this is a
measured frame correction, not a claim that the entire sheet was revalidated.

### Catalog coverage

The catalog discovers every `apps/site/src/examples/*.tsx` file automatically.
The same files supply component-page previews and raw code views. The source
gate rejects examples without a public manifest owner or an `Example` export;
the browser check compares actual live catalog links with the files, including
Table. Reference-only components remain listed, but are not described as live
examples. This does not claim a public specimen exists for every library item.

### Visual validation integrity

The visual harness called `toStyleObject(PAIR)[scheme]`, an obsolete API that
returned `undefined`; `Object.assign` silently ignored it. It also cannot set
CSS custom properties on a DOM style declaration. The harness now calls the
current flat-map API and applies custom properties with `setProperty`. An
assertion failed before the fix and now proves the frame actually installs
its resolved theme.

The isolated-HEAD comparison confirms **27 unrelated light-case captures are
pixel-identical to the current render**: accordion, avatar, card-sorting,
chat-composer, chat-message, chat-questionnaire, chat-widget, context-menu,
density, drawer, empty-state, header, image-edit, image-overlay, image-upload,
input, menu, multiselect, nav-rail, progress, radio, select, sheet, sidebar,
textarea, toast and tooltip. Their committed baselines were not replaced.
Most differences from those baselines are one-channel antialiasing changes;
the larger CardSorting/Chat differences also exist at HEAD. This establishes
that this patch did not introduce them, not that they are all approved designs.

Table's light render differs from the isolated HEAD at 112 corner pixels.
Its light/dark macOS baselines were regenerated and visually reviewed. The
light recording also includes the already observed text-rendering differences;
no unrelated component baseline was accepted. The previously reviewed Tabs
pair remains. Linux Table and Tabs pairs still require the pinned workflow
once these changes are available on a remote branch; this session does not
stage, commit, or push source to make that happen.

### Verification

- `pnpm verify`, `pnpm type-check`, `pnpm lint`, and `git diff --check`: passed.
- Table contracts plus geometry: 125 tests passed, including failing-first
  assertions for the old radius, missing detail row, and duplicate focus target.
- Table stories: 6 passed, including the new disclosure composition.
- Full built-site Chromium audit: passed in light/dark, including accessibility
  and overflow. Disclosure tests cover 1440px, 768px, and 320px, stable columns,
  full-width detail cells, Enter/Space, and retained focus.
- Full visual matrix after the reviewed macOS updates: 99 passed, 27 failed.
  All 27 failures match the isolated HEAD captures; the intentional Table/Tabs
  cases pass. Linux updates remain pending as described above.
- WebKit interactions: passed; its previously documented Base UI focus-guard
  exclusion is unchanged.
- The exact earlier secondary-button artifact remains unconfirmed: native
  appearance was removed and captures were inspected in both engines, but the
  supplied artifact was not reproduced before the fix. Do not call that a
  proven root-cause diagnosis.

Approve the inspected API-table interaction, geometry correction, and catalog
coverage. Full visual-baseline reconciliation and Linux regeneration remain
outside this approval.


## Appearance follow-up — 2026-11-13

The Effects switch changed its saved value but not the button material. The
example permanently carried `fx("sheen")`; the off rule hid pseudo-elements,
while sheen paints the element's background layers. A failing-first browser
assertion captured a gradient with Effects off. It now observes `none` off and
real material layers on, including reversal after repeated toggling.

The public site now has one validated preference definition, shared by the
pre-paint restoration script and the reactive store. React islands subscribe
through `useSyncExternalStore`. Unknown saved values fall back per field,
blocked storage leaves the controls usable, and storage events keep tabs in
sync. Explicit schemes still win over brand themes; System follows the OS.

Scheme and Density use equal-width native radio choices, Brand uses aligned
cards, and the panel has Reset and a working local preview. Its controls stay
at default density while examples and the preview use the selected density.
The track uses a default structural stroke so its nested radius reproduces
the **used** inset at either DPR; the browser checks that relationship for
every brand. Focus belongs to the whole choice and follows actual native
focus, including WebKit arrow navigation.

The anchored popover was too constrained on short phones. At narrow widths
or short heights the same content now uses the library Modal, with a close
control, focus containment and a viewport-limited scroll area. The light/dark
Appearance drawings in Paper were revised in place and inspected. At 320 ×
568 the settings fit without scrolling; landscape still lets readers reach
the last control. Changing the viewport while open preserves the setting
surface instead of losing it during the old popover's dismissal.

Effects applies grain to buttons (sheen's pale-accent washout is an existing
limit in ADR 0022), sheen to progress fills, and glow to checked switches.
Examples remain copyable compositions of registry source, with an optional
`hasEffects` argument; no library component gained an effect prop.

`node apps/site/scripts/test-browser.mjs --appearance-only` and its `--webkit`
variant pass 96 rendered combinations each: four brands, three densities,
effects on/off, and Light/Dark/System under both OS schemes. Assertions cover
button and field heights, Hockney shape, nested radii, materials, stable panel
height, keyboard interaction, reload, Reset, malformed/blocked storage,
cross-tab synchronization, small viewports and dialog focus. Both schemes of
every brand are checked with axe. Screenshots are under
`apps/site/test-results/{chromium,webkit}/`.

On macOS, the WebKit check uses Option-Tab to visit all controls without
changing the user's system keyboard preference. This follows the browser's
platform behavior rather than patching the tested DOM; see the
[Playwright keyboard-navigation report](https://github.com/microsoft/playwright/issues/41808)
and [WebKit's focus-visible explanation](https://webkit.org/blog/12179/the-focus-indicated-pseudo-class-focus-visible/).

Final local checks for this follow-up: `pnpm verify`, `pnpm type-check`,
`pnpm lint`, `pnpm test` (220 tests), `pnpm test:cli-package`, the full built-site
Chromium audit and WebKit interaction audit all passed. The previously
identified visual-baseline drift remains separate from these appearance
checks; it has not been silently rebaselined.


### Linux counterparts completed after push

[Generate visual baselines run 43388058479](https://github.com/bydiorama/ui/actions/runs/43388058479)
recorded source commit `edcba9b` in the pinned Playwright 1.62.1 Noble container.
The recording run rendered all 126 cases successfully. Only the four intended
Tabs/Table light/dark Linux PNGs were copied back after inspecting each image;
the Tabs light image was already byte-identical. Other generated images
were left outside the repository. This closes the
Linux regeneration item above. It does not reclassify the unrelated existing
macOS baseline drift as fixed, nor treat an update run as a clean comparison.
