---
name: review-ui
description: Evidence-based code review for bydiorama/ui components, tokens and emitters. Use when reviewing a component PR, validating an implementation against the design, auditing the library, or investigating a "looks wrong" report. Complements add-component (the build pipeline) — this is the verification method that catches what compiles-and-passes but is broken at runtime.
---

# Review UI code

The review method for this library, built from the bugs that actually shipped
here. Its premise: **in a token-bound, utility-compiled system, the source
code is the least trustworthy layer.** Every serious defect found so far was
invisible in the source, green in CI, and only provable in the compiled CSS or
the browser's computed styles.

## The method: verify at the layer where the bug lives

Never review by reading class strings. Work down the stack until you hold
evidence:

1. **Source** — API contract, boundaries, token discipline (grep-able).
2. **Emitted theme** — does every utility have a variable? (`check:utilities`,
   plus eyeball `toTailwindTheme()` output for *wrong* mappings, not just
   missing ones — a dimension emitted as a colour passes every resolver.)
3. **Compiled CSS** — build Storybook, open the stylesheet, read the actual
   rule for each claim. Escaping matters: `hover:` compiles to `hover\:`,
   parens to `\(` — a naive grep reports false missing.
4. **Computed style in a real browser** — the only ground truth for cursor,
   focus visibility, font size/weight/family, transition values. jsdom is
   banned here; it fabricates answers for exactly these questions.
5. **Behaviour in a real browser** — keyboard activation, focus order,
   `document.fonts.check()` for the face actually loading.

**Every accepted finding ships with a failing-first regression test at the
layer that caught it**, then graduates up the ratchet (type → gate → lint →
skill line) per `add-component`.

## Shipped-bug catalogue — recheck every one on every review

Each of these passed type-check, lint, unit tests and `verify`:

| Bug | Where it hid | Detection |
| --- | --- | --- |
| Focus ring invisible: `outline-none` poisoned `--tw-outline-style`, so `focus-visible:outline-2` drew style `none` | Compiled CSS | Computed `outlineStyle === "solid"` after `.focus()` |
| Motion dead: `duration-[--x]` emits the bare property name — invalid CSS, 0s transitions, no press-scale. Custom properties need the parens form `duration-(--x)` | Compiled CSS | Computed `transitionDuration`/`transitionTimingFunction` |
| tailwind-merge deleted `text-button-sm` as a "conflict" with `text-ink-*` — md/sm labels silently inherited 16px | Runtime class list | Computed `fontSize` per size; every new theme namespace registered in `cn.ts` |
| Consumer `px-6` failed to displace `px-md` — §5 forwarding broken for custom spacing | Runtime class list | `cn()` unit probes |
| Emitter minted `--color-nav-width: 17rem` — a colour whose value is a length | Emitted theme | Read the theme for wrong-namespace mappings |
| "Weight doesn't match" with identical declared weights | Rendering | Smoothing/synthesis parity (CONVENTIONS §6) *before* touching values |
| `pnpm verify` green while a gate silently skipped all `hover:` utilities | The gate itself | Probe: break it on purpose, watch it fail |
| Two contract tokens collapsed to one utility name (`--color-edge-focus`); the second silently overwrote the first | Emitted theme | Assert the theme has no duplicate variable names |
| Dark-mode placeholder at 3.2:1 — the role was simply absent from `CONTRAST_PAIRS`, so the audit never looked | Resolved theme | Measure BOTH schemes; an unlisted pair is an unchecked pair |
| a11y "enforced at error severity" while axe never ran — addon-vitest installed but unwired, and an absolute stories glob matched zero files | The gate itself | Probe with a deliberately unlabelled control |
| Computed style read immediately after a state change returns the pre-transition value — a working focus ring reads as broken | Test | `await` `element.getAnimations()` before asserting |
| `--ui-border-strong` composited to 1.78:1 in dark — **weaker** than `--ui-border-control` at 3.09:1, inverting ADR 0010's own ordering, so a mixed Checkbox had no visible box | Resolved theme | Assert the stack's ORDERING, both schemes; the pair was simply absent from `NONTEXT_CONTRAST_PAIRS` |
| The rem emitter rounded to 3 places, rendering the designed 13px label at 13.008px | Computed style | Only visible against a px-exact expectation — assert the design's number, not the emitter's |
| `test:browser` never regenerated the token stylesheet, so the browser suite could assert against stale CSS | The gate itself | Change a token, run the suite, watch it *not* fail |
| `check:utilities` had no `mt-`/`ms-`/`size-`/`inset-` namespaces — a directional-margin typo emitted no CSS and went unreported | The gate itself | Probe with a nonexistent step (`mt-nudge`); coverage went 80 → 193 |
| tailwind-merge deleted `leading-flat` because our type roles sit in its `font-size` group, whose built-in conflict clears `leading` — stock `text-sm` bundles a line height, ours never do. Badge md and sm both fell to the font's normal leading and rendered identically | Runtime class list | `cn()` unit tests — which did not exist at all until this review, despite two shipped bugs living there |
| Two sizes differing only by an icon: every test passed while `md` and `sm` were pixel-identical, because nothing compared the badges themselves | Computed style | Assert the sizes DIFFER, not just that each is internally consistent |
| `pnpm test` globbed only `packages/*/src/**` — registry-level unit tests never ran | The gate itself | Add a failing test under `registry/` and watch the suite stay green |

**Probes must fail for the right reason.** A bare `scale-98` set from a test
file proves nothing about a component using `data-[starting-style]:scale-98`:
Tailwind compiles only what it finds when scanning source, so the probe is
absent even when the component's rule exists. It read as dead CSS and was not.
To check a variant utility, read the **compiled rule** out of
`document.styleSheets` — layer 3 — rather than inventing a class at runtime.

Also known: Tailwind scans **comments** for class names — a class named in a
comment compiles a dead rule. Harmless, but don't let it fool a grep-count.

## Review dimensions (industry-standard set, local enforcement noted)

**A11y** *(the floor is WCAG 2.2 AA, verified not asserted — CONVENTIONS §10)*
- Visible focus indicator, computed, on every interactive element — the
  industry's most-cited review item and the one we shipped broken.
- Keyboard contract exercised in Chromium (Enter, Space, Tab, escape/arrows
  where applicable); focus never lost on state change.
- Interactive **state** contrast, not just resting: hover/active/focus pairs
  re-measured — a 5–10% darker hover can quietly fall under AA. Our resolver
  audits declared pairs; new state tokens must join `CONTRAST_PAIRS`.
- Targets ≥24px (2.5.8); names on icon-only controls (type-enforced here).

**Tokens** *(no hardcoded colour/size/space/z — the universal rule)*
- Zero raw values and zero palette steps in components; roles only.
- New namespaces registered in `cn.ts` merge config the moment they exist.
- Both schemes exercised; brand re-skin proven via the BrandThemed story.

**API contract** *(CONVENTIONS §1–§5)*
- Naming table upheld; variants are exported closed unions; slots unwrapped;
  ref + className/rest forwarding; misuse states are *type errors* where
  possible (`@ts-expect-error` file present and honest).

**Boundaries** *(lint + licensing gates)*
- No framework/i18n/data-layer imports, no foreign icons, no new faces or
  paid assets. If a review approves an exception, it needs an ADR, not a nod.

**Docs & governance** *(the review is not done at LGTM)*
- Typed doc describes the component as shipped — including known gaps; a doc
  that names a prop that doesn't exist is a defect, found here once.
- Ledger entry with real `affects`; registry rebuilt; Paper updated when the
  finding is a design bug (flow stays repo → Paper).

**Schemes** *(both, always)*
- Every contrast pair measured in light AND dark. Theme zero authors light
  explicitly and lets dark derive, so a role missing from `ZERO_AUTHORED.dark`
  falls to derivation — which is where the placeholder failure lived.

**Visual** *(current known gap)*
- Matrix story vs the Paper export, side by side, both schemes. Screenshot
  diffing is not yet automated — until it is, this step is manual and
  mandatory, and "I looked at it" means both schemes at two sizes.

## Report format

Findings ordered by severity, each with: the evidence (rule/computed value,
not the source line alone), the failing-first test added, the fix, and the
ratchet step taken. A finding without evidence at the failing layer is a
hypothesis, not a finding — say so.
