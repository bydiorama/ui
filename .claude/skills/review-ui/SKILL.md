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

**The same premise applies to the DESIGN.** A stated model — a message, a
spec, a naming convention someone gives you — is not the file, and the file is
what ships. A button model saying "Default (soft border radius)" was acted on
directly; a `border-radius` query across the page then returned 200+ matches
in which every composed button was a pill. Both are true: the model is the
intent, the compositions are the current state, and the gap between them is a
decision for the designer rather than something to resolve by picking one.
Query the file before telling anyone what the model implies for their screens.

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
| A portalled surface ignores the brand theme entirely | Rendering | Theme vars are inherited CSS custom properties; `createPortal` to `document.body` leaves the subtree, so a brand scope applied to a wrapper never reaches a Popover/Modal/Multiselect panel. Check EVERY portalled component under a brand scope, not just the trigger |
| A component "shrinks" in Storybook Docs but is correct in isolation | Layout | `w-full` inside a shrink-to-fit parent is circular and collapses to content. Reproduce in a fixed-width container BEFORE touching the component — the defect is usually the story, not the code |
| Test **failure artifacts committed as if they were baselines** — four `-actual-`/`-diff-` PNGs tracked under `apps/registry/`, a directory that should not exist | The index | A failing compare writes them relative to the VITEST ROOT, not the test file: `apps/storybook/../registry/...` resolves to `apps/registry/`, which no `**/__screenshots__/` rule matches. Ignore the artifact NAMES globally, not the folder. Audit `git ls-files '*.png'` — debris that looks reviewed is worse than debris |
| Story tests fail on the FIRST run after adding a story file and pass on the second | The runner | Vite discovered a new dependency mid-run, re-optimised and reloaded the page under the test ("Vite unexpectedly reloaded a test"). Pre-bundle via `optimizeDeps.include`. Reproduce by deleting `node_modules/.vite` AND adding a story file — one without the other does not trigger it |
| **A contrast number in a doc that nobody measured.** Progress shipped claiming "3.2:1 in light"; it was 1.24:1 and failing | The doc | Every number in a `*.doc.ts` must come from a command you ran in that session. A fabricated number is worse than none — it stops the next reviewer looking |
| A prop forwarded to the behaviour layer that DOES NOT EXIST there. `dismissible` is not a Base UI Dialog prop, so `isDismissable={false}` did nothing and Escape closed the dialog anyway | Behaviour | JSX drops unknown props silently. Read the wrapped library's `.d.ts` for every prop you forward, and assert the BEHAVIOUR the prop promises, not that you passed it |
| `[role="slider"]` matches nothing, because a native `input[type=range]` carries the role IMPLICITLY | Test | Query the element (`input[type="range"]`), not the attribute. An implicit role is the reason to use the native control — a test that demands the explicit attribute is asking the platform to be worse |
| Naming the GROUP does not name the control inside it — a labelled Slider whose inner input was anonymous | Behaviour | `aria-labelledby` belongs on the element that carries the role. Assert the name resolves from the focusable element, not from its wrapper |
| The visual gate passed while a Switch track changed colour completely | The gate itself | `allowedMismatchedPixelRatio` has a floor: a small element can change entirely and stay under it. A green visual run is evidence about LARGE surfaces, not proof nothing moved |
| A `fixed` overlay takes the width of a docs cell | Layout | `position: fixed` resolves against the nearest **transformed** ancestor, not the viewport. Storybook's docs blocks transform their preview, so `100vw`/`inset-0` silently scope to it. Never size a fixed surface with viewport units alone; floor it |
| Type at the right size in the design and **12.17px** in the browser | Computed style | `title-*` and `display-*` are FLUID roles (`clamp(…vw…)`); their name and their peak both say 16, and only the computed value says otherwise. Inside a fixed-width surface — a nav rail, a docked panel — a fluid role tracks a viewport the surface ignores, and is smallest on the phone where the design draws it largest. Assert the sheet's px, not the role name |
| A `size` prop that has never had an effect | Computed style | `max-w-md`/`max-w-xl` look like Tailwind's container scale but resolve against this system's spacing scale — 12px and 24px caps that `min-w-80` overrode, so every Modal rendered at 320px. Compare variants TO EACH OTHER, on the property the variant sets, not on rendered size: a viewport narrower than both caps makes them identical anyway |
| An enter animation that is declared, compiles, and never runs | Behaviour | v4's `scale-*`/`translate-*` write the standalone properties; `transition-[opacity,transform]` covered none of them. `getComputedStyle().transitionProperty` reads exactly as authored in BOTH the working and broken versions — a Popover test asserted it contained "transform" and passed for the defect's entire life. Only `el.getAnimations()` distinguishes them |
| A control that is not the library's control | Source | `grep -n '<button' registry/ui/*/*.tsx`. Every hit that is not Button, the chrome control or an allowlisted exemption is a component someone rebuilt by hand — and it is invisible to every other gate. `check:controls` enforces it; run the grep anyway on anything the gate cannot see, like a dynamic `const Row = isLink ? "a" : "button"` |
| A variant that exists in the type and in no story | Storybook | The Matrix is the only place a reader sees the whole grid. `outline` and the soft radius at md/lg were reachable through the API and drawn nowhere, so the gap survived a build, a review and a release. Read the Matrix against the design's own axes, not against the props table |
| An icon slot at the icon library's size, not the design's | Computed style | A slot the component never sizes inherits the library's default — griddy sets `width/height="24"` as ATTRIBUTES, and only Badge ever overrode it. Every Button, Input and Banner glyph shipped 50% oversize against a sheet that draws 16 at every control size, and at `sm` a 24px glyph exactly filled the 24px button. Measure the SVG, not the control |
| An icon that ignores the ink colour | Rendering | 73 of griddy's ~1160 glyphs hard-code `fill: "black"` — the brand marks. `X` is the X/Twitter wordmark, not a cross; it rendered black-on-charcoal beside a correctly-lit sibling. `lint-licensing` now rejects any fixed-fill icon in distributed source. For a close control the glyph is `Close` |
| A visual baseline that has always been cropped | The gate itself | `elementLocator().toMatchScreenshot()` captures what is VISIBLE, and vitest's browser viewport is 414px by default. A 608px matrix frame produced 450px PNGs, so the right-hand third of every case had never been compared — a trailing Switch and a set of trailing icons lived there. The tell was a clipped button written off as "the frame's width". Check a baseline's PIXEL DIMENSIONS against the frame you think you mounted |
| A focus ring that vanishes in Windows High Contrast | Compiled CSS | Forced-colors mode forces `box-shadow` to `none`. Eleven of twelve components drew their ring with `shadow-(--ui-focus-ring)`, so the indicator did not change colour there — it ceased to exist, for the users who most depend on it. Every box-shadow ring needs a `forced-colors:outline` fallback UNDER ITS OWN VARIANT: `peer-focus-visible:` on Switch and Checkbox, `focus-within:` on Input. A fallback under the wrong variant never matches, which is the quiet way this fix fails |
| A visual tolerance expressed as a RATIO | The gate itself | A ratio is a proportion of the whole frame, so 1% of a 560x300 frame is ~1,700 pixels — more than an entire Switch track. Even 0.001 passed a 4px thumb move, because the changed region is ~64 pixels. Use an ABSOLUTE allowance; 0 is achievable when baselines are machine-specific, and it is the only setting that makes a green run mean "nothing moved" |
| A prop that announces to assistive tech and shows sighted users nothing | Rendering | Button's `isBusy` set `aria-busy` and had no visual for its whole life — the inverse of the usual failure, and invisible to every a11y check because the a11y half was the half that worked. Ask of any state prop: what does each audience get? |
| A "pointless" fix to a 1.5px edge | Computed style | `border: 1.5px` computes to **1px** (device-pixel flooring); `box-shadow: 0 0 0 1.5px` computes to **1.5px**, because spread is not snapped. Button's ring is a box-shadow and Input's edge is a border, so the same declared number is real in one and lost in the other. Never carry a conclusion about one across to the other |
| A DERIVED value nobody measured | Resolved theme | `outline`'s edge was derived as "the next step up ADR 0010's stack" and measured 2.14:1 — under the 3:1 SC 1.4.11 wants from a control boundary, which is the only reason that variant exists. Derived means *hypothesis*: declare its contrast pair in the doc so `check:contrast` measures it, and let the gate tell you |
| `tsc --noEmit` passes and the browser cannot load the file | The runner | A `{/* … */}` between a ternary's `(` and its element is two sibling expressions. Type-check was silent; vitest reported "Failed to fetch dynamically imported module", which names the symptom and not the cause. When a test file fails to *import*, read the vite transform error before anything else |
| ARIA the type system cannot refuse | The gate itself | `aria-selected` is not allowed on `role="button"` — it belongs on the gridcell. React types accept every `aria-*` on every element, so only axe catches it, and only if a STORY renders the state. A component whose selected state never appears in a story is one axe never sees |
| Two landmarks of the same kind on one page | The gate itself | `<header>` is the banner landmark, a document may have exactly one, and axe fails the second. It is a COMPOSITION rule the component cannot enforce — `<header>` only maps to banner outside article/aside/main/nav/section. Stories that render two must wrap them, and the doc has to say so |
| A part composed through `render` loses its own `data-slot` | Runtime DOM | `<Sheet.Trigger render={<Header.MenuButton/>} />` renders ONE element and the trigger's `data-slot` wins, so the part is targetable only by the trigger's slot. True of every render slot here — Popover.Trigger, Modal.Trigger, Sheet.Close. A test or a consumer selector written against the part's own slot silently matches nothing, which reads as "the component did not render" |
| A gate that reads its own documentation | The gate itself | Tailwind scans comments for class names, which is harmless — until a gate REJECTS names, and a comment explaining why a class is wrong fails the build. Strip comments before scanning, or the fix cannot be documented next to the code |
| A focus ring that reads as broken when tabbed to from a test | Test | Two problems, both silent. `:focus-visible` does not match a **programmatic** `.focus()` on a link in Chromium — so drive it with real Tab presses. And a fixed count of Tabs asserts against whatever happens to be Nth: walk until `document.activeElement` is the element you mean, then assert |

**Measure, then write. Never the reverse.** Every contrast figure in a doc, a
comment or a ledger entry is a claim someone will rely on instead of checking.
Run the resolver, paste the number. This session shipped a fabricated 3.2:1
against a real 1.24:1, and the doc's confidence is exactly what would have
stopped the next reviewer from looking.

**Check the whole surface under a brand scope, not the trigger.** Three of the
four defects above were invisible in theme zero and in the contract suite: they
only appear when a component is rendered inside a brand scope, inside Docs, or
both. The BrandThemed story is mandatory for exactly this reason — but it only
works if the thing you need to see is *inside* the themed subtree.

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
