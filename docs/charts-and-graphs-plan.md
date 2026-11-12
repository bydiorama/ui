# Charts, diagrams and knowledge graphs — implementation plan

**Status:** accepted direction, 2026-11-09; charts V0–V2 built by 2026-11-11
on branch `charts`. V0's spike is still open (it gates V4, not charts), and
V2's exit — a product screen adopting these — is not met: the stand-in screen
in §5 ("V2 stand-in") is the closest this repository can get on its own.
The seven decisions in §8 were answered on 2026-11-09: **go, charts first**.

This document has two jobs:

1. Plan a data-visualisation layer that goes beyond classic charts. It also
   covers node-link diagrams and explorable knowledge graphs.
2. Record the outside references we looked at, and say which of them we may
   **depend on**, which we may only **learn from**, and which we may not use
   at all.

When this work moves into code, `PLAN.md` gets a section for it and this file
becomes the history, the same way `design/paper/sheet-implementation-plan.md`
did.

---

## 1. Scope: three families, one layer

"Graph" means two different things. The plan keeps them apart, because the
data, the rendering and the keyboard model are all different:

| Family | What it shows | Data shape | Typical size | Nodes are… | Renderer floor |
|---|---|---|---|---|---|
| **Charts** | Quantities on scales: bar, line, area, scatter, heatmap | rows × fields | 10 – 10k marks | marks | SVG |
| **Diagrams** | Structure people read: flows, pipelines, org charts, dependency trees, mind maps, state machines | nodes + edges, usually a DAG or a tree | 5 – 500 nodes | **UI** (cards, badges, avatars) | SVG edges + HTML nodes |
| **Networks / knowledge graphs** | Relations people *explore*: entities, typed predicates, clusters, paths | typed nodes + typed edges (a property graph, or RDF triples) | 100 – 100k+ nodes | glyphs (circle, icon, label) | SVG ≤ ~2k, then Canvas, then WebGL |

The three share a lot:

- tokens
- scales and formatting
- the viewport (pan and zoom)
- selection and focus
- legend and tooltip
- the accessible-alternative pattern

So these are three surfaces on one layer, not three libraries. Section 3
describes that layer.

---

## 2. What this repo has already decided for us

Most of the hard choices are already settled by ADRs and gates. A charting
layer that ignores them will fail `pnpm verify` or a review. The table maps
each rule to what it means for charts and graphs:

| Rule | Where it lives | What it means here |
|---|---|---|
| Built from scratch; no third-party component library or design language | ADR 0002 | **No Recharts, Nivo, ECharts, Victory, MUI X, Tremor or G6 as components.** They ship component code *and* visual opinions. We may still depend on **maths and layout** modules (scales, shapes, force, hierarchy, layered layout). This needs a short amendment to 0002, which adds a fourth "infrastructure" row: *layout and scale mathematics*. |
| A behaviour library is wrapped; its types never appear in a public signature | ADR 0012, `check:boundaries` | `d3-*`, `graphology`, `dagre`, `elkjs` and any WebGL renderer are imported only by implementation files. Public props use our own `GraphNode`, `GraphEdge` and `ScaleSpec` types. Extend `check:boundaries` to these packages. |
| No data layer, no fetching, no stores | CONVENTIONS §9 | Data arrives as props. Knowledge-graph expansion is a callback (`onExpandRequest(nodeId)`). The consumer fetches and passes the new nodes back. |
| Semantic tokens only | AGENTS.md, CONVENTIONS §6 | Series colours, grid, axis and edge inks must be **contract tokens**. Today the contract has only four categorical hues (§3.8). |
| **Strokes are solid**: no dashed or dotted lines anywhere | CONVENTIONS §6, `check:strokes` rule B | This clashes with three charting habits: dashed gridlines, dashed forecasts, and dashed series as a non-colour channel. Section 3.7 proposes solid answers. If design disagrees, it needs an ADR. |
| Stroke widths come from the scale | ADR 0020 §2 | Line series, edges, axes and focus rings use `--ui-stroke-*`. A thick edge for a strong relation is `-thick`, never `stroke-width="3"`. |
| No monospace face; numbers align with `tabular-nums` | ADR 0011 | Tick labels, data labels and tooltips use `tabular-nums`. **Check that Aspekta ships `tnum`** (ADR 0011 already asks for this) before an axis depends on it. |
| A type role is a composite | ADR 0020 §3, `check:type-roles` | Tick labels, axis titles, data labels and node labels each need a role. A 10px tick label in SVG is a new role or a declared exception. It is not an arbitrary `font-size`. |
| Motion comes from tokens, CSS first, reduced motion at the token layer | ADR 0005 / 0018, `check:motion` | Data transitions use `--ui-duration-*`. With reduced motion, a force layout **settles off-screen and paints once**. It never animates. |
| A pointer gesture needs a keyboard path | `check:gestures` | Pan, zoom, node drag and lasso all need keyboard equivalents, or the gate fails. |
| Every portalled surface has a z role | CONVENTIONS §7a, `check:overlays` | The chart tooltip is a Tooltip or Popover with a **virtual anchor** at `--ui-z-tooltip`. A graph's detail panel is a `Sheet` or `Drawer`. |
| A shader is admitted only if it owns its pixels, reads tokens and keeps the component as its floor | ADR 0022, `check:fx` | This is the template for the **WebGL tier**: optional, server-safe, inks read from tokens, and the SVG or list view as its floor (§3.2). |
| Static and server rendering works | `static-rendering` skill | Charts render as **static SVG on the server** and hydrate only for interaction. A chart with no interaction ships no JavaScript beyond what layout needs. |
| Visual baselines in both schemes, on two platforms | AGENTS.md § Visual regression | Layouts must be **deterministic**: seeded force layout, a fixed tick count. A layout that moves between runs makes the visual gate useless. |
| Contrast is measured, never typed | `check:contrast`, `*.doc.ts` `contrastPairs` | Every mark against its ground is a **non-text** pair (3:1, SC 1.4.11). Labels on marks are text pairs. |

---

## 3. Architecture

### 3.1 Layers

```
@bydiorama/tokens      --ui-data-* (categorical, sequential, diverging, structural)
                       --ui-graph-* (node, edge, selection, dimmed)
        │
registry/lib/viz       scales · ticks · number/date formatting (Intl, never an i18n runtime)
                       layout adapters (layered, tree, force, radial)
                       viewport maths (pan/zoom transform, fit, clamp)
                       a11y helpers (description builder, data-table model, live announcer)
                       useChartNavigation / useGraphNavigation (roving focus over marks/nodes)
        │
registry/ui/chart      Chart (compound): Root · Plot · XAxis · YAxis · Grid · Bar · Line ·
                       Area · Point · Rule · Legend · Tooltip · Table
registry/ui/sparkline  inline, label-less trend
registry/ui/meter      single value against a range (pairs with Progress)
registry/ui/diagram    Diagram (compound): Root · Viewport · Node · Edge · Group ·
                       Controls · Minimap · Legend
registry/ui/network    Network (compound) on the Canvas / WebGL tier
        │
registry/blocks/       StatTiles · ChartCard · KnowledgeGraphExplorer · LineageView
                       (Phase 3 blocks; these do not exist yet, see PLAN.md)
```

There are **two layers of API on purpose**:

- The compound primitives (`Chart.*`, `Diagram.*`) cover customisation.
  CONVENTIONS §3 asks for composition, not a pile of props.
- A few **presets** (`BarChart`, `LineChart`) are thin compositions of those
  primitives, for the common case. A preset that starts growing props becomes
  a block or goes back to being a composition.

### 3.2 Rendering tiers and the admission rule

| Tier | When | Server-render | Forced colours | A11y tree | Cost |
|---|---|---|---|---|---|
| **SVG** (default) | Every chart; diagrams; networks ≤ ~2k elements (measured) | ✅ static markup | ✅ CSS system colours | marks can be focusable | DOM grows with marks |
| **Canvas 2D** | Dense scatter or heatmap; networks ~2k – ~20k (measured) | ❌ → server sends the SVG/list floor | ❌ → falls back to the floor | a parallel hidden structure | one paint surface |
| **WebGL** (optional) | Networks above ~20k, or a GPU force layout | ❌ | ❌ | same as Canvas | a context, shaders, GPU memory |

The thresholds were **measured by the Phase V0 spike** (2026-11-12) in the
pinned Chromium (Playwright 1.62.1, Chromium 151), headed on an Apple-silicon
Mac's GPU at a 2× device pixel ratio, 1280×800, nodes as 4px circles with
1.5 edges per node. Each case ran 90 frames; the table gives the median frame
time and, in brackets, the 95th percentile, in ms. **No phone was available**:
the "4× CPU" columns use Chromium's CPU throttling as the mid-range-phone
stand-in, which slows script and layout but not the GPU, so they flatter
Canvas 2D and WebGL. The tier stays `experimental` until it has been seen on
a real phone, as §8.7 already says.

| Nodes | SVG pan | SVG restyle every node | Canvas 2D redraw | WebGL redraw | | SVG pan, 4× CPU | SVG restyle, 4× CPU | Canvas 2D, 4× CPU | WebGL, 4× CPU |
|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| 500 | 8.3 (9.1) | 8.3 (9.0) | 8.3 (9.3) | 8.3 (9.2) | | 8.3 (9.2) | 8.3 (9.1) | 8.3 (9.2) | 8.3 (9.3) |
| 2,000 | 8.3 (9.1) | 8.3 (8.9) | 8.3 (9.2) | 8.3 (9.3) | | 8.3 (9.2) | 8.3 (9.3) | 8.3 (9.1) | 8.3 (9.2) |
| 3,000 | | 8.3 (10.1) | | | | | **16.5 (18.2)** | | |
| 5,000 | | 8.3 (10.2) | | | | | **33.0 (40.7)** | | |
| 10,000 | 8.3 (9.2) | **24.8 (25.8)** | 8.3 (9.2) | 8.3 (9.3) | | 8.3 (9.2) | **91.8 (100.2)** | 8.3 (16.5) | 8.3 (9.3) |
| 20,000 | 8.4 (16.6) | | 8.3 (10.7) | | | 9.8 (18.5) | | **16.7 (25.0)** | |
| 30,000 | 9.3 (17.7) | | 8.4 (16.7) | | | 8.7 (18.2) | | **25.6 (40.9)** | |
| 50,000 | 16.7 (33.3) | **375 (392)** | 8.4 (17.5) | 8.3 (9.1) | | 25.4 (41.7) | over 60 s | **42.3 (58.6)** | 8.3 (10.3) |

8.3 ms is the display's 120 Hz refresh: those cases had headroom left over.
The budget the thresholds hold to is 60 fps (16.7 ms) at 4× CPU.

What the numbers say:

- **A pan alone does not separate the tiers.** Translating one SVG group is
  composited, and holds to 30k nodes. The SVG cost appears when every mark is
  restyled, which focus with neighbourhood dimming, hover and filtering all
  do. **That is the number the SVG ceiling follows: about 2k elements**, with
  the budget gone at 3k on the throttled CPU. The guess of ~2k stands.
- **Canvas 2D redraws everything each frame** and runs out at about 20k on
  the throttled CPU: it meets the budget at 20k and misses it at 30k. The
  guess of ~30k was too high, so the Canvas ceiling and the WebGL floor move
  to **~20k**.
- **WebGL held a full redraw of 50k at the refresh rate** on both CPUs.
  Its floor is set by Canvas's ceiling, not by its own cost.
- **Headless Chromium paints in software** (SwiftShader). There, Canvas 2D
  took 91 ms a frame at 500 nodes. A test that measures a tier must run
  headed or on a GPU runner, or it measures the wrong thing.

The spike code was thrown away, as planned. It was a single HTML page with
seeded random graphs and a Playwright runner, run outside the repository.

A tier above SVG is admitted on the same terms as a shader under ADR 0022:

1. It paints only pixels it owns.
2. Every ink comes from a token, read with `getComputedStyle` on the root
   where the chart sits (as `lib/shader` already does). It is re-read on a
   scheme or theme change.
3. Its **floor is complete**. Without the tier (no WebGL, before hydration,
   forced colours) the user still gets every fact, from the SVG render or an
   accessible list and table.
4. It is **optional**: a separate entry point, so its dependency is never
   installed for a consumer who does not use it.

### 3.3 Data model

**Charts** take rows plus accessors. They never take a library's series
format:

```ts
<Chart data={rows} label="Revenue by month" description="Rose 18% from January to June.">
  <Chart.XAxis field="month" scale="band" />
  <Chart.YAxis field="revenue" format={{ style: "currency", currency: "EUR", notation: "compact" }} />
  <Chart.Grid axis="y" />
  <Chart.Bar field="revenue" series="informational" />
  <Chart.Tooltip />
  <Chart.Legend />
</Chart>
```

- `format` is an `Intl.NumberFormat` / `Intl.DateTimeFormat` options object, or
  a function. **No d3-format specifiers in a public prop**, because that would
  leak a dependency's mini-language into the API.
- Every user-visible string is a prop (`label`, `description`, axis titles,
  legend names). There is no i18n runtime.

**Graphs** take one neutral, serialisable shape. It is our own type. It is not
graphology's, React Flow's or Cytoscape's:

```ts
type GraphNode<D = unknown> = {
  id: string;
  label: string;            // required: the accessible name
  type?: string;            // a key into `types` → colour, glyph and shape tokens
  position?: { x: number; y: number }; // given → no layout for this node (pinned)
  parentId?: string;        // grouping / compound nodes
  data?: D;                 // opaque; handed back in callbacks and render slots
};
type GraphEdge<D = unknown> = {
  id: string;
  source: string;
  target: string;
  label?: string;           // the predicate in a knowledge graph ("works_at")
  type?: string;
  isDirected?: boolean;     // default true
  weight?: number;          // drives the stroke step, never a raw width
  data?: D;
};
type GraphTypes = Record<string, {
  label: string;            // "Person", "Organisation": legend and announcements
  tone: DataTone;           // a categorical token key, never a colour
  glyph?: ReactElement;     // a griddy-icons slot
}>;
```

- **Knowledge graphs are typed graphs.** RDF, JSON-LD or Neo4j results are
  turned into this shape by a **recipe in the docs**, not by a parser in the
  registry (no data layer).
- **Exploration is consumer-driven.** `onExpandRequest(node)` asks for
  neighbours. The consumer fetches them and appends to `nodes` and `edges`.
  The layout runs **incrementally**, with nodes that already exist pinned, so
  the picture does not jump.

### 3.4 Dependencies (proposal; each is behind a wrapper)

| Package | Licence | Used for | Ships to the consumer as |
|---|---|---|---|
| `d3-scale`, `d3-array`, `d3-time`, `d3-interpolate` | ISC | scales, ticks, extents, binning | a dependency of `lib/viz` |
| `d3-shape` | ISC | line, area, arc and stack generators; curves | a dependency of `chart` |
| `d3-delaunay` | ISC | Voronoi hit-testing, so every point gets a ≥ 24px target (SC 2.5.8) | a dependency of `chart` |
| `d3-hierarchy` | ISC | tree, cluster, treemap, partition, pack | a dependency of `diagram` |
| `d3-force` | ISC | force-directed layout (deterministic with a seeded `randomSource`) | a dependency of `network` |
| `@dagrejs/dagre` | MIT | layered (Sugiyama) layout for flows and DAGs. Use the maintained `@dagrejs` fork: plain `dagre` stopped at 0.8.5 in 2019. | a dependency of `diagram` |
| `d3-dag` | MIT | the alternative layered engine (Sugiyama, Zherebko, grid), and the MIT answer to elkjs | spike against dagre in V0, then keep one |
| `elkjs` | **EPL-2.0 OR GPL-3.0-or-later** | best layered layout, ports, orthogonal routing | **avoid**: copyleft, outside our licence set (§8) |
| `graphology` (+ selected `graphology-*`) | MIT | graph algorithms: neighbourhoods, shortest path, Louvain communities, ForceAtlas2 | a dependency of `network`, never in a signature. The ForceAtlas2 package has had no release since 2022. |
| `data-navigator` | MIT | keyboard and screen-reader navigation over any renderer (SVG, Canvas, WebGL) | **candidate** for `useChartNavigation` / `useGraphNavigation`. Evaluate in V1 against writing our own. |
| `d3-sankey` | BSD-3 | Sankey layout | **no release since 2019**. It is small, so vendor and own it when Sankey is built (P2). |
| WebGL renderer: **our own, on `lib/shader`'s single WebGL2 context** (§8.7) | — | the WebGL tier | a separate optional entry point; no new dependency |

We do **not** need `d3-selection`, `d3-transition` or `d3-zoom`. React owns
the DOM. Transitions are CSS. Pan and zoom is a small transform in `lib/viz`
that we own, because it must also have a keyboard path (`check:gestures`) and
must respect our motion tokens. d3-zoom's behaviour could be borrowed, but its
event model and DOM ownership fight React.

### 3.5 Layout: where it runs, and how it stays deterministic

| Layout | Engine | Runs | Determinism |
|---|---|---|---|
| Chart scales and ticks | d3-scale | sync, server and client | pure |
| Tree / radial tree / treemap | d3-hierarchy | sync, server and client | pure |
| Layered (flows, DAGs) | dagre (elkjs if admitted) | sync up to ~300 nodes, otherwise in a worker | pure given node sizes |
| Force | d3-force or ForceAtlas2 | a worker above ~500 nodes; *n* ticks synchronously for SSR and tests | seeded `randomSource` and a fixed tick count |
| Given `position` | none | anywhere | pure |

**Diagram nodes are real UI, so their sizes are measured.** That needs the
DOM, which in turn rules out an *automatically laid-out* diagram on the
server. There are three honest options, which are not exclusive:

1. The consumer passes positions (from a saved layout, or computed on their
   server). The diagram is then a pure server render.
2. The consumer passes a size hint per node type. The server lays out with the
   hint, and the client corrects after measuring.
3. Client-only layout, with a `Skeleton` floor.

The doc file has to say which of these applies. It must not hide it.

Workers in source-distributed code use `new Worker(new URL("./layout.worker.ts", import.meta.url), { type: "module" })`.
Vite, Next and Astro all bundle that. A consumer on an unusual bundler gets
the synchronous path, so the worker is an optimisation, never a requirement.

### 3.6 Accessibility model

There are two parts:

- an **alternative** that holds all the information
- a **keyboard path** through the graphic itself

The second does not replace the first.

**Charts**

- The root is `role="figure"`, with `aria-labelledby` (title) and
  `aria-describedby` (the `description` prop: the takeaway, written by a
  person). The SVG inside is `role="img"`, or `role="graphics-document"` when
  it is interactive.
- `Chart.Table` renders the same data through our `Table` component. It is
  either visible behind a toggle, or visually hidden. **It is required unless
  `description` already says everything**, and the type allows that only for a
  `Sparkline`.
- Keyboard: **one tab stop** for the plot.
  - ←/→ move along a series; ↑/↓ change series; Home/End go to the ends.
  - Enter fires `onSelect`; Esc leaves the plot.
  - Each move is announced through a polite live region, built from `label`,
    the x value, the series name and the formatted y value.
- The pointer target is the Voronoi cell, not the 4px dot. The **focus ring**
  is drawn around the mark with `outline-focus` stroke tokens.
- Series are never told apart by colour alone. Use:
  - **direct labels at the line end** (preferred)
  - marker **shape** (circle, square, triangle, diamond)
  - **hatching** for areas and bars in forced colours (solid hatch lines, so
    the solid-strokes rule holds)
- Forced colours: marks fall back to `CanvasText`, `Highlight` and
  `GrayText`, with shape and hatch carrying the series. This is tested next to
  `focus-forced-colors.browser.test.tsx`.

**Graphs**

- The alternative is an **adjacency list**: each node is a list item ("Ada
  Lovelace, Person. 3 relations: *collaborated with* Charles Babbage, …"), and
  each relation is a link that moves focus to that node. For trees it is a
  `role="tree"`.
- Keyboard: one tab stop for the canvas.
  - Arrows move to the **nearest node in that direction** (spatial
    navigation).
  - `Tab` inside the canvas cycles the focused node's **relations**.
  - Enter selects; `Space` toggles expansion.
  - `+`/`-`/`0` zoom in, zoom out and fit. Arrow keys with a modifier pan.
  - Every move is announced, with the relation name: "*works at* → Diorama,
    Organisation".
- The viewport **follows focus**, so the focused node is always in view. This
  covers SC 2.4.11 for an element that can otherwise be panned off-screen.
- Selection, focus and "dimmed because outside the focused neighbourhood" are
  three states, and each has a non-colour cue: ring, weight, opacity plus
  label.

### 3.7 Interaction, motion and the strokes question

- **Tooltip.** A Popover at `--ui-z-tooltip` anchored to a virtual rect at the
  mark. It follows focus as well as the pointer. Its content is a slot, and
  its default layout uses the type roles.
- **Crosshair, brush and zoom** on charts come later (Phase V2+). Each needs a
  keyboard path before it ships.
- **Data transitions.** Bars and lines retarget with CSS transitions on
  `transform` and `d` where supported, using `--ui-duration-standard`. A full
  data replace cross-fades. Under reduced motion, the data swaps instantly.
- **Force layout.** The simulation runs off-screen to "alpha < threshold"
  before the first paint. Live "wobble" is an opt-in, and it is off under
  reduced motion.
- **Dashes.** The solid answers, consistent with the rule's own reasoning:

  | Habit | Solid answer |
  |---|---|
  | Dashed gridlines | Hairline gridlines in `--ui-data-grid` (low-contrast, decorative), y-axis only by default |
  | Dashed forecast or projection | The same line in **muted ink** plus a lighter confidence band. The rule already says "a pending item is a muted ink", and a forecast *is* pending. |
  | Dashed target or threshold | A solid `Chart.Rule` with a direct label |
  | Dashed series to separate lines | Direct labels and marker shapes |
  | Dashed "inferred" edge in a knowledge graph | Muted ink, a `-hairline` stroke, and the word "inferred" in the edge's accessible name |

### 3.8 Tokens to add

Today's contract has `--ui-data-{informational|commercial|transactional|navigational}-{fg|bg|solid}`.
These are four *named* categories that come from one product's search-intent
domain (ADR 0006(a)). A general layer needs **ordinal slots**. The four named
ones then become aliases.

| Group | Tokens | Derivation |
|---|---|---|
| Categorical | `--ui-data-cat-{1…8}-{solid,bg,fg}` (**8 slots, decided in §8.2**) | **Curated, never derived from the accent** (ADR 0006(a)). Steps 40 of the five ramps give 4–5 usable hues: red is reserved for `danger`. **The remaining 3–4 hues are new, so ADR 0008 needs an amendment and a Paper round.** |
| Sequential | `--ui-data-seq-{1…7}` | Derived from the accent: OKLCH lightness monotonic, hue fixed. Ordered data may carry the brand. |
| Diverging | `--ui-data-div-{neg-3…pos-3}` | Two curated hues, with a neutral midpoint from the warm-grey ramp |
| Structural | `--ui-data-grid`, `--ui-data-axis`, `--ui-data-label`, `--ui-data-dimmed-opacity`, `--ui-data-highlight` | Aliases of existing ink and border roles where they fit. `check:token-consumers` asks for a real consumer. |
| Graph | `--ui-graph-edge`, `--ui-graph-edge-active`, `--ui-graph-node-ring`, `--ui-graph-canvas` | Aliases first. `--ui-graph-canvas` probably *is* the `DotPattern` ground. |

New checks belong in the resolver's audit, so they run for every brand theme
and the stress brand:

- every categorical solid ≥ 3:1 against `bg-base` and `bg-surface`, in both
  schemes (this is already how `legibleOn` works)
- adjacent categorical slots are **apart by OKLCH ΔE ≥ a set floor**, under
  normal vision *and* simulated deuteranopia, protanopia and tritanopia (the
  Machado 2009 matrices, as a pure Node test)
- the sequential ramp's lightness is strictly monotonic

---

## 4. Component inventory and priorities

Priority follows how much each item **unlocks**, not how impressive it is.
A sparkline and a stat tile have a named home already: `StatTiles` is on
PLAN.md's Phase 3 list.

### 4.1 Charts

| Pri | Item | Notes |
|---|---|---|
| **P0** | `Sparkline` | Inline, no axes. The one chart where `description` can replace the table. Proves tokens, SSR and determinism at the smallest size. |
| **P0** | `Meter` | One value against a range or a target, linear and radial. Overlaps "Progress Indicator Circular" in TODO.md, so settle together whether that is one component. |
| **P0** | `Chart` primitives + `BarChart` (vertical, horizontal, grouped, stacked) | The bar is the workhorse. It proves axes, band scales, legend, tooltip, keyboard and table. |
| **P0** | `LineChart` / `AreaChart` (incl. stacked area) | Time scales, curves, direct labels, markers, forecast in muted ink. |
| P1 | `ScatterPlot` (+ bubble) | **Built 2026-11-12** (`xScale="linear"`, `Chart.Dots`, `areaKey` for bubbles). Hit-testing is nearest-dot within 24px, not Voronoi, so no `d3-delaunay` yet. SVG only: a dense scatter needs the Canvas tier, which is not built. |
| P1 | `Heatmap` / calendar heatmap | **Not built.** Needs the `--ui-data-seq-{1…7}` ramp first: contract, resolver derivation, `ZERO_AUTHORED` pins in both schemes, the monotonic-lightness test, and contrast pairs for cell labels, then a Paper round. That is a token change with its own review, so it was left out of the chart PR rather than squeezed in. |
| P1 | `Donut` | Only for parts of a whole with ≤ 5 parts. The doc's *don't* list says "prefer a bar". **Not built**: the 100% stack (`isStacked={{ isPercent: true }}`) covers the stand-in's part-of-whole cases. |
| P1 | `Histogram`, `BoxPlot` | **Histogram built 2026-11-12**, binning with `lib/viz`'s own `bins()` (nice edges, last bin inclusive), so no `d3-array`. **BoxPlot not built**: no consumer asks for one. |
| P2 | `Sankey`, `Treemap`, `Sunburst` | Flow and hierarchy charts. Treemap and sunburst share `d3-hierarchy` with Diagram. |
| P2 | `Timeline` / `Gantt` | Very close to Diagram (bars with dependency edges). Decide which family owns it. |
| P2 | `ChartCard` block | Title, value, delta, chart and "view as table". The StatTiles neighbour. |

### 4.2 Diagrams (node-link, nodes are UI)

| Pri | Item | Notes |
|---|---|---|
| **P0** | `Diagram` viewer: Root, Viewport, Node (slot for any content), Edge (straight, curved, orthogonal; arrow marker; label), Controls (zoom, fit; `chrome-control`), layered and tree layouts | Read-only, with pan, zoom, select and keyboard. Covers pipelines, lineage, org charts, dependency graphs and state machines. |
| P1 | `Diagram.Group` (compound and nested nodes, collapse) | Subflows; the group collapses to a single node. |
| P1 | `Diagram.Minimap`, `Diagram.Legend` | |
| P1 | `MindMap` preset | Radial tree layout, expand and collapse. |
| — | **Editing**: drag nodes, connect ports, reconnect, delete, undo hooks | **Out of scope: viewer only (§8.6).** If a product asks for it later, that is a new decision, and React Flow / xyflow (MIT) as a wrapped behaviour layer is the first option to evaluate (ADR 0012). |

### 4.3 Networks and knowledge graphs (nodes are glyphs, data is explored)

| Pri | Item | Notes |
|---|---|---|
| **P0** | `Network` on SVG: force and radial layouts, typed nodes (tone + glyph), typed and labelled edges, focus + neighbourhood dimming, adjacency-list alternative | ≤ ~2k elements. Proves the graph keyboard model and the incremental layout. |
| P1 | Canvas tier for `Network` | Same API, a different renderer, same floor. |
| P1 | `KnowledgeGraphExplorer` **block**: Network + search (`Combobox`) + type filter (legend as checkboxes) + detail panel (`Sheet` / `Drawer`) + exploration history (breadcrumb) + `onExpandRequest` | The "beyond charts" target. It is a *block*, composed of components, not a bigger component. |
| P1 | Path and relation queries in the view: highlight the shortest path between two nodes, show only one predicate | Algorithms from graphology, behind `lib/viz`. |
| P2 | Clustering: community colouring, collapsing a cluster to a "combo" node, **semantic zoom** (labels by zoom level and importance) | |
| P2 | WebGL tier (≥ ~20k nodes) | Built on `lib/shader` (§8.7). Threshold measured by the V0 spike (§3.2). |
| P2 | Edge bundling, time-sliced graphs (a graph at time *t*, with a slider) | Research-grade; only with a consumer. |

---

## 5. Phases

Each phase ends on gates, not on a date, as every phase in `PLAN.md` does.

### Phase V0 — decide, measure, draw · *small*

- [x] **Demand** (charts only, 2026-11-11). The service portal's Market
      intelligence section is the one consumer: five Recharts call sites and
      six hand-drawn bar strips, mapped part by part in "V2 stand-in" below.
      Diagrams and networks still have no named consumer.
- [x] **ADR 0023 — data-visualisation layer.** Covers the dependency policy
      (the ADR 0002 amendment), the tier admission rule (§3.2), the data
      model (§3.3) and the a11y contract (§3.6).
- [x] **ADR 0008 amendment — data palette.** Covers how many categorical
      slots, the new hues, and the ΔE / CVD floor (§3.8).
- [x] **Spike, thrown away afterwards** (2026-11-12). Rendered 500 / 2k /
      10k / 50k nodes (plus 3k, 5k, 20k, 30k to bracket the limits) in SVG,
      Canvas 2D and WebGL in the pinned Chromium, and measured frame time
      while panning and while restyling every node. Results and method are in
      §3.2: SVG ≤ ~2k, Canvas 2D ~2k – ~20k, WebGL above that. **Not done on
      a phone**: none was available, so a 4× CPU throttle stands in, and the
      phone measurement stays open on the WebGL tier's `experimental` flag.
- [x] Confirm Aspekta's `tnum` (ADR 0011 item 5). **It has none** (checked
      2026-11-11): its digits are proportional, 367–602 units, so
      `tabular-nums` is a no-op. Filed against the face as ADR 0011 directs;
      pinned by `registry/fonts/aspekta/aspekta.test.ts`.
- [x] **Paper.** Use the `design-component` skill. Sheets for chart anatomy
      (axis, tick, grid, legend, tooltip, focus), the Sparkline/Meter/Bar/Line
      set, and a diagram sheet (node, edge, arrow, label, group, controls).
      Both schemes, and the stress brand.

**Exit:** both ADRs accepted, the spike's numbers written into §3.2, and the
P0 sheets approved.

### Phase V1 — foundations + the smallest charts · *medium*

- [x] Tokens (§3.8) in the contract and resolver, with the ΔE / CVD /
      monotonic checks as Node tests. `check:contrast` pairs for every mark.
- [x] `registry/lib/viz`: scales, ticks, `Intl` formatting, the description
      builder, the data-table model, `useChartNavigation`, the live announcer.
- [x] `Sparkline`, `Meter`. Both get the standard five files (`.tsx`,
      `.doc.ts`, `.stories.tsx`, `.browser.test.tsx`, `.types.test.tsx`),
      visual baselines in both schemes, and the brand-theme story.
- [x] Extend `check:boundaries` to the viz dependencies, and
      `check:dependencies` to declare them per item (2026-11-12).

**Exit:** `pnpm verify` green; SSR output of both components snapshot-tested
with no hydration needed; forced-colours test passing.

### Phase V2 — the chart workhorses · *large*

- [x] `Chart` primitives; `BarChart`, `LineChart`, `AreaChart` presets.
- [x] `Chart.Tooltip` (virtual-anchor Popover), `Chart.Legend` (toggling a
      series is a checkbox, with its semantics), `Chart.Table`.
- [x] The keyboard contract tested in Playwright; live-region announcements
      asserted.
- [x] Geometry specs in `design/paper/specs/` for the axis and legend
      (`chart-plot-row` holds the y-axis column, `chart-plot-column` the
      x-axis row, `chart-legend-entry` the legend).
- [x] `StatTiles` / `ChartCard` as the first blocks. This is also the first
      use of `registry/blocks/`.
- [x] Linux visual baselines for chart, chart-card and stat-tiles.
      Regenerated with the rest of the matrix on `ci/green-main`
      (bydiorama/ui#44).

**Exit:** a consumer screen replaces its current charting with these, as
PLAN.md's "ship what the consumer renders" requires.

#### V2 stand-in — the portal's Market intelligence, rebuilt (2026-11-11)

No product screen can adopt these yet, so
`registry/screens/market-intelligence/market-intelligence.stories.tsx`
rebuilds the charted parts of the portal's Market intelligence section from
library parts only, on placeholder data. It is a story, under the axe pass,
and ships to no one. It does **not** close the exit above; it is the
rehearsal that makes the real migration a mapping exercise.

| Portal call site | Library part | Gap it leaves |
|---|---|---|
| Overview count tiles (three hand-rolled boxes) | `StatTiles` | — |
| `SosTrendCard` (headline share over a smoothed line, event annotation) | `ChartCard` + `xScale="time"`, `Chart.Rule` for a target | ~~A vertical event marker~~ **Closed 2026-11-12**: `Chart.Rule at={date}` draws a vertical rule with its label at the top of the plot. |
| `SosAreaChart` (four overlapping gradient areas) | `LineChart`, four series, legend toggles | By choice, not a gap: overlapping fades go muddy (ChartCard doc). |
| Brand share column (`div` bars in the table) | `BarChart orientation="horizontal"` | **A bar inside a table cell**: ranked rows are a whole chart, not a cell. |
| `TrendSparkline` in the keyword table (50×20) | `Sparkline size="sm"` + a shared `domain` | ~~A row-height sparkline~~ **Closed 2026-11-12**: `Sparkline size="xs"` is 64×20. Its size is not yet drawn in Paper (doc `needsDesign`). |
| `TrendDistributionBar` (one stacked status strip) | ranked `BarChart` rows | **A part-of-whole strip in status colours**: no component; status inks are reserved and charts use data slots. |
| CEP / intent strips (100% stacked per category) | stacked `BarChart` | ~~A 100% stack~~ **Closed 2026-11-12**: `isStacked={{ isPercent: true }}`. The axis reads 0–100%, and the tooltip and announcer say "60% (120)". |
| Market map / landscape quadrant | — | ~~Scatter~~ **Closed 2026-11-12**: `ScatterPlot`, with quadrant lines as `Chart.Rule at` + `Chart.Rule value`. Bubbles via `areaKey`. |
| Percentage-point changes ("+2.1pp") | `StatDelta` | ~~Percentage points~~ **Closed 2026-11-12**: `StatDelta unit="points"` prints "+2.1 pp" and reads "percentage points". |

Found and fixed by building it: direct labels painting past the frame, a rule
label crossed by its own line, and sparklines in a column exaggerating flat
series, and ChartCard's head showing a stale change while loading. Checked
at 320px and 200% zoom, three more: category names running together on the
x axis, a fixed name lane leaving horizontal bars 8px, and Table's hidden
text scrolling the page sideways (ledger, 2026-11-11). Found and left to the portal: its headings set
`font-medium` over roles whose weight is 600, which the type-role gate refuses.

### Phase V3 — Diagram viewer · *large*

- [x] Viewport (pan and zoom transform, fit, follow focus, keyboard path):
      `useGraphViewport`, shared with Network.
- [x] Node slot (HTML layer) + edge layer (SVG) under one transform.
      `DotPattern` as the canvas ground.
- [x] ~~Layered layout through dagre; tree and radial through d3-hierarchy~~
      Layered, tree and radial layouts **in `lib/graph`, our own code**;
      `positions` passthrough; size hints for SSR.
- [x] Graph keyboard model, adjacency-list alternative, edge labels.
- [x] `Diagram.Group`, `Controls`, `Minimap`, `Legend`.

**Exit:** a pipeline or lineage view and an org chart render in both schemes
from the same component. Every node is reachable by keyboard with its
relations announced. **Met 2026-11-12**: the Playground (a pipeline) and
OrgChart stories render from one `Diagram`, with visual baselines in both
schemes. The contract test reaches every node by arrow key and asserts that
a node's announcement lists its relations ("2 relations: Brief informs Grid
system; Brief informs Layout"). The second half is asserted on one node and
holds for all of them by construction, since every node's announcement is
built the same way.

**Dependencies, decided while building V3.** §3.4 proposed dagre for layered
layout and d3-hierarchy for trees. Neither was admitted. A read-only viewer
needs only a narrow part of each: longest-path ranks with four barycentre
sweeps, a tidy tree, and rings by depth. Written in `lib/graph`, that is a few
hundred lines with no dependency. It is deterministic by construction and
writes the same rounded numbers on the server and the client. It also keeps
the precedent `lib/viz` set, which owns its scales and bins. The cost is
simpler edge-crossing reduction than dagre's. `check:boundaries` still names
those packages, so admitting one later replaces what is behind `lib/graph`
without touching any public type.

### Phase V4 — Networks and the knowledge-graph explorer · *large*

- [x] `Network` on SVG with force layout (seeded, worker above the threshold,
      incremental with pinned nodes). The force layout is our own too
      (`lib/graph` `forceLayout`, a uniform grid for repulsion), not d3-force,
      for the reason given under V3. The worker answers with exactly the main
      thread's positions, and a test holds it to that.
- [x] Canvas tier behind the admission rule: `NetworkCanvas`, passed as
      `renderer` and admitted above `canvasThreshold` (2,000 elements). It
      only paints. The keyboard, announcements, hit-testing and the table stay
      with Network, and before hydration and in forced colours the table
      replaces the canvas.
- [x] `KnowledgeGraphExplorer` block: search, type filter, detail panel,
      history, `onExpandRequest`, path highlight.
- [x] Docs recipes: Neo4j / Cypher result → `GraphNode[]`; RDF / JSON-LD →
      `GraphNode[]`, in [`graph-data-recipes.md`](./graph-data-recipes.md).
      Each mapping there was type-checked and run on fixtures.

**Exit:** a 5k-node typed graph is explorable by keyboard and screen reader
on a mid-range phone, and the visual gate is stable across runs. **Not met
yet (2026-11-12).**
- The visual gate is stable: the new cases pass on repeated runs.
- Keyboard and screen reader are tested at 7–27 nodes and the canvas at
  2,000. Nothing has been tried at 5,000.
- Laying out 5,000 nodes and 6,250 edges takes about 4 s on a desktop M-series
  CPU, in the worker and off the main thread. Even so, a mid-range phone is
  likely to take several times longer before the first drawing.
- Still to do:
  - try it on a real phone;
  - decide whether a large graph is drawn after a cheap first layout and then
    refined, or arrives with positions computed on the server;
  - filter the table view by what is in view (today it lists every relation).

### Phase V5 — on demand only

The P2 rows from §4: editing, WebGL, Sankey, Treemap, Gantt, clustering,
semantic zoom, time-sliced graphs. Each needs a consumer before it starts.
[`charts-v5-extensions.md`](./charts-v5-extensions.md) checks each one
against what has been built so far: what it needs, what it depends on, the hard
part, and a recommended order (2026-11-12).

---

## 6. New gates and tests this work needs

| Gate / test | Catches |
|---|---|
| `check:boundaries` extended | a `d3`, `graphology`, `dagre` or renderer type in an exported signature |
| Palette tests (Node) | categorical slots that are too close, normally or under CVD; a non-monotonic sequential ramp; a mark under 3:1 against its ground |
| `viz-determinism.browser.test.tsx` | a layout or tick set that differs between two renders of the same data (this would make the visual gate useless) |
| `viz-ssr.test.ts` | a chart that throws on the server, or whose server SVG differs from the first client render (a hydration mismatch) |
| `viz-keyboard.browser.test.tsx` | every mark or node reachable; announcements contain label, value and relation; focus never leaves the viewport |
| `viz-forced-colors.browser.test.tsx` | a series told apart only by colour once forced colours strips it |
| Story rule | every chart story renders with `Chart.Table` reachable, or with a `description` that the type says is enough |

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| The work starts with no consumer, and TODO.md's drawing order sets the build order again | V0's first item is demand; V2's exit is a consumer adoption |
| The data palette turns into a brand fight (categorical vs brand colours) | ADR 0006(a) already settled it: distinguishability wins. Only the sequential ramp follows the brand. |
| Diagram auto-layout cannot render on the server | Say so in the doc, and offer positions or size hints (§3.5) |
| An editor is requested half-way through a viewer | The editor is its own decision (§8) with its own behaviour layer. The viewer's API does not grow to fake it. |
| An a11y alternative that is technically present but useless (a 5,000-row table) | For large data, the table is paginated and the description is required; for networks, the adjacency list is filtered by the current view |
| WebGL quality on iOS Safari (the effects layer found its worst defects there) | The WebGL tier stays `experimental` until it has been seen on a device, like `lib/shader` |
| A dependency's licence changes, or it is abandoned | Every dependency is behind `lib/viz`, so a swap touches one folder |

---

## 8. Decisions

Answered by the maintainer on 2026-11-09. Each answer still needs its ADR or
amendment before code depends on it. That work is Phase V0.

| # | Decision | Answer | What follows |
|---|---|---|---|
| 1 | Go or no-go, and which family first | **Go: charts first**, then the Diagram viewer, then networks | Phase V0 starts. The demand item in V0 still has to name the first consumer screen, so V2's exit has a real adopter. |
| 2 | Categorical palette size | **8 numbered slots** | `--ui-data-cat-{1…8}`. The five ramps give only 4–5 usable hues, so this needs **3–4 new hues**, a Paper round and an ADR 0008 amendment. With eight slots, the ΔE / colour-vision-deficiency floor (§3.8) becomes the gate that matters most: it has to be met at all eight. The doc still recommends a 5–6 series limit in practice (Atlassian does the same), with slots 7–8 for the cases that really need them. |
| 3 | Dashed strokes in charts | **Keep the solid-strokes rule** | The solid answers in §3.7 become the contract. No ADR is needed: CONVENTIONS already says this. |
| 4 | Dependency policy | **Astryx-style: amend ADR 0002** | Own components on wrapped maths modules: `d3-array`, `d3-scale` and `d3-shape` first; `d3-hierarchy`, `d3-force`, `@dagrejs/dagre` / `d3-dag` and `graphology` later. Recharts is **not** wrapped (shadcn/ui's route), because its types and design would become part of our API (§9.5). `check:boundaries` is extended to the new packages. |
| 5 | elkjs | **MIT only** | Layered layout on `@dagrejs/dagre` or `d3-dag`, picked by the V0 spike. Simpler edge routing is accepted. elkjs is reopened only through formal licence review. |
| 6 | Diagram editing | **Viewer only** | No drag-to-connect, no ports, no undo. React Flow / xyflow stays a reference. Editing is a new decision when a product asks for it. |
| 7 | WebGL tier | **Build on `lib/shader`** | One WebGL2 context per page, inks read from tokens, the same admission rule and guards as ADR 0022. Sigma and cosmos.gl stay references for techniques (instanced nodes, GPU force simulation), not dependencies. The V0 spike still measures *where* the tier starts, and the tier stays `experimental` until it has been seen on an iPhone. |

---

## 9. References

Section 9 is filled in from the research pass below. Each entry is marked:

- **Depend**: may become a wrapped dependency
- **Learn**: an API, interaction or a11y reference only; no code or design is
  copied (ADR 0002)
- **Avoid**: a licence or paid-tier risk

**About these figures.** Versions and dates come from npm registry queries
made on 2026-11-09. Licences were checked against each project's LICENSE file
and vendor pages. Bundle sizes are rough estimates and were **not** measured.
Check them against the real numbers before anyone budgets with them.

### 9.1 Maths and layout (candidate dependencies)

| Reference | Licence | Latest | Mark | Why |
|---|---|---|---|---|
| [d3 modules](https://d3js.org): scale, shape, array, hierarchy, delaunay, force | ISC | patch releases Nov 2026 | **Depend** | Pure functions, server-safe, tree-shakeable. We render the JSX. |
| [@dagrejs/dagre](https://github.com/dagrejs/dagre) | MIT | 3.1.3 (Oct 2026) | **Depend** | Layered layout. The old `dagre` package is dead. |
| [d3-dag](https://github.com/erikbrinkman/d3-dag) | MIT | 1.3.0 (Nov 2026) | **Depend** (spike) | MIT alternative to ELK |
| [graphology](https://graphology.github.io) | MIT | 0.26.0 (Jan 2025) | **Depend** | Graph model and algorithms. Stable, but releases are slow. |
| [Data Navigator](https://github.com/cmudig/data-navigator) | MIT | 3.3.1 (Nov 2026) | **Depend** (evaluate) | Renderer-agnostic keyboard and screen-reader navigation. It is exactly our §3.6 problem. |
| [visx](https://airbnb.io/visx) | MIT | 4.0.0 (Jun 2026) | Learn | The closest architecture to ours: unstyled React primitives over d3 |
| [elkjs](https://github.com/kieler/elkjs) | EPL-2.0 / GPL-3.0 | 0.12.1 | **Avoid** | Copyleft |
| [WebCola](https://github.com/tgdwyer/WebCola) | MIT | 3.4.0 (2019) | Learn | Constraint-layout ideas. Unmaintained. |

### 9.2 Chart libraries (API, a11y and theming references; no code or design copied)

| Reference | Licence | Mark | What to learn |
|---|---|---|---|
| [Recharts v3](https://recharts.org) | MIT | Learn | Composable `<Chart><Axis/><Bar/></Chart>` API; its `accessibilityLayer` keyboard default |
| [MUI X Charts](https://mui.com/x/react-charts) | MIT + **Pro/Premium** | Learn | Composition API, and how open-core splits features (Sankey, zoom and heatmap are paid) |
| [Observable Plot](https://observablehq.com/plot) | ISC | Learn | Mark/scale grammar and sensible defaults |
| [Vega-Lite](https://vega.github.io/vega-lite) / [AntV G2](https://g2.antv.antgroup.com) | BSD-3 / MIT | Learn | Grammar of graphics, declarative specs |
| [Swift Charts](https://developer.apple.com/documentation/charts) | Apple | Learn | The cleanest mark-based API; `AXChartDescriptor` and Audio Graphs for a11y |
| [Visa Chart Components](https://github.com/visa/visa-chart-components) | MIT | Learn | **The best open a11y reference:** keyboard navigation, data tables, texture fills |
| [Highcharts accessibility module](https://www.highcharts.com/docs/accessibility/accessibility-module) | Commercial | Learn (docs only) | The most complete written a11y behaviour for charts |
| [ECharts](https://echarts.apache.org) | Apache-2.0 | Learn | Server-side SVG strings; "decal" pattern fills for colour-blind safety |
| [Carbon Charts](https://charts.carbondesignsystem.com) | Apache-2.0 | Learn | How a design system ties charts to its tokens |
| [Tremor](https://tremor.so) | Apache-2.0 | Learn | Copy-paste distribution like ours. The npm package has been frozen since Jan 2025. |
| [Nivo](https://nivo.rocks), [Victory](https://nearform.com/open-source/victory), [Unovis](https://unovis.dev), [LayerCake](https://layercake.graphics) | MIT / Apache-2.0 | Learn | Nivo: server-side rendering (`@nivo/static`), though releases have slowed. Unovis: a framework-agnostic core with a graph component. LayerCake: layered SVG, Canvas and HTML in one coordinate system. |
| [AG Charts](https://www.ag-grid.com/charts) | MIT + **Enterprise** | Avoid as a dependency | Canvas-only, open-core. Its canvas keyboard a11y is still worth studying. |
| [Polaris Viz](https://github.com/Shopify/polaris-viz) | MIT **+ Shopify rider** | **Avoid** | The licence restricts use outside Shopify apps. Stale. |
| [Chart.js](https://www.chartjs.org) | MIT | Avoid | Canvas-only, no server rendering, weak a11y |

### 9.3 Graph and knowledge-graph renderers

| Reference | Licence | Mark | What to learn |
|---|---|---|---|
| [React Flow / xyflow](https://reactflow.dev) | MIT (+ Pro subscription for examples and support) | **Learn** for the viewer; **candidate behaviour layer** for an editor (§8.6) | HTML nodes over SVG edges under one transform (the model §4.2 uses); server rendering when node sizes are given |
| [Sigma.js v4](https://www.sigmajs.org) | MIT | Candidate for the WebGL tier | WebGL rendering of large graphs on graphology; semantic zoom |
| [cosmos.gl](https://openjsf.org/blog/introducing-cosmos-gl) | MIT (OpenJS) | Candidate for the WebGL tier | GPU force simulation for 100k+ nodes. **Cosmograph, built on it, is CC-BY-NC: avoid.** |
| [Cytoscape.js](https://js.cytoscape.org) | MIT | Learn | Mature graph-analysis API and a large layout catalogue |
| [AntV G6 v5](https://g6.antv.antgroup.com) | MIT | Learn | Behaviours (combos, lasso, expand), and many layouts in one place |
| [Reagraph](https://reagraph.dev), [react-force-graph](https://github.com/vasturiano/react-force-graph), [vis-network](https://github.com/visjs/vis-network) | Apache-2.0 / MIT | Learn | React-first knowledge-graph UX; quick force-graph prototypes |
| [KeyLines / ReGraph](https://cambridge-intelligence.com/regraph/), [Ogma](https://linkurious.com/ogma/), [yFiles](https://www.yfiles.com) | Commercial | Learn (public docs and demos only) | The best knowledge-graph UX available: combos, time bar, progressive disclosure. yFiles is the benchmark for layout quality. |
| [Neo4j NVL / Bloom](https://neo4j.com/docs/nvl/current/), [Graphistry](https://www.graphistry.com), Kumu, Obsidian graph view, Linkurious | Proprietary / SaaS | **Avoid**; UX reference only | NVL's licence allows it only with Neo4j products. Obsidian's local/global graph is a good model for "neighbourhood vs whole". |

### 9.4 Design and accessibility guidance

| Topic | Sources |
|---|---|
| Chart a11y | [Chartability](https://medium.com/visumd/chartability-how-accessible-is-my-chart-fe547c2fc62b) (use it as the review checklist for every chart PR); [WAI complex images](https://www.w3.org/WAI/tutorials/images/complex/); [Graphics ARIA](https://www.w3.org/TR/graphics-aria-1.0/) (`graphics-document`, `graphics-object`, `graphics-symbol`) |
| Design-system dataviz | [Carbon](https://carbondesignsystem.com/data-visualization/getting-started/); [Atlassian](https://atlassian.design/foundations/color/data-visualization-color) (`chart.categorical.1–8`, and a 5–6 colour limit in practice, which supports §8.2); [Salesforce Lightning](https://www.lightningdesignsystem.com/guidelines/charts/); [Material](https://m2.material.io/design/communication/data-visualization.html) |
| Public-sector style guides | [ONS service manual](https://service-manual.ons.gov.uk/data-visualisation); [UK Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/); [Urban Institute](https://urbaninstitute.github.io/graphics-styleguide/) |
| Colour | [Datawrapper: colours for style guides](https://blog.datawrapper.de/colors-for-data-vis-style-guides/); [Okabe-Ito](https://jfly.uni-koeln.de/color/) (a colour-blind-safe set to test our hues against); Viridis and ColorBrewer for sequential and diverging ramps |
| Graph UX | [Cambridge Intelligence blog](https://cambridge-intelligence.com/blog/) (combos, progressive disclosure, time-based graphs); [greadability.js](https://github.com/rpgove/greadability) (MIT: crossings and angular-resolution metrics, a possible layout-quality test); Holten 2006 and Holten & van Wijk 2009 on edge bundling |

### 9.5 How two other design systems ship charts

This was asked while deciding §8.4. Both were checked from source on
2026-11-09.

| | **shadcn/ui** | **Astryx** (Meta) |
|---|---|---|
| What ships | One copied file, `chart.tsx` (~370 lines) | `@astryxdesign/charts`, a "config-model data visualization library (d3-based)"; separately, `@astryxdesign/vega`, a Vega / Vega-Lite wrapper |
| Engine | **Recharts** (3.8 in its own app), imported as `RechartsPrimitive` | Its own components on **`d3-array`, `d3-scale`, `d3-shape`** |
| What the consumer writes | Recharts directly (`<BarChart>`, `<XAxis>`, `<Bar>`) inside shadcn's `ChartContainer` / `ChartTooltipContent` / `ChartLegendContent` | Astryx's own chart components |
| Theming | A `ChartConfig` object maps each series to a colour per theme, written to `--color-<key>` CSS variables; base palette `--chart-1…5` | Astryx theme and tokens (StyleX) |
| Types in the public API | **Recharts' types**, e.g. `React.ComponentProps<typeof RechartsPrimitive.Tooltip>` | Its own |
| Maturity | Stable, widely used | **Canary only** (`0.7.12-canary`); no stable release; MIT |

**What this means for us.** shadcn/ui's model is the fastest start, but it
breaks two of our ADRs directly. Recharts' types are in the props, so
ADR 0012 fails. Recharts' design opinions (axis rendering, tooltip behaviour,
animation model) become ours, so ADR 0002 fails. It also ties server
rendering and the keyboard model (§3.6) to what Recharts can do. Astryx has
made exactly the trade this plan makes: own components, d3 for the maths
only. It is the closer model, and one more sign that §8.4 is the right
direction. Its chart package has not reached a stable release, though, so we
can learn from it but should not depend on it.
