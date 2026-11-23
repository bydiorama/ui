/** Typed documentation for ChatProgress (CONVENTIONS §11). */

export const chatProgressDoc = {
  lead: "Shows what an agent is doing as the work unfolds.",
  name: "ChatProgress",
  status: "stable",
  summary:
    "What the agent shows between the question and the answer. Three LIVE-EDGE forms — waiting, thinking, streaming — are one status row with one Status matrix; four RUN forms — activity, steps (a thought chain), parallel (the chain forked into lanes) and measured — escalate from there. Thinking opens into its reasoning. A fifth kind of line, `typing`, is not progress at all but PEOPLE's presence — \"Wim is typing\" in muted ink — and it is placed on the composer's top edge, never in the thread. Every form is laid on the same lanes (node 16 · text edge 24 · clock 40 · chevron 16), which is why reasoning, a chain and lanes nest without a new indent. A finished run folds to one receipt that re-expands; a failure or a stop ends the line in place. It lives inside the receiver block at the thread's full width, above any partial answer — never a toast and never an overlay, because progress belongs to the turn that produced it.",

  anatomy: [
    { part: "root", slot: "chat-progress", notes: "role=\"status\", polite. Carries data-form and data-status (running | done | failed | stopped)." },
    { part: "status row", slot: "chat-progress-thinking", notes: "The live edge: a 16px StatusMatrix (waiting, thinking or streaming), a body-sm muted line, an optional clock (a MINIMUM 40px, because a long wait reads \"1 min 12 s\") and an optional Stop. Failing or stopping re-renders THIS row — slot `chat-progress-failure` once failed — so the same matrix draws its ending in place. The `icon` slot replaces the matrix with a product's own mark." },
    { part: "presence row", slot: "chat-progress-presence", notes: "form=\"typing\" only: the Typing matrix at 16px in MUTED ink (a person, never the agent's accent), gap-sm, then one caption line in muted ink — `who` in `chat-progress-presence-who`, which truncates, then the verb, which never does (40CC, 40E1). No clock, no Stop, no receipt, no disclosure." },
    { part: "root row", slot: "chat-progress-summary", notes: "A running run's root, and the disclosure trigger: the run's glyph in the node lane (Thinking or Working matrix, 16), its name in label-md 600 secondary, an optional muted `meta` (\" · 1 done\"), the clock lane and the chevron slot at the trailing end. Once the run ends it is the RECEIPT instead: CheckCircle in success ink, AlertTriangle in warning ink when any node failed, MinusCircle muted when stopped — 16px — then the receipt line and the chevron. Hover takes the receipt's ink to secondary, no fill." },
    { part: "node lane", slot: "chat-progress-node", notes: "A 16px column: the glyph, and below it the rail — 1px of border-default at x 8–9, stopping 4px clear of the glyph above and the one below." },
    { part: "reasoning", slot: "chat-progress-reasoning", notes: "The thought, hanging from the root at the 24px text edge with the rail at its full height. Running: capped at five lines (`5lh` of body-sm, plus 4px), anchored to the bottom, with a 24px Fade to bg-base at the top. Done: the whole text, paragraphs at gap-sm, body-sm muted. aria-live=off — see a11y." },
    { part: "steps", slot: "chat-progress-steps", notes: "A <ul> of `chat-progress-step`: node lane, then the label (body-sm; current = secondary 500, failed = danger 500, else muted), the clock lane, an EMPTY chevron slot so every clock aligns, and under the label its chips (6px below) or prose (4px below; label-sm, stopping 64px short of the trailing edge). space-md under a step." },
    { part: "branch", slot: "chat-progress-branch", notes: "A nested step leaves the rail on a tick — 11px at the first line's centre, 4px short of its 14px glyph — so its label starts at 46, not at a second indent. space-sm under a branch. The rail runs on past the last branch to the next node, or ends at the last tick when nothing follows." },
    { part: "chip", slot: "chat-progress-chip", notes: "bg-elevated, radius-sm, 6px × 2px, label-sm muted, an optional 12px kind glyph; chips wrap at gap-xs." },
    { part: "lanes", slot: "chat-progress-lanes", notes: "The spine forked: every lane a branch on a tick at its pill's centre line (16), the rail ending at the last. Each `chat-progress-lane` is a 32px pill — bg-elevated, radius-md, px-md — with a 14px glyph, a 104px name lane (label-md 600; it never truncates), the activity (flexes, always truncates), the clock and the chevron slot. A lane with its own `steps` opens to that chain inside the pill (py-sm), on the same lanes one level in. The root sits pe-md so its clock lines up over the lanes'." },
    { part: "activities", slot: "chat-progress-activities", notes: "One pill per named source: bg-elevated, radius-md, px-md py-sm. The verb is label-md 600 in text-ink-secondary and never shrinks; the detail truncates and never wraps." },
    { part: "measured", slot: "chat-progress-measured", notes: "The Progress primitive at size sm with hasValueText. Not hand-rolled: a bare track has no role=\"progressbar\", no aria-valuenow, and no reason to reach for --ui-bg-accent-legible." },
    { part: "body", slot: "chat-progress-body", notes: "The Collapsible panel under the root row." },
  ],

  composition: `
ChatProgress  form="typing"     who!  label!  isHeld?                 — presence, on the composer's top edge
ChatProgress  form="waiting" | "streaming"  label!                      duration?
ChatProgress  form="thinking"   label!  reasoning?: string[]          duration?  icon?
ChatProgress  form="activity"   activities!  [{ verb, detail }]
ChatProgress  form="steps"      label!  steps!                        duration?
  step        { id, label, status: done | current | pending | failed,
                icon? (kind glyph), duration?, chips?, detail?,
                retryLabel + onRetryAction (failed only),
                steps?: branch[] }            — branches one level deep
ChatProgress  form="parallel"   label!  lanes!  meta?                 duration?
  lane        { id, name, activity, status, duration?, steps?, retry (failed only) }
ChatProgress  form="measured"   label!  value!  max?
   + isHeld?                                   — the live edge is elsewhere in the turn
   + isComplete? receiptText! expandLabel!     — fold to the receipt
   + errorText?  retryLabel? onRetryAction?    — the failure line, drawn in place
   + stoppedText?                              — the user stopped it
   + stopLabel? onStopAction?                  — Stop, offered on a long wait
   + isOpen? defaultIsOpen? onOpenChange?      — the disclosure, controlled or not
  `.trim(),

  props: {
    form: {
      type: '"typing" | "waiting" | "thinking" | "streaming" | "activity" | "steps" | "parallel" | "measured"',
      default: '"thinking"',
      notes: "A DISCRIMINATED union: `steps` without steps, `parallel` without lanes and `measured` without a value would render an empty box, and each is a compile error. Which form — and, when several are true at once, which one holds the edge (run › thinking › streaming › waiting) — is the caller's, because only the caller knows what the run is doing. `typing` sits outside that order: presence is a different fact from progress, so it never competes for the turn's live edge — and the type refuses every run prop on it (clock, receipt, Stop, Retry, failure, disclosure, icon).",
    },
    who: { type: "string", notes: "Typing only, and required there. Who is typing, already formatted: two are named (\"Josef and Wim\"), three or more are counted (\"3 people\") — ONE presence line, never one per person. It truncates first, so the longest name gives way before `label` (the verb) does." },
    reasoning: { type: "string[]", notes: "Thinking only. One string per paragraph. Turns the status row into a root with the thought hanging from it." },
    steps: { type: "ChatProgressStep[]", notes: "`id` rather than an index key: a chain re-orders as fronts complete. A finished step shows its `icon` — the KIND glyph (Search, FileText, Sparks) — or CheckCircle without one; a running one the Working matrix; a pending one an empty ring; a failed one CloseCircle in danger ink. Retry is typed onto failed nodes only." },
    lanes: { type: "ChatProgressLane[]", notes: "Lanes keep their order for the whole run. A failed lane keeps its failure in its lane: danger glyph, the reason as its activity, Retry across the clock and chevron lanes." },
    meta: { type: "string", notes: "Parallel only: the muted count after the root's name — \"1 done\"." },
    duration: { type: "string", notes: "Already formatted. The caller owns the clock: a status row shows it once a wait passes 5 s, a run's root throughout." },
    isHeld: { type: "boolean", default: "false", notes: "Holds every matrix here on its key frame. One thing moves per TURN; when that is a task card or the streaming line below, this run holds. WITHIN the component the rule is applied for you: in a chain only the deepest running node moves and its parents hold; in lanes only the root moves; folded mid-run, the root keeps the moving matrix." },
    isComplete: { type: "boolean", default: "false", notes: "Folds the run to its receipt. `receiptText` and `expandLabel` are required alongside it. A run that finishes while mounted folds on its own unless the disclosure is controlled — \"the moment the first token lands\"." },
    expandLabel: { type: "string", notes: "The receipt trigger's accessible name, visually hidden. The receipt line says what happened; it does not say what the control does." },
    errorText: { type: "string", notes: "The run failed. The status line becomes the failure line; the matrix draws its Failed cross in place." },
    stoppedText: { type: "string", notes: "The user stopped it. A one-line form draws the matrix's Stopped square in place; a run with a body folds to a receipt with MinusCircle." },
    onStopAction: { type: "() => void", notes: "With `stopLabel`. Offered in the status row once a wait passes 30 s — the caller decides when." },
    icon: { type: "ReactElement", notes: "Slot: replaces the thinking matrix. A product mark is a product asset, not a library one." },
  },

  do: [
    "Pick the lightest form that tells the truth, and never downgrade mid-run — a status that gets vaguer reads as the agent losing track.",
    "Keep ONE live edge per turn. When the answer starts streaming under a run, the run outranks it; when the run is folded and text resumes, pass `isHeld` here and let the streaming row move.",
    "Give each step its kind glyph. A finished chain should read as a list of what was DONE — searched, read, compared — not a column of identical checks.",
    "Keep the receipt in the thread. Folding is not deleting; it is the record of what the agent did.",
  ],

  dont: [
    "Do not draw the thinking line and a typing indicator together while text streams. The sheet calls that a defect in the consumer, not a state.",
    "Do not put a `typing` line in the thread. Presence belongs on the composer's top edge, in muted ink — it is a different fact from progress, and in the thread it would meet the agent's accent matrix.",
    "Do not draw one presence line per person. One line: two named, three or more counted.",
    "Do not put this in a toast or an overlay. Progress belongs to the turn that produced it.",
    "Do not hand-roll the measured bar. Progress carries role=\"progressbar\", aria-valuenow and the legible accent fill.",
  ],

  a11y: {
    role: "The root is role=\"status\" — polite, so a reader who asked a question is told what is happening and told again when it stops. The reasoning body is aria-live=off: the root's line already says \"Thinking\", and a polite region re-reading every streamed sentence of thought would drown it; the finished thought is reachable by re-opening the receipt. The measured form nests a real role=\"progressbar\". Every matrix is decorative (aria-hidden): the line beside it says the state in words, so shape and motion are never the only channel (1.4.1).",
    name: "Every trigger is a real button: the receipt named by `expandLabel`; a running root by its label and clock; a lane by its name and activity. Retry and Stop are Buttons with required labels. The chain is <ul>/<li> with branches in a nested <ul>, so the count is announced.",
    keyboard: [
      { key: "Tab", does: "Reaches the root's disclosure, then any lane that opens, then any Retry or Stop." },
      { key: "Enter / Space", does: "Toggles the focused disclosure. Base UI's Collapsible.Trigger; nothing is faked." },
    ],
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "status lines, the receipt, finished and pending steps, chips' ink, prose, the clock, the presence line and its Typing dots" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the root's name and the running step" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "a lane's name and the activity verb, on their pills" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "a lane's activity, a chip's label, the activity detail" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-base", floor: "non-text", role: "the done check and the receipt — the only channel saying it finished (SC 1.4.11)" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-elevated", floor: "non-text", role: "a done lane's check, on its pill" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-bg-base", floor: "non-text", role: "the receipt's AlertTriangle when a step failed" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "a failed step's cross and label, and the failure line" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-elevated", floor: "text", role: "a failed lane's cross and reason, on its pill" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "a Lit dot of the live matrix" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-elevated", floor: "non-text", role: "a running lane's held Working matrix, on its pill" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the measured fill against its track" },
      { fg: "--ui-border-default", bg: "--ui-bg-base", floor: "decorative", role: "the rail, the ticks and a pending node's empty ring", why: "ADR 0010 keeps border-default deliberately quiet. The rail and ticks are structure the indentation already states; the ring is a PLACEHOLDER whose meaning is the absence of a mark inside it, read against the filled glyphs around it" },
    ],
  },

  forwarding: {
    ref: "The outermost node. Nothing here is a form control, so §5's exception does not apply.",
    className: "The outermost node, so a width or a margin sizes the whole log.",
    "native props": "The remaining div props land on the same node. The form's own data — label, who, steps, lanes, reasoning, meta, duration, value — is destructured out deliberately: a stray `steps={[…]}` reaching the div would be serialised onto the DOM.",
  },

  motion:
    "Every moving thing is a StatusMatrix, on its one shared clock (see StatusMatrix's motion note), and at most one of them moves: the deepest running node of a chain, the root of a parallel or folded run, the thinking root, or the status row — and none when `isHeld`. Reduced motion is StatusMatrix's: the key frame, no clock. The disclosure chevrons rotate on duration-fast / ease-out — `transition-[rotate]`, not `transform`, because v4 writes the standalone property; the panel's height is Base UI's. The receipt's hover is a colour transition. The CSS ring spinner of the first release is gone.",

  needsDesign: [
    "The sheet's live-edge table draws Waiting as a matrix with NO words. Here every status row has its line, because a role=status whose only change is a dot pattern announces nothing and carries the state by shape alone (1.4.1). Draw the words, or name where the announcement comes from.",
    "Two drawings for one stop: the edge-cases card ends a status row with the matrix's Stopped square, and the Reasoning sheet's folded root uses MinusCircle. Built as: a one-line form ends in the matrix (the live line drawing its own ending), a run with a body folds to the MinusCircle receipt. Confirm that is the rule.",
    "The sheet's line heights are not the type roles'. It sets rows at 16px and prose at 18px (label-sm) and 20px (body-sm); the roles carry 1.35 / 1.3 leading (17.55px for body-sm), and ADR 0020 §3 — enforced on every story — forbids overriding a role's leading. So rows are 17.55px tall over a 16px node lane, and the reasoning cap is five lines of the ROLE (`5lh`, ≈88px) rather than the sheet's 100. Either the sheet adopts the roles' leading, or a looser reading role is a token decision. The same leading makes a parallel lane 33.55px rather than the sheet's 32: the sheet gets its 8px block inset from a fixed height, the render declares `py-sm` (ADR 0019), so the lane is exactly the activity pill's box — which is the relationship the test asserts.",
    "The ~5 s clock and ~30 s Stop thresholds and the 'a form never downgrades' rule are the sheet's readings, not product decisions — and they are the caller's to apply.",
  ],

  knownGaps: [
    "The escalation and the precedence between forms are the caller's: this component renders the form it is given and never moves up the axis on its own.",
    "Branches go one level deep. The lanes have a text edge for a branch and none for a branch's branch; deeper work is a lane that opens to its own chain.",
    "The background-run dock lives in ChatRunDock and the queued sender caption is ChatMessage's. Presence is `form=\"typing\"` here, but PLACING it on the composer's top edge is the caller's: ChatComposer has no slot for it yet.",
    "A lane's open state is internal and uncontrolled. Nothing on the sheet needs a parent to open a lane; say so if a product does.",
    "Retry on the failure line, on a step and on a lane ships as Button ghost · sm. The sheet draws it as bare text in the step's clock lane, 24px tall over a 16px row; built with `-my-xs` so the row keeps its height.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3Z89-0",
} as const;

export type ChatProgressDoc = typeof chatProgressDoc;
