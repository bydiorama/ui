# 0014 — Contract attributes win; consumer events can cancel optional behaviour

**Status:** accepted · 2026-08-07

## Context

The forwarding rule said that contract props win and event handlers are
composed, but its event-order sentence was internally contradictory: the
component could not run first while also letting a later consumer
`preventDefault()` stop it. Several implementations then spread native props
last. That let `aria-busy={false}` erase Button's busy state,
`aria-invalid={false}` disconnect Input's error, and consumer pointer handlers
replace CardSorting's drag behaviour entirely.

Composition adds one wrinkle. An atom used as a part of a larger component may
need the larger component's slot name: CardSorting's internal Button is the
`card-sorting-handle`, not an independently targetable `button`. Treating every
attribute as immutable broke that legitimate composition.

## Decision

1. Contract-managed state, behaviour and accessibility attributes are applied
   after forwarded native props and therefore win at runtime.
2. Consumer event handlers run first. Calling `preventDefault()` cancels
   optional component behaviour; otherwise the component handler runs next.
3. Safety invariants are not optional. An `aria-disabled` link always prevents
   navigation, then notifies the consumer handler.
4. `className` is merged and `style` is shallow-merged rather than replaced.
5. A component may expose an explicit composition seam for a structural
   attribute. Button permits a higher-level component to provide `data-slot`;
   that exception is typed and documented rather than obtained accidentally
   through spread order.

## Consequences

- Components use the shared `compose-event-handlers` registry item instead of
  ad-hoc ordering.
- A forwarded ARIA attribute cannot contradict a dedicated component prop.
- Higher-level components retain their own stable part names when composed
  from lower-level atoms.
- Tests assert observable precedence, not the presence of a JSX prop.
