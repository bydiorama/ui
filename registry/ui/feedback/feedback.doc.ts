/**
 * Typed documentation for Feedback.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const feedbackDoc = {
  lead: "The one-shots that answer an action: a shake that says no and a check that is written in.",
  name: "Feedback",
  status: "experimental",
  summary:
    "The last of ADR 0028's six owned motion components. useShake() returns a ref and a shake(): three decaying swings of 4 → 2.5 → 1px (multiples of --ui-space-xs) over --ui-duration-slow, each segment on --ui-ease-default, played once through the Web Animations API so it replays on demand. As JS-driven motion it asks motionLevel() and does nothing below Full — the shake is travel, and the field's danger outline and message carry the error. SuccessCheck is the shared Check glyph written in left to right — a clip-path wipe on --ui-duration-slow with --ui-ease-out — when it mounts; at Reduced it fades in whole, at Off it is there. Every number was decided with the maintainer (2026-11-27). Both sit beside a static cue: motion is never the only feedback channel (CONVENTIONS §8).",

  anatomy: [
    {
      part: "shake",
      slot: "the caller's",
      notes:
        "useShake() renders nothing: its ref goes on the element that says no — the field or the form, not the label — and shake() animates that element's translate once. The element keeps its own classes and styles; an inline translate on it is overwritten while the shake runs.",
    },
    {
      part: "success check",
      slot: "success-check",
      notes:
        "An aria-hidden inline span holding the shared Check glyph, 16px and text-success by default. Its clip-path opens from the left as it arrives; at rest the clip shows all of it.",
    },
  ],

  composition: `
useShake<T>() → { ref, shake }
SuccessCheck — data-slot="success-check", aria-hidden
└── Check (griddy-icons)

const { ref, shake } = useShake<HTMLInputElement>();
<Input ref={ref} isInvalid={wrong} />
// on a rejected submit:  shake();

{saved && <span className="flex items-center gap-xs"><SuccessCheck /> Saved</span>}
`,

  props: {
    className: {
      type: "string",
      notes: "SuccessCheck: lands on the span, merged last — size-5 to resize, text-* to recolour.",
    },
  },

  do: [
    "Shake only when the answer is no to something the person just did: a wrong code, a rejected submit.",
    "Keep the static cue: the danger outline and message for a shake, a label beside the check.",
    "Render SuccessCheck when success happens; it plays on mount.",
  ],
  dont: [
    "Shake to draw attention to something the person did not just do, or on every keystroke.",
    "Use a check or a shake as the only feedback — both are decorative.",
    "Loop either. They are one-shots; a loop is the effects layer's job.",
  ],

  a11y: {
    role: "None. SuccessCheck is aria-hidden; useShake adds no element.",
    name: "Never Feedback's: the field's error message and the label beside the check carry the meaning.",
    keyboard: [],
    focus: "Unaffected — the shake moves the field without moving focus.",
    contrastPairs: [],
    rendersNoColour:
      "The shake paints nothing. SuccessCheck's glyph is decorative and sits beside its own label, which declares the text pair; its default ink is the library's success colour, as every success glyph uses.",
  },

  forwarding: {
    className: "SuccessCheck: lands on the span. useShake: not applicable.",
    ref: "SuccessCheck: the span. useShake returns a ref for the caller's element.",
    props: "SuccessCheck: native span attributes; aria-hidden is fixed.",
  },

  motion:
    "Shake: a Web Animation of translate through calc(var(--ui-space-xs) × 0, −1, 1, −0.625, 0.625, −0.25, 0) — evenly spaced, each segment on --ui-ease-default — over --ui-duration-slow; a second call restarts it. It runs only at Full (motionLevel()). SuccessCheck: a CSS transition from @starting-style — at Full clip-path inset(0 100% 0 0) → inset(0) on --ui-duration-slow with --ui-ease-out (motion-safe:); at Reduced opacity 0 → 1 on the slow token, which Reduced caps at base (motion-reduce:); at Off 1ms.",

  needsDesign: [],

  knownGaps: [
    "Built from a sheet the maintainer has not reviewed yet; its four open decisions were made with them.",
    "Decided 'stroke draws on' is a clip-path wipe: dashed strokes and private glyphs are banned by gates. It reads the same; a true stroke draw would need an exemption in both.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-14-0/49XU-1",
} as const;
