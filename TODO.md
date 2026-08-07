# TODO

Three kinds of thing live here, kept apart because they are answered by
different people:

1. **To do** — known defects and follow-ups in what already ships.
2. **Design** — components and patterns not yet drawn at all.
3. **Open design questions** — places where a component SHIPPED but the sheet
   did not answer something, so the code carries a derived value. These are
   generated: every one is a `needsDesign` entry in a `*.doc.ts`, and
   `pnpm design:gaps` prints the current list. Do not maintain section 3 by
   hand — fix the doc and re-run.

---

## To do

- [ ] Header refinement and validation
- [ ] Select code review
- [ ] Sidebar, header opens a link that opens their iframe as a separate window
- [ ] Slide, stepped indicator
- [ ] Slide, the handle is offset
- [ ] Tabs, disabled status

### Now unblocked by Select

Both were blocked on a component that did not exist, and both are code work
rather than design:

- [ ] **Calendar** renders its month and year as a heading because there was
      no Select. Wire them to the real component and drop the apology in
      `calendar.doc.ts`.
- [ ] **Drawer** draws two select fields in its content that were never built.
      Same.

### Recently addressed — worth re-checking, not ticked off

- [ ] *Header refinement* — rebuilt around `Header.MenuButton`; the Sidebar now
      compresses to a single button rather than a rail. Whether a rail is
      wanted instead is question **#43**.
- [ ] *Select code review* — Select shipped with contract, type, a11y and
      visual coverage, and its menu geometry was corrected against `EVQ-0`.
      A fresh pair of eyes is still worth it.

---

## Design

Not drawn yet. Roughly in the order they were written down, not in priority
order — worth a triage pass, since several of these block nothing and two or
three block quite a lot.

Quick wins:
- [ ] Progress
- [ ] Divider
- [ ] Image preview (Business Cards)

Design:
- [ ] Accordion
- [ ] Aspect Ratio
- [ ] Card Selected
- [ ] Card Task
- [ ] Media preview
- [ ] Multiselect Multi-line item (super, description, state)
- [ ] Image/File upload dropzone
- [ ] Aspect ratios
- [ ] Folder
- [ ] Progress Indicator
- [ ] Radio
- [ ] Table
- [ ] Table Line Items
- [ ] Tabs Underlined
- [ ] Text Area
- [ ] Toast
- [ ] Tooltip
- [ ] Weight Allocator
- [ ] Wizard Layouts/Steps
- [ ] Progress Long Operations
- [ ] Progress Sectioned List
- [ ] Progress Stream
- [ ] Bubble
- [ ] Message

Use case specific:
- [ ] Hint / Callout
- [ ] Code Block
- [ ] Color Tiles/Palette
- [ ] Type Scale/Hierarchy
- [ ] Type Styles
- [ ] Color Picker
- [ ] Image Crop Dialog
- [ ] (React) Email Components

---

- [ ] Replace skeleton/Default UI animation pattern

---

## Open design questions

23 across 21 component docs, from `pnpm design:gaps`. Every one is a place
where the code currently carries a **derived** value — a hypothesis, not a
decision. They are questions for design, not defects.

The signal worth watching: **two components asking for the same thing.**
That was invisible while these lived as prose in separate `knownGaps` lists,
which is why the gate exists.

### Decisions blocked on a person

These four cannot be resolved by looking harder at the file. Someone has to
choose.

- [ ] **Button — the model and the file disagree.** Every button *composed* in
      Paper is a pill, while the stated model makes soft the default. One of
      the two needs updating, and it is not for the implementation to pick.
- [ ] **Paper and the code now disagree on the menu inset by one value.**
      Closed in code: the panels ship `radius-md` (8) over a **4px** inset
      around `radius-sm` (4) rows, so §6 closes at 4 + 4 = 8. The sheets draw
      an 8px inset, which closes on no radius the scale has. Bring Paper in
      line, or say which of the other two numbers should move instead.
- [ ] **A collapsed rail, or a menu button?** Sidebar and Header both raise it.
      A rail is a second, different answer to the same problem the menu button
      already solves; `--ui-nav-rail-width` exists for one but is 3.5rem/56px
      against the 48px drawn in `HFP-0`. *(task #43)*
- [ ] **Select's trigger inset.** The sheet draws `px-lg` (16) where Input's
      control is `px-md` (12). Shipped as Input's, because the whole claim is
      that a field is a field — confirm which wins.

### Button

- [ ] Outline is not drawn — `E3V-0` has no Outline row. Its edge is derived as
      `border-control` (3.11:1), the step SC 1.4.11 needs from a boundary.
- [ ] The soft radius at `lg` is derived from `md` (8px); the sheet draws soft
      only at `sm`.
- [ ] No busy state is drawn; the spinner is ours.
- [ ] Ghost Large draws `paddingInline` xl where the other three large buttons
      draw lg. Corrected to lg in Paper — confirm.

### Select / Multiselect

- [ ] The highlighted row is drawn as the raw palette step `--ui-neutral-95`
      rather than a role. Shipped as `bg-hover`, the interaction role — a
      surface role used as an interaction state is the wrong-category signal
      the token layer exists to catch. It is one step stronger than drawn.
- [ ] Row `GVO-0` is drawn `py-lg px-md` where the sheet's other three rows,
      and both of Multiselect's, are a uniform `p-md`. Shipped as `p-md`,
      following the majority — the outlier is worth fixing in Paper.
- [ ] No option **groups** are drawn, though the behaviour layer supports them.

### Calendar

- [ ] No today state is drawn. The outline is derived. *(Which day is today is
      now a `today` prop — the component used to read the real clock, which
      made its visual baseline rot overnight.)*

### Card Sorting

- [ ] The 24px handle is SC 2.5.8's floor *exactly*, not a comfortable target.
      A 48px invisible hit area would fix it without changing the drawing.
- [ ] No lifted appearance is drawn for the dragged row beyond the active edge.

### Drawer

- [ ] The tall detent is still a demo height. The half-open state is now drawn
      (`J88-0`) and `snapPoints` ships, but only the 0.5 detent comes from the
      file — confirm the taller one. The 80% cap now applies only when
      `snapPoints` is omitted.

### Header

- [ ] The bar's inline padding is a raw 20px, off the spacing scale, and the
      design's own mobile bar uses 12. Shipped as 16.
- [ ] No current state is drawn for a nav item; its fill is derived from
      `--ui-bg-hover`.

### Sheet

- [ ] The width cap is derived from the rail's width; the sheet draws one 320px
      viewport. A desktop width (30%?) is undrawn.

### Sidebar

- [ ] Row hover and focus are derived from `--ui-nav-active-bg`; the sheet
      draws rest and current only.

---

## Known system gaps

Not design questions — engineering debt with a decision already made.

- [ ] **A portalled panel does not re-skin under a brand scope** without an
      explicit `container`. Theme tokens are inherited custom properties, and a
      portal to `document.body` leaves the themed subtree. Affects Modal,
      Popover, Sheet, Drawer, Select and Multiselect alike. The `container`
      prop is the escape hatch; a default that does the right thing is not
      designed.
- [ ] **The visual gate needs its Linux baselines recorded.** The CI job is
      wired and runs inside a pinned Playwright container; `check:visual-runner`
      keeps the image tag and the lockfile in step. It cannot go green until a
      `-chromium-linux` baseline set is committed, and that set can only be
      recorded on Linux: run the **Generate visual baselines** workflow,
      download the artifact, unzip it over `registry/visual/__screenshots__/`,
      **look at the PNGs**, then commit. Until then the job fails with that
      instruction. *(task #42)*
