# 0028 — Motion has three levels, and the library owns its patterns

**Status:** proposed · 2026-11-26 · amends ADR 0005 (clause 5) and ADR 0018
(clause 5); the three decisions marked **agreed** were settled with the
maintainer on the same date, the rest is for review

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
| Travel — translate, scale, size | tokens | none; the surface cross-fades in place | none |
| Stagger | `--ui-stagger-step` | 0 | 0 |
| Loops — pulse, shimmer, sheen, shader | run | stopped on a static frame | stopped |
| Following a gesture (Drawer drag) | yes | yes — the user is moving it | yes |
| Settle after a gesture | tokens | fade | 1ms |

`off` is exactly today's behaviour, so nothing that already complies changes.
`reduced` is new. `1ms` stays `1ms` and not `0`: Base UI awaits
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
  written against it: a Sheet starts at `translate: calc(100% * travel)` and
  `opacity: travel`, so one declaration is a slide at `full` and a fade at
  `reduced`.
- `--ui-enter-scale` — `0.98` at `full`, `1` otherwise. Replaces the fourteen
  `scale-98` literals.

`check:motion` then refuses a literal scale or translate inside a starting or
ending style, the same ratchet it applies to a literal duration.

### 4. Keyframes and JavaScript read the level, not the media query

This replaces ADR 0018 clause 5. `motion-safe:` and `motion-reduce:` read the
OS only, so an app that sets `data-ui-motion="off"` would still see every
spinner turn.

- **Keyframes** are guarded by a variant the theme emitter defines, which
  matches the attribute and the media query together. `check:motion` accepts
  only that spelling.
- **JavaScript** asks one function in `lib/motion` — the resolved level for an
  element, and a subscription for long-lived consumers such as the shader.
  The eight direct `matchMedia` calls are replaced, and `check:motion` refuses
  a new one in `registry/`.

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

- A recipe in `lib/motion` and its `--ui-motion-*` intent are the same thing:
  the recipe reads the token, and `check:motion` fails if they differ.
- Which curve each intent uses is a design decision, made on the motion page
  (below) with both candidates side by side, not in this record.
- `--ui-ease-spring` keeps its name and becomes a `linear()` spring. It has
  consumers, so that is a visible change with a ledger entry and a visual
  review.
- A curve with no consumer after that pass is removed
  (`check:token-consumers` already says which).

### 8. Layout and shared-element motion stays unadopted

Unchanged from ADR 0018: nothing needs it. The first candidate is the open
TODO "Replace skeleton/Default UI animation pattern"; view transitions are
tried before any runtime.

## Order of work

1. Levels: tokens, attribute, variant, `lib/motion` function, the probe, a
   Storybook toolbar switch. Nothing visual changes at `full`.
2. Travel tokens through the existing components; `reduced` becomes real.
3. Vocabulary pass and the spring.
4. The six items, one at a time, Presence first because three of the others
   sit inside it.
5. A motion page on the public site: the level switch live, slow playback,
   every intent and item.

## Consequences

- Users with the OS preference set see short fades instead of none. That is
  the intended improvement and also the one change someone may report.
- Every component with an entry offset is touched once in step 2.
- Six more items to design and maintain, in exchange for motion that is
  themed, tested and identical across products.
- An app setting for motion becomes a one-attribute feature.
