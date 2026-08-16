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
