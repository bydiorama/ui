# 0028 — Motion has three levels, and the library owns its patterns

**Status:** accepted · 2026-11-26 · amends ADR 0005 (clause 5) and ADR 0018
(clause 5). Accepted by the maintainer on 2026-11-26, as were the decisions
marked **agreed** and clause 7's two choices. Clauses 1–5 and 7 are
**implemented and measured** (see § Measured); 6 waits on Paper sheets for
its components; 8 is unchanged.

## Context

Motion's foundation is done: tokens, CSS first, `check:motion`, and a browser
test that reads `getAnimations()` (ADRs 0005 and 0018). Three things are still
missing, and each was found by reading the repository, not by taste.

**1. Reduced motion is one switch, and it is not the user's.** The only input
is the OS preference, and the only response is `REDUCED_MOTION_OVERRIDES`,
which sets four duration tokens to `1ms`. That is "off", not "reduced": a
fade is removed together with a slide, although a fade is not what makes
anyone unwell. An app cannot offer a setting of its own, because there is no
scope attribute for motion as there is for theme (`data-ui-theme`) and density
(`data-ui-density`). The JavaScript side has no single answer either: eight
files in `registry/` each call `matchMedia("(prefers-reduced-motion: reduce)")`
themselves.

**2. Travel is written as literals.** A level between "full" and "off" needs
to remove movement while keeping time. Today it cannot: entry offsets are
utilities in the class list — `scale-98` fourteen times under
`data-[starting-style]`/`data-[ending-style]`, and `translate-*-full` for
Sheet, Drawer and Toast. Nothing at the token layer can reach them.

**3. Product interactions have no owner here.** A count changing, a label
swapping, an icon toggling, a row entering or leaving, an error shake: the
`app-motion` skill sends all of these to transitions.dev snippets copied into
each app, because that collection's licence forbids redistributing it. So the
motion a user sees most often is a per-app copy that this system does not
design, cannot theme and does not test.

A fourth, smaller finding: the vocabulary disagrees with itself.
`--ui-motion-standard` is `base` + `--ui-ease-default`; the recipe
`motionStandard` in `lib/motion`, which is what components actually use, is
`base` + `--ui-ease-out`. `PLAN.md` already lists the under-used curves as an
open question. And `--ui-ease-spring` is a `cubic-bezier`, which cannot
overshoot the way its name promises.

## Decision

### 1. Three levels: `full`, `reduced`, `off` — **agreed**

| | `full` | `reduced` | `off` |
|---|---|---|---|
| Opacity and colour transitions | tokens | kept, never longer than `--ui-duration-base` | 1ms |
| Travel — a surface entering or leaving: slide, scale-in | tokens | none; the surface fades in place | none |
| Change in place — a height opening, a thumb crossing its track, a chevron turning | tokens | kept, never longer than `--ui-duration-base` | 1ms |
| Stagger | `--ui-stagger-step` | 0 | 0 |
| Keyframes and loops — pulse, spinner, shimmer, sheen, shader, a ticking matrix | run | stopped on a static frame | stopped |
| Smooth scrolling, autoplaying video | yes | no | no |
| Following a gesture (Drawer drag) | yes | yes — the user is moving it | yes |
| Settle after a gesture | tokens | fade | 1ms |
| Press feedback (`--ui-press-scale`) | yes | yes — tied to the user's own press | yes, instant |

**Changed while implementing: change in place keeps its easing at `reduced`.**
The first draft removed size changes too. That needs per-property durations
on every transition list, and the result is worse for the people it is
for: an accordion that snaps open makes the rows below it jump, which is
harder to follow than a 200ms height change. What triggers vestibular
discomfort is large-area travel — surfaces sliding across the screen,
zooming, parallax, a scrolled page gliding — and that is what `reduced`
removes. This is the same line operating systems draw for their own
"reduce motion" settings.

`off` is exactly the behaviour the OS preference used to get, so nothing that
already complies changes. `reduced` is new. `1ms` stays `1ms` and not `0`: Base UI awaits
`getAnimations()` before unmounting, and a zero-length transition registers
nothing (ADR 0018, finding 2).

Delays are not motion. `HOVER_INTENT_DELAY_MS` and its siblings are the same
at every level, as `lib/motion` already says.

### 2. A scope attribute, with one precedence rule — **agreed**

`data-ui-motion="full | reduced | off"` on any element, emitted by the token
package the way `data-ui-density` is.

- **No attribute:** the OS decides. `prefers-reduced-motion: reduce` gives
  `reduced`; otherwise `full`. This is a behaviour change for OS-reduce users:
  they get short fades where they had none. It needs its own ledger entry.
- **`reduced` or `off`:** always honoured. An app, a brand scope or a single
  region may go down freely.
- **`full`:** overrides the OS preference, and is therefore only ever set from
  an explicit choice the user made in the app. The library cannot verify
  that, so it is a documented contract: no theme, default or story sets it.

### 3. Travel becomes a token

New contract tokens, non-brandable, collapsing at the token layer:

- `--ui-motion-travel` — `1` at `full`, `0` at `reduced` and `off`. Slides are
  written against it: a Sheet starts at `translate: calc(100% * travel)`, so
  one declaration is a slide at `full` and no movement at `reduced`. A
  surface that already fades as it slides (Sheet) then simply fades; one that
  slides opaque (Drawer, Toast) also starts at `opacity: travel` — 1 at
  `full`, so it looks exactly as before, and 0 at `reduced`, a fade.
- `--ui-enter-scale` — `0.98` at `full`, `1` otherwise. Replaces the fourteen
  `scale-98` literals.

`check:motion` then refuses a literal scale or translate inside a starting or
ending style, the same ratchet it applies to a literal duration.

### 4. Keyframes and JavaScript read the level, not the media query

This replaces ADR 0018 clause 5. `motion-safe:` and `motion-reduce:` read the
OS only, so an app that sets `data-ui-motion="off"` would still see every
spinner turn.

- **Keyframes** are guarded by `motion-safe:` and `motion-reduce:`, which the
  Tailwind emitter **redefines** under their built-in names to match the
  attribute and the media query together. Redefining rather than adding a
  new name keeps every existing guard correct with no change at the call
  site — and Tailwind 4.3 allows it, measured. In plain CSS the effects layer
  writes `@variant motion-safe { … }`, and `check:fx` accepts only that.
- **JavaScript** asks `motionLevel(element)` in `lib/motion`, and
  `subscribeMotionLevel` for long-lived consumers such as the shader. It does
  not re-implement the precedence: it reads `--ui-motion-level`, a token each
  level block sets, so CSS decides and JavaScript reads the answer. The
  eight direct `matchMedia` calls are replaced (one in `fx.ts` reads the token
  directly, because `check:fx` loads that file in plain Node), and
  `check:motion` refuses a new one in `registry/`.

Both mechanisms are to be **measured before this is accepted**, in
`motion.browser.test.tsx`, at all three levels and with the attribute set
against the OS preference in both directions. ADR 0018 was corrected once by
a probe; this clause should be proven by one first.

### 5. Loops can be paused

WCAG 2.2.2 (Pause, Stop, Hide — level A) applies to anything that moves for
more than five seconds beside other content: Skeleton's pulse, `shimmer`, the
shader ground. `data-ui-motion="reduced"` on the region is the mechanism; the
documentation says so, and the shader exposes the same control it already has
internally.

### 6. The library owns its motion patterns — **agreed**

Six registry items, designed in Paper and written from scratch. Names are
working names.

| Item | Does |
|---|---|
| Presence | an element entering and leaving, including a row folding away; holds the leaving node, marks it `inert` |
| Count | a number changing; the DOM text is always the plain value |
| TextSwap | a label replaced in place without a width jump |
| IconSwap | two glyphs cross-faded; the label carries the state |
| Stagger | a group arriving in order, for the infrequent moments CONVENTIONS §8 reserves it for |
| Feedback | the one-shots: error shake, success check |

Rules for all six:

- CSS first; a runtime only under ADR 0018's rule, and none is expected.
- Each goes through `design-component` and `add-component`: a Paper spec, a
  top-level `motion:` note, a `getAnimations()` assertion at each level, and
  the brand-theme story.
- Where a component already does the job by hand, the item is extracted from
  it and the component consumes it, so there is one implementation.
- **No code from the references.** transitions.dev forbids redistribution and
  Animate UI carries the Commons Clause; both are read for what a catalogue
  contains, never for source (ADR 0002). `check:licensing` gains their
  specifiers.

When they ship, `app-motion`'s third row shrinks to "what the library still
does not cover", and the skill stops being the main route.

### 7. One vocabulary

- A recipe in `lib/motion` and its `--ui-motion-*` intent are the same pair,
  and `check:motion` fails if they differ. (The recipe cannot literally read
  the token: Tailwind has no utility for a duration-and-easing pair, so the
  check compares the two spellings instead.)
- **Decided 2026-11-26: the tokens follow the components.** Micro, standard
  and deliberate all ease out, as every component already did. No component
  changes. `--ui-ease-default` stays: Skeleton's pulse and the public site
  read it, so removing it was never the cheap cleanup it looked like.
- **Decided 2026-11-26: `--ui-ease-spring` is a real spring.** Same name, now
  a `linear()` sampling of a damped spring (damping ratio 0.75): 2.8% past
  its target just after halfway, settled within 0.1% by the end, 90% of the
  way at a third of the duration, as fast as the curve it replaces. Visible
  where it runs: Toast's slide, the sheen sweep, the shader fades, and the
  site's links and layer stack.
- `--ui-ease-in` still has no consumer. It is left in place rather than
  removed in this pass: a removed contract token is a breaking change for
  every app, and nothing is gained until something needs the room.

### 8. Layout and shared-element motion stays unadopted

Unchanged from ADR 0018: nothing needs it. The first candidate is the open
TODO "Replace skeleton/Default UI animation pattern"; view transitions are
tried before any runtime.

## Measured

`registry/ui/motion.browser.test.tsx`, Chromium, every case through the
browser's own resolution — `getComputedStyle`, `getAnimations()` and the
transitions' keyframes — with the OS preference emulated through CDP rather
than stubbed.

- The level resolves the same in CSS and in `motionLevel()` for: no attribute
  with and without the OS preference, `full` over the OS, `reduced`, `off`,
  `full` nested in `reduced`, `full` nested in `off`, and a `reduced` region
  under a `full` page.
- `subscribeMotionLevel` fires on an attribute change and on the OS changing.
- At `reduced` a Switch's thumb still eases at `--ui-duration-fast`; at `off`
  it runs at 1ms, so Base UI still has an animation to await.
- A Sheet slides from `-100%` at `full`; at `reduced` it fades from opacity 0
  and its translate starts at `0%`. A Popover grows from `0.98` at `full` and
  starts at `1` at `reduced`. A Drawer slides up opaque at `full`, exactly as
  before the levels, and fades in place at `reduced`.
- Skeleton's pulse and Button's spinner stop in a `reduced` region with no OS
  preference, stop with the OS preference alone, and run again when the user
  chose `full` over the OS.
- StatusMatrix holds its key frame under the OS preference and in a `reduced`
  region.

**Found by the first run:** at `reduced` the Sheet still creates a
`translate` transition — its starting offset computes to `0%` and the resting
panel to `none`, which Chromium treats as different values. Nothing moves;
both are the identity. The tests therefore assert where a transition starts,
which is what a user sees, not whether one exists.

**Found by review, then tested:** the first version gave Drawer and Toast an
entry opacity of `1 − travel`, which is 0 at `full` — it would have made
both fade in at the default level, a visible change the record says must not
happen. Nothing covered Drawer; the two Drawer cases above now do, and both
fail on that version.

The gates were broken on purpose to prove they fire: `check:motion` on a
`scale-98`, a `translate-y-[150%]` and a direct `matchMedia`; `check:fx` on a
keyframe behind the old OS-only media query; and the Sheet test on the old
`-translate-x-full`.

## Order of work

1. **Done.** Levels: tokens, attribute, variants, `lib/motion` functions, the
   probe, a Storybook toolbar switch. Nothing visual changes at `full`.
2. **Done.** Travel tokens through the existing components; `reduced` becomes
   real. Done together with step 1: step 1 alone would have given OS-reduce
   users full-length slides where they had none.
3. **Done.** Vocabulary pass and the spring.
4. The six items, one at a time, Presence first because three of the others
   sit inside it. **Presence built 2026-11-26**; rise reuses `--ui-space-xs`
   (decided), so the items needed no new token.
5. **Done.** A motion page on the public site, `/docs/motion/`: the site's own
   motion setting live (stored with its other appearance choices), slow
   playback, and every intent side by side. The items join it as they ship.

## Consequences

- Users with the OS preference set see short fades instead of none. That is
  the intended improvement and also the one change someone may report.
- Every component with an entry offset is touched once in step 2.
- Six more items to design and maintain, in exchange for motion that is
  themed, tested and identical across products.
- An app setting for motion becomes a one-attribute feature.
