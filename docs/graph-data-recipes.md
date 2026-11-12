# Graph data recipes — Neo4j and RDF into `GraphNode[]`

Status: **docs**, 2026-11-12. Plan §3.3 and §5 V4.

`Diagram`, `Network` and `KnowledgeGraphExplorer` take one shape, our own
`GraphNode` and `GraphEdge` from `@/lib/graph`. The registry ships **no
parser** for any store's format (AGENTS.md: no data layer), so the mapping
lives in your app, and it is short. This page gives the two you are most
likely to need, written without dependencies so they work with whichever
client you already use:

1. A **Neo4j** result (Cypher, through the official JavaScript driver).
2. **RDF**: a flattened **JSON-LD** document, or any RDF/JS quads (N3.js,
   rdflib, Comunica, Oxigraph).

Each recipe also shows how to fill `hiddenNeighbours` and answer
`onExpandRequest`, which is what turns a static drawing into the explorer.

The shape the components take, for reference:

```ts
interface GraphNode<D = unknown> {
  id: string;          // stable across requests: the explorer merges by it
  label: string;       // required, the accessible name
  type?: string;       // a key into `types`
  description?: string;
  position?: { x: number; y: number };
  parentId?: string;   // Diagram groups only
  data?: D;            // handed back in onSelect / onExpandRequest
}
interface GraphEdge<D = unknown> {
  id: string;
  source: string;
  target: string;
  label?: string;      // the predicate, read in every announcement
  type?: string;
  isDirected?: boolean;  // default true
  isInferred?: boolean;  // derived, not asserted: muted, hairline, "inferred" in words
  data?: D;
}
```

Three rules hold for every source:

- **Ids must be stable.** Expanding a node appends to `nodes` and `edges`, and
  the layout pins every node whose id it has already placed. An id that
  changes between requests is a new node, and the picture jumps.
- **De-duplicate on merge.** The same node or relation comes back in more
  than one neighbourhood. Merge by id; never append blindly.
- **Map types to at most eight entries.** `types` assigns data-cat slots 1–8
  in order of first appearance when you do not; a ninth type folds into
  "Other". Pick the eight your readers distinguish, and fold the rest
  yourself if the fold should say something more specific.

## 1 · Neo4j and Cypher

The driver hands back `Node`, `Relationship` and `Path` objects. Their
`elementId` is the stable id to use (Neo4j 5; `identity` is a deprecated
numeric id that can be reused after a delete). Integers in `properties` come
back as the driver's `Integer` unless you create the driver with
`{ disableLosslessIntegers: true }`; do that, or call `.toNumber()` on them,
before a value reaches a label.

```ts
import type { GraphEdge, GraphNode } from "@/lib/graph";

/** The parts of neo4j-driver's Node, Relationship and Path this recipe reads. */
interface Neo4jNode {
  elementId: string;
  labels: string[];
  properties: Record<string, unknown>;
}
interface Neo4jRelationship {
  elementId: string;
  type: string;
  startNodeElementId: string;
  endNodeElementId: string;
  properties: Record<string, unknown>;
}
interface Neo4jPath {
  segments: { start: Neo4jNode; relationship: Neo4jRelationship; end: Neo4jNode }[];
}

const isNode = (v: unknown): v is Neo4jNode =>
  typeof v === "object" && v !== null && "labels" in v && "elementId" in v;
const isRelationship = (v: unknown): v is Neo4jRelationship =>
  typeof v === "object" && v !== null && "startNodeElementId" in v;
const isPath = (v: unknown): v is Neo4jPath =>
  typeof v === "object" && v !== null && "segments" in v;

/** Neo4j relationship types are SHOUTED_SNAKE; announcements read better in words. */
const words = (type: string) => type.toLowerCase().replaceAll("_", " ");

/**
 * Every node, relationship and path anywhere in a result's records — in any
 * column, inside lists — mapped and de-duplicated by elementId.
 */
export function fromNeo4j(records: { values: unknown[] }[]): { nodes: GraphNode<Neo4jNode>[]; edges: GraphEdge<Neo4jRelationship>[] } {
  const nodes = new Map<string, GraphNode<Neo4jNode>>();
  const edges = new Map<string, GraphEdge<Neo4jRelationship>>();
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (isPath(v)) return v.segments.forEach((s) => (visit(s.start), visit(s.relationship), visit(s.end)));
    if (isNode(v)) {
      const p = v.properties;
      nodes.set(v.elementId, {
        id: v.elementId,
        label: String(p.name ?? p.title ?? v.labels[0] ?? v.elementId),
        ...(v.labels[0] ? { type: v.labels[0] } : {}),
        ...(typeof p.description === "string" ? { description: p.description } : {}),
        data: v,
      });
    } else if (isRelationship(v)) {
      edges.set(v.elementId, {
        id: v.elementId,
        source: v.startNodeElementId,
        target: v.endNodeElementId,
        label: words(v.type),
        type: v.type,
        // A property your model sets on derived relations, if it has one.
        ...(v.properties.inferred === true ? { isInferred: true } : {}),
        data: v,
      });
    }
  };
  for (const record of records) visit(record.values);
  // A relationship whose far end the query did not return would point at
  // nothing; Network ignores such an edge, but dropping it here keeps counts honest.
  for (const [id, e] of edges) if (!nodes.has(e.source) || !nodes.has(e.target)) edges.delete(id);
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
```

**The neighbourhood, and how much is left.** One query returns a node's
neighbours and, for each node in the answer, how many relations it has in
all. The explorer's `hiddenNeighbours` is that total minus what is loaded:

```cypher
// $id: the elementId being expanded. Cap the answer; the explorer asks again.
MATCH (n) WHERE elementId(n) = $id
OPTIONAL MATCH (n)-[r]-(m)
WITH n, r, m LIMIT 50
RETURN n, r, m, COUNT { (n)--() } AS nDegree, COUNT { (m)--() } AS mDegree
```

```ts
const session = driver.session({ defaultAccessMode: neo4j.session.READ });
const result = await session.executeRead((tx) => tx.run(QUERY, { id: node.id }));
const next = fromNeo4j(result.records.map((r) => ({ values: [r.get("n"), r.get("r"), r.get("m")] })));

const degree = new Map<string, number>();
for (const r of result.records) {
  degree.set(r.get("n").elementId, r.get("nDegree"));
  if (r.get("m")) degree.set(r.get("m").elementId, r.get("mDegree"));
}
```

Merge `next` into what you hold by id, then count per node:
`hiddenNeighbours[id] = degree.get(id) - loadedEdgesTouching(id)`, leaving out
the zeros. Count **relations**, not distinct neighbours: two relations between
the same pair are two things a reader can still expand into, and the
explorer's "Expand neighbours (N)" reads the number as given.

Use `elementId(n) = $id` with a parameter, never a string-built query: the id
comes from the page, and parameters are also what lets Neo4j cache the plan.

## 2 · RDF: JSON-LD and quads

In RDF a node is a subject IRI (or a blank node) and an edge is a triple whose
**object is another resource**. A triple whose object is a literal is not an
edge; it is a property of its subject, and becomes the label, the description
or `data`. That one rule is most of the recipe.

### 2a · A flattened JSON-LD document

Flatten and compact first, with your own context, so every resource is one
object in `@graph` and every reference to another resource is `{ "@id": … }`:

```ts
// jsonld.js: one call turns any JSON-LD into this shape.
const doc = await jsonld.flatten(input, context);
```

```ts
import type { GraphEdge, GraphNode } from "@/lib/graph";

type JsonLdValue = string | number | boolean | { "@id": string } | { "@value": unknown; "@language"?: string };
type JsonLdResource = { "@id": string; "@type"?: string | string[] } & Record<string, JsonLdValue | JsonLdValue[] | undefined>;

const LABEL = ["name", "label", "rdfs:label", "schema:name", "skos:prefLabel"];
const DESCRIPTION = ["description", "rdfs:comment", "schema:description", "skos:definition"];

/** The last segment of an IRI or a compact name: "schema:worksFor" → "worksFor". */
const local = (iri: string) => iri.split(/[#/:]/).filter(Boolean).at(-1) ?? iri;
/** "worksFor" → "works for", so the predicate reads as words in an announcement. */
const spaced = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();

const literal = (v: JsonLdValue | JsonLdValue[] | undefined, lang = "en"): string | undefined => {
  const all = (Array.isArray(v) ? v : v === undefined ? [] : [v]).filter((x) => typeof x !== "object" || "@value" in x);
  const pick = all.find((x) => typeof x === "object" && x["@language"] === lang) ?? all[0];
  if (pick === undefined) return undefined;
  return String(typeof pick === "object" ? (pick as { "@value": unknown })["@value"] : pick);
};

export function fromJsonLd(graph: JsonLdResource[], lang = "en"): { nodes: GraphNode<JsonLdResource>[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode<JsonLdResource>>();
  const edges = new Map<string, GraphEdge>();
  for (const r of graph) {
    const types = r["@type"] === undefined ? [] : Array.isArray(r["@type"]) ? r["@type"] : [r["@type"]];
    const label = LABEL.map((k) => literal(r[k], lang)).find(Boolean);
    const description = DESCRIPTION.map((k) => literal(r[k], lang)).find(Boolean);
    nodes.set(r["@id"], {
      id: r["@id"],
      label: label ?? local(r["@id"]),
      ...(types[0] ? { type: local(types[0]) } : {}),
      ...(description ? { description } : {}),
      data: r,
    });
    for (const [predicate, value] of Object.entries(r)) {
      if (predicate.startsWith("@")) continue;
      for (const v of Array.isArray(value) ? value : [value]) {
        if (typeof v !== "object" || v === null || !("@id" in v)) continue; // a literal: a property, not an edge
        const id = `${r["@id"]} ${predicate} ${v["@id"]}`; // the triple is its own stable id
        edges.set(id, { id, source: r["@id"], target: v["@id"], label: spaced(local(predicate)), type: predicate });
      }
    }
  }
  // An object that is never a subject still deserves a node, named from its IRI.
  for (const e of edges.values()) if (!nodes.has(e.target)) nodes.set(e.target, { id: e.target, label: local(e.target) });
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
```

### 2b · Any RDF/JS quads

Every mainstream JavaScript RDF library emits terms that follow the
[RDF/JS data model](https://rdf.js.org/data-model-spec/): a `termType` and a
`value`. A store, a SPARQL `CONSTRUCT` answer from Comunica, or a parsed
Turtle file all arrive as an iterable of these quads:

```ts
import type { GraphEdge, GraphNode } from "@/lib/graph";

interface Term { termType: "NamedNode" | "BlankNode" | "Literal" | "Variable" | "DefaultGraph" | "Quad"; value: string; language?: string }
interface Quad { subject: Term; predicate: Term; object: Term; graph: Term }

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LABELS = new Set([
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://schema.org/name",
  "https://schema.org/name",
  "http://www.w3.org/2004/02/skos/core#prefLabel",
]);
const COMMENTS = new Set(["http://www.w3.org/2000/01/rdf-schema#comment", "http://schema.org/description", "https://schema.org/description"]);

const local = (iri: string) => iri.split(/[#/]/).filter(Boolean).at(-1) ?? iri;
const spaced = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();

export function fromQuads(quads: Iterable<Quad>, lang = "en"): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode & { rank?: number }>();
  const edges = new Map<string, GraphEdge>();
  const node = (t: Term) => {
    let n = nodes.get(t.value);
    if (!n) nodes.set(t.value, (n = { id: t.value, label: t.termType === "BlankNode" ? "Unnamed" : local(t.value) }));
    return n;
  };
  for (const { subject, predicate, object } of quads) {
    const s = node(subject);
    const p = predicate.value;
    if (object.termType === "Literal") {
      // Prefer the reader's language, then an untagged literal, then any.
      const rank = object.language === lang ? 2 : object.language ? 0 : 1;
      if (LABELS.has(p) && rank >= (s.rank ?? -1)) Object.assign(s, { label: object.value, rank });
      else if (COMMENTS.has(p) && !s.description) s.description = object.value;
      continue;
    }
    if (p === RDF_TYPE) {
      s.type ??= local(object.value); // the first type wins; types are a legend, not an ontology
      continue;
    }
    const id = `${subject.value} ${p} ${object.value}`;
    node(object);
    edges.set(id, { id, source: subject.value, target: object.value, label: spaced(local(p)), type: p });
  }
  return { nodes: [...nodes.values()].map(({ rank: _, ...n }) => n), edges: [...edges.values()] };
}
```

**The neighbourhood, and how much is left,** from a SPARQL endpoint. A
`CONSTRUCT` returns the triples around one resource; a `SELECT` with
`COUNT` returns the degree to subtract from:

```sparql
CONSTRUCT { ?s ?p ?o }
WHERE {
  { BIND(<IRI> AS ?s) ?s ?p ?o } UNION { BIND(<IRI> AS ?o) ?s ?p ?o }
}
LIMIT 200

SELECT ?r (COUNT(*) AS ?degree)
WHERE { VALUES ?r { <IRI1> <IRI2> } { ?r ?p ?x FILTER(isIRI(?x) && ?p != rdf:type) } UNION { ?x ?p ?r } }
GROUP BY ?r
```

Substitute the IRI through your client's parameter binding, not by string
concatenation. `rdf:type` and literal objects are excluded from the degree
because the recipe does not draw them as edges; a count that includes them
promises the reader neighbours that expanding will not show.

## Inferred relations

Both recipes leave `isInferred` to you, because only your model knows which
relations are derived. Typical sources: a Neo4j relationship written by a
graph-data-science job (give it a property and test it, as in recipe 1), or an
RDF triple that a reasoner entailed rather than one in the asserted graph
(compare against the asserted store, or keep entailments in a named graph and
test `quad.graph.value`). An inferred edge draws muted, at hairline weight, and
says "inferred" in its accessible name and in the table — so a model that marks
it honestly gets that for nothing.

## Checked

The three mapping functions above were extracted from this page on
2026-11-12, type-checked against `GraphNode` and `GraphEdge` under the
repository's own compiler settings (`strict`, `exactOptionalPropertyTypes`),
and run on hand-built fixtures in the shapes the drivers document: a Neo4j
path, a list column and a relationship whose far end was not returned; a
flattened JSON-LD graph with a multi-valued property, labels in two languages
and an object that is never a subject; and quads with a type, labels in two
languages and a comment. The first type-check caught a node with no label
setting `type: undefined`, fixed above. No driver or RDF library was
installed: the interfaces here are the subset of their documented shapes the
recipes read, so check them against your client's version.
