# 0025 — Control shape and nested radii

Date: 2026-11-13
Status: accepted

## Evidence

The public Hockney design draws pill Buttons and Inputs, but its radius seed
cannot select their existing `shape="full"` composition. Making radius-md
huge would also round Tabs and panels. Its Tabs independently selected 12px
and 6px radii around 3px padding and a 1.5px stroke; Graphite selected 6px and
4px. Neither obeyed the concentric rule. Browser tests reproduce both failures.

## Decision

`SeedShape.controlShape` chooses the default for Button and Input only. It is
`soft` unless explicitly `full`. Omitting the component shape follows that
brand; an explicit `soft` or `full` always wins. Existing theme-zero behavior
and control heights remain unchanged. Checkbox, radio and surface geometry
retain their own roles. Capsule Input defaults include the existing extra
inline inset and the existing end-control inset; radius alone is insufficient.

The resolver emits control-radius and field-shape roles independently of the
surface radius ladder. Field inset values reference density variables so
compact and comfortable modes still work. Component CSS has fallbacks for
consumers that have not yet updated their theme stylesheet.

Enclosed Tabs owns a 3px track padding. Its child radius is
`max(0, radius-md - 3px - stroke-hairline)`. Shape changes do not change its
padding or height. CSS works with the declared stroke; the geometry gate keeps
its existing 0.5px tolerance for browser snapping at DPR 1. Ghost has no outer
shape and retains radius-md. Public Paper Hockney and Graphite tab corners
were corrected to 7.5px and 1.5px respectively.

Buttons explicitly suppress native appearance. Their boundary belongs to the
library ring and their focus indicator to the outline; platform button chrome
must not paint another boundary.

## Compatibility and validation

This is opt-in for brands; theme-zero default controls retain their geometry.
Explicit shape props remain authoritative. An Input with omitted shape now
reports `data-shape="theme"`, describing the source of its shape accurately.
Enclosed Tabs changes inner rounding under custom radius scales, including a
half-pixel correction in theme zero. Browser tests cover brand overrides,
geometry, target sizes, and explicit shapes; the public site checks Hockney's
computed shape and field inset. No new component library or styling prop is
introduced.
