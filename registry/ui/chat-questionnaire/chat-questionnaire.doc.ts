/** Typed documentation for ChatQuestionnaire (CONVENTIONS §11). */

export const chatQuestionnaireDoc = {
  name: "ChatQuestionnaire",
  status: "stable",
  summary:
    "The agent asking, inside the thread: a question line followed by tappable options — text rows or image tiles. Single-select answers on tap; multi-select collects and confirms. Once answered it collapses to a receipt — the question stays, the chosen answer becomes a selected Badge, and the rest of the options leave the thread. It has NO container, no fill and no action bar, which is why it is not a ChatWidget payload.",

  anatomy: [
    { part: "root", slot: "chat-questionnaire", notes: "A column at gap-md, on the receiver's own ground. Carries data-mode, data-variant and data-answered." },
    { part: "question", slot: "chat-questionnaire-question", notes: "body-md 500 in text-ink-primary while open; body-sm in text-ink-muted once answered, because by then it is context rather than a question." },
    { part: "options", slot: "chat-questionnaire-options", notes: "role=\"group\", named by the question. A 400px-capped column of rows, or a four-across grid of tiles — options read as controls, and a 640-wide row of one sentence reads as prose." },
    { part: "option", slot: "chat-questionnaire-option", notes: "A row: bg-base, radius-md, a 1.5px edge, px-md py-sm, body-sm 500. Chosen means border-edge-focus plus a check in the same blue and the fill UNCHANGED — Card Sorting's active card, verbatim." },
    { part: "tile", slot: "chat-questionnaire-tile", notes: "The library's AspectRatio at ratio=square over bg-media-floor, with its caption beneath — not a hand-rolled aspect box, so the frame clips, sizes its image from the outside and keeps a well behind it without the call site remembering to. Selection is a 2px outline on the TILE, outside the frame, so the photograph keeps its own edge; a 20px accent check badge sits in the corner." },
    { part: "check", slot: "chat-questionnaire-check", notes: "The chosen mark: 14px in border-focus on a row, a filled accent badge on a tile. The second channel beside the edge (SC 1.4.1)." },
    { part: "confirm", slot: "chat-questionnaire-confirm", notes: "Multi-select only: Button primary·md carrying the count, and an optional ghost·md Skip. Disabled while nothing is picked." },
    { part: "answer", slot: "chat-questionnaire-answer", notes: "The receipt's Badge, selected. The filled accent is reserved for exactly three things — Send, Confirm and this." },
  ],

  composition: `
ChatQuestionnaire  question! options! mode? variant?
                   value? defaultValue? onValueChange? onSubmitAction?
                   confirmLabel? skipLabel? onSkipAction?     — multi-select
                   answer?                                    — collapses to the receipt

options (list):    [{ id, label, isHandoff? }]
options (tiles):   [{ id, label, src, alt }]
  `.trim(),

  props: {
    mode: {
      type: '"single" | "multiple"',
      default: '"single"',
      notes: "Single COMMITS on tap — the sheet's own rule, and the reason a single-select question has no Confirm to press afterwards. Multiple toggles and waits for Confirm.",
    },
    variant: {
      type: '"list" | "tiles"',
      default: '"list"',
      notes: "A discriminated union with `options`: a tile is a picture and `alt` is not optional on a picture. Both pickers use one selection language, which is the point of the pair.",
    },
    value: { type: "string[]", notes: "Chosen option ids, always an array — including single-select, where it holds one. Two shapes for one concept is how a caller writes a branch it does not need. Uncontrolled through defaultValue." },
    onSubmitAction: { type: "(value: string[]) => void", notes: "The answer is FINAL: called on tap in single mode and on Confirm in multiple. Distinct from onValueChange, which fires on every toggle." },
    confirmLabel: { type: "string", notes: "Multi-select only, and the place to put the count — the sheet draws \"Confirm — 2 picked\". The component does not compose that string: pluralisation is language, and every user-visible string is a prop (§9)." },
    "options[].isHandoff": { type: "boolean", notes: "The sheet's \"Other — tell me in your own words…\". It does NOT answer the question — it calls onSubmitAction with its own id so the caller can move the cursor to the composer, and nothing is selected. It reads in muted ink because it is not one of the answers." },
    answer: { type: "string", notes: "Collapses to the receipt. The question stays: an answer with no question is a fragment, and a thread is read from the top." },
  },

  do: [
    "Put the count in `confirmLabel` — the sheet draws it, and the component cannot pluralise for you.",
    "Pass `answer` once the question is settled rather than unmounting the widget; the receipt is what keeps the thread readable on a second pass.",
    "Give the handoff option `isHandoff` rather than treating it as an answer, so it is not selected and is not counted.",
    "Keep every tile's `alt` about the PICTURE. The caption under it already carries the label.",
  ],

  dont: [
    "Do not fill the chosen option. The accent is reserved for Send, Confirm and the answered Badge; an option that fills is as loud as the button that commits it, and it collides with hover.",
    "Do not add a Confirm to single-select. The tap IS the commit, and a second step for a one-tap answer is the thing this pattern exists to avoid.",
    "Do not mix rows and tiles in one question. The sheet draws two pickers, not a mix, and the union refuses it.",
    "Do not put this inside a ChatWidget container. It has no container by design — the question sits on the thread's own ground.",
  ],

  a11y: {
    role: "role=\"group\", named by the question, around the options. In multiple mode each option is a toggle button with aria-pressed; in single mode each is a plain button and the chosen one carries aria-current, because a press ANSWERS rather than moving a selection around.",
    name: "The group is named by the question through aria-labelledby. Each option's own label is its text; a tile's picture carries a required `alt` on top of its caption.",
    keyboard: [
      { key: "Tab", does: "Walks the options in order, then Confirm and Skip. Every one is a real button." },
      { key: "Enter / Space", does: "Chooses. In single mode that also submits; in multiple it toggles." },
      { key: "Tab (answered)", does: "Nothing — the receipt is text and a Badge, with no controls at all." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the question, and a chosen option's label" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "a resting option's label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the handoff option, the unchosen options once something is picked, and the answered question" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the chosen option's edge and its check — the only channel saying which answer was given (SC 1.4.11)" },
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "text", role: "the answered Badge and the tile's check badge" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-hover", floor: "text", role: "an option under the pointer" },
      { fg: "--ui-bg-hover", bg: "--ui-bg-base", floor: "decorative", role: "the hover fill", why: "hover is never the only channel and never carries state: selection is an EDGE and hover is a FILL, so the two are on different channels by construction. That separation is also what stops the known bg-hover / bg-selected collision from reaching this component" },
    ],
  },

  forwarding: {
    ref: "The outermost node.",
    className: "The outermost node, so a caller can set the column the question lives in.",
    "native props": "The remaining div props land on the same node. `onChange` is omitted — the change callback is onValueChange (§1), and accepting both would be two answers to one question.",
  },

  motion:
    "One transition per option: background-color, border-color and color together at duration-fast / ease-out, and outline-color on a tile. Enumerated rather than `transition-colors`, because the group also covers fill, stroke and text-decoration and none of those may move here. Collapses under prefers-reduced-motion at the token layer.",

  needsDesign: [
    "The tile is square and the sheet draws four across a 640 thread at 154px each. AspectRatio supplies the shape and the column supplies the width, so a narrower thread makes smaller tiles rather than fewer — five or more still do not wrap (see below).",
    "The options are buttons in a role=\"group\", not a radiogroup. Single-select tap-to-commit makes each option an ACTION rather than a selection to move around, so arrow-key roving would be a promise the widget does not keep — but if the design ever adds a separate Confirm to single-select, a radiogroup becomes the right shape and this should change with it.",
    "The 400px option cap, tap-to-commit on single select, and the collapse-to-receipt behaviour are the sheet's readings of the references — confirm with product.",
    "Five or more tiles wrap to a second row and are not drawn. The grid is four across at any count today.",
    "Disabled options are not drawn and not built.",
    "The sheet names --ui-canvas-selection for the tile outline. That token exists in Paper and NOT in the contract, and it resolves to the same value as --ui-border-focus — so the tile picker uses border-focus, which is also what makes the two pickers one selection language. Either the token is minted or the sheet should name border-focus.",
    "RTL is not drawn. The component uses logical properties throughout, so it should mirror; nothing has confirmed it.",
  ],

  knownGaps: [
    "The handoff option calls onSubmitAction with its own id and selects nothing — moving the cursor into the composer is the caller's, because the composer is not this component's to reach.",
    "The receipt shows ONE answer. A multi-select question that picked three collapses to a single Badge string the caller composes.",
    "There is no per-option description or icon; an option is a label and, for a tile, a picture.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2HN7-0",
} as const;

export type ChatQuestionnaireDoc = typeof chatQuestionnaireDoc;
