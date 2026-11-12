/** Typed documentation for StatusMatrix (CONVENTIONS §11). */

export const statusMatrixDoc = {
  name: "StatusMatrix",
  status: "experimental",
  summary:
    "The dot-matrix status mark: a 5×5 screen of dots at four levels (Off, Ember, Glow, Lit) on which every state is a signal. Live states loop on one shared clock — waiting, typing, thinking, working, streaming, progress — and the endings draw once and hold: done, failed, stopped. Each tick every dot fades one level and the signal re-lights what it touches, so trails, echoes and hand-overs all fall out of one rule. It never carries a state alone: a status line in words sits beside it, or `label` names it.",

  anatomy: [
    { part: "root", slot: "status-matrix", notes: "The <svg>, viewBox 0 0 16 16, at 16px (md) or 14px (sm). className and ref land here (§5). Carries data-status, data-size and data-held. aria-hidden unless `label` makes it role=img." },
    { part: "dot", slot: "status-matrix-dot", notes: "25 circles, r=1, centres at 2 + 3n. data-level 0–3 maps to opacity 0.1 / 0.15 / 0.35 / 1. Fill is the ink of the signal that last lit the dot; an unlit dot takes the current status's ink." },
  ],

  composition: `
StatusMatrix
├─ status           waiting | typing | thinking | working | streaming | progress | done | failed | stopped
├─ value / max      progress only — value required there, refused elsewhere; max default 100
├─ size?            md (16px) | sm (14px)
├─ isHeld?          draw the key frame and keep still — every matrix but the live edge
└─ label?           an accessible name; omit when a status line sits beside it

Status line (caller-owned)
├─ StatusMatrix     status="thinking"
└─ text             "Thinking" — body-sm, muted
  `.trim(),

  props: {
    status: { type: "StatusMatrixStatus", required: true, notes: "Changing it hands over IN PLACE: on the next tick the outgoing figure fades a level while the incoming one lights from its own tick 0 — a one-tick lead, so there is never a beat with no figure. One matrix at every instant, never a second one or a jump." },
    value: { type: "number", notes: "Progress only, and required there: a level meter that cannot say how full it is is not a meter. Read against `max`; 4% of the range lights one dot, columns fill bottom-up, left to right, and the next dot breathes." },
    max: { type: "number", default: "100", notes: "Progress only. The same value/max vocabulary as Progress and Meter." },
    size: { type: '"sm" | "md"', default: '"md"', notes: "md beside a body-sm status line; sm in a step list, a lane or a dock row, where the sheet draws 14." },
    isHeld: { type: "boolean", default: "false", notes: "One matrix moves per turn — the deepest running node in a chain, the root of a parallel or folded run, the first row of a ChatRunDock — and every other matrix in that turn is held on its key frame, so the eye has one place to go. Which matrix is the live edge is a fact about the whole turn, so the caller decides it." },
    label: { type: "string", notes: "Makes the matrix role=img with this name. Leave it out when a visible status line already says the state in words — the matrix is then decorative and aria-hidden." },
  },

  do: [
    "Pair it with a status line in words — 'Thinking', 'Running 3 tools', 'Uploading · 48%'.",
    "Hold every matrix in a turn but the live edge (`isHeld`).",
    "Let a status change hand over in the same matrix: change `status`, never swap one StatusMatrix for another.",
    "Keep settled list glyphs as icons — a finished step is a CheckCircle, a pending one a ring. The matrix's endings are for the turn's own status line.",
  ],

  dont: [
    "Do not use it as a generic page spinner: it is the chat run's status, and its shapes mean specific kinds of wait.",
    "Do not animate two matrices in one turn — two moving signals compete for the same glance.",
    "Do not use progress without a real measurement; a value that is a guess is Working.",
  ],

  a11y: {
    role: "Decorative by default (aria-hidden, focusable=false): the status line beside it carries the state in words, which is SC 1.4.1's requirement — the shape and the motion are never the only channel. With `label`, role=img named by it.",
    name: "`label`, when the matrix stands alone. Otherwise the adjacent text.",
    forcedColors: "The Off grid drops out (opacity 0) and every lit dot draws in CanvasText: the accent means nothing in that mode, and the figure alone carries the shape.",
    keyboard: [{ key: "—", does: "Not focusable. A status mark is output, not a control." }],
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "a Lit dot of a live status on the thread" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-elevated", floor: "non-text", role: "a Lit dot of a live status on an elevated card, lane pill or dock — the ground every chat surface paints" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-base", floor: "non-text", role: "the Done check" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "non-text", role: "the Failed cross" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "non-text", role: "Typing's dots and the Stopped square" },
    ],
  },

  forwarding: {
    className: "root (the svg)",
    ref: "root — an SVGSVGElement; there is no inner control",
    rest: "root — every SVG attribute except children, role and viewBox, which the component owns",
  },

  motion:
    "A JavaScript tick, because the frames are computed rather than keyed: one shared clock steps every moving matrix on the page together, at --ui-stagger-step (100ms) divided by --ui-fx-ambient-speed — the effects layer's one knob for every ambient loop, read as 1 where that layer is not loaded — so two matrices can never beat against each other. A loop is 10 or 20 ticks — 1000ms or 2000ms at the default step. The 20-tick loop matches --ui-duration-loop at that step, but it is counted in ticks rather than read from that token, so a brand that retunes the step retunes the loop with it. The subscription lives as long as the matrix moves: a status or value change rewrites what the next tick draws instead of re-subscribing, so updates arriving faster than a tick cannot stall the clock. Each dot's opacity and fill then transition on --ui-duration-fast — Typing on --ui-duration-base — which is what turns the four discrete levels into a soft phosphor trail. The first render is the key frame (the frame the sheet draws), and motion continues from it after mount. An ending arrived at draws on — Done a cell a tick along its stroke, Failed from the centre out, Stopped in one — and then the clock lets go of it; an ending MOUNTED is already drawn. `isHeld` and prefers-reduced-motion both render the key frame and never subscribe: the clock is JavaScript, which the token layer's duration collapse cannot reach, so the component asks the media query itself. A page without --ui-stagger-step gets a still matrix rather than an invented tempo.",

  needsDesign: [
    "Listening (the voice variant) is on the sheet but not here: its bars should follow a real input level, and a component that takes a level per tick is a different API from a status. Built when a voice surface exists to drive it.",
    "No 32px or 48px size: the sheet draws those as specimens only, and no composition places the matrix above 16px.",
  ],

  knownGaps: [
        "The level opacities (0.1 / 0.15 / 0.35 / 1) are opacity utilities rather than tokens: they are the matrix's own four-step scale and nothing else in the system shares it.",
    "Endings are not announced. A caller that needs 'Done' read out says so in its own live region — Chat Progress's role=status is the model.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/418R-0",
} as const;

export type StatusMatrixDoc = typeof statusMatrixDoc;
