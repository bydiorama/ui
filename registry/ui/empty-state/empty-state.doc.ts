/**
 * Typed documentation for EmptyState.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const emptyStateDoc = {
  name: "EmptyState",
  status: "stable",
  summary:
    "The absence of content, explained: a mark on a well, a sentence saying what is missing, a second saying why, and the control that fixes it. Drawn on the sheet inside a Table's body, but it knows nothing about tables — the same block serves a filtered list, an empty inbox or a search with no results.",

  anatomy: [
    {
      part: "empty-state",
      slot: "empty-state",
      notes:
        "The outermost node. Owns className, the ref, the centred column and the 16px inset. No min-height: the draft's 133px is off the spacing scale and was its auto-layout's, not a designed value — and it never even applied, since the drafted block lays out at 160px. The container decides how tall an empty region is.",
    },
    {
      part: "prompt",
      slot: "empty-state-prompt",
      notes:
        "Mark, title and description as one 8px-gapped group, so the 16px gap to the action reads as the break between 'what happened' and 'what to do'.",
    },
    {
      part: "icon",
      slot: "empty-state-icon",
      notes:
        "The 32px sunken well. aria-hidden, and it sizes the glyph to 16 — griddy writes width=\"24\" as a presentation attribute, so an unsized slot ships 24 whatever the sheet draws (§7).",
    },
    { part: "title", slot: "empty-state-title", notes: "A <p>, not a heading. See a11y.role." },
    { part: "description", slot: "empty-state-description", notes: "The recovery, in prose." },
  ],

  composition: `
EmptyState
├─ icon?         ReactElement — a griddy glyph, unwrapped
├─ title         string (required)
├─ description?  string
└─ action?       ReactElement — a real Button, rendered as passed
  `.trim(),

  props: {
    icon: {
      type: "ReactElement",
      notes:
        "Slot: the mark. The component owns the well and the 16px sizing; the icon is never wrapped (§3). Decorative by contract — the well is aria-hidden, because anything the mark means that the sentence does not is a sentence that needs rewriting.",
    },
    title: {
      type: "string",
      required: true,
      notes:
        "What is not here, in the reader's terms. Required: a picture and no sentence is a shrug. A string rather than a slot — there is no i18n runtime here (§9) and the caller owns the words.",
    },
    description: {
      type: "string",
      notes:
        "Why it is not here, and what would change that. 'Clear the status filter to see all 24 records' beats 'No results': it names the cause and implies the fix.",
    },
    action: {
      type: "ReactElement",
      notes:
        "Slot: the recovery. A real Button from the call site, rendered exactly as handed over — so its variant, size and handler stay visible where they are written rather than being inferred from props here.",
    },
  },

  do: [
    "Say what is missing AND why. A title alone leaves the reader guessing whether they broke something.",
    "Pass a real Button as `action` so its variant and handler stay at the call site.",
    "Give the container the live region when this REPLACES content — Table does it on the cell it renders this into.",
    "Reach for Banner instead when something went wrong; an empty state describes an absence, not an error.",
  ],

  dont: [
    "Do not use it for a loading state. An empty region and one that has not arrived yet are different claims, and a reader who sees this while data is in flight is told the search failed.",
    "Do not put an icon in that carries meaning the title does not — the well is aria-hidden.",
    "Do not wrap the action to space it; the 16px gap belongs to the container (§3).",
    "Do not give it a fixed height to fill a region. Size the region.",
  ],

  a11y: {
    role:
      "A plain <div>. The title is a <p>, not a heading: the right heading level depends entirely on where this lands, and a component that guesses one breaks the outline of every page that guesses differently.",
    name: "None of its own. The title is read as the content it is.",
    keyboard: [
      { keys: "Tab", does: "Reaches the action, if one was passed. Nothing else here is interactive." },
    ],
    targetSize:
      "Nothing here is a target. The action is a Button, whose sizes all clear SC 2.5.8's 24px floor.",
    focus:
      "No focus treatment of its own — the action owns its indicator, as every control here does.",
    liveRegion:
      "None by default, deliberately. An empty state that REPLACES what the reader was looking at needs announcing and one rendered with the page does not, and only the container knows which happened. Table marks the cell it renders this into aria-live=\"polite\" for exactly that reason.",
    contrastPairs: [
      {
        fg: "--ui-text-secondary",
        bg: "--ui-bg-surface",
        floor: "text",
        role: "the title, on a table body or a panel — the surface the sheet draws it on",
      },
      {
        fg: "--ui-text-muted",
        bg: "--ui-bg-surface",
        floor: "text",
        role: "the description",
      },
      {
        fg: "--ui-text-secondary",
        bg: "--ui-bg-sunken",
        floor: "non-text",
        role: "the mark on its well. aria-hidden, but a mark nobody can see is a 32px grey square, so it is held to the graphical floor rather than waved through as decoration",
      },
      {
        fg: "--ui-bg-sunken",
        bg: "--ui-bg-surface",
        floor: "decorative",
        why: "The well behind the mark. It separates the glyph from the body and identifies nothing on its own — the title does that — so it is deliberately quiet: 1.19:1 light, 1.10:1 dark.",
      },
    ],
  },

  forwarding: {
    ref: "The outermost node. Not a form control, so the §5 default applies.",
    className: "Lands on the outermost node, so padding or a min-height can be set from outside.",
    rest: "Native div props go to the outermost node — including `role` and `aria-live`, if the container wants them here rather than on itself.",
  },

  /**
   * Open questions for design. Collected by `pnpm design:gaps`.
   *
   * The four entries this list carried until 2026-08-17 are all CLOSED, by the
   * handoff sheet at `design` below — which was drawn after the component
   * rather than before it, and settled every one of them the code's way. Their
   * resolutions are rows in that sheet's Gaps section (badge: Closed) rather
   * than lines here, because a resolved question with its reasoning attached
   * is what stops the next person re-deriving it, and this array is by
   * definition the OPEN set.
   */
  needsDesign: [
    "The page-level size is drawn (sheet § Size: title `title-sm`, description `body-sm`, prompt gap 12, block gap 24, inset 32, text max-width 384, and the 32px well and 16px glyph deliberately unchanged) and is not implemented. What the sheet does NOT settle is whether it should be a `size` prop at all: every other size axis in this library is a prop, so the sheet assumes one, but this is the first whose two sizes differ only in type and space and could equally be a `className` at the call site.",
  ],

  knownGaps: [
    "One size ships. The sheet draws two — see `needsDesign`.",
    "The title renders as a <p>. In a page-level empty state it is very likely the region's heading, and there is no `headingLevel` prop — pass one in via `aria-labelledby` on your own container, or wrap. Drawing the page size makes this more pressing, not less.",
    "No loading variant, and none is wanted. An empty state and a not-yet-arrived state are different claims and this only makes the first; Skeleton makes the second.",
    "The action is a single slot. A primary/secondary pair goes in as one element containing both buttons, which means the caller owns the gap between them.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2B7F-0",
} as const;

export type EmptyStateDoc = typeof emptyStateDoc;
