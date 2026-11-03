/** Typed documentation for MediaToggle (CONVENTIONS §11). */

export const mediaToggleDoc = {
  name: "MediaToggle",
  status: "experimental",
  summary:
    "The pause/play control WCAG 2.2.2 requires for video that starts on its own — an ambient hero, a background loop. A round chrome control on the media family, driving the media element it is given.",

  anatomy: [
    { part: "root", slot: "media-toggle", notes: "A <button>. The chrome-control recipe made round: --ui-bg-media fill, --ui-text-on-media glyph, no edge. Hover and press lift to --ui-bg-media-floor. data-state is playing | paused." },
    { part: "glyph", slot: null, notes: "griddy PauseCircle while playing, PlayCircle while paused, 16px at both sizes — the glyph shows the ACTION. Not the bare Pause: it hard-codes fill=\"black\" in griddy-icons 0.2 and cannot take the ink." },
  ],

  composition: `
<div class="relative">            the caller owns placement — bottom-end, inset space-lg
├─ <video ref={video} autoPlay muted loop playsInline />
└─ MediaToggle  target={video} pauseLabel playLabel size?
  `.trim(),

  props: {
    target: { type: "RefObject<HTMLMediaElement | null>", notes: "The element to drive. The toggle calls play()/pause() and follows the element's own play/pause events, so it never disagrees with the video. Omit it to handle onPausedChange yourself." },
    isPaused: { type: "boolean", notes: "Controlled state, with onPausedChange." },
    defaultIsPaused: { type: "boolean", notes: "Uncontrolled start. Omitted: playing, unless prefers-reduced-motion is set — then it pauses the target on mount and starts paused." },
    pauseLabel: { type: "string", required: true, notes: "The accessible name while playing. Name the thing: \"Pause background video\", not \"Pause\"." },
    playLabel: { type: "string", required: true, notes: "The accessible name while paused." },
    size: { type: '"md" | "lg"', default: '"md"', notes: "md 32, lg 44 (the touch target). Both move with density like every control size." },
  },

  do: [
    "Give every autoplaying video longer than five seconds one of these (WCAG 2.2.2).",
    "Pass target so the button follows the element; autoplay can be refused, and the button must not say \"Pause\" over a still frame.",
    "Place it inside the media frame, bottom-end, inset space-lg.",
  ],

  dont: [
    "Do not use the inverse Button variant over video: inverse flips light in the dark scheme, media does not.",
    "Do not add aria-pressed — the name already changes with the state, and \"Pause, pressed\" contradicts itself.",
  ],

  a11y: {
    role: "button",
    name: "pauseLabel while playing, playLabel while paused — always the action pressing performs.",
    keyboard: [
      { key: "Enter / Space", does: "Toggles playback." },
    ],
    contrastPairs: [
      { fg: "--ui-text-on-media", bg: "--ui-bg-media", floor: "non-text", role: "the glyph on its disc" },
      { fg: "--ui-text-on-media", bg: "--ui-bg-media-floor", floor: "non-text", role: "the glyph on the hovered disc" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring's outer stop" },
    ],
  },

  knownGaps: [
    "The disc's own boundary against an arbitrary video frame is not guaranteed — a frame the colour of --ui-bg-media hides the disc, though never the glyph. A ring was not drawn.",
    "No Button for media grounds: inverse flips with the scheme and media does not, so an onMedia variant waits for a call site.",
  ],

  motion:
    "The disc's fill eases between --ui-bg-media and --ui-bg-media-floor over --ui-duration-fast (chromeControl's transition). The glyph swaps without animation. Reduced motion collapses the duration at the token layer — and, separately, starts the controlled VIDEO paused.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3QET-0",
} as const;

export type MediaToggleDoc = typeof mediaToggleDoc;
