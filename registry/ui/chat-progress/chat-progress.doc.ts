/** Typed documentation for ChatProgress (CONVENTIONS §11). */

export const chatProgressDoc = {
  name: "ChatProgress",
  status: "stable",
  summary:
    "What the agent shows between the question and the answer. Four escalating forms on one axis — thinking, activity, steps, measured — and one terminal pair: a receipt row when the work finishes, a failure line when it stops. Every form folds to the same receipt, which re-expands; the log is history, not chrome, and never disappears from the thread. It lives inside the receiver block at the thread's full width, above any partial answer — never a toast and never an overlay, because progress belongs to the turn that produced it.",

  anatomy: [
    { part: "root", slot: "chat-progress", notes: "role=\"status\", polite. Carries data-form and data-status (running | done | failed) so a consumer or a test can read the state without inspecting classes." },
    { part: "thinking", slot: "chat-progress-thinking", notes: "The lightest form: a 16px ring spinner and a body-sm 500 line in text-ink-muted. The spinner is replaced by the `icon` slot when a product has a mark of its own." },
    { part: "spinner", slot: "chat-progress-spinner", notes: "CSS, not a glyph — griddy has no spinner and check:icons forbids a private SVG. A full sunken track with a quarter arc in bg-accent-legible over it. motion-safe:animate-spin, so reduced motion holds the arc still rather than needing an override." },
    { part: "activities", slot: "chat-progress-activities", notes: "One pill per named source: bg-elevated, radius-md, px-md py-sm. The verb is label-md 600 in text-ink-secondary and never shrinks; the detail truncates with an ellipsis and never wraps." },
    { part: "steps", slot: "chat-progress-steps", notes: "A <ul>, indented ps-xl to the group header's text — grouping by space, never by a rule. Done steps carry a success CheckCircle 14; the current one carries the spinner and text-ink-secondary 500; pending steps sit in text-ink-muted behind a 14px border-default ring \u2014 the glyph tells done from pending, not the ink." },
    { part: "measured", slot: "chat-progress-measured", notes: "The Progress primitive at size sm with hasValueText — the sheet's label/percent row and 8px track exactly. Not hand-rolled: a bare track has no role=\"progressbar\", no aria-valuenow, and no reason to reach for --ui-bg-accent-legible." },
    { part: "summary", slot: "chat-progress-summary", notes: "The disclosure trigger — Base UI's Collapsible.Trigger. While a step list runs it is the group header (chevron, name, duration); once the run finishes it is the receipt (success glyph, \"Worked for N s · N steps\", chevron). One mechanism, two summary lines." },
    { part: "body", slot: "chat-progress-body", notes: "The Collapsible panel holding whichever form is in play. Present only when there is a disclosure — a thinking or measured run has nothing to fold." },
    { part: "failure", slot: "chat-progress-failure", notes: "Replaces the form: a danger CloseCircle 14, the reason in danger ink, and a ghost·sm Retry. The log above it stays." },
  ],

  composition: `
ChatProgress  form="thinking"   label!                              icon?
ChatProgress  form="activity"   activities!  [{ verb, detail }]
ChatProgress  form="steps"      label! steps! [{ id, label, status }]  duration?
ChatProgress  form="measured"   label! value!                        max?
   + isComplete? receiptText! expandLabel!    — folds any of the four to the receipt
   + errorText?  retryLabel? onRetryAction?   — replaces any of the four with the failure line
   + isOpen? defaultIsOpen? onOpenChange?     — the disclosure, controlled or not
  `.trim(),

  props: {
    form: {
      type: '"thinking" | "activity" | "steps" | "measured"',
      default: '"thinking"',
      notes: "The escalation axis, and a DISCRIMINATED union: `steps` without steps and `measured` without a value are the two shapes that would render an empty box, and both are compile errors. Which form to pick is the caller's — only the caller knows whether the total is known or how many fronts are running.",
    },
    activities: { type: "{ verb: string; detail: string }[]", notes: "The verb is a separate field because it never truncates and the detail always does; one string could not do both." },
    steps: { type: "{ id: string; label: string; status: \"done\" | \"current\" | \"pending\" }[]", notes: "Three statuses, three treatments. `id` rather than an index key: a step list re-orders as fronts complete." },
    isComplete: { type: "boolean", default: "false", notes: "Folds whatever form was in play to the receipt row. `receiptText` and `expandLabel` are required by the type alongside it — a disclosure with no line to show and no name for its control is two failures at once." },
    expandLabel: { type: "string", notes: "The receipt trigger's accessible name, rendered visually hidden. The receipt line says what happened; it does not say what the control does." },
    errorText: { type: "string", notes: "Replaces the form with the failure line. The log above it is history and stays in the thread." },
    isOpen: { type: "boolean", notes: "The disclosure, controlled. Uncontrolled through defaultIsOpen, which defaults to open while a step list runs and closed once the run finishes — the two states the sheet draws." },
    icon: { type: "ReactElement", notes: "Slot: replaces the thinking spinner. The concepts animate the product's logo mark here, which is a product asset rather than a library one." },
  },

  do: [
    "Pick the lightest form that tells the truth, and do not downgrade mid-run — a status that gets vaguer reads as the agent losing track.",
    "Use `measured` only when the total is known. A bar that cannot reach the end is worse than no bar.",
    "Leave the receipt in the thread when the run finishes. It is the record of what the agent did, and folding it is not the same as deleting it.",
    "Give every step a stable id — a step list re-orders as fronts complete, and an index key re-uses the wrong row's state.",
  ],

  dont: [
    "Do not put this in a toast or an overlay. Progress belongs to the turn that produced it; a floating spinner outlives the question it answers.",
    "Do not let an activity detail wrap. It truncates by design — a source title that wraps turns a one-line status into a paragraph.",
    "Do not hand-roll the measured bar. Progress carries role=\"progressbar\", aria-valuenow and the legible accent fill; a bare div carries none of them.",
    "Do not animate the thinking label. The sheet's shimmer sweep has no motion token yet, and a literal duration is what check:motion exists to refuse.",
  ],

  a11y: {
    role: "The root is role=\"status\" — a polite live region, so a reader who asked a question is told what is happening and told again when it stops. Never assertive: nothing here interrupts. The measured form nests a real role=\"progressbar\" inside it.",
    name: "The receipt trigger is named by `expandLabel` (required with isComplete). The step list is a <ul> of <li>, so a screen reader is given the count. Retry is a real Button with a required `retryLabel`.",
    keyboard: [
      { key: "Tab", does: "Reaches the disclosure trigger when there is one — a running step list, or a finished receipt. The other two forms have nothing to operate." },
      { key: "Enter / Space", does: "Toggles the disclosure. Base UI's Collapsible.Trigger is a real button; nothing is faked." },
      { key: "Tab (failed)", does: "Reaches Retry, which is a real button." },
    ],
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the thinking line, the receipt, and every step that is not the current one" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the step-list header and the current step" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "the activity verb, on its pill" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "the activity detail, on its pill" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-base", floor: "non-text", role: "the done glyph and the receipt glyph — the only channel saying a step finished (SC 1.4.11)" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the failure glyph and its line" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the spinner's arc against its track, and the measured fill against its own — the pair the legible accent role exists for" },
      { fg: "--ui-border-default", bg: "--ui-bg-base", floor: "decorative", role: "a pending step's empty ring", why: "ADR 0010 keeps border-default deliberately quiet, and this ring is a PLACEHOLDER for a glyph rather than a boundary anything depends on identifying — what says the step is pending is the absence of a mark inside it, read against the filled rings above" },
    ],
  },

  forwarding: {
    ref: "The outermost node. Nothing here is a form control, so §5's exception does not apply.",
    className: "The outermost node, so a width or a margin sizes the whole log.",
    "native props": "The remaining div props land on the same node. The form's own data — label, steps, activities, value — is destructured out deliberately: a stray `steps={[…]}` reaching the div would be serialised onto the DOM as an attribute.",
  },

  motion:
    "One animation: the spinner, `motion-safe:animate-spin`. It is a KEYFRAME and therefore outside the token layer's reduced-motion collapse, which is why the guard is on the safe side — the reduced-motion default is \"does not move\" rather than \"moves unless told otherwise\", and the quarter arc stays visible either way as the static cue §8 requires. The disclosure chevron rotates on duration-fast / ease-out — Accordion's recipe verbatim, `transition-[rotate]` and not `transform`, because v4 writes the standalone property and a transition naming `transform` would cover nothing; the panel's own height transition is Base UI's. The sheet's shimmer sweep across the thinking label is NOT built — no motion token describes it, and a literal is what check:motion refuses.",

  needsDesign: [
    "No motion token exists for the spinner's rotation period or for the thinking label's shimmer sweep. The sheet records this as Missing and names TODO's \"Replace skeleton/Default UI animation pattern\" as the same decision — it should be resolved once and shared with Skeleton, which pulses for the same reason.",
    "The failure line's Retry is drawn as a text-link; it ships as Button ghost · sm, matching Chat Message's retry and every other control in the library. Either the sheet moves to a button, or the library needs a link-styled action and should name it.",
    "The ~3 s escalation threshold and the \"a form never downgrades mid-run\" rule are the sheet's own readings of the references, not product decisions.",
    "The sheet draws the EXPANDED step header's chevron pointing down. Accordion's chevron — the library's only other disclosure — points down when closed and rotates up when open, and this component follows it. One of the two drawings should change; a system with two disclosure conventions has none.",
    "The spinner's stroke is derived: the sheet draws strokeWidth 3 in a 24 viewBox, which is 2px at 16 and 1.75px at 14, rounded here to the border widths that exist. If the ring is meant to be a fixed weight rather than a fixed ratio, say which.",
  ],

  knownGaps: [
    "The escalation itself is the caller's: this component renders the form it is given and never decides to move up the axis.",
    "A finished run's receipt re-expands to the form it was, which for `thinking` and `measured` is a single line — the sheet only ever draws the step list being re-expanded, so what a folded activity log should show is undecided.",
    "There is no per-step duration or per-step error; a step is one of three statuses and nothing else.",
    "Nested runs (a step that is itself a step list) are not modelled.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2HGF-0",
} as const;

export type ChatProgressDoc = typeof chatProgressDoc;
