# 0023 — The data-visualisation layer: own components on wrapped maths

**Status:** accepted · 2026-11-10 · first items `viz` and `sparkline` ship as
`experimental`

## Context

Products need charts, and later node-link diagrams and explorable knowledge
graphs. `docs/charts-and-graphs-plan.md` scoped all three and recorded seven
decisions on 2026-11-09 (§8): go, charts first; eight categorical slots; keep
solid strokes; own components on wrapped d3 maths; MIT layout only; a diagram
viewer, not an editor; a WebGL tier built on `lib/shader`. The Paper Charts
page then drew the palette, the anatomy, the sparkline and meter, bar, line
and area, and the effect variants, in both schemes. This record turns the
parts of that plan code now depends on into rules.

## Decision

1. **Dependencies.** Charts are our components on pure maths modules
   (ADR 0002, amendment 2026-11-10). A maths module is imported only from
   `registry/lib/viz` or a chart component's own implementation file; its
   types never reach a public prop. Formatting is `Intl`, never a d3-format
   specifier in a prop. Chart component libraries are not wrapped.

2. **Rendering tiers.** SVG is the default and the floor. A Canvas or WebGL
   tier is admitted on ADR 0022's terms: it paints only pixels it owns, reads
   every ink from a token, is a separate optional entry point, and its floor
   (the SVG render, or the accessible table or list) carries every fact. The
   tier thresholds in the plan are guesses until a spike measures them.

3. **Data in, marks out.** Data arrives as props — rows plus accessors for
   charts, our own `GraphNode` / `GraphEdge` for graphs. No fetching, no store,
   no library series format. Every user-visible string is a prop.

4. **Accessibility contract.**
   - The root is a `figure`-like element with an accessible name; the
     `description` prop carries the takeaway a person wrote.
   - A chart with axes ships a data-table alternative. Only a label-less
     inline chart (`Sparkline`) may let its `description` stand in for it,
     and its types require that description.
   - A series is never told apart by colour alone: direct labels, marker
     shape, or gaps. This is what makes the CVD floor of 6 legal (ADR 0008,
     amendment 2026-11-10).
   - Interactive charts give the plot one tab stop with arrow-key navigation
     and polite announcements. Non-interactive charts ship no handlers.
   - Forced colours fall back to system colours, with shape and hatching
     carrying the series.

5. **Tokens.** Series take ordinal slots `--ui-data-cat-{1…8}`, assigned in
   order and never cycled; a ninth series folds into "Other" or small
   multiples. Each slot's mark is a non-text contrast pair on `bg-base` and
   `bg-surface`. Structural chart roles (grid, axis) are aliases of existing
   border and ink roles until a chart needs a value none of them has.

6. **Strokes and motion.** Strokes are solid and come from `--ui-stroke-*`
   (CONVENTIONS §6, ADR 0020 §2). A forecast is muted ink, a threshold a solid
   rule with a label. Data transitions use motion tokens and swap instantly
   under reduced motion; a force layout settles before its first paint.

7. **Determinism.** The same data renders the same SVG on the server and the
   client, every run, so the visual gate means something.

8. **Effect variants are opt-in.** The Paper sheet's gradient, sheen, glow,
   grain and halo variants are not defaults. When built they arrive as fx
   classes (ADR 0022), never as chart props, one per view.

## Consequences

- The first items are `registry/lib/viz` (scales, extents, paths, `Intl`
  formatting) and `Sparkline`. Meter, the `Chart` primitives and the bar and
  line presets follow on the same rules.
- `check:boundaries` gains the maths modules as soon as one is imported.
  `lib/viz` V1 imports none: a linear scale and a polyline are a few lines of
  arithmetic, and a dependency is admitted when a chart needs more than that
  (band scales, time ticks, curves), not before.
- Open: Aspekta's `tnum` (ADR 0011) must be confirmed before an axis relies on
  it; the glow variant needs a series-coloured `--ui-data-glow` because
  `--ui-fx-glow` follows the accent (Paper sheet, Gaps).
