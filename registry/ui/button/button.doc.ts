/**
 * Typed documentation for Button.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const buttonDoc = {
  name: "Button",
  status: "stable",
  summary:
    "The primary action control. Five types, three sizes, two shapes, five content arrangements. SOFT is the default shape: the design's Rounded Full is the alternative, not the baseline, and having that inverted is why three components appeared to need a button nobody had defined.",

  anatomy: [
    { part: "root", slot: "button", notes: "The <button>. Carries variant, size and state data attributes." },
    { part: "icon", slot: "icon", notes: "Leading icon. Passed as an element, never wrapped by the button." },
    { part: "label", slot: null, notes: "children. Absent when isIconOnly." },
    { part: "iconEnd", slot: "iconEnd", notes: "Trailing icon — chevrons for menu triggers." },
  ],

  /** Agents compose more reliably from an explicit tree than from prose. */
  composition: `
Button
├─ icon?        ReactElement — griddy-icons only
├─ children     ReactNode — omitted when isIconOnly
└─ iconEnd?     ReactElement
  `.trim(),

  props: {
    variant: {
      type: '"primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse"',
      default: '"primary"',
      notes:
        "primary is the brand-blue filled action; secondary is the quiet edge (border-subtle); outline is the SAME shape with a CONFORMANT edge (border-control, 3.11:1) — the reason to reach for it over secondary is that something depends on identifying its boundary; ghost has no chrome until hover; danger is the subtle red surface, not a solid red fill; inverse is outline's shape for --ui-bg-inverse bands (a footer, a dark CTA band — #36): ring, label AND focus outline in --ui-text-inverse (the page's focus colour measured 2.88:1 light / 1.37:1 dark on the band, so focus takes the band's ink: 15.53:1 in both), hover/press on the band's own -hover/-active, disabled in --ui-text-inverse-muted. It follows the band when the scheme flips; it is not for media grounds. Every type is either a fill with a matching edge or an edge on nothing — a fill with NO edge is not a button here, it is the chrome control (`@/lib/chrome-control`).",
    },
    size: {
      type: '"lg" | "md" | "sm"',
      default: '"md"',
      notes: "44 / 32 / 24px tall at default density (--ui-control-*-height). lg is the touch target for primary page actions. Under [data-ui-density=\"compact\"] every size is 4px shorter, floored at 24 — so lg is 40px and gives up the 44px touch target; under comfortable they are 4px taller (ADR 0020 §4).",
    },
    shape: {
      type: '"soft" | "full"',
      default: '"soft"',
      notes:
        "soft is the DEFAULT and full is the alternative — the design's own legend calls them \"Default (soft border radius)\" and \"Rounded Full\", which is where the value names now come from. The soft radius SCALES: 4px at sm (the sheet's Small Rounded column), 8px at md and lg (as Header, Sheet and Calendar draw their 32px controls). Only lg is derived; it follows md rather than inventing a third step. This axis shipped INVERTED, with the fully-rounded shape as the default, which is why every button placed anywhere came out a pill and the soft control the design actually draws looked like an invention each time it was needed.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "Non-interactive, removed from the tab order. The disabled treatment is PER VARIANT: primary, secondary, outline and danger flatten to the --ui-bg-elevated chip the sheet's Disabled frame draws; ghost keeps no fill and no ring and takes only the disabled ink (--ui-text-disabled), because a control with no chrome at rest turned into a grey slab — the heaviest thing in its row — the moment it disabled (#27)." },
    isBusy: {
      type: "boolean",
      default: "false",
      notes:
        "BUSY SWALLOWS ACTIVATION (maintainer decision 2026-10-05, #8). Keeps focus and its place in the tab order, but a click, Enter or Space does nothing: onClick is not called, and a type=\"submit\" button does not submit its form — by click, by Enter on the button, or by Enter in a text field (implicit submission fires a synthetic click at the form's default button, and that click is cancelled). So isBusy is the double-submit guard ON ITS OWN; do not pair isDisabled with it for that. It is still not isDisabled: no disabled styling, no lost focus. Sets aria-busy and aria-disabled=\"true\" (aria-busy alone is not announced on a button by most screen readers, and the control genuinely cannot be activated). The cursor is `progress` and the press-scale is off, because both would acknowledge a press nothing acts on. Shows a 16px spinner IN PLACE OF the leading icon rather than beside it, so the button keeps its width and does not shift the layout under a pointer still resting on it; the spinner is aria-hidden because aria-busy already carries the meaning, and it stops turning under prefers-reduced-motion while staying visibly different from the resting icon. DERIVED — the sheet draws no busy state; it shipped as a prop that announced to assistive tech and showed sighted users nothing, which is worse than not having it.",
    },
    isFullWidth: { type: "boolean", default: "false" },
    isIconOnly: {
      type: "boolean",
      default: "false",
      notes: "Requires aria-label — enforced by the prop types, not by review.",
    },
    staticTap: { type: "boolean", default: "false", notes: "Opts out of the press-scale feedback." },
    icon: { type: "ReactElement", notes: "Slot. Icons come from griddy-icons only. The component sizes the slot at 16px, the size the sheet draws at every control size. Without that the glyph arrives at whatever the icon library defaults to — griddy hard-codes width/height=\"24\" as attributes — which rendered every icon 50% oversize." },
    iconEnd: { type: "ReactElement", notes: "Slot." },
    render: {
      type: "ReactElement",
      notes: "Slot: render as this element instead of a <button> — `render={<a href=\"/contact\" />}` or the app's own `<Link>` — for a call to action that navigates (#31). Classes, data attributes and handlers merge onto it. On a rendered element `type` is not set; `isDisabled` becomes aria-disabled + tabIndex -1 + a cancelled click, because an <a> has no disabled attribute.",
    },
  },

  do: [
    "Give every icon-only button an aria-label describing the action, not the glyph.",
    "For a CTA that navigates, pass render={<a href=… />} (or the router's Link). In .astro or server templates, put buttonClassName({ variant, size }) on the <a> and add data-disabled/aria-disabled yourself if it can be disabled.",
    "Use isBusy for in-flight submits: it refuses a second activation AND keeps focus on the button for the round trip. It is the whole double-submit guard — migrating from a `loading` prop that implied disabled is a straight rename.",
    "Pass icons as slots so usage is visible at the call site.",
    "Reach for size=\"lg\" on primary page actions — it is the only size at the 44px touch target.",
  ],

  dont: [
    "Do not use isDisabled to indicate loading; the control disappears from the tab order.",
    "Do not pair isDisabled with isBusy to stop a double submit — busy already refuses activation, and adding disabled only throws the keyboard user's focus away mid-submit.",
    "Do not rely on a click reaching onClick while busy (to cancel, say). A busy button swallows activation; a cancel action is a separate button.",
    "Do not add pointer-events-none to a disabled control — it blocks the tooltip that explains why it is disabled, and the disabled attribute already prevents activation.",
    "Do not nest a Link inside a Button, and do not wrap a Button in an <a> — nested interactive elements are invalid HTML and double-announce to screen readers. For a navigation styled as a button, use `render={<a href=…/>}` (or `buttonClassName()` in markup React does not own) — one element, one role.",
    "Do not add a second filled primary to the same view; the brand fill is the one loudest thing on a screen.",
    "Do not restyle a variant with className to invent a fifth one; add it here instead.",
  ],

  a11y: {
    role: "button (native element)",
    keyboard: [
      {
        key: "Enter",
        does: "Activates — unless busy, when it does nothing (and does not submit a form). Native implicit activation, verified in a real browser (button.browser.test.tsx) — not re-implemented. Note the UA applies `:active` only instantaneously for Enter, so the press-scale is not perceptible; the focus ring is the static cue and the resulting action is the acknowledgement.",
      },
      { key: "Space", does: "Activates on release, and holds the `:active` press-scale while down. Busy: does nothing, and no press-scale." },
      { key: "Tab", does: "Moves in and out. isDisabled removes it from the sequence; isBusy does not." },
      { key: "Enter (in a field of the same form)", does: "Implicit submission targets the form's default button. If that is a busy submit Button, nothing is submitted — the synthetic click it receives is cancelled." },
    ],
    pointer:
      "cursor: pointer is set explicitly. A <button> has no pointer cursor by default — the UA default is the arrow and Tailwind's preflight adds nothing — so omitting it silently costs the only pre-click affordance. Disabled shows not-allowed.",
    hover:
      "Each type's own step: primary and danger deepen their fill, secondary and outline firm their edge, inverse fills the band's -hover step. ghost FILLS — with the sheet's --ui-bg-elevated on the page, and with --ui-bg-hover inside any ancestor that paints bg-elevated (a card, a dock, a panel), because there the sheet's fill is the ground's own colour and the hover vanished. The surface declares its ground by painting it; no prop. The token test holds bg-hover a step past bg-elevated in every seed and both schemes.",
    pressed:
      "PAINTS NO NEW FILL on the edge-on-nothing types. secondary firms its ring (default -> strong) and takes its ink to primary; outline takes its ink to primary; ghost keeps the fill hover already painted and darkens its ink. A pointer press is necessarily also a hover, so :hover's treatment is already applied and :active adding a second, darker fill is what produced a neutral chip on a control the design draws with no fill in any state. primary and danger are FILLS by definition and keep theirs. The ink step is required, not decorative: §8 forbids motion being the only feedback channel, and the press-scale is the motion.",
    disabled:
      "PER VARIANT. primary, secondary, outline and danger fill and ring with --ui-bg-elevated, which is what the sheet's Disabled frame draws — the control flattens rather than becoming a filled chip. It shipped one step darker (bg-sunken). ghost keeps its absence of chrome — no fill, a transparent ring — and takes only --ui-text-disabled, so an unavailable quiet action stays the quietest thing in its row (#27). Uses the native disabled attribute only; pointer-events are deliberately left alone so a tooltip can still explain why the control is unavailable. Hover and press states are gated behind `not-data-disabled:` — Button stamps data-disabled on whatever element it renders, because `:enabled` never matches an <a> and gated every link's hover away (#31).",
    busy:
      "aria-busy=\"true\" plus aria-disabled=\"true\", focusable, in the tab order, activation refused. aria-disabled is deliberate: activation really is unavailable, and aria-busy on a button is silently ignored by most screen readers, so without it AT would present a control that does nothing as operable. The label (\"Saving…\") carries the why. Note for consumers' tests: Playwright treats aria-disabled as not-enabled, so `userEvent.click` on a busy button waits forever — dispatch `.click()` to assert that it refuses.",
    focus:
      "focus-visible only, drawn as a 2px outline offset 2px in --ui-focus-ring-color (5.6:1 against the page). Sits on the outline layer so no variant's resting ring can be mistaken for it, and forced-colors mode keeps it.",
    contrastPairs: [
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "text", role: "primary label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "secondary label" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "outline label" },
      { fg: "--ui-border-subtle", bg: "--ui-bg-base", floor: "decorative", why: "The resting edge of secondary is a hairline that separates a quiet control from the page, not a boundary anything depends on identifying — SC 1.4.11 covers controls whose STATE it conveys, and secondary's state is carried by its ink and its hover. outline exists precisely for the cases that need a boundary at 3:1.", role: "the secondary edge" },
      { fg: "--ui-border-control", bg: "--ui-bg-base", floor: "non-text", role: "the outline edge" },
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "danger label" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "a hovered ghost label, on the fill the sheet's Ghost Hover frame actually draws" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "a PRESSED ghost label — the ink step that keeps press from being motion alone" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-hover", floor: "text", role: "a hovered ghost label inside an elevated surface" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "a pressed ghost label inside an elevated surface" },
      { fg: "--ui-border-strong", bg: "--ui-bg-base", floor: "non-text", role: "a pressed secondary's edge, the firmest step in ADR 0010's stack" },
      { fg: "--ui-text-inverse", bg: "--ui-bg-inverse", floor: "text", role: "inverse label, and its edge" },
      { fg: "--ui-text-inverse", bg: "--ui-bg-inverse-hover", floor: "text", role: "a hovered inverse label" },
      { fg: "--ui-text-inverse", bg: "--ui-bg-inverse-active", floor: "text", role: "a pressed inverse label" },
      { fg: "--ui-text-inverse-muted", bg: "--ui-bg-inverse", floor: "decorative", why: "A disabled control is exempt from SC 1.4.3 and 1.4.11; the muted ink still measures 8.01:1 light / 5.36:1 dark (warm neutral-70 in light since 2026-11-03; it was a cool #A7A7A7).", role: "a disabled inverse label and edge" },
    ],
    hitArea:
      "sm is exactly 24px, the WCAG 2.5.8 floor, at every density — compact cannot go under it. lg is 44px, the recommended touch target, at default and comfortable density only: compact lg is 40px, so a compact screen meant for touch should reach for comfortable instead. md sits between at 32px — pair it with generous surrounding space on touch surfaces.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Every button COMPOSED in the file is fully rounded, while the stated model makes soft the default. The compositions and the model disagree, and one of them needs updating — the model is now explicit in the sheet's own legend, so the compositions are the side that is out of date.",
    "TWO SHEETS NOW EXIST and they disagree. The handoff sheet (Handoff - Components, XK7-0) was rebuilt to match this implementation: all five types against rest, hover, pressed, focus-visible and disabled, plus busy, full width, a token map and a dark matrix. The older component sheet (Components, E3V-0) is what the earlier notes here described. Retire E3V-0 or reconcile it — a handoff with two spec sheets is a handoff with none.",
    "E3V-0 draws NO pressed row at all: eleven frames, five variants, their five hovers, and disabled. Every active treatment was therefore derived, and what the derivation reached for was --ui-bg-active, a value appearing ZERO times in that artboard. The handoff sheet now draws pressed as shipped — no new fill, a firmer ring and darker ink. Confirm.",
    "E3V-0's Outline and Outline Hover rows disagree with what ships in two ways. Its hover edge is border-default, which measures 2.14:1 and fails the 3:1 SC 1.4.11 asks of the boundary this variant exists to provide, so border-control ships instead. And its hover LIGHTENS the ink (text-primary at rest, text-muted on hover), the opposite direction from every other variant; ours keeps the ink and firms the ring. Both need a decision.",
    "E3V-0's Secondary Hover fills with --ui-bg-sunken and rings itself with that same value. What ships has no hover fill at all: the ring firms and the ink darkens. Two different pictures of one state, and only one can be right. The handoff sheet draws the shipped version.",
    "The soft radius at lg is derived from md (8px). The sheet draws soft only at sm.",
    "No busy state is drawn; the spinner is ours. So is the `progress` cursor busy now shows, since busy refuses activation (#8).",
    "The component sheet draws ONE Disabled frame — the elevated chip — for every type. The ghost exception (no fill, no ring, disabled ink only; #27) comes from a product frame (service-portal, Brand Profile › Fonts, each style's Delete), not from the sheet. Draw a disabled ghost in the handoff sheet so the two agree.",
    "Ghost Large draws paddingInline xl where the other three large buttons draw lg. Corrected to lg in Paper — confirm.",
  ],

  motion:
    "Press feedback is scale(--ui-press-scale) with a staticTap opt-out; colour and ring transitions use --ui-duration-fast with --ui-ease-out. Scale is excluded from the transition list so the press snaps. prefers-reduced-motion collapses durations at the token layer and cancels the scale here.",

  designInverse: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3QET-0",
  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/XK7-0",
} as const;

export type ButtonDoc = typeof buttonDoc;
