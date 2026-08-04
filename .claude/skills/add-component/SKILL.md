---
name: add-component
description: The pipeline for implementing, validating and shipping a component or pattern in bydiorama/ui. Use whenever adding a component, extending one, porting a design from Paper, or reviewing a component PR. Encodes the workflow, the definition of done, and the traps already paid for once — so quality ratchets up instead of resetting per component.
---

# Add a component

The distilled pipeline from Button, the first component through the system.
`CONVENTIONS.md` is the binding rulebook and `AGENTS.md` the constitution —
this skill is the *order of operations* and the traps. When they conflict,
they win.

**The ratchet rule (why this file exists):** every defect found in review must
graduate into the strongest enforcement that can hold it, in this order:
**1) a type · 2) a CI gate · 3) a lint rule · 4) a line here.** Prose is the
floor, not the goal. Precedents: icon-only-requires-aria-label became a type;
unresolvable utilities became `check:utilities`; mono fonts became a licensing
gate; stories-in-the-manifest became a manifest gate. If your review finding
ends as a comment, ask why it couldn't be one of the first three.

## Order of operations

### 1 · Spec from Paper — values, never pixels

- `get_computed_styles` / `get_jsx` for every value. Screenshots are for
  *reviewing* results only; a value read off a screenshot is a guess.
- The sheet should already be token-bound (`var(--ui-*)`). Raw hex or
  off-scale values (11px text, 12px radius) are **design bugs — fix them in
  Paper and tell the user**, don't faithfully transcribe them. Precedent: the
  11px button label made the small button 23px, under the WCAG 24px floor.
- Token flow is repo → Paper. If the design invents a value the contract
  lacks, the contract grows (step 2); Paper never becomes the source of truth.

### 2 · Tokens before component

- **Semantic roles only in components.** If you're about to type a palette
  step (`bg-blue-70`), stop: the design is telling you a role is missing
  (precedent: `--ui-bg-accent-hover/-active`, the danger surface set).
- New role = contract + resolver derivation + `ZERO_AUTHORED` pin (+ dark) +
  a `CONTRAST_PAIRS`/`NONTEXT_CONTRAST_PAIRS` entry when it carries ink or a
  control boundary. The typed contract makes a missed derivation a compile
  error — trust it.
- Run `pnpm test` and `pnpm check:utilities` before touching the component.

### 3 · Component

Work through `CONVENTIONS.md` §1–§10 with the file open. The ones that bit:

- Native element first; `type="button"` default; `forwardRef`; `className` +
  rest spread; `data-slot`/`data-variant`/`data-size`.
- **Conditionally-required a11y props are discriminated unions**, not docs:
  `isIconOnly: true` requires `aria-label` at compile time.
- `cursor-pointer` + `disabled:cursor-not-allowed` — no browser or reset
  provides them. Disabled = the `disabled` attribute; **never**
  `pointer-events-none` (it kills the explaining tooltip). Gate hover/press
  behind `enabled:`.
- Resting outlines are **inset rings**, keeping `outline` free for
  `focus-visible` (survives forced-colors).
- Transitions enumerate properties; scale excluded so press snaps; press is
  `--ui-press-scale` with `staticTap` opt-out.
- Slots take elements and are never wrapped. Strings are props. No `next/*`,
  no i18n, no data layer (lint enforces).
- Don't document an API that doesn't exist — the doc file describes the
  shipped component, gaps and all (see Button's `isBusy` known-gap note).

### 4 · Typed doc (`*.doc.ts`)

Anatomy, composition tree (agents compose from trees, not prose), props with
*why* notes, do/don't, a11y block with an explicit keyboard table and measured
contrast numbers. This file feeds docs/Storybook/MCP — prose elsewhere
doesn't exist.

### 5 · Stories (`*.stories.tsx`)

Minimum set: `Playground`, a `Matrix` mirroring the Paper sheet's own layout
(so visual diffing is like-for-like), `States`, and **`BrandThemed` — theme
zero beside a hostile brand seed (pale-yellow accent) — mandatory** per
AGENTS.md. Give every story `onClick: fn()`: a control with no observable
response *reads as broken* and generates false bug reports (that is exactly
how "Enter doesn't work" arose). Don't spread the args bag into components
with discriminated-union props (`exactOptionalPropertyTypes` breaks the
union); pass what the story needs.

### 6 · Tests — two files, two layers

- `*.types.test.tsx`: `@ts-expect-error` assertions that misuse fails to
  compile. Runs under `tsc --noEmit`; an expect-error that stops erroring
  fails the build.
- `*.browser.test.tsx`: the keyboard contract and computed-style assertions
  in real Chromium (`pnpm test:browser`). **jsdom is banned for these** — it
  does not implement implicit activation or computed cursor and will answer
  confidently and wrongly. Mount with `createRoot` + `act` directly. Assert
  `getComputedStyle`, not class names: a class proves nothing unless a rule
  matches it.

### 7 · Register and record

- Manifest entry: component + doc file only. Stories/tests are co-located but
  **never listed** — `check:manifest` enforces it; the manifest, not the
  folder, is the distribution boundary.
- `pnpm registry:build`, then a ledger entry (`pnpm ledger:new`) with real
  `affects` values and the Paper URL as provenance.

### 8 · Gates — and make new ones bite

```
pnpm run type-check && pnpm lint && pnpm test && pnpm test:browser && pnpm verify
```

**A passing check is not evidence until you have watched it fail.** When you
add or change a gate, break it deliberately once (probe file, one-char typo)
and confirm the failure message teaches the fix. Precedents: the mono-font
probe; the utilities-gate probe that exposed the gate itself silently
skipping every `hover:` utility.

## Traps already paid for

| Trap | Rule |
| --- | --- |
| `light-dark()` around a shadow list | It takes colours only; the CSS emitter merges per-layer — never hand-write it around composites |
| Story/test imports unresolvable | `tsc` resolves `node_modules` from the *importing file*; deps imported by `registry/` files live at the workspace root |
| ESLint scanning build output | Ignore globs must be `**/`-prefixed; bare `dir/**` matches only at repo root |
| "Enter shows no press animation" | UA applies `:active` for one frame on Enter — browser behaviour, not a bug; never fake it with JS state |
| Missing hover state, no error anywhere | Unknown utility ⇒ Tailwind emits nothing; `check:utilities` exists for this — keep it in `verify` |
| Grep says a utility is missing from built CSS | Variant-prefixed classes are escaped (`hover\:`) — check before "fixing" |
| `git checkout <file>` to undo a probe | It also destroys uncommitted real work; back up or edit the probe out instead |
| A11y addon as decoration | `a11y: { test: "error" }` — installed-but-warning is the previous generation's failure |
| tailwind-merge deleting a custom utility | Every new theme namespace (sizes, inks, spacing steps) must be registered in `cn.ts`'s merge config, or size-vs-colour "conflicts" silently drop classes; pin with computed-style tests |
| "The weight looks heavier than the design" | Declared weights were identical — set antialiased smoothing + `font-synthesis: none` at the root (CONVENTIONS §6) before touching any value |
| Committing vitest failure screenshots | `__screenshots__/` and `.vitest-attachments/` are debug artifacts (gitignored) — same capture, two stores; baselines are a separate, deliberate mechanism |
| New face/library "just for this component" | Licensing gate + independence rules (AGENTS.md); file a gap instead |

## Definition of done

Before calling it done, run the **review-ui** skill against the diff — it is
the verification method (compiled CSS, computed styles, real browser) for
everything this pipeline builds.

Component + typed doc + stories (incl. BrandThemed) + type tests + browser
tests + manifest + regenerated registry + ledger entry + every gate green +
any design bug found pushed back into Paper. A component missing any of these
is work in progress, whatever the demo looks like.
