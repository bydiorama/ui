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

**Visual** *(current known gap)*
- Matrix story vs the Paper export, side by side, both schemes. Screenshot
  diffing is not yet automated — until it is, this step is manual and
  mandatory, and "I looked at it" means both schemes at two sizes.

## Report format

Findings ordered by severity, each with: the evidence (rule/computed value,
not the source line alone), the failing-first test added, the fix, and the
ratchet step taken. A finding without evidence at the failing layer is a
hypothesis, not a finding — say so.
