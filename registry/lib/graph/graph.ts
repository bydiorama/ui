/**
 * The graph maths layer (ADR 0023): the neutral data shape Diagram and Network
 * take, and pure functions that turn it into positions, paths and answers.
 *
 * Everything here is our own. The plan (docs/charts-and-graphs-plan.md §3.4)
 * proposed dagre for the layered layout, d3-hierarchy for trees and d3-force
 * for networks; each of those jobs is a few hundred lines when only the parts a
 * read-only viewer needs are written, and owning them keeps the charts'
 * no-dependency precedent (`lib/viz` writes its own scales and bins). Should a
 * consumer need what these do not do — ports, edge crossings minimised
 * properly, Barnes–Hut at 50k nodes — the boundaries gate already lists those
 * packages, so admitting one behind this file is a swap, not a rewrite.
 *
 * Rules, as in `lib/viz`: no DOM, no React, deterministic for the same input
 * (the force layout takes a seed), every coordinate rounded to two decimals so
 * a server render and the first client render write the same numbers.
 */

/* ---------------------------------------------------------------- types */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** A rectangle by its top-left corner. */
export interface Box extends Point, Size {}

/**
 * A node, in the shape every graph component here takes. Our own type: never
 * graphology's, React Flow's or Cytoscape's (ADR 0023). Neo4j, RDF and JSON-LD
 * results are mapped to it by a recipe in the docs, not by a parser.
 */
export interface GraphNode<D = unknown> {
  id: string;
  /** Required: it is the node's accessible name, and every announcement leads with it. */
  label: string;
  /** A key into the component's `types` map: colour slot, glyph and the type's spoken name. */
  type?: string;
  /** One sentence. A Diagram node prints it under the label; a Network's detail panel shows it. */
  description?: string;
  /** Given, the node is pinned there and no layout moves it. */
  position?: Point;
  /** A Diagram.Group id: the node is drawn inside that group. */
  parentId?: string;
  /** Opaque. Handed back in callbacks so the caller does not look the node up again. */
  data?: D;
}

export interface GraphEdge<D = unknown> {
  id: string;
  source: string;
  target: string;
  /** The predicate ("informs", "co-founded"). Drawn on the edge and read in every announcement. */
  label?: string;
  type?: string;
  /** Default true: an arrow at the target. */
  isDirected?: boolean;
  /**
   * Derived rather than asserted. Drawn in muted ink on a thinner stroke —
   * never dashed — and the word "inferred" is in its accessible name, so the
   * difference is not carried by weight alone.
   */
  isInferred?: boolean;
  data?: D;
}

type EdgeLike = Pick<GraphEdge, "source" | "target">;
type NodeLike = Pick<GraphNode, "id">;

export type LayoutDirection = "down" | "right";

/* ------------------------------------------------------------- numbers */

/** Two decimals: enough for a crisp SVG, few enough that server and client agree. */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * A seeded PRNG (mulberry32). The force layout's only source of randomness,
 * so the same graph and seed always produce the same picture — which the
 * visual gate depends on (plan §6, viz-determinism).
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ adjacency */

export interface Incidence<E extends EdgeLike = GraphEdge> {
  edge: E;
  /** The node at the other end. */
  other: string;
  /** "out" when this node is the edge's source. */
  direction: "out" | "in";
}

/** Every node's edges, both directions, in edge order. Self-loops are skipped. */
export function adjacency<E extends EdgeLike>(edges: readonly E[]): Map<string, Incidence<E>[]> {
  const map = new Map<string, Incidence<E>[]>();
  const push = (id: string, item: Incidence<E>) => {
    const list = map.get(id);
    if (list) list.push(item);
    else map.set(id, [item]);
  };
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    push(edge.source, { edge, other: edge.target, direction: "out" });
    push(edge.target, { edge, other: edge.source, direction: "in" });
  }
  return map;
}

/** Hops from `from` to every node it reaches, ignoring direction. */
export function hopDistances(edges: readonly EdgeLike[], from: string): Map<string, number> {
  const adj = adjacency(edges);
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    const d = dist.get(id)!;
    for (const { other } of adj.get(id) ?? []) {
      if (dist.has(other)) continue;
      dist.set(other, d + 1);
      queue.push(other);
    }
  }
  return dist;
}

/**
 * The shortest path between two nodes as node ids, ends included, or null.
 * Breadth-first, so "shortest" counts hops; ties go to the earlier edge, which
 * keeps the answer stable for the same input.
 */
export function shortestPath(
  edges: readonly EdgeLike[],
  from: string,
  to: string,
  { isDirected = false }: { isDirected?: boolean } = {},
): string[] | null {
  if (from === to) return [from];
  const adj = adjacency(edges);
  const previous = new Map<string, string>([[from, from]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    for (const { other, direction } of adj.get(id) ?? []) {
      if (isDirected && direction === "in") continue;
      if (previous.has(other)) continue;
      previous.set(other, id);
      if (other === to) {
        const path = [to];
        let at = to;
        while (at !== from) {
          at = previous.get(at)!;
          path.unshift(at);
        }
        return path;
      }
      queue.push(other);
    }
  }
  return null;
}

/** The edges that join consecutive nodes of a path, as a set of edge ids. */
export function pathEdgeIds(edges: readonly GraphEdge[], path: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const edge = edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
    if (edge) ids.add(edge.id);
  }
  return ids;
}

/* ------------------------------------------------------------- geometry */

export function centre(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The smallest box around all of them, or null for none. */
export function boundsOf(boxes: Iterable<Box>): Box | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Grow a box by `by` on every side. */
export function inflate(box: Box, by: number): Box {
  return { x: box.x - by, y: box.y - by, width: box.width + 2 * by, height: box.height + 2 * by };
}

/**
 * Clockwise angle from twelve o'clock, in [0, 2π). Screen y points down, so
 * three o'clock is π/2 — the order the Network keyboard walks a node's edges.
 */
export function clockAngle(from: Point, to: Point): number {
  const a = Math.atan2(to.x - from.x, -(to.y - from.y));
  return a < 0 ? a + 2 * Math.PI : a;
}

/* ------------------------------------------------------------- viewport */

/** A pan-and-zoom transform: screen = world × k + (x, y). */
export interface View {
  x: number;
  y: number;
  k: number;
}

export interface ScaleLimits {
  min?: number;
  max?: number;
}

export function clampScale(k: number, { min = 0.25, max = 2 }: ScaleLimits = {}): number {
  return Math.min(max, Math.max(min, k));
}

/**
 * The transform that fits `content` inside `size` with `padding` around it,
 * centred. It never zooms in past `max` (default 1): a three-node diagram is
 * drawn at its own size, not blown up to fill the frame.
 */
export function fitView(
  content: Box,
  size: Size,
  { padding = 32, min = 0.25, max = 1 }: ScaleLimits & { padding?: number } = {},
): View {
  const w = Math.max(1, size.width - 2 * padding);
  const h = Math.max(1, size.height - 2 * padding);
  // Three decimals on the scale: two would move a 2,000px drawing by 10px.
  const k = Math.round(clampScale(Math.min(w / Math.max(1, content.width), h / Math.max(1, content.height)), { min, max }) * 1000) / 1000;
  return {
    x: round(size.width / 2 - (content.x + content.width / 2) * k),
    y: round(size.height / 2 - (content.y + content.height / 2) * k),
    k,
  };
}

/** Zoom by `factor` keeping the screen point `at` still. */
export function zoomAt(view: View, factor: number, at: Point, limits?: ScaleLimits): View {
  const k = clampScale(view.k * factor, limits);
  const f = k / view.k;
  return { x: round(at.x - (at.x - view.x) * f), y: round(at.y - (at.y - view.y) * f), k };
}

/**
 * The least pan that brings `box` (world units) fully inside the frame with
 * `margin` to spare — follow focus (SC 2.4.11). A box larger than the frame is
 * centred instead. Unchanged when it is already in view, so focus moving
 * between visible nodes never jolts the picture.
 */
export function ensureVisible(view: View, box: Box, size: Size, margin = 24): View {
  const axis = (pos: number, extent: number, offset: number, frame: number) => {
    const start = pos * view.k + offset;
    const end = start + extent * view.k;
    if (end - start > frame - 2 * margin) return offset + (frame / 2 - (start + end) / 2);
    if (start < margin) return offset + (margin - start);
    if (end > frame - margin) return offset - (end - (frame - margin));
    return offset;
  };
  const x = axis(box.x, box.width, view.x, size.width);
  const y = axis(box.y, box.height, view.y, size.height);
  return x === view.x && y === view.y ? view : { x: round(x), y: round(y), k: view.k };
}

/* --------------------------------------------------- spatial navigation */

export type Direction = "up" | "down" | "left" | "right";

/**
 * The nearest candidate in a direction: arrow-key navigation through a drawn
 * graph (plan §3.6). A candidate must lie strictly that way; among those, the
 * distance along the arrow counts once and the distance across it twice, so
 * the node straight ahead beats a closer one off to the side.
 */
export function nearestInDirection(
  from: Point,
  candidates: Iterable<readonly [string, Point]>,
  direction: Direction,
): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, p] of candidates) {
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const along = direction === "right" ? dx : direction === "left" ? -dx : direction === "down" ? dy : -dy;
    const across = direction === "right" || direction === "left" ? Math.abs(dy) : Math.abs(dx);
    if (along <= 0.5) continue;
    const score = along + 2 * across;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/* ---------------------------------------------------------------- edges */

/** Where the ray from `box`'s centre towards `toward` crosses its border. */
export function clipToBox(box: Box, toward: Point): Point {
  const c = centre(box);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const sx = dx === 0 ? Infinity : box.width / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : box.height / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** The arrow head the sheets draw — `l-8-4v8Z` — turned to `angle` with its tip at `tip`. */
export const ARROW_LENGTH = 8;
export const ARROW_HALF_WIDTH = 4;

export function arrowHeadPath(tip: Point, angle: number): string {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const at = (u: number, v: number) => `${round(tip.x + u * cos - v * sin)} ${round(tip.y + u * sin + v * cos)}`;
  return `M${at(0, 0)}L${at(-ARROW_LENGTH, -ARROW_HALF_WIDTH)}L${at(-ARROW_LENGTH, ARROW_HALF_WIDTH)}Z`;
}

export type EdgeRoute = "straight" | "curved" | "orthogonal";

export interface EdgeGeometry {
  /** The stroke. With a head, it stops at the head's base so the line never shows through it. */
  d: string;
  /** The head's path, or null for an undirected edge. */
  head: string | null;
  /** Where a label sits: halfway along the drawn route. */
  mid: Point;
}

const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;

/**
 * An edge between two Diagram nodes. The tip lands ON the target's frame
 * (Diagram sheet, Edges). Curved and orthogonal routes leave from the side
 * facing the flow — bottom to top for "down", right to left for "right" — and
 * fall back to a straight clip when the target is not ahead of the source
 * (a back edge, or two nodes on one rank), where a port route would double
 * back through the source.
 */
export function boxEdge(
  a: Box,
  b: Box,
  { route = "curved", direction = "down", isDirected = true }: { route?: EdgeRoute; direction?: LayoutDirection; isDirected?: boolean } = {},
): EdgeGeometry {
  const ca = centre(a);
  const cb = centre(b);
  const isDown = direction === "down";
  const isAhead = isDown ? b.y >= a.y + a.height : b.x >= a.x + a.width;
  const cut = isDirected ? ARROW_LENGTH : 0;

  if (route === "straight" || !isAhead) {
    const start = clipToBox(a, cb);
    const tip = clipToBox(b, ca);
    const angle = Math.atan2(tip.y - start.y, tip.x - start.x);
    const len = Math.hypot(tip.x - start.x, tip.y - start.y);
    const k = len > cut ? (len - cut) / len : 0;
    const end = { x: start.x + (tip.x - start.x) * k, y: start.y + (tip.y - start.y) * k };
    return {
      d: `M${fmt(start)}L${fmt(end)}`,
      head: isDirected ? arrowHeadPath(tip, angle) : null,
      mid: { x: round((start.x + tip.x) / 2), y: round((start.y + tip.y) / 2) },
    };
  }

  const start = isDown ? { x: ca.x, y: a.y + a.height } : { x: a.x + a.width, y: ca.y };
  const tip = isDown ? { x: cb.x, y: b.y } : { x: b.x, y: cb.y };
  const angle = isDown ? Math.PI / 2 : 0;
  const end = isDown ? { x: tip.x, y: tip.y - cut } : { x: tip.x - cut, y: tip.y };
  const head = isDirected ? arrowHeadPath(tip, angle) : null;

  if (route === "orthogonal") {
    if (isDown) {
      const my = (start.y + tip.y) / 2;
      return { d: `M${fmt(start)}V${round(my)}H${round(end.x)}V${round(end.y)}`, head, mid: { x: round((start.x + end.x) / 2), y: round(my) } };
    }
    const mx = (start.x + tip.x) / 2;
    return { d: `M${fmt(start)}H${round(mx)}V${round(end.y)}H${round(end.x)}`, head, mid: { x: round(mx), y: round((start.y + end.y) / 2) } };
  }

  // A cubic whose handles run along the flow for half the gap, so it leaves
  // and arrives square to the frames.
  const half = isDown ? (end.y - start.y) / 2 : (end.x - start.x) / 2;
  const c1 = isDown ? { x: start.x, y: start.y + half } : { x: start.x + half, y: start.y };
  const c2 = isDown ? { x: end.x, y: end.y - half } : { x: end.x - half, y: end.y };
  const mid = {
    x: round(0.125 * start.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * end.x),
    y: round(0.125 * start.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * end.y),
  };
  return { d: `M${fmt(start)}C${fmt(c1)} ${fmt(c2)} ${fmt(end)}`, head, mid };
}

/**
 * An edge between two Network nodes: centre to centre, both ends stopped at
 * `gap` from the centres (26 on the Network sheet: the 20px node, its ring and
 * air), with the tip at the target's gap.
 */
export function circleEdge(a: Point, b: Point, { gap = 26, isDirected = true }: { gap?: number; isDirected?: boolean } = {}): EdgeGeometry {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const start = { x: a.x + ux * gap, y: a.y + uy * gap };
  const tip = { x: b.x - ux * gap, y: b.y - uy * gap };
  if (len <= 2 * gap) {
    // Overlapping discs: nothing honest to draw between them.
    return { d: "", head: null, mid: { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) } };
  }
  const cut = isDirected ? ARROW_LENGTH : 0;
  const end = { x: tip.x - ux * cut, y: tip.y - uy * cut };
  return {
    d: `M${fmt(start)}L${fmt(end)}`,
    head: isDirected ? arrowHeadPath(tip, Math.atan2(dy, dx)) : null,
    mid: { x: round((start.x + tip.x) / 2), y: round((start.y + tip.y) / 2) },
  };
}

/* -------------------------------------------------------------- layouts */

export interface BoxLayoutOptions {
  /** Each node's laid-out size. A size HINT on the server; the measured size on the client. */
  size: (id: string) => Size;
  direction?: LayoutDirection;
  /** Between ranks (layered) or levels (tree), along the flow. */
  rankGap?: number;
  /** Between neighbours on one rank, across the flow. */
  nodeGap?: number;
}

/** Shift every box so the drawing's top-left is (0, 0), then round. */
function normalise(boxes: Map<string, Box>): Map<string, Box> {
  const b = boundsOf(boxes.values());
  if (!b) return boxes;
  for (const [id, box] of boxes) {
    boxes.set(id, { x: round(box.x - b.x), y: round(box.y - b.y), width: box.width, height: box.height });
  }
  return boxes;
}

/** Turn per-rank centres (across) and rank offsets (along) into boxes. */
function toBoxes(
  ranks: string[][],
  across: Map<string, number>,
  size: (id: string) => Size,
  direction: LayoutDirection,
  gap: number,
): Map<string, Box> {
  const isDown = direction === "down";
  const boxes = new Map<string, Box>();
  let along = 0;
  for (const rank of ranks) {
    const depth = Math.max(0, ...rank.map((id) => (isDown ? size(id).height : size(id).width)));
    for (const id of rank) {
      const s = size(id);
      const c = across.get(id)!;
      boxes.set(
        id,
        isDown
          ? { x: c - s.width / 2, y: along + (depth - s.height) / 2, width: s.width, height: s.height }
          : { x: along + (depth - s.width) / 2, y: c - s.height / 2, width: s.width, height: s.height },
      );
    }
    along += depth + gap;
  }
  return normalise(boxes);
}

/**
 * Layered (Sugiyama-style) layout for flows, pipelines and DAGs.
 *
 * 1. Cycles broken by reversing the back edges a depth-first walk finds.
 * 2. Ranks by longest path from the sources.
 * 3. Order inside each rank by barycentre, four sweeps down and up.
 * 4. Positions across the flow pulled towards the mean of each node's
 *    neighbours, then pushed apart to keep `nodeGap`.
 *
 * No dummy nodes: an edge that skips a rank is drawn straight through the gap
 * rather than bent around it. That is the trade for owning 150 lines instead
 * of a dependency, and the doc says so.
 */
export function layeredLayout(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
  { size, direction = "down", rankGap = 64, nodeGap = 32 }: BoxLayoutOptions,
): Map<string, Box> {
  // Nothing to rank: the upward sweep below would start at rank -2.
  if (!nodes.length) return new Map();
  const ids = nodes.map((n) => n.id);
  const known = new Set(ids);
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));

  // 1 · break cycles
  const state = new Map<string, 0 | 1 | 2>();
  const dag: [string, string][] = [];
  const raw = edges.filter((e) => e.source !== e.target && known.has(e.source) && known.has(e.target));
  const outRaw = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of raw) outRaw.get(e.source)!.push(e.target);
  const visit = (id: string) => {
    state.set(id, 1);
    for (const t of outRaw.get(id)!) {
      if (state.get(t) === 1) dag.push([t, id]);
      else {
        dag.push([id, t]);
        if (!state.get(t)) visit(t);
      }
    }
    state.set(id, 2);
  };
  for (const id of ids) if (!state.get(id)) visit(id);
  const inn = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [s, t] of dag) {
    out.get(s)!.push(t);
    inn.get(t)!.push(s);
  }

  // 2 · rank by longest path (Kahn's order)
  const rank = new Map<string, number>();
  const indeg = new Map(ids.map((id) => [id, inn.get(id)!.length]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  for (const id of queue) rank.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    for (const t of out.get(id)!) {
      rank.set(t, Math.max(rank.get(t) ?? 0, rank.get(id)! + 1));
      const d = indeg.get(t)! - 1;
      indeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }
  const ranks: string[][] = [];
  for (const id of ids) {
    const r = rank.get(id) ?? 0;
    (ranks[r] ??= []).push(id);
  }
  for (let r = 0; r < ranks.length; r++) ranks[r] ??= [];

  // 3 · order by barycentre
  const index = new Map<string, number>();
  const reindex = () => ranks.forEach((rk) => rk.forEach((id, i) => index.set(id, i)));
  reindex();
  const sweep = (from: number, to: number, step: number, neighbours: Map<string, string[]>) => {
    for (let r = from; r !== to; r += step) {
      const rk = ranks[r]!;
      const bary = new Map<string, number>();
      for (const id of rk) {
        const ns = neighbours.get(id)!;
        bary.set(id, ns.length ? ns.reduce((s, n) => s + index.get(n)!, 0) / ns.length : index.get(id)!);
      }
      // A stable sort: ties keep their order, so the result does not depend
      // on the engine's sort implementation.
      rk.sort((p, q) => bary.get(p)! - bary.get(q)! || index.get(p)! - index.get(q)!);
      rk.forEach((id, i) => index.set(id, i));
    }
  };
  for (let pass = 0; pass < 4; pass++) {
    sweep(1, ranks.length, 1, inn);
    sweep(ranks.length - 2, -1, -1, out);
  }

  // 4 · positions across the flow
  const isDown = direction === "down";
  const breadth = (id: string) => (isDown ? size(id).width : size(id).height);
  const across = new Map<string, number>();
  for (const rk of ranks) {
    const total = rk.reduce((s, id) => s + breadth(id), 0) + nodeGap * Math.max(0, rk.length - 1);
    let at = -total / 2;
    for (const id of rk) {
      across.set(id, at + breadth(id) / 2);
      at += breadth(id) + nodeGap;
    }
  }
  const settle = (rk: string[], neighbours: Map<string, string[]>) => {
    if (!rk.length) return;
    const want = rk.map((id) => {
      const ns = neighbours.get(id)!;
      return ns.length ? ns.reduce((s, n) => s + across.get(n)!, 0) / ns.length : across.get(id)!;
    });
    const got = want.slice();
    for (let i = 1; i < rk.length; i++) {
      const min = got[i - 1]! + (breadth(rk[i - 1]!) + breadth(rk[i]!)) / 2 + nodeGap;
      if (got[i]! < min) got[i] = min;
    }
    // A uniform shift keeps the spacing and returns the rank to where its
    // neighbours asked for it on average.
    const shift = want.reduce((s, w, i) => s + (w - got[i]!), 0) / rk.length;
    rk.forEach((id, i) => across.set(id, got[i]! + shift));
  };
  for (let pass = 0; pass < 4; pass++) {
    for (let r = 1; r < ranks.length; r++) settle(ranks[r]!, inn);
    for (let r = ranks.length - 2; r >= 0; r--) settle(ranks[r]!, out);
  }

  return toBoxes(ranks, across, size, direction, rankGap);
}

/**
 * The tree each node's FIRST incoming edge describes, breadth-first from the
 * roots. Later edges into an already-placed node are drawn but do not move it,
 * so a DAG lays out as the tree of its first parents.
 */
export function treeOf(nodes: readonly NodeLike[], edges: readonly EdgeLike[], rootId?: string) {
  const ids = nodes.map((n) => n.id);
  const known = new Set(ids);
  const targets = new Set(edges.filter((e) => known.has(e.source) && e.source !== e.target).map((e) => e.target));
  const roots = rootId && known.has(rootId) ? [rootId, ...ids.filter((id) => id !== rootId && !targets.has(id))] : ids.filter((id) => !targets.has(id));
  if (!roots.length && ids.length) roots.push(ids[0]!);
  const children = new Map<string, string[]>(ids.map((id) => [id, []]));
  const parent = new Map<string, string | null>();
  const depth = new Map<string, number>();
  const queue: string[] = [];
  const claim = (id: string, p: string | null) => {
    parent.set(id, p);
    depth.set(id, p === null ? 0 : depth.get(p)! + 1);
    if (p !== null) children.get(p)!.push(id);
    queue.push(id);
  };
  const outs = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of edges) if (known.has(e.source) && known.has(e.target) && e.source !== e.target) outs.get(e.source)!.push(e.target);
  const walk = () => {
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!;
      for (const t of outs.get(id)!) if (!parent.has(t)) claim(t, id);
    }
  };
  for (const r of roots) {
    if (!parent.has(r)) claim(r, null);
    walk();
  }
  // Anything left is on a cycle with no way in: its own root.
  for (const id of ids) {
    if (!parent.has(id)) {
      claim(id, null);
      walk();
      roots.push(id);
    }
  }
  return { roots: roots.filter((r) => parent.get(r) === null), children, parent, depth };
}

/**
 * A tidy tree: each parent centred over its children, siblings `nodeGap`
 * apart, levels `rankGap` apart. Org charts and hierarchies.
 */
export function treeLayout(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
  { size, direction = "down", rankGap = 48, nodeGap = 24, rootId }: BoxLayoutOptions & { rootId?: string },
): Map<string, Box> {
  const { roots, children, depth } = treeOf(nodes, edges, rootId);
  const isDown = direction === "down";
  const breadth = (id: string) => (isDown ? size(id).width : size(id).height);
  const span = new Map<string, number>();
  const measure = (id: string): number => {
    const kids = children.get(id)!;
    const inner = kids.reduce((s, k) => s + measure(k), 0) + nodeGap * Math.max(0, kids.length - 1);
    const w = Math.max(breadth(id), inner);
    span.set(id, w);
    return w;
  };
  const across = new Map<string, number>();
  const place = (id: string, start: number) => {
    const w = span.get(id)!;
    across.set(id, start + w / 2);
    const kids = children.get(id)!;
    const inner = kids.reduce((s, k) => s + span.get(k)!, 0) + nodeGap * Math.max(0, kids.length - 1);
    let at = start + (w - inner) / 2;
    for (const k of kids) {
      place(k, at);
      at += span.get(k)! + nodeGap;
    }
    // Over the first and last child, not the middle of the span: a parent
    // whose first child has a wide subtree should still sit above its own
    // children rather than drift into the gap beside them.
    if (kids.length) across.set(id, (across.get(kids[0]!)! + across.get(kids[kids.length - 1]!)!) / 2);
  };
  let at = 0;
  for (const r of roots) {
    measure(r);
    place(r, at);
    at += span.get(r)! + nodeGap * 2;
  }
  const levels: string[][] = [];
  for (const n of nodes) (levels[depth.get(n.id) ?? 0] ??= []).push(n.id);
  for (let i = 0; i < levels.length; i++) levels[i] ??= [];
  return toBoxes(levels, across, size, direction, rankGap);
}

/**
 * A radial tree: the root at the centre, each level on a ring `ringGap`
 * further out, and each subtree given an arc in proportion to its leaves.
 * Centres, not boxes — a Network node is a point; Diagram turns these into
 * boxes around them. The first child of the root sits at twelve o'clock.
 */
export function radialLayout(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
  { ringGap = 120, rootId }: { ringGap?: number; rootId?: string } = {},
): Map<string, Point> {
  const { roots, children } = treeOf(nodes, edges, rootId);
  const leaves = new Map<string, number>();
  const count = (id: string): number => {
    const kids = children.get(id)!;
    const n = kids.length ? kids.reduce((s, k) => s + count(k), 0) : 1;
    leaves.set(id, n);
    return n;
  };
  const points = new Map<string, Point>();
  // Several roots sit on the first ring under a virtual centre.
  const top = roots.length === 1 ? children.get(roots[0]!)! : roots;
  if (roots.length === 1) points.set(roots[0]!, { x: 0, y: 0 });
  for (const r of roots) count(r);
  const total = top.reduce((s, k) => s + leaves.get(k)!, 0) || 1;
  const place = (id: string, from: number, to: number, ring: number) => {
    const a = (from + to) / 2;
    points.set(id, { x: round(Math.sin(a) * ring * ringGap), y: round(-Math.cos(a) * ring * ringGap) });
    const kids = children.get(id)!;
    const n = leaves.get(id)!;
    let at = from;
    for (const k of kids) {
      const share = ((to - from) * leaves.get(k)!) / n;
      place(k, at, at + share, ring + 1);
      at += share;
    }
  };
  // Start half a share before twelve so the first subtree is centred on it.
  const first = top[0] ? (Math.PI * 2 * leaves.get(top[0])!) / total / 2 : 0;
  let at = -first;
  for (const k of top) {
    const share = (Math.PI * 2 * leaves.get(k)!) / total;
    place(k, at, at + share, 1);
    at += share;
  }
  return points;
}

export interface ForceOptions {
  /** Same seed, same picture. */
  seed?: number;
  /** Ticks to run. The simulation is run to completion before anything paints. */
  iterations?: number;
  /** The length an edge settles at. */
  linkDistance?: number;
  /** Repulsion between nodes; larger spreads the drawing. */
  charge?: number;
  /** No two centres closer than this. */
  collide?: number;
  /** Nodes that must not move: given positions, or the last layout's when nodes are appended. */
  fixed?: ReadonlyMap<string, Point>;
  /** Where to start nodes that are not fixed — the previous layout, for an incremental run. */
  initial?: ReadonlyMap<string, Point>;
}

/**
 * A seeded force-directed layout: edges as springs, nodes repelling within a
 * cut-off, a minimum distance between centres, everything else still.
 *
 * - **Deterministic.** Starts on a phyllotaxis spiral, and the only randomness
 *   (separating coincident nodes) comes from `seededRandom(seed)`.
 * - **Incremental.** Nodes in `fixed` stay put; a new node starts next to the
 *   first neighbour that already has a place, so appending a node's neighbours
 *   (`onExpandRequest`) grows the picture instead of reshuffling it.
 * - **Bounded cost.** Repulsion only within three link lengths, through a
 *   uniform grid, so a tick is near-linear in nodes. Above ~500 nodes Network
 *   runs this in a worker; the function is the same either way.
 */
export function forceLayout(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
  { seed = 1, iterations = 300, linkDistance = 96, charge = 1, collide = 64, fixed, initial }: ForceOptions = {},
): Map<string, Point> {
  const n = nodes.length;
  const random = seededRandom(seed);
  const at = new Map(nodes.map((node, i) => [node.id, i]));
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const pinned = new Uint8Array(n);
  const links = edges
    .filter((e) => e.source !== e.target && at.has(e.source) && at.has(e.target))
    .map((e) => [at.get(e.source)!, at.get(e.target)!] as const);
  const degree = new Uint32Array(n);
  for (const [s, t] of links) {
    degree[s]!++;
    degree[t]!++;
  }

  const placed = new Uint8Array(n);
  nodes.forEach((node, i) => {
    const p = fixed?.get(node.id) ?? initial?.get(node.id);
    if (p) {
      xs[i] = p.x;
      ys[i] = p.y;
      placed[i] = 1;
      if (fixed?.has(node.id)) pinned[i] = 1;
    }
  });
  const anyPlaced = placed.some((v) => v === 1);
  // A new node beside a neighbour that already has a place; otherwise on the
  // spiral. Repeated until nothing changes, so a chain of new nodes unrolls
  // outward from the placed one it hangs from.
  for (let changed = true; changed && anyPlaced; ) {
    changed = false;
    for (const [s, t] of links) {
      const [from, to] = placed[s] && !placed[t] ? [s, t] : placed[t] && !placed[s] ? [t, s] : [-1, -1];
      if (from < 0) continue;
      const a = random() * Math.PI * 2;
      xs[to] = xs[from]! + Math.cos(a) * linkDistance;
      ys[to] = ys[from]! + Math.sin(a) * linkDistance;
      placed[to] = 1;
      changed = true;
    }
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  let spiral = 0;
  for (let i = 0; i < n; i++) {
    if (placed[i]) continue;
    const r = (linkDistance / 2) * Math.sqrt(0.5 + spiral);
    xs[i] = r * Math.cos(spiral * golden);
    ys[i] = r * Math.sin(spiral * golden);
    spiral++;
  }

  const cutoff = linkDistance * 3;
  const strength = charge * linkDistance * linkDistance * 0.6;
  let alpha = 1;
  const decay = 1 - Math.pow(0.001, 1 / Math.max(1, iterations));
  const grid = new Map<string, number[]>();

  for (let tick = 0; tick < iterations; tick++) {
    // Springs, weighted so a hub is not dragged around by its leaves (d3's
    // degree bias).
    for (const [s, t] of links) {
      let dx = xs[t]! + vx[t]! - xs[s]! - vx[s]!;
      let dy = ys[t]! + vy[t]! - ys[s]! - vy[s]!;
      if (dx === 0 && dy === 0) {
        dx = (random() - 0.5) * 1e-3;
        dy = (random() - 0.5) * 1e-3;
      }
      const l = Math.hypot(dx, dy);
      const k = ((l - linkDistance) / l) * alpha * (1 / Math.min(degree[s]!, degree[t]!)) * 0.5;
      const bias = degree[s]! / (degree[s]! + degree[t]!);
      vx[t]! -= dx * k * bias;
      vy[t]! -= dy * k * bias;
      vx[s]! += dx * k * (1 - bias);
      vy[s]! += dy * k * (1 - bias);
    }

    // Repulsion and collision through a uniform grid.
    grid.clear();
    for (let i = 0; i < n; i++) {
      const key = `${Math.floor(xs[i]! / cutoff)},${Math.floor(ys[i]! / cutoff)}`;
      const cell = grid.get(key);
      if (cell) cell.push(i);
      else grid.set(key, [i]);
    }
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(xs[i]! / cutoff);
      const gy = Math.floor(ys[i]! / cutoff);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(`${gx + ox},${gy + oy}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            let dx = xs[j]! - xs[i]!;
            let dy = ys[j]! - ys[i]!;
            if (dx === 0 && dy === 0) {
              dx = (random() - 0.5) * 1e-3;
              dy = (random() - 0.5) * 1e-3;
            }
            const l2 = dx * dx + dy * dy;
            if (l2 > cutoff * cutoff) continue;
            const l = Math.sqrt(l2);
            const f = (strength * alpha) / Math.max(l2, 1);
            let px = (dx / l) * f;
            let py = (dy / l) * f;
            if (l < collide) {
              const push = ((collide - l) / l) * 0.5;
              px += dx * push;
              py += dy * push;
            }
            vx[i]! -= px;
            vy[i]! -= py;
            vx[j]! += px;
            vy[j]! += py;
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      if (pinned[i]) {
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      vx[i]! *= 0.6;
      vy[i]! *= 0.6;
      xs[i]! += vx[i]!;
      ys[i]! += vy[i]!;
    }
    alpha -= alpha * decay;
  }

  // Centre on the origin, unless something is pinned — then the pinned nodes
  // ARE the frame of reference and moving them would defeat the pinning.
  let cx = 0;
  let cy = 0;
  if (!pinned.some((v) => v === 1) && n) {
    for (let i = 0; i < n; i++) {
      cx += xs[i]!;
      cy += ys[i]!;
    }
    cx /= n;
    cy /= n;
  }
  return new Map(nodes.map((node, i) => [node.id, { x: round(xs[i]! - cx), y: round(ys[i]! - cy) }]));
}
