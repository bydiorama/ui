/** Typed documentation for Tabs (CONVENTIONS §11). */

export const tabsDoc = {
  name: "Tabs",
  status: "stable",
  summary:
    "A segmented control that switches which panel is shown. Roving tabindex, arrow navigation and the tab-to-panel ARIA pairing come from the Base UI behaviour layer (ADR 0012).",

  anatomy: [
    { part: "root", slot: "tabs", notes: "The wrapper. className lands here (§5)." },
    { part: "list", slot: "tabs-list", notes: "role=tablist. A bordered bg-surface strip, radius-md, p-xs." },
    { part: "tab", slot: "tabs-tab", notes: "role=tab, flex-1 so the strip divides evenly. min-h-6 for the target floor." },
    { part: "count", slot: "tabs-count", notes: "Optional number beside the label. 12px, not the sheet's 11px." },
    { part: "panel", slot: "tabs-panel", notes: "role=tabpanel, paired with its tab both ways." },
  ],

  composition: `
Tabs                     value? / defaultValue? / onValueChange?
├─ Tabs.List
│  ├─ Tabs.Tab value="…" count? isDisabled?
│  └─ …
└─ Tabs.Panel value="…"
  `.trim(),

  props: {
    value: { type: "string", notes: "Controlled selection, by tab value. Omit and Tabs owns it." },
    defaultValue: { type: "string", notes: "Uncontrolled starting tab." },
    onValueChange: { type: "(value: string) => void", notes: "Narrowed from Base UI's (value, eventDetails) and its loose value type, so no third-party shape reaches the signature." },
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
      { key: "Arrows", does: "Move FOCUS between tabs without selecting." },
      { key: "Enter / Space", does: "Selects the focused tab. Manual activation, which is the ARIA-approved pattern when a panel is expensive to render." },
      { key: "Home / End", does: "Focus the first and last tab." },
    ],
    target: "Each tab is min-h-6, clearing SC 2.5.8. The sheet's 6px vertical padding is off the spacing scale and would have produced a 20px target.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-sunken", floor: "text", role: "selected tab ink on its fill" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "unselected tab ink on the strip" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "count ink on its pill" },
      { fg: "--ui-border-subtle", bg: "--ui-bg-base", floor: "decorative", role: "the strip boundary", why: "ADR 0010 keeps a resting surface quiet; the strip separates by fill, not edge" },
    ],
  },

  knownGaps: [
    "One size, one orientation. The sheet draws a single horizontal strip; no vertical variant.",
    "No overflow handling — a strip with many tabs squeezes rather than scrolling. Not drawn.",
    "The sheet gives the count only to the selected tab; the component allows it on any, which is the more useful behaviour but is not what is drawn.",
    "No Base UI Indicator (the sliding highlight); the sheet fills the selected tab instead.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D7G-0",
} as const;

export type TabsDoc = typeof tabsDoc;
