/** Typed documentation for ChatRunDock and ChatRunMark (CONVENTIONS §11). */

export const chatRunDockDoc = {
  lead: "Keeps a running task and its controls in view.",
  name: "ChatRunDock",
  status: "experimental",
  summary:
    "Work that outlives its turn — a render, an export, a long research pass — while the conversation carries on. Two parts. ChatRunDock sits above the composer, tucked behind its pill: one 32px row per run with a 14px StatusMatrix, the run's name, what it is doing, a clock and Stop. ChatRunMark is the run's line in the thread: where it started, and — when the dock row goes — how it ended (finished with the result's action, failed with Retry, or stopped). Not a toast and not an overlay: the dock is part of the composer's block and scrolls nowhere.",

  anatomy: [
    { part: "root", slot: "chat-run-dock", notes: "A <div role=\"region\"> named by the required aria-label. bg-elevated, radius-lg, p-xs, and inset mx-xl — space-xl each side of the composer's pill, so it reads as tucked behind it. className, ref and native props land here (§5). data-held while the matrices are held. Renders nothing when `runs` is empty." },
    { part: "list", slot: "chat-run-dock-list", notes: "A <ul>, so a screen reader announces how many runs are going." },
    { part: "row", slot: "chat-run-dock-row", notes: "An <li>, 32px, ps-md pe-xs, gap-sm. data-measured when the run carries a value." },
    { part: "matrix", slot: "status-matrix", notes: "StatusMatrix size sm (14px): Progress at value/max when the run is measured, Working when it is not. Decorative — the activity line says the state in words. Held while `isHeld`." },
    { part: "name", slot: "chat-run-dock-name", notes: "label-md 600, text-ink-secondary, natural width. Shrinks and truncates only as a last resort, after the activity has nothing left." },
    { part: "activity", slot: "chat-run-dock-activity", notes: "body-sm, text-ink-muted. Takes the free space and truncates to one line with an ellipsis — it never wraps." },
    { part: "clock", slot: "chat-run-dock-clock", notes: "caption, text-ink-muted, tabular figures, right-aligned in a fixed 40px lane — the parallel lane's clock — so clocks stack and a ticking one never nudges the row. The lane stays when `elapsed` is absent." },
    { part: "stop", slot: "chat-run-dock-stop", notes: "Button ghost · sm · icon-only (24px, radius-sm) with SquareRounded. Named per run by `stopLabel(run)`. Present only when `onStopAction` is." },
    { part: "mark", slot: "chat-run-mark", notes: "ChatRunMark root: one line, min-h-8, gap-sm, on the root's metrics. data-kind is started | finished | failed | stopped." },
    { part: "mark glyph", slot: "chat-run-mark-glyph", notes: "16px. ArrowUpRight muted (started), CheckCircle success (finished), CloseCircle danger (failed), MinusCircle muted (stopped). aria-hidden: the line says it." },
    { part: "mark text", slot: "chat-run-mark-text", notes: "body-sm. Muted for started and stopped, text-ink-secondary for finished (label at 600), danger for failed. `detail` follows the label after a middot." },
    { part: "mark action", slot: "chat-run-mark-action", notes: "Finished only: Button secondary · md — the result's action (\"Open\")." },
    { part: "mark retry", slot: "chat-run-mark-retry", notes: "Failed only: Button ghost · sm — Chat Progress's failure-line Retry." },
  ],

  composition: `
Composer block (caller-owned)      flex flex-col gap-xs
├─ ChatRunDock                     runs! aria-label! isHeld? onStopAction?+stopLabel?
│  └─ row × runs                   matrix · name · activity · clock · Stop
└─ ChatComposer

Thread (caller-owned)
├─ …the turn that launched it
├─ ChatRunMark  kind="started"     label!
├─ …the conversation carries on
└─ ChatRunMark  kind="finished"    label! detail? actionLabel?+onAction?
   ChatRunMark  kind="failed"      label! detail? retryLabel?+onRetryAction?
   ChatRunMark  kind="stopped"     label! detail?

A run ending: drop it from \`runs\` and append its ending mark to the thread, in the same update.
  `.trim(),

  props: {
    runs: { type: "ChatRun[] — { id; name; activity; elapsed?; value?; max? }", required: true, notes: "One row per run. `value` present makes the row's matrix a Progress meter at value/max (default max 100); absent, it is Working — a run that cannot say how far it is never pretends to. `elapsed` is preformatted (\"1:48\"); the component owns no clock. An empty list renders nothing, so the composer's block collapses back to the composer alone." },
    "aria-label": { type: "string", required: true, notes: "The region's name — \"Background runs\". Required by the type: an unnamed region is a landmark nobody can tell apart." },
    isHeld: { type: "boolean", default: "false", notes: "Hold every row's matrix on its key frame. Set it while the thread has a live edge; clear it when the thread is idle, so the dock ticks only then — one moving thing on the page at a time (Chat Progress sheet, 01 Live edge, \"Two regions, one motion\"). Which matrix is the live edge is a fact about the whole page, which no single component can see, so the caller decides. Even unheld, only the FIRST row moves; every other row holds its key frame — one live matrix per region (Status matrix sheet), so three runs are still one moving thing." },
    onStopAction: { type: "(id: string) => void", notes: "Called with the run's id. Comes with `stopLabel` or not at all (a union). The caller removes the run from `runs` when it has actually stopped; the dock moves focus to the neighbouring Stop when the row goes." },
    stopLabel: { type: "(run: ChatRun) => string", notes: "Each Stop's accessible name — \"Stop Rendering Story cuts\". A function of the run, because three buttons all called \"Stop\" in one region cannot be told apart (SC 2.4.6)." },
    "ChatRunMark.kind": { type: '"started" | "finished" | "failed" | "stopped"', required: true, notes: "Discriminates what the mark may carry: only finished takes `actionLabel`+`onAction`, only failed takes `retryLabel`+`onRetryAction`. A retry on a finished mark, or an action without its name, does not compile." },
    "ChatRunMark.label": { type: "string", required: true, notes: "The line in words that say the outcome — the glyph and its ink are never the only channel (SC 1.4.1). Bold on a finished mark." },
    "ChatRunMark.detail": { type: "string", notes: "Follows the label after a middot — \"3 files · 2 min 6 s\"." },
  },

  do: [
    "Put the dock in the composer's block, directly above the composer with gap-xs between — it follows the reader down the thread because the composer does.",
    "Hold the dock's matrices (`isHeld`) whenever the thread has a live edge, and let them tick only when it is idle.",
    "Give every run a stable id: rows re-order and leave as runs finish.",
    "When a run ends, drop its row and append its ending mark to the thread in the same update — the record moves, it does not vanish.",
    "Leave a `started` mark in the turn that launched the run, so that turn keeps its record.",
  ],

  dont: [
    "Do not float the dock over the thread or announce runs as toasts. Background work belongs to the composer's block and to the thread, not to a layer over both.",
    "Do not set `value` from a guess. A meter that cannot reach the end is worse than Working.",
    "Do not let two regions move at once: a dock ticking under a streaming answer competes for the same glance.",
    "Do not name every Stop \"Stop\".",
    "Do not render two docks with the same aria-label on one page — two regions with one name are one landmark nobody can tell apart (axe landmark-unique caught it in this item's own stories). One composer, one dock.",
  ],

  a11y: {
    role: "The dock is a named region (role=region, aria-label required) holding a list, so its runs are reachable as a landmark and counted. Its matrices are decorative (aria-hidden); the activity line carries the state in words. A mark is a line of text — its glyph is aria-hidden and its words say the outcome.",
    name: "Dock: `aria-label`. Each Stop: `stopLabel(run)`. A mark's action and Retry are labelled buttons.",
    focus: "Stop ends a run and its row leaves with the focused button. The dock remembers the index at the click and, when the row actually goes, moves focus to the Stop now at that index (or the last one) — but only if focus was lost, so a reader who has moved on is not pulled back. Stopping the LAST run unmounts the dock; moving focus to the composer is the caller's (see knownGaps).",
    keyboard: [
      { key: "Tab", does: "Moves through each row's Stop, then out of the dock. Rows themselves are not focusable — they are output." },
      { key: "Enter / Space", does: "On a Stop: calls onStopAction(id). On a mark's action or Retry: calls its handler." },
    ],
    contrastPairs: [
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "a dock row's name, and the Stop glyph" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "a dock row's activity and clock" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-elevated", floor: "non-text", role: "a Lit dot of a dock row's matrix" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", why: "The dock's fill is a lift, not a boundary: nothing depends on finding its edge — its rows are text and named buttons, and it sits against the composer's own pill." },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "started and stopped marks, glyph and line" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "a finished mark's line" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-base", floor: "non-text", role: "the finished mark's CheckCircle" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "a failed mark's line and CloseCircle" },
    ],
  },

  forwarding: {
    className: "ChatRunDock: root (the region). ChatRunMark: root.",
    ref: "root — an HTMLDivElement for both; there is no single inner control",
    rest: "root — every div attribute except children. ChatRunDock owns `role` and takes its name only as the required `aria-label` (aria-labelledby is refused, so the name cannot be left out).",
  },

  motion:
    "None of its own. The FIRST row's matrix moves on StatusMatrix's shared clock while `isHeld` is false — every other row holds, so the dock is one moving thing however many runs it carries — and all of them hold their key frame while it is true — and a held matrix never subscribes to the clock. Rows arrive and leave without a transition: the sheet draws no motion for either.",

  needsDesign: [
  ],

  knownGaps: [
    "Stopping the last run unmounts the dock with the focused Stop in it; the dock cannot reach the composer, so moving focus there is the caller's job.",
    "A mark arriving in the thread is not announced by the mark itself — inserting a live region does not reliably announce its content. The thread's own log (or the caller's live region) announces it, as Chat Progress's role=status does for a turn.",
    "The clock is a string the caller formats and re-renders; the dock owns no timer.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3Z89-0",
} as const;

export type ChatRunDockDoc = typeof chatRunDockDoc;
