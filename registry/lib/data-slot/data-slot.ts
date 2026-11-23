/**
 * A part's `data-slot` belongs to the component that renders it.
 *
 * Every part carries a stable `data-slot` (CONVENTIONS §6) — the name effects,
 * tests and a consumer's own CSS reach it by — and the component always sets
 * it AFTER the forwarded native props, because contract attributes win
 * (CONVENTIONS §5, ADR 0014). So `<Popover.Panel data-slot="tag-picker">`
 * compiled, rendered, and silently came out as `popover-panel`: the caller's
 * value was dropped with no error anywhere.
 *
 * Letting the caller win is not the fix — the slot is how every effect and
 * every test finds the part. The fix is to make the drop impossible to write.
 * TypeScript does NOT check a hyphenated JSX attribute that a props type
 * leaves undeclared, so omitting `data-slot` from the props would change
 * nothing; declaring it as `never` is what turns the call above into a
 * compile error. Target a part with your own `data-*` or `data-testid`.
 *
 * Every exported component props type intersects this. The exceptions are
 * explicit composition SEAMS, typed `"data-slot"?: string` and documented
 * (ADR 0014 §5): an atom a larger component renders as one of its own parts
 * — Button, Badge, Header.MenuButton — takes that part's name.
 * `registry/ui/data-slot.types.test.tsx` holds every component to it.
 */
export interface OwnedSlot {
  /**
   * Component-owned. Passing it is a type error: the component would
   * overwrite it. Use your own `data-*` or `data-testid` to target the part.
   */
  "data-slot"?: never;
}

/**
 * The typed exception: an ATOM that a larger component renders as one of its
 * own parts, and that therefore takes that part's name (ADR 0014 §5). The
 * value replaces the atom's default slot; nothing else about the atom moves.
 * Each seam is a decision, listed by name in `data-slot.types.test.tsx` —
 * adding one there is the review question "should this atom be renameable?".
 */
export interface SlotSeam {
  /**
   * The part name this atom carries when a larger component composes it.
   * Defaults to the atom's own slot.
   */
  "data-slot"?: string;
}
