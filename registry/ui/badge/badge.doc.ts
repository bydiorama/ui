/** Typed documentation for Badge (CONVENTIONS §11). */

export const badgeDoc = {
  name: "Badge",
  status: "stable",
  summary: "A short status or selection label. Six variants, two sizes, pill or rounded, with an optional trailing slot.",

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
      type: '"selected" | "unselected" | "neutral" | "success" | "warning" | "danger"',
      default: '"unselected"',
      notes:
        "selected is the brand fill; unselected is outlined; neutral, success, warning and danger are tinted labels with no border, so a row of them reads as data rather than controls. NEUTRAL is for status data with no intent — an industry, a type, a plan tier — which is the commonest badge in an admin table and had no answer before: `unselected` is a choice state wearing an outline, and tinting a category green teaches nothing when the value never varies. Same two roles as Banner's own neutral (§2 — one vocabulary per concept).",
    },
    size: {
      type: '"md" | "sm"',
      default: '"sm"',
      notes:
        "22px and 28px tall. Both carry the same 12px label and the same padding — the difference is height alone, pinned with min-h because the spacing scale cannot express 28 (py-xs gives 22, py-sm 30). md pairs with a 16px icon, sm with 12px. These two were previously identical apart from the icon, so a badge with no icon rendered the same at either size.",
    },
    shape: { type: '"soft" | "full"', default: '"full"', notes: "One vocabulary with Button (\u00a72). `full` is rounded-full; `soft` is the component's own smaller radius \u2014 radius-sm here, Button's per-size soft radius there. Was `pill`/`rounded`, which named the same two shapes differently from the only other component that has them." },
    iconEnd: { type: "ReactElement", notes: "Slot. A decorative mark should be aria-hidden; an interactive one must be a real button with its own accessible name." },
  },

  do: [
    "Keep the label to one or two words — a badge is a label, not a sentence.",
    "Pass a real <button aria-label=\"Remove X\"> into iconEnd for removable tags.",
    "Use success/warning/danger for state, neutral for categorical data with no state, selected/unselected for choice; do not mix the meanings.",
  ],

  dont: [
    "Do not try to make the Badge itself interactive — onClick, onKeyDown and tabIndex are removed from the prop type, because a click handler on a <span> has no role, no focus and no keyboard path. Put the control in iconEnd, or wrap the badge in a real button.",
    "Do not use a badge as a button substitute for primary actions.",
    "Do not convey status by colour alone — the label carries the meaning (WCAG 1.4.1).",
    "Do not colour a category that never varies. An industry badge that is always blue teaches nothing — that is what `neutral` is for. The sheet's own don't-list, verbatim.",
  ],

  a11y: {
    role: "none (plain text). Deliberate: a label with no interaction should not claim one — and the prop type removes the interaction handlers so it cannot acquire one by accident.",
    keyboard: [{ key: "—", does: "Not focusable. Interactivity lives in the iconEnd slot's own control." }],
    contrastPairs: [
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "text", role: "selected badge ink" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "unselected badge ink" },
      { fg: "--ui-text-muted", bg: "--ui-bg-sunken", floor: "text", role: "neutral badge — the same pair Banner's neutral variant declares" },
      { fg: "--ui-intent-success-fg", bg: "--ui-intent-success-bg", floor: "text", role: "success badge" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-intent-warning-bg", floor: "text", role: "warning badge" },
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "danger badge" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "`neutral`'s fill is `--ui-bg-sunken`, matching Banner. The sheet drew `--ui-bg-active`, which is an interaction role — a resting badge would be the exact colour of a pressed table row — so the role was corrected and the WEIGHT is the open question. Measured against a table row (`bg-surface`), sunken is 1.188:1 in light and 1.098:1 in DARK, where the tinted status variants sit at 1.201 and 1.629. A neutral chip in dark is therefore much quieter than a success one, and the badge reads mostly from its label. Three ways out, all a design call: keep it, deepen the dark `sunken` step, or mint the neutral member of the intent family (`--ui-intent-neutral-bg`/`-fg`) that Avatar's status dot also had to work around.",
  ],

  knownGaps: [
    "No dedicated removable-tag component. The sheet draws a `×` variant; today that is composed by passing a button into iconEnd, which keeps the accessible name at the call site where it belongs.",
    "No hover or focus treatment — Badge is not interactive, so it has neither by design.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0",
} as const;

export type BadgeDoc = typeof badgeDoc;
