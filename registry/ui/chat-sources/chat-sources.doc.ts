/** Typed documentation for ChatSources (CONVENTIONS §11). */

export const chatSourcesDoc = {
  lead: "Keeps the sources behind an answer within reach.",
  name: "ChatSources",
  status: "experimental",
  summary:
    "How an answer shows where it came from. Three parts on one data set: an inline citation marker after the clause it supports, a preview that opens from the marker on hover or focus, and the sources block under the answer — folded by default to one line of kind discs and a count, open to a numbered list of link rows, or led by source cards when the answer IS what the agent found. A source's number is its position in the list, so a marker and its row can never disagree. Four kinds — web, file, brand asset, library item — told apart by glyph, never by colour.",

  anatomy: [
    { part: "provider", slot: "—", notes: "ChatSources.Provider. Renders no DOM: it holds the turn's sources, the strings, the streaming flag and the portal container, and the id → number map both other parts read. A marker and a block outside one throw — the provider IS the shared list." },
    { part: "root", slot: "chat-sources", notes: "The block. Carries data-layout (list | cards) and data-state (gathering | single | folded | open). className, ref and native div props land here." },
    { part: "gathering", slot: "chat-sources-gathering", notes: "While sources arrive: role=status, a StatusMatrix status=\"working\" size=\"sm\" (the sheet's 14px status node) and the count, label-md in text-ink-secondary. Nothing to fold yet, so no chevron." },
    { part: "summary", slot: "chat-sources-summary", notes: "The disclosure trigger — Base UI's Collapsible.Trigger, a real button. Folded: up to three kind discs, the count, a 12px ChevronDown. Open: the count and the chevron rotated up, without the discs (the sheet's 3ZOP)." },
    { part: "discs", slot: "chat-sources-discs", notes: "20px discs at a 6px overlap, each bg-elevated with a 2px ring in the GROUND's colour (ring-base on the page, ring-elevated inside the \"+N more\" card on bg-sunken discs) and a 12px kind glyph in text-ink-muted. One disc per distinct KIND in list order, at most three." },
    { part: "count", slot: "chat-sources-count", notes: "The caller's `label` — already counted and pluralised. label-md, text-ink-secondary." },
    { part: "panel", slot: "chat-sources-panel", notes: "The Collapsible panel holding the list." },
    { part: "list", slot: "chat-sources-list", notes: "An <ol role=list> of <li>, so the count is announced and the visible numbers are list positions." },
    { part: "row", slot: "chat-sources-row", notes: "32px, px-sm, gap-sm, radius-md. Lanes: 16px index (caption, tabular, end-aligned) · 16px kind glyph · title (label-md, truncates) · 168px origin (caption, truncates) · 24px link slot. An <a> when the source has an href (or the source's own `render` element), a div when it does not. Hover is bg-elevated; the row whose marker is hovered or open takes bg-accent-subtle and an accent index (data-cited)." },
    { part: "row-link", slot: "chat-sources-row-link", notes: "The 24px trailing slot: LinkExternal 14 (leaves the product) or ArrowRight 14 (stays in it), in text-ink-link. Shown on row hover and focus-visible; always shown where the device has no hover. The lane is kept on every row so the origins align." },
    { part: "cards", slot: "chat-sources-cards", notes: "layout=\"cards\", folded: the first `cardCount` sources as 172×96 cards (bg-elevated, radius-md, p-md, no edge, no shadow; title label-md clamped to two lines; a footer of glyph 12, origin, index), then the \"+N more\" card." },
    { part: "card", slot: "chat-sources-card", notes: "A link like the row, hovering to bg-hover — the step up from an elevated object." },
    { part: "more", slot: "chat-sources-more", notes: "The \"+N more\" card — a second Collapsible.Trigger, flex-1. Pressing it opens the list and hands focus to the summary that replaces it." },
    { part: "citation", slot: "chat-sources-citation", notes: "ChatSources.Citation — a <button> pill inside the paragraph: 16px tall, min-width 16, px-xs, radius-full, 2px lead from the word before, centred on the line. Numeral caption, tabular. Rest bg-elevated/text-ink-muted; hover and open bg-accent-subtle/text-ink-link; pressed bg-accent-subtle-hover/text-ink-link-hover; streaming disabled, text-ink-disabled. Two ids share one pill (\"2, 5\")." },
    { part: "preview", slot: "popover-panel", notes: "The Popover primitive's panel at 320px with gap-md — its own surface, edge, shadow and radius-lg, opened gap-xs (4px) below the marker, start-aligned. Tagged data-chat-sources-preview." },
    { part: "preview-origin", slot: "chat-sources-preview-origin", notes: "Kind glyph 16, origin caption (flex, truncates), number caption tabular — all text-ink-muted." },
    { part: "preview-text", slot: "chat-sources-preview-text", notes: "Popover.Title at label-md in text-ink-primary, flush (the primitive's inset removed); Popover.Description at body-sm in text-ink-muted, clamped to three lines, absent with no excerpt — no space reserved." },
    { part: "preview-footer", slot: "chat-sources-preview-footer", notes: "The action link (chat-sources-preview-link: label-sm, text-ink-link, LinkExternal or ArrowRight 12) and, for a grouped marker, the pager (chat-sources-preview-pager): Button ghost·sm icon-only ChevronLeftSmall, \"2 / 2\" caption tabular, ChevronRightSmall — disabled at the ends." },
  ],

  composition: `
ChatSources.Provider  sources! labels! isStreaming? container?
├─ answer text … <ChatSources.Citation sourceIds={["s1"]} /> …
│                 └─ preview (Popover) — origin · title · excerpt? · link? · pager?
└─ ChatSources    label!  isGathering? isHeld?  isOpen? defaultIsOpen? onOpenChange?
   ├─ layout="list"  (default)          — folded summary ⇄ numbered rows
   └─ layout="cards" moreLabel! cardCount?  — cards + "+N more" ⇄ numbered rows

ChatSource  { id, kind, title, origin, excerpt?, href?, isExternal?, actionLabel?, isUnavailable?, render? }
kind        web (Globe) · file (Image) · brandAsset (FileText) · libraryItem (PdfFile)
  `.trim(),

  props: {
    sources: { type: "readonly ChatSource[]", required: true, notes: "Provider. The turn's sources in list order; a source's number is its index + 1. Citations refer to sources by `id`, so re-ordering the list renumbers every marker with it." },
    labels: { type: "{ openSource; previousSource; nextSource; unavailable }", required: true, notes: "Provider. The strings the parts need beyond the data — props, never an i18n runtime (§9). One object because a marker reads them far from where they are set." },
    isStreaming: { type: "boolean", default: "false", notes: "Provider. Every marker is a disabled button in text-ink-disabled with no preview: the list it points into is not final." },
    container: { type: "HTMLElement | null", notes: "Provider. Where previews portal to — the themed element, so a brand scope reaches them (Popover's note)." },
    label: { type: "string", required: true, notes: "Block. The summary line — \"5 sources\", \"3 sources so far\". The caller counts and pluralises." },
    isGathering: { type: "boolean", default: "false", notes: "Block. Sources still arriving: a live count beside a working StatusMatrix, no fold." },
    isHeld: { type: "boolean", default: "false", notes: "Block. Holds the gathering StatusMatrix on its key frame — set it when another matrix in the turn (Chat Progress's status line) is the live edge. One matrix moves per turn, and only the caller knows the turn." },
    isOpen: { type: "boolean", notes: "Block. The disclosure, controlled. Uncontrolled through defaultIsOpen (default false — folded). A marker's press opens it through onOpenChange like any other request." },
    layout: { type: '"list" | "cards"', default: '"list"', notes: "Block. A union: `cards` requires `moreLabel`." },
    moreLabel: { type: "(hiddenCount: number) => string", notes: "Cards only, required there. The last card's line." },
    cardCount: { type: "number", default: "2", notes: "Cards only. Sources shown as cards before \"+N more\". When every source fits with one to spare, all of them are cards and there is no \"+1 more\"." },
    sourceIds: { type: "readonly [string, ...string[]]", required: true, notes: "Citation. Non-empty by type. Unknown ids are dropped rather than drawn as a guessed number." },
    render: { type: "ReactElement", notes: "Per source. Slot: the element its links render as — an app router's Link. Passed through, never wrapped (§3)." },
  },

  do: [
    "Put the marker after the clause it supports, not at the end of the paragraph — the reader is checking a claim, not a paragraph.",
    "Give a clause that leans on two sources ONE marker with both ids. Two pills side by side read as a footnote stack.",
    "Pass the themed element as `container` inside a brand scope, or the previews paint theme zero.",
    "Keep the block folded by default. Most readers want the answer; the few who want the evidence are one press away, and a marker's press opens it for them.",
    "Use `cards` only when the answer is a list of what was found. Under an ordinary answer, cards out-shout the text.",
  ],

  dont: [
    "Do not let the marker carry the answer's emphasis. It is muted at rest on purpose; colour arrives on hover, as the cue that it can be opened.",
    "Do not colour a source by its kind. The kind is the glyph's job, and the accent is reserved for the cited row.",
    "Do not build a marker outside the provider with a hard-coded number. The provider exists so the number and the row agree.",
    "Do not hide an unavailable source. Its number is still in the answer; the row says it has gone.",
  ],

  a11y: {
    role: "The block is a disclosure: Base UI's Collapsible.Trigger is a real button with aria-expanded, the list an <ol role=list>. The gathering line is role=status, polite. Each marker is a native <button>; its preview is the Popover's non-modal dialog, named by its title and described by its excerpt.",
    name: "A marker's name is its visible number followed by the cited titles (\": Lighthouse at dusk\") in a visually hidden span — label-in-name holds (SC 2.5.3) and \"1\" alone is never the announcement. The disclosure is named by `label`. Icon-only pager buttons are named by `labels.previousSource`/`nextSource`.",
    keyboard: [
      { key: "Tab", does: "Reaches each marker in reading order. Keyboard focus opens its preview, as hover does; focus stays on the marker." },
      { key: "Tab (preview open)", does: "Moves into the preview — its link, then the pager. Tabbing out of it closes it." },
      { key: "Enter / Space (marker)", does: "Unfolds the block and scrolls the cited row into view; the preview stays open." },
      { key: "Escape", does: "Closes the preview and returns focus to the marker (Popover)." },
      { key: "Enter / Space (summary or +N more)", does: "Toggles the list. From \"+N more\", focus moves to the summary that replaces it." },
      { key: "Enter (row)", does: "Follows the source's link. A row without one, or an unavailable source, is not in the tab order." },
    ],
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "a resting marker's numeral; a card's origin and index; every preview caption" },
      { fg: "--ui-text-link", bg: "--ui-bg-accent-subtle", floor: "text", role: "a hovered or open marker's numeral; the cited row's index" },
      { fg: "--ui-text-link-hover", bg: "--ui-bg-accent-subtle-hover", floor: "text", role: "a pressed marker's numeral" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the count on the summary and the gathering line" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "\"+N more\" on its card" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "a row's title at rest" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "a hovered row's title; a card's title; the preview's title" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the cited row's title" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "a hovered card's title" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "a row's index, origin and kind glyph at rest" },
      { fg: "--ui-text-muted", bg: "--ui-bg-accent-subtle", floor: "text", role: "the cited row's origin and kind glyph" },
      { fg: "--ui-text-muted", bg: "--ui-bg-hover", floor: "text", role: "a hovered card's origin and index" },
      { fg: "--ui-text-link", bg: "--ui-bg-elevated", floor: "text", role: "the preview's action link; a hovered row's link glyph" },
      { fg: "--ui-text-link", bg: "--ui-bg-base", floor: "non-text", role: "a focused row's link glyph, revealed on a row with no hover fill" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring on a marker, the summary and a row" },
      { fg: "--ui-border-focus", bg: "--ui-bg-elevated", floor: "non-text", role: "the focus ring on a card and inside the preview" },
      { fg: "--ui-text-disabled", bg: "--ui-bg-elevated", floor: "decorative", role: "a streaming marker's numeral", why: "Deliberately inert while the answer streams (the sheet's 40H0 note, 1.94:1): the marker is a disabled native button, which SC 1.4.3 exempts as an inactive control, and the number it carries is not final until the turn settles." },
      { fg: "--ui-text-disabled", bg: "--ui-bg-base", floor: "decorative", role: "an unavailable source's row", why: "The row is aria-disabled: the source can no longer be opened, and LinkBroken in place of the kind glyph plus the \"No longer available\" origin say so in shape and words, not only in the faded ink. Inactive content under SC 1.4.3's exemption." },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "a resting marker's pill, the kind discs and the source cards", why: "A grouping fill, never the boundary (1.11:1 light, 1.24 dark — the sheet's token map). The marker is identified by its numeral and its position after a clause, a card by its text; nothing depends on seeing the fill's edge (SC 1.4.11)." },
    ],
  },

  forwarding: {
    className: "Block: the root div. Citation: the button. Provider renders nothing to forward to.",
    ref: "Block: the root div. Citation: the <button> — the one control, so a caller can focus or measure it.",
    rest: "Block: native div props on the root; the block's own props (label, layout, moreLabel, cardCount, isGathering, isHeld, the disclosure trio) are destructured out so none reaches the DOM as an attribute. Citation: native button props on the button, with its own pointer, key, click and focus handlers composed after the caller's (composeEventHandlers) — a caller that calls preventDefault() opts out. `type` and `disabled` are the component's.",
  },

  motion:
    "Four transitions, all on motionMicro (duration-fast, ease-out): the marker's background-color and color between rest, hover·open and pressed; a row's and a card's background-color as it takes the hover fill or the cited wash; the row's link slot fading in; and the disclosure chevron's `rotate` (Accordion's recipe — `transition-[rotate]`, never `transform`). The preview's own fade-and-scale is the Popover's. Hover intent reuses Tooltip's constants: the preview opens after HOVER_INTENT_DELAY_MS, and because it holds a link it lingers for HOVER_INTENT_SKIP_MS after the pointer leaves the marker so the pointer can cross into it — entering the panel cancels the close. A marker's press scrolls the cited row into view smoothly, or instantly under prefers-reduced-motion (scrollIntoView is JavaScript, outside the token layer's duration collapse, so the component asks the media query itself). The gathering StatusMatrix is the only loop, and it carries its own reduced-motion handling.",

  needsDesign: [
    "No linger constant: the preview's close-after-leave reuses HOVER_INTENT_SKIP_MS, which motion.ts defines for the skip window between tooltips, not for crossing a gap into a panel. A hover-card linger should be named in the motion layer.",
    "The `file` kind is drawn with Image, which reads as image-specific. A generic attachment glyph (File, Paperclip) may be meant.",
    "The brand row's hover slot draws LinkExternal while the brand preview's action draws ArrowRight (in-app). Here both follow `isExternal`: external → LinkExternal, in-app → ArrowRight.",
    "Origins differ between surfaces for the same source: \"moma.example · Web\" in the preview against \"moma.example\" in the row, \"Brand guidelines · Chapter 4\" against \"Guidelines · Chapter 4\". One `origin` string serves both.",
    "Origin captions are drawn at weight 400; the caption role is 600 and the type-role gate measures it, so they ship at 600. Either the sheet moves or the role table gains an origin exception.",
    "The single-source and unavailable rows are drawn with no px-sm, no index and no link slot. Here the single row drops only the index (there is nothing to number) and both keep the padding and the slot lane so they align with every other row.",
    "Not drawn: the unavailable source's preview; the size-sm / 343px column; dark for each marker state; the preview's touch sheet; focus-visible on rows and cards; how many cards precede \"+N more\" (2 here, as drawn); what the unavailable row's ink should be if it must stay readable — text-ink-disabled measures below AA as text.",
  ],

  knownGaps: [
    "Opening the preview without moving focus into it passes `initialFocus: false` to Base UI's popup through the Popover panel's rest spread, which Popover's own props do not name. If Popover grows an `initialFocus` prop, this should use it.",
    "On touch the preview opens from a tap; there is no bottom-sheet form for narrow screens.",
    "Markers are not announced as sources arrive while streaming; they become operable when `isStreaming` turns off.",
    "A source's `render` element replaces every link that source draws (row, card, preview action). A per-surface slot is not modelled.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3ZK8-0",
} as const;

export type ChatSourcesDoc = typeof chatSourcesDoc;
