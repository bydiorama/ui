/**
 * The menu surface: one panel, one row, shared by Menu and ContextMenu.
 *
 * These two are not cousins that happen to look alike — Base UI's ContextMenu
 * re-exports Menu's Item, Group, Separator and Submenu parts verbatim, so they
 * are literally the same rows in the same popup, differing only in what opens
 * them (a trigger press versus a right-click). Two copies of this recipe would
 * be two copies that drift, which is the mistake the 32px chrome control
 * recorded four times before anyone named it.
 *
 * It is a recipe rather than a component for the same reason `chrome-control`
 * is: it styles, it does not wrap, so the behaviour layer keeps ownership of
 * roles, roving focus, typeahead and dismissal.
 *
 * A `lib` recipe ships no `*.doc.ts`, so `check:contrast` cannot see it and no
 * component test renders it on its own. Its pairs are declared in
 * `menu.doc.ts`, and `menu.browser.test.tsx` renders a Menu row beside a
 * ContextMenu row and compares their COMPUTED styles — asserting values on
 * each separately would pass while the two drifted apart.
 */

/**
 * The popup.
 *
 * radius-md over a 4px inset around radius-sm rows: 4 + 4 = 8, concentric
 * exactly (§6). The sheet draws an EIGHT-px inset, which does not close —
 * 4 + 8 wants a 12px outer radius and the scale has no 12px step. Select's
 * panel resolved the identical arithmetic the identical way, and a menu and a
 * select list sitting on the same page have to be the same box.
 *
 * The two `--available-*` caps are not decoration: Base UI flips and shifts a
 * panel near an edge by default, which looks like the problem is handled, but
 * repositioning cannot make a panel SMALLER than the space it lands in (§7c).
 */
export function menuPanel(className?: string): string {
  return [
    "min-w-56 rounded-md p-xs",
    "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
    "bg-surface border border-edge-subtle shadow-md",
    // The panel TAKES focus on open, and a user-agent outline around the whole
    // popup is not the indicator — the highlighted ROW is.
    //
    // `outline-hidden` rather than `outline-none`, and the reason is narrower
    // than it first looks: MEASURED, both set `--tw-outline-style: none` on
    // the panel, and the rows are unaffected either way because their own
    // outline utilities reset the variable to `solid` on themselves. What
    // `outline-hidden` keeps that `outline-none` does not is the transparent
    // 2px outline under forced colours, so the panel still has a boundary
    // where the author fill and shadow are flattened away.
    "focus:outline-hidden",
    // Opacity ONLY, no scale — and the scale is not missing, it was removed.
    //
    // Base UI's `--transform-origin` points at the ANCHOR, which for a menu
    // sits inside the panel rather than at a corner: measured at `44.6px -8px`
    // on a 224px panel. Scaling about a point 45px in from the left edge moves
    // that edge as the panel grows — 220px wide at 40.9 left, settling at
    // 224px at 40.1 — and the origin itself shifts between the first two
    // frames, so it slides while it grows. Reported as a wiggle, which is
    // exactly what it is.
    //
    // It only showed on a CONTROLLED menu: open state routed through React
    // makes the panel mount with `data-starting-style` and actually run the
    // transition, where the uncontrolled path measured a constant box from
    // frame 0. A defect that hides in half its configurations.
    "transition-[opacity] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
    "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A row.
 *
 * `text-body-lg`, NOT `text-title-sm`. Both peak at 16px and the sheet draws
 * 16, but the title roles are FLUID — `clamp(…vw…)` — and a menu panel is a
 * fixed-width surface that a narrow viewport does not shrink. The identical
 * substitution is recorded on Sidebar, which draws the same 16/600 row.
 *
 * The general ink roles, NOT the sheet's nav ones — and this is a measured
 * decision, not a preference. The sheet paints the panel `--ui-bg-surface`
 * and its rows `--ui-nav-ink`, which mixes two role families: the nav inks
 * are derived against `--ui-nav-bg`, the rail they belong to. Declaring
 * `--ui-nav-ink-muted` on `--ui-bg-surface` made the resolver's own audit
 * fail at **1.03:1** in dark for the saturated-accent seed, because no single
 * ink can satisfy two surfaces that far apart once a brand pulls them apart.
 *
 * The layer names on the artboard say where the mix came from: the rows are
 * called "Primary Level 1 Item" and "Second Level 2 Item" — Sidebar frames,
 * copied. Using `--ui-text-primary` on `--ui-bg-surface` with `--ui-bg-hover`
 * for the highlight makes these rows identical IN ROLE to Select's list,
 * which is the right answer anyway: two panels on one page should be one
 * panel. Recorded in `needsDesign`.
 */
export function menuItem(className?: string): string {
  return [
    "flex w-full cursor-pointer items-center justify-between gap-sm rounded-sm p-md",
    "text-body-lg font-body font-bold leading-normal tracking-tight",
    "text-ink-primary select-none",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
    // `data-highlighted` is the behaviour layer's own pointer-and-keyboard
    // state; it is what moves with the arrow keys, and it is set on the row
    // whether it arrived by hover or by keyboard.
    "data-[highlighted]:bg-hover data-[highlighted]:text-ink-primary",
    // Forced-colors flattens author backgrounds, so the highlight has to have
    // a second channel there or the keyboard user loses their place entirely
    // — the same failure the box-shadow focus rings had.
    "data-[highlighted]:forced-colors:outline data-[highlighted]:forced-colors:outline-2",
    "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The gap between groups.
 *
 * SPACE, with no rule — the sheet's own drawing, confirmed by design after
 * this shipped a hairline for one day. The argument for the line was that
 * whitespace the same size as the gap between two ordinary rows tells a
 * sighted user nothing; the answer is that it is NOT the same size. Rows sit
 * flush against each other, so an 8px band is the only vertical space in the
 * panel and reads as a break on its own.
 *
 * It stays a `role="separator"` element either way, so the grouping is
 * announced whether or not anything is painted.
 */
export function menuSeparator(className?: string): string {
  return ["my-sm h-px bg-transparent", className].filter(Boolean).join(" ");
}

/** A group heading. Quieter and smaller than a row; never interactive. */
export function menuGroupLabel(className?: string): string {
  return [
    "px-md pt-md pb-sm",
    "text-label-sm font-body font-bold leading-flat tracking-tight text-ink-muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
