/** Typed documentation for Banner (CONVENTIONS §11). */

export const bannerDoc = {
  name: "Banner",
  status: "stable",
  summary:
    "An inline message attached to the surface it belongs to — not a toast, not a dialog. Five intents, an optional leading glyph and an optional dismiss control. Composes inside a Popover panel as a boxed child.",

  anatomy: [
    { part: "root", slot: "banner", notes: "A <div>. Carries data-variant. radius-md, p-lg, gap-sm." },
    { part: "icon", slot: null, notes: "Leading glyph slot. Decorative — pass it aria-hidden." },
    { part: "message", slot: "banner-message", notes: "children, as a <p>. Takes the remaining width." },
    { part: "dismiss", slot: "banner-dismiss", notes: "A real <button> with a required accessible name, in a 24px target around a 16px glyph." },
  ],

  composition: `
Banner
├─ children       ReactNode (required) — the message
├─ variant?       neutral | info | success | warning | danger
├─ icon?          ReactElement — leading glyph, never wrapped
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
    "Put a Banner inside a Popover panel as a plain child — it is boxed, so it sits flush at the panel's padding rather than taking the unboxed inset.",
  ],

  dont: [
    "Do not convey the meaning through variant colour alone — the message text must say it (WCAG 1.4.1).",
    "Do not use a Banner for something requiring acknowledgement; that is a Modal.",
    "Do not pass a bare glyph as children to make an icon-only banner — the message is the point.",
    "Do not set onDismiss without dismissLabel; it will not compile, which is the point.",
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
    ],
  },

  knownGaps: [
    "The sheet draws three variants — neutral, info and danger. success and warning are DERIVED from the existing intent roles for completeness and are not in the design; confirm with design.",
    "The sheet gives the neutral variant a leading glyph and the danger variant a dismiss control, and neither the reverse; the component allows any combination.",
    "No title/heading line, no action button inside the banner, no dark-scheme drawing — the resolver derives dark, unverified against a design.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/E2A-0",
} as const;

export type BannerDoc = typeof bannerDoc;
