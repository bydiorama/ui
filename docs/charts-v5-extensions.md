# Charts V5 — candidate extensions to the library

Status: **proposal**, 2026-11-12. Nothing here is scheduled. Plan §5 says
V5 is "on demand only": each item below starts when a product asks for it,
not before. This document lets that request turn into a scoped piece of
work quickly, by recording what each item needs from the library, what it
would depend on, and the one problem that makes it hard.

It was written after V0–V2 and the P1 chart work, so it is checked against
what the library ships today, not against the plan's assumptions.

## Where the library stands

| Built | Not built |
|---|---|
| `lib/viz`: scales, nice ticks (`valueAxis`, now with `zero: false`), time positions, `bins()`, formatting, descriptions, table model | `d3-*` dependencies: none have been needed yet. Every scale, tick and bin is our own code. |
| `Sparkline` (md, sm, xs), `Meter`, `StatTiles`, `ChartCard` | `Heatmap` (blocked on the sequential ramp), `Donut`, `BoxPlot` |
| `Chart` primitives: Bars, Lines, Areas, Dots, Rule (horizontal and vertical); presets `BarChart`, `LineChart`, `AreaChart`, `ScatterPlot`, `Histogram`; percent stacks; linear and time x scales; one-tab-stop keyboard, live announcer, table view | **V3** Diagram viewer and **V4** Network / knowledge-graph explorer. Neither has started. |
| Tier thresholds measured (plan §3.2): SVG ≤ ~2k, Canvas 2D ~2k–~20k, WebGL above | Canvas and WebGL tiers themselves |

That last row decides most of what follows: **seven of the ten V5 items
extend V3 or V4, which do not exist.** They cannot start before those phases,
however strong the demand.

## The candidates

Dependencies were rechecked on npm on 2026-11-12. Effort is relative: *S* is
a few days inside an existing component, *M* is a new component on existing
foundations, *L* needs a new foundation.

### Charts family (can start now)

#### Sankey

- **What:** flows between stages, with link width as volume.
- **Builds on:** `Chart` root (legend, table view, announcer), the data
  palette. Nodes are categories, so the categorical slots apply.
- **Dependency:** `d3-sankey` 0.12.3, BSD-3-Clause. **Last release
  2019-09-02.** It is about 300 lines: vendor it into `lib/viz` and own it,
  as plan §3.4 already proposes, rather than depend on a dead package.
- **Hard part:** the keyboard and table model. A Sankey is a graph, not
  rows by series. Its table is a link list (source, target, value), and the
  keyboard must move along links, not along an x axis. This is the first
  chart that needs the graph keyboard model V3 was meant to design.
- **Validation:** sound, with one rule: build it after V3 settles the graph
  keyboard model, or design that model here and have V3 reuse it. Building it
  first with a one-off keyboard would leave two models.
- **Effort:** M.

#### Treemap and Sunburst

- **What:** hierarchy with area as value (treemap), or as angle (sunburst).
- **Builds on:** `Chart` root; the sequential ramp for depth or magnitude.
- **Dependency:** `d3-hierarchy` 3.1.3, ISC, maintained. V3 needs it too
  (tree layouts), so it is one dependency for two families.
- **Hard part:** labels. Most cells are too small to label, so identity
  falls back to the tooltip and the table, which must be a tree (the
  table component has no tree rows today). Sunburst adds angle reading,
  which people judge poorly. Plan §4.1's don't list should say "prefer a
  treemap or an indented table" for it.
- **Validation:** **Treemap: sound.** **Sunburst: weak.** It repeats the
  treemap's job with a less accurate encoding. Recommend building it only if a
  consumer brings a specific radial reason, such as a drill-down from a
  centre.
- **Blocked by:** the sequential ramp (same blocker as `Heatmap`), and tree
  rows in `Table` for the table view.
- **Effort:** M (treemap), S on top of it (sunburst).

#### Timeline and Gantt

- **What:** bars on a time axis, one row per task, optional dependency edges.
- **Builds on:** `BarChart orientation="horizontal"` and `xScale="time"`
  already exist. A bar from *start* to *end* (a floating bar) is the one new
  mark. `Chart.Rule at={date}` already draws "today" and milestones.
- **Dependency:** none.
- **Hard part:** ownership (plan §4.1 left it open). A timeline without
  edges is a chart. Dependency edges make it a diagram. **Recommendation:**
  the chart family owns `Timeline` (floating bars, rules, no edges). A Gantt
  with dependencies comes later, as a V3 composition that reuses the
  diagram's edge layer.
- **Validation:** sound, and the cheapest item here. The floating bar is a
  small change to `barGeometry` (a start value instead of the baseline).
- **Effort:** S (Timeline), M after V3 (Gantt with dependencies).

### Diagram family (after V3)

#### Editing

- **What:** drag nodes, connect ports, reconnect, delete, undo hooks.
- **Decision on record:** plan §8.6, viewer only. Editing is a new decision
  when a product asks for it.
- **Dependency, if asked:** `@xyflow/react` 12.12.1, MIT, maintained
  (2026-11-08). It goes in as a wrapped behaviour layer (ADR 0012), never in
  an exported type.
- **Hard part:** accessible editing. Connecting two ports by keyboard has no
  common pattern. It needs a design round before any code, and probably a
  "connect to…" combobox as the keyboard path (`check:gestures` requires a
  non-drag path).
- **Validation:** sound as recorded. Nothing found since 2026-11-09 changes
  the decision.
- **Effort:** L.

### Network family (after V4)

#### WebGL tier

- **What:** a renderer for networks above ~20k nodes (measured, plan §3.2).
- **Builds on:** `lib/shader`'s single WebGL2 context (§8.7), the
  admission rule (§3.2), and the same floor as the Canvas tier.
- **Dependency:** none, by decision. `sigma` 4.0.6 (MIT, maintained) and
  `@cosmos.gl/graph` 3.6.0 (MIT) stay technique references.
- **Hard part:** it only pays off after the Canvas tier exists. The spike
  showed Canvas 2D holding to ~20k, and V4's exit asks for 5k. **No
  consumer in sight needs this tier.**
- **Validation:** sound but premature. Of all the items, the case for it is
  weakest today. Keep the measured threshold and the decision, and build
  nothing.
- **Effort:** L.

#### Clustering and combo nodes

- **What:** colour communities, and collapse a cluster into one node.
- **Dependency:** `graphology-communities-louvain` 2.0.2, MIT (last
  modified Dec 2024), on `graphology` 0.26.0 (MIT, Jan 2025). Slow releases,
  but stable and small.
- **Hard part:** colour. Communities are unbounded in number, and the
  palette has 8 slots with a fixed order (ADR 0008). Beyond 8, it must fold
  into "Other" or use hulls with labels, never generated hues.
- **Validation:** sound. Cluster colour is the place most likely to break the
  palette rule, so the doc must state the fold-to-Other rule first.
- **Effort:** M.

#### Semantic zoom

- **What:** labels and detail appear by zoom level and node importance.
- **Builds on:** V3's viewport transform.
- **Dependency:** none.
- **Hard part:** the a11y tree must not change with zoom. A screen reader
  user has no zoom level, so the hidden structure always carries every
  label. Zoom changes only what is painted.
- **Validation:** sound. It is cheap once the viewport exists, and it is
  the main thing that makes a 2k-node SVG graph readable.
- **Effort:** S after V4.

#### Edge bundling

- **What:** route edges that run alongside each other into shared bundles.
- **Dependency:** no maintained MIT package was found. It would be our own
  code (force-directed edge bundling is about 200 lines).
- **Hard part:** a bundle hides which edge goes where, which is the fact a
  user is looking for. It needs hover to unbundle, and the adjacency list
  stays the real answer.
- **Validation:** **weak.** Research-grade, as plan §4.3 says. Keep it
  unscheduled until a consumer shows a graph that is unreadable without it.
- **Effort:** M.

#### Time-sliced graphs

- **What:** the graph at time *t*, with a slider.
- **Builds on:** V4's incremental layout with pinned nodes (which keeps the
  picture from jumping between slices), `Slider`.
- **Hard part:** announcing change. What appeared and what left between two
  slices is the information, so the live region has to say it ("3 nodes
  added, 1 removed"), and the table needs a diff view.
- **Validation:** sound, if V4's incremental layout is built as planned.
- **Effort:** M.

## Recommended order, if demand arrives

1. **Timeline** (charts, S). Nearly built already: a floating bar on the
   existing time axis.
2. **Sequential ramp, then Heatmap and Treemap** (charts, M). One token
   change unblocks three components (Heatmap, calendar heatmap, Treemap).
   This is the highest-leverage piece of work left in the charts family,
   and it is P1, not V5.
3. **Sankey** (charts, M), together with the graph keyboard model V3 needs.
4. V3, then V4 as planned. After that: semantic zoom, then clustering, then
   time-sliced graphs.
5. **Not recommended without a specific consumer:** Sunburst, edge
   bundling, the WebGL tier, editing.

## Open questions for the maintainer

- Does `Timeline` belong to charts as proposed, with dependency edges
  deferred to a V3 composition?
- Is the sequential ramp approved to start now as P1 work, ahead of any V5
  item? It needs a Paper round and an ADR 0008 amendment, like the
  categorical slots did.
- Should Sankey wait for V3, or design the graph keyboard model itself?
