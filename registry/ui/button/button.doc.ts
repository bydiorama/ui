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
    "The primary action control. Four variants, three sizes, two shapes, plus icon-only and full-width forms.",

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
      type: '"primary" | "secondary" | "ghost" | "danger"',
      default: '"primary"',
      notes:
        "primary is the brand-blue filled action; secondary is the quiet outlined one; ghost has no chrome until hover; danger is the subtle red surface, not a solid red fill.",
    },
    size: {
      type: '"lg" | "md" | "sm"',
      default: '"md"',
      notes: "44 / 32 / 24px tall. lg is the touch target for primary page actions.",
    },
    shape: {
      type: '"pill" | "rounded"',
      default: '"pill"',
      notes: "The design draws rounded only at sm, but the axis is orthogonal to size.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "Non-interactive, removed from the tab order." },
    isBusy: {
      type: "boolean",
      default: "false",
      notes:
        "Keeps focus and stays operable; sets aria-busy. Never swap this for isDisabled during submit. KNOWN GAP: no visual treatment yet — the busy state is unmistakable to assistive tech and invisible to sighted users, which inverts the usual failure. Blocked on the states design sheet; do not invent a spinner ahead of it.",
    },
    isFullWidth: { type: "boolean", default: "false" },
    isIconOnly: {
      type: "boolean",
      default: "false",
      notes: "Requires aria-label — enforced by the prop types, not by review.",
    },
    staticTap: { type: "boolean", default: "false", notes: "Opts out of the press-scale feedback." },
    icon: { type: "ReactElement", notes: "Slot. Icons come from griddy-icons only." },
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
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "danger label" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
    ],
    hitArea:
      "sm is exactly 24px, the WCAG 2.5.8 floor. lg is 44px, the recommended touch target. md sits between at 32px — pair it with generous surrounding space on touch surfaces.",
  },

  motion:
    "Press feedback is scale(--ui-press-scale) with a staticTap opt-out; colour and ring transitions use --ui-duration-fast with --ui-ease-out. Scale is excluded from the transition list so the press snaps. prefers-reduced-motion collapses durations at the token layer and cancels the scale here.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0 (Style Guide → Buttons)",
} as const;

export type ButtonDoc = typeof buttonDoc;
