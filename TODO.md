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

- [x] Header refinement and validation
- [x] Select code review
- [x] Sidebar, header opens a link that opens their iframe as a separate window
- [x] Slide, stepped indicator
- [x] Slide, the handle is offset
- [x] Tabs, disabled status

### Now unblocked by Select

Both were blocked on a component that did not exist, and both are code work
rather than design:

- [x] **Calendar** renders its month and year as a heading because there was
      no Select. *Done — but NOT by wiring Select in: the two triggers swap
      the day grid for a listbox in place, because inside DatePicker the
      calendar card is already a popover and a popover over a popover is two
      surfaces where the sheet draws one. See
      `ledger/entries/2026-08-07-calendar-month-year-selects.json`.*
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

**This list is currently setting the build order, and it should not be.**
Measured against `service-portal/src` on 2026-08-13, the primitives the one real
consumer renders most are the ones missing — and three of them are not on this
list at all:

| Unbuilt | Consumer call sites | On this list? |
|---|---:|---|
| **Skeleton** | **46** | **no** |
| **InlineAlert** | **13** | as "Hint / Callout"? — confirm |
| **Toast** | **12** | yes |
| Tag | 6 | no |
| Typography | 5 | no |
| Radio | 4 | yes |
| Tooltip | 2 | yes |
| Divider | 0 | yes, as a "quick win" |

Skeleton alone has more call sites than Modal, and nothing in the portal renders
without it. Divider and Tooltip are the reverse — near-zero consumers, so build
them last or not at all. See [`PLAN.md`](PLAN.md).

Quick wins:
- [x] Progress
- [ ] Divider
- [ ] Image preview (Business Cards)

Design:
- [x] Accordion
- [x] Aspect Ratio
- [ ] Breadcrumb
- [ ] Card Selected
- [ ] Card Task
- [ ] Media preview
- [ ] Multiselect Multi-line item (super, description, state)
- [x] Image Upload Dropzone
- [ ] Empty-state
- [ ] File Upload Dropzone
- [ ] Folder
- [ ] Pagination
- [ ] Progress Indicator Circular
- [ ] Radio
- [ ] Skeleton
- [x] Table
- [ ] Table Line Items
- [x] Tabs Underlined
- [x] Text Area
- [ ] Toast
- [ ] Tooltip
- [ ] Weight Allocator
- [ ] Wizard Layouts/Steps
- [ ] Widget
- [ ] Progress Long Operations
- [ ] Progress Sectioned List
- [ ] Progress Stream
- [ ] Message Bubble

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

**122 across 25 of 34 component docs** (2026-08-13). Every one is a place where
the code currently carries a **derived** value — a hypothesis, not a decision.
They are questions for design, not defects.

Run `pnpm design:gaps` for the list. It is not reproduced here: it was, once,
and the copy sat at 23 entries while the real number reached 122 — which is
exactly the failure the "do not maintain by hand" rule at the top of this file
exists to prevent. What stays below is the part no script can derive: the
handful that are **blocked on a person choosing**, which is triage, not output.

The signal worth watching: **two components asking for the same thing.**
That was invisible while these lived as prose in separate `knownGaps` lists,
which is why the gate exists.

The count is now growing faster than it is cleared — roughly nine new gaps per
component shipped, up from 22 across 21 docs on 2026-08-07. The gate is working
as designed; the backlog it makes visible is real, and Phase 3 inherits it.
Worth a triage pass before the block work starts. The heaviest declarers are
Table (16), ImageUpload (10), ImageEdit (10), Thumbnail (9) and Button (8).

### Decisions blocked on a person

These cannot be resolved by looking harder at the file. Someone has to choose.

- [ ] **Is the menu surface a Menu at all?** `menu.doc.ts` flags this as the one
      question worth answering first. The sheet draws a second level expanded
      *inline* beneath its parent, in the same panel — a disclosure, not a
      submenu. It ships as a real submenu, because an inline disclosure inside
      `role=menu` breaks the roving-focus model that makes a menu a menu. If the
      drawing is the intent, **this surface is a Sidebar inside a Popover** and
      the component is misnamed. Its rows are already copied Sidebar frames.
- [ ] **Button — the model and the compositions disagree**, and there are now
      **two sheets that also disagree with each other.** The handoff sheet
      (`XK7-0`) was rebuilt to match the implementation; the older component
      sheet (`E3V-0`) is what the earlier notes here described, and the two give
      different pictures of Secondary Hover, Outline Hover and pressed. Retire
      `E3V-0` or reconcile it — a handoff with two spec sheets is a handoff with
      none. Everything else in `button.doc.ts` waits behind this.
- [ ] **The panel inset, now asked by two components.** Menu and Select both
      ship a 4px inset where the sheet draws 8, because 4 + 8 wants a 12px outer
      radius and the scale has no 12px step. Two components asking for the same
      thing is the signal this section exists to surface. Bring Paper in line,
      or say which of the other two numbers should move.
- [ ] **Select's trigger inset.** The sheet draws `px-lg` (16) where Input's
      control is `px-md` (12). Shipped as Input's, because the whole claim is
      that a field is a field — confirm which wins.

Closed since this list was last written:

- [x] ~~A collapsed rail, or a menu button?~~ **Both** — ADR 0015 makes NavRail
      a *sibling* of Sidebar rather than a mode of it, and it ships at 48px.
      That also settles the 48/50/56 width disagreement between the artboard,
      this file and `sidebarDoc`, in favour of 48. *(task #43)*

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

      Worth stating plainly, because the green tick hides it: all 124 committed
      baselines are `-chromium-darwin`, and `check:visual-coverage` asserts only
      that each component has a *named case in the matrix source* — not that a
      baseline exists. So `pnpm verify` passes while **nothing is compared**,
      and all 34 components currently have no visual regression protection.
      This is the oldest unclosed item in the plan and the cheapest to fix.
