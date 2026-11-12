import test from "node:test";
import assert from "node:assert/strict";

import {
  adjacency,
  arrowHeadPath,
  boundsOf,
  boxEdge,
  circleEdge,
  clockAngle,
  ensureVisible,
  fitView,
  forceLayout,
  hopDistances,
  layeredLayout,
  nearestInDirection,
  pathEdgeIds,
  radialLayout,
  seededRandom,
  shortestPath,
  treeLayout,
  zoomAt,
  type Box,
  type GraphEdge,
} from "./graph.ts";

const NODE = { width: 160, height: 56 };
const size = () => NODE;
const nodes = (...ids: string[]) => ids.map((id) => ({ id }));
const edge = (source: string, target: string, id = `${source}-${target}`): GraphEdge => ({ id, source, target });

/** Do any two boxes overlap? */
function overlaps(boxes: Iterable<Box>): boolean {
  const list = [...boxes];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) return true;
    }
  }
  return false;
}

test("seededRandom repeats for a seed and differs between seeds", () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  const c = seededRandom(8);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test("adjacency lists both ends and skips self-loops", () => {
  const adj = adjacency([edge("a", "b"), edge("b", "b"), edge("c", "a")]);
  assert.deepEqual(adj.get("a")!.map((i) => [i.other, i.direction]), [["b", "out"], ["c", "in"]]);
  assert.equal(adj.get("b")!.length, 1);
});

test("hopDistances and shortestPath ignore direction unless told", () => {
  const es = [edge("a", "b"), edge("b", "c"), edge("d", "c"), edge("a", "e")];
  assert.deepEqual([...hopDistances(es, "a")].sort(), [["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 1]]);
  assert.deepEqual(shortestPath(es, "a", "d"), ["a", "b", "c", "d"]);
  assert.equal(shortestPath(es, "a", "d", { isDirected: true }), null);
  assert.deepEqual(shortestPath(es, "a", "a"), ["a"]);
  assert.equal(shortestPath(es, "a", "nowhere"), null);
  assert.deepEqual([...pathEdgeIds(es, ["a", "b", "c", "d"])], ["a-b", "b-c", "d-c"]);
});

test("layeredLayout ranks a pipeline top to bottom, without overlap", () => {
  const ns = nodes("brief", "grid", "layout", "proof", "press");
  const es = [edge("brief", "grid"), edge("brief", "layout"), edge("grid", "proof"), edge("layout", "proof"), edge("proof", "press")];
  const boxes = layeredLayout(ns, es, { size, rankGap: 64, nodeGap: 32 });
  const y = (id: string) => boxes.get(id)!.y;
  assert.equal(y("brief"), 0);
  assert.equal(y("grid"), 56 + 64);
  assert.equal(y("grid"), y("layout"));
  assert.equal(y("proof"), 2 * (56 + 64));
  assert.equal(y("press"), 3 * (56 + 64));
  assert.equal(overlaps(boxes.values()), false);
  // Siblings sit exactly nodeGap apart.
  const [l, r] = [boxes.get("grid")!, boxes.get("layout")!].sort((p, q) => p.x - q.x);
  assert.equal(r!.x - (l!.x + l!.width), 32);
  // The single child of a pair centres under them.
  const proof = boxes.get("proof")!;
  assert.equal(proof.x + proof.width / 2, (l!.x + l!.width / 2 + r!.x + r!.width / 2) / 2);
});

test("layeredLayout survives a cycle and is deterministic", () => {
  const ns = nodes("a", "b", "c");
  const es = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
  const one = layeredLayout(ns, es, { size });
  const two = layeredLayout(ns, es, { size });
  assert.deepEqual([...one], [...two]);
  assert.deepEqual(["a", "b", "c"].map((id) => one.get(id)!.y), [0, 120, 240]);
});

test("layeredLayout 'right' runs the flow along x", () => {
  const boxes = layeredLayout(nodes("a", "b"), [edge("a", "b")], { size, direction: "right", rankGap: 40 });
  assert.deepEqual(boxes.get("a"), { x: 0, y: 0, ...NODE });
  assert.deepEqual(boxes.get("b"), { x: 200, y: 0, ...NODE });
});

test("treeLayout centres each parent over its children", () => {
  const ns = nodes("root", "a", "b", "c", "a1", "a2");
  const es = [edge("root", "a"), edge("root", "b"), edge("root", "c"), edge("a", "a1"), edge("a", "a2")];
  const boxes = treeLayout(ns, es, { size, rankGap: 48, nodeGap: 24 });
  const cx = (id: string) => boxes.get(id)!.x + boxes.get(id)!.width / 2;
  assert.equal(cx("a"), (cx("a1") + cx("a2")) / 2);
  assert.equal(cx("root"), (cx("a") + cx("c")) / 2);
  assert.equal(boxes.get("a1")!.y, 2 * (56 + 48));
  assert.equal(overlaps(boxes.values()), false);
});

test("radialLayout puts the root at the centre and each level on its ring", () => {
  const ns = nodes("r", "a", "b", "c", "a1");
  const es = [edge("r", "a"), edge("r", "b"), edge("r", "c"), edge("a", "a1")];
  const pts = radialLayout(ns, es, { ringGap: 100 });
  assert.deepEqual(pts.get("r"), { x: 0, y: 0 });
  for (const id of ["a", "b", "c"]) assert.ok(Math.abs(Math.hypot(pts.get(id)!.x, pts.get(id)!.y) - 100) < 0.02);
  assert.ok(Math.abs(Math.hypot(pts.get("a1")!.x, pts.get("a1")!.y) - 200) < 0.02);
  // The first child is centred on twelve o'clock.
  assert.deepEqual(pts.get("a"), { x: 0, y: -100 });
});

test("forceLayout is deterministic for a seed, spreads nodes, and keeps pinned ones", () => {
  const ns = nodes(...Array.from({ length: 30 }, (_, i) => `n${i}`));
  const es = ns.slice(1).map((n, i) => edge(`n${Math.floor(i / 3)}`, n.id));
  const a = forceLayout(ns, es, { seed: 3 });
  const b = forceLayout(ns, es, { seed: 3 });
  const c = forceLayout(ns, es, { seed: 4, initial: new Map([["n0", { x: 500, y: 0 }]]) });
  assert.deepEqual([...a], [...b]);
  assert.notDeepEqual([...a], [...c]);
  const pts = [...a.values()];
  let closest = Infinity;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) closest = Math.min(closest, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
  assert.ok(closest > 40, `closest pair ${closest}`);

  // Incremental: append two neighbours to n5 with the rest pinned.
  const grown = [...ns, { id: "x1" }, { id: "x2" }];
  const grownEdges = [...es, edge("n5", "x1"), edge("n5", "x2")];
  const next = forceLayout(grown, grownEdges, { seed: 3, fixed: a });
  for (const [id, p] of a) assert.deepEqual(next.get(id), p, `${id} moved`);
  const n5 = a.get("n5")!;
  for (const id of ["x1", "x2"]) {
    const p = next.get(id)!;
    assert.ok(Math.hypot(p.x - n5.x, p.y - n5.y) < 250, `${id} landed far from its neighbour`);
  }
});

test("fitView centres content and never zooms in past 1", () => {
  const v = fitView({ x: 0, y: 0, width: 200, height: 100 }, { width: 800, height: 400 });
  assert.deepEqual(v, { x: 300, y: 150, k: 1 });
  const big = fitView({ x: 0, y: 0, width: 2000, height: 1000 }, { width: 800, height: 400 }, { padding: 0 });
  assert.equal(big.k, 0.4);
  assert.deepEqual([big.x, big.y], [0, 0]);
});

test("zoomAt keeps the point under the cursor still", () => {
  const v = zoomAt({ x: 10, y: 20, k: 1 }, 2, { x: 110, y: 120 });
  // World point under (110,120) was (100,100); it must still map there.
  assert.equal(100 * v.k + v.x, 110);
  assert.equal(100 * v.k + v.y, 120);
  assert.equal(zoomAt({ x: 0, y: 0, k: 1.8 }, 2, { x: 0, y: 0 }).k, 2);
});

test("ensureVisible pans the least and leaves a visible box alone", () => {
  const frame = { width: 400, height: 300 };
  const view = { x: 0, y: 0, k: 1 };
  assert.equal(ensureVisible(view, { x: 50, y: 50, width: 100, height: 50 }, frame), view);
  const right = ensureVisible(view, { x: 500, y: 50, width: 100, height: 50 }, frame);
  assert.equal(600 + right.x, 400 - 24);
  const left = ensureVisible(view, { x: -100, y: 50, width: 50, height: 50 }, frame);
  assert.equal(-100 + left.x, 24);
});

test("nearestInDirection prefers the node straight ahead", () => {
  const from = { x: 0, y: 0 };
  const cands = [
    ["ahead", { x: 0, y: 200 }],
    ["side", { x: 120, y: 80 }],
    ["behind", { x: 0, y: -50 }],
  ] as const;
  assert.equal(nearestInDirection(from, cands, "down"), "ahead");
  assert.equal(nearestInDirection(from, cands, "up"), "behind");
  assert.equal(nearestInDirection(from, cands, "right"), "side");
  assert.equal(nearestInDirection(from, cands, "left"), null);
});

test("clockAngle runs clockwise from twelve o'clock", () => {
  const c = { x: 0, y: 0 };
  assert.equal(clockAngle(c, { x: 0, y: -1 }), 0);
  assert.equal(clockAngle(c, { x: 1, y: 0 }), Math.PI / 2);
  assert.equal(clockAngle(c, { x: 0, y: 1 }), Math.PI);
  assert.equal(clockAngle(c, { x: -1, y: 0 }), (3 * Math.PI) / 2);
});

test("arrowHeadPath is the sheets' l-8-4v8Z, turned", () => {
  assert.equal(arrowHeadPath({ x: 100, y: 50 }, 0), "M100 50L92 46L92 54Z");
  assert.equal(arrowHeadPath({ x: 100, y: 50 }, Math.PI / 2), "M100 50L104 42L96 42Z");
});

test("boxEdge lands the tip on the target's frame for every route", () => {
  const a = { x: 0, y: 0, ...NODE };
  const b = { x: 0, y: 120, ...NODE };
  const curved = boxEdge(a, b);
  assert.equal(curved.d, "M80 56C80 84 80 84 80 112");
  assert.equal(curved.head, "M80 120L84 112L76 112Z");
  assert.deepEqual(curved.mid, { x: 80, y: 84 });
  const ortho = boxEdge(a, { x: 200, y: 120, ...NODE }, { route: "orthogonal" });
  assert.equal(ortho.d, "M80 56V88H280V112");
  // A back edge (target above) falls back to a straight clip between frames.
  const back = boxEdge(b, a);
  assert.equal(back.d, "M80 120L80 64");
  assert.equal(back.head, "M80 56L76 64L84 64Z");
  // Undirected: no head, and the stroke runs to the frame.
  const plain = boxEdge(a, b, { isDirected: false, route: "straight" });
  assert.equal(plain.d, "M80 56L80 120");
  assert.equal(plain.head, null);
});

test("circleEdge stops both ends 26px from the centres", () => {
  const g = circleEdge({ x: 0, y: 0 }, { x: 200, y: 0 });
  assert.equal(g.d, "M26 0L166 0");
  assert.equal(g.head, "M174 0L166 -4L166 4Z");
  assert.equal(circleEdge({ x: 0, y: 0 }, { x: 40, y: 0 }).d, "");
});

test("boundsOf is null for nothing", () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([{ x: 10, y: 5, width: 10, height: 10 }, { x: -5, y: 0, width: 5, height: 40 }]), { x: -5, y: 0, width: 25, height: 40 });
});

test("every layout answers an empty graph with nothing, not an exception", () => {
  // Diagram's empty state renders with nodes: []; the layered sweep once read ranks[-2].
  assert.equal(layeredLayout([], [], { size }).size, 0);
  assert.equal(treeLayout([], [], { size }).size, 0);
  assert.equal(radialLayout([], []).size, 0);
  assert.equal(forceLayout([], []).size, 0);
});
