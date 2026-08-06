/**
 * The 32px chrome control.
 *
 * A square, softly-rounded control filled with `--ui-bg-elevated` and carrying
 * no edge. It is NOT a Button variant: the six button types are all either a
 * fill with a matching edge (primary, danger) or an edge on nothing
 * (secondary, outline, ghost), and this is the one shape that is a fill with
 * no edge at all. It belongs to page chrome — a menu toggle, a back arrow, a
 * calendar's month arrows — rather than to the action vocabulary.
 *
 * It exists as one exported recipe because it was independently reinvented
 * FOUR times before anyone noticed it was the same thing: Header's menu
 * toggle and avatar frame, the Sheet nav group's back button, and Calendar's
 * previous/next. Each came out slightly different, and none of them was in
 * Storybook.
 *
 * Compose it onto a real `<button>` (or an `<a>`) — it styles, it does not
 * wrap, so the element keeps its own semantics and accessible name.
 *
 *   <button type="button" aria-label="Previous month" className={chromeControl()}>
 */
export function chromeControl(className?: string): string {
  return [
    // 32px square. The sheet draws exactly one size, so there is no scale here
    // to get wrong — and 32 clears SC 2.5.8's 24px floor with room to spare.
    "inline-flex size-8 shrink-0 items-center justify-center",
    // radius-md, matching Button's own soft radius at md so a chrome control
    // and a medium button sitting in the same bar share a corner.
    "rounded-md",
    // A fill with no edge. `bg-elevated` is the drawn value in all four places.
    "bg-elevated text-ink-primary",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    "cursor-pointer disabled:cursor-not-allowed",
    "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
    "enabled:hover:bg-hover enabled:active:bg-active",
    "disabled:bg-sunken disabled:text-ink-disabled",
    // The ring is a box-shadow, which forced-colors mode forces to `none` —
    // the outline is what survives there. Same rule as every other control.
    "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
    "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
