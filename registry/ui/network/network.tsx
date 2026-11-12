"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SVGProps,
} from "react";
import { ChartTable, Expand, Minus, Plus } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import {
  adjacency,
  boundsOf,
  circleEdge,
  clockAngle,
  forceLayout,
  hopDistances,
  pathEdgeIds,
  radialLayout,
  type Box,
  type GraphEdge,
  type GraphNode,
  type Incidence,
  type Point,
  type Size,
  type View,
} from "@/lib/graph";
import { useControllableState } from "@/hooks/use-controllable-state";
import { useGraphViewport, type GraphViewport } from "@/hooks/use-graph-viewport";
import { Button } from "@/ui/button";
import { DotPattern } from "@/ui/dot-pattern";
import { Table, type TableColumn } from "@/ui/table";

/** The eight categorical slots. A ninth type is never a generated hue: it folds into Other. */
export type NetworkSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** How one node type is drawn and named (Network sheet, Typed nodes). */
export interface NetworkType {
  /** Read in announcements and in the table: "Otl Aicher, Person". */
  label: string;
  /** Pin it, so a filter that removes a type does not repaint the survivors. */
  slot: NetworkSlot;
  /** A 16px glyph inside the node, so the type never rests on colour alone. */
  glyph?: ReactElement<SVGProps<SVGSVGElement>>;
}

export type NetworkLayout = "force" | "radial";

/** One node as a renderer draws it: its centre, its type and its states. */
export interface NetworkRenderNode {
  id: string;
  label: string;
  x: number;
  y: number;
  /** null for Other: a type with no slot. */
  slot: NetworkSlot | null;
  glyph?: ReactElement<SVGProps<SVGSVGElement>> | undefined;
  isSelected: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  /** Neighbours that exist but are not drawn: the "+N" chip. */
  hidden: number;
}

/** One edge as a renderer draws it, with its geometry already worked out. */
export interface NetworkRenderEdge {
  id: string;
  /** SVG path data; Canvas draws it through Path2D. Empty when the discs overlap. */
  d: string;
  head: string | null;
  mid: Point;
  /** The printed label, "inferred" included. */
  label: string | null;
  isActive: boolean;
  isInferred: boolean;
  isDimmed: boolean;
  isFocused: boolean;
}

export interface NetworkRendererProps {
  nodes: readonly NetworkRenderNode[];
  edges: readonly NetworkRenderEdge[];
  view: View;
  size: Size;
}

/**
 * A different paint surface for the same graph (the Canvas tier). It draws;
 * Network keeps the keyboard, the announcer, hit-testing and the table.
 */
export type NetworkRenderer = ComponentType<NetworkRendererProps>;

export interface NetworkProps<D = unknown> extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect"> {
  /** The title. Names the figure and the keyboard region. */
  label: string;
  /** The takeaway, written by a person. The figure's accessible description. */
  description: string;
  nodes: readonly GraphNode<D>[];
  edges: readonly GraphEdge[];
  /**
   * Each `node.type` to its name, slot and glyph. Default: the types in order
   * of first appearance on slots 1–8, the rest folded into Other.
   */
  types?: Readonly<Record<string, NetworkType>>;
  /** Default "force". */
  layout?: NetworkLayout;
  /** The radial layout's centre, and where focus starts when nothing is selected. */
  rootId?: string;
  /** The force layout's seed: same seed, same picture. */
  seed?: number;
  /** Controlled selection. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (node: GraphNode<D> | null) => void;
  /** A path of node ids drawn as the selected path; everything off it dims. */
  highlight?: readonly string[];
  /** Neighbours that exist but are not drawn yet, per node id: the "+N" chip. */
  hiddenNeighbours?: Readonly<Record<string, number>>;
  /** Plus on a node with hidden neighbours, or a press on its chip. Append them to `nodes`. */
  onExpandRequest?: (node: GraphNode<D>) => void;
  /** Escape on a node with nothing selected: hand focus back to the page. */
  onDismiss?: () => void;
  /** The frame's height in px. Default 480. */
  height?: number;
  isLoading?: boolean;
  emptyText?: string;
  /** Accessible name of the table toggle. */
  tableLabel?: string;
  inferredLabel?: string;
  keyboardHint?: string;
  /** Above this many nodes the force layout runs in a worker. Default 500. */
  workerThreshold?: number;
  /**
   * A renderer for large graphs, admitted only above `canvasThreshold`
   * elements (nodes + edges). Before hydration and in forced colours the
   * table stands in for it: a canvas has neither.
   */
  renderer?: NetworkRenderer;
  /** Default 2000, the measured SVG ceiling (plan §3.2). */
  canvasThreshold?: number;
  /**
   * Keep the title and takeaway for assistive tech only, and drop the table
   * toggle: for a composition that draws its own head (KnowledgeGraphExplorer)
   * and drives the table view through `isTableView`.
   */
  isHeadHidden?: boolean;
  /** Controlled table view. Pair with `onTableViewChange`. */
  isTableView?: boolean;
  defaultIsTableView?: boolean;
  onTableViewChange?: (isTableView: boolean) => void;
  /** Network.Controls. */
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

const NODE_R = 20;
const RING_R = 19.25;
const SELECTED_R = 19;
const FOCUS_R = 23;
const EDGE_GAP = 26;
const LABEL_LANE = 180;
const HIT_R = 24;
/** Long enough for an edge label between two labelled nodes; collide keeps two 180px name lanes apart. */
const FORCE = { linkDistance: 160, collide: 120, charge: 1.5 } as const;

const FILL_WASH = {
  1: "fill-data-cat-1-bg", 2: "fill-data-cat-2-bg", 3: "fill-data-cat-3-bg", 4: "fill-data-cat-4-bg",
  5: "fill-data-cat-5-bg", 6: "fill-data-cat-6-bg", 7: "fill-data-cat-7-bg", 8: "fill-data-cat-8-bg",
} as const satisfies Record<NetworkSlot, string>;
const STROKE_RING = {
  1: "stroke-data-cat-1-solid", 2: "stroke-data-cat-2-solid", 3: "stroke-data-cat-3-solid", 4: "stroke-data-cat-4-solid",
  5: "stroke-data-cat-5-solid", 6: "stroke-data-cat-6-solid", 7: "stroke-data-cat-7-solid", 8: "stroke-data-cat-8-solid",
} as const satisfies Record<NetworkSlot, string>;

type Focus = { kind: "node"; id: string } | { kind: "edge"; node: string; index: number };

interface NetworkContextValue {
  viewport: Omit<GraphViewport, "frameRef">;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

/* -------------------------------------------------------------- environment */

const noop = () => () => {};
/** False on the server and during hydration, true after: the Canvas tier's floor. */
function useIsHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function subscribeForced(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(forced-colors: active)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useForcedColors() {
  return useSyncExternalStore(
    subscribeForced,
    () => typeof window !== "undefined" && !!window.matchMedia?.("(forced-colors: active)").matches,
    () => false,
  );
}

/* ------------------------------------------------------------------ layout */

interface LayoutInput {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  layout: NetworkLayout;
  rootId: string | undefined;
  seed: number;
  workerThreshold: number;
}

function toPoints(nodes: readonly GraphNode[]) {
  const given = new Map<string, Point>();
  for (const n of nodes) if (n.position) given.set(n.id, n.position);
  return given;
}

/**
 * Positions for every node. Incremental: once a picture exists, the nodes
 * already in it are pinned and only new ones move, so expanding a node grows
 * the drawing instead of reshuffling it. Above the threshold the force layout
 * runs in a worker and the positions arrive a frame or more later (null till then).
 */
function useNetworkLayout({ nodes, edges, layout, rootId, seed, workerThreshold }: LayoutInput): Map<string, Point> | null {
  const previous = useRef<{ key: string; positions: Map<string, Point> } | null>(null);
  const resetKey = `${layout}|${rootId ?? ""}|${seed}`;
  const graphKey = `${nodes.map((n) => n.id).join("\u0000")}|${edges.map((e) => `${e.source}>${e.target}`).join("\u0000")}`;
  const useWorker = layout === "force" && nodes.length > workerThreshold && typeof Worker !== "undefined";

  const pinned = () => {
    const fixed = toPoints(nodes);
    const prev = previous.current?.key === resetKey ? previous.current.positions : null;
    if (prev) for (const n of nodes) if (!fixed.has(n.id) && prev.has(n.id)) fixed.set(n.id, prev.get(n.id)!);
    return fixed;
  };

  const sync = useMemo(() => {
    if (useWorker) return null;
    if (layout === "radial") {
      const out = radialLayout(nodes, edges, { ringGap: 160, ...(rootId ? { rootId } : {}) });
      for (const [id, p] of toPoints(nodes)) out.set(id, p);
      return out;
    }
    // The previous picture is a cache of the last COMMITTED layout: written in
    // an effect, read only when the graph or the reset key changes. As state it
    // would be a dependency of this memo and every layout would trigger
    // another; a discarded render never writes it, so the read is stable.
    // eslint-disable-next-line react-hooks/refs
    const fixed = pinned();
    return forceLayout(nodes, edges, { ...FORCE, seed, fixed });
    // graphKey and resetKey stand for nodes, edges, layout, rootId and seed; pinned reads the previous picture, which only changes with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey, resetKey, useWorker]);

  const [fromWorker, setFromWorker] = useState<{ key: string; positions: Map<string, Point> } | null>(null);
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    if (!useWorker) return;
    const w = (worker.current ??= new Worker(new URL("./network-layout.worker.ts", import.meta.url), { type: "module" }));
    const id = ++requestId.current;
    const key = `${resetKey}#${graphKey}`;
    w.onmessage = (e: MessageEvent<{ id: number; positions: [string, Point][] }>) => {
      if (e.data.id !== requestId.current) return;
      setFromWorker({ key, positions: new Map(e.data.positions) });
    };
    w.postMessage({
      id,
      nodes: nodes.map((n) => ({ id: n.id })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      options: { ...FORCE, seed, fixed: [...pinned()] },
    });
    // The same keys as the synchronous layout above, for the same reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey, resetKey, useWorker]);
  useEffect(() => () => worker.current?.terminate(), []);

  const positions = useWorker ? (fromWorker?.key === `${resetKey}#${graphKey}` ? fromWorker.positions : null) : sync;
  useEffect(() => {
    if (positions) previous.current = { key: resetKey, positions };
  }, [positions, resetKey]);
  return positions;
}

/* -------------------------------------------------------------------- root */

function NetworkRoot<D = unknown>({
  label,
  description,
  nodes,
  edges,
  types: typesProp,
  layout = "force",
  rootId,
  seed = 1,
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  highlight,
  hiddenNeighbours,
  onExpandRequest,
  onDismiss,
  height = 480,
  isLoading = false,
  emptyText = "Nothing to show yet.",
  tableLabel = "View as table",
  inferredLabel = "inferred",
  keyboardHint = "Up and down move round the focused ring. Right and left step onto a relation and across it. Enter selects. Plus expands a node with more neighbours; equals, minus and 0 zoom; Shift and an arrow pans. Escape steps back.",
  workerThreshold = 500,
  renderer: Renderer,
  canvasThreshold = 2000,
  isHeadHidden = false,
  isTableView,
  defaultIsTableView = false,
  onTableViewChange,
  className,
  children,
  ref,
  ...rest
}: NetworkProps<D>) {
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const [isTable, setIsTable] = useControllableState<boolean>({
    value: isTableView,
    defaultValue: defaultIsTableView,
    onChange: onTableViewChange,
  });
  const isHydrated = useIsHydrated();
  const isForced = useForcedColors();
  const [selected, setSelected] = useControllableState<string | null>({
    value: selectedProp,
    defaultValue: defaultSelected,
    onChange: (id) => onSelect?.(id === null ? null : (nodes.find((n) => n.id === id) ?? null)),
  });

  /* -- types: given, or first-appearance order, the ninth folding into Other */
  const types = useMemo(() => {
    if (typesProp) return typesProp;
    const out: Record<string, NetworkType> = {};
    let slot = 1;
    for (const n of nodes) {
      if (!n.type || out[n.type] || slot > 8) continue;
      out[n.type] = { label: n.type, slot: slot++ as NetworkSlot };
    }
    return out;
  }, [typesProp, nodes]);
  const typeOf = (n: GraphNode<D> | undefined) => (n?.type ? types[n.type] : undefined);
  const typeLabel = (n: GraphNode<D> | undefined) => typeOf(n)?.label ?? n?.type ?? "Other";

  /* -- layout and geometry ------------------------------------------- */
  const positions = useNetworkLayout({ nodes, edges, layout, rootId, seed, workerThreshold });
  const isLaidOut = positions !== null;
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const drawnEdges = useMemo(() => edges.filter((e) => byId.has(e.source) && byId.has(e.target) && e.source !== e.target), [edges, byId]);
  const pos = (id: string): Point => positions?.get(id) ?? { x: 0, y: 0 };

  const content = useMemo<Box | null>(() => {
    if (!positions || !nodes.length) return null;
    return boundsOf(nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: 0, y: 0 };
      return { x: p.x - LABEL_LANE / 2, y: p.y - FOCUS_R, width: LABEL_LANE, height: FOCUS_R + EDGE_GAP + 20 };
    }));
  }, [positions, nodes]);
  // The frame's callback ref by name: an object whose member goes to `ref` is a
  // ref to React's ref rule, which would then flag every read of the viewport.
  const { frameRef, ...viewport } = useGraphViewport({ content, initialSize: { width: 800, height }, limits: { min: 0.1, max: 2 } });

  /* -- relations, ordered clockwise from twelve o'clock --------------- */
  const adj = useMemo(() => adjacency(drawnEdges), [drawnEdges]);
  const relsOf = (id: string): Incidence[] => {
    const at = pos(id);
    return [...(adj.get(id) ?? [])].sort((a, b) => clockAngle(at, pos(a.other)) - clockAngle(at, pos(b.other)));
  };

  /* -- states: selection, neighbourhood, path ------------------------- */
  const pathIds = useMemo(() => (highlight?.length ? pathEdgeIds(drawnEdges, highlight) : null), [highlight, drawnEdges]);
  const onPath = useMemo(() => (highlight?.length ? new Set(highlight) : null), [highlight]);
  const selectedNode = selected && byId.has(selected) ? selected : null;
  const neighbourhood = useMemo(() => {
    if (!selectedNode) return null;
    return new Set([selectedNode, ...(adj.get(selectedNode) ?? []).map((r) => r.other)]);
  }, [selectedNode, adj]);
  const isNodeDimmed = (id: string) => (onPath ? !onPath.has(id) : neighbourhood ? !neighbourhood.has(id) : false);
  const isEdgeActive = (e: GraphEdge) => (pathIds ? pathIds.has(e.id) : selectedNode !== null && (e.source === selectedNode || e.target === selectedNode));
  const isEdgeDimmed = (e: GraphEdge) => (pathIds ? !pathIds.has(e.id) : selectedNode !== null && !isEdgeActive(e));
  const hiddenOf = (id: string) => hiddenNeighbours?.[id] ?? 0;

  /* -- rings: hops from the anchor, each ordered clockwise ------------- */
  const anchor = selectedNode ?? (rootId && byId.has(rootId) ? rootId : (nodes[0]?.id ?? null));
  const rings = useMemo(() => {
    const out = new Map<string, number>();
    if (!anchor) return out;
    const dist = hopDistances(drawnEdges, anchor);
    const far = Math.max(0, ...dist.values()) + 1;
    for (const n of nodes) out.set(n.id, dist.get(n.id) ?? far);
    return out;
  }, [anchor, drawnEdges, nodes]);
  const ringMembers = (id: string) => {
    const r = rings.get(id);
    const a = pos(anchor ?? id);
    return nodes
      .filter((n) => rings.get(n.id) === r)
      .map((n) => n.id)
      .sort((x, y) => clockAngle(a, pos(x)) - clockAngle(a, pos(y)));
  };

  /* -- keyboard ------------------------------------------------------ */
  const [focus, setFocus] = useState<Focus | null>(null);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const viewportEl = useRef<HTMLDivElement>(null);
  const nameOf = (id: string) => byId.get(id)?.label ?? id;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const hiddenText = (id: string) => {
    const h = hiddenOf(id);
    return h && onExpandRequest ? ` ${h} more not shown: press Plus to expand.` : "";
  };
  const describeNode = (id: string) => {
    const n = byId.get(id);
    if (!n) return "";
    const parts = [`${n.label}, ${typeLabel(n)}.`];
    if (n.description) parts.push(`${n.description}.`);
    if (id === selectedNode) parts.push("Selected.");
    const hop = rings.get(id) ?? 0;
    if (anchor && id !== anchor && Number.isFinite(hop)) parts.push(`${plural(hop, "hop", "hops")} from ${nameOf(anchor)}.`);
    parts.push(`${plural(adj.get(id)?.length ?? 0, "neighbour", "neighbours")}.`);
    return parts.join(" ") + hiddenText(id);
  };
  const relationSentence = (near: string, r: Incidence) => {
    const verb = r.edge.label ?? "links to";
    const tail = r.edge.isInferred ? ` (${inferredLabel})` : "";
    return r.direction === "out" ? `${nameOf(near)} ${verb} it${tail}.` : `It ${verb} ${nameOf(near)}${tail}.`;
  };
  const describeEdge = (near: string, index: number) => {
    const rels = relsOf(near);
    const r = rels[index];
    if (!r) return "";
    const far = byId.get(r.other);
    return `${nameOf(r.other)}, ${typeLabel(far)}. ${relationSentence(near, r)} ${index + 1} of ${plural(rels.length, "neighbour", "neighbours")}.${hiddenText(r.other)}`;
  };

  const revealPoints = (...ids: string[]) => {
    const b = boundsOf(ids.map((id) => {
      const p = pos(id);
      return { x: p.x - FOCUS_R - 4, y: p.y - FOCUS_R - 4, width: (FOCUS_R + 4) * 2, height: (FOCUS_R + 4) * 2 + EDGE_GAP };
    }));
    if (b) viewport.reveal(b);
  };
  const goTo = (next: Focus) => {
    setFocus(next);
    if (next.kind === "node") {
      revealPoints(next.id);
      setAnnouncement(describeNode(next.id));
    } else {
      const r = relsOf(next.node)[next.index];
      if (r) revealPoints(next.node, r.other);
      setAnnouncement(describeEdge(next.node, next.index));
    }
  };

  const expand = (id: string) => {
    const n = byId.get(id);
    if (!n || !onExpandRequest || !hiddenOf(id)) return false;
    onExpandRequest(n);
    setAnnouncement(`Expanding ${n.label}: ${plural(hiddenOf(id), "more neighbour", "more neighbours")}.`);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    setIsFocusVisible(true);
    // Plus expands when there is something to expand; otherwise it zooms like "=".
    if (e.key === "+" && focus) {
      const target = focus.kind === "node" ? focus.id : relsOf(focus.node)[focus.index]?.other;
      if (target && expand(target)) {
        e.preventDefault();
        return;
      }
    }
    if (viewport.onKeyDown(e)) return;
    if (!focus || e.altKey || e.metaKey || e.ctrlKey) return;
    const at = focus.kind === "node" ? focus.id : focus.node;
    const rels = relsOf(at);
    switch (e.key) {
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        if (focus.kind === "edge") {
          if (rels.length) goTo({ kind: "edge", node: at, index: (focus.index + step + rels.length) % rels.length });
          return;
        }
        const ring = ringMembers(at);
        if (ring.length > 1) goTo({ kind: "node", id: ring[(ring.indexOf(at) + step + ring.length) % ring.length]! });
        return;
      }
      case "ArrowRight":
      case "ArrowLeft": {
        e.preventDefault();
        const isRight = e.key === "ArrowRight";
        if (focus.kind === "node") {
          if (rels.length) goTo({ kind: "edge", node: at, index: isRight ? 0 : rels.length - 1 });
        } else {
          // Right crosses to the far node; Left steps back to the near one.
          goTo({ kind: "node", id: isRight ? rels[focus.index]!.other : at });
        }
        return;
      }
      case "Home":
      case "End": {
        e.preventDefault();
        if (focus.kind === "edge") {
          if (rels.length) goTo({ kind: "edge", node: at, index: e.key === "Home" ? 0 : rels.length - 1 });
          return;
        }
        const ring = ringMembers(at);
        const id = e.key === "Home" ? ring[0] : ring[ring.length - 1];
        if (id) goTo({ kind: "node", id });
        return;
      }
      case "Tab": {
        // Tab walks the relations and then lets go: never a trap.
        if (e.shiftKey) {
          if (focus.kind === "edge") {
            e.preventDefault();
            if (focus.index === 0) goTo({ kind: "node", id: at });
            else goTo({ kind: "edge", node: at, index: focus.index - 1 });
          }
          return;
        }
        const nextIndex = focus.kind === "node" ? 0 : focus.index + 1;
        if (nextIndex < rels.length) {
          e.preventDefault();
          goTo({ kind: "edge", node: at, index: nextIndex });
        }
        return;
      }
      case "Enter": {
        e.preventDefault();
        if (focus.kind === "edge") {
          goTo({ kind: "node", id: rels[focus.index]!.other });
          return;
        }
        const next = selected === focus.id ? null : focus.id;
        setSelected(next);
        setAnnouncement(next ? `${nameOf(focus.id)}, selected.` : `${nameOf(focus.id)}, not selected.`);
        return;
      }
      case "Escape":
        if (focus.kind === "edge") {
          e.preventDefault();
          goTo({ kind: "node", id: at });
        } else if (selected !== null) {
          e.preventDefault();
          setSelected(null);
          setAnnouncement("Selection cleared.");
        } else if (onDismiss) {
          e.preventDefault();
          onDismiss();
        }
        return;
    }
  };

  // A focused node that left the graph (a filter removed it) hands focus on.
  // Adjusted during render, as React documents for state derived from props:
  // an effect would paint one frame with focus on a node that is not drawn.
  const focusNode = focus ? (focus.kind === "node" ? focus.id : focus.node) : null;
  if (focusNode && !byId.has(focusNode)) setFocus(null);

  /* -- what a renderer draws ------------------------------------------ */
  const focusedEdgeId = focus?.kind === "edge" ? (relsOf(focus.node)[focus.index]?.edge.id ?? null) : null;
  const renderNodes: NetworkRenderNode[] = isLaidOut
    ? nodes.map((n) => {
        const p = pos(n.id);
        const t = typeOf(n);
        return {
          id: n.id,
          label: n.label,
          x: p.x,
          y: p.y,
          slot: t?.slot ?? null,
          glyph: t?.glyph,
          isSelected: n.id === selectedNode,
          isFocused: isFocusVisible && focus?.kind === "node" && focus.id === n.id,
          isDimmed: isNodeDimmed(n.id),
          hidden: hiddenOf(n.id),
        };
      })
    : [];
  const renderEdges: NetworkRenderEdge[] = isLaidOut
    ? drawnEdges.map((e) => {
        const isInferred = !!e.isInferred;
        const geo = circleEdge(pos(e.source), pos(e.target), { gap: EDGE_GAP, isDirected: !isInferred && (e.isDirected ?? true) });
        return {
          id: e.id,
          d: geo.d,
          head: geo.head,
          mid: geo.mid,
          label: isInferred ? (e.label ? `${e.label} · ${inferredLabel}` : inferredLabel) : (e.label ?? null),
          isActive: isEdgeActive(e),
          isInferred,
          isDimmed: isEdgeDimmed(e),
          isFocused: isFocusVisible && focusedEdgeId === e.id,
        };
      })
    : [];

  /* -- admission: the Canvas tier only for big graphs, with the table as its floor */
  const isAdmitted = !!Renderer && nodes.length + drawnEdges.length > canvasThreshold;
  const isFloor = isAdmitted && (!isHydrated || isForced);

  /* -- pointer: one hit test for every renderer ------------------------ */
  const onFrameClick = (e: MouseEvent<HTMLDivElement>) => {
    if (viewport.wasDrag() || !isLaidOut) return;
    if ((e.target as Element).closest("button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { x: vx, y: vy, k } = viewport.view;
    const wx = (e.clientX - rect.left - vx) / k;
    const wy = (e.clientY - rect.top - vy) / k;
    let best: string | null = null;
    let bestD = HIT_R;
    for (const n of nodes) {
      const p = pos(n.id);
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d <= bestD) {
        bestD = d;
        best = n.id;
      }
    }
    if (!best) return;
    setFocus({ kind: "node", id: best });
    viewportEl.current?.focus({ preventScroll: true });
    setSelected(selected === best ? null : best);
  };

  const isEmpty = !isLoading && nodes.length === 0;
  const isBusy = isLoading || (!isLaidOut && !isEmpty);
  const table = (
    <NetworkTable
      caption={label}
      nodes={nodes}
      edges={drawnEdges}
      typeLabel={(id) => typeLabel(byId.get(id))}
      inferredLabel={inferredLabel}
    />
  );

  return (
    <figure
      ref={ref}
      data-slot="network"
      data-layout={layout}
      data-renderer={isAdmitted && !isFloor ? "custom" : "svg"}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isBusy || undefined}
      className={cn("flex flex-col gap-lg rounded-md border border-edge-subtle bg-surface p-xl", className)}
      {...rest}
    >
      <div data-slot="network-head" className={cn("flex items-start gap-lg", isHeadHidden && "sr-only")}>
        <div className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} data-slot="network-title" className="font-body text-label-md text-ink-primary">
            {label}
          </span>
          <p id={descriptionId} data-slot="network-description" className="font-body text-body-sm text-ink-muted">
            {description}
          </p>
        </div>
        {!isFloor && !isHeadHidden && (
          <Button
            data-slot="network-table-toggle"
            variant="secondary"
            size="md"
            isIconOnly
            aria-label={tableLabel}
            aria-pressed={isTable}
            isDisabled={isBusy}
            icon={<ChartTable aria-hidden />}
            onClick={() => setIsTable(!isTable)}
          />
        )}
      </div>

      {isTable || isFloor ? (
        table
      ) : (
        <NetworkContext.Provider value={{ viewport }}>
          <div
            ref={frameRef}
            data-slot="network-frame"
            {...viewport.bind}
            onClick={onFrameClick}
            style={{ height }}
            className={cn(
              "relative touch-none overflow-hidden rounded-md border border-edge-subtle bg-base select-none",
              viewport.isPanning ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <DotPattern />
            <span id={hintId} className="sr-only">{keyboardHint}</span>
            <div
              ref={viewportEl}
              data-slot="network-viewport"
              role="group"
              aria-roledescription="network"
              aria-labelledby={titleId}
              aria-describedby={hintId}
              tabIndex={isBusy || isEmpty ? -1 : 0}
              onKeyDown={onKeyDown}
              onFocus={(e) => {
                if (e.target !== e.currentTarget) return;
                setIsFocusVisible(e.currentTarget.matches(":focus-visible"));
                const start = focus?.kind === "node" && byId.has(focus.id) ? focus.id : anchor;
                if (start) goTo({ kind: "node", id: start });
              }}
              onBlur={() => setIsFocusVisible(false)}
              className="absolute inset-0 outline-none"
            >
              {isBusy ? (
                <div data-slot="network-skeleton" className="absolute inset-0 flex items-center justify-center gap-2xl">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="size-10 rounded-full bg-sunken" />
                  ))}
                </div>
              ) : isEmpty ? (
                <p data-slot="network-empty" className="absolute inset-0 flex items-center justify-center font-body text-body-sm text-ink-muted">
                  {emptyText}
                </p>
              ) : isAdmitted && Renderer ? (
                <Renderer nodes={renderNodes} edges={renderEdges} view={viewport.view} size={viewport.size} />
              ) : (
                <NetworkSvg
                  nodes={renderNodes}
                  edges={renderEdges}
                  worldStyle={viewport.worldStyle}
                  isPanning={viewport.isPanning}
                  onExpand={onExpandRequest ? expand : undefined}
                />
              )}
            </div>
            {!isBusy && !isEmpty && children}
          </div>
        </NetworkContext.Provider>
      )}

      <div data-slot="network-announcer" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </figure>
  );
}

/* ---------------------------------------------------------------- svg tier */

function NetworkSvg({
  nodes,
  edges,
  worldStyle,
  isPanning,
  onExpand,
}: {
  nodes: readonly NetworkRenderNode[];
  edges: readonly NetworkRenderEdge[];
  worldStyle: GraphViewport["worldStyle"];
  isPanning: boolean;
  onExpand: ((id: string) => boolean) | undefined;
}) {
  return (
    <div
      data-slot="network-world"
      style={worldStyle}
      className={cn("absolute top-0 left-0", !isPanning && "transition-transform duration-(--ui-duration-base) ease-(--ui-ease-out)")}
    >
      <svg data-slot="network-drawing" aria-hidden="true" width={1} height={1} className="absolute top-0 left-0 overflow-visible">
        {edges.map((e) => (
          <g
            key={e.id}
            data-slot="network-edge"
            data-state={e.isActive ? "active" : e.isInferred ? "inferred" : undefined}
            className={cn(e.isDimmed && "opacity-32")}
          >
            {e.isFocused && e.d && (
              <path d={e.d} fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-edge-focus forced-colors:stroke-[Highlight]" />
            )}
            {e.d && (
              <path
                d={e.d}
                fill="none"
                style={{ strokeWidth: e.isInferred && !e.isActive ? "var(--ui-stroke-hairline)" : "var(--ui-stroke-thick)" }}
                className={cn(
                  e.isActive ? "stroke-ink-primary forced-colors:stroke-[Highlight]" : e.isInferred ? "stroke-ink-muted" : "stroke-edge-control",
                  !e.isActive && "forced-colors:stroke-[CanvasText]",
                )}
              />
            )}
            {e.head && (
              <path
                d={e.head}
                className={cn(
                  e.isActive ? "fill-ink-primary forced-colors:fill-[Highlight]" : "fill-edge-control forced-colors:fill-[CanvasText]",
                )}
              />
            )}
          </g>
        ))}
        {nodes.map((n) => (
          <g
            key={n.id}
            data-slot="network-node"
            data-id={n.id}
            data-state={n.isSelected ? "selected" : undefined}
            className={cn("cursor-pointer", n.isDimmed && "opacity-32")}
          >
            <circle cx={n.x} cy={n.y} r={NODE_R} className="fill-base forced-colors:fill-[Canvas]" />
            {!n.isSelected && n.slot && <circle cx={n.x} cy={n.y} r={NODE_R} className={FILL_WASH[n.slot]} />}
            {n.isSelected ? (
              <circle cx={n.x} cy={n.y} r={SELECTED_R} fill="none" style={{ strokeWidth: "var(--ui-stroke-thick)" }} className="stroke-ink-primary forced-colors:stroke-[Highlight]" />
            ) : (
              <circle
                cx={n.x}
                cy={n.y}
                r={RING_R}
                fill="none"
                style={{ strokeWidth: "var(--ui-stroke-hairline)" }}
                className={cn(n.slot ? STROKE_RING[n.slot] : "stroke-edge-control", "forced-colors:stroke-[CanvasText]")}
              />
            )}
            {isValidElement(n.glyph) &&
              cloneElement(n.glyph, {
                x: n.x - 8,
                y: n.y - 8,
                width: 16,
                height: 16,
                "aria-hidden": true,
                className: "text-ink-primary forced-colors:text-[CanvasText]",
              })}
            {n.isFocused && (
              <circle
                data-slot="network-focus-ring"
                cx={n.x}
                cy={n.y}
                r={FOCUS_R}
                fill="none"
                style={{ strokeWidth: "var(--ui-stroke-thick)" }}
                className="stroke-edge-focus forced-colors:stroke-[Highlight]"
              />
            )}
          </g>
        ))}
      </svg>

      {edges.map((e) =>
        e.label && e.d ? (
          <span
            key={e.id}
            aria-hidden="true"
            data-slot="network-edge-label"
            style={{ left: e.mid.x, top: e.mid.y }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-sm bg-base px-xs font-body text-label-sm whitespace-nowrap",
              e.isActive ? "text-ink-primary" : "font-regular text-ink-muted",
              e.isDimmed && "opacity-32",
            )}
          >
            {e.label}
          </span>
        ) : null,
      )}

      {nodes.map((n) => (
        <span
          key={n.id}
          aria-hidden="true"
          data-slot="network-label"
          style={{ left: n.x, top: n.y + EDGE_GAP, maxWidth: LABEL_LANE }}
          className={cn(
            "pointer-events-none absolute -translate-x-1/2 truncate rounded-sm bg-base px-xs font-body text-label-sm",
            n.isDimmed ? "text-ink-muted" : "text-ink-primary",
          )}
        >
          {n.label}
        </span>
      ))}

      {onExpand &&
        nodes.map((n) =>
          n.hidden > 0 ? (
            <button
              key={n.id}
              type="button"
              tabIndex={-1}
              data-slot="network-expand"
              aria-label={`Expand ${n.label}, ${n.hidden} more`}
              onClick={(ev) => {
                ev.stopPropagation();
                onExpand(n.id);
              }}
              style={{ left: n.x + EDGE_GAP + 4, top: n.y - 12 }}
              className={cn(
                chromeControl(),
                "absolute size-auto h-6 min-w-8 gap-[2px] rounded-full border border-edge-control bg-elevated px-sm font-body text-label-sm text-ink-primary",
                n.isDimmed && "opacity-32",
              )}
            >
              <Plus aria-hidden />
              {n.hidden}
            </button>
          ) : null,
        )}
    </div>
  );
}

/* ------------------------------------------------------------------- table */

interface NetworkTableRow {
  id: string;
  node: string;
  relation: string;
  neighbour: string;
  type: string;
}

function NetworkTable<D>({
  caption,
  nodes,
  edges,
  typeLabel,
  inferredLabel,
}: {
  caption: string;
  nodes: readonly GraphNode<D>[];
  edges: readonly GraphEdge[];
  typeLabel: (id: string) => string;
  inferredLabel: string;
}) {
  const rows = useMemo(() => {
    const name = new Map(nodes.map((n) => [n.id, n.label]));
    const out: NetworkTableRow[] = edges.map((e) => ({
      id: e.id,
      node: name.get(e.source) ?? e.source,
      relation: `${e.label ?? "links to"}${e.isInferred ? ` (${inferredLabel})` : ""}`,
      neighbour: name.get(e.target) ?? e.target,
      type: typeLabel(e.target),
    }));
    const linked = new Set(edges.flatMap((e) => [e.source, e.target]));
    for (const n of nodes) if (!linked.has(n.id)) out.push({ id: `node:${n.id}`, node: n.label, relation: "—", neighbour: "—", type: typeLabel(n.id) });
    return out;
  }, [nodes, edges, typeLabel, inferredLabel]);
  const columns: TableColumn<NetworkTableRow>[] = [
    { key: "node", header: "Node", isPrimary: true, cell: (r) => r.node },
    { key: "relation", header: "Relation", cell: (r) => r.relation },
    { key: "neighbour", header: "Neighbour", cell: (r) => r.neighbour },
    { key: "type", header: "Type", cell: (r) => r.type },
  ];
  return (
    <div data-slot="network-table">
      <Table caption={caption} columns={columns} rows={rows} getRowId={(r) => r.id} size="sm" />
    </div>
  );
}

/* --------------------------------------------------------------- overlays */

export interface NetworkControlsProps extends HTMLAttributes<HTMLDivElement> {
  zoomInLabel?: string;
  zoomOutLabel?: string;
  fitLabel?: string;
}

/** Zoom in, zoom out and fit, bottom right. Each is also a key: =, - and 0. */
function Controls({ zoomInLabel = "Zoom in", zoomOutLabel = "Zoom out", fitLabel = "Fit", className, ...rest }: NetworkControlsProps) {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("Network.Controls must be rendered inside <Network>.");
  const { viewport } = ctx;
  return (
    <div data-slot="network-controls" className={cn("absolute right-lg bottom-lg flex gap-xs", className)} {...rest}>
      <button type="button" aria-label={zoomInLabel} className={chromeControl()} onClick={() => viewport.zoomBy(1.25)}>
        <Plus aria-hidden />
      </button>
      <button type="button" aria-label={zoomOutLabel} className={chromeControl()} onClick={() => viewport.zoomBy(0.8)}>
        <Minus aria-hidden />
      </button>
      <button type="button" aria-label={fitLabel} className={chromeControl()} onClick={() => viewport.fit()}>
        <Expand aria-hidden />
      </button>
    </div>
  );
}

/**
 * A network of typed entities that people explore — a knowledge graph, a
 * social or citation network — where nodes are glyphs, not cards.
 *
 * SVG by default (≤ ~2k elements), with a seeded force or radial layout that
 * runs in a worker above `workerThreshold` and grows incrementally: nodes
 * already drawn are pinned, so appending neighbours never reshuffles them.
 * The keyboard model is the Network sheet's: rings of hops from the selected
 * node, Up and Down round a ring, Right and Left onto a relation and across
 * it, Plus to expand. An adjacency table is one toggle away and is the floor
 * for a custom renderer (the Canvas tier) before hydration and in forced colours.
 */
export const Network = Object.assign(NetworkRoot, { Controls });

export type { GraphEdge, GraphNode } from "@/lib/graph";
