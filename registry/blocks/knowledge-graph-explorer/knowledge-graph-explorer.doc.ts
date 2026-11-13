/** Typed documentation for KnowledgeGraphExplorer (CONVENTIONS §11). */

export const knowledgeGraphExplorerDoc = {
  lead: "Brings connected knowledge into a view you can search and explore.",
  name: "KnowledgeGraphExplorer",
  status: "experimental",
  summary:
    "Explore a knowledge graph a neighbourhood at a time: search for an entity, filter by type, read and walk its relations in a detail panel, ask for more of the graph, and retrace the way you came. A block — Combobox, Checkbox, Network, Button — not a bigger component: it owns the composition and the history, and nothing else. A jump that lands more than one hop from where you were highlights the path between them.",

  anatomy: [
    { part: "root", slot: "knowledge-graph-explorer", notes: "bg-surface, border-subtle, radius-md, 24px inset, 16px between rows. className, ref and the rest land here." },
    { part: "toolbar", slot: "knowledge-graph-explorer-toolbar", notes: "24px apart: the search (Combobox md, 320 wide, a Search glyph, no trigger, label visually hidden), the type filter, then at the end \"7 of 1,284 shown\" (label-sm 400 muted) and the table toggle (Button secondary md, icon-only, ChartTable)." },
    { part: "type filter", slot: "knowledge-graph-explorer-filter", notes: "A fieldset of Checkboxes 20px apart, named by `filterLabel`. Each: a 10px round swatch in the type's data-cat-N-solid, the type's name, and its count in 400 muted. Unchecking hides the type's nodes and their edges; the selection survives." },
    { part: "history", slot: "knowledge-graph-explorer-history", notes: "A <nav> named \"History, <label>\" — the explorer's own label keeps two explorers' landmarks apart: the steps so far, ChevronRightSmall between them, 4px apart. Earlier steps are buttons (label-sm 400 muted, primary on hover) that go back and drop what came after; the current one is 600 primary, aria-current=\"location\"." },
    { part: "canvas", slot: "network", notes: "Network with its head kept for assistive tech only, `height` tall (456 by default, the sheet's), filling the row beside the panel. Network.Controls bottom right." },
    { part: "detail panel", slot: "knowledge-graph-explorer-detail", notes: "A role=group named by the entity (by detailsLabel while nothing is selected), not a landmark — two explorers would otherwise announce two regions with one name. 320 wide and as tall as the canvas, bg-surface, border-subtle, radius-md, 16px inset and gap. Scrolls when the relations outgrow it." },
    { part: "panel head", slot: "knowledge-graph-explorer-type", notes: "A 24px chip — the type's wash with a 1.5px ring in its solid and its glyph — the type's name in label-sm muted, and a ghost icon-only Close (sm)." },
    { part: "title", slot: "knowledge-graph-explorer-detail", notes: "The name in title-sm primary, the description under it in body-sm muted." },
    { part: "relations", slot: "knowledge-graph-explorer-relation", notes: "Under a border-subtle rule, 12px down: \"Relations 4\" and, when there are any, \"Linked from 1\". Rows 2px apart, 8px inset, radius-sm, bg-hover on hover: the verb in a 96px lane (400 muted), an 8px swatch, the name (label-md primary), \"inferred\" when it is, and ChevronRightSmall. A row selects that neighbour." },
    { part: "expand", slot: "knowledge-graph-explorer-detail", notes: "Button secondary sm, full width, Plus, at the foot: \"Expand neighbours (12)\". Disabled when there is nothing more to load." },
  ],

  composition: `
KnowledgeGraphExplorer        label · description · nodes · edges · types · onExpandRequest?
├─ Combobox                   search over the loaded entities, grouped by type
├─ Checkbox × types           the type filter, with counts
├─ nav (history)              the steps so far; earlier ones go back
├─ Network                    head hidden; selection, highlight and table view driven from here
│  └─ Network.Controls
└─ group (detail)             type chip, name, description, relations, Expand neighbours
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Names the drawing (Network's figure)." },
    description: { type: "string", required: true, notes: "The takeaway, read before the drawing." },
    nodes: { type: "GraphNode[]", required: true, notes: "What is loaded so far — the neighbourhoods explored, not the store." },
    edges: { type: "GraphEdge[]", required: true },
    types: { type: "Record<string, NetworkType>", required: true, notes: "Every type's name, pinned slot and glyph. The filter lists them in this order." },
    total: { type: "number", notes: "How many entities the store holds, for \"7 of 1,284 shown\". Default: nodes.length." },
    hiddenNeighbours: { type: "Record<string, number>", notes: "Relations per node that exist but are not loaded: the canvas chip, the panel's count, and the announcement." },
    onExpandRequest: { type: "(node) => void", notes: "Load the node's neighbourhood and append it. The nodes already drawn stay where they are." },
    selected: { type: "string | null", notes: "Controlled selection, with onSelect; defaultSelected for uncontrolled. The history starts from defaultSelected." },
    renderer: { type: "NetworkRenderer", notes: "Passed to Network: NetworkCanvas for a store that can load past 2,000 elements." },
    height: { type: "number", default: "456" },
    "…labels": { type: "string", notes: "searchLabel, searchPlaceholder, filterLabel, historyLabel, relationsLabel, linkedFromLabel, expandLabel, closeLabel, detailsLabel, tableLabel, inferredLabel, emptyDetailText, shownText: every user-visible string is a prop." },
  },

  do: [
    "Load a neighbourhood at a time and report what is left in hiddenNeighbours; it is what makes the graph explorable rather than a hairball.",
    "Pin each type's slot in `types`, so filtering never repaints the survivors.",
    "Count a relation as hidden until it is loaded, even when both its ends already are.",
  ],

  dont: [
    "Do not hand it the whole store. A 5,000-node first paint is a picture, not an exploration.",
    "Do not rebuild it for a different panel — compose Network yourself; this block is one arrangement of it.",
  ],

  a11y: {
    role: "A plain container. The search is a combobox, the filter a fieldset of checkboxes, the history a nav with aria-current, the drawing Network's figure, and the panel a group named by the entity it shows.",
    name: "The drawing: `label` and `description`, kept for assistive tech while the head is hidden. The panel: the entity's name.",
    keyboard: [
      { key: "Tab", does: "Search, each type, the table toggle, the history's earlier steps, the drawing (Network's keyboard), then the panel: Close, each relation, Expand neighbours." },
      { key: "Escape (in the drawing)", does: "With nothing selected, back to the search field." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "names, current history step, relation names" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "counts, verbs, earlier history steps, \"shown\"" },
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-surface", floor: "decorative", role: "a type swatch", why: "The type is named beside every swatch, in the filter and in each relation row; the swatch only ties the row to the canvas." },
    ],
  },

  forwarding: {
    className: "root",
    ref: "root, as a prop",
    rest: "root — every HTML attribute except children and onSelect",
  },

  motion:
    "Its own motion is the chrome control's: the relation rows' and the history steps' hover fill and ink ease at the shared control timing. Everything else that moves is a part's — Network's world transform as focus follows and the view fits, the Combobox panel, the Checkbox mark — and each part documents its own. Nothing in the block runs a keyframe; under prefers-reduced-motion the duration tokens collapse.",

  needsDesign: [
    "\"Linked from\": the sheet draws only outgoing relations; incoming ones are listed apart, read from the other end — the library's reading.",
    "The empty panel (nothing selected) is not drawn.",
    "The table toggle in the toolbar is not drawn; the sheet's toolbar ends at \"7 of 1,284 shown\".",
  ],

  knownGaps: [
    "Search covers what is loaded, not the store. A server search is the Combobox's async mode (filter={null}, onInputValueChange); the block does not wire it.",
    "A controlled `selected` does not feed the history; the history records what this block selected.",
    "The panel and the canvas sit side by side at every width: below ~900px the canvas gets narrow. A stacked arrangement is not built.",
    "Path highlight shows only for the last jump, and only when it is longer than one hop.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/469R-0",
} as const;

export type KnowledgeGraphExplorerDoc = typeof knowledgeGraphExplorerDoc;
