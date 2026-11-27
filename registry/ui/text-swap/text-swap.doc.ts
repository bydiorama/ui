/**
 * Typed documentation for TextSwap.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const textSwapDoc = {
  lead: "Replaces a short label in place, easing its width so the words change without the layout jumping.",
  name: "TextSwap",
  status: "experimental",
  summary:
    "The second of ADR 0028's owned motion components, built on Presence. A label of a few words — Save changes becoming Saved, Follow becoming Following — is swapped in place: the old words fade out on --ui-duration-fast without moving, the new ones arrive on --ui-duration-base with Presence's rise (--ui-space-xs × --ui-motion-travel), and the box holding them eases between the two measured widths on base, so a button never snaps narrower under the pointer that pressed it. Both layers share one grid cell, left-aligned, clipped sideways only. Each label is a Presence item keyed by its text, so a word that comes back mid-swap turns around, and a label changed several times in a row retargets from wherever it is. The leaving copy is inert and aria-hidden, so a host's accessible name follows the new words from the first frame. The first render does not animate.",

  anatomy: [
    {
      part: "box",
      slot: "text-swap",
      notes:
        "One inline-grid span holding the label. Its width is measured before and after a change and transitioned between the two on --ui-duration-base, then released to auto. overflow-x is clipped so neither layer spills past it while it moves; the vertical axis stays visible, so the rise and descenders are never cut.",
    },
    {
      part: "label",
      slot: "text-swap-label",
      notes:
        "Each text the component has shown, as one Presence item (rise) keyed by its text, all in the same cell and left-aligned. Usually one; two during a swap. The leaving one is inert and aria-hidden.",
    },
  ],

  composition: `
TextSwap (children: string)
└── box — data-slot="text-swap", inline-grid, width eased between measurements
    └── Presence kind="rise"
        └── label — data-slot="text-swap-label", one per text, keyed by it

<Button onClick={save}>
  <TextSwap>{saved ? "Saved" : "Save changes"}</TextSwap>
</Button>
`,

  props: {
    children: {
      type: "string",
      notes:
        "The label. A string because its text is its identity: changing it is the swap, and the same text twice is no change. A few words on one line — a wrapping label would animate its height too, which this does not do. Rich content that changes is Presence's job.",
    },
    className: {
      type: "string",
      notes: "Lands on the box, merged last. The type comes from the host — a Button's role, a status line's — so TextSwap has no size of its own.",
    },
  },

  do: [
    "Put it inside the control whose words change — a Button's label, a status line, a tab's count text.",
    "Keep both labels short and on one line.",
    "Let the label carry the state: Saved, not a tick alone.",
  ],
  dont: [
    "Swap paragraphs or wrapping text. A changing block is new content; use Presence.",
    "Rely on it to announce a change. The words are exposed at once, but a status nobody is focused on needs the caller's own live region.",
    "Wrap a Button's busy label — Button owns its busy state, spinner and label.",
  ],

  a11y: {
    role: "None of its own: an inline span inside whatever names it.",
    name: "The host's accessible name is the CURRENT text from the first frame, because the leaving copy is aria-hidden while it fades.",
    keyboard: [],
    focus: "Never focusable. Swapping a label inside a focused button leaves focus where it is.",
    contrastPairs: [],
    rendersNoColour:
      "TextSwap sets no colour: its words take the host's ink, and it changes only opacity, translate and width, so the pairs are the host component's to declare.",
  },

  forwarding: {
    className: "Lands on the box.",
    ref: "The box span.",
    props: "Native span attributes go to the box; children is the label string.",
  },

  motion:
    "All CSS transitions on the tokens. New label: opacity from 0 and translate from --ui-space-xs × --ui-motion-travel, on --ui-duration-base with --ui-ease-out (Presence's rise). Old label: opacity to 0 on --ui-duration-fast, no movement. Box: width between the two measured widths on --ui-duration-base, released to auto once it settles; a change mid-swap retargets from the current width. Motion levels (ADR 0028): at Reduced the rise is gone (travel 0) and the cross-fade and width stay, both change in place, capped at base; at Off every duration is 1ms and the old label is still removed only after its transition ends.",

  needsDesign: [],

  knownGaps: [
    "Built from a sheet the maintainer has not reviewed yet: the width easing on base rather than fast, the left-aligned clipped layers, and the unclipped vertical axis are the sheet's own readings, badged Derived on it.",
    "Single-line labels only. A label that wraps changes height as well, and nothing eases it.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-14-0/48LP-1",
} as const;
