# Site design review — 2026-11-12

Review of the public-site designs in Paper (file *Diorama - 2026 - UI and Portal
Demos*, page *Public Page*, the `Site --- *` artboards) and of the
`design-component` skill used to draw them. The yardstick is
`docs/site-design-brief.md` and the *Docs site* section of `PLAN.md`, both as
of 0d0faf1.

Three reviews were run, as asked:

1. **anti-skill**: does the design do what the brief asks? Standard depth.
2. **content-creative-review**: copy, labels, numbers and placeholder data.
3. **better-interface**, using **better-layout**, **better-typography** and
   **better-ui** (fetched from `jakubkrehel/skills`, main branch).

The review was read-only. Nothing in Paper or the repo was changed, apart from
adding this file.

**Not asked and not assumed:** whether the leaner Home and Component pages
were cut on purpose in an earlier round ("Lead in light", minimal). If they
were, finding C1 becomes a brief amendment rather than a design gap.

---

## Verdict

| Review | Verdict |
|---|---|
| Against the brief (anti-skill) | **Rework the Home and Component pages; fix the numbers everywhere.** The visual direction is strong and consistent. The two most important templates draw less than half of what the brief specifies, and every figure on the site is typed by hand and most are wrong. |
| Content (content-creative-review) | **Ship after fixes.** The voice is right. The blockers are false numbers and code samples that don't match their previews. |
| Interface (better-interface) | **Approve** for layout, typography and UI polish: no HIGH findings in those domains. Accessibility, writing and colour were **Not reviewed**, because their skills (better-accessibility, better-writing, better-colors) were not in the set. |

---

## Part 1 — Against the brief (anti-skill)

**Context.** Output: 50 artboards (Home, Gallery, Component page, Example page,
Theme playground at 1280 and 320, light and dark, each with an Effects-on
twin, plus menu, search and appearance open states). Intent: the brief's §5
page designs, which `PLAN.md` S1 needs before the build starts. Audience: the
four readers in brief §1. Modes: Intent Alignment, Completeness, Logic Audit,
Challenger, Evidence Check (against the repo, not the web: every claim is
internal).

### Critical

**C1 · The Home page draws one of the brief's six sections.** Mode: Intent Alignment.
- *What.* Brief §5.1 asks for: a lead with two actions (*Browse components*,
  *Read the docs*), a live composition of six to eight components with scheme,
  density and brand controls, three proof tiles, a three-step "add, own, sync"
  strip, a gallery strip, and a *For agents* block. §3 also puts the theme
  playground on the home page's second screen. The design has the lead (with
  no actions) and the gallery strip. The proof numbers are reduced to a footer
  line, and *For agents* is a footer link.
- *Why it matters.* The prospective-client reader ("judge the craft") and the
  designer reader ("what it looks like in our brand colours") both land here.
  Neither gets the composition or the re-theme moment the brief calls "the
  gallery's argument". With no primary action, the page has no next step.
- *Fix.* Add the composition (the Review request card already exists and would
  serve), the two actions, the proof tiles and the distribution strip. If the
  cut was deliberate, amend brief §5.1 and §3 to say so.
- **Status, 2026-11-12: drawn as an alternative, not yet chosen.** A new board,
  *Home v3 (brief §5.1) · 1280 · Light*, sits beside Home v2, which is
  unchanged. It draws all six sections in the brief's order:
  - The lead is now one sentence, with the install line and the two actions.
  - The playground (the §3 second screen) shows the Review request card on a
    stage. Scheme, density (Compact, Default, Comfortable) and brand controls
    sit beside it.
  - Three proof tiles, each linking to Status:
    - 52 components, 46 stable and 6 experimental.
    - 304 contrast pairs, 0 below their floor.
    - 1,506 browser tests in 71 files.
  - The add, own and sync strip uses the CLI's real verbs.
  - The gallery strip is cut to four tiles.
  - The *For agents* block covers `llms.txt`, `llms-full.txt`, the `.md`
    routes, `/r/registry.json` and the three skills.

- **Closed, 2026-11-12: Home v2 stays as it is.** The cut was deliberate.
  Brief §5.1 now describes v2's three parts (lead, re-themable gallery,
  footer facts) and lists the cut sections with where each one lives instead.
  §3 point 2 now names the gallery controls as the re-theme moment and moves
  the full playground to `/theme/`. v3 stays on the canvas as a reference
  only, with no 320, dark or Effects-on versions.

  Notes on v3, kept for reference:
  - The strip's commands are written as `npx @bydiorama/ui …`, which
    returns E404 until the CLI is published (issue #30). The README's
    from-a-checkout form is the one that works today.

**C2 · The Component page draws 5 of its 13 sections, and the "On this page"
rail promises the other 8.** Mode: Completeness.
- *What.* Drawn: header, Playground, Install, Usage, Props, and a "Measured
  contrast" block. Not drawn: Anatomy and composition, Examples (the variant
  **matrix**), Do and don't, Accessibility with the **keyboard table**,
  Motion, Rendering, Design notes and declared gaps, Changes. The rail lists
  "Accessibility" but the page heading says "Measured contrast".
- *Why it matters.* Brief §3 and §2.2 make the proof sections the
  differentiator: accessibility as content, honest gaps, rendering class.
  These are exactly the sections not drawn. They are also the hardest to lay
  out: the box-drawing composition tree that cannot align in Aspekta, the
  keyboard table, and the matrix. The template will be built from this
  drawing, so whatever it leaves out gets invented at build time.
- *Fix.* Draw the remaining eight sections at 1280 and 320, at least in light.
  Make the rail match the headings.

**C3 · Every number on the site is typed by hand, and most are wrong.** Mode:
Evidence Check. Brief §1: "No number on the site is typed by hand."

| Shown | Repo, 2026-11-12 | Where |
|---|---|---|
| 169 contrast pairs measured | **304** pairs across 54 components (52 UI items plus 2 blocks), `registry/contrast.generated.json` | footer, every page |
| 168 of 169 pairs pass; "Border subtle on sunken 1.21 : 1 · Below 3 : 1" shown as a failure | **0** pairs fail their floor. The 1.21 pair is DotPattern's, classed `decorative`, which has no floor | Theme playground, both widths |
| 1,276 browser tests | **1,506** tests in 71 files, from `vitest list --project contract` in `apps/storybook` (a source grep undercounts, because `.each` tables expand) | footer |
| Progress · Experimental | Progress is **stable** in `ui.manifest.json` | Gallery 1280 |
| Button secondary label, dark 6.8 : 1 | **7.02** | Component page |

- *Why it matters.* The positioning is "a design system you can inspect,
  measure and own". A visitor who checks one number and finds it wrong stops
  trusting the rest. The false failing pair also inverts "honest status": it
  shows theme zero failing its own gate when it passes.
- *Fix.* Give every figure a source query in the artboard's layer name (for
  example `generated · contrast.generated.json · count`) so the build can't
  hand-type it. Correct the five values above now. Show a failing pair only
  under the Stress preset, where a real one exists.
- **Status, 2026-11-12: values fixed in Paper.** Every footer, including the two
  superseded Home v1 boards, now reads "304 contrast pairs measured · 1,506
  browser tests". The Theme page reads "304 of 304 pairs pass". The 1.21 pair is
  now set in muted ink and labelled "Decorative". Dark boards show dark-scheme
  ratios: 1.12, 17.2 and 7.0. "Text on background" moved from 17.1 to 17.2,
  because the repo has 17.17. Progress no longer carries "Experimental". The
  Component page shows "Dark 7.0 : 1". The source-query layer names are **not
  done**.
- **Also fixed.** Progress specimens read "67%", not "2 of 3", on every board.
  `<Progress hasValueText>` renders a rounded percentage and has no "n of m"
  form, so "2 of 3" was a value the component can't show.

### Important

**I1 · Code samples don't match their previews or the repo.** Mode: Logic Audit.
- **Example page.** The code says `placeholder="Name or email"`; the 1280
  preview says "Add a reviewer by name or email". The code returns only the
  header, input and rows, yet the preview also has Progress, Checkbox and two
  Buttons, and "Uses" lists them. The 320 card says "3 reviewers, due 14 Nov";
  the 1280 card says "Three reviewers, due 14 November".
- **Component page.** The usage import is `@/components/ui/button`. The
  registry installs to `ui/button.tsx`, and `README.md:150` imports
  `@/ui/button`.
- **Install note.** "Adds button.tsx and its dependencies: lib/cn, lib/motion"
  leaves out the npm dependency `@base-ui/react@1.7.0` and the
  `button.doc.ts` file that `r/button.json` also installs.
- *Fix.* Draw code from the real files. Brief §5.3 requires "no snippet is
  typed into a page", and the first success criterion is an agent installing
  Button from the site alone. A wrong import path fails that criterion.
- **Status, 2026-11-12: fixed in Paper.**
  - **Import.** It reads `@/ui/button` on all four Component page boards.
  - **Install note.** It now reads: "Adds ui/button.tsx and button.doc.ts,
    lib/cn and lib/motion. Installs @base-ui/react, clsx and tailwind-merge."
    The last two come in through `r/cn.json`. It is updated on all eight
    boards.
  - **Example code.** It is now the whole card, written against the real APIs:
    - `Card.Header` takes the title as children, plus `subtitle` and `actions`,
      which hold the Badge. The old code passed a `title` prop that doesn't
      exist.
    - `Card.Body` holds `Input icon={<Search />}` and the rows.
    - `Card.Footer` holds `Progress hasValueText`,
      `Checkbox defaultIsChecked` and both Buttons.
  - **Example copy.** The placeholder is "Add by name or email" and the subtitle
    is "Three reviewers, due 14 November", identical in code and preview at
    both widths and in both schemes. "14" and "November" are joined by a
    non-breaking space so the 320 card doesn't strand "November".
  - The 320 code block now shows the full file and clips at the edge like a
    scrolling block.
  - The superseded v1 boards' `src/components/ui/date-picker.tsx` now reads
    `src/ui/date-picker.tsx`.
  - **Still open.** `onClick={save}` on the Component page refers to an
    undefined `save`. Brief §5.3 still wants snippets pulled from files at
    build time, not typed.

**I2 · The site's controls differ from the brief's.** Mode: Intent Alignment.
- The header has no scheme toggle (brief §4: "then search, the scheme toggle
  and a GitHub link"). Scheme sits in each page toolbar instead.
- The Component page playground has no **brand** control (brief §5.3 row 2).
- The Install tab shows only the shadcn command; the brief also asks for the
  `@bydiorama/ui` CLI line. Dependencies are plain text, not links.
- The Gallery has no **text filter**, **status filter** or **list-view
  toggle** (§5.2). The sidebar has no "New" badges (§2.1 item 10).
- The Theme playground is missing **ratio** and **shadow intensity**
  controls. Its colour table is headed "Light · Dark" but shows one value per
  row.
- The Example page viewport switcher has no **drag handle** (§5.4).

**I3 · The Effects toggle depicts a mode the library doesn't have.** Mode: Challenger.
- *What.* The fx layer (ADR 0022, `registry/lib/fx/fx.ts`) is per-component
  classes, as in `fx("glass", "specular")`. It has no global "Effects on"
  switch. The shading on the Effects-on artboards is a hand-tuned recipe of
  rgba gradients and shadows; it is derived from `glass.css`'s specular layer
  but exists in no token or stylesheet.
- *Why it matters.* Brief §5.3: "No docs-only copy of a component may exist."
  A site toggle that renders a look the registry can't produce is that copy.
  Brief §6 also caps the fx layer at one use on the home page.
- *Fix.* Either make the shading a real library item first (an fx preset or a
  token set, through `design-component` and `add-component`), or drop the
  toggle from the site and keep the Effects-on artboards as a design study.
  Record the choice in the brief.

**I4 · The CodeBlock specimen gate was skipped.** Mode: Completeness. `PLAN.md`
S1 puts it "before anything else": a 40-line file, a diff and a shell command
in Aspekta, deciding ADR 0011. Every page now relies on proportional code, but
the longest sample drawn is 11 lines and there is no diff. The decision brief
§9 #2 depends on has not been tested.

**I5 · The 320 pages lose content the 1280 pages have.** Mode: Completeness.
- The 320 Component page drops **Usage** and the **shape** prop row.
- Its playground code and install command have **no copy button**; the 320
  Home has one.
- "Open in Storybook" becomes "Storybook", which then wraps alone onto a
  second line.

Brief §7 requires reflow at 320 *including code and tables*, not a shorter
page.

**I6 · Missing states.** Mode: Completeness. No empty, no-results or loading
states are drawn: a gallery filter with no matches, search with no results,
the Example preview iframe loading. better-interface requires these to be
reviewed, so their absence is recorded here.

### Minor

- **M1.** The Component page footer is inset 64px, but the page content starts
  at 336px and the sidebar at 24px, so the footer aligns with nothing on that
  page. On Home, Gallery, Example and Theme it does align (64 = content edge).
- **M2.** The Gallery's Forms list in the sidebar shows 10 of 12 items: Range
  slider and Calendar are missing.
- **M3.** The Progress specimen is drawn 8px tall, which is size `sm`. The
  default `md` is 16px (`progress.tsx:28`), and the code never says
  `size="sm"`.
- **M4.** Stages are a flat tone. Brief §6 names `DotPattern` as "the
  candidate ground". The flat tone is a reasonable choice; record it in the
  brief.
- **M5.** Presets "Kiln", "Fjord" and "Moss" don't exist in
  `packages/tokens/src/themes/`, which holds `zero.ts` only. That's fine for a
  mock, but the build will need three themes defined.
  - *Status, 2026-11-12:* the presets are renamed on every board. Theme zero
    is now *Zero*, Kiln is *Graphite* (a low-contrast black and white) and
    Fjord is *Hockney*. Brief §5.5 records both seeds, which resolve with
    every light pair passing. Home v2 is drawn once in each theme. Moss is
    unchanged, and none of the seeds are in `packages/tokens/src/themes/` yet.
  - *Found while drawing them, now fixed:* Hockney's white surface derived
    an elevated (`#F5F5F5`) and a sunken (`#F2F2F2`) that measured 1.01 : 1
    on its pink stage. The pink is now Hockney's surface (`#FAEBE6`), so
    every board's stage is `bg-elevated` again, and the wells measure
    1.20 : 1. This resolved the Paper comment on the Avatar tile.
  - *Open:* the Hockney board's buttons and input are `shape="full"`, as
    asked in a Paper comment. Shape is a component prop; no seed knob can set
    it, so a preset can't ship pill controls yet.

### Verified claims

- 52 UI items in the manifest; Actions 2, Forms 12, Display 12, matching the
  brief's categories.
- Button: six variants, three sizes, `shape` of `soft | full` with `soft` as
  default, `isBusy` defaulting to false, matching `button.tsx` and
  `pnpm design:primitives`.
- "Seven colours and a few numbers": `zero.ts` has seven seed colours per
  scheme. (The brief says eight; see *Source corrections*.)
- Theme zero hexes on the Theme page match `zero.ts`. Base 16 px, radius 8 px
  and border width 1 px are correct.
- Button contrast: primary label 11.35 : 1 in both schemes; secondary label
  light 5.93 : 1.
- Switch "on" uses `accent-legible` (#518CA2); the checkbox uses the accent.
  Both match source.
- SiteHeader's current item is `ink-primary` with the others muted
  (`site-header.tsx:320`), matching the drawing.
- Chart is experimental in the manifest, matching the Home tile.

### Strengths

- The direction holds across 50 artboards: one accent, tone instead of boxes,
  and the specimens are the loudest thing on every page, exactly as brief §6
  asks.
- The Example page states its own limit: "Shown as source. Not yet
  installable as a block." That is brief §5.4 to the letter, and a good model
  for honest status elsewhere.
- Dark mode is drawn as a second drawing, not a filter. The dark ramp goes up
  from the page as the skill requires.
- Placeholder people come from the skill's list, and the longest name leads
  the list.
- All text I sampled meets 4.5 : 1, including muted ink on stages and badges
  in both schemes (lowest: #A69F98 on #383531 = 4.67).

---

## Part 2 — Content (content-creative-review)

The brief's audiences replace the skill's social-media personas. Passes D
(carousel system) and E (illustration house style) don't apply to a docs site
and were skipped.

**Voice line, from brief §3:** plain, specific, short; say what a thing does
and where it stops; no superlatives.

### Blockers

- The false numbers and the false failing pair: C3 above.
- Code that doesn't match its preview, and the wrong import path: I1 above.

### Copy

| Page · element | Current | Issue | Proposed |
|---|---|---|---|
| Gallery · Switch summary | "Turns one setting on or off, at once." | "at once" reads as "simultaneously" before it reads as "immediately" | "Turns one setting on or off. The change applies immediately." |
| Home · lead | "…built to take your brand." | "take" a brand is unusual English and hard for second-language readers | "…built to carry your brand." or "…built to be rebranded." |
| Theme · lead | "…measures the result as you move." | "move" what? | "…measures the result as you drag." |
| Component · title | "Button Stable" | The status reads as part of the name, and a screen reader says "Button Stable". Brief §5.3 asks for a status badge | Name, then the Badge component (or a labelled `Status: Stable`) |
| Home / Theme · badge specimen | "Active · Experimental · Stable" | The word "Experimental" inside a specimen competes with the real status labels next to it | Use non-status words, for example "Draft · In review · Published" |
| Component · lead | Two sentences | Brief §3 asks for one public sentence. The second sentence is design rationale | Keep "Starts an action." and move the rest to Design notes |
| Theme · colour table header | "Light · Dark" | One value is shown | "Light" (with a Dark column), or "Value" |

**AI-pattern scan:** no hits. The lead is a triplet ("inspect, measure and
own"), but it names three real things and is the brief's positioning line, so
it stays.

### Readers (brief §1)

- **Engineer or agent installing.** The install line, props, source link and
  "Copy page as Markdown" are all present and easy to find. The import path
  would break their build (I1). There is no keyboard table (C2).
- **Designer evaluating.** "Do we have a date picker, and in our colours, in
  under a minute": the category chips and the brand control get them there,
  but there is no text filter on the Gallery (I2).
- **Engineer maintaining.** "Changelog" is in the header and "Changes" in the
  rail, but the section isn't drawn and there are no "New" badges.
- **Prospective client.** The craft shows. The home page doesn't make the
  case: no proof tiles, no composition, no action (C1).

### Source corrections (the brief itself)

- Brief §2.2 says "eight seed colours". `zero.ts` has **seven** per scheme.
  The Theme page is right and the brief is wrong.
- PLAN.md S1 closes on export to **`design/paper/`**. Use that folder when
  exporting.

---

## Part 3 — Interface (better-interface)

**Scope.** The 50 `Site --- *` artboards. This is a static design, so there
were no runtime checks. The stack is Tailwind 4 with `--ui-*` tokens and
Aspekta only (ADR 0011). Convention documents read: `AGENTS.md`,
`CONVENTIONS.md` (via the design-component skill), the brief, ADR 0022 (fx),
and the ledger entry `aspekta-has-no-tabular-figures`.

| Domain | Evidence inspected | Result |
|---|---|---|
| Accessibility | — | **Not reviewed**: better-accessibility not in the set |
| Layout | Five 1280 light pages, three 320 pages, alignment edges from computed styles | 3 findings |
| Writing | — | **Not reviewed**: better-writing not in the set; copy is covered in Part 2 |
| Typography | Computed size, weight, line-height and features on inputs, values and labels | 3 findings |
| Colour | — | **Not reviewed**: better-colors not in the set; contrast was spot-measured (see Verification) |
| UI polish | Surfaces, effects recipe, icons, specimens | 2 findings |

| Severity | Domain | Location | Before | After | Why |
|---|---|---|---|---|---|
| MEDIUM | layout | Home 1280 and 320 | No primary action in the view | Add *Browse components* (primary) and *Read the docs* | One primary action per view; the reader has no next step |
| MEDIUM | layout | Component page 320, code blocks | Horizontally scrolling code and install line, no copy control | Pin the copy button at the block's trailing edge, as at 1280 and on Home 320 | Controls must not leave with the overflow; copy is the main action on these blocks |
| MEDIUM | typography | Example page 320, Input · md ("Name or email") | 14px input text | 16px on phone widths (`text-base sm:text-sm`), or decide it in the Input component | iOS Safari zooms the page when an input's text is under 16px. This is the library Input, so the fix belongs there |
| MEDIUM | ui | Every Effects-on artboard | rgba gradients and shadows set by hand | Values from tokens or an fx stylesheet | The same detail done two ways: components ship one shading, the site shows another (see I3) |
| LOW | layout | Component page 1280, footer | `padding-inline: 64px` | Align with the content column (336px), or with the 24px page edge | Align to shared edges |
| LOW | layout | Component page 320, action row | "Storybook" wraps alone onto a second line | Shorten all three labels or let the row scroll | Plan for growth; a one-word last line looks broken |
| LOW | typography | Theme page value slots and contrast ratios | `font-feature-settings: "tnum"` | Delete it. Aspekta ships no tabular figures (ledger 2026-11-11); the fixed 40px right-aligned slot already stops the jitter | A feature the font lacks does nothing; prefer `font-variant-numeric` if a face with tnum ever arrives |
| LOW | typography | Component title | Status set in the H1 at display size | Badge beside the heading, outside the `<h1>` | Heading text should be the name only |

### Verification

**Passed:**
- Font sweep for `system-ui` across the page: 0 nodes.
- Monospace sweep on the Component page 1280: 0 nodes. (Paper Mono and Arial
  nodes exist in the file but on other, non-site boards.)
- 11px and 10px text on the Example page: 0 nodes.
- Phone search field text: 16px.
- Contrast, computed from the drawn hexes. All pass 4.5 : 1:
  - #69635D on #F6F3F0: 5.36
  - #69635D on #EDE8E3: 4.87
  - #8F5426 on #F8E7D9: 5.03
  - #246E41 on #D6EFCB: 5.05
  - #A9441F on #FFFFFF: 5.94
  - #A69F98 on #1E1B18: 6.56
  - #A69F98 on #383531: 4.67
  - #1B6C84 on #EDE8E3: 4.89
  - #1D1B19 on #9EDBF3: 11.35

**Not verified (a static design can't show these):**
- Focus indicators, keyboard paths, 24px targets, 200% zoom, RTL mirroring.
- Reduced motion, sticky-header `scroll-padding`.
- The hover-only query and theme-switch transition suppression (both build
  concerns).

**Verdict: Approve** for layout, typography and UI polish. There are no HIGH
findings in those domains; the MEDIUM and LOW rows are work to do.
Accessibility, Writing and Colour: **Not reviewed**.

---

## Part 4 — The `design-component` skill against the brief

The skill was written for component handoff sheets. These pages are screens,
and the gaps above trace back to what the skill doesn't cover.

1. **It has no "draw the brief's sections" step for pages.** Step 1c covers app
   chrome. Nothing tells the designer to list the brief's sections and either
   draw each one or record it as a gap. That is how C1 and C2 happened.
   *Add:* "1d · Drawing a page from a brief — list every section the brief
   names; draw it, or add a Gaps row saying why not."
2. **Its placeholder rule covers people, not numbers.** Names come from a
   curated list, but counts and measured values have no rule, so they were
   made up (C3). *Add:* "Every count, ratio or status on a sheet is read from
   the repo with the command named in the layer. A number you typed is an
   invention."
3. **Pages have no Gaps section.** Component sheets must have one (step
   "The Gaps section is not optional"). The site artboards have none, so the
   disagreements in this review are recorded only here. *Add:* one
   `Site --- Gaps` artboard using the same badge vocabulary.
4. **Effects recipes have no home.** Step 7 asks every `box-shadow` to match a
   resolved `--ui-shadow-*`. The Effects-on recipe matches none, and the
   sweep would have flagged it. *Add:* run the box-shadow sweep on screens
   too, and route any new recipe through the `diorama-effects` skill.
5. **Code samples aren't covered.** Brief §5.3 requires code copied from
   type-checked files. The skill says nothing about code on a sheet. *Add:*
   "Paste code from the file it will be generated from; never retype it."
6. **Export is still pending.** The skill and PLAN S1 both require exporting to
   `design/paper/`. Until then S1 cannot close.

---

## Next steps, in order

1. ~~Correct the five wrong figures and the false failing pair (C3), and the
   import path and dependency list (I1).~~ Done in Paper on 2026-11-12. See the
   status notes under C3 and I1. Still open: the source-query layer names.
2. ~~Decide C1.~~ Done: Home v2 stays, and brief §5.1 and §3 now describe it.
3. Draw the eight missing Component page sections (C2), the CodeBlock specimen
   (I4) and the missing states (I6).
4. Decide the Effects toggle (I3): make it a library item, or drop it.
5. Fold the six skill additions in Part 4 into `design-component`.
6. Export to `design/paper/`.
