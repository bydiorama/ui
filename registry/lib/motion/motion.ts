/**
 * The three timings this library actually animates at.
 *
 * A transition here is always two decisions: WHICH properties move, and HOW
 * LONG they take. The first is genuinely per-component — a Switch moves a
 * transform, a Progress bar moves a width — and belongs at the call site. The
 * second was written out by hand fifty times, identically, and belongs here.
 *
 *   className={cn("transition-[background-color,color]", motionMicro)}
 *
 * WHY THE PROPERTY LIST IS NOT A PARAMETER, even though that would read
 * better: Tailwind compiles the class names it finds by SCANNING SOURCE TEXT.
 * A recipe built as `` `transition-[${properties}]` `` produces a string at
 * runtime that the scanner never saw, so the rule is never generated and the
 * element does not animate — with nothing failing anywhere. The split below is
 * the one that keeps every class name a literal in a file Tailwind reads.
 *
 * WHAT THE FIFTY USES REVEALED. The token layer offers four easings and four
 * `--ui-motion-*` intents pairing a duration with one. Measured across every
 * distributed file, the library uses **`--ui-ease-out` fifty times out of
 * fifty**, and the four intent tokens have **zero consumers** — including
 * `--ui-motion-standard`, which pairs `--ui-duration-base` with
 * `--ui-ease-default`, an easing nothing in the library has ever reached for.
 *
 * So these three are named for the intents but do NOT read them, and that is
 * a deliberate record of a disagreement rather than an oversight: the tokens
 * describe a system with four curves and the components built one with a
 * single curve. Which is right is a design question (`design/paper/README.md`
 * still lists motion sign-off as open). Encoding the components' actual
 * behaviour here at least makes the disagreement visible in one file instead
 * of implied across twenty-eight.
 */

/** Interaction feedback — hover, focus, press, a colour or a ring settling. */
export const motionMicro = "duration-(--ui-duration-fast) ease-(--ui-ease-out)";

/** A surface arriving or leaving — a panel, a scrim, a height, a bar's fill. */
export const motionStandard = "duration-(--ui-duration-base) ease-(--ui-ease-out)";

/**
 * An unfolding rather than a state flip.
 *
 * Thumbnail's stacked group is the only user and reaches it through a `[&>*]:`
 * variant, which cannot use this constant — a variant has to prefix every
 * utility it applies to, and these are plain ones. Kept because the step is
 * real and the next component that unfolds should not re-derive it.
 */
export const motionDeliberate = "duration-(--ui-duration-slow) ease-(--ui-ease-out)";

/**
 * Hover intent — the wait BEFORE anything happens.
 *
 * These are the first timings in the library that are not durations, and the
 * distinction is the whole reason they are numbers here rather than
 * `--ui-duration-*` tokens beside the rest.
 *
 * A duration answers "how long does this change take" and is consumed by CSS,
 * which is why the token layer can carry it and collapse it under
 * `prefers-reduced-motion`. A DELAY answers "how long does the interface wait
 * before deciding the pointer meant it", nothing is animating while it runs,
 * and it is consumed by a JavaScript prop — Base UI's tooltip takes a number
 * of milliseconds. A CSS custom property cannot be read by one without a
 * `getComputedStyle` round trip per trigger, so a `--ui-delay-*` token would
 * have been a token nothing could consume, which is worse than a token nothing
 * does.
 *
 * They are named for the BEHAVIOUR rather than for Tooltip: a hover-opened
 * menu, a preview card and a link peek all want the same threshold, and each
 * one that picks its own is a second answer to a question with one.
 *
 * Reduced motion deliberately does NOT collapse these. An open delay is intent,
 * not movement — removing it would fire six tooltips at a reader crossing a
 * toolbar, which is more motion for someone who asked for less.
 *
 * `check:motion` rejects a numeric literal passed to `delay`, `closeDelay` or
 * `timeout` anywhere in `registry/ui`, so these are the only way to spell them.
 */

/** How long a pointer must rest before a hover-opened surface appears. */
export const HOVER_INTENT_DELAY_MS = 600;

/**
 * How long one waits before closing. Zero: there is nothing inside a tooltip to
 * travel to, so a close delay would only be the chip refusing to get out of the
 * way. A Menu lingers because you have to reach it.
 */
export const HOVER_INTENT_CLOSE_MS = 0;

/**
 * After one closes, its neighbours open instantly for this long.
 *
 * The pair only works together: the threshold without the skip window turns a
 * toolbar into eight separate 600ms waits. Base UI's own default is 400; 300 is
 * the sheet's, and tighter suits a row of icon buttons read left to right.
 */
export const HOVER_INTENT_SKIP_MS = 300;
