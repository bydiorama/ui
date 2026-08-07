/**
 * Composes a consumer handler with behaviour owned by a component.
 *
 * The consumer runs first so `preventDefault()` is the explicit opt-out from
 * optional component behaviour. Invariants that must never be cancelled —
 * preventing navigation from an aria-disabled link, for example — belong in
 * an unconditional wrapper rather than in this helper.
 */
export function composeEventHandlers<
  Event extends { defaultPrevented: boolean; preventDefault(): void },
>(
  consumer: ((event: Event) => void) | undefined,
  internal: (event: Event) => void,
): (event: Event) => void {
  return (event) => {
    consumer?.(event);
    if (!event.defaultPrevented) internal(event);
  };
}
