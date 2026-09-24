# 0020 — Non-colour theming: strokes and type are brand knobs, density is a mode

**Status:** accepted · 2026-09-24 · amends 0006, 0009, 0010

## The finding

The seed could re-skin every colour and every radius, but not the geometry
underneath them. Measured on `2c6a5ed`:

- `shape.borderWidthPx` resolved to `--ui-border-width`, and **nothing read
  it**. Strokes were literals: `border`, `border-[1.5px]` ×17,
  `ring-[1.5px]` ×7, `outline-[1.5px]` ×3, `border-2` ×4, `outline-2` ×43. A
  brand that set the knob changed nothing and was told nothing.
- `TYPE_ROLES` carries a weight, leading and tracking for every role, and
  ADR 0009 called them "data for the component layer". Only `px` reached an
  emitter. Components chose the rest by hand at each call site, and of the
  137 class strings that name a role, about 49 chose a different weight than
  the table, 28 a different leading, and about 60 chose nothing and
  inherited.
- Control heights were Tailwind numeric steps inside size maps, in **two
  ladders under one set of names**: fields `h-12/h-10/h-8` (48/40/32) and
  Button `h-11/h-8/h-6` (44/32/24).
- The spacing intents (`--ui-space-inset-*` …) had 0–2 consumers.

The comparison with other systems (Material 3, Carbon, Spectrum, Primer,
Fluent, Polaris, Ant, Radix, Mantine, Chakra, Tailwind/shadcn, DTCG 2025.10)
converges on three shapes. This ADR adopts each one where it fits ADR 0006:

1. **Type roles are composites emitted as one variable per property**, not
   as a `font:` shorthand, which cannot carry letter-spacing.
2. **Strokes are a small scale named by job, with a separate focus pair.**
3. **Density is a mode layered over the theme**, stepping control heights
   by a fixed 4px with a hard floor, rather than a global multiplier.
   Radix and Mantine use multipliers; Mantine's scales 1px hairlines into
   sub-pixels, and Radix exempts borders to avoid exactly that.

## Decision

### 1. Brand vs context

Stroke weight and type attributes are **brand** decisions: a client's face
has its own weights and spacing, and a client's style can be heavier. They
become seed knobs under ADR 0006(d).

Control height and density are **context** decisions: an inspector is dense
for every client. `base.ts` already says it: "Structural rhythm … are system
decisions, not brand decisions." Density is therefore **not a `ThemeSeed`
field**. It is a mode axis, scoped like colour scheme.

### 2. Strokes (amends 0010)

A width scale beside ADR 0010's colour stack. The names follow the repo's
own vocabulary: the 1.5px control edge has always been called the hairline.

| Token | Theme zero | Job | Utilities |
|---|---|---|---|
| `--ui-stroke-default` | 1px | card and panel edges, rules, dividers | bare `border`, `ring`, `outline`, `divide-*` |
| `--ui-stroke-hairline` | 1.5px | the drawn boundary of a control or field | `border-hairline`, `ring-hairline`, `outline-hairline` |
| `--ui-stroke-thick` | 2px | selection, emphasis, spinners | `border-thick`, `ring-thick`, `outline-thick` |
| `--ui-focus-ring-width` | 2px | focus indicator, including the forced-colours outline | `outline-focus` |
| `--ui-focus-ring-offset` | 2px | gap between a control and its focus indicator | `outline-offset-focus` |

- **Knobs.** `shape.borderWidthPx` becomes the base (bounds **1–2**, was 0–4):
  `default = base`, `hairline = base × 1.5`, `thick = base × 2`. A base of 0
  would erase every control boundary, so the floor is now 1. The focus width
  is independent of the base, because the focus ring must not thin out when
  a brand chooses delicate edges: `shape.focusRingWidthPx`, bounds 2–4.
  The 2px floor adopts SC 2.4.13 Focus Appearance, which is **AAA**, one
  step above the library's AA baseline, on purpose.
- `--ui-focus-ring` (the box-shadow) is composed from the offset and the
  width. It is no longer a colour token that secretly carries geometry.
- `--ui-border-width` is **removed**. It had no consumer; `--ui-stroke-default`
  replaces it.
- **Hairlines stay rings.** Chromium floors a `border` to whole device
  pixels, so 1.5px renders as 1px at DPR 1, while a box-shadow ring keeps the
  half pixel (`registry/ui/border-hairline.browser.test.tsx`). The utilities
  above make the mechanism a free choice at the call site; the token does
  not choose it.
- **Enforced by `check:strokes`**: no numeric or arbitrary stroke width in
  `registry/`. Zero is allowed, because "no stroke" is not a weight.

### 3. Type roles (amends 0009 §3)

**The table is the source of truth.** Decided by the maintainer on
2026-09-24, over the alternative of treating what components render as
truth. Components that disagreed are restyled to the table (242 classes
removed across 47 files). That is a deliberate visual change, and the
baselines move with it. The exceptions below were decided the same day.

- Every role gains three brandable tokens: `--ui-text-<role>-weight`,
  `-leading` and `-tracking`. The Tailwind emitter maps them to v4's
  companions (`--text-<role>--font-weight`, `--line-height`,
  `--letter-spacing`), so **`text-body-md` sets size, weight, leading and
  tracking in one class**. An explicit `font-*`, `leading-*` or
  `tracking-*` still wins, because Tailwind reads each companion through
  `var(--tw-font-weight, …)` and its siblings.
- The weight ladder (`--ui-weight-*`) and trackings (`--ui-tracking-*`)
  move from fixed to brandable, so an explicit `font-medium` follows the
  brand's face as well.
- **Knobs:**
  - `typography.weights?: { regular, book, medium, semibold, bold }` maps
    the ladder onto the cuts a brand face really has (bounds 100–900).
    Aspekta's 450/550 exist only because it is variable; a static face would
    synthesise or round them.
  - `typography.tracking?: "tight" | "font"`, default `tight` (today's
    −0.02em). `font` sets every tracking to 0 for faces that ship with
    their own spacing.
- **No leading knob.** Line-height moves every geometry spec, and nothing
  asks for it.
- **Enforced at runtime, in every story.** A Storybook `afterEach` fails
  any story in which an element naming `text-<role>` renders a weight,
  leading or tracking other than its role's. It reads the role's own tokens
  off the element, so it holds inside brand scopes too. It has to run at
  runtime: a component's size map and its base classes are separate strings
  that `cn()` joins only in the browser, so a source scan cannot see which
  element ends up with which. `check:type-roles` keeps the exception list
  honest (an entry naming a part that no longer exists fails).
- **Declared exceptions** (decided 2026-09-24, with the reason in
  `.storybook/type-roles.ts`). Each one is either a designed *difference*
  between parts that share a role, or a box height the sheet pins, which
  following the table would erase:

  | Part | Attribute | Why |
  |---|---|---|
  | `calendar-day`, `calendar-{month,year}-option` | weight | Resting one step under `button-sm`, so the selected one reads heavier |
  | `sidebar-section-label` | weight, leading | The two nav levels share a size and an inset; the heading is told apart by weight. The 46px row is drawn at `leading-normal` |
  | `sidebar-item`, `sidebar-layer-title` | leading | The sheet's 46px row |
  | `sidebar-profile-name` | weight, leading | At `body-lg`'s 500 it would read lighter than the 600 email beneath it; a rail row at the rows' leading |
  | `chat-message-bubble` | leading | The sender's voice is tighter (1.35) than the receiver's 1.55, the pair's signature |
  | `textarea` | leading | The box is rows × leading; the sheet's 128px is drawn at `leading-snug` |

### 4. Control sizing and density

**Two families, kept apart.** Decided by the maintainer on 2026-09-24.
Fields and actions are different objects with different heights, and one
ladder would move one of them:

| | sm | md | lg |
|---|---:|---:|---:|
| `--ui-control-*-height` (Button, chrome control) | 24 | 32 | 44 |
| `--ui-field-*-height` (Input, Select, Multiselect) | 32 | 40 | 48 |

plus `--ui-control-*-inset` and `--ui-field-*-inset` for inline padding.
Utilities come from the spacing namespace: `h-control-md`, `px-field-inset-lg`.

**Three modes:** `compact | default | comfortable`, emitted as
`[data-ui-density="…"]` blocks by `toCss()` beside the base tokens.

- Each step moves every height by **4px** and every inset by one spacing
  step. That keeps the 4px grid, which a percentage cannot.
- **Floor: 24px** (SC 2.5.8, AA), enforced in the derivation and asserted
  in a test. Compact Button `sm` therefore stays at 24.
- Compact gives up the 44px touch target on Button `lg` (40px). The Button
  doc says so.
- Type size, icon size, radius and layout spacing **do not** change with
  density. Avatars and badges are content rather than controls, so they
  stay out of it too.
- **Scoping and portals.** The attribute re-binds its subtree, so a dense
  inspector can sit inside a default page. A portalled surface leaves that
  subtree (the same limit ADR 0017 §4 met), so the attribute has to be passed
  to the popup part too. Every popup part forwards unknown props, so
  `data-ui-density` needs no new API. An app that is dense everywhere sets it
  on `<body>`, where portals inherit it.

### 5. What stays out

- **Spacing is not a brand knob.** Components use the base steps directly
  (363 named uses), the intents have almost no consumers, and no surveyed
  system lets a brand retune layout rhythm. Control-internal spacing moves
  with density (§4). A brand that needs a looser rhythm would need a
  `rhythm` knob on the inset and stack intents. That waits for a brand that
  asks.
- **No per-component token overrides** (Ant component tokens, M3
  `md.comp.*`). ADR 0006(d) stands.
- **`ratio` stays reserved** (ADR 0009 §4).

### 6. Tokens nothing consumes

`check:token-consumers` fails on a contract token that no file in
`registry/` reads, unless an allow-list entry gives the reason (for example
"consumer-side chrome"). `--ui-border-width` sat dead for the whole life of
the knob, and so did `--ui-hit-area-*`. A token nothing consumes is a
guess, and now it is a failing one.

## Consequences

- A brand can now change stroke weight, the face's weight ladder and
  tracking. A screen can now be compact. All of it is bounded, and all of it
  is derived.
- **Visual change, deliberately:** roles that disagreed with the table now
  render at the table's values. The baselines are regenerated in both
  schemes.
- Consumers must pick up the regenerated token CSS **before** syncing
  components that read the new tokens. An undefined `--ui-stroke-*` makes a
  ring width invalid, and the edge disappears. Each ledger entry says so.
