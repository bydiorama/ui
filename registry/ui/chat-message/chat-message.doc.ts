/** Typed documentation for ChatMessage (CONVENTIONS §11). */

export const chatMessageDoc = {
  name: "ChatMessage",
  status: "stable",
  summary:
    "The two voices of an agent thread, deliberately asymmetric. The sender sits in a right-aligned bg-elevated bubble capped at a share of the column; the receiver owns the full width with no bubble at all and a looser leading — the agent's answer is the page, not a quote on it. Ships as one item with two components: there is no bare <ChatMessage>, because the receiver has no bubble and a role prop would give it one.",

  anatomy: [
    { part: "sender root", slot: "chat-message", notes: "data-role=\"sender\", data-status. Column, items-end, gap-xs. Declares --ui-chat-message-bubble-max-width (75%)." },
    { part: "bubble", slot: "chat-message-bubble", notes: "bg-elevated, radius-lg, no tail, no border, no avatar and no timestamp inside. px-lg py-md at md, px-md py-sm at sm. body 400 at leading-normal in text-ink-primary." },
    { part: "attachments", slot: "chat-message-attachments", notes: "Inside the bubble, above the text, gap-xs — a Thumbnail.Group. Sent tiles carry no remove control: the message is gone." },
    { part: "status", slot: "chat-message-status", notes: "The caption under the bubble, and the ONLY channel carrying delivery state — the bubble's fill never moves. text-ink-muted while sending, medium text-danger when failed." },
    { part: "receiver root", slot: "chat-message", notes: "data-role=\"receiver\", data-streaming. group/chat-message — named, so a message nested inside a widget cannot reveal its parent's actions." },
    { part: "body", slot: "chat-message-body", notes: "No container. body 400 at leading-relaxed (155%) — the looser leading is the receiver's signature and the reason it needs none. Rich blocks stack at gap-lg, which IS --ui-space-stack-md." },
    { part: "caret", slot: "chat-message-caret", notes: "8x15 block at radius 2 in text-ink-primary, drawn only while streaming. Static, not blinking: the text arriving is already the motion." },
    { part: "error", slot: "chat-message-error", notes: "The failure block INSIDE the message, under whatever partial answer arrived — bg-danger-subtle, radius-md, px-md py-sm, body-sm in text-ink-on-danger-subtle, with a danger·sm Retry. role=\"status\", announced politely." },
    { part: "actions", slot: "chat-message-actions", notes: "The ghost icon row, revealed on message hover AND on focus-within, forced visible on a device with no hover. Withheld entirely while streaming." },
    { part: "meta", slot: "chat-message-meta", notes: "Caption in text-ink-muted at the trailing end of the actions row — agent name and relative time. Appears with the row." },
  ],

  composition: `
ChatMessage.Sender     size? attachments? status? statusText? onRetryAction? retryLabel?
└─ (bubble)            attachments above the text, both inside

ChatMessage.Receiver   size? isStreaming? actions? meta? isActionsVisible? errorText? onRetryAction? retryLabel?
├─ (body)              children, plus the caret while streaming
├─ (error)             errorText + a danger·sm Retry
└─ (actions)           actions … meta
   └─ actions:         <Button variant="ghost" size="sm" isIconOnly aria-label="Copy" icon={<Copy/>}/> x N
  `.trim(),

  props: {
    size: {
      type: '"md" | "sm"',
      default: '"md"',
      notes: "The type scale, and the bubble's inset with it. NOT the width cap — the sheet draws a 343px mobile column at md with the narrow cap, so the two are separate axes.",
    },
    "--ui-chat-message-bubble-max-width": {
      type: "CSS custom property",
      default: "75%",
      notes: "The bubble's share of the column. A property rather than a prop because the sheet's rule is about the COLUMN — 75% at 640, 85% once it narrows — and a component cannot see that: the assistant sidebar is 308px inside a 1440px window, so no viewport breakpoint describes it. Set it where the column is chosen.",
    },
    status: { type: '"sent" | "sending" | "failed"', default: '"sent"', notes: "Sender only. `statusText` is REQUIRED by the type for the other two: the caption is the only channel carrying the state, so a sending bubble with no caption has no state at all." },
    attachments: { type: "ReactNode", notes: "Sender only. A Thumbnail.Group above the text, inside the bubble. Never wrapped (§3)." },
    isStreaming: { type: "boolean", default: "false", notes: "Receiver only. Draws the caret and WITHHOLDS the actions row — copying or rating half an answer is worse than waiting, and rendering the row hidden would put six tab stops in front of an unfinished answer." },
    actions: { type: "ReactNode", notes: "Receiver only. Button ghost · sm · isIconOnly at the call site. A slot, because which actions a product offers is the product's." },
    isActionsVisible: { type: "boolean", default: "false", notes: "Keeps the row visible instead of revealing it on hover. The sheet asks for this on touch and on the latest message — both are facts about the THREAD, which only the thread knows." },
    errorText: { type: "string", notes: "Receiver only. The failure block inside the message. Never a toast: the error belongs to the turn that produced it." },
    onRetryAction: { type: "() => void", notes: "Paired with `retryLabel` at the type level, on both components. The sheet draws the word \"retry\" inside the caption, which reads as a control and is not one; this is that control." },
  },

  do: [
    "Set --ui-chat-message-bubble-max-width to 85% wherever the column is narrow — the sidebar and the phone — and leave it at 75% on the page.",
    "Drive isStreaming from the stream and let the component withhold the actions row; do not conditionally render the row yourself.",
    "Pass errorText for a stopped generation, so the failure stays attached to the turn instead of floating off as a toast.",
    "Keep the partial answer when a generation fails. The failure block says the answer above is kept, and deleting it makes that a lie.",
  ],

  dont: [
    "Do not give the receiver a bubble, an avatar or a border. The asymmetry is the design, and it is what keeps a long answer readable.",
    "Do not put a timestamp inside the sender bubble — time lives in the meta line and in a hover tooltip.",
    "Do not render a remove control on a sent attachment. The message has gone; the control would promise something it cannot do.",
    "Do not reveal the actions row with hover alone if you add your own — the component pairs hover with focus-within and with a no-hover fallback, and dropping either strands a keyboard or a touch user.",
  ],

  a11y: {
    role: "Plain content. The failure block is role=\"status\" so a stopped generation is announced; nothing else here is a widget the platform does not already have.",
    name: "The action controls name themselves — Button's isIconOnly requires aria-label. Retry is a real button with a required `retryLabel`, on both voices.",
    keyboard: [
      { key: "Tab", does: "Reaches the actions row, which becomes visible on focus-within — the row is opacity-0, never unmounted, so the tab order does not change under the user." },
      { key: "Tab (while streaming)", does: "Skips the actions row entirely: it is not rendered until the answer settles." },
      { key: "Enter / Space", does: "Activates the focused action or Retry — native, both are real buttons." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the sender's message inside the bubble" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the receiver's answer, which sits on the page with no container" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the meta line and the \"Sending…\" caption" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the sender's failure caption" },
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "the receiver's failure block and its Retry label" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the bubble against the page", why: "the bubble's fill is a GROUPING cue, not information: which voice is speaking is carried by the alignment, the leading and the presence of an actions row, all of which survive at any contrast. It is the same argument ADR 0010 makes for a surface step, and the reason the sheet gives the receiver no container at all" },
    ],
  },

  forwarding: {
    ref: "The outermost node of each component — neither is a form control, so §5's exception does not apply.",
    className: "The outermost node. It is also where --ui-chat-message-bubble-max-width is set, so a caller's override lands after the default and wins.",
    "native props": "The remaining div props are spread on the same outermost node.",
  },

  motion:
    "One transition: the receiver's actions row fades in on hover or focus-within at duration-fast / ease-out (motionMicro), which is the sheet's 120ms exactly. Nothing else moves — the streaming caret is deliberately static, because the text arriving is already the motion and a second animation for the same fact is noise. Collapses under prefers-reduced-motion at the token layer.",

  needsDesign: [
    "The sheet draws the word \"retry\" inside the sender's failure caption. A word in a caption cannot be tabbed to or announced, so it ships as a real Button beside the caption — the sheet should be redrawn to match, and it has been.",
    "The actions row is drawn as 24px controls with 14px glyphs in text-muted; Button ghost · sm is 24px with 16px glyphs in text-ink-secondary. Shipped as Button, so the row cannot drift from the rest of the library — but either the sheet moves 2px and one ink step, or this row is a distinct control type and should be named.",
    "The failure block is a tighter Banner with an action: Banner is p-lg with no action slot and uses --ui-intent-danger-fg for its ink, where this uses the deeper --ui-text-on-danger-subtle. Shipped as a local recipe. This is the second inline alert in the library that wants an action; a third should grow Banner instead.",
    "The bubble caps (75% / 85%) and the sidebar's body-sm step are the sheet's own Derived readings — no product decision behind them yet.",
    "Rich receiver content — markdown lists, headings, links, tables, Code Block — is not drawn. Only the stacking rule (space-stack-md between blocks) is reserved, and that is what this component ships.",
    "Editing a sent message in place is not drawn; it needs a decision on whether an edit forks the conversation.",
  ],

  knownGaps: [
    "The caret is placed after the children rather than inside the last text node, so a receiver whose children are block elements gets it on its own line — which is what the sheet draws, but not what a real token stream looks like.",
    "There is no grouping of consecutive turns: the thread's spacing (space-stack-lg between exchanges) belongs to whatever lays the messages out, and this component does not provide it.",
    "The sender's hover tooltip carrying the timestamp is named in the parts table and not built — it is a Tooltip at the call site.",
    "The file chip drawn for a non-image attachment is shared with Chat Composer and exists nowhere as a component; it is passed in as a slot child today.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2H88-0",
} as const;

export type ChatMessageDoc = typeof chatMessageDoc;
