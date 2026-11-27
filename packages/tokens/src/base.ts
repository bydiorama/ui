/**
 * Tokens that do not vary by brand.
 *
 * Structural rhythm, motion and stacking are system decisions, not brand
 * decisions — a client picking their colours should not be able to make dialogs
 * render behind toasts. These are emitted once at `:root`; only the
 * scheme-varying handful below gets a `light-dark()` pair.
 */

import type { FixedToken, SchemeOnlyToken } from "./contract.ts";

// ── Density (ADR 0020 §4) ────────────────────────────────────────────────

export type Density = "compact" | "default" | "comfortable";

/** The WCAG 2.5.8 AA target floor. No density may size a control under it. */
export const CONTROL_FLOOR_PX = 24;

/** Every height moves by this per density step: the 4px grid, which a
 *  percentage cannot keep (at 90%, 12px is 10.8px). Ant's compact algorithm
 *  and Material's density scale both step this way. */
export const DENSITY_STEP_PX = 4;

const SPACE_STEPS = ["xs", "sm", "md", "lg", "xl"] as const;
type SpaceStep = (typeof SPACE_STEPS)[number];

/** The default ladders, as drawn. */
const LADDER = {
  control: { sm: { height: 24, inset: "sm" }, md: { height: 32, inset: "md" }, lg: { height: 44, inset: "lg" } },
  field: { sm: { height: 32, inset: "sm" }, md: { height: 40, inset: "sm" }, lg: { height: 48, inset: "md" } },
} as const satisfies Record<"control" | "field", Record<"sm" | "md" | "lg", { height: number; inset: SpaceStep }>>;

type SizeToken = Extract<FixedToken, `--ui-${"control" | "field"}-${string}`>;

/** One density's control and field tokens. A step moves every height by
 *  DENSITY_STEP_PX, floored at CONTROL_FLOOR_PX, and every inset one step
 *  along the spacing scale; type, icons, radii and layout do not move. */
function controlSizes(step: -1 | 0 | 1): Record<SizeToken, string> {
  const out = {} as Record<SizeToken, string>;
  for (const family of ["control", "field"] as const) {
    for (const size of ["sm", "md", "lg"] as const) {
      const { height, inset } = LADDER[family][size];
      const px = Math.max(CONTROL_FLOOR_PX, height + step * DENSITY_STEP_PX);
      const insetStep = SPACE_STEPS[Math.min(SPACE_STEPS.length - 1, Math.max(0, SPACE_STEPS.indexOf(inset) + step))]!;
      out[`--ui-${family}-${size}-height` as SizeToken] = `${px / 16}rem`;
      out[`--ui-${family}-${size}-inset` as SizeToken] = `var(--ui-space-${insetStep})`;
    }
  }
  return out;
}

export const CONTROL_SIZES: Record<Density, Record<SizeToken, string>> = {
  compact: controlSizes(-1),
  default: controlSizes(0),
  comfortable: controlSizes(1),
};

/**
 * The layout floor of a choice row (Checkbox, Radio, Switch), per density.
 *
 * Default and comfortable hold the row at the 24px target floor, which is how
 * every choice row has always been drawn: the 18px box or 20px track, padded
 * out so the row IS the target. Compact releases it (`0px` — the row is as
 * tall as its content, 19–20px) so a dense table's rows are not forced to
 * 24px by a checkbox. The TARGET does not move: each choice row extends its
 * hit area to --ui-hit-area-min with a pseudo-element on the label
 * (CONVENTIONS §10, ui-craft rule 14), so SC 2.5.8 holds in every mode.
 *
 * Not in CONTROL_SIZES on purpose: those are control heights, and every one
 * of them is floored at 24px. This is a row's LAYOUT, which is allowed under
 * the floor precisely because the target is carried separately.
 */
export const CHOICE_ROW_MIN_HEIGHT: Record<Density, string> = {
  compact: "0px",
  default: "var(--ui-hit-area-min)",
  comfortable: "var(--ui-hit-area-min)",
};

type RowToken = Extract<FixedToken, "--ui-row-inset" | "--ui-row-block-inset" | "--ui-row-min-height" | "--ui-nav-row-min-height" | "--ui-nav-rail-item-size" | "--ui-type-step">;

/** The compact list row, as the first dense consumer drew it: 32px, the
 *  default `control-md`. A designed number rather than a derived one — at
 *  default a list row has no height of its own, only padding (12 + 21.7 + 12
 *  ≈ 46px), so there is nothing to step from. */
const COMPACT_ROW_PX = 32;
/** A Sidebar row's floor as drawn (min-h-9), and the NavRail square. */
const NAV_ROW_PX = 36;
const NAV_RAIL_ITEM_PX = 32;

/**
 * Rows (ADR 0026): menu, context-menu and option rows, Sidebar rows and the
 * NavRail square, plus the switch a density-stepped type role reads.
 *
 * Default reproduces what each row drew before it read a token — p-md, no
 * list-row floor, min-h-9, size-8 — so default rendering does not move.
 * Compact makes a row 32px: the block inset drops to xs so the floor, not
 * the padding, sets the height, and the inline inset drops one step to sm,
 * which lands a Sidebar label on the same 16px lane the compact search
 * field's text sits on (8 body + 4 + compact field-md's 4). The nav floor and
 * the rail square step by DENSITY_STEP_PX like every control. Comfortable
 * leaves rows as drawn: at ~46px they already clear the 44px touch target,
 * and a 36px rail square would not fit the 48px rail.
 */
function rowSizes(density: Density): Record<RowToken, string> {
  const isCompact = density === "compact";
  const step = isCompact ? -1 : 0;
  return {
    "--ui-row-inset": isCompact ? "var(--ui-space-sm)" : "var(--ui-space-md)",
    "--ui-row-block-inset": isCompact ? "var(--ui-space-xs)" : "var(--ui-space-md)",
    "--ui-row-min-height": isCompact ? `${COMPACT_ROW_PX / 16}rem` : "0px",
    "--ui-nav-row-min-height": `${Math.max(CONTROL_FLOOR_PX, NAV_ROW_PX + step * DENSITY_STEP_PX) / 16}rem`,
    "--ui-nav-rail-item-size": `${Math.max(CONTROL_FLOOR_PX, NAV_RAIL_ITEM_PX + step * DENSITY_STEP_PX) / 16}rem`,
    "--ui-type-step": isCompact ? "1" : "0",
  };
}

export const ROW_SIZES: Record<Density, Record<RowToken, string>> = {
  compact: rowSizes("compact"),
  default: rowSizes("default"),
  comfortable: rowSizes("comfortable"),
};

/**
 * Every token a `[data-ui-density]` block re-binds, per density. The
 * emitters read THIS, so a density-bound token cannot be emitted on a brand
 * scope (which would reset an inherited density) or left out of a mode.
 */
export const DENSITY_TOKENS: Record<Density, Record<string, string>> = {
  compact: { ...CONTROL_SIZES.compact, "--ui-choice-row-min-height": CHOICE_ROW_MIN_HEIGHT.compact, ...ROW_SIZES.compact },
  default: { ...CONTROL_SIZES.default, "--ui-choice-row-min-height": CHOICE_ROW_MIN_HEIGHT.default, ...ROW_SIZES.default },
  comfortable: { ...CONTROL_SIZES.comfortable, "--ui-choice-row-min-height": CHOICE_ROW_MIN_HEIGHT.comfortable, ...ROW_SIZES.comfortable },
};

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
  // A real spring since ADR 0028 §7 (decided 2026-11-26): a damped spring,
  // damping ratio 0.75, sampled at 41 points, settled within 0.1% by the end
  // of whatever duration it runs over. It passes its target by 2.8% just after
  // halfway and settles back once — the "lands" the name always promised. The
  // cubic-bezier it replaces could not overshoot, so the name was a fiction.
  // Pace is unchanged: 90% of the way at a third of the duration, as before.
  "--ui-ease-spring":
    "linear(0, 0.02, 0.073, 0.147, 0.233, 0.326, 0.419, 0.509, 0.594, 0.671, 0.739, 0.799, 0.851, 0.894, 0.929, 0.958, 0.98, 0.997, 1.01, 1.018, 1.024, 1.027, 1.028, 1.028, 1.027, 1.025, 1.023, 1.02, 1.017, 1.015, 1.012, 1.01, 1.008, 1.006, 1.005, 1.003, 1.002, 1.001, 1.001, 1, 1)",

  // Intent-level motion: pair a duration with the easing that suits it, so a
  // component names the *kind* of movement rather than picking numbers.
  // Micro, standard and deliberate all ease OUT (ADR 0028 §7, decided
  // 2026-11-26): the tokens follow what every component already did, rather
  // than fifty call sites following a curve none of them had chosen. They are
  // the same pairs as the recipes in `@/lib/motion`; `check:motion` fails if
  // the two ever disagree again.
  "--ui-motion-micro": "var(--ui-duration-fast) var(--ui-ease-out)",
  "--ui-motion-standard": "var(--ui-duration-base) var(--ui-ease-out)",
  "--ui-motion-deliberate": "var(--ui-duration-slow) var(--ui-ease-out)",
  "--ui-motion-choreographed": "var(--ui-duration-enter) var(--ui-ease-spring)",

  // The motion level (ADR 0028) — `full` here, re-bound for a subtree by
  // `[data-ui-motion]` and for the page by the OS preference. See
  // MOTION_LEVELS for what each level sets.
  "--ui-motion-level": "full",
  // Travel: how far an entering or leaving surface moves, as a factor of its
  // own offset. A slide is written `translate: calc(100% * travel)`, so the
  // one declaration is a slide at `full` and a fade in place at `reduced`.
  "--ui-motion-travel": "1",
  // Where a scaling surface starts — a popup growing out of its trigger.
  // Was fourteen `scale-98` literals the token layer could not reach.
  "--ui-enter-scale": "0.98",

  // Press feedback. 0.96 exactly: measurably below 0.95 reads as exaggerated,
  // above 0.97 is imperceptible. Components expose a `staticTap` opt-out for
  // contexts where even this is noise. (Adapted from jakubkrehel/skills,
  // better-ui §9, MIT — see CREDITS.md.)
  "--ui-press-scale": "0.96",
  // Delay between semantic chunks of a staged entrance. Staged entrances are
  // for infrequent moments (first load, success, empty states) — never for
  // routine, high-frequency interactions.
  "--ui-stagger-step": "100ms",

  // Control sizing (ADR 0020 §4) — the DEFAULT density. Heights are the
  // drawn ladders, now named: actions 24/32/44, fields 32/40/48. An inset is
  // the inline padding at that size, on the spacing scale.
  ...CONTROL_SIZES.default,

  // WCAG 2.5.8 AA floor and the recommended touch target for primary controls.
  // The visible element may be smaller — the hit area is what must be big,
  // extended via pseudo-element on the wrapping label/button.
  "--ui-hit-area-min": "24px",
  "--ui-hit-area-touch": "44px",
  // Density-bound — see CHOICE_ROW_MIN_HEIGHT.
  "--ui-choice-row-min-height": CHOICE_ROW_MIN_HEIGHT.default,
  // Density-bound — see ROW_SIZES.
  ...ROW_SIZES.default,

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

/** The three motion levels (ADR 0028), most motion first. */
export const MOTION_LEVEL_NAMES = ["full", "reduced", "off"] as const;
export type MotionLevelName = (typeof MOTION_LEVEL_NAMES)[number];

/** The attribute that sets a level on a subtree: `data-ui-motion="reduced"`. */
export const MOTION_LEVEL_ATTRIBUTE = "data-ui-motion";

/**
 * What each motion level sets (ADR 0028).
 *
 * Done here, once, rather than per component: every CSS-driven transition in
 * the system reads these tokens, so a level is honoured by the whole library
 * without a single component knowing about it. Keyframes are gated by the
 * `motion-safe:` / `motion-reduce:` variants the Tailwind emitter redefines
 * against the same levels, and JavaScript reads `--ui-motion-level`.
 *
 * - `full` — the values above.
 * - `reduced` — nothing TRAVELS: slides become fades in place, scale-ins start
 *   at their final size, nothing staggers, and loops stop (the variants).
 *   Change in place keeps its time, capped at `--ui-duration-base`: a colour
 *   settling, a height opening, a thumb crossing its track. Removing those too
 *   makes the layout jump, which is harder to follow, not easier.
 * - `off` — every duration collapses to 1ms. Not 0: Base UI awaits
 *   `getAnimations()` before unmounting, and a zero-length transition
 *   registers nothing to await (ADR 0018, finding 2).
 *
 * Every level sets EVERY key, so a subtree can return to `full` from inside a
 * reduced page. `--ui-duration-loop` is the same at every level on purpose:
 * 1ms would spin a loop a thousand times a second rather than stop it, and
 * loops are stopped by the variants, not by their duration.
 */
const FULL_MOTION = {
  "--ui-motion-level": "full",
  "--ui-duration-fast": FIXED_TOKEN_VALUES["--ui-duration-fast"],
  "--ui-duration-base": FIXED_TOKEN_VALUES["--ui-duration-base"],
  "--ui-duration-slow": FIXED_TOKEN_VALUES["--ui-duration-slow"],
  "--ui-duration-enter": FIXED_TOKEN_VALUES["--ui-duration-enter"],
  "--ui-duration-loop": FIXED_TOKEN_VALUES["--ui-duration-loop"],
  "--ui-motion-travel": FIXED_TOKEN_VALUES["--ui-motion-travel"],
  "--ui-enter-scale": FIXED_TOKEN_VALUES["--ui-enter-scale"],
  "--ui-stagger-step": FIXED_TOKEN_VALUES["--ui-stagger-step"],
} as const satisfies Partial<Record<FixedToken, string>>;

export type MotionLevelToken = keyof typeof FULL_MOTION;

export const MOTION_LEVELS: Record<MotionLevelName, Record<MotionLevelToken, string>> = {
  full: FULL_MOTION,
  reduced: {
    "--ui-motion-level": "reduced",
    "--ui-duration-fast": FIXED_TOKEN_VALUES["--ui-duration-fast"],
    "--ui-duration-base": FIXED_TOKEN_VALUES["--ui-duration-base"],
    "--ui-duration-slow": FIXED_TOKEN_VALUES["--ui-duration-base"],
    "--ui-duration-enter": FIXED_TOKEN_VALUES["--ui-duration-base"],
    "--ui-duration-loop": FIXED_TOKEN_VALUES["--ui-duration-loop"],
    "--ui-motion-travel": "0",
    "--ui-enter-scale": "1",
    "--ui-stagger-step": "0ms",
  },
  off: {
    "--ui-motion-level": "off",
    "--ui-duration-fast": "1ms",
    "--ui-duration-base": "1ms",
    "--ui-duration-slow": "1ms",
    "--ui-duration-enter": "1ms",
    "--ui-duration-loop": FIXED_TOKEN_VALUES["--ui-duration-loop"],
    "--ui-motion-travel": "0",
    "--ui-enter-scale": "1",
    "--ui-stagger-step": "0ms",
  },
};

/**
 * What `prefers-reduced-motion: reduce` gives a page that sets no level.
 * Was the whole collapse (today's `off`); it is `reduced` since ADR 0028.
 */
export const REDUCED_MOTION_OVERRIDES: Record<MotionLevelToken, string> = MOTION_LEVELS.reduced;
