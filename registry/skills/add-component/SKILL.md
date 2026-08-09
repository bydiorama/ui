---
name: add-component
description: The pipeline for implementing, validating and shipping a component or pattern in bydiorama/ui. Use whenever adding a component, extending one, porting a design from Paper, or reviewing a component PR. Encodes the workflow, the definition of done, and the traps already paid for once — so quality ratchets up instead of resetting per component.
---

# Add a component

The pipeline distilled from Button and Input, the first two components through
the system. `CONVENTIONS.md` is the binding rulebook and `AGENTS.md` the
constitution — this skill is the *order of operations* and the traps. When
they conflict, they win.

Two rules govern everything below.

**The ratchet rule.** Every defect found must graduate into the strongest
enforcement that can hold it: **1) a type · 2) a CI gate · 3) a lint rule ·
4) a line here.** Prose is the floor, not the goal. Precedents:
icon-only-requires-aria-label became a type; unresolvable utilities became
`check:utilities`; duplicate theme keys became a token test; mono fonts became
a licensing gate. If a finding ends as a comment, ask why it couldn't be one
of the first three.

**The first-of-its-kind rule.** *The first component to do something new
breaks the tooling for it.* Button was a single element with a ring, so Input —
the first compound component, and the first to use `border-*` colours —
exposed an unwritten forwarding contract and three blind spots in
`check:utilities`. This is not bad luck; it is the shape of the work. When
your component is the first to use a new utility family, a new element
structure, or a new state, **budget time to fix the tooling, and expect the
gates to be wrong before the code is.**

## Order of operations

### 1 · Spec from Paper — values, never pixels

- `get_computed_styles` / `get_jsx` for every value. Screenshots are for
  *reviewing* results only; a value read off a screenshot is a guess.
- The sheet should already be token-bound (`var(--ui-*)`). Raw hex, palette
  steps and off-scale values are **design bugs — fix them in Paper and tell
  the user**, never transcribe them. Input alone had six.
- **Interrogate the focus and error states specifically.** Both of Input's
  serious design defects were there: focus used a near-invisible grey border
  (WCAG 2.4.7), and the error state's field border was identical to default,
  leaving the error carried by message colour alone (1.4.1). A resting state
  that looks right tells you nothing about them.
- **An icon's LAYER NAME is its import name.** A sheet drawn with the
  `griddy-icons-in-paper` skill names every glyph layer after its export, so
  `Search` in `get_tree_summary` is `import { Search } from "griddy-icons"` and
  there is nothing to decide. A layer still called `SVG` means the icon was
  never identified — ask rather than guessing from the path data, and get the
  sheet fixed, because the next reader will guess differently.
- Token flow is repo → Paper. If the design invents a value the contract
  lacks, the contract grows (step 2); Paper never becomes the source of truth.

### 2 · Tokens and tooling before component

- **Semantic roles only in components.** About to type a palette step
  (`bg-blue-70`)? Stop — the design is telling you a role is missing.
- **A role from the WRONG CATEGORY is the same signal.** A text role as a
  background (`bg-(--ui-text-placeholder)` on a switch track), a border role as
  a fill, an ink role on a surface — each means the role you need does not
  exist yet. Three roles were added this way: `--ui-bg-field`,
  `--ui-bg-accent-legible`, `--ui-gradient-brand`. Reaching sideways is cheaper
  in the moment and becomes the drift the whole token layer exists to prevent.
- **The surface scale INVERTS between schemes.** In light `bg-base` is the
  lightest value; in dark it is the lightest *surface*, with `surface` and
  `sunken` below it. So a role meaning "recessed from its container" cannot be
  one existing role — it is lighter in light and darker in dark. Form fields
  looked transparent in dark for exactly this reason. Whenever a role's meaning
  is RELATIVE ("recessed", "raised", "quieter"), check both schemes before
  assuming an existing one fits.
- **An authored value is not exempt from the audit.** Pinning
  `--ui-bg-accent-legible` to `blue-60` in `ZERO_AUTHORED` failed the resolver
  test because it measured under 3:1. Authored means "the approved value",
  not "skip the check" — if a pin cannot clear the floor, the pin is wrong.
- New role = contract + resolver derivation + `ZERO_AUTHORED` pin (**light and
  dark**) + a `CONTRAST_PAIRS` / `NONTEXT_CONTRAST_PAIRS` entry whenever it
  carries ink or a control boundary. **An unlisted pair is an unchecked pair**:
  the audit only inspects pairs it is told about, which is how a dark-scheme
  placeholder sat at 3.2:1 while every gate stayed green.
- A role pinned in `ZERO_AUTHORED.light` but not `.dark` **falls back to
  derivation in dark**. Measure both schemes before you trust either.
- **A new utility *family* must be registered in two places**, or it is
  silently unenforced: `cn.ts`'s merge config (or tailwind-merge deletes
  classes at runtime) and `check-utilities.mjs`'s namespaces (or the gate never
  checks it). Input's `border-*` colours were the first of their kind and were
  missing from both.
- Run `pnpm test` and `pnpm check:utilities` before touching the component.

### 3 · Component

Work through `CONVENTIONS.md` §1–§10 with the file open. The ones that bit:

- Native element first; `type="button"` default; `forwardRef`;
  `data-slot`/`data-variant`/`data-size` on every part.
- **Forwarding, once the component has more than one DOM node** (§5):
  `className` → the **outermost** node so sizing behaves predictably; `ref` →
  the outermost node **except a form control, whose ref goes to the
  interactive element**; native props → the element that owns them. Getting
  this inconsistent is invisible to every gate — assert it in the browser test.
- **Conditionally-required a11y props are discriminated unions**, not docs:
  `isIconOnly: true` requires `aria-label`; `label` is simply required.
- `cursor-pointer` + `disabled:cursor-not-allowed` — no browser or reset
  provides them. Disabled = the `disabled` attribute; **never**
  `pointer-events-none` (it kills the explaining tooltip). Gate hover/press
  behind `enabled:`.
- Focus: an interactive element owns its indicator. Resting outlines are
  **inset rings**, keeping `outline` free for `focus-visible`. A wrapper that
  draws the ring uses `focus-within` and the inner control may then carry
  `outline-none` — that is the *only* safe place for it.
- Custom properties in utilities use the **parens** form —
  `duration-(--ui-duration-fast)`, not `duration-[--x]`, which compiles to
  invalid CSS and silently zeroes the transition.
- Slots take elements and are never wrapped. Strings are props. No `next/*`,
  no i18n, no data layer (lint enforces).
- Don't document an API that doesn't exist — the doc file describes the
  component as shipped, gaps and all.

### 4 · Typed doc (`*.doc.ts`)

Anatomy, composition tree (agents compose from trees, not prose), props with
*why* notes, do/don't, an a11y block with an explicit keyboard table and
**measured** contrast numbers, a `forwarding` block once the component is
compound, and an honest `knownGaps` list. This file feeds docs/Storybook/MCP —
prose elsewhere doesn't exist.

### 5 · Stories (`*.stories.tsx`)

Minimum set: `Playground`, a `Matrix` mirroring the Paper sheet's own layout
(so visual diffing is like-for-like), `States`, and **`BrandThemed` — theme
zero beside a hostile brand seed (pale-yellow accent) — mandatory** per
AGENTS.md.

**Stories are gates, not demos:** every story runs through axe at error
severity in the `stories` vitest project, so an inaccessible story fails CI.
Give interactive stories a real handler (`onClick: fn()`) — a control with no
observable response *reads as broken* and generates false bug reports. Don't
spread the args bag into components with discriminated-union props
(`exactOptionalPropertyTypes` breaks the union); pass what the story needs.

### 6 · Tests — two files, three layers

- `*.types.test.tsx`: `@ts-expect-error` assertions that misuse fails to
  compile. Runs under `tsc --noEmit`; an expect-error that stops erroring
  fails the build.
- `*.browser.test.tsx`: keyboard contract and computed-style assertions in
  real Chromium (`pnpm test:browser`, project `contract`). **jsdom is banned** —
  it does not implement implicit activation or computed cursor and answers
  confidently and wrongly. Mount with `createRoot` + `act`. Assert
  `getComputedStyle`, never class names.
- **`await` running transitions before reading computed style.** A read taken
  immediately after a state change returns the value the property is
  transitioning *from* — so a working focus ring reads as broken. Use a
  `settled(el)` helper over `el.getAnimations()`. This cost an hour once.
- Cover, at minimum: the keyboard contract, the focus indicator *painted*
  (not declared), per-size typography as computed values, the forwarding
  contract, and every state the design draws.
- **When a component claims to reuse another's surface, assert the
  RELATIONSHIP, not numbers.** Multiselect's trigger is Input's control: the
  test renders both and compares their computed height, radius, border and
  colour. Asserting `48px` on each would pass while the two silently drifted
  apart, which is the only failure that matters.
- **Assert that variants DIFFER, not just that each is internally consistent.**
  Badge's two sizes were pixel-identical while every test passed, because
  nothing ever compared them to each other.
- **Compute target-size arithmetic; do not eyeball it.** `py-xs` around an 8px
  track is 16px, not 24 — the SC 2.5.8 assertion caught it. Write the sum in
  the comment so the next person can check it without re-deriving.

### 7 · Register and record

- Manifest entry: component + doc file only. Stories/tests are co-located but
  **never listed** — `check:manifest` enforces it; the manifest, not the
  folder, is the distribution boundary.
- `pnpm registry:build`, then a ledger entry (`pnpm ledger:new`) with real
  `affects` values and the Paper URL as provenance. Design fixes pushed back
  into Paper get their own entry.

### 8 · Gates — and prove the new ones bite

```
pnpm run type-check && pnpm lint && pnpm test && pnpm test:browser && pnpm verify
```

**Probing is a required step, not a good habit.** Any gate you add or change
is unverified until you have watched it fail:

1. Break it deliberately — a probe file, a one-character typo.
2. Confirm it fails, and that the message teaches the fix.
3. Restore, and confirm green. Never `git checkout` the probe away — it
   destroys uncommitted work alongside it.

This is not paranoia. Three separate gates in this repo have reported success
while measuring nothing: `check:utilities` skipped every `hover:` utility, the
same gate had no `border-` namespace at all, and the story-a11y project ran
zero tests because of an absolute glob. Each was green. Each was found only by
probing.

## Traps already paid for

| Trap | Rule |
| --- | --- |
| Computed style unchanged after a state change | You are racing the transition — `await el.getAnimations()` before asserting |
| First component to use a new utility family | Register it in `cn.ts` merge config **and** `check-utilities.mjs`, then probe both |
| tailwind-merge deleting a custom utility | Unregistered namespaces get guessed at and dropped at runtime; pin with computed-style tests |
| Missing hover state, no error anywhere | Unknown utility ⇒ Tailwind emits nothing; that is what `check:utilities` is for |
| `duration-[--x]` / `scale-[--x]` | Bracket form emits a bare property name — invalid CSS. Use `duration-(--x)` |
| `outline-none` on an element that owns its focus ring | Poisons `--tw-outline-style`; the ring then draws in style `none` |
| Absolute paths in Storybook config globs | Re-resolved against `configDir` — matches nothing, and the test project reports success on zero tests |
| A11y addon as decoration | `test: "error"` only runs via addon-vitest wired into a vitest project; a Storybook *build* never runs axe |
| Role passes light, fails dark | Pin it in `ZERO_AUTHORED.dark` too, and add the pair to `CONTRAST_PAIRS` |
| Two contract tokens, one utility name | The emitter's last write wins silently; the token test asserts no duplicates |
| `light-dark()` around a shadow list | It takes colours only; the CSS emitter merges per-layer |
| Story/test imports unresolvable | `tsc` resolves from the *importing file*; deps imported by `registry/` live at the workspace root |
| ESLint scanning build output | Ignore globs need `**/` prefixes; bare `dir/**` matches only at repo root |
| Grep says a utility is missing from built CSS | Variant-prefixed classes are escaped (`hover\:`, `\(`) — check before "fixing" |
| "Enter shows no press animation" | UA applies `:active` for one frame on Enter — browser behaviour; never fake it with JS state |
| "The weight looks heavier than the design" | Declared weights were identical — root smoothing + `font-synthesis: none` (§6) before touching values |
| Committing vitest failure screenshots | `__screenshots__/` and `.vitest-attachments/` are gitignored debug artifacts, not baselines |
| New face/library "just for this component" | Licensing gate + independence rules (AGENTS.md); file a gap instead |
| Staging or committing when you finished | **Never** — `git add`/`commit`/`push` need explicit consent for that change (AGENTS.md § Git). Report and leave the tree alone |
| A portalled panel ignores the brand theme | Theme vars are inherited custom properties; a portal to `document.body` leaves the scope. Anchor the portal to the component's own root, or expose a `container` |
| A new registry namespace (`hooks/`, `blocks/`) | The `@/` alias must be added in **four** resolvers — root tsconfig, storybook tsconfig, vitest config, storybook `main.ts` — and must match the manifest's install **target**, not the source folder, or the path you ship is not the path you type-check |
| A gate added to `verify` only | CI enumerates its checks individually; `verify` alone leaves the new gate unrun in the only place it matters |
| A test that clicks a visually-hidden input | Playwright refuses, and it is right — real clicks land on the label or the painted box. Click what a user can |
| Computed size is `13.008px`, not `13px` | The rem emitter's rounding; whole px on a 16px base needs **4** decimal places, not 3 |
| `test:browser` passing against yesterday's CSS | The suite reads a *generated* stylesheet — regenerate tokens in the test script, or it asserts stale output |
| A token named "strong" that measures weaker than "control" | Names are not guarantees. Assert the **ordering** of a stack, in both schemes, and add every step to `NONTEXT_CONTRAST_PAIRS` — an unlisted pair is an unchecked pair |
| A behaviour-layer prop that silently does nothing | JSX drops unknown props without a word. `dismissible` is not a Base UI Dialog prop — read the `.d.ts` for every prop you forward, and assert the BEHAVIOUR, not that you passed it |
| Writing a contrast number into a doc | You cannot — docs declare `a11y.contrastPairs` (fg/bg/floor/why) and `check:contrast` measures them in both schemes. A wrong pair is a wrong TOKEN NAME, which is checkable; a wrong number was not |
| A relative role ("recessed", "raised") assumed to be one existing token | The surface scale inverts between schemes — check both before reusing a role |
| Reaching for the behaviour layer (ADR 0012) | Only when the platform doesn't already do it, only in `registry/ui/<name>/<name>.tsx`, and never in an exported type — `check:boundaries` enforces both |
| A type role picked because its PEAK matches the design | `display-*` and `title-*` are **fluid** (`clamp(…vw…)`); body and below are fixed. A fluid role inside a fixed-width surface — a nav rail, a fixed panel — shrinks with a viewport that surface does not follow: `text-title-sm` peaks at 16 and computed to 12.17px, worst on the phone where the sheet draws it at 16. Assert the design's px in the browser test; that number is the only thing that tells the two apart |
| A panel anchored to a trigger | Three things, each failing differently: `collisionPadding`, `max-h-(--available-height)`, `max-w-(--available-width)` (§7c). Base UI flips and shifts by default, so the edges LOOK handled — it just cannot shrink a panel bigger than its space. `check:overlays` enforces all three |
| Asserting that a surface "stays on screen" | Containment assertions pass on the bug: a fixed 256px cap fits the test viewport. Assert the resolved `max-height` equals the positioner's measurement instead — the number's SOURCE is what differs, not its effect at a comfortable size |
| A new baseline in the visual project | Check its PIXEL DIMENSIONS against the frame you mounted, every time. Both defects this gate has had — a crop and a 0.8 downscale — were invisible in the image and obvious in its size |
| Reading a radius off a sheet you built from once | Artboard values change. Select's panel was built as radius-lg and the file says radius-md; a menu that reads "not concentric" is usually the outer radius, not the inner. Re-read `get_computed_styles` before defending a number, and check §6's arithmetic actually closes |
| A sheet whose own rows disagree | Follow the majority and FLAG the outlier, rather than transcribing whichever node you opened first. Three of Select's four rows are a uniform `p-md`; the fourth is `py-lg`, and both of Multiselect's agree with the three |
| A width utility named like Tailwind's container scale | `max-w-md` reads `--container-md`, falls back to `--spacing-md`, and this system's spacing steps ARE named sm/md/lg/xl — so it compiled to a 12px cap and Modal's two sizes rendered identically. Widths take a purpose-named chrome token (`max-w-nav`, `max-w-dialog-md`); `check:utilities` refuses the bare steps |
| Two `max-w-*` classes in one list | tailwind-merge keeps only the last. Modal's viewport cap sat above its size class and had never once applied. If you need two constraints they must be ONE declaration, or a different property |
| `transition-[…,transform]` beside a `scale-*` / `translate-*` | v4 writes the STANDALONE properties, so `transform` covers none of them and the surface snaps. Name `scale`/`translate`/`rotate`, or use `transition-transform`. Assert with `getAnimations()`, never `transitionProperty` — the declaration is right in both the working and the broken version |
| About to hand-roll a `<button>` inside a component | Don't, unless you can write the sentence saying why Button and `@/lib/chrome-control` both fail — `check:controls` will ask you for it. A bespoke control is invisible to every other gate: its classes resolve, it declares its own contrast pairs, and it has no props to get wrong. Four components rebuilt the same 32px chrome control before anyone noticed |
| The design's COMPOSITIONS use something its component sheet never defines | That is a design gap, and it is the moment to raise it — not to invent a local version. The 32px `bg-elevated` control appears in Header, Sheet and Calendar and in no component sheet; three of us filled the hole differently. Ask before building, and record it under `needsDesign` in the doc — `pnpm design:gaps` collects every one of them, which is how you find out two other components are waiting on the same thing |
| A default that is the rarer case | Button's `shape` shipped defaulting to `pill` while the design's default is soft. Every button placed anywhere came out a pill, so the shape the design actually draws looked like an invention each time it was needed. Check which value a design calls "Default" before choosing the parameter default |
| A prop combination nobody has ever seen | If it is not in the Matrix story it is not being looked at. `outline` and the soft radius at md/lg existed in the type and appeared in no story, which is why nobody noticed they were missing |
| `@ts-expect-error` on a prop that turns out to be real | `onDrop`, `onSelect`, `onChange` are DOM events and live in `HTMLAttributes`, so a "there is no such prop" test compiles and the directive reports as UNUSED. Pick a name the DOM does not have (`onReorder`, `onDateChange`) — and note what the failure taught you: the root spreads HTMLAttributes, so those handlers really are accepted |
| `userEvent.click` hanging on a disabled-ish control | Playwright's actionability check treats `aria-disabled="true"` as not-enabled and waits forever. Dispatch a native `.click()` inside `act()` — what you are proving is that the handler refuses, and a dispatched click proves it just as well |
| Rewriting a JSON file with a script | `json.dumps` escapes non-ASCII by default, so every em-dash and curly quote in the manifest becomes `\uXXXX` and the whole file reformats. Pass `ensure_ascii=False`, or edit the text rather than round-tripping it. Reverting that mistake with `git checkout` is how an uncommitted manifest entry gets destroyed |
| A gesture threshold averaged over the whole interaction | Velocity measured from first touch to release punishes the common shape — grab, pause to read, then decide — by reporting a slow flick, and rewards a fast grab and long hold with a flick that never happened. Measure the LAST segment. It also makes the test writable: synthetic events land within a millisecond of each other, so stamp `timeStamp` explicitly or every drag reads as infinitely fast |
| A new `icon` / `iconEnd` slot | Size it. A slot the component does not size renders at the icon library's default (griddy: 24px, set as an attribute, so one CSS class beats it). `registry/ui/icon-slot.browser.test.tsx` asserts every slot at the sheet's 16px — add your component to it, and it is the file that will tell you |
| An icon layer in Paper called `SVG` | The glyph was never identified, and path data is not readable — so whatever you import is a guess the sheet was supposed to settle. Ask, and get the layer renamed (`griddy-icons-in-paper`) |
| Reaching for an icon by the name that "looks right" | `X` is the X/Twitter wordmark; the cross is `Close`. griddy's brand marks hard-code `fill: "black"` and cannot take the ink — `lint-licensing` rejects them, for trademark reasons as much as rendering ones |
| A portalled surface inside a themed scope | Theme tokens are inherited custom properties and `document.body` is not in the scope. Give the surface a `container` prop (Sheet, Modal, Popover have one) and assert BOTH halves — that it does not inherit without one, and that it does with |
| A pointer gesture — a drag, a dropzone, a crop handle | It needs a KEYBOARD path, and `check:gestures` will ask for one. The reason it is a gate and not a review note: a gesture that works with a mouse passes everything else here — classes resolve, contrast is declared, stories render, and axe has nothing to say about a div that responds to pointer events. Only initiators count (`onPointerDown`, `onDrop`, …); `onPointerMove`/`onPointerUp` follow a gesture rather than offer one. An exemption must name where the keyboard path already is, as Drawer's does |
| A gate that matches a BARE WORD | It cannot tell a registration from a removal. `Omit<HTMLAttributes, "onMouseDown" | "onKeyDown">` is Badge REFUSING to be interactive, and the first check:gestures read it as both a registered gesture and a satisfied keyboard path — a false positive and a false negative in one line. Require the name to be followed by `=`, `:` or `(`. Both bugs were found by probing, in the gate rather than in the code |
| A row API that assumes what a row CONTAINS | Read the sheet's own layer names. "Primary Level Item" is a slot, and the sheet fills one with a search field and another with a Progress bar — an `href`-required link API cannot draw that, and an `<a>` around a form control is invalid HTML |
| A token nothing consumes | It is a GUESS until the first component measures it. `--ui-nav-rail-width` shipped at 3.5rem while nothing rendered it, and two written records then disagreed with it and with each other (48, 50, 56). The artboard declared no width at all — it was `fit-content` around a known 32px control — so the only authored number was the one nobody had checked. Read the drawing before defending the token |
| Six of ten parts change what they MEAN at a new size | That is a SIBLING component, not a mode — §7a's own test (Sheet vs Drawer), recorded for the rail as ADR 0015. If `Search` stops being a field and `Section` stops disclosing, a `collapsible` prop buys one mental model and pays with conditionals threaded through every part, which is the prop explosion §3 forbids. Write the parts table out before choosing |
| Two states that must differ, drawn from one token | Assert that they DIFFER, never what each one IS. Header's hover and current were both `bg-hover`, so the page you were on was indistinguishable from the one under the pointer — and pinning four hexes would pass while any two converged. `expect(new Set(fills).size).toBe(4)` fails on the real bug and names the values that collapsed |
| Two utilities with DIFFERENT modifiers | tailwind-merge does not see them as conflicting, keeps both, and the winner falls to whatever order Tailwind sorted the variants in — the exact thing `cn()` exists to prevent. `hover:bg-elevated` beside `data-[current]:bg-hover` is that pair. Make them mutually exclusive by CONSTRUCTION (`not-data-[current]:hover:`), not by hoping about order |
| `first:` / `last:` matching nothing | A structural pseudo-class counts DOM position, and `sr-only` is `position: absolute` — out of FLOW but still `:first-child`. A landmark label inside the scroll body made every section `:nth-child(2)`, so `first:border-t-0` suppressed a divider that was never there. Move the label out of the run, or stop selecting positionally |
| A regex over the flattened stylesheet | It encodes an ORDER nobody promised. A `forced-colors: active…[^}]*outline-width` pattern assumed every bare `forced-colors:` utility is an outline one; Tailwind puts them all in one block sorted by property, so the first non-outline utility in the whole library pushed the outline rules past the first `}` and the assertion reported "no fallback exists" while eleven of them did. Walk `document.styleSheets` structurally |
| A sided ZERO in a border utility | `border-t-0` is a WIDTH, and check:utilities' optional side group backtracks: it matches `t-`, the capture fails on `0`, the engine drops the group and re-runs from `t`, which takes `t-0` and demands `--color-t-0`. The digit guard must sit OUTSIDE the optional group. Fourth blind spot in that one pattern — it carries colours, widths, styles and a length at once |
| Declaring a dependency the component does not import | `check:dependencies` reads imports, not intent. A component whose every glyph is a caller-supplied slot imports no icon library, however many its stories draw. The registry ships SOURCE: an undeclared import breaks a consumer's build, a phantom one bloats their install |
| `overflow-clip` on a frame that can be too small | It clips DATA away with no affordance — strictly worse than squeezing, and it photographs as "responsive". `overflow-x-auto` clips at the same border box, so a concentric corner survives, and scrolls instead of swallowing |
| A scrollable region | Needs a keyboard path (SC 2.1.1) — and only WHILE it scrolls. Unconditional `tabIndex={0}` is what most implementations ship and it puts a silent, nameless tab stop in front of every table that fits. Measure with a ResizeObserver, and apply `role`, `aria-labelledby` and `tabIndex` together or not at all: a named region nobody can reach is as useless as a reachable one with no name |
| A state signalled by a partial edge | A left bar, a bottom rule, an inset stripe — for hover, current, active-focused, anything. It reads as CLUTTER and it multiplies down a list. Use a background step, a full thin outline, or elevation. NavRail shipped a 2px leading marker to separate current from hover and it was the wrong answer to a real problem: the family had one fill, so the fix was a token (`--ui-nav-hover-bg`), not a decoration (ui-craft 20–22) |
| Reaching for a separator line | `Menu.Separator` already settled this: "SPACE, not a rule — 8px above and below, and nothing painted", and it still announces as `role="separator"`. Grouping is the DIFFERENCE between two gaps. A rule is usually a spacing problem being solved with ink — and it drags a positional selector (`first:`) along with it, which is its own trap two rows up |
| A new fill added to the END of a derived ramp | Check it does not STRADDLE the ink. A step past the active fill is an accent wash under a tinted nav, so it lands darker for a dark accent and lighter for a light one — `legibleOn` then flips to the opposite ink for one ground and no single value clears both. Three fills the resolver can always satisfy beat four that break a brand style; the token test found it, the component never would have |

## Definition of done

Run the **review-ui** skill against the diff before calling it done — it is
the verification method for everything this pipeline builds.

Component · typed doc · stories incl. `BrandThemed` · type tests · browser
tests · manifest entry · regenerated registry · ledger entry · **contrast
measured in both schemes** · **any gate you touched probed failing-first** ·
every gate green · every design bug pushed back into Paper.

A component missing any of these is work in progress, whatever the demo looks
like.
