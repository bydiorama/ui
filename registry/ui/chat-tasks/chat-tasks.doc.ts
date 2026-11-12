/** Typed documentation for ChatTasks (CONVENTIONS §11). */

export const chatTasksDoc = {
  name: "ChatTasks",
  status: "experimental",
  summary:
    "The plan the agent is working to — a list it writes, ticks off and revises across turns. Not Chat Progress: progress is the log of one turn and folds to a receipt; a task list is an object in the thread with a title, which the reader can read, approve and change, so it gets a container — the chat-widget card (bg-elevated, radius-lg, p-sm), reused rather than restyled. One list per thread is live, and a revision updates it in place: rows never reorder, a dropped task stays where it stood as Skipped, an added one says New. Four list statuses — proposed (numbered, with an approval footer and no disclosure), running, complete and stopped (each folding to a header whose glyph becomes the list's status). Six row statuses — done, current, pending, needs-you, failed, skipped. The plan never moves: the current task holds Working's key frame, because the turn's live edge is elsewhere.",

  anatomy: [
    { part: "root", slot: "chat-tasks", notes: "ChatWidget's own root — bg-elevated, radius-lg, p-sm, no border, no shadow — with gap-xs between header and rows where the widget's payloads sit at gap-sm. Carries data-status (proposed | running | complete | stopped). Running, complete and stopped render it AS the Collapsible root, so the card is the disclosure rather than containing one." },
    { part: "header", slot: "chat-tasks-header", notes: "32px, px-md, gap-sm, radius-md. Base UI's Collapsible.Trigger while the plan runs; a plain div while proposed. Hover is bg-hover — one step up from the card in both schemes — never bg-elevated, which is the card." },
    { part: "header-glyph", slot: "chat-tasks-header-glyph", notes: "The 16px lane. ListBulleted (text-muted) while open or proposed. Folded it becomes the list's status: the held Working matrix (running), CheckCircle in success (complete), MinusCircle in muted (stopped). data-glyph says which." },
    { part: "title", slot: "chat-tasks-title", notes: "label-md 600 in text-primary, truncating. Folded and running, it gives way to the current task's label; the plan's name stays in the trigger's accessible name, visually hidden." },
    { part: "count", slot: "chat-tasks-count", notes: "caption in text-muted, tabular-nums, never shrinks. Caller-worded: \"2 of 5\", \"5 of 5 · 3 min\", \"Stopped at 2 of 5\", \"2 of 5 · revised\", \"5 steps · about 3 min\"." },
    { part: "chevron", slot: "chat-tasks-chevron", notes: "ChevronDown 12, text-muted, rotating 180° while open — Accordion's and Chat Progress's recipe, and the direction the sheet draws. Absent while proposed." },
    { part: "panel", slot: "chat-tasks-panel", notes: "The Collapsible panel holding the list. Unmounted while folded." },
    { part: "list", slot: "chat-tasks-list", notes: "An <ol> — a plan is ordered, and a screen reader is given the count and each position. Flush: no fill, no divider." },
    { part: "row", slot: "chat-tasks-row", notes: "An <li>: a 16px glyph lane, the label, an optional trailing lane. 32px minimum, px-md, gap-sm. data-task-status names the row's status (or \"proposed\"); data-new marks an added task; the current row carries aria-current=\"step\"." },
    { part: "glyph", slot: "chat-tasks-glyph", notes: "The row's lane. done: CheckCircle, success. current: StatusMatrix status=\"working\" size=\"md\" isHeld. pending: a 16px border-default ring. needs-you: the same ring in the warning ink. failed: CloseCircle, danger. skipped: MinusCircle, muted." },
    { part: "ring", slot: "chat-tasks-ring", notes: "The empty status: a 16px circle at the hairline stroke. border-default for pending, border-warning for needs-you." },
    { part: "label", slot: "chat-tasks-label", notes: "body-sm. Ink follows the reader's interest: still-to-do is text-secondary, done and skipped recede to text-muted, current is text-primary. Needs-you is label-md (13px at 600) in text-primary. Failed shows the REASON here, in danger ink, on one line. No strikethrough anywhere — the glyph says done. Done, current and pending prefix a visually hidden status word from statusLabels." },
    { part: "activity", slot: "chat-tasks-activity", notes: "The current task's second line — caption in text-muted. The row aligns to its top and takes py-sm when it is present." },
    { part: "trailing badges", slot: "badge", notes: "Badge, not a lookalike: warning·sm with needsYouLabel on a needs-you row, info·sm with newLabel on a task added in a revision." },
    { part: "note", slot: "chat-tasks-note", notes: "A skipped row's trailing caption in text-muted — \"Skipped\", or \"Skipped — you asked for feed only\"." },
    { part: "retry", slot: "chat-tasks-retry", notes: "Button ghost·sm in a failed row's trailing lane. The row gives back pe-xs for it, as the sheet draws." },
    { part: "index", slot: "chat-tasks-index", notes: "Proposed only: the 1-based position in the glyph lane — caption, tabular, right-aligned in 16px. aria-hidden, because the <ol> already announces each position." },
    { part: "drop", slot: "chat-tasks-drop", notes: "Proposed only, when onDropAction is passed: Button ghost·sm isIconOnly with Close, named per row by getDropLabel. Revealed on row hover AND on focus-within, and always shown on a device with no hover. The row takes a bg-hover fill under the pointer only when it can be dropped." },
    { part: "footer", slot: "chat-tasks-footer", notes: "Proposed only: px-sm pt-sm pb-xs, gap-sm. Button primary·md (runLabel), Button secondary·md (changeLabel, optional), and a muted caption pushed to the trailing edge (footnote, optional)." },
  ],

  composition: `
ChatTasks  status="proposed"                    label! count! tasks! [{ id, label }]
   runLabel! onRunAction!                       — the footer's one filled action
   + changeLabel? onChangeAction?               — together or not at all
   + getDropLabel? onDropAction?                — hover-revealed Close per row, together or not at all
   + footnote?

ChatTasks  status="running" | "complete" | "stopped"
   label! count! statusLabels! { done, current, pending }
   tasks! [{ id, label, status, …words the status needs, isNew? newLabel? }]
     status="done"
     status="current"   activity?
     status="pending"
     status="needsYou"  needsYouLabel!
     status="failed"    reason!   + retryLabel? onRetryAction?
     status="skipped"   skippedLabel!
   + isOpen? defaultIsOpen? onOpenChange?       — the disclosure, controlled or not
  `.trim(),

  props: {
    status: {
      type: '"proposed" | "running" | "complete" | "stopped"',
      required: true,
      notes: "Behavioural, so required (§2). A DISCRIMINATED union: proposed takes ChatProposedTask[] and the approval props and has no disclosure; the other three take ChatTask[] and statusLabels. A plan that FINISHES while mounted asks to fold — uncontrolled it folds, controlled the parent is told through onOpenChange(false) and decides. Nothing else folds it.",
    },
    label: { type: "string", required: true, notes: "The plan's name. `label` rather than `title`, which a div already has as a tooltip, and the word ChatProgress uses for a step group's name." },
    count: { type: "string", required: true, notes: "Already worded, because the words change by status and by locale. It counts the tasks that still count — a dropped task is Skipped where it stood and leaves the total: 2 of 5, not 2 of 6." },
    tasks: { type: "ChatTask[] | ChatProposedTask[]", required: true, notes: "Rendered in the order given, and the caller keeps that order stable across revisions — rows never reorder under the reader. Each task's `id` is the React key: a revised plan re-uses rows by id, and an index key would hand one task's state to another." },
    "ChatTask (failed)": { type: "{ reason: string; retryLabel?: string; onRetryAction?: () => void }", notes: "`reason` REPLACES the label on screen, in danger ink, on one line — write it so it names the task. The label is still read out first, visually hidden. A retry is a handler and a name together, never one of the two." },
    "ChatTask (needsYou | skipped)": { type: "needsYouLabel: string | skippedLabel: string", notes: "The words those rows show. Required by the type — a warning badge or a trailing note with nothing in it is a status nobody has said." },
    "ChatTask.isNew": { type: "boolean", notes: "With `newLabel`, required alongside it. Whether a task is still new is the thread's fact (the sheet: until the next turn), so the caller sets and clears it." },
    statusLabels: { type: "{ done: string; current: string; pending: string }", notes: "Required once the plan runs. Done, current and pending are told apart by glyph and ink only, and neither reaches a screen reader (SC 1.3.1); each row prefixes its visually hidden word. The other three statuses already carry visible words." },
    getDropLabel: { type: "(task: ChatProposedTask) => string", notes: "One accessible name PER ROW for the icon-only Close. A single string would give eight buttons the same name, indistinguishable in a screen reader's list of controls; only the caller can word \"Drop 'Cut a 9:16 Story version'\"." },
    isOpen: { type: "boolean", notes: "The disclosure, controlled. Uncontrolled through defaultIsOpen, which defaults to open — except complete, which mounts folded." },
  },

  do: [
    "Keep ONE live list per thread, and update it in place when the plan changes. Re-posting it lower down leaves two plans in the thread that disagree.",
    "Leave a dropped task where it stood as Skipped, and mark an added one New until the next turn. Rows never reorder under the reader.",
    "Count only the tasks that still count in the header — 2 of 5 after a drop, not 2 of 6.",
    "Write a failed task's reason so it names the task — it is the row's only visible line.",
    "Let the turn's live edge be the only moving StatusMatrix. This component holds its own; never pass it a moving one.",
  ],

  dont: [
    "Do not use this for one turn's log. That is ChatProgress, which folds to a receipt; a plan is an object that outlives the turn.",
    "Do not strike through a done task. The glyph says done; a strikethrough makes the record of what happened harder to read.",
    "Do not fold a proposed plan. It has no disclosure on purpose: the person who has to approve it must see it.",
    "Do not restyle the card. It is ChatWidget's surface; a second elevated card drifts from the first.",
  ],

  a11y: {
    role: "Plain content in a card. The plan is an <ol> of <li>, so a screen reader is given the count and each position; the current row carries aria-current=\"step\". No live region: re-announcing a whole list on every tick is noise, so what a change should say aloud is the caller's (see knownGaps).",
    name: "The disclosure trigger is named by its visible text — the title (or, folded and running, the current task with the plan's name before it, visually hidden) and the count — and states aria-expanded. Retry, Run, Change and each Close are real Buttons; Close is named per row by getDropLabel.",
    keyboard: [
      { key: "Tab", does: "Reaches the header while the plan runs, then any Retry in the open list. While proposed: each row's Close (when dropping is offered — revealed as it takes focus), then Run and Change." },
      { key: "Enter / Space", does: "Toggles the disclosure on the header — Base UI's Collapsible.Trigger, a real button. Activates any other control." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the title, the current task, a needs-you task" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "tasks still to do, and every proposed task" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "done and skipped tasks, the count, the activity line, the skipped note, the proposed index, the footnote, the list and chevron glyphs" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-elevated", floor: "text", role: "a failed task's reason — text in the danger ink, and the CloseCircle beside it" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-elevated", floor: "non-text", role: "the done glyph and the folded complete header's glyph — the only channel saying a task finished besides the hidden status word (SC 1.4.11)" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-bg-elevated", floor: "non-text", role: "a needs-you task's ring" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-elevated", floor: "non-text", role: "a Lit dot of the held Working matrix on the current task and the folded running header" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the title under a hovered header" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-hover", floor: "text", role: "a proposed task under a hovered row" },
      { fg: "--ui-text-muted", bg: "--ui-bg-hover", floor: "text", role: "the count and index under a hover" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-hover", floor: "non-text", role: "the held matrix in a hovered folded running header" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-hover", floor: "non-text", role: "the CheckCircle in a hovered folded complete header" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-intent-warning-bg", floor: "text", role: "the Needs you badge (Badge warning)" },
      { fg: "--ui-intent-info-fg", bg: "--ui-intent-info-bg", floor: "text", role: "the New badge (Badge info)" },
      { fg: "--ui-border-default", bg: "--ui-bg-elevated", floor: "decorative", role: "a pending task's empty ring", why: "the ring is a PLACEHOLDER for a glyph rather than a boundary anything depends on identifying — what says the task is pending is the absence of a mark inside it, read against the filled glyphs around it, and the visually hidden status word says it in words. Chat Progress's pending ring makes the same argument on the page" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the card against the page", why: "ChatWidget's own grouping fill. What makes the plan an object is its title, its count and its list, none of which needs the step to be measurable — the argument ChatWidget and the sender bubble already make" },
      { fg: "--ui-bg-hover", bg: "--ui-bg-elevated", floor: "decorative", role: "the hover fill on the header and on a droppable proposed row", why: "a hover state is pointer feedback, not information: the cursor change and, on a row, the revealed Close are what it announces, and focus has its own outline" },
    ],
  },

  forwarding: {
    ref: "The outermost node — the card. Nothing here is a form control, so §5's exception does not apply.",
    className: "The outermost node, merged after the card's own gap-xs, so a width or a margin sizes the whole card.",
    "native props": "The remaining div props land on the same node. The plan's own data — label, count, tasks, statusLabels and the handlers — is destructured out deliberately: a stray `tasks={[…]}` reaching the div would be serialised onto the DOM as an attribute. `title` is omitted from the accepted props because `label` is the plan's name.",
  },

  motion:
    "Almost none, deliberately — the plan never moves. The current task and the folded running header hold StatusMatrix's Working key frame (`isHeld`), because only the turn's live edge animates and that edge is elsewhere; a held matrix subscribes to no clock. The header's hover fill transitions background-color on duration-fast / ease-out (motionMicro). The chevron rotates on the same timing — `transition-[rotate]`, not `transform`, because v4 writes the standalone property. A droppable proposed row fades its hover fill and its Close in on motionMicro too, opacity rather than mounting so the tab order never changes. The panel opens and closes without a height animation, as Chat Progress's does. All of it collapses under prefers-reduced-motion at the token layer.",

  needsDesign: [
    "A failed row's line: the sheet draws one string, \"the reason, in one line\", and no task label. Shipped as the reason REPLACING the label on screen, with the label read out first for a screen reader. If the label should stay visible with the reason beside or under it (as Chat Progress's failed step does), the row needs a second line or a separator the sheet does not draw.",
    "Type weights follow the role table, not the sheet: done, pending and skipped labels render at body-sm's 500 (the sheet sets no weight), and the count and activity at caption's 600 (the sheet draws 400). The needs-you label is label-md — the role that is 13px at 600 — instead of body-sm with a weight override, so no type-role exception is needed.",
    "Off-scale: the sheet puts 2px between the current task's label and its activity line. There is no 2px space token; the role leadings (17.55 + 16.2 inside py-sm) land the row at 49.75px against the sheet's 50, so the gap is dropped rather than invented.",
    "The trailing lane has no width rule. A long skipped note (\"Skipped — you asked for feed only\") never shrinks and squeezes the label; the sheet draws it at 548px where it fits. Truncation, a cap, or wrapping under the label is undecided.",
    "\"New\" lasting until the next turn and \"one live list per thread\" are the sheet's own readings (Gaps · thresholds), not product decisions.",
  ],

  knownGaps: [
    "Not a live region. A tick, a failure or a needs-you is not announced; a caller that needs one says it in its own polite region — Chat Progress's role=status is the model.",
    "The header count and its words are the caller's: the component does not count tasks, because \"2 of 5 · revised\" and \"Stopped at 2 of 5\" are sentences, not arithmetic.",
    "Folded and running, the title gives way to the FIRST task whose status is current; a plan with none (waiting on a needs-you, say) keeps its own title.",
    "Nothing below 343px is drawn; the sheet's Gaps row lists size sm, a list longer than the viewport and focus-visible on task rows as not drawn. Rows are not focusable here, so the last is moot until a row gains an action.",
    "Reordering a proposed plan is not built — the sheet offers drop and \"Change it\", not drag.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3ZRD-0",
} as const;

export type ChatTasksDoc = typeof chatTasksDoc;
