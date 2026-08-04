/** Typed documentation for Badge (CONVENTIONS §11). */

export const badgeDoc = {
  name: "Badge",
  status: "stable",
  summary: "A short status or selection label. Four variants, two sizes, pill or rounded, with an optional trailing slot.",

  anatomy: [
    { part: "root", slot: "badge", notes: "A <span>. Carries data-variant and data-size." },
    { part: "label", slot: null, notes: "children." },
    { part: "iconEnd", slot: null, notes: "Trailing mark. Pass a real <button> here when it should be actionable." },
  ],

  composition: `
Badge
├─ children   ReactNode — the label
└─ iconEnd?   ReactElement — arrow, check, or a real <button> for remove
  `.trim(),

  props: {
    variant: {
      type: '"selected" | "unselected" | "success" | "danger"',
      default: '"unselected"',
      notes: "selected is the brand fill; unselected is outlined; success and danger are tinted status labels with no border, so a row of them reads as data rather than controls.",
    },
    size: { type: '"md" | "sm"', default: '"sm"', notes: "Both 12px label; md pairs with a 16px icon, sm with 12px." },
    shape: { type: '"pill" | "rounded"', default: '"pill"' },
    iconEnd: { type: "ReactElement", notes: "Slot. A decorative mark should be aria-hidden; an interactive one must be a real button with its own accessible name." },
  },

  do: [
    "Keep the label to one or two words — a badge is a label, not a sentence.",
    "Pass a real <button aria-label=\"Remove X\"> into iconEnd for removable tags.",
    "Use success/danger for state, selected/unselected for choice; do not mix the meanings.",
  ],

  dont: [
    "Do not try to make the Badge itself interactive — onClick, onKeyDown and tabIndex are removed from the prop type, because a click handler on a <span> has no role, no focus and no keyboard path. Put the control in iconEnd, or wrap the badge in a real button.",
    "Do not use a badge as a button substitute for primary actions.",
    "Do not convey status by colour alone — the label carries the meaning (WCAG 1.4.1).",
  ],

  a11y: {
    role: "none (plain text). Deliberate: a label with no interaction should not claim one — and the prop type removes the interaction handlers so it cannot acquire one by accident.",
    keyboard: [{ key: "—", does: "Not focusable. Interactivity lives in the iconEnd slot's own control." }],
    contrast: "Measured in both schemes. Light: selected 11.4:1, unselected 5.9:1, success 5.1:1, danger 8.5:1. Dark: 11.4 / 4.9 / 5.7 / 5.9:1.",
  },

  knownGaps: [
    "No dedicated removable-tag component. The sheet draws a `×` variant; today that is composed by passing a button into iconEnd, which keeps the accessible name at the call site where it belongs.",
    "No hover or focus treatment — Badge is not interactive, so it has neither by design.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0",
} as const;

export type BadgeDoc = typeof badgeDoc;
