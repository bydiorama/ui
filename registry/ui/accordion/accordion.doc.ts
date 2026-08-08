/**
 * Typed documentation for Accordion.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const accordionDoc = {
  name: "Accordion",
  status: "stable",
  summary:
    "A list of disclosures. Compound: Item, Trigger, Panel. Single-open by default, with a card variant and a height-animated panel that can hold anything, including form controls.",

  anatomy: [
    { part: "root", slot: "accordion", notes: "The list. Owns the variant and heading level, and passes both by context so every part cannot be told twice." },
    { part: "item", slot: "accordion-item", notes: "One disclosure. The ONLY part the variant changes: card gives it a raised tile, plain gives it nothing." },
    { part: "header", slot: "accordion-header", notes: "The heading element the trigger sits inside, at headingLevel. Rendered by Trigger — it carries nothing of its own." },
    { part: "trigger", slot: "accordion-trigger", notes: "The button. Holds the icon slot, the label lane and the chevron." },
    { part: "label", slot: "accordion-label", notes: "The title lane. Clamped to one line so a long title cannot push the chevron out of the row." },
    { part: "indicator", slot: "accordion-indicator", notes: "The chevron. aria-hidden — aria-expanded already says the same thing. Rotates from the trigger's state via a group variant." },
    { part: "panel", slot: "accordion-panel", notes: "The animating element. Clips, and takes its height from the behaviour layer's measurement." },
    { part: "panel inner", slot: "accordion-panel-inner", notes: "Carries the padding. Padding on the animating element would be added to every intermediate height and the content would jump at the end." },
  ],

  composition: `
Accordion                       variant, headingLevel, value/defaultValue, isMultiple
└─ Accordion.Item               value, isDisabled
   ├─ Accordion.Trigger         icon? — renders the heading AND the button
   └─ Accordion.Panel           any content, including form controls
  `.trim(),

  props: {
    variant: {
      type: '"plain" | "card"',
      default: '"plain"',
      notes:
        "Only the ITEM differs: card adds rounded-md, bg-elevated and py-xs. Header, trigger and panel are identical in both, which is why this travels by context rather than being threaded through every part.",
    },
    headingLevel: {
      type: "2 | 3 | 4 | 5 | 6",
      default: "3",
      notes:
        "The element each trigger's heading renders as. A prop with no clever default, for the same reason Card's is: the right level depends on what surrounds the accordion and a component cannot see that. 3 is the common case, not a guess about yours.",
    },
    value: { type: "string[]", notes: "Controlled open set. An ARRAY in both modes including single, where it holds at most one value. Restated rather than re-exported — no behaviour-layer type may appear in a public signature (§9)." },
    defaultValue: { type: "string[]", notes: "Uncontrolled initial open set." },
    onValueChange: { type: "(value: string[]) => void", notes: "Fires with the full open set. The behaviour layer hands back a second event-details argument; it is deliberately not forwarded, so nothing third-party reaches a consumer's callback signature." },
    isMultiple: { type: "boolean", default: "false", notes: "Allow more than one panel open. Off is what the sheet draws and what the behaviour layer defaults to — asserted, not assumed." },
    isDisabled: { type: "boolean", default: "false", notes: "Disables the whole list. See a11y: this is aria-disabled, not the native attribute." },
    "Item.value": { type: "string", notes: "Identifies the item in value/defaultValue. Defaults to the item's index when omitted." },
    "Item.isDisabled": { type: "boolean", default: "false", notes: "Disables one row." },
    "Trigger.icon": { type: "ReactElement", notes: "Slot: the leading mark, never wrapped (§3). The sheet puts an icon here in two rows and a numbered step badge in the third. The component only reserves the 16px lane — griddy renders width/height=\"24\" as attributes, so an unsized slot would ship 24px." },
  },

  do: [
    "Set headingLevel to whatever is correct beneath the surrounding heading — the default is a common case, not a guess about your page.",
    "Put real content in the panel, including form controls; the panel is a normal container and its height follows what is inside it.",
    "Give each Item a stable value when you control the open set; the index fallback shifts if the list reorders.",
    "Use variant=\"card\" when items need to read as separate objects, plain when they are one list.",
  ],

  dont: [
    "Do not set a height on the panel; it is measured from the content and a fixed value would clip whatever does not fit.",
    "Do not use disabled: or enabled: variants on the trigger — the behaviour layer marks it aria-disabled and keeps it focusable, so those match nothing.",
    "Do not put padding on the panel itself; it belongs on the inner container, or every intermediate height gains it and the content jumps.",
    "Do not rely on arrow keys to move between headers — they are not implemented. See knownGaps.",
  ],

  a11y: {
    role: "A heading per row containing a button, each controlling its panel (the APG accordion pattern).",
    keyboard: [
      { key: "Tab", does: "Moves to the next trigger, and into an open panel's own controls." },
      { key: "Enter", does: "Toggles the panel. Native — the trigger is a real button." },
      { key: "Space", does: "Toggles the panel." },
      { key: "Arrow keys", does: "NOTHING. Optional in the APG pattern and not implemented by the behaviour layer — see knownGaps." },
    ],
    labelling:
      "Each trigger sits inside a real heading at headingLevel, so the list is navigable by heading. aria-expanded reports the row's state, aria-controls points at the panel and the panel points back with aria-labelledby — asserted in both directions.",
    disabled:
      "isDisabled sets aria-disabled and KEEPS the trigger focusable (tabindex 0) rather than using the native attribute. That is deliberate: a control removed from the tab order cannot tell anyone why it is unavailable. Styling therefore hangs off aria-disabled variants.",
    landmarks:
      "Each panel is a role=region LANDMARK labelled by its trigger, which the behaviour layer applies unconditionally. Two panels whose triggers READ THE SAME therefore produce two landmarks with the same accessible name, and axe fails that as landmark-unique. It is a COMPOSITION rule the component cannot enforce — it cannot see the rest of your page — and it bit this component's own Matrix story, which rendered three copies of one FAQ. Keep trigger text distinct across every accordion on a page. The APG also warns against landmark proliferation for long accordions; see knownGaps.",
    indicator:
      "The chevron is aria-hidden. It repeats what aria-expanded already says, and motion is never the only channel — the panel's presence is the static cue.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "a trigger label on the plain variant" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "a trigger label on a card" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "panel copy on the plain variant" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "panel copy on a card" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "non-text", role: "the chevron on a card" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the keyboard focus ring" },
      {
        fg: "--ui-text-disabled",
        bg: "--ui-bg-elevated",
        floor: "decorative",
        why: "WCAG 1.4.3 exempts disabled controls, and a disabled row has to READ as unavailable — holding it to 4.5:1 would make it indistinguishable from an available one, which is the real failure.",
      },
    ],
  },

  forwarding: {
    ref: "Item forwards to the item element, Trigger to the button, Panel to the animating element. Trigger's ref reaches the BUTTON rather than the heading, because the button is the thing a caller wants to focus or measure.",
    className: "Each part takes its own className. Panel's lands on the INNER container, not the animating element, so a consumer restyling the content cannot accidentally break the height transition.",
    rest: "Not spread. The parts take an explicit prop list rather than passing native props through, which keeps behaviour-layer props from being reachable by accident.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No hover, focus or disabled state is drawn for the trigger. Hover is derived as --ui-bg-hover on the trigger's own rounded-sm box, focus as the standard ring, disabled as --ui-text-disabled. Confirm.",
    "The sheet's leading icon frame carries a raw 8px gap and an 8px radius, both off the token layer and both inert (it holds one 16px glyph and nothing to round). Harmless as drawn, but it means the frame is not the icon lane it appears to be.",
    "The numbered step badge in the Rich Content row is drawn as a 20px --ui-bg-sunken circle and exists nowhere else in the system. It is passed through the icon slot here, so it is the caller's element — if numbered steps recur it wants a name of its own rather than being rebuilt per call site.",
    "No divider between items in the plain variant, and no drawn state for the last item's bottom edge. At gap-xs the rows read as one block; confirm that is intended rather than a missing rule.",
  ],

  knownGaps: [
    "NO ARROW-KEY NAVIGATION between headers. `loopFocus` is accepted as a prop by the behaviour layer but no key handler exists — confirmed in its source and then in the browser. Arrow keys are OPTIONAL in the APG accordion pattern so this conforms, and Tab does move between triggers. It is pinned by a test so it is not rediscovered as a bug.",
    "A closed panel is not mounted at all, so its content is invisible to find-in-page and to a consumer querying the DOM. The behaviour layer offers hiddenUntilFound and keepMounted for exactly this; neither is exposed yet because neither is drawn, and hiddenUntilFound changes what find-in-page does on the page.",
    "The panel animates height only. Content that reflows while open — an image loading, a textarea being dragged — will not re-measure, because the measurement is taken at the transition.",
    "No horizontal orientation. The behaviour layer supports it; nothing draws it.",
    "Every panel is a role=region landmark, applied by the behaviour layer and not currently suppressible through this wrapper. The APG advises AGAINST the region role once panels are numerous, precisely because it proliferates landmarks — a 12-row FAQ adds 12 of them to the page's landmark list. Two consequences worth knowing before that becomes a problem: duplicate trigger text across a page fails axe's landmark-unique (see a11y.landmarks), and there is no opt-out here yet because none is drawn and removing a role the behaviour layer sets deliberately is not a change to make casually.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/EV6-0",
} as const;

export type AccordionDoc = typeof accordionDoc;
