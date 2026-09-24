/**
 * Tokens that do not vary by brand.
 *
 * Structural rhythm, motion and stacking are system decisions, not brand
 * decisions — a client picking their colours should not be able to make dialogs
 * render behind toasts. These are emitted once at `:root`; only the
 * scheme-varying handful below gets a `light-dark()` pair.
 */

import type { FixedToken, SchemeOnlyToken } from "./contract.ts";

/** Typed as a total record, so a token added to the contract without a value
 *  here fails to compile — the same guarantee the resolver gives. */
export const FIXED_TOKEN_VALUES: Record<FixedToken, string> = {
  // The base scale (approved handover: 4/8/12/16/24/32, extended upward with
  // 48/64 for page rhythm). Everything below aliases onto these.
  "--ui-space-xs": "0.25rem",
  "--ui-space-sm": "0.5rem",
  "--ui-space-md": "0.75rem",
  "--ui-space-lg": "1rem",
  "--ui-space-xl": "1.5rem",
  "--ui-space-2xl": "2rem",
  "--ui-space-3xl": "3rem",
  "--ui-space-4xl": "4rem",

  // Vertical rhythm between blocks. stack-xl moved 40px → 48px so every
  // intent lands on a scale step (ledger 2026-08-03).
  "--ui-space-stack-xs": "var(--ui-space-xs)",
  "--ui-space-stack-sm": "var(--ui-space-sm)",
  "--ui-space-stack-md": "var(--ui-space-lg)",
  "--ui-space-stack-lg": "var(--ui-space-xl)",
  "--ui-space-stack-xl": "var(--ui-space-3xl)",
  "--ui-space-stack-2xl": "var(--ui-space-4xl)",

  // Gaps between items on a line.
  "--ui-space-inline-xs": "var(--ui-space-xs)",
  "--ui-space-inline-sm": "var(--ui-space-sm)",
  "--ui-space-inline-md": "var(--ui-space-md)",
  "--ui-space-inline-lg": "var(--ui-space-lg)",

  // Padding inside a container.
  "--ui-space-inset-xs": "var(--ui-space-sm)",
  "--ui-space-inset-sm": "var(--ui-space-md)",
  "--ui-space-inset-md": "var(--ui-space-lg)",
  "--ui-space-inset-lg": "var(--ui-space-xl)",
  "--ui-space-inset-xl": "var(--ui-space-2xl)",

  // The leading ladder (ADR 0009). Weights and trackings are brandable now
  // (ADR 0020 §3) and derived in resolve.ts.
  "--ui-leading-flat": "1",
  "--ui-leading-tight": "1.25",
  "--ui-leading-snug": "1.3",
  "--ui-leading-normal": "1.35",
  "--ui-leading-relaxed": "1.55",

  "--ui-duration-fast": "120ms",
  "--ui-duration-base": "200ms",
  "--ui-duration-slow": "320ms",
  "--ui-duration-enter": "400ms",
  // The only duration that describes a REPEAT rather than a journey, which is
  // why it sits an order of magnitude above the rest: a skeleton's breath, a
  // spinner's revolution. Added because Skeleton was otherwise pulsing at
  // Tailwind's built-in 2s — a hard-coded duration hiding inside a utility
  // NAME, where `check:motion` could not see it and no brand could reach it.
  "--ui-duration-loop": "2000ms",

  "--ui-ease-default": "cubic-bezier(0.2, 0, 0, 1)",
  "--ui-ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "--ui-ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  "--ui-ease-spring": "cubic-bezier(0.22, 1, 0.36, 1)",

  // Intent-level motion: pair a duration with the easing that suits it, so a
  // component names the *kind* of movement rather than picking numbers.
  "--ui-motion-micro": "var(--ui-duration-fast) var(--ui-ease-out)",
  "--ui-motion-standard": "var(--ui-duration-base) var(--ui-ease-default)",
  "--ui-motion-deliberate": "var(--ui-duration-slow) var(--ui-ease-default)",
  "--ui-motion-choreographed": "var(--ui-duration-enter) var(--ui-ease-spring)",

  // Press feedback. 0.96 exactly: measurably below 0.95 reads as exaggerated,
  // above 0.97 is imperceptible. Components expose a `staticTap` opt-out for
  // contexts where even this is noise. (Adapted from jakubkrehel/skills,
  // better-ui §9, MIT — see CREDITS.md.)
  "--ui-press-scale": "0.96",
  // Delay between semantic chunks of a staged entrance. Staged entrances are
  // for infrequent moments (first load, success, empty states) — never for
  // routine, high-frequency interactions.
  "--ui-stagger-step": "100ms",

  // WCAG 2.5.8 AA floor and the recommended touch target for primary controls.
  // The visible element may be smaller — the hit area is what must be big,
  // extended via pseudo-element on the wrapping label/button.
  "--ui-hit-area-min": "24px",
  "--ui-hit-area-touch": "44px",

  "--ui-measure-prose": "70ch",
  "--ui-measure-narrative": "60ch",
  "--ui-measure-dense": "90ch",

  // The stacking scale. EVERY role below has a consumer; the ordering is
  // asserted in resolve.test.ts and each consumer's computed value in
  // z-scale.browser.test.tsx. Components read it through `z-(--ui-z-*)`.
  //
  // THE ONE RULE: a surface outranks anything it can be OPENED FROM.
  //
  // That is not a preference, it is forced by the DOM. Every floating surface
  // portals to <body>, so a Menu opened from inside a Sheet is that Sheet's
  // SIBLING, not its child — nothing but z-index separates them. Measured: a
  // Select opened inside an open Modal reports panel.contains(listbox) ===
  // false. So the opener must sit UNDER what it opens, all the way up.
  //
  // Reading the ladder against the compositions that produced it:
  //   sticky   the affix Header. Chrome: above the page, under every floating
  //            surface, because a Menu opened from the bar is a body sibling
  //            and would otherwise slide under the translucent bar.
  //   overlay  Sheet and Drawer, scrim and panel together.
  //   modal    Modal, scrim and panel. Above overlay: a confirmation is
  //            raised FROM a panel.
  //   toast    above every panel, because a notification has to be seen over
  //            a dialog.
  //   dropdown every anchored popup. Above modal and toast because a dialog
  //            form holds Selects and a toast action can open a Menu — the
  //            consequence the previous revision of this comment flagged as
  //            undecided. The name reads low and the value is high; that is
  //            the rule above, not an accident. CONVENTIONS §7a tabulates it.
  //   tooltip  attaches to controls on every other surface, so it tops.
  //
  // THE TRAP, paid for once: the previous revision said Modal, Sheet, Drawer,
  // Popover and Tooltip "layer by portal order, which works". It does not.
  // They carried NO z-index, and a positive z in the root stacking context
  // paints above a z-auto positioned element WHATEVER the DOM order — so the
  // affix Header at 100 covered all five, exactly as it had at z-30. Raising
  // the bar changed the number and not the category. Binding the five is what
  // fixed it, and sticky never moved.
  //
  // Gaps of 100 leave room to insert a role without renumbering the rest.
  "--ui-z-below": "-1",
  "--ui-z-base": "0",
  "--ui-z-sticky": "100",
  "--ui-z-overlay": "1000",
  "--ui-z-modal": "1100",
  "--ui-z-toast": "1200",
  "--ui-z-dropdown": "1300",
  "--ui-z-tooltip": "1400",
};

/** Varies with light/dark, never with the brand. */
export const SCHEME_TOKEN_VALUES: Record<SchemeOnlyToken, { light: string; dark: string }> = {
  // Light scrim is the approved Modal Example overlay: warm neutral-60 at 16%
  // — an airy veil, not a blackout. No dark modal is designed yet; the dark
  // value is an engineering default.
  "--ui-scrim": { light: "rgba(152, 145, 138, 0.16)", dark: "rgba(0, 0, 0, 0.55)" },
  "--ui-selection-bg": { light: "rgba(16, 16, 20, 0.12)", dark: "rgba(255, 255, 255, 0.22)" },
  "--ui-selection-fg": { light: "#101014", dark: "#ffffff" },
};

/**
 * Durations collapse under reduced motion.
 *
 * Done here, once, rather than per component: every CSS-driven transition in
 * the system reads these tokens, so honouring the preference at the token layer
 * makes the whole library compliant without a single component knowing about
 * it. Only the JS motion tier needs its own check (ADR 0005).
 */
export const REDUCED_MOTION_OVERRIDES: Partial<Record<FixedToken, string>> = {
  "--ui-duration-fast": "1ms",
  "--ui-duration-base": "1ms",
  "--ui-duration-slow": "1ms",
  "--ui-duration-enter": "1ms",
  // 1ms would make a LOOP spin a thousand times a second rather than stop it.
  // Reduced motion is handled for keyframes by the `motion-safe:` variant that
  // ADR 0018 requires on every one of them; this value only has to be
  // harmless if a keyframe is ever driven by the token directly.
  "--ui-duration-loop": "2000ms",
};
