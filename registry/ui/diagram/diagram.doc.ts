/** Typed documentation for Diagram (CONVENTIONS §11). */

export const diagramDoc = {
  lead: "A read-only node-link viewer — pipelines, lineage, org charts, dependency and state graphs — where every node is real UI.",
  name: "Diagram",
  status: "experimental",
  summary:
    "A read-only node-link viewer — pipelines, lineage, org charts, dependency and state graphs — where every node is real UI. Nodes are an HTML layer and edges an SVG layer under one pan-and-zoom transform, on DotPattern over bg-base. The figure carries a title, a takeaway, an adjacency-list view and a polite announcer; the drawing is one tab stop with a spatial keyboard model, and the view follows focus.",

  anatomy: [
    { part: "root", slot: "diagram", notes: "A <figure> named by the title and described by the takeaway. bg-surface, border-subtle, radius-md, 24px inset — Chart's frame. className and the rest land here." },
    { part: "title", slot: "diagram-title", notes: "label-md, primary. The `label` prop." },
    { part: "description", slot: "diagram-description", notes: "body-sm, muted. The takeaway a person wrote." },
    { part: "list toggle", slot: "diagram-list-toggle", notes: "Button secondary md, icon-only (ListBulleted), aria-pressed. Swaps the drawing for the adjacency list." },
    { part: "frame", slot: "diagram-frame", notes: "`height` px tall (default 480), bg-base under DotPattern, border-subtle, radius-md, clipped. A drag on the ground pans; pinch or Ctrl/⌘ + wheel zooms. A plain wheel scrolls the page." },
    { part: "viewport", slot: "diagram-viewport", notes: "The one tab stop: role=group, aria-roledescription \"diagram\", named by the title, described by the keyboard hint." },
    { part: "world", slot: "diagram-world", notes: "One transform (translate, scale) for every layer below, at --ui-duration-base with --ui-ease-out except while a drag is panning." },
    { part: "node", slot: "diagram-node", notes: "160px wide, at least 56 tall (72 with a two-line description), bg-surface, a 1.5px border-strong ring, radius-md, 12px inline. The label in label-md primary, one line; the description in label-sm 400 muted, clamped at two lines. `renderNode` replaces the content, never the frame." },
    { part: "selected node", slot: "diagram-node[data-state=selected]", notes: "bg-selected with a 2px text-primary border; its edges turn active." },
    { part: "focused node", slot: "diagram-node", notes: "Keyboard only: the focus ring (2px border-focus, 2px off)." },
    { part: "dimmed node", slot: "diagram-node", notes: "Off the `highlight` path: opacity 32%." },
    { part: "edge", slot: "diagram-edge", notes: "2px border-control, round joins, the sheet's l-8-4v8Z head with its tip on the target's frame. Straight, curved (a cubic leaving and arriving square to the frames) or orthogonal. Inferred: text-muted at 1.5px — never dashed — and \"inferred\" in its label and announcement. Active (selected node's, or on the highlight path): text-primary." },
    { part: "edge label", slot: "diagram-edge-label", notes: "label-sm 400 muted on a pill of the ground it sits on (bg-base, or bg-surface inside a group), 4px inline. Active: 600, primary, on bg-surface." },
    { part: "group", slot: "diagram-group", notes: "Diagram.Group: bg-surface, 1px border-default, radius-lg, 12px inset round its members, its title (label-sm 600 muted, a collapse control) on top." },
    { part: "collapsed group", slot: "diagram-node[data-group=collapsed]", notes: "208×56 on radius-lg with border-default: the title, \"N nodes, M edges inside\", and a 32px chrome control (ChevronRightSmall) that expands it. Members' edges to the outside are drawn from it." },
    { part: "controls", slot: "diagram-controls", notes: "Diagram.Controls, 16px from the bottom right, 4px apart: Zoom in (Plus), Zoom out (Minus), Fit (Expand), each the shared 32px chrome control." },
    { part: "minimap", slot: "diagram-minimap", notes: "Diagram.Minimap, 16px from the bottom left, 168×104, bg-surface, border-subtle, radius-md. Nodes as border-control rects (rx 1), the visible part framed in text-primary at 1.5px (rx 2). aria-hidden." },
    { part: "legend", slot: "diagram-legend", notes: "Diagram.Legend, 16px from the top right, bg-surface, border-subtle, radius-md, 8/12 inset, rows 6px apart: a 24×12 swatch and a label-sm primary name. By default only the rows the drawing uses." },
    { part: "list", slot: "diagram-list", notes: "Each node with its description and group, then its relations as ghost Buttons (\"informs Layout\", \"Brief informs it\") that move focus to that node's entry." },
    { part: "announcer", slot: "diagram-announcer", notes: "A polite live region: the node, its description, its group and its relations; or the relation, its place and where Enter goes." },
  ],

  composition: `
Diagram                       label · description · nodes · edges · layout? · direction? · route?
├─ Diagram.Group              id · label · defaultIsCollapsed? — config; members name it in parentId
├─ Diagram.Controls           zoom in, zoom out, fit (bottom right)
├─ Diagram.Minimap            the whole drawing, the visible part framed (bottom left)
└─ Diagram.Legend             items? · labels? (top right)
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "The visible title, the figure's name and the keyboard region's name." },
    description: { type: "string", required: true, notes: "The takeaway. A screen-reader user hears it before anything else." },
    nodes: { type: "GraphNode[]", required: true, notes: "Our own shape (lib/graph): id, label (the accessible name), description, position, parentId, data." },
    edges: { type: "GraphEdge[]", required: true, notes: "source, target, label (the predicate), isDirected (default true), isInferred." },
    layout: { type: "\"layered\" | \"tree\" | \"radial\" | \"none\"", default: "\"layered\"", notes: "Layered for flows and DAGs; tree for hierarchies (each node's first parent); radial for a tree round its root; none takes every position as given. A node's own `position` wins in every layout." },
    direction: { type: "\"down\" | \"right\"", default: "\"down\"", notes: "The flow, for layered and tree." },
    route: { type: "\"straight\" | \"curved\" | \"orthogonal\"", default: "\"curved\"", notes: "A back edge or two nodes on one rank fall back to straight, rather than doubling back through the source." },
    nodeSize: { type: "Size | (node) => Size", default: "{ width: 160, height: 56 }", notes: "The size the layout uses BEFORE the nodes are measured: on the server, and on the first client frame. Measured sizes replace it after mount; a node's width is this width." },
    selected: { type: "string | null", notes: "Controlled selection, with onSelect. defaultSelected for uncontrolled." },
    onSelect: { type: "(node | null) => void", notes: "Enter or a click; Escape clears." },
    highlight: { type: "string[]", notes: "A path of node ids (lib/graph's shortestPath answers one): its edges turn active, everything off it dims." },
    renderNode: { type: "(node, { isSelected, isFocused, isDimmed }) => ReactNode", notes: "The node's content. The frame, its states and its size stay Diagram's." },
    height: { type: "number", default: "480", notes: "The frame's height in px." },
    isLoading: { type: "boolean", default: "false", notes: "Three bg-sunken node blocks, aria-busy, and no tab stop." },
    emptyText: { type: "string", default: "\"Nothing to show yet.\"" },
    listLabel: { type: "string", default: "\"View as list\"" },
    inferredLabel: { type: "string", default: "\"inferred\"", notes: "The word an inferred edge carries. Every user-visible string is a prop." },
    keyboardHint: { type: "string", notes: "The viewport's description: the keys, once." },
  },

  do: [
    "Write the description as the point of the drawing (\"Proofs gate the press run\"), not as \"A diagram of…\".",
    "Give saved positions when you have them: the diagram is then a pure server render, and a reload never moves a node.",
    "Name every edge whose meaning is not obvious from its ends; the label is what the keyboard reads.",
    "Use Diagram.Group for a subflow a reader may want to fold away.",
  ],

  dont: [
    "Do not use it as an editor: nodes cannot be dragged or connected (plan §8.6). That is a separate decision with its own behaviour layer.",
    "Do not draw a dense network with it — every node is a DOM element. Network is the component for glyph nodes and force layouts.",
    "Do not put interactive controls inside renderNode: the drawing is one tab stop, and its nodes are not focusable.",
  ],

  a11y: {
    role: "A <figure> named by the title and described by the takeaway. The drawing is a role=group with aria-roledescription \"diagram\"; nodes and edges are aria-hidden pictures of what the announcer and the list say.",
    name: "`label` via aria-labelledby on the figure and the viewport; `description` via aria-describedby on the figure; `keyboardHint` on the viewport.",
    keyboard: [
      { key: "Tab", does: "Into the drawing, on the selected node or the first in reading order. Inside: walks the focused node's relations, then leaves — never a trap." },
      { key: "Shift+Tab", does: "Back through the relations to the node, then leaves." },
      { key: "Arrow keys", does: "To the nearest node in that direction (straight ahead beats closer but off to the side)." },
      { key: "Home / End", does: "The first and last node in reading order." },
      { key: "Enter", does: "Selects the focused node (again clears it); on a relation, goes to its far node; on a collapsed group, expands it." },
      { key: "Space", does: "Opens a collapsed group, or closes the group the focused node is in." },
      { key: "Escape", does: "From a relation back to its node; on a node, clears the selection." },
      { key: "+ / -", does: "Zoom in and out about the centre." },
      { key: "0", does: "Fit the drawing to the frame." },
      { key: "Shift + arrow", does: "Pan 64px." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "title, node labels" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "description, node descriptions, group titles" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "edge labels on the canvas" },
      { fg: "--ui-text-primary", bg: "--ui-bg-selected", floor: "text", role: "the selected node's label and description — muted ink falls under 4.5:1 on a pale brand's selected fill, so the description steps up to primary there" },
      { fg: "--ui-border-control", bg: "--ui-bg-base", floor: "non-text", role: "an edge on the canvas" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "non-text", role: "an inferred edge" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "non-text", role: "an active edge" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the keyboard focus ring" },
      { fg: "--ui-border-strong", bg: "--ui-bg-base", floor: "decorative", role: "a node's ring", why: "A node is not a control — focus never lands on it — and its label, not its edge, identifies it; the ring orients the eye between the canvas and the node's own surface." },
      { fg: "--ui-border-default", bg: "--ui-bg-base", floor: "decorative", role: "a group's edge", why: "Membership is read from the group's title and from the announcement (\"In Print run\"); the edge only frames it." },
    ],
  },

  forwarding: {
    className: "root (the figure)",
    ref: "root (the figure), as a prop — React 19, so the node-data generic survives",
    rest: "root — every HTML attribute except children and onSelect, which the component owns",
  },

  motion:
    "The world layer's transform eases at --ui-duration-base with --ui-ease-out, so zoom, fit and follow-focus glide; a drag drops the transition so the drawing tracks the pointer. Under prefers-reduced-motion the duration token collapses and every move is instant.",

  needsDesign: [
    "The expanded group's collapse control: the sheet draws only the collapsed group's expand button. The title doubles as the toggle, with a ChevronDownSmall after it — the library's reading (sheet Gaps: Not built).",
    "The adjacency list is not drawn; it is the plan's alternative (§3.6), set in the library's type roles.",
    "The relation focus state — a 6px border-focus halo under the edge — is the library's reading; the sheet draws focus on nodes only.",
  ],

  knownGaps: [
    "The layouts are our own (lib/graph), not dagre or d3-hierarchy: the layered layout uses no dummy nodes, so an edge that skips a rank is drawn straight through the gap rather than bent round it, and crossings are reduced by four barycentre sweeps, not minimised.",
    "A group's box is drawn round wherever its members land; an automatic layout does not keep outsiders out of it. Give positions for a drawing where that matters.",
    "Server render lays out against `nodeSize`; a node that measures taller (a two-line description) moves on the first client frame. Give positions, or a size hint per node, to avoid it.",
    "Edges to collapsed groups are de-duplicated per pair of ends, so two members' edges to one outsider draw once; the list still shows both.",
    "Trees are not a role=tree in the list view; every layout gets the same adjacency list.",
    "The DotPattern ground does not pan with the drawing.",
    "Not tested on a phone. Pinch zoom is the browser's ctrl+wheel; there is no touch two-finger pan beyond the one-finger drag.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/3YCS-0",
} as const;

export type DiagramDoc = typeof diagramDoc;
