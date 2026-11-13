/** Typed documentation for Banner (CONVENTIONS §11). */

export const bannerDoc = {
  lead: "Puts a message and its next action where they can be seen together.",
  name: "Banner",
  status: "stable",
  summary:
    "An inline message attached to the surface it belongs to — not a toast, not a dialog. Five intents, an optional leading glyph, title, action (Banner.Action, which takes the banner's role) and dismiss control. Composes inside a Popover panel as a boxed child.",

  anatomy: [
    { part: "root", slot: "banner", notes: "A <div>. Carries data-variant. radius-md, p-lg, gap-sm." },
    { part: "icon", slot: null, notes: "Leading glyph slot. Decorative — pass it aria-hidden." },
    { part: "text", slot: "banner-text", notes: "Present only with a title or an action: the column holding title and message, gap-xs." },
    { part: "title", slot: "banner-title", notes: "title, as a <p> at label-md in the intent ink — not a heading: a banner is an annotation, not a section of the document outline." },
    { part: "message", slot: "banner-message", notes: "children, as a <p>. Takes the remaining width." },
    { part: "action", slot: "banner-action", notes: "Banner.Action — a Button md that takes the banner's role: primary on info, a 1.5px outline in the banner's own ink on every other intent. Centred on the block; under the message, in the text column, when the banner is narrower than 480px." },
    { part: "dismiss", slot: "banner-dismiss", notes: "A real <button> with a required accessible name, in a 24px target around a 16px glyph." },
  ],

  composition: `
Banner
├─ children       ReactNode (required) — the message
├─ variant?       neutral | info | success | warning | danger
├─ icon?          ReactElement — leading glyph, never wrapped
├─ title?         ReactNode — a label-md line above the message
├─ action?        <Banner.Action onClick | render>Label</Banner.Action>
├─ isLive?        announce on appearance
└─ onDismiss? + dismissLabel?   — the two travel together at the type level
  `.trim(),

  props: {
    children: { type: "ReactNode", required: true, notes: "A slot rather than a string so the message can carry a link." },
    variant: {
      type: '"neutral" | "info" | "success" | "warning" | "danger"',
      default: '"neutral"',
      notes: "Intent ROLES, never palette steps — the sheet drew --ui-blue-90 and --ui-red-40 directly, which do not re-skin with a brand.",
    },
    icon: { type: "ReactElement", notes: "Leading glyph. Decorative: the message carries the meaning, so never rely on the glyph or the colour alone (WCAG 1.4.1). The component sizes the slot at 16px, the size the sheet draws at every control size. Without that the glyph arrives at whatever the icon library defaults to — griddy hard-codes width/height=\"24\" as attributes — which rendered every icon 50% oversize." },
    title: {
      type: "ReactNode",
      notes: "A line above the message, label-md 13/600 in the intent ink. A <p>, not a heading — a heading would put an annotation into the page outline between the headings around it. With a title the row aligns to the top and the glyph sits on the title's line; without one the banner is the single centred row it always was.",
    },
    action: {
      type: "ReactElement",
      notes: "Slot, never wrapped. Fill it with Banner.Action, which takes the banner's ROLE (owner's redesign, 2026-11-02): Button primary on info; a 1.5px outline in the banner's own ink on neutral, success and warning (4.87 / 5.05 / 5.03:1 light, 7.11 / 5.68 / 4.92:1 dark); and on danger the same outline in --ui-text-on-danger-subtle (8.52 / 5.93:1), the ink Button danger uses. Hover and press are a 10% / 15% tint of that ink. A filled accent on every intent was the first proposal and measured 1.22-1.26:1 against the tinted grounds in light. In a container under 480px the action moves under the message, into the text column; the dismiss stays top-right. Banner.Action is always md (32px) and takes Button's other props, including render={<a href />} for a link.",
    },
    isLive: {
      type: "boolean",
      default: "false",
      notes: "Adds role=status + aria-live=polite. OFF by default on purpose: a banner rendered with the page is not news, and a live region that fires on mount talks over whatever the user was reading. Turn it on when the banner appears in response to something.",
    },
    onDismiss: { type: "() => void", notes: "Renders the dismiss button. Requires dismissLabel at the type level." },
    dismissLabel: { type: "string", notes: "The button's accessible name — 'Dismiss export notice', not 'Close'. Cannot be omitted when onDismiss is set; the type is a discriminated union." },
  },

  do: [
    "Write a dismissLabel that names what is being dismissed, since it is read out of context.",
    "Use isLive for a banner that appears after an action, and leave it off for one rendered with the page.",
    "Fill the action slot with Banner.Action so its emphasis follows the banner's role — one action, a verb (\"Review layouts\"), never a second CTA.",
    "Put a Banner inside a Popover panel as a plain child — it is boxed, so it sits flush at the panel's padding rather than taking the unboxed inset.",
  ],

  dont: [
    "Do not convey the meaning through variant colour alone — the message text must say it (WCAG 1.4.1).",
    "Do not use a Banner for something requiring acknowledgement; that is a Modal.",
    "Do not pass a bare glyph as children to make an icon-only banner — the message is the point.",
    "Do not set onDismiss without dismissLabel; it will not compile, which is the point.",
    "Do not pass a plain <Button variant=\"primary\"> as the action on a tinted banner — its fill measures 1.22-1.26:1 against the tint. Banner.Action picks the right treatment per role.",
  ],

  a11y: {
    role: "none by default — a static banner is part of the page, not an announcement. role=status + aria-live=polite only when isLive is set.",
    name: "The message itself. The dismiss button carries its own required aria-label.",
    keyboard: [
      { key: "Tab", does: "Reaches the dismiss button when present; the banner itself is not focusable." },
      { key: "Enter / Space", does: "Activates dismiss — it is a real <button>, so this is native." },
    ],
    target: "The dismiss control is a 24px box around a 16px glyph, clearing SC 2.5.8; the glyph alone would be a 16px target.",
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-sunken", floor: "text", role: "neutral banner ink" },
      { fg: "--ui-intent-info-fg", bg: "--ui-intent-info-bg", floor: "text", role: "info banner ink" },
      { fg: "--ui-intent-success-fg", bg: "--ui-intent-success-bg", floor: "text", role: "success banner ink" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-intent-warning-bg", floor: "text", role: "warning banner ink" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-intent-danger-bg", floor: "text", role: "danger banner ink" },
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "danger banner action — label and 1.5px ring (Button danger's own ink)" },
    ],
  },

  knownGaps: [
    "The sheet draws three variants — neutral, info and danger. success and warning are DERIVED from the existing intent roles for completeness and are not in the design; confirm with design.",
    "The sheet gives the neutral variant a leading glyph and the danger variant a dismiss control, and neither the reverse; the component allows any combination.",
    "Title and action are CLOSED (2026-11-02, #9): drawn on the #9 Proposals sheet in every intent, narrow and dark, with the action's treatment set by the owner's Audit #9 redesign. Neutral and success actions were not drawn by the owner and follow the same rule (an outline in the banner's ink).",
    "Banner.Action knows the narrow placement; a caller who puts some other element in the action slot gets the wide layout only (it does not carry the container-query classes).",
  ],

  motion:
    "Only the dismiss control moves — a colour transition at --ui-duration-fast with --ui-ease-out. The banner itself has no enter or exit animation: it is placed inline by the page rather than portalled, so its appearance is a layout change the consumer owns and can animate in context. This is the one component using Tailwind's `transition-colors` group where the rest of the library enumerates properties; the group is a fixed set rather than `all`, so it is legal, but it names more properties than actually change here.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/E2A-0",
} as const;

export type BannerDoc = typeof bannerDoc;
