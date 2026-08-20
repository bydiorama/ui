/** Typed documentation for ChatComposer (CONVENTIONS §11). */

export const chatComposerDoc = {
  name: "ChatComposer",
  status: "stable",
  summary:
    "The message box of the agent chat: one frame holding an attachment tray, an auto-growing text region and a control row. A compact pill at rest, squaring to radius-xl the moment the text wraps — the layout switch is measured, not declared, because a composer cannot know in advance whether a sentence will wrap. Send carries the state of the conversation: disabled while the field is empty, accent when sendable, and an inverse-filled Stop while the agent answers.",

  anatomy: [
    { part: "root", slot: "chat-composer", notes: "Column, gap-sm. Carries className and data-layout (inline | stacked) so a consumer or a test can read which arrangement won without inspecting classes." },
    { part: "attachments", slot: "chat-composer-attachments", notes: "The tray, ABOVE the frame — a Thumbnail.Group or the file chips beside it. It scrolls horizontally rather than growing the composer; the pill stays a pill however many files are attached." },
    { part: "frame", slot: "chat-composer-frame", notes: "bg-field on a 1.5px border-subtle hairline (1 device pixel at DPR 1). radius-full while inline, radius-xl while stacked. p-md, gap-sm, and NO declared height — 12 + 32 + 12 is the sheet's 56px compact height, and a height would be a second author of the inset." },
    { part: "start", slot: "chat-composer-start", notes: "The leading control slot — the sheet's Add button, Button ghost · md · full with a Plus glyph, opening the attach menu." },
    { part: "text", slot: "chat-composer-text", notes: "The text region. Flexes inline; spans the frame with the sheet's px-sm py-xs inset while stacked, via order-first rather than a different tree." },
    { part: "input", slot: "chat-composer-input", notes: "The textarea itself, rows=1, resize disabled, height measured from the content and capped at maxRows lines before it scrolls. body-md 400 leading-normal in text-ink-primary; placeholder in text-ink-placeholder." },
    { part: "actions", slot: "chat-composer-actions", notes: "endActions (the sheet's Dictate) followed by Send or Stop. Pushed to the trailing edge with ms-auto while stacked." },
    { part: "send", slot: "chat-composer-send", notes: "Button primary · md · full with an ArrowUp glyph — the single filled action in the frame (ui-craft 18). Disabled while the value is blank, with the sheet's bg-sunken fill rather than Button's own bg-elevated." },
    { part: "stop", slot: "chat-composer-stop", notes: "Replaces Send while isGenerating. Button md · full filled --ui-bg-inverse with --ui-text-inverse ink, and a filled SquareRounded glyph — griddy's Stop hard-codes fill=\"black\" and cannot take the ink." },
    { part: "error", slot: "chat-composer-error", notes: "The failure caption, caption size in danger ink, inset px-lg so it clears the pill's curve. Its presence sets aria-invalid and the danger edge together." },
    { part: "disclaimer", slot: "chat-composer-disclaimer", notes: "The centred caption below the frame — \"Diorama Agent can make mistakes…\". Outside the frame; omitted (not hidden) in the sidebar context." },
  ],

  composition: `
ChatComposer                 label! sendLabel! stopLabel! value onValueChange onSubmitAction
├─ attachments?              <Thumbnail.Group>…</Thumbnail.Group>
├─ (frame)
│  ├─ startAction?           <Button variant="ghost" shape="full" size="md" isIconOnly icon={<Plus/>} aria-label="Add"/>
│  ├─ (text region)          the textarea — auto-grows to maxRows, then scrolls
│  └─ (actions)
│     ├─ endActions?         <Button variant="ghost" shape="full" size="md" isIconOnly icon={<Microphone/>} aria-label="Dictate"/>
│     └─ (Send | Stop)       owned by the component; isGenerating chooses
├─ errorText?
└─ disclaimer?
  `.trim(),

  props: {
    label: { type: "string", notes: "Required. The field's accessible name, ALWAYS visually hidden — the sheet draws no visible label in any of its three contexts, so there is no isLabelHidden to get wrong." },
    sendLabel: { type: "string", notes: "Required. Accessible name of the send control; an icon-only button with no name announces as \"button\"." },
    stopLabel: { type: "string", notes: "Required even for a composer that never generates. isGenerating changes at runtime, so a discriminated union on it cannot be satisfied by a caller holding a boolean — the label would be optional exactly when it is needed." },
    value: { type: "string", notes: "Controlled. Uncontrolled through defaultValue; both go through the shared useControllableState (§4)." },
    onSubmitAction: { type: "(value: string) => void", notes: "Enter (without Shift) and the Send button. The composer does NOT clear itself — a send that failed has to be able to put the text back, and only the caller knows whether it did." },
    isGenerating: { type: "boolean", default: "false", notes: "Swaps Send for Stop. Typing and Enter still work: the sheet's own placeholder for this state is \"Reply to interrupt…\"." },
    onStopAction: { type: "() => void", notes: "Runs when Stop is pressed; only reachable while isGenerating." },
    layout: { type: '"auto" | "inline" | "stacked"', default: '"auto"', notes: "auto measures the rendered line boxes — the sheet's rule is about the TEXT wrapping, which only layout knows. The literals exist for a story, a visual baseline, or a caller who has already decided." },
    maxRows: { type: "number", default: "8", notes: "Lines before the field scrolls instead of growing. The frame never exceeds this plus its chrome." },
    errorText: { type: "string", notes: "Sets aria-invalid, the danger edge and the caption together, so the three cannot drift apart." },
    attachments: { type: "ReactNode", notes: "Slot: the tray above the frame. Never wrapped (§3), and never moved inside — the pill stays a pill." },
    startAction: { type: "ReactElement", notes: "Slot: the Add control. A slot rather than props because what it opens (upload, library, camera) is the caller's." },
    endActions: { type: "ReactNode", notes: "Slot: controls between the text and Send. The sheet draws Dictate here and calls it the first thing to drop when the frame is narrow — dropping it is the caller's decision, at their breakpoint." },
    isDropActive: { type: "boolean", default: "false", notes: "PRESENTATIONAL. In a chat the drop target is the whole thread, not this pill, so the composer draws the state and the app owns the event — nothing here can detect it." },
    dropLabel: { type: "string", notes: "Replaces the placeholder while isDropActive — \"Drop to attach\". A string swap rather than a DOM swap: unmounting a focused control is what §10 forbids." },
    disclaimer: { type: "string", notes: "The caption below the frame. Hiding it in the sidebar context means not passing it." },
  },

  do: [
    "Give Add and Dictate as slots filled with Button ghost · md · full — that is exactly what the sheet draws, and it keeps the menu the Add button opens at the call site.",
    "Keep the attachment tray in `attachments`; it belongs above the frame, and putting it inside is what turns the pill into a box.",
    "Drive isGenerating from the stream and let the component swap Send for Stop — the two are one control, not two that must be conditionally rendered by the caller.",
    "Pass errorText rather than styling the frame; it wires aria-invalid, the edge and the message together.",
  ],

  dont: [
    "Do not clear the value in onSubmitAction before the send has succeeded — the composer deliberately does not clear itself, so a failure can put the draft back.",
    "Do not set rows or a height: the field measures its own content and caps at maxRows. A declared height would be a second author of the frame's inset.",
    "Do not use this as a general multi-line field. That is Textarea — it has a visible label, helper text and a resize grip, none of which belong in a chat.",
    "Do not add a second filled action to the frame. Send is the single filled control in it (ui-craft 18); everything else is a ghost.",
  ],

  a11y: {
    role: "A plain textarea with two or three real buttons beside it — no ARIA composite, because nothing here is a widget the platform does not already have.",
    name: "The field is named by `label` (required, visually hidden). Send and Stop are named by `sendLabel` / `stopLabel`, both required at the type level. Slot controls carry their own names — Button's isIconOnly requires one.",
    keyboard: [
      { key: "Enter", does: "Submits the current value, when it is not blank. preventDefault()'d, so no newline is inserted." },
      { key: "Shift + Enter", does: "Inserts a line break; the field grows a row, and past one row the frame squares to radius-xl." },
      { key: "Enter (IME composing)", does: "Commits the candidate and does NOT submit — sending there loses half a sentence in Japanese or Korean." },
      { key: "Tab", does: "Walks the frame: the Add slot, the field, the end slots, then Send or Stop. Every one is a real button or a real form control." },
      { key: "Space / Enter on a control", does: "Activates it — native, nothing is faked." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the entered message" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder, and the drop label that replaces it" },
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "text", role: "the ArrowUp glyph on the send control" },
      { fg: "--ui-bg-inverse", bg: "--ui-bg-field", floor: "non-text", role: "the Stop control's fill against the frame — the only channel telling it from Send, and the pair --ui-bg-emphasis failed at 1:1 in dark" },
      { fg: "--ui-text-inverse", bg: "--ui-bg-inverse", floor: "text", role: "the Stop glyph" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-field", floor: "non-text", role: "the invalid frame edge (SC 1.4.11 — state carried by a boundary)" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the error caption, which sits on the page rather than in the frame" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the disclaimer caption" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring — the resting hairline is decorative by design, so the ring is what carries SC 1.4.11 here" },
      { fg: "--ui-text-disabled", bg: "--ui-bg-sunken", floor: "decorative", role: "the ArrowUp glyph while the composer is empty", why: "the control is genuinely disabled and WCAG 2.2 exempts disabled controls (1.4.3, 1.4.11). The state is also carried by the fill dropping out of the accent, not by the glyph alone" },
      { fg: "--ui-bg-accent-subtle", bg: "--ui-bg-field", floor: "decorative", role: "the drag-over fill", why: "the drop state is carried by the solid border-focus edge and by the label replacing the placeholder; the tint is the third channel, not the only one" },
    ],
  },

  forwarding: {
    ref: "The TEXTAREA, not the frame (§5) — a ref to the wrapper could not focus it, could not be read for a value and could not be handed to a form library, which is every reason a caller takes one here.",
    className: "The outermost node, so a width sizes the tray, the frame and the captions together.",
    "native props": "The remaining textarea attributes (name, maxLength, autoFocus, spellCheck, …) go to the textarea, which is the element that owns them. onKeyDown is composed with the Enter contract, consumer first — preventDefault() opts out of submission.",
  },

  motion:
    "One transition, on the frame: border-color, box-shadow, background-color and border-radius together at duration-fast / ease-out (motionMicro). The radius is in that list on purpose — the inline↔stacked switch is a shape change, and snapping between a pill and a 24px corner reads as a re-render rather than as growth. The field's height is set imperatively from the measured content and is deliberately NOT transitioned: a height that eases behind the caret puts the caret outside the box while it catches up. Everything collapses under prefers-reduced-motion at the token layer.",

  needsDesign: [
    "The empty Send control's fill. The sheet draws --ui-bg-sunken; Button's own disabled treatment is --ui-bg-elevated, which measures 1.03:1 against a white field and disappears. Shipped as the sheet's, overriding Button in one place — the two should agree, and this is the third component to want a quieter disabled fill on a light field.",
    "The Stop control is a filled type Button has no variant for (an inverse fill with a matching edge). Written as a local recipe here; if a second component needs it, Button should grow the variant rather than the recipe being copied.",
    "griddy has no Stop glyph that can take the ink — its `Stop` hard-codes fill=\"black\", as `Pause` and every `ChatCircle*` do. Shipped as a filled SquareRounded. The sheet draws griddy's Stop and should be re-drawn with the glyph that can actually ship.",
    "The stacked layout's threshold is one wrapped line, and the 8-row cap is the sheet's own Derived note — neither is a product decision yet.",
    "RTL is not drawn. The frame uses logical properties (ms-auto, px), so it should mirror, but nothing has confirmed which side Send belongs on in RTL.",
  ],

  knownGaps: [
    "isDropActive is presentational and the composer registers no drop handler. That is deliberate — the drop target in a chat is the thread — but it means the sheet's drag-over state only appears if the app wires it.",
    "While isDropActive with text already typed, the drop label does not appear: it is the placeholder, and a placeholder is hidden once the field has a value.",
    "The attachment tray's stacked/spread behaviour belongs to Thumbnail.Group; this component does not drive it from focus, which is what the sheet's Derived note describes.",
    "The file chip drawn in the sheet's tray (icon + name + meta + remove) exists nowhere as a component. It is passed in as a slot child today; the sheet flags it as Missing and shares it with Chat Message.",
    "The dictate control does not drop itself below 300px of content width — the sheet's rule is a caller-side breakpoint decision, and the composer has no width knowledge of its own.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2GWZ-0",
} as const;

export type ChatComposerDoc = typeof chatComposerDoc;
