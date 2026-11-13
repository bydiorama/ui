/** Typed documentation for Network (CONVENTIONS §11). */

export const networkDoc = {
  lead: "Explores relationships between connected items.",
  name: "Network",
  status: "experimental",
  summary:
    "A network of typed entities that people explore — a knowledge graph, a social or citation network — where nodes are glyphs, not cards. SVG by default, with a seeded force or radial layout that runs in a worker above 500 nodes and grows incrementally: nodes already drawn are pinned, so appending neighbours never reshuffles them. The keyboard model is the Network sheet's: rings of hops from the selected node, Up and Down round a ring, Right and Left onto a relation and across it, Plus to expand. An adjacency table is one toggle away, and it is the floor for a custom renderer — the Canvas tier — before hydration and in forced colours.",

  anatomy: [
    { part: "root", slot: "network", notes: "A <figure> named by the title and described by the takeaway: Chart's and Diagram's frame (bg-surface, border-subtle, radius-md, 24px inset). data-renderer says which tier drew it. className and the rest land here." },
    { part: "title", slot: "network-title", notes: "label-md, primary." },
    { part: "description", slot: "network-description", notes: "body-sm, muted. The takeaway a person wrote." },
    { part: "table toggle", slot: "network-table-toggle", notes: "Button secondary md, icon-only (ChartTable), aria-pressed. Swaps the drawing for the adjacency table." },
    { part: "frame", slot: "network-frame", notes: "`height` px tall (default 480), bg-base under DotPattern, border-subtle, radius-md, clipped. A drag pans; pinch or Ctrl/⌘ + wheel zooms. One hit test serves every renderer: the nearest centre within 24px." },
    { part: "viewport", slot: "network-viewport", notes: "The one tab stop: role=group, aria-roledescription \"network\", named by the title, described by the keyboard hint." },
    { part: "node", slot: "network-node", notes: "A 20px-radius disc: the canvas (bg-base), the type's data-cat-N-bg wash, and a 1.5px data-cat-N-solid ring at r19.25 so the stroke sits inside the disc. The type's 16px glyph centred in primary ink. A type with no slot — the ninth and later — is Other: no wash, a border-control ring." },
    { part: "selected node", slot: "network-node[data-state=selected]", notes: "No wash: the canvas fill and a 2px text-primary ring at r19. Its relations turn active; everything outside its neighbourhood dims." },
    { part: "focused node", slot: "network-focus-ring", notes: "Keyboard only: a 2px border-focus ring at r23, clear of the type ring. Highlight in forced colours." },
    { part: "dimmed node", slot: "network-node", notes: "Outside the selected neighbourhood, or off the highlight path: opacity 32%, and its name turns muted at full opacity so it still reads." },
    { part: "label", slot: "network-label", notes: "label-sm 600 primary on a bg-base pill, 4px inline, centred 26px below the centre in a 180px lane, truncated." },
    { part: "edge", slot: "network-edge", notes: "Centre to centre, both ends stopped 26px out; 2px border-control with the sheet's 8×8 arrow head. Active: text-primary. Inferred: text-muted at 1.5px, no head — never dashed." },
    { part: "edge label", slot: "network-edge-label", notes: "label-sm 400 muted on a bg-base pill at the midpoint. Active: 600 primary. An inferred edge reads \"colleague of · inferred\"." },
    { part: "expand chip", slot: "network-expand", notes: "\"+N\" for `hiddenNeighbours`, 4px right of the focus ring: 24px tall, at least 32 wide, 8px inline, 2px gap, rounded-full, bg-elevated, a 1px border-control edge so it reads on the canvas (sheet fix, 2026-11-12). Plus key or a press calls onExpandRequest." },
    { part: "controls", slot: "network-controls", notes: "Network.Controls, 16px from the bottom right: Zoom in, Zoom out, Fit — the shared 32px chrome control." },
    { part: "table", slot: "network-table", notes: "Table sm: Node, Relation, Neighbour, Type — one row per edge, then one per unconnected node." },
    { part: "skeleton", slot: "network-skeleton", notes: "Three 40px bg-sunken discs, aria-busy, no tab stop: while loading, and while a worker lays out." },
    { part: "announcer", slot: "network-announcer", notes: "A polite live region in the sheet's sentence: \"HfG Ulm, Organisation. Otl Aicher co-founded it. 1 of 4 neighbours. 12 more not shown: press Plus to expand.\"" },
    { part: "canvas", slot: "network-canvas", notes: "NetworkCanvas (a separate item): one device-pixel canvas painting the same marks from the same inks, read through the cascade so brand and dark both apply. Node names from half scale up; no glyphs, no edge labels, no name pills." },
  ],

  composition: `
Network                       label · description · nodes · edges · types? · layout? · selected?
└─ Network.Controls           zoom in, zoom out, fit (bottom right)
NetworkCanvas                 passed as renderer={NetworkCanvas}; admitted above canvasThreshold
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "The visible title, the figure's name and the keyboard region's name." },
    description: { type: "string", required: true, notes: "The takeaway. A screen-reader user hears it first." },
    nodes: { type: "GraphNode[]", required: true, notes: "lib/graph's shape: id, label (the accessible name), type, description, position (pinned), data." },
    edges: { type: "GraphEdge[]", required: true, notes: "source, target, label (the predicate), isDirected (default true), isInferred (muted, thinner, no head, named \"inferred\")." },
    types: { type: "Record<string, { label, slot: 1–8, glyph? }>", notes: "Pin each type's slot, so a filter that removes a type does not repaint the survivors. Default: first appearance on slots 1–8, the rest folded into Other — never a generated ninth hue." },
    layout: { type: "\"force\" | \"radial\"", default: "\"force\"", notes: "Force: seeded, deterministic, incremental. Radial: rings of hops round `rootId`." },
    rootId: { type: "string", notes: "The radial centre, and where focus starts when nothing is selected." },
    seed: { type: "number", default: "1", notes: "Same seed, same picture — what keeps the visual gate stable." },
    selected: { type: "string | null", notes: "Controlled selection, with onSelect. defaultSelected for uncontrolled." },
    highlight: { type: "string[]", notes: "A path of node ids (shortestPath answers one): its edges turn active, everything off it dims." },
    hiddenNeighbours: { type: "Record<string, number>", notes: "Neighbours that exist but are not drawn yet: the \"+N\" chip and the announcement's \"12 more not shown\"." },
    onExpandRequest: { type: "(node) => void", notes: "Plus, or a press on the chip. Append the neighbours to nodes and edges; the nodes already drawn stay where they are." },
    onDismiss: { type: "() => void", notes: "Escape on a node with nothing selected — the explorer closes its panel with it." },
    workerThreshold: { type: "number", default: "500", notes: "Above it the force layout runs in a module worker; below it, on the main thread and on the server." },
    renderer: { type: "ComponentType<NetworkRendererProps>", notes: "A paint surface for big graphs — NetworkCanvas. It paints; Network keeps the keyboard, the announcer, hit-testing and the table." },
    canvasThreshold: { type: "number", default: "2000", notes: "Nodes plus edges above which `renderer` is admitted: the measured SVG ceiling (plan §3.2)." },
    height: { type: "number", default: "480" },
    isLoading: { type: "boolean", default: "false" },
    emptyText: { type: "string", default: "\"Nothing to show yet.\"" },
    tableLabel: { type: "string", default: "\"View as table\"" },
    inferredLabel: { type: "string", default: "\"inferred\"" },
    keyboardHint: { type: "string", notes: "The viewport's description: the keys, once." },
  },

  do: [
    "Pin every type's slot in `types`, and give each a glyph: the type is then never colour alone.",
    "Grow the graph with onExpandRequest and hiddenNeighbours rather than handing it everything: a person explores a neighbourhood, not 5,000 nodes.",
    "Pass renderer={NetworkCanvas} when a graph can pass 2,000 elements; below that it changes nothing.",
    "Keep the seed stable for a given dataset, so a reload draws the same picture.",
  ],

  dont: [
    "Do not use it for a flow with a direction of reading — a pipeline, an org chart. Diagram lays those out in ranks.",
    "Do not put a ninth hue in `types`: fold the long tail into Other, or filter it.",
    "Do not rely on the canvas tier in forced colours or before hydration: Network shows the table there, by design.",
  ],

  a11y: {
    role: "A <figure> named by the title and described by the takeaway. The drawing is a role=group with aria-roledescription \"network\"; nodes and edges are aria-hidden pictures of what the announcer and the table say.",
    name: "`label` via aria-labelledby on the figure and the viewport; `description` via aria-describedby on the figure; `keyboardHint` on the viewport.",
    keyboard: [
      { key: "Tab", does: "Into the drawing, on the selected node (or `rootId`, or the first). Inside: walks the focused node's relations clockwise, then leaves — never a trap." },
      { key: "Down / Up", does: "The next or previous node on the same ring — the same number of hops from the selected node — clockwise from twelve o'clock. On a relation: the next or previous relation." },
      { key: "Right", does: "From a node, onto its first relation clockwise from twelve o'clock, read from the far node; from a relation, across it to the far node." },
      { key: "Left", does: "From a node, onto its last relation (the first counter-clockwise); from a relation, back to the near node." },
      { key: "Home / End", does: "The first and last node of the ring, or relation of the node." },
      { key: "Enter", does: "Selects the focused node (again clears it); on a relation, goes to the far node." },
      { key: "+", does: "Asks to expand the focused node, or a relation's far node, when it has hidden neighbours; otherwise zooms in." },
      { key: "= / -", does: "Zoom in and out." },
      { key: "0", does: "Fit the drawing to the frame." },
      { key: "Shift + arrow", does: "Pan 64px." },
      { key: "Escape", does: "From a relation back to its node; on a node, clears the selection; with nothing selected, calls onDismiss." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "node labels on their canvas pill" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "edge labels, dimmed node labels" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "description" },
      { fg: "--ui-border-control", bg: "--ui-bg-base", floor: "non-text", role: "an edge, the Other ring" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "non-text", role: "an inferred edge" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "non-text", role: "an active edge, the selected ring" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the keyboard focus ring" },
      { fg: "--ui-border-control", bg: "--ui-bg-base", floor: "non-text", role: "the expand chip's edge" },
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-1 node's ring on the canvas" },
      { fg: "--ui-data-cat-2-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-2 node's ring on the canvas" },
      { fg: "--ui-data-cat-3-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-3 node's ring on the canvas" },
      { fg: "--ui-data-cat-4-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-4 node's ring on the canvas" },
      { fg: "--ui-data-cat-5-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-5 node's ring on the canvas" },
      { fg: "--ui-data-cat-6-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-6 node's ring on the canvas" },
      { fg: "--ui-data-cat-7-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-7 node's ring on the canvas" },
      { fg: "--ui-data-cat-8-solid", bg: "--ui-bg-base", floor: "non-text", role: "a slot-8 node's ring on the canvas" },
    ],
  },

  forwarding: {
    className: "root (the figure)",
    ref: "root (the figure), as a prop — React 19, so the node-data generic survives",
    rest: "root — every HTML attribute except children and onSelect, which the component owns",
  },

  motion:
    "The world layer's transform eases at --ui-duration-base with --ui-ease-out, so zoom, fit and follow-focus glide; a drag drops the transition. The layout itself never animates: positions are computed to completion before anything paints, so a new node appears in place rather than flying in. Under prefers-reduced-motion the duration token collapses.",

  needsDesign: [
    "The relation focus state — a 6px border-focus halo under the edge — is Diagram's reading; the Network sheet draws focus on nodes only.",
    "The table view is not drawn; it is the plan's alternative (§3.6), as Table sm.",
    "The Canvas tier has no sheet: it paints the SVG tier's marks, without glyphs.",
  ],

  knownGaps: [
    "The force layout is our own (lib/graph), not d3-force: a grid-bounded repulsion and springs, run to completion. Good to a few thousand nodes; it does not detect communities or bundle edges.",
    "Above the worker threshold the first paint is a skeleton until the worker answers; the server sends the skeleton, not the drawing.",
    "Labels are not collision-avoided: in a dense neighbourhood two names can overlap. Zoom, or filter.",
    "The Canvas tier draws no glyphs and no edge labels, and hides node names below half scale; the relation is still in the announcer and the table. It has no forced-colours mode at all — the table stands in.",
    "The table is not filtered by the current view or paginated, so the floor for a 5,000-node graph is a 5,000-row table (plan §8 asks for a filtered one).",
    "Not measured on a mid-range phone: the plan's V4 exit (a 5k-node graph explorable on one) is unverified.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/469R-0",
} as const;

export type NetworkDoc = typeof networkDoc;
