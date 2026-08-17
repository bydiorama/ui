/** Typed documentation for Tooltip (CONVENTIONS §11). */

export const tooltipDoc = {
  name: "Tooltip",
  status: "stable",
  summary:
    "A short label that appears on hover or focus and names a control that cannot name itself. The smallest surface in the library and the only one that is never interactive: a pointer leaving the trigger dismisses it, so anything inside it that had to be reached could not be. An opaque --ui-bg-emphasis chip rather than an elevated panel, because a tooltip and a Popover are told apart by their fill before anything else about them registers.",

  anatomy: [
    {
      part: "provider",
      slot: "—",
      notes:
        "Renders nothing. Shares one delay group across a subtree, so a neighbour opens instantly for 300ms after the last one closed — the difference between a readable toolbar and eight separate 600ms waits. Optional, and the first thing in this library a consumer can forget with nothing failing.",
    },
    {
      part: "trigger",
      slot: "tooltip-trigger",
      notes:
        "The caller's own control, passed as `render` and never wrapped (§3). It keeps its element, its ref and its accessible name and gains the ARIA wiring, the delays and a data-slot. `render` is required — see props.",
    },
    {
      part: "chip",
      slot: "tooltip",
      notes:
        "The floating label. role=\"tooltip\", an id, --ui-bg-emphasis, radius-md, 8/4 padding, --ui-shadow-sm, no border. Portalled, so it is never inside the trigger's subtree.",
    },
    {
      part: "text",
      slot: "tooltip-text",
      notes:
        "Carries the 256px measure. Deliberately a separate element: `max-w-64` and `max-w-(--available-width)` in one class list is one declaration and tailwind-merge keeps only the last, which is how Modal's viewport cap never once applied.",
    },
  ],

  composition: `
Tooltip.Provider          — once, at the app root. Renders nothing.
└─ Tooltip                — one per trigger
   ├─ isOpen?             controlled
   ├─ defaultIsOpen?      uncontrolled
   ├─ onOpenChange?       (isOpen: boolean) => void
   ├─ isDisabled?         stops it opening, without touching the trigger
   ├─ Tooltip.Trigger
   │  └─ render           ReactElement (required) — the control being explained
   └─ Tooltip.Content
      ├─ side?            "top" (default) | "right" | "bottom" | "left"
      ├─ align?           "center" (default) | "start" | "end"
      ├─ sideOffset?      8
      ├─ alignOffset?     0
      ├─ container?       the themed element to portal into
      └─ children         the label — a phrase, not a paragraph
  `.trim(),

  props: {
    render: {
      type: "ReactElement",
      required: true,
      notes:
        "The control being explained, on Tooltip.Trigger. Required, and it is the one prop here that is not negotiable: a tooltip describes something that already exists, so a trigger that is not already a control is a contradiction. Without it the behaviour layer renders a bare <button>, which is how a library ends up shipping a second unstyled control nobody chose.",
    },
    isDisabled: {
      type: "boolean",
      notes:
        "Stops the tooltip opening and leaves the trigger completely alone — still enabled, still focusable. For a control whose label is visible at some breakpoints and not others.",
    },
    side: {
      type: '"top" | "right" | "bottom" | "left"',
      notes:
        "A preference, not a promise: the behaviour layer flips it when the chip would leave the viewport. Default is top, because a tooltip below a control in a form covers the next field. Our own vocabulary rather than Base UI's, so no third-party type reaches a public signature (check:boundaries).",
    },
    sideOffset: {
      type: "number",
      notes:
        "8 by default — space-sm, the same number Popover uses, alongside 8 of collision padding. Near enough to read as attached, far enough never to cover the thing it describes.",
    },
    container: {
      type: "HTMLElement | null",
      notes:
        "Where to portal the chip. Theme tokens are inherited custom properties, so a chip portalled to document.body leaves a brand scope on a wrapper and paints theme zero. Pass the themed element to bring it back.",
    },
  },

  do: [
    "Put a Tooltip.Provider at the app root. Without it every tooltip waits on its own and a toolbar becomes a series of 600ms pauses.",
    "Use it for the name of an icon-only control, why a control is unavailable, or a value that is truncated in place.",
    "Keep it to a phrase. The measure is 256px, about eight words a line, and a tooltip that needs two lines is usually a Popover.",
    "Give a disabled control's explanation somewhere reachable as well — see knownGaps.",
  ],

  dont: [
    "Do not put anything interactive inside — a link, a button, a dismiss. The pointer leaving the trigger closes it, so nothing in it can be reached.",
    "Do not put information the reader NEEDS in one. It is unreachable on touch, invisible to anyone not pointing at it, and gone the moment attention moves.",
    "Do not use one for validation. An error has to stay visible while the field is being fixed; that is Input's errorText.",
    "Do not use one for a paragraph. That is a Popover, which can be reached, scrolled and dismissed.",
  ],

  a11y: {
    role:
      'role="tooltip" on the chip, and aria-describedby on the trigger pointing at it. BOTH ARE SET BY THIS COMPONENT, not by the behaviour layer: measured against @base-ui/react@1.7.0, an open popup carries data-open, data-side, data-align and a tabindex and no role, and the trigger gets an id and data-popup-open and no aria-describedby. A tooltip built on the primitive alone is decoration — visible to a pointer and absent to a screen reader.',
    name:
      "None of its own. It DESCRIBES the trigger; the trigger keeps whatever accessible name it already had, which is why an icon-only Button still needs its aria-label.",
    keyboard: [
      { keys: "Tab", does: "Focuses the trigger and opens the tooltip immediately — no delay, because a Tab press is never accidental." },
      { keys: "Escape", does: "Closes it. Focus does not move, because the tooltip never took it." },
      { keys: "Tab (again)", does: "Moves on and closes it. There is nothing inside to reach." },
    ],
    targetSize:
      "Nothing here is a target. The chip is 24px tall at minimum, which is a legibility floor rather than a hit area — it cannot be aimed at.",
    focus:
      "It has no focus treatment and takes no focus. The trigger keeps its own indicator, unchanged.",
    liveRegion:
      "None. aria-describedby is what carries it, which is read when the trigger takes focus rather than announced on arrival — correct for a description of the thing you are standing on.",
    contrastPairs: [
      {
        fg: "--ui-text-on-emphasis",
        bg: "--ui-bg-emphasis",
        floor: "text",
        role: "the label on its chip. 17.17:1 light and 7.34:1 dark against a fill that does not move between the schemes — see needsDesign",
      },
      {
        fg: "--ui-bg-emphasis",
        bg: "--ui-bg-base",
        floor: "decorative",
        why: "The chip against the page. 17.17:1 in light and 1.62:1 in DARK, because --ui-bg-emphasis does not move between the schemes and --ui-bg-base does — the same fact that makes this surface unmistakable in light makes it quiet in dark. Declared decorative rather than raised, because SC 1.4.11 covers controls and graphical objects needed to understand content, and a tooltip is neither: it is a text container, nothing about it is operable, and the thing that has to be perceivable is the label, which measures 7.34:1. The boundary is carried by the fill step plus --ui-shadow-sm. It is a real design question all the same and it is in needsDesign, because the argument the sheet makes for this fill is an argument about LIGHT.",
      },
    ],
  },

  forwarding: {
    ref: "Not forwarded. Every part is a Base UI element with its own ref discipline, and the chip is portalled — a ref to it would hand out a node that unmounts on close.",
    className:
      "Lands on the chip (Tooltip.Content) and on the trigger wrapper (Tooltip.Trigger). The trigger's own className is the caller's and is untouched.",
    rest: "Native div props go to the chip.",
  },

  motion:
    "The chip transitions `opacity` and `scale` from 0.98 about --transform-origin, at --ui-duration-fast with --ui-ease-out — the micro recipe, the same pair Popover animates. `scale` is named in the transition list rather than `transform`, because Tailwind v4 writes it as a standalone property and a list naming `transform` covers none of it; the browser test asserts it through getAnimations(), which is the only thing that can tell the working version from the broken one. The DELAYS are not motion and do not collapse under prefers-reduced-motion: 600ms of hover intent before it opens, 0 to close, and a 300ms window in which a neighbour opens instantly. They live in @/lib/motion as numbers rather than as --ui-duration-* tokens, because a delay is consumed by a JavaScript prop and a CSS custom property cannot be read by one.",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "--ui-text-on-emphasis resolves #FFFFFF in light and #a9a9ae in dark while --ui-bg-emphasis is #1D1B19 in both, so the identical chip carries 17.17:1 and then 7.34:1. It passes either way, and it is still an ink moving against a fill that did not. --ui-tool-active-ink aliases the same token and takes the same drop on the nav rail's active tool: one question asked by two components.",
    "The sheet draws a tooltip opening over a DISABLED trigger, and it cannot. A disabled form control receives no pointer events in Chromium and is out of the tab order, so both paths are closed — see knownGaps for what a caller has to do instead. The sheet's row needs redrawing around a wrapper, or the case needs dropping.",
    "The sheet's case for an emphasis chip is an argument about LIGHT, and the numbers do not carry into dark. Measured: the chip is 17.17:1 against the page in light and 1.62:1 in dark, and against a Menu panel — the surface it exists to be told apart from — 1.24:1 there. It still reads, by size, shape, type and ink, and the fill is doing much less of the work than § The surface claims. The honest options are a hairline that appears only in dark, a dark-scheme value for --ui-bg-emphasis, or accepting that the shape carries it; none of them should be picked by an implementer.",
    "The skip window is 300ms, against Base UI's own default of 400. Tighter suits a row of icon buttons read left to right, and nothing has measured which is better with a real user.",
    "No arrow, and no sheet has ever drawn one for Popover or Menu either. Confirm that this is the system's position rather than three components independently not getting round to it.",
  ],

  knownGaps: [
    "A disabled control cannot show one. `disabled` suppresses mouse events and removes the element from the tab order, so the explanation has to hang off something else: wrap the control in a focusable span you own and put the trigger on that, or say why it is unavailable in the surrounding copy. This is the platform's behaviour, not a decision made here, and it is the reason craft rule 16 stops at 'do not ADD pointer-events: none' — the attribute has already taken what the rule is protecting.",
    "The open delay is not adjustable. Every tooltip in the library waits the same 600ms, and a caller who genuinely wants an instant one has no prop for it. Deliberate for now: timing belongs to @/lib/motion, and the first real need is what should open the question.",
    "Provider is optional and its absence is silent. A subtree without one still works — every tooltip simply waits independently — so nothing fails and a toolbar just feels slow.",
    "No `keepMounted`. The chip leaves the DOM when closed, so a caller cannot animate it from outside or measure it while hidden.",
    "The trigger's own `data-slot` is REPLACED, not added to. A part composed through `render` produces one element and `data-slot=\"tooltip-trigger\"` wins, so `<Tooltip.Trigger render={<Button/>} />` is no longer selectable as `[data-slot=\"button\"]`. True of every render slot in this library (Popover.Trigger, Modal.Trigger, Sheet.Close), and it is the quiet kind of breakage: a consumer selector written against the wrapped part matches nothing, which reads as the component not having rendered.",
    "Only ONE tooltip is open at a time, across the whole document — the behaviour layer keeps a single open surface. Two `defaultIsOpen` tooltips render one chip, which is invisible in the source and cost a visual baseline that photographed a button with an empty gap beneath it.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2AV2-0",
} as const;

export type TooltipDoc = typeof tooltipDoc;
