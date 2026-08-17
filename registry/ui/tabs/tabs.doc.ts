/** Typed documentation for Tabs (CONVENTIONS §11). */

export const tabsDoc = {
  name: "Tabs",
  status: "stable",
  summary:
    "A segmented control that switches which panel is shown, in two orientations and two variants. Roving tabindex, arrow navigation and the tab-to-panel ARIA pairing come from the Base UI behaviour layer (ADR 0012) — and so does the arrow AXIS, which is why `orientation` is forwarded rather than expressed in CSS.",

  anatomy: [
    { part: "root", slot: "tabs", notes: "The wrapper. className lands here (§5)." },
    { part: "list", slot: "tabs-list", notes: "role=tablist. Carries data-orientation and data-variant. Enclosed is a bordered bg-surface track at radius-md with a 2px inset and a 32px height; ghost drops fill and edge entirely." },
    { part: "tab", slot: "tabs-tab", notes: "role=tab. min-h-6 for the target floor. Enclosed is flex-1 at radius-sm so the track divides evenly; ghost sizes to its label at radius-md, because there is no track to divide." },
    { part: "count", slot: "tabs-count", notes: "Optional number beside the label. A 16px circle — min-h as well as min-w, or one digit renders as a lozenge. 12px type, not the sheet's 11px." },
    { part: "panel", slot: "tabs-panel", notes: "role=tabpanel, paired with its tab both ways." },
  ],

  composition: `
Tabs                     value? / defaultValue? / onValueChange?
                         orientation? / variant?
├─ Tabs.List
│  ├─ Tabs.Tab value="…" count? isDisabled?
│  └─ …
└─ Tabs.Panel value="…"
  `.trim(),

  props: {
    value: { type: "string", notes: "Controlled selection, by tab value. Omit and Tabs owns it." },
    defaultValue: { type: "string", notes: "Uncontrolled starting tab." },
    onValueChange: { type: "(value: string) => void", notes: "Narrowed from Base UI's (value, eventDetails) and its loose value type, so no third-party shape reaches the signature." },
    orientation: {
      type: '"horizontal" | "vertical"',
      default: '"horizontal"',
      notes: "Forwarded to the behaviour layer, so vertical swaps the arrow keys to Up/Down and sets aria-orientation. Stacking the boxes in CSS and leaving the arrows horizontal is the usual half-implementation, and it reads as broken to anyone not using a mouse — the browser test drives Right in a vertical strip and asserts nothing moves.",
    },
    variant: {
      type: '"enclosed" | "ghost"',
      default: '"enclosed"',
      notes: "enclosed is the sheet's bordered track. ghost drops fill and edge and lets the selected tab's own fill carry it, for a strip inside a surface that already has an edge.",
    },
    "Tab.value": { type: "string", required: true, notes: "Pairs the tab with its panel." },
    "Tab.count": { type: "number", notes: "A count beside the label, as the sheet draws on the selected tab." },
    "Tab.isDisabled": { type: "boolean", default: "false", notes: "Skipped by arrow navigation and not selectable." },
  },

  do: [
    "Give every Tabs.Tab a matching Tabs.Panel with the same value; the ARIA pairing is generated from it.",
    "Keep labels short — the strip divides evenly, so one long label squeezes the rest.",
    "Use Tabs for switching views of the same subject, not for navigation between pages.",
  ],

  dont: [
    "Do not use Tabs as a router. A tab does not change the URL; a link should.",
    "Do not put more than a handful in one strip — flex-1 makes each narrower, and a crowded strip is a menu wearing a costume.",
    "Do not expect arrowing to select. Activation is MANUAL — see the keyboard table.",
  ],

  a11y: {
    role: "tablist / tab / tabpanel, from Base UI, with aria-controls and aria-labelledby paired in both directions — asserted in Chromium.",
    name: "Each tab's own text. Its panel is named by the tab through aria-labelledby.",
    keyboard: [
      { key: "Tab", does: "Enters the strip at the SELECTED tab only. Roving tabindex leaves the others at -1, so a keyboard user is not forced through every tab to reach the content — the classic hand-rolled failure." },
      { key: "Arrows", does: "Move FOCUS between tabs without selecting. Left/Right when horizontal, Up/Down when vertical — the axis follows `orientation`." },
      { key: "Enter / Space", does: "Selects the focused tab. Manual activation, which is the ARIA-approved pattern when a panel is expensive to render." },
      { key: "Home / End", does: "Focus the first and last tab." },
    ],
    target: "Each tab is min-h-6, clearing SC 2.5.8. The sheet's 6px vertical padding is off the spacing scale and would have produced a 20px target.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-selected", floor: "text", role: "selected tab ink on its fill" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "unselected tab ink on the strip" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "count ink on its pill" },
      { fg: "--ui-border-subtle", bg: "--ui-bg-base", floor: "decorative", role: "the strip boundary", why: "ADR 0010 keeps a resting surface quiet; the strip separates by fill, not edge" },
    ],
  },

  needsDesign: [
    "The 3px inset is off the spacing scale entirely (the scale starts at 4). It is what the sheet lays out and what closes \u00a76's concentric arithmetic, so it ships \u2014 but a control-scale inset the scale cannot express is a gap in the scale, not in this component.",
    "The ghost strip draws its SELECTED tab at radius-md and its unselected ones at radius-sm. Only the selected one has a fill, so the difference is invisible \u2014 shipped as radius-md for all of them. Confirm.",
    "No hover state is drawn for an unselected tab; the ink shift to secondary is derived.",
    "The vertical strip has no fixed height and no fixed width in the sheet, so it stretches to its container.",
  ],

  knownGaps: [
    "One size. The sheet draws a single scale for both orientations.",
    "No overflow handling — a strip with many tabs squeezes rather than scrolling. Not drawn.",
    "The sheet gives the count only to the selected tab; the component allows it on any, which is the more useful behaviour but is not what is drawn.",
    "No Base UI Indicator (the sliding highlight); the sheet fills the selected tab instead.",
  ],

  motion:
    "Triggers transition `background-color` and `color` at --ui-duration-fast with --ui-ease-out. There is no travelling indicator: the active tab is marked by its fill, so nothing slides between tabs, and a panel change is instant rather than a cross-fade.",

  // LHB-0, not D7G-0 — that is the Text Area artboard, and this link had been
  // pointing at it. Its geometry is extracted node-by-node into
  // design/paper/specs/tabs.geometry.json and asserted, so a wrong link here
  // now fails rather than merely misleads.
  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/LHB-0",
} as const;

export type TabsDoc = typeof tabsDoc;
