# API conventions

The rulebook for every component in `@bydiorama/ui`. It exists before the
components do, on purpose: in a system built largely by agents, the constitution
has to precede the code, or each component invents its own dialect.

Rules here are **enforced by types and lint wherever possible**. A rule that
lives only in prose is a rule that gets skipped — that is the whole reason this
file is short and the type definitions are long.

---

## 1. Naming

| Kind | Rule | Example |
|---|---|---|
| Boolean props | `is*` / `has*` | `isDisabled`, `isBusy`, `hasDivider` |
| Callbacks | `on{Verb}` | `onSelect`, `onDismiss` |
| Open/close state | always `onOpenChange(isOpen: boolean)` | never `onClose` + `onOpen` |
| Uncontrolled defaults | `default*` | `defaultIsOpen` (never `initialIsOpen`) |
| Async actions | `on*Action` | `onSubmitAction` |
| Enum values | camelCase strings | `variant="primaryQuiet"` |

No library prefix on component names — it is `Button`, not `UiButton`.

## 2. Variants

- Variants are **finite string unions**, declared per component and **exported**
  as a type: `export type ButtonVariant = "primary" | "secondary" | …`.
- Behavioural props are required; presentational props are optional with a
  default.
- Variant values are shared vocabulary across components wherever the meaning is
  the same (`sm | md | lg` for size; `primary | secondary | ghost | danger` for
  emphasis). Do not invent a synonym for a concept that already has a name.

## 3. Composition

- Complex components customise through **composition — slots, children, render
  props — not through prop explosion.**
- Slot props take an element, not a config: `icon={<ChevronRight />}`, and the
  parent **never wraps** what it is handed. If the parent needs to style a slot,
  it does so from the outside.
- A prop that is usually a boolean but sometimes needs configuration takes
  `boolean | {…}`: `collapsible?: boolean | { defaultIsOpen?: boolean }`.
- Prefer a **hook** over a wrapper component when the behaviour can be attached
  to an element the consumer already owns.

## 4. State

- Inputs are controlled: `value` + `onChange`.
- Every controllable component also works uncontrolled via `default*`, through
  the shared `useControllableState` hook — never a bespoke implementation.
- `isDisabled` and `isBusy` are **different**: disabled is non-interactive and
  removed from the tab order; busy is visual only, keeps focus, and keeps the
  element operable to assistive tech (`aria-busy`).

## 5. Forwarding and refs

- Every component forwards `ref` to its outermost DOM node — **except a form
  control, whose ref goes to the interactive element** (`input`, `textarea`,
  `select`). A ref to a wrapper cannot `.focus()`, cannot be read for a value,
  and cannot be handed to a form library, which is every reason a caller takes
  a ref on a field. The wrapper stays reachable through `data-slot`.
- Every component accepts `className` and spreads the remaining native props.
  `className` always lands on the **outermost** node so sizing and layout
  behave predictably; native props go to the element that owns them (a field's
  `type`/`placeholder`/`value` belong on the `input`, not the wrapper).
  Reaching an inner part from outside is what `data-slot` is for.
- Merge precedence is fixed: **contract props win**. Event handlers are
  composed with the consumer first; `preventDefault()` cancels optional
  component behaviour, while safety invariants still run. `className` is
  merged and `style` is shallow-merged (ADR 0014).

## 6. Styling

- **Semantic tokens only.** `bg-surface`, never `bg-[#fff]`, never `bg-gray-100`.
  Enforced by lint — the Tailwind theme only exposes token-mapped utilities.
- Component-level CSS variables are named `--ui-{component}-{part}-{property}`
  and are the *only* sanctioned override surface below the token layer.
- Never `transition: all` — enumerate the animated properties.
- Every part gets a stable `data-slot` attribute so consumers and tests can
  target internals without depending on class names.
- **Concentric radii:** nested rounded elements compute
  `outerRadius = innerRadius + padding`, from the `--ui-radius-*` scale.
- **Unboxed content is inset inside a large radius.** In a panel at
  `--ui-radius-2xl`, bare text and unboxed controls take a further
  `--ui-space-sm` of inline padding; children with their own fill or border sit
  flush at the panel's padding. Encode it in the component (as
  `Popover.Title` does), never at the call site.
- **Shadows for elevation, borders for structure.** A border whose only job is
  depth becomes a layered translucent `--ui-shadow-*`; borders that communicate
  structure or state stay.
- **Type rendering parity:** app roots set `-webkit-font-smoothing:
  antialiased`, `-moz-osx-font-smoothing: grayscale` and `font-synthesis:
  none`. Paper's canvas renders antialiased with synthesis off; without the
  same settings, macOS draws identical declared weights visibly heavier and
  a missing face gets a faked bold instead of a loud fallback. Set once at the
  root — never per component.

## 7. Iconography

- **`griddy-icons` only.** Never lucide, heroicons, radix-icons or raw inline
  SVG. Enforced by an ESLint `no-restricted-imports` rule.
- Icons are passed in as slots wherever feasible, so usage is visible at the
  call site rather than buried in the component.
- A missing glyph is a gap filed against the icon set — not a reason to import a
  foreign icon.
- *Design side, for reference rather than as a rule of this file:* a sheet
  should carry the real glyph with its layer named for the export, so it says
  which icon it means instead of leaving that to whoever implements it. See the
  `griddy-icons-in-paper` skill. (Making that binding here would need an ADR —
  see § Changing these rules.)
- **The component sizes the slot; the icon library does not.** `griddy-icons`
  renders `width="24" height="24"` as presentation *attributes*, so an
  unconstrained slot ships 24px whatever the control's size prop says — and the
  sheet draws 16 at every control size. Set `[&_svg]:size-4` on the part that
  owns the slot (a CSS rule beats a presentation attribute, so one class is
  enough). `registry/ui/icon-slot.browser.test.tsx` asserts this across every
  component that takes an icon; add yours to it.

### The `griddy-icons` naming anomaly

**`X` is not a close icon.** In `griddy-icons`, `X` is the X (formerly Twitter)
brand wordmark. The cross glyph — the one a close control wants — is **`Close`**
(and `CloseCircle` for the ringed variant).

This is worth knowing because the name reads as the obvious choice and the
mistake is invisible until someone looks at a dark screen: brand marks in the
set hard-code `fill="black"` rather than `currentColor`, so they ignore the ink
role entirely. A Sheet shipped with `X` as its close control and rendered a
black wordmark on a charcoal drawer, next to a correctly-lit back arrow.

73 of the ~1160 glyphs are fixed-fill in this way — the brand marks (`Apple`,
`Android`, `Airbnb`, `Bluesky`, `Xing`, …) plus a handful of others.
`pnpm check:licensing` resolves every icon imported by distributed source and
**rejects any whose fill is not `currentColor`**. That gate is as much about
trademark as rendering: a design system should not redistribute someone else's
logo inside a component. A consumer who genuinely wants a brand mark imports it
in their own code, deliberately.

**`Stop` and `Pause` are fixed-fill too, and they are not brand marks.** The 73
glyphs `check:licensing` rejects are mostly logos, which makes the gate read as
a trademark rule — and then a media control fails it. `Stop`, `Pause`,
`StartRecord`, `Scan`/`QrCode*`, `Import`/`Export`, `FileScan` and every
`ChatCircle*` hard-code `fill="black"` for no reason a caller can see, so they
render a black mark on a dark control and the gate stops the build. Substitutes
that DO take the ink: `SquareRounded` (filled) for stop, `Square` for a bare
one. Chat Composer's Stop button is the case that found it.

If another griddy name turns out to be similarly misleading, add it here — the
list is a record of names that mean something other than they appear to.

## 7a. Overlay taxonomy

Four components put content over the page, and the difference between them is
*how it is dismissed and where it comes from* — not how it looks. The naming
follows shadcn/ui so a consumer's intuition transfers.

| Component | Comes from | Dismissed by | Use when |
| --- | --- | --- | --- |
| **Popover** | Anchored to a trigger | Outside press, Escape | Secondary content that must not take over the page |
| **Modal** | Centred, scrimmed | Escape, scrim, an explicit action | A decision that must be acknowledged |
| **Sheet** | The **left or right** edge, full height | Escape, scrim | Navigation and filters on a narrow screen |
| **Drawer** | The **bottom**, with a drag handle | **Dragging down**, Escape, scrim | A mobile surface the thumb reaches; anything you want to peek at and put back |

Sheet and Drawer are the pair that gets mixed up. They are not `side` variants
of each other: a Drawer's contract is a *gesture*, which means a handle, a
velocity threshold and a body that follows the finger. A Sheet has none of
that, and adding `side="bottom"` to one would produce a Drawer that cannot be
dragged — the worst of both.

## 7b. What is and is not a Button

The five button types are each either **a fill with a matching edge**
(`primary`, `danger`) or **an edge on nothing** (`secondary`, `outline`,
`ghost`). That is not a coincidence to be tidied later — it is the test.

**A fill with NO edge is not a button.** It is page chrome: a menu toggle, a
back arrow, a calendar's month arrows. It lives in `@/lib/chrome-control` and
composes onto a real `<button>`.

This rule was written after the same 32px `--ui-bg-elevated` control was
independently rebuilt four times — Header's menu toggle and avatar frame, the
Sheet nav group's back button, Calendar's previous/next — because it fitted no
button type and nobody had a name for it. `check:controls` now refuses a bare
`<button>` in a component unless the file is allowlisted with a reason, which
is the moment to ask whether Button should grow instead.

The two edge types differ by conformance, not by taste: `secondary` is a
hairline (`border-subtle`, 1.47:1 — decorative, and declared as such), while
`outline` carries a boundary something depends on identifying
(`border-control`, 3.11:1, SC 1.4.11). Reach for outline when the edge has a
job; reach for secondary when it is only separating a quiet control from the
page.

## 7c. An anchored panel never leaves the viewport

Any surface positioned against a trigger — Select's list, Multiselect's list,
Popover's panel — must satisfy **three** things, and they fail differently:

| Requirement | What it prevents |
| --- | --- |
| `collisionPadding` | The panel sitting flush against the window edge after it flips or shifts. |
| `max-h-(--available-height)` | The panel being **taller** than the space it landed in, which loses the rows below the fold. |
| `max-w-(--available-width)` | The same, horizontally. |

`check:overlays` enforces all three, and `overlay-viewport.browser.test.tsx`
proves they have an effect.

**Why this needed a rule at all.** Base UI flips and shifts by default, so an
anchored panel visibly moves out of the way near an edge and the behaviour
looks finished. Repositioning cannot make a panel *smaller* than its space —
and every panel here carried `max-h-64`, a flat 256px with no knowledge of the
window. At a comfortable window size nothing is wrong, which is why no visual,
contrast or a11y gate could ever have seen it. The positioner already measures
the space it found and publishes `--available-width` / `--available-height`;
the fix is to use the measurement instead of a constant.

**Containment assertions do not prove containment.** A 256px panel fits an
896px test viewport perfectly well, so the obvious test — open it in a corner,
assert the rect is on screen — passes against the bug. Probed exactly that way,
and all four cases were green. What distinguishes the two is where the number
comes from: assert the panel's resolved `max-height` **equals the positioner's
measurement**. A constant cannot match it at any viewport size.

**Also check `alignItemWithTrigger` on a Select.** Base UI defaults it to
`true`: the panel overlaps the trigger so the selected row lands on the
trigger's value, iOS style, and `sideOffset` is ignored while it does. It
applies to **mouse input only**, so the panel lands in one place from a click
and another from the keyboard — a keyboard-driven test passes on the wrong
code for free.

## 8. Motion

- Durations and easings come from motion tokens
  (`--ui-duration-*`, `--ui-ease-*`, `--ui-motion-*`). Never a hard-coded `ms`.
- **Transitions for interaction, keyframes for one-shots** — transitions
  retarget mid-flight so a reversed toggle reverses smoothly; keyframes restart
  and feel broken.
- Press feedback is `scale(var(--ui-press-scale))` with a `staticTap` opt-out;
  staged entrances stagger by `--ui-stagger-step` and are reserved for
  infrequent moments (first load, success, empty) — never routine interactions.
  Exits are softer than enters.
- Motion is never the only feedback channel: every animated state change also
  carries a static cue (colour, icon, label).
- **CSS first.** Use `@starting-style`, `transition-behavior: allow-discrete`,
  `interpolate-size` and view transitions before reaching for JavaScript.
- A JS motion library is permitted only for layout/shared-element animation,
  gesture-driven interaction, velocity-aware springs, or interruptible
  sequences — and then only as an **optional peer dependency** of the components
  that need it.
- No motion-library type may appear in a public prop signature.
- `prefers-reduced-motion` is handled at the token layer; JS animations must
  check it explicitly.

## 9. Boundaries

- **No framework imports.** Nothing from `next/*` in a registry item. Components
  that render links accept a `render` slot so the app supplies its own `Link`.
- **No i18n runtime.** Every user-visible string is a prop. Components never
  import a translation runtime.
- **No data layer.** No Supabase, no fetching, no stores. A component that needs
  data takes it as props.
- **No licensed assets.** Aspekta (OFL) is the single typeface
  (`ledger/decisions/0007`) — enforced by `pnpm check:licensing`.
- **The behaviour layer is Base UI, and it stays invisible**
  (`ledger/decisions/0012`). Only a component's own implementation file
  (`registry/ui/<name>/<name>.tsx`) may import it, and **no behaviour-layer
  type may appear in an exported signature** — restate the props you accept.
  Both are enforced by `pnpm check:boundaries`, not by review.
- Reach for it only when the platform does not already do the job. A native
  `<input type="checkbox">` gives Space activation, form participation and the
  `indeterminate` → `aria-checked="mixed"` mapping for free; a library can only
  re-implement those. Drag-and-drop and Calendar are **ours** — Base UI covers
  neither, and an accessible reorder needs a keyboard path (SC 2.1.1), not just
  a pointer one.

## 10. Accessibility

- WCAG 2.2 AA is the floor, verified in CI, not asserted in review.
- Inputs require a `label`; `isLabelHidden` renders it visually hidden rather
  than omitting it.
- Focus is never lost: no conditional rendering that removes the focused
  element without moving focus deliberately.
- `start` / `end` naming for directional props, never `left` / `right`.
- Every component ships an interaction test covering its keyboard contract.
- **Hit areas:** interactive targets are at least `--ui-hit-area-min` (24px,
  the WCAG 2.5.8 floor); primary controls aim for `--ui-hit-area-touch` (44px).
  The visible element may be smaller — extend the target with a pseudo-element
  on the wrapping label or button. No dead zones: a control and its label are
  one target.
- **Pointer affordance:** anything clickable sets `cursor: pointer` explicitly,
  and anything disabled sets `cursor: not-allowed`. No browser gives `<button>`
  a pointer cursor by default and no reset in our stack adds one, so this is
  opt-in every time. It is the only signal a control is clickable *before* the
  click, which makes it contract, not decoration.
- **Disabled is the attribute, not `pointer-events: none`.** The native
  `disabled` attribute already blocks activation and removes the control from
  the tab order. Suppressing pointer events on top of it adds nothing and takes
  something away: the element stops being hoverable, so the tooltip explaining
  *why* it is disabled can never appear. Gate hover and press states behind
  `enabled:` instead.
- **Verify interaction in a real browser.** Implicit activation (Enter/Space on
  a button), computed cursor, and focus behaviour are user-agent behaviours
  jsdom does not implement — it will answer confidently and wrongly about
  exactly the things worth asserting. Interaction tests run in Playwright.

## 11. Documentation

Each component ships a typed doc file (`*.doc.ts`) next to its source
containing anatomy, prop notes, a **composition tree**, do/don'ts and a11y
notes. That file feeds the docs site, Storybook and the MCP server from one
source. Prose that is not in a typed doc file does not exist as far as tooling
is concerned.

---

## Credit

Several craft rules above (concentric radii, shadows-for-elevation,
press-scale, stagger restraint, hit-area patterns) are adapted from
[jakubkrehel/skills](https://github.com/jakubkrehel/skills) (MIT) — see
`CREDITS.md`. The distributable version of these rules is the `ui-craft`
registry item.

## Changing these rules

Amendments go through an ADR in `ledger/decisions/`. A rule that is changed
without a recorded decision will be re-litigated by the next agent that reads
the code, which is exactly what this file exists to prevent.
