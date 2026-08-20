/** Typed documentation for ChatWidget (CONVENTIONS §11). */

export const chatWidgetDoc = {
  name: "ChatWidget",
  status: "stable",
  summary:
    "The artifact container — the thing the agent hands you to take away. One shell with two payload families: TEXT (a header naming the artifact, prose capped and faded, a Copy/Edit bar) and MEDIA (a stage at a fixed ratio, an optional frame rail and caption, an Edit/Download bar). It is one component because the container, the action bar and the dark treatment are identical across both, which is exactly what the sheet's own Not built row asks for. bg-elevated, radius-lg, an 8px inset and no border — the fill alone separates the artifact from the receiver's prose.",

  anatomy: [
    { part: "root", slot: "chat-widget", notes: "bg-elevated, radius-lg, p-sm on all four sides, gap-sm. No border and no shadow: the fill is the whole boundary, the same lift the sender bubble uses." },
    { part: "header", slot: "chat-widget-header", notes: "Text family only. px-md pt-xs — which puts the name 20px from the container edge, the same 20px an action-bar label starts at, since those buttons sit at the inset plus their own px-md. Type aligns to type." },
    { part: "name", slot: "chat-widget-name", notes: "label-md 600 in text-ink-primary, truncating. The only part of the header row that may shrink; the icon and the chip are fixed slots." },
    { part: "body", slot: "chat-widget-body", notes: "The receiver block's typography unchanged — body-md 400 at leading-relaxed, paragraphs stacked at gap-md, px-md. Capped at 320px; past that it scrolls, becomes a named region and enters the tab order." },
    { part: "fade", slot: "chat-widget-fade", notes: "A 48px gradient from the container's own fill to transparent, drawn ONLY while the body scrolls. `from-elevated to-transparent` — two stops the theme already has, which is the answer to the sheet's Conflict: it is not a colour, so no token can express it." },
    { part: "media", slot: "chat-widget-media", notes: "The stage: radius-md inside the container's radius-lg, which is concentric by construction (16 outer − 8 inset = 8 inner). bg-media-floor while empty, overflow-clip, a fixed ratio from AspectRatio's own six." },
    { part: "overlay", slot: "chat-widget-media-overlay", notes: "Slot: controls floating in the stage's trailing bottom corner — the sheet's paging arrows and frame counter." },
    { part: "rail", slot: "chat-widget-rail", notes: "The carousel's frame strip, a <ul> of Thumbnails so a screen reader is given the count. Named by a required `label`." },
    { part: "caption", slot: "chat-widget-caption", notes: "The provenance line between media and bar — caption size in text-ink-muted." },
    { part: "actions", slot: "chat-widget-actions", notes: "The bar, in both families with the verbs swapped. Leading verbs are Button secondary·md; the `end` slot takes the trailing Button ghost·md icon buttons. Pushed apart by a spacer, not by justify-between, so a bar with one verb still puts its icons on the trailing edge." },
  ],

  composition: `
ChatWidget                                    — the shared container
├─ ChatWidget.Header   name! icon? chip?      — text family
├─ ChatWidget.Body     scrollLabel!           — text family
├─ ChatWidget.Media    ratio? overlay?        — media family
├─ ChatWidget.Rail     label!                 — media family, carousel
├─ ChatWidget.Caption                         — media family
└─ ChatWidget.Actions  end?
   children: <Button variant="secondary" size="md" icon={<Copy/>}>Copy</Button>
   end:      <Button variant="ghost" size="md" isIconOnly aria-label="Save" icon={<Bookmark/>}/>
  `.trim(),

  props: {
    "Header.name": { type: "string", notes: "What the artifact IS. Truncates — a filename is identification, and a wrapped one turns a one-line header into two." },
    "Header.chip": { type: "ReactElement", notes: "Slot: a Badge, unselected, naming the kind. A fixed slot that never shrinks, so the name gives way first." },
    "Body.scrollLabel": {
      type: "string",
      notes: "REQUIRED, and applied only while the body actually overflows its 320px cap. A capped body that scrolls is a scrollable region (SC 2.1.1) and needs a keyboard path; a region reachable by keyboard with no name is as useless as a named one nobody can reach. When the content fits, no role, no name and no tab stop — an unconditional tab stop in front of every short draft is the other half of that failure.",
    },
    "Media.ratio": { type: "AspectRatioName", default: '"landscape"', notes: "All frames in one widget share it. Mixing ratios is what splits an answer into separate widgets, so this is per-widget rather than per-frame." },
    "Media.overlay": { type: "ReactNode", notes: "Slot: floats in the stage's trailing bottom corner. Paging arrows and the frame counter live here." },
    "Rail.label": { type: "string", notes: "Required. Names the frame list — an unnamed list of thumbnails announces as a list of images and says nothing about what they are." },
    "Actions.end": { type: "ReactNode", notes: "Slot: the trailing icon buttons. Separate from children so the bar can push them apart without the caller writing a spacer." },
  },

  do: [
    "Reach for this only when the agent is handing over an ARTIFACT — something to copy, edit, download or keep.",
    "Give the media stage its final size from the first byte, so generating, loading and failure happen inside the same frame and the thread never reflows when the image lands.",
    "Put Copy first in a text widget's bar. Copying is what the artifact is for.",
    "Pass a Badge as the header chip rather than styling your own — the sheet's kind chip IS Badge unselected.",
  ],

  dont: [
    "Do not put conversation in this container. An explanation, a question, a summary of what the agent just did — those are the receiver block, uncontained. Once everything is a card, the container stops meaning \"take this with you\" and the thread turns into a stack of boxes.",
    "Do not give the container a border or a shadow. The fill alone is the boundary, and an edge on top of it makes the artifact heavier than the answer around it.",
    "Do not change the container's inset without changing the media's radius. 16 outer minus an 8px inset is what makes the two curves concentric, and it is the rule that breaks visibly.",
    "Do not use this for a questionnaire. That family has no container at all — it is ChatQuestionnaire.",
  ],

  a11y: {
    role: "Plain content, with one exception: the body becomes a named, focusable region WHILE it scrolls and is a plain div when it does not. The rail is a real <ul>.",
    name: "The body's region is named by `scrollLabel`; the rail by `label`. Both are required at the type level. Action controls name themselves — Button's isIconOnly requires aria-label.",
    keyboard: [
      { key: "Tab", does: "Reaches the body only while it scrolls, then the action bar's controls in order." },
      { key: "Arrow keys (in the body)", does: "Scrolls it, once it holds focus — which is the whole reason the tab stop exists." },
      { key: "Enter / Space", does: "Activates the focused action. Every control in the bar is a real Button." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the artifact's name and its body copy" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "the header glyph, the caption, and every action-bar label" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the container against the page", why: "the fill is a GROUPING cue: what makes the artifact an artifact is that it has a name, a bar and a boundary at all, none of which needs the step to be measurable. It is the same argument the sender bubble makes, and the reason neither carries a border" },
      { fg: "--ui-bg-media-floor", bg: "--ui-bg-elevated", floor: "decorative", role: "the media stage before a picture lands", why: "it is the GROUND a photograph is judged against, deliberately invariant to both the scheme and the brand — see the contract. Nothing is read on it: what sits there is either a picture or a caller-composed placeholder that carries its own ink" },
    ],
  },

  forwarding: {
    ref: "Each part forwards to its own outermost node. Body forwards to the SCROLLER rather than to its positioning frame, because scrollTop is what a caller takes a ref for here.",
    className: "The outermost node of each part.",
    "native props": "Spread on the same node. Body's land on the scroller, alongside the conditional region attributes.",
  },

  motion:
    "NONE, deliberately. The fade over a scrolling body is a static gradient rather than an animation, and the media stage does not animate its arrival because the frame was already reserved from the first byte — an artifact that fades in is one the thread reflowed for. An earlier draft carried `transition-[opacity]` on the action bar; nothing here ever changes its opacity, which makes it the motion version of a prop that does nothing, and it was removed.",

  needsDesign: [
    "The carousel is drawn on the sheet and only half built here: Media takes an `overlay` slot and Rail lays out the frames, but which frame is current and what pressing one does is state the thread owns. A real Carousel is its own item, and the sheet's own structure agrees — its Anatomy section is a single image and the carousel is a separate section.",
    "The action bar's wrap behaviour under 308px is not drawn. The bar never wraps today, which means it overflows in the sidebar.",
    "Button secondary·md carries a 16px glyph and gap-sm; the sheet draws 14px and gap-xs, and the ghost icon buttons at radius-sm where Button md is radius-md. Shipped as Button so the bar cannot drift from the rest of the library — but the sheet and Button should agree on one set of numbers.",
    "The media states (generating, loading, failed) are compositions rather than props: the caller puts a Progress, a DotPattern or a failure well inside the stage. The sheet draws all three; whether they should be a prop is the open question.",
    "Rich body content — headings, lists, links, inline emphasis, code — is drawn as plain paragraphs only, and the vertical rhythm inside the container is undecided. Shares its answer with Chat Message's markdown gap and TODO's Code Block item.",
  ],

  knownGaps: [
    "The 320px body cap and the 48px fade are the sheet's own Derived readings, not product decisions.",
    "The fade is drawn unconditionally while the body scrolls, so the last line stays faded when the reader reaches the bottom. Fixing it needs a scroll listener; the mask alternative fades content rather than painting over it and has the same flaw.",
    "Inline editing inside the container, and version history when the agent rewrites the same artifact, are not drawn and not built.",
    "The media stage's 624x480 caps come from the 640 thread; the component takes its width from its container instead, so a wider thread makes a wider stage.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2I41-0",
} as const;

export type ChatWidgetDoc = typeof chatWidgetDoc;
