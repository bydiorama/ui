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
      type: '"primary" | "secondary" | "outline" | "ghost" | "danger"',
      default: '"primary"',
      notes:
        "primary is the brand-blue filled action; secondary is the quiet edge (border-subtle); outline is the SAME shape with a CONFORMANT edge (border-control, 3.11:1) — the reason to reach for it over secondary is that something depends on identifying its boundary; ghost has no chrome until hover; danger is the subtle red surface, not a solid red fill. Every type is either a fill with a matching edge or an edge on nothing — a fill with NO edge is not a button here, it is the chrome control (`@/lib/chrome-control`).",
    },
    size: {
      type: '"lg" | "md" | "sm"',
      default: '"md"',
      notes: "44 / 32 / 24px tall. lg is the touch target for primary page actions.",
    },
    shape: {
      type: '"soft" | "full"',
      default: '"soft"',
      notes:
        "soft is the DEFAULT and full is the alternative — the design's own legend calls them \"Default (soft border radius)\" and \"Rounded Full\", which is where the value names now come from. The soft radius SCALES: 4px at sm (the sheet's Small Rounded column), 8px at md and lg (as Header, Sheet and Calendar draw their 32px controls). Only lg is derived; it follows md rather than inventing a third step. This axis shipped INVERTED, with the fully-rounded shape as the default, which is why every button placed anywhere came out a pill and the soft control the design actually draws looked like an invention each time it was needed.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "Non-interactive, removed from the tab order." },
    isBusy: {
      type: "boolean",
      default: "false",
      notes:
        "Keeps focus and stays operable; sets aria-busy. Never swap this for isDisabled during submit. Shows a 16px spinner IN PLACE OF the leading icon rather than beside it, so the button keeps its width and does not shift the layout under a pointer still resting on it; the spinner is aria-hidden because aria-busy already carries the meaning, and it stops turning under prefers-reduced-motion while staying visibly different from the resting icon. DERIVED — the sheet draws no busy state; it shipped as a prop that announced to assistive tech and showed sighted users nothing, which is worse than not having it.",
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
  },

  do: [
    "Give every icon-only button an aria-label describing the action, not the glyph.",
    "Use isBusy for in-flight submits so focus survives the round trip.",
    "Pass icons as slots so usage is visible at the call site.",
    "Reach for size=\"lg\" on primary page actions — it is the only size at the 44px touch target.",
  ],

  dont: [
    "Do not use isDisabled to indicate loading; the control disappears from the tab order.",
    "Do not add pointer-events-none to a disabled control — it blocks the tooltip that explains why it is disabled, and the disabled attribute already prevents activation.",
    "Do not nest a Link inside a Button, and do not wrap a Button in an <a> — nested interactive elements are invalid HTML and double-announce to screen readers. A `render` slot for link-buttons ships with the behaviour layer; until then, a navigation styled as a button is out of scope for this component.",
    "Do not add a second filled primary to the same view; the brand fill is the one loudest thing on a screen.",
    "Do not restyle a variant with className to invent a fifth one; add it here instead.",
  ],

  a11y: {
    role: "button (native element)",
    keyboard: [
      {
        key: "Enter",
        does: "Activates. Native implicit activation, verified in a real browser (button.browser.test.tsx) — not re-implemented. Note the UA applies `:active` only instantaneously for Enter, so the press-scale is not perceptible; the focus ring is the static cue and the resulting action is the acknowledgement.",
      },
      { key: "Space", does: "Activates on release, and holds the `:active` press-scale while down." },
      { key: "Tab", does: "Moves in and out. isDisabled removes it from the sequence; isBusy does not." },
    ],
    pointer:
      "cursor: pointer is set explicitly. A <button> has no pointer cursor by default — the UA default is the arrow and Tailwind's preflight adds nothing — so omitting it silently costs the only pre-click affordance. Disabled shows not-allowed.",
    disabled:
      "Uses the native disabled attribute only; pointer-events are deliberately left alone so a tooltip can still explain why the control is unavailable. Hover and press states are gated behind `enabled:` instead.",
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
    ],
    hitArea:
      "sm is exactly 24px, the WCAG 2.5.8 floor. lg is 44px, the recommended touch target. md sits between at 32px — pair it with generous surrounding space on touch surfaces.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Every button COMPOSED in the file is fully rounded, while the stated model makes soft the default. The compositions and the model disagree, and one of them needs updating — the model is now explicit in the sheet's own legend, so the compositions are the side that is out of date.",
    "Outline is not drawn — E3V-0 has no Outline row. Its edge is derived as border-control (3.11:1) because that is the step SC 1.4.11 needs from a boundary; confirm the intent.",
    "The soft radius at lg is derived from md (8px). The sheet draws soft only at sm.",
    "No busy state is drawn; the spinner is ours.",
    "Ghost Large draws paddingInline xl where the other three large buttons draw lg. Corrected to lg in Paper — confirm.",
  ],

  motion:
    "Press feedback is scale(--ui-press-scale) with a staticTap opt-out; colour and ring transitions use --ui-duration-fast with --ui-ease-out. Scale is excluded from the transition list so the press snaps. prefers-reduced-motion collapses durations at the token layer and cancels the scale here.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0 (Style Guide → Buttons)",
} as const;

export type ButtonDoc = typeof buttonDoc;
