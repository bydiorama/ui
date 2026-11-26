/**
 * Typed documentation for IconSwap.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const iconSwapDoc = {
  lead: "Swaps one glyph for another in place, cross-fading them with a slight scale while the label carries the state.",
  name: "IconSwap",
  status: "experimental",
  summary:
    "The third of ADR 0028's owned motion components, and craft rule 10 made into a component. Every glyph is rendered once and kept, stacked in one grid cell; show names the visible one. The new glyph fades in on --ui-duration-base while growing from 0.5 to full size, the old one fades out on --ui-duration-fast while shrinking to 0.5, both on --ui-ease-out. The state is a data attribute and the motion a CSS transition, so nothing mounts or unmounts, a second change mid-swap turns both glyphs around from where they are, and the first render is still. The whole swap is aria-hidden: the host's accessible name says what happened.",

  anatomy: [
    {
      part: "box",
      slot: "icon-swap",
      notes:
        "One aria-hidden inline-grid span. It has no size of its own: it is as big as the icons in it, which the host sizes — a Button's [&_svg]:size-4 reaches through it.",
    },
    {
      part: "glyph",
      slot: "icon-swap-glyph",
      notes:
        "One span per icon, all in the same cell and centred, each with data-state shown or hidden. Hidden glyphs stay rendered at opacity 0 and the travelled scale.",
    },
  ],

  composition: `
IconSwap (icons: Record<name, element>, show: name)
└── box — data-slot="icon-swap", aria-hidden
    └── glyph × n — data-slot="icon-swap-glyph", data-state="shown | hidden"

<Button
  isIconOnly
  aria-label={copied ? "Copied" : "Copy link"}
  icon={<IconSwap icons={{ copy: <Copy />, check: <Check /> }} show={copied ? "check" : "copy"} />}
  onClick={copy}
/>
`,

  props: {
    icons: {
      type: "Record<string, ReactElement>",
      notes:
        "Every glyph the swap can show, by name. All are rendered, in key order; size them from the host, not with a size prop on each icon. Keep the record stable — a glyph added later appears without an entrance.",
    },
    show: {
      type: "keyof icons",
      notes: "The name of the glyph to show. Typed against icons, so a name that is not there does not compile. Changing it is the swap.",
    },
    className: {
      type: "string",
      notes: "Lands on the box, merged last. Colour comes from the host (currentColor), so this is rarely needed.",
    },
  },

  do: [
    "Pass it as a Button's icon slot, and change the host's accessible name with the glyph: aria-label on an icon-only Button, or the visible label beside it. A toggle that keeps its name (Mute) says its state with aria-pressed instead.",
    "Use it for a glyph that means a state: copied, playing, muted, expanded.",
    "Pair it with TextSwap when a Button changes its icon and its words together — the timings match.",
  ],
  dont: [
    "Rely on the glyph to say what happened. IconSwap is aria-hidden on purpose.",
    "Swap a decorative icon for variety. A glyph that changes is read as a state change.",
    "Put a spinner in it for a busy state — Button owns its busy spinner.",
  ],

  a11y: {
    role: "None: the box is aria-hidden, a presentation of state the host names.",
    name: "Never IconSwap's. The host's accessible name (aria-label or visible text) must change with show.",
    keyboard: [],
    focus: "Never focusable. Swapping inside a focused button leaves focus where it is.",
    contrastPairs: [],
    rendersNoColour:
      "IconSwap sets no colour: its glyphs are currentColor in the host's ink, and it changes only opacity and scale, so the pairs are the host component's to declare.",
  },

  forwarding: {
    className: "Lands on the box.",
    ref: "The box span.",
    props: "Native span attributes go to the box; aria-hidden is fixed.",
  },

  motion:
    "All CSS transitions on the tokens. New glyph: opacity 0 → 1 and scale 0.5 → 1 on --ui-duration-base with --ui-ease-out. Old glyph: opacity 1 → 0 and scale 1 → 0.5 on --ui-duration-fast. The scale is 1 − 0.5 × --ui-motion-travel. Motion levels (ADR 0028): at Reduced travel is 0, so the scale is gone and the cross-fade stays, both durations unchanged; at Off both are 1ms. No glyph is ever removed, so nothing waits for a transition to end.",

  needsDesign: [],

  knownGaps: [
    "Built from a sheet the maintainer has not reviewed yet: the 0.5 starting scale (the one number IconSwap invents) and the timing borrowed from TextSwap are badged Derived on it.",
    "MediaToggle, the site's install pill and the code stage's copy buttons still swap their glyphs by hand, with no motion.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-14-0/490N-1",
} as const;
