"use client";

import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronDownSmall, ChevronRightSmall, Expand, ListBulleted, Minus, Plus } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import {
  adjacency,
  boundsOf,
  boxEdge,
  centre,
  inflate,
  layeredLayout,
  nearestInDirection,
  pathEdgeIds,
  radialLayout,
  round,
  treeLayout,
  type Box,
  type EdgeRoute,
  type GraphEdge,
  type GraphNode,
  type LayoutDirection,
  type Size,
} from "@/lib/graph";
import { useControllableState } from "@/hooks/use-controllable-state";
import { useGraphViewport, type GraphViewport } from "@/hooks/use-graph-viewport";
import { Button } from "@/ui/button";
import { DotPattern } from "@/ui/dot-pattern";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type DiagramLayout = "layered" | "tree" | "radial" | "none";

/** What a node's render slot is told about it. */
export interface DiagramNodeState {
  isSelected: boolean;
  isFocused: boolean;
  isDimmed: boolean;
}

export interface DiagramGroupProps {
  /** The id member nodes name in their `parentId`. */
  id: string;
  /** Printed on the group, and read when focus enters it. */
  label: string;
  /** Uncontrolled starting state. */
  defaultIsCollapsed?: boolean;
  /** Controlled. Pair with `onCollapsedChange`. */
  isCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  /** The collapsed node's second line. Default: "2 nodes, 1 edge inside". */
  summary?: (counts: { nodes: number; edges: number }) => string;
  /** Accessible name of the expand and collapse control. Default: "Expand {label}" / "Collapse {label}". */
  expandLabel?: string;
  collapseLabel?: string;
}

/**
 * A compound node: nodes whose `parentId` is this id are drawn inside it, and
 * it collapses to a single node that carries their edges (Diagram sheet,
 * Group). Configuration only — it renders nothing where it is written.
 */
function Group(props: DiagramGroupProps): null {
  void props; // read by Diagram from its children, never rendered
  return null;
}

export interface DiagramProps<D = unknown> extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect"> {
  /** The title. Names the figure and the keyboard region. */
  label: string;
  /** The takeaway, written by a person. The figure's accessible description. */
  description: string;
  nodes: readonly GraphNode<D>[];
  edges: readonly GraphEdge[];
  /** Default "layered". "none" takes every node's `position` as given. */
  layout?: DiagramLayout;
  /** The flow, for layered and tree layouts. Default "down". */
  direction?: LayoutDirection;
  /** Default "curved". */
  route?: EdgeRoute;
  /**
   * Each node's size for the layout, before it is measured: the SERVER lays
   * out against this, and the client re-lays out once the nodes are measured.
   * Default 160×56, the sheet's one-line node; a two-line node measures 72.
   */
  nodeSize?: Size | ((node: GraphNode<D>) => Size);
  /** Controlled selection. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (node: GraphNode<D> | null) => void;
  /** A path of node ids drawn as the selected path; everything off it dims. */
  highlight?: readonly string[];
  /** The node's content. Default: the label over the description, one line each. */
  renderNode?: (node: GraphNode<D>, state: DiagramNodeState) => ReactNode;
  /** The frame's height in px. Default 480. */
  height?: number;
  isLoading?: boolean;
  /** Shown when there are no nodes. */
  emptyText?: string;
  /** Accessible name of the list toggle. */
  listLabel?: string;
  /** The word appended to an inferred edge's label and announcement. */
  inferredLabel?: string;
  /** Read once by screen readers as the region's description. */
  keyboardHint?: string;
  /** Diagram.Group configuration, and the overlays: Controls, Minimap, Legend. */
  children?: ReactNode;
  /** The figure. React 19's ref-as-prop, so the generic survives (Chart does the same). */
  ref?: Ref<HTMLElement>;
}

const DEFAULT_SIZE: Size = { width: 160, height: 56 };
const COLLAPSED_SIZE: Size = { width: 208, height: 56 };
/** Group padding (12) and its title row (16px type + 8 gap). */
const GROUP_PAD = 12;
const GROUP_TITLE = 24;
/** 64 between ranks, plus an open group's title row and padding. */
const RANK_GAP_GROUPED = 64 + GROUP_TITLE + GROUP_PAD + 16;

interface VisibleNode<D> {
  id: string;
  label: string;
  description?: string | undefined;
  /** Set when this is a collapsed group standing in for its members. */
  group?: { config: DiagramGroupProps; nodes: number; edges: number };
  node?: GraphNode<D>;
  parentId?: string | undefined;
  position?: { x: number; y: number } | undefined;
}

interface VisibleEdge {
  id: string;
  source: string;
  target: string;
  edge: GraphEdge;
}

type Focus = { kind: "node"; id: string } | { kind: "edge"; node: string; index: number };

interface DiagramContextValue {
  viewport: Omit<GraphViewport, "frameRef">;
  content: Box | null;
  boxes: Map<string, Box>;
  hasInferred: boolean;
  hasGroups: boolean;
  hasActive: boolean;
}

const DiagramContext = createContext<DiagramContextValue | null>(null);

function useDiagram(part: string): DiagramContextValue {
  const ctx = useContext(DiagramContext);
  if (!ctx) throw new Error(`Diagram.${part} must be rendered inside <Diagram>.`);
  return ctx;
}

/** Children with fragments opened, so a Group inside <>…</> is still found. */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((c) =>
    isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? flatten(c.props.children) : [c],
  );
}

const defaultSummary = ({ nodes, edges }: { nodes: number; edges: number }) =>
  `${nodes} ${nodes === 1 ? "node" : "nodes"}, ${edges} ${edges === 1 ? "edge" : "edges"} inside`;

function DiagramRoot<D = unknown>({
  label,
  description,
  nodes,
  edges,
  layout = "layered",
  direction = "down",
  route = "curved",
  nodeSize = DEFAULT_SIZE,
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  highlight,
  renderNode,
  height = 480,
  isLoading = false,
  emptyText = "Nothing to show yet.",
  listLabel = "View as list",
  inferredLabel = "inferred",
  keyboardHint = "Arrow keys move between nodes. Tab walks the focused node's relations. Enter selects, Space opens or closes a group. Plus, minus and 0 zoom; Shift and an arrow pans.",
  className,
  children,
  ref,
  ...rest
}: DiagramProps<D>) {
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const listPrefix = useId();
  const [isList, setIsList] = useState(false);
  const [selected, setSelected] = useControllableState<string | null>({
    value: selectedProp,
    defaultValue: defaultSelected,
    onChange: (id) => onSelect?.(id === null ? null : (nodes.find((n) => n.id === id) ?? null)),
  });

  /* -- groups ------------------------------------------------------- */
  const flat = useMemo(() => flatten(children), [children]);
  const groups = useMemo(
    () => flat.filter((c): c is ReactElement<DiagramGroupProps> => isValidElement(c) && c.type === Group).map((c) => c.props),
    [flat],
  );
  const overlays = useMemo(() => flat.filter((c) => !(isValidElement(c) && c.type === Group)), [flat]);
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.defaultIsCollapsed ?? false])),
  );
  const isCollapsed = (g: DiagramGroupProps) => g.isCollapsed ?? collapsedState[g.id] ?? g.defaultIsCollapsed ?? false;
  const setCollapsed = (g: DiagramGroupProps, value: boolean) => {
    if (g.isCollapsed === undefined) setCollapsedState((s) => ({ ...s, [g.id]: value }));
    g.onCollapsedChange?.(value);
  };
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const collapsedKey = groups.map((g) => `${g.id}:${isCollapsed(g)}`).join(",");

  /* -- what is drawn ------------------------------------------------ */
  const { visibleNodes, visibleEdges, ownerOf } = useMemo(() => {
    const owner = new Map<string, string>();
    for (const n of nodes) {
      const g = n.parentId ? groupById.get(n.parentId) : undefined;
      if (g && isCollapsed(g)) owner.set(n.id, g.id);
    }
    const vn: VisibleNode<D>[] = [];
    const seenGroup = new Set<string>();
    for (const n of nodes) {
      const gid = owner.get(n.id);
      if (gid) {
        if (seenGroup.has(gid)) continue;
        seenGroup.add(gid);
        const g = groupById.get(gid)!;
        const members = nodes.filter((m) => owner.get(m.id) === gid);
        const inner = edges.filter((e) => owner.get(e.source) === gid && owner.get(e.target) === gid).length;
        vn.push({ id: gid, label: g.label, description: (g.summary ?? defaultSummary)({ nodes: members.length, edges: inner }), group: { config: g, nodes: members.length, edges: inner } });
      } else {
        vn.push({ id: n.id, label: n.label, description: n.description, node: n, parentId: n.parentId, position: n.position });
      }
    }
    const known = new Set(vn.map((v) => v.id));
    const ve: VisibleEdge[] = [];
    const pairs = new Set<string>();
    for (const e of edges) {
      const source = owner.get(e.source) ?? e.source;
      const target = owner.get(e.target) ?? e.target;
      if (source === target || !known.has(source) || !known.has(target)) continue;
      // Two members' edges to one outsider become one edge from the group.
      const rerouted = source !== e.source || target !== e.target;
      const key = `${source}\u0000${target}`;
      if (rerouted && pairs.has(key)) continue;
      pairs.add(key);
      ve.push({ id: e.id, source, target, edge: e });
    }
    return { visibleNodes: vn, visibleEdges: ve, ownerOf: owner };
    // groupById and isCollapsed are rebuilt each render from groups and collapsedKey, which are the keys here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, groups, collapsedKey]);

  /* -- sizes: hint first, measured once mounted ---------------------- */
  const hint = useCallback(
    (v: VisibleNode<D>): Size => (v.group ? COLLAPSED_SIZE : typeof nodeSize === "function" ? nodeSize(v.node!) : nodeSize),
    [nodeSize],
  );
  const [measured, setMeasured] = useState<Record<string, Size>>({});
  const nodeEls = useRef(new Map<string, HTMLDivElement>());
  const byId = useMemo(() => new Map(visibleNodes.map((v) => [v.id, v])), [visibleNodes]);
  const sizeOf = useCallback((id: string) => measured[id] ?? hint(byId.get(id)!), [measured, hint, byId]);
  const sizeKey = visibleNodes.map((v) => {
    const s = sizeOf(v.id);
    return `${s.width}x${s.height}`;
  }).join(",");

  useIsomorphicLayoutEffect(() => {
    const read = () => {
      const next: Record<string, Size> = {};
      let changed = false;
      for (const [id, el] of nodeEls.current) {
        const s = { width: el.offsetWidth, height: el.offsetHeight };
        if (!s.width || !s.height) continue;
        next[id] = s;
        const prev = measured[id];
        if (!prev || prev.width !== s.width || prev.height !== s.height) changed = true;
      }
      if (changed) setMeasured((m) => ({ ...m, ...next }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    for (const el of nodeEls.current.values()) ro.observe(el);
    return () => ro.disconnect();
  });

  /* -- layout -------------------------------------------------------- */
  // An open group's title row and padding sit in the gap above its members,
  // where the edges into the group carry their labels; widen the gap so the
  // two never meet.
  const hasOpenGroup = groups.some((g) => !isCollapsed(g) && nodes.some((n) => n.parentId === g.id));
  const boxes = useMemo(() => {
    const ids = visibleNodes.map((v) => ({ id: v.id }));
    let out: Map<string, Box>;
    if (layout === "tree") out = treeLayout(ids, visibleEdges, { size: sizeOf, direction, rankGap: hasOpenGroup ? RANK_GAP_GROUPED : 48 });
    else if (layout === "radial") {
      const widest = Math.max(0, ...visibleNodes.map((v) => sizeOf(v.id).width));
      const pts = radialLayout(ids, visibleEdges, { ringGap: widest + 48 });
      out = new Map();
      for (const v of visibleNodes) {
        const p = pts.get(v.id) ?? { x: 0, y: 0 };
        const s = sizeOf(v.id);
        out.set(v.id, { x: round(p.x - s.width / 2), y: round(p.y - s.height / 2), ...s });
      }
    } else if (layout === "none") {
      out = new Map();
      let row = 0;
      for (const v of visibleNodes) {
        const s = sizeOf(v.id);
        const p = v.position ?? { x: (row++) * (s.width + 32), y: 0 };
        out.set(v.id, { ...p, ...s });
      }
    } else out = layeredLayout(ids, visibleEdges, { size: sizeOf, direction, rankGap: hasOpenGroup ? RANK_GAP_GROUPED : 64 });
    // Given positions win in every layout: a saved arrangement, pinned.
    for (const v of visibleNodes) if (v.position && layout !== "none") out.set(v.id, { ...v.position, ...sizeOf(v.id) });
    return out;
    // sizeOf is rebuilt each render; sizeKey stands for everything it returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes, visibleEdges, layout, direction, sizeKey, hasOpenGroup]);

  const groupBoxes = useMemo(() => {
    const out = new Map<string, Box>();
    for (const g of groups) {
      if (isCollapsed(g)) continue;
      const b = boundsOf(visibleNodes.filter((v) => v.parentId === g.id).map((v) => boxes.get(v.id)!));
      if (!b) continue;
      const box = inflate(b, GROUP_PAD);
      out.set(g.id, { ...box, y: box.y - GROUP_TITLE, height: box.height + GROUP_TITLE });
    }
    return out;
    // isCollapsed is rebuilt each render from collapsedKey, which is the key here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, collapsedKey, visibleNodes, boxes]);

  const content = useMemo(() => boundsOf([...boxes.values(), ...groupBoxes.values()]), [boxes, groupBoxes]);
  // The frame's callback ref is taken out by name: React's ref rule treats an
  // object whose member is passed to `ref` as a ref itself, and would then flag
  // every other read of the viewport during render.
  const { frameRef, ...viewport } = useGraphViewport({ content, initialSize: { width: 800, height }, limits: { min: 0.25, max: 2 } });

  /* -- relations, selection, highlight -------------------------------- */
  const adj = useMemo(() => adjacency(visibleEdges), [visibleEdges]);
  const pathIds = useMemo(() => (highlight?.length ? pathEdgeIds(visibleEdges.map((e) => ({ ...e.edge, source: e.source, target: e.target })), highlight) : null), [highlight, visibleEdges]);
  const onPath = useMemo(() => (highlight?.length ? new Set(highlight) : null), [highlight]);
  const selectedVisible = selected ? (ownerOf.get(selected) ?? selected) : null;

  const readingOrder = useMemo(
    () => [...visibleNodes].sort((a, b) => {
      const pa = boxes.get(a.id)!;
      const pb = boxes.get(b.id)!;
      return pa.y - pb.y || pa.x - pb.x;
    }).map((v) => v.id),
    [visibleNodes, boxes],
  );

  /* -- keyboard ------------------------------------------------------ */
  const [focus, setFocus] = useState<Focus | null>(null);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const viewportEl = useRef<HTMLDivElement>(null);
  const nodeLabel = (id: string) => byId.get(id)?.label ?? id;
  const relationText = (e: VisibleEdge) => {
    const verb = e.edge.label ?? "links to";
    const tail = e.edge.isInferred ? ` (${inferredLabel})` : "";
    return `${nodeLabel(e.source)} ${verb} ${nodeLabel(e.target)}${tail}`;
  };
  const describeNode = (id: string) => {
    const v = byId.get(id);
    if (!v) return "";
    const rels = adj.get(id) ?? [];
    const parts = [v.description ? `${v.label}, ${v.description}.` : `${v.label}.`];
    if (v.group) parts.push(`Group, collapsed.`);
    else if (v.parentId && groupById.has(v.parentId)) parts.push(`In ${groupById.get(v.parentId)!.label}.`);
    if (id === selectedVisible) parts.push("Selected.");
    parts.push(
      rels.length
        ? `${rels.length} ${rels.length === 1 ? "relation" : "relations"}: ${rels.map((r) => relationText(r.edge)).join("; ")}.`
        : "No relations.",
    );
    return parts.join(" ");
  };

  const reveal = (id: string) => {
    const b = boxes.get(id);
    if (b) viewport.reveal(inflate(b, 4));
  };
  const goTo = (next: Focus, say?: string) => {
    setFocus(next);
    if (next.kind === "node") {
      reveal(next.id);
      setAnnouncement(say ?? describeNode(next.id));
    } else {
      const rel = adj.get(next.node)![next.index]!;
      const b = boxes.get(rel.other);
      const a = boxes.get(next.node);
      if (a && b) viewport.reveal(boundsOf([a, b])!);
      setAnnouncement(`${relationText(rel.edge)}. Relation ${next.index + 1} of ${adj.get(next.node)!.length}. Enter goes to ${nodeLabel(rel.other)}.`);
    }
  };

  const toggleGroupOf = (id: string): boolean => {
    const v = byId.get(id);
    const g = v?.group ? v.group.config : v?.parentId ? groupById.get(v.parentId) : undefined;
    if (!g) return false;
    const next = !isCollapsed(g);
    setCollapsed(g, next);
    // Focus follows: onto the group when it closes, onto its first member when it opens.
    const target = next ? g.id : (nodes.find((n) => n.parentId === g.id)?.id ?? g.id);
    setFocus({ kind: "node", id: target });
    setAnnouncement(`${g.label}, ${next ? "collapsed" : "expanded"}.`);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    setIsFocusVisible(true);
    if (viewport.onKeyDown(e)) return;
    if (!focus) return;
    const at = focus.kind === "node" ? focus.id : focus.node;
    const rels = adj.get(at) ?? [];
    const dirs: Record<string, "up" | "down" | "left" | "right"> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (dirs[e.key] && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const from = centre(boxes.get(at)!);
      const next = nearestInDirection(from, readingOrder.filter((id) => id !== at).map((id) => [id, centre(boxes.get(id)!)] as const), dirs[e.key]!);
      if (next) goTo({ kind: "node", id: next });
      return;
    }
    switch (e.key) {
      case "Home":
      case "End": {
        e.preventDefault();
        const id = e.key === "Home" ? readingOrder[0] : readingOrder[readingOrder.length - 1];
        if (id) goTo({ kind: "node", id });
        return;
      }
      case "Tab": {
        // Tab walks the relations and then lets go: never a trap.
        if (e.shiftKey) {
          if (focus.kind === "edge") {
            e.preventDefault();
            if (focus.index === 0) goTo({ kind: "node", id: focus.node });
            else goTo({ kind: "edge", node: focus.node, index: focus.index - 1 });
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
        const v = byId.get(focus.id);
        if (v?.group) {
          toggleGroupOf(focus.id);
          return;
        }
        const next = selected === focus.id ? null : focus.id;
        setSelected(next);
        setAnnouncement(next ? `${nodeLabel(focus.id)}, selected.` : `${nodeLabel(focus.id)}, not selected.`);
        return;
      }
      case " ":
        if (toggleGroupOf(at)) e.preventDefault();
        return;
      case "Escape":
        if (focus.kind === "edge") {
          e.preventDefault();
          goTo({ kind: "node", id: focus.node });
        } else if (selected !== null) {
          e.preventDefault();
          setSelected(null);
          setAnnouncement("Selection cleared.");
        }
        return;
    }
  };

  // Focus that no longer exists (a group collapsed over it) moves to its owner.
  const focusNode = focus ? (focus.kind === "node" ? focus.id : focus.node) : null;
  // Adjusted during render rather than in an effect, so no frame paints focus
  // on a node that is no longer drawn. It settles: the owner is drawn, or null.
  if (focusNode && !byId.has(focusNode)) {
    const owner = ownerOf.get(focusNode);
    setFocus(owner && byId.has(owner) ? { kind: "node", id: owner } : null);
  }

  const focusedEdgeId = focus?.kind === "edge" ? (adj.get(focus.node)?.[focus.index]?.edge.id ?? null) : null;

  /* -- render -------------------------------------------------------- */
  const isEmpty = !isLoading && nodes.length === 0;
  const ctx: DiagramContextValue = {
    viewport,
    content,
    boxes,
    hasInferred: visibleEdges.some((e) => e.edge.isInferred),
    hasGroups: groups.length > 0,
    hasActive: !!pathIds?.size || selectedVisible !== null,
  };

  return (
    <figure
      ref={ref}
      data-slot="diagram"
      data-layout={layout}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isLoading || undefined}
      className={cn("flex flex-col gap-lg rounded-md border border-edge-subtle bg-surface p-xl", className)}
      {...rest}
    >
      <div data-slot="diagram-head" className="flex items-start gap-lg">
        <div className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} data-slot="diagram-title" className="font-body text-label-md text-ink-primary">
            {label}
          </span>
          <p id={descriptionId} data-slot="diagram-description" className="font-body text-body-sm text-ink-muted">
            {description}
          </p>
        </div>
        <Button
          data-slot="diagram-list-toggle"
          variant="secondary"
          size="md"
          isIconOnly
          aria-label={listLabel}
          aria-pressed={isList}
          isDisabled={isLoading}
          icon={<ListBulleted aria-hidden />}
          onClick={() => setIsList((v) => !v)}
        />
      </div>

      {isList ? (
        <DiagramList
          label={label}
          nodes={nodes}
          edges={edges}
          groups={groupById}
          prefix={listPrefix}
          inferredLabel={inferredLabel}
        />
      ) : (
        <DiagramContext.Provider value={ctx}>
          <div
            ref={frameRef}
            data-slot="diagram-frame"
            {...viewport.bind}
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
              data-slot="diagram-viewport"
              role="group"
              aria-roledescription="diagram"
              aria-labelledby={titleId}
              aria-describedby={hintId}
              tabIndex={isLoading || isEmpty ? -1 : 0}
              onKeyDown={onKeyDown}
              onFocus={(e) => {
                if (e.target !== e.currentTarget) return;
                setIsFocusVisible(e.currentTarget.matches(":focus-visible"));
                const start = focus?.kind === "node" && byId.has(focus.id) ? focus.id : (selectedVisible ?? readingOrder[0]);
                if (start) goTo({ kind: "node", id: start });
              }}
              onBlur={() => setIsFocusVisible(false)}
              className="absolute inset-0 outline-none"
            >
              {isLoading ? (
                <div data-slot="diagram-skeleton" className="absolute inset-0 flex flex-col items-center justify-center gap-2xl">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 w-40 rounded-md bg-sunken" />
                  ))}
                </div>
              ) : isEmpty ? (
                <p data-slot="diagram-empty" className="absolute inset-0 flex items-center justify-center font-body text-body-sm text-ink-muted">
                  {emptyText}
                </p>
              ) : (
                <div
                  data-slot="diagram-world"
                  style={viewport.worldStyle}
                  className={cn("absolute top-0 left-0", !viewport.isPanning && "transition-transform duration-(--ui-duration-base) ease-(--ui-ease-out)")}
                >
                  {groups.map((g) => {
                    const b = groupBoxes.get(g.id);
                    if (!b) return null;
                    return (
                      <div
                        key={g.id}
                        data-slot="diagram-group"
                        style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
                        className="absolute flex items-start rounded-lg border border-edge-default bg-surface px-md pt-md"
                      >
                        <button
                          type="button"
                          tabIndex={-1}
                          data-slot="diagram-group-toggle"
                          aria-label={g.collapseLabel ?? `Collapse ${g.label}`}
                          onClick={() => toggleGroupOf(nodes.find((n) => n.parentId === g.id)?.id ?? g.id)}
                          className={cn(chromeControl(), "size-auto h-4 gap-xs bg-transparent px-0 font-body text-label-sm text-ink-muted enabled:hover:bg-transparent enabled:hover:text-ink-primary")}
                        >
                          {g.label}
                          <ChevronDownSmall aria-hidden />
                        </button>
                      </div>
                    );
                  })}

                  <svg data-slot="diagram-edges" aria-hidden="true" width={1} height={1} className="absolute top-0 left-0 overflow-visible">
                    {visibleEdges.map((e) => {
                      const a = boxes.get(e.source);
                      const b = boxes.get(e.target);
                      if (!a || !b) return null;
                      const geo = boxEdge(a, b, { route, direction, isDirected: e.edge.isDirected ?? true });
                      const isActive = pathIds ? pathIds.has(e.id) : selectedVisible !== null && (e.source === selectedVisible || e.target === selectedVisible);
                      const isDimmed = !!pathIds && !pathIds.has(e.id);
                      const isFocused = isFocusVisible && focusedEdgeId === e.id;
                      return (
                        <g
                          key={e.id}
                          data-slot="diagram-edge"
                          data-state={isActive ? "active" : e.edge.isInferred ? "inferred" : undefined}
                          className={cn(isDimmed && "opacity-32")}
                        >
                          {isFocused && (
                            <path d={geo.d} fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" className="stroke-edge-focus" />
                          )}
                          <path
                            d={geo.d}
                            fill="none"
                            strokeLinejoin="round"
                            style={{ strokeWidth: e.edge.isInferred && !isActive ? "var(--ui-stroke-hairline)" : "var(--ui-stroke-thick)" }}
                            className={cn(
                              isActive ? "stroke-ink-primary forced-colors:stroke-[Highlight]" : e.edge.isInferred ? "stroke-ink-muted" : "stroke-edge-control",
                              !isActive && "forced-colors:stroke-[CanvasText]",
                            )}
                          />
                          {geo.head && (
                            <path
                              d={geo.head}
                              className={cn(
                                isActive ? "fill-ink-primary forced-colors:fill-[Highlight]" : e.edge.isInferred ? "fill-ink-muted" : "fill-edge-control",
                                !isActive && "forced-colors:fill-[CanvasText]",
                              )}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {visibleEdges.map((e) => {
                    const text = e.edge.isInferred ? (e.edge.label ? `${e.edge.label} · ${inferredLabel}` : inferredLabel) : e.edge.label;
                    if (!text) return null;
                    const a = boxes.get(e.source);
                    const b = boxes.get(e.target);
                    if (!a || !b) return null;
                    const { mid } = boxEdge(a, b, { route, direction, isDirected: e.edge.isDirected ?? true });
                    const isActive = pathIds ? pathIds.has(e.id) : selectedVisible !== null && (e.source === selectedVisible || e.target === selectedVisible);
                    const inGroup = byId.get(e.source)?.parentId && byId.get(e.source)?.parentId === byId.get(e.target)?.parentId;
                    return (
                      <span
                        key={e.id}
                        aria-hidden="true"
                        data-slot="diagram-edge-label"
                        style={{ left: mid.x, top: mid.y }}
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-xs font-body text-label-sm whitespace-nowrap",
                          isActive ? "bg-surface text-ink-primary" : cn("font-regular text-ink-muted", inGroup ? "bg-surface" : "bg-base"),
                          pathIds && !pathIds.has(e.id) && "opacity-32",
                        )}
                      >
                        {text}
                      </span>
                    );
                  })}

                  {visibleNodes.map((v) => {
                    const b = boxes.get(v.id)!;
                    const isSelected = v.id === selectedVisible;
                    const isFocused = isFocusVisible && focusNode === v.id && focus?.kind === "node";
                    const isDimmed = !!onPath && !onPath.has(v.id);
                    const hintSize = hint(v);
                    return (
                      <div
                        key={v.id}
                        ref={(el) => {
                          if (el) nodeEls.current.set(v.id, el);
                          else nodeEls.current.delete(v.id);
                        }}
                        data-slot="diagram-node"
                        data-id={v.id}
                        data-state={isSelected ? "selected" : undefined}
                        data-group={v.group ? "collapsed" : undefined}
                        aria-hidden="true"
                        onClick={() => {
                          if (viewport.wasDrag()) return;
                          setFocus({ kind: "node", id: v.id });
                          viewportEl.current?.focus({ preventScroll: true });
                          if (v.group) return;
                          setSelected(selected === v.id ? null : v.id);
                        }}
                        style={{ left: b.x, top: b.y, width: hintSize.width, minHeight: hintSize.height }}
                        className={cn(
                          "absolute flex cursor-pointer items-center bg-surface font-body",
                          v.group
                            ? "gap-sm rounded-lg border border-edge-default ps-md pe-sm"
                            : "flex-col justify-center rounded-md px-md py-sm text-center",
                          !v.group && (isSelected ? "border-thick border-ink-primary bg-selected" : "border-hairline border-edge-strong hover:bg-hover"),
                          isDimmed && "opacity-32",
                          isFocused && "shadow-(--ui-focus-ring) forced-colors:outline forced-colors:outline-focus",
                        )}
                      >
                        {v.group ? (
                          <>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-label-md text-ink-primary">{v.label}</span>
                              <span data-slot="diagram-node-description" className={cn("truncate text-label-sm font-regular", isSelected ? "text-ink-primary" : "text-ink-muted")}>{v.description}</span>
                            </span>
                            <button
                              type="button"
                              tabIndex={-1}
                              data-slot="diagram-group-toggle"
                              aria-label={v.group.config.expandLabel ?? `Expand ${v.label}`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleGroupOf(v.id);
                              }}
                              className={chromeControl()}
                            >
                              <ChevronRightSmall aria-hidden />
                            </button>
                          </>
                        ) : renderNode ? (
                          renderNode(v.node!, { isSelected, isFocused, isDimmed })
                        ) : (
                          <>
                            <span className="w-full truncate text-label-md text-ink-primary">{v.label}</span>
                            {v.description && <span data-slot="diagram-node-description" className={cn("line-clamp-2 w-full text-label-sm font-regular", isSelected ? "text-ink-primary" : "text-ink-muted")}>{v.description}</span>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {!isLoading && !isEmpty && overlays}
          </div>
        </DiagramContext.Provider>
      )}

      <div data-slot="diagram-announcer" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ list */

function DiagramList<D>({
  label,
  nodes,
  edges,
  groups,
  prefix,
  inferredLabel,
}: {
  label: string;
  nodes: readonly GraphNode<D>[];
  edges: readonly GraphEdge[];
  groups: Map<string, DiagramGroupProps>;
  prefix: string;
  inferredLabel: string;
}) {
  const adj = useMemo(() => adjacency(edges), [edges]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const itemId = (id: string) => `${prefix}-${id}`;
  return (
    <ul data-slot="diagram-list" aria-label={label} className="flex flex-col divide-y divide-edge-subtle font-body">
      {nodes.map((n) => {
        const rels = adj.get(n.id) ?? [];
        const group = n.parentId ? groups.get(n.parentId) : undefined;
        return (
          <li key={n.id} id={itemId(n.id)} tabIndex={-1} className="flex flex-col gap-xs py-md focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus">
            <span className="text-label-md text-ink-primary">
              {n.label}
              {n.description && <span data-slot="diagram-list-note" className="font-regular text-ink-muted">, {n.description}</span>}
            </span>
            {group && <span data-slot="diagram-list-note" className="text-label-sm font-regular text-ink-muted">In {group.label}</span>}
            {rels.length ? (
              <ul className="flex flex-wrap gap-xs" aria-label={`${rels.length} ${rels.length === 1 ? "relation" : "relations"}`}>
                {rels.map((r) => {
                  const other = byId.get(r.other)?.label ?? r.other;
                  const verb = r.edge.label ?? "links to";
                  const text = r.direction === "out" ? `${verb} ${other}` : `${other} ${verb} it`;
                  return (
                    <li key={r.edge.id}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById(itemId(r.other))?.focus()}
                      >
                        {r.edge.isInferred ? `${text} (${inferredLabel})` : text}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <span data-slot="diagram-list-note" className="text-label-sm font-regular text-ink-muted">No relations</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------- overlays */

export interface DiagramControlsProps extends HTMLAttributes<HTMLDivElement> {
  zoomInLabel?: string;
  zoomOutLabel?: string;
  fitLabel?: string;
}

/** Zoom in, zoom out and fit, bottom right (Diagram sheet, Controls). Each is also a key: +, -, 0. */
function Controls({ zoomInLabel = "Zoom in", zoomOutLabel = "Zoom out", fitLabel = "Fit", className, ...rest }: DiagramControlsProps) {
  const { viewport } = useDiagram("Controls");
  return (
    <div data-slot="diagram-controls" className={cn("absolute right-lg bottom-lg flex gap-xs", className)} {...rest}>
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

const MINI = { width: 168, height: 104, pad: 8 };

/** The viewport frame, kept inside the minimap so a fully visible drawing still shows its frame. */
function clampRect(r: Box) {
  const x0 = Math.max(1, r.x);
  const y0 = Math.max(1, r.y);
  const x1 = Math.min(MINI.width - 1, r.x + r.width);
  const y1 = Math.min(MINI.height - 1, r.y + r.height);
  return { x: round(x0), y: round(y0), width: round(Math.max(0, x1 - x0)), height: round(Math.max(0, y1 - y0)) };
}

/** The whole drawing at a glance with the visible part framed, bottom left. Decorative: aria-hidden. */
function Minimap({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { viewport, content, boxes } = useDiagram("Minimap");
  if (!content) return null;
  const k = Math.min((MINI.width - 2 * MINI.pad) / Math.max(1, content.width), (MINI.height - 2 * MINI.pad) / Math.max(1, content.height));
  const ox = (MINI.width - content.width * k) / 2 - content.x * k;
  const oy = (MINI.height - content.height * k) / 2 - content.y * k;
  const { view, size } = viewport;
  const frame = { x: -view.x / view.k, y: -view.y / view.k, width: size.width / view.k, height: size.height / view.k };
  return (
    <div
      data-slot="diagram-minimap"
      aria-hidden="true"
      className={cn("pointer-events-none absolute bottom-lg left-lg overflow-hidden rounded-md border border-edge-subtle bg-surface", className)}
      style={{ width: MINI.width, height: MINI.height }}
      {...rest}
    >
      <svg width={MINI.width} height={MINI.height} className="block">
        {[...boxes.values()].map((b, i) => (
          <rect key={i} x={round(ox + b.x * k)} y={round(oy + b.y * k)} width={round(Math.max(2, b.width * k))} height={round(Math.max(2, b.height * k))} rx={1} className="fill-edge-control" />
        ))}
        <rect
          {...clampRect({ x: ox + frame.x * k, y: oy + frame.y * k, width: frame.width * k, height: frame.height * k })}
          rx={2}
          fill="none"
          style={{ strokeWidth: "var(--ui-stroke-hairline)" }}
          className="stroke-ink-primary"
        />
      </svg>
    </div>
  );
}

export type DiagramLegendKind = "relation" | "inferred" | "selected" | "group";

export interface DiagramLegendProps extends HTMLAttributes<HTMLDivElement> {
  /** Which rows to show. Default: what the drawing actually uses. */
  items?: readonly DiagramLegendKind[];
  labels?: Partial<Record<DiagramLegendKind, string>>;
}

const LEGEND_LABELS: Record<DiagramLegendKind, string> = {
  relation: "Relation",
  inferred: "Inferred, thinner",
  selected: "Selected path",
  group: "Group",
};

/** What each line means, top right (Diagram sheet, Legend). A real list, read in order. */
function Legend({ items, labels, className, ...rest }: DiagramLegendProps) {
  const { hasInferred, hasGroups, hasActive } = useDiagram("Legend");
  const rows = items ?? (["relation", hasInferred && "inferred", hasActive && "selected", hasGroups && "group"].filter(Boolean) as DiagramLegendKind[]);
  const text = { ...LEGEND_LABELS, ...labels };
  return (
    <div data-slot="diagram-legend" className={cn("absolute top-lg right-lg rounded-md border border-edge-subtle bg-surface px-md py-sm", className)} {...rest}>
      <ul className="flex flex-col gap-[6px] font-body">
        {rows.map((kind) => (
          <li key={kind} className="flex items-center gap-sm text-label-sm text-ink-primary">
            <svg aria-hidden="true" width={24} height={12} className="shrink-0 overflow-visible">
              {kind === "group" ? (
                <rect x={0.5} y={0.5} width={23} height={11} rx={4} className="fill-surface stroke-edge-default" />
              ) : (
                <path
                  d="M0 6H24"
                  style={{ strokeWidth: kind === "inferred" ? "var(--ui-stroke-hairline)" : "var(--ui-stroke-thick)" }}
                  className={kind === "selected" ? "stroke-ink-primary" : kind === "inferred" ? "stroke-ink-muted" : "stroke-edge-control"}
                />
              )}
            </svg>
            {text[kind]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A read-only node-link viewer — pipelines, lineage, org charts, dependency
 * and state graphs — where every node is real UI.
 *
 * Nodes are an HTML layer and edges an SVG layer under ONE transform, so a
 * node can hold any content and still sit exactly on its edges' ends. The
 * ground is DotPattern on bg-base. The figure carries a title, a takeaway, an
 * adjacency-list view behind a toggle, and a polite announcer; the drawing is
 * one tab stop with a spatial keyboard model (arrows to the nearest node, Tab
 * through relations, Enter selects, Space opens and closes a group).
 */
export const Diagram = Object.assign(DiagramRoot, { Group, Controls, Minimap, Legend });

export type { GraphEdge, GraphNode } from "@/lib/graph";

// Exported so a type test can name it; not a runtime API.
export type DiagramGroupElement = ReactElement<DiagramGroupProps, typeof Group>;
