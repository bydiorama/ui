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

- Every component forwards `ref` to its outermost DOM node.
- Every component accepts `className` and spreads the remaining native props.
- Merge precedence is fixed: **contract props win**, event handlers are
  composed (ours runs, then the consumer's, unless the consumer calls
  `preventDefault`), `className` is merged, `style` is shallow-merged.

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
- **Shadows for elevation, borders for structure.** A border whose only job is
  depth becomes a layered translucent `--ui-shadow-*`; borders that communicate
  structure or state stay.

## 7. Iconography

- **`griddy-icons` only.** Never lucide, heroicons, radix-icons or raw inline
  SVG. Enforced by an ESLint `no-restricted-imports` rule.
- Icons are passed in as slots wherever feasible, so usage is visible at the
  call site rather than buried in the component.
- A missing glyph is a gap filed against the icon set — not a reason to import a
  foreign icon.

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
- **No licensed assets.** See `docs/licensing.md` — enforced by
  `pnpm check:licensing`.

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
