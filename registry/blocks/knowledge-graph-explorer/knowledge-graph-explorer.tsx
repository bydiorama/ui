"use client";

import { cloneElement, isValidElement, useId, useMemo, useRef, useState, type HTMLAttributes, type Ref } from "react";
import { ChartTable, ChevronRightSmall, Close, Plus, Search } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import { shortestPath, type GraphEdge, type GraphNode } from "@/lib/graph";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Combobox, type ComboboxItemGroup } from "@/ui/combobox";
import { Network, type NetworkRenderer, type NetworkSlot, type NetworkType } from "@/ui/network";

/* Literal class maps: Tailwind sees only whole class names. */
const SWATCH = {
  1: "bg-data-cat-1-solid", 2: "bg-data-cat-2-solid", 3: "bg-data-cat-3-solid", 4: "bg-data-cat-4-solid",
  5: "bg-data-cat-5-solid", 6: "bg-data-cat-6-solid", 7: "bg-data-cat-7-solid", 8: "bg-data-cat-8-solid",
} as const satisfies Record<NetworkSlot, string>;
const CHIP = {
  1: "bg-data-cat-1-bg border-data-cat-1-solid", 2: "bg-data-cat-2-bg border-data-cat-2-solid",
  3: "bg-data-cat-3-bg border-data-cat-3-solid", 4: "bg-data-cat-4-bg border-data-cat-4-solid",
  5: "bg-data-cat-5-bg border-data-cat-5-solid", 6: "bg-data-cat-6-bg border-data-cat-6-solid",
  7: "bg-data-cat-7-bg border-data-cat-7-solid", 8: "bg-data-cat-8-bg border-data-cat-8-solid",
} as const satisfies Record<NetworkSlot, string>;

export interface KnowledgeGraphExplorerProps<D = unknown> extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  /** Names the drawing. */
  label: string;
  /** The takeaway, read before the drawing. */
  description: string;
  /** What is loaded so far: the neighbourhoods explored, not the whole store. */
  nodes: readonly GraphNode<D>[];
  edges: readonly GraphEdge[];
  /** Every type's name, slot and glyph. The filter lists them in this order. */
  types: Readonly<Record<string, NetworkType>>;
  /** How many entities the store holds, for "7 of 1,284 shown". Default: nodes.length. */
  total?: number;
  /** Neighbours that exist but are not loaded yet, per node id. */
  hiddenNeighbours?: Readonly<Record<string, number>>;
  /** "Expand neighbours", the +N chip or Plus: load them and append them to nodes and edges. */
  onExpandRequest?: (node: GraphNode<D>) => void;
  /** Controlled selection. */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (node: GraphNode<D> | null) => void;
  /** Passed to Network — NetworkCanvas for a store that can load past 2,000 elements. */
  renderer?: NetworkRenderer;
  /** The canvas and panel height in px. Default 456, the sheet's. */
  height?: number;
  searchLabel?: string;
  searchPlaceholder?: string;
  filterLabel?: string;
  historyLabel?: string;
  relationsLabel?: string;
  linkedFromLabel?: string;
  expandLabel?: string;
  closeLabel?: string;
  /** Names the panel while nothing is selected; once something is, the panel takes the entity's name. */
  detailsLabel?: string;
  tableLabel?: string;
  inferredLabel?: string;
  emptyDetailText?: string;
  /** "7 of 1,284 shown". */
  shownText?: (shown: number, total: number) => string;
  ref?: Ref<HTMLDivElement>;
}

const defaultShown = (shown: number, total: number) => `${shown.toLocaleString("en")} of ${total.toLocaleString("en")} shown`;

/**
 * Explore a knowledge graph a neighbourhood at a time (Network sheet, the
 * explorer): search for an entity, filter by type, read and walk its
 * relations in a detail panel, ask for more of the graph, and retrace the way
 * you came. A block — Combobox, Checkbox, Network, Button — not a bigger
 * component: it owns the composition and the history, and nothing else.
 *
 * When a jump (search, or the history) lands more than one hop from where you
 * were, the path between the two is highlighted, so you can see how they
 * connect before the neighbourhood takes over.
 */
export function KnowledgeGraphExplorer<D = unknown>({
  label,
  description,
  nodes,
  edges,
  types,
  total,
  hiddenNeighbours,
  onExpandRequest,
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  renderer,
  height = 456,
  searchLabel = "Search entities",
  searchPlaceholder = "Search",
  filterLabel = "Types",
  historyLabel = "History",
  relationsLabel = "Relations",
  linkedFromLabel = "Linked from",
  expandLabel = "Expand neighbours",
  closeLabel = "Close details",
  detailsLabel = "Details",
  tableLabel = "View as table",
  inferredLabel = "inferred",
  emptyDetailText = "Select an entity to read its relations.",
  shownText = defaultShown,
  className,
  ref,
  ...rest
}: KnowledgeGraphExplorerProps<D>) {
  const detailTitleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(new Set());
  const [isTable, setIsTable] = useState(false);
  const [history, setHistory] = useState<string[]>(defaultSelected ? [defaultSelected] : []);
  const [selected, setSelectedState] = useControllableState<string | null>({
    value: selectedProp,
    defaultValue: defaultSelected,
    onChange: (id) => onSelect?.(id === null ? null : (nodes.find((n) => n.id === id) ?? null)),
  });

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const typeKeys = Object.keys(types);
  const counts = useMemo(() => {
    const out = new Map<string, number>();
    for (const n of nodes) if (n.type) out.set(n.type, (out.get(n.type) ?? 0) + 1);
    return out;
  }, [nodes]);

  /** Select, and record the step: the history is where you have been, newest last. */
  const select = (id: string | null) => {
    setSelectedState(id);
    if (id) setHistory((h) => (h[h.length - 1] === id ? h : [...h.filter((x) => x !== id), id]));
  };
  const goBack = (index: number) => {
    const id = history[index]!;
    setHistory((h) => h.slice(0, index + 1));
    setSelectedState(id);
  };

  /* -- what is shown ------------------------------------------------- */
  const visibleNodes = useMemo(() => nodes.filter((n) => !n.type || !hiddenTypes.has(n.type)), [nodes, hiddenTypes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)), [edges, visibleIds]);
  const current = selected && visibleIds.has(selected) ? byId.get(selected) : undefined;

  // A jump of more than one hop highlights the way from where you were.
  const highlight = useMemo(() => {
    if (history.length < 2 || !current || history[history.length - 1] !== current.id) return undefined;
    const path = shortestPath(visibleEdges, history[history.length - 2]!, current.id);
    return path && path.length > 2 ? path : undefined;
  }, [history, current, visibleEdges]);

  const searchItems = useMemo<ComboboxItemGroup[]>(
    () =>
      Object.keys(types)
        .map((t) => ({ label: types[t]!.label, items: nodes.filter((n) => n.type === t).map((n) => ({ value: n.id, label: n.label })) }))
        .filter((g) => g.items.length > 0),
    [nodes, types],
  );

  /* -- the detail panel ---------------------------------------------- */
  const outgoing = current ? visibleEdges.filter((e) => e.source === current.id) : [];
  const incoming = current ? visibleEdges.filter((e) => e.target === current.id) : [];
  const currentType = current?.type ? types[current.type] : undefined;
  const hidden = current ? (hiddenNeighbours?.[current.id] ?? 0) : 0;

  const relationRow = (e: GraphEdge, otherId: string) => {
    const other = byId.get(otherId);
    const t = other?.type ? types[other.type] : undefined;
    return (
      <li key={e.id}>
        <button
          type="button"
          data-slot="knowledge-graph-explorer-relation"
          onClick={() => select(otherId)}
          className={cn(
            chromeControl(),
            "size-auto h-auto w-full justify-start gap-sm rounded-sm bg-transparent p-sm text-start font-body enabled:hover:bg-hover",
          )}
        >
          <span data-slot="knowledge-graph-explorer-verb" className="w-24 shrink-0 truncate text-label-sm font-regular text-ink-muted">
            {e.label ?? "links to"}
          </span>
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", t ? SWATCH[t.slot] : "bg-edge-control")} />
          <span className="min-w-0 truncate text-label-md text-ink-primary">{other?.label ?? otherId}</span>
          {e.isInferred && (
            <span data-slot="knowledge-graph-explorer-verb" className="shrink-0 text-label-sm font-regular text-ink-muted">
              {inferredLabel}
            </span>
          )}
          <ChevronRightSmall aria-hidden className="ms-auto shrink-0 text-ink-muted" />
        </button>
      </li>
    );
  };

  return (
    <div
      ref={ref}
      data-slot="knowledge-graph-explorer"
      className={cn("flex flex-col gap-lg rounded-md border border-edge-subtle bg-surface p-xl", className)}
      {...rest}
    >
      <div data-slot="knowledge-graph-explorer-toolbar" className="flex flex-wrap items-center gap-xl">
        <div className="w-80 shrink-0">
          <Combobox
            ref={searchRef}
            label={searchLabel}
            isLabelHidden
            placeholder={searchPlaceholder}
            icon={<Search />}
            hasTrigger={false}
            size="md"
            items={searchItems}
            value={current?.id ?? null}
            onValueChange={(id) => {
              if (!id) return;
              const t = byId.get(id)?.type;
              if (t && hiddenTypes.has(t)) setHiddenTypes((s) => new Set([...s].filter((x) => x !== t)));
              select(id);
            }}
          />
        </div>
        <fieldset data-slot="knowledge-graph-explorer-filter" className="flex flex-wrap items-center gap-[20px]">
          <legend className="sr-only">{filterLabel}</legend>
          {typeKeys.map((t) => (
            <Checkbox
              key={t}
              isChecked={!hiddenTypes.has(t)}
              onCheckedChange={(on) =>
                setHiddenTypes((s) => {
                  const next = new Set(s);
                  if (on) next.delete(t);
                  else next.add(t);
                  return next;
                })
              }
            >
              <span className="flex items-center gap-sm">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", SWATCH[types[t]!.slot])} />
                {types[t]!.label}
                <span data-slot="knowledge-graph-explorer-count" className="font-regular text-ink-muted">
                  {counts.get(t) ?? 0}
                </span>
              </span>
            </Checkbox>
          ))}
        </fieldset>
        <div className="ms-auto flex items-center gap-md">
          <span data-slot="knowledge-graph-explorer-shown" className="font-body text-label-sm font-regular text-ink-muted">
            {shownText(visibleNodes.length, total ?? nodes.length)}
          </span>
          <Button
            variant="secondary"
            size="md"
            isIconOnly
            aria-label={tableLabel}
            aria-pressed={isTable}
            icon={<ChartTable aria-hidden />}
            onClick={() => setIsTable(!isTable)}
          />
        </div>
      </div>

      <nav data-slot="knowledge-graph-explorer-history" aria-label={`${historyLabel}, ${label}`} className="flex items-center gap-md font-body text-label-sm">
        <span aria-hidden="true" className="text-ink-muted">{historyLabel}</span>
        <ol className="flex min-w-0 flex-wrap items-center gap-xs">
          {history.map((id, i) => {
            const isLast = i === history.length - 1;
            return (
              <li key={id} className="flex items-center gap-xs">
                {i > 0 && <ChevronRightSmall aria-hidden className="size-4 text-ink-muted" />}
                {isLast ? (
                  <span aria-current="location" className="text-ink-primary">{byId.get(id)?.label ?? id}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => goBack(i)}
                    className={cn(
                      chromeControl(),
                      "size-auto h-auto bg-transparent px-0 text-label-sm font-regular text-ink-muted enabled:hover:bg-transparent enabled:hover:text-ink-primary",
                    )}
                  >
                    {byId.get(id)?.label ?? id}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div data-slot="knowledge-graph-explorer-body" className="flex gap-lg">
        <Network
          label={label}
          description={description}
          isHeadHidden
          isTableView={isTable}
          onTableViewChange={setIsTable}
          nodes={visibleNodes}
          edges={visibleEdges}
          types={types}
          selected={current?.id ?? null}
          onSelect={(n) => select(n?.id ?? null)}
          {...(highlight ? { highlight } : {})}
          {...(hiddenNeighbours ? { hiddenNeighbours } : {})}
          {...(onExpandRequest ? { onExpandRequest } : {})}
          onDismiss={() => searchRef.current?.focus()}
          {...(renderer ? { renderer } : {})}
          inferredLabel={inferredLabel}
          tableLabel={tableLabel}
          height={height}
          className="min-w-0 flex-1 gap-0 border-0 bg-transparent p-0"
        >
          <Network.Controls />
        </Network>

        {/* A named group, not a second landmark: two explorers on a page would
            otherwise announce two regions both called after the same entity. */}
        <div
          role="group"
          data-slot="knowledge-graph-explorer-detail"
          aria-labelledby={current ? detailTitleId : undefined}
          aria-label={current ? undefined : detailsLabel}
          style={{ height }}
          className="flex w-80 shrink-0 flex-col gap-lg overflow-y-auto rounded-md border border-edge-subtle bg-surface p-lg font-body"
        >
          {current ? (
            <>
              <div className="flex items-center gap-sm">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-hairline text-ink-primary [&_svg]:size-4",
                    currentType ? CHIP[currentType.slot] : "border-edge-control bg-base",
                  )}
                >
                  {currentType?.glyph && isValidElement(currentType.glyph) ? cloneElement(currentType.glyph, { "aria-hidden": true }) : null}
                </span>
                <span data-slot="knowledge-graph-explorer-type" className="flex-1 text-label-sm text-ink-muted">
                  {currentType?.label ?? current.type ?? "Other"}
                </span>
                <Button variant="ghost" size="sm" isIconOnly aria-label={closeLabel} icon={<Close aria-hidden />} onClick={() => select(null)} />
              </div>
              <div className="flex flex-col gap-xs">
                <p id={detailTitleId} className="text-title-sm text-ink-primary">{current.label}</p>
                {current.description && <p className="text-body-sm text-ink-muted">{current.description}</p>}
              </div>
              <div className="flex flex-col gap-[2px] border-t border-edge-subtle pt-md">
                {[
                  { title: relationsLabel, list: outgoing, far: (e: GraphEdge) => e.target },
                  { title: linkedFromLabel, list: incoming, far: (e: GraphEdge) => e.source },
                ]
                  .filter((s, i) => s.list.length > 0 || (i === 0 && incoming.length === 0))
                  .map((s, i) => (
                    <div key={s.title} className="flex flex-col gap-[2px]">
                      <p className={cn("px-sm pb-xs text-label-sm text-ink-primary", i > 0 && "pt-sm")}>
                        {s.title} <span data-slot="knowledge-graph-explorer-count" className="font-regular text-ink-muted">{s.list.length}</span>
                      </p>
                      <ul aria-label={s.title} className="flex flex-col gap-[2px]">
                        {s.list.map((e) => relationRow(e, s.far(e)))}
                      </ul>
                    </div>
                  ))}
              </div>
              {onExpandRequest && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-auto w-full"
                  icon={<Plus aria-hidden />}
                  isDisabled={hidden === 0}
                  onClick={() => onExpandRequest(current)}
                >
                  {hidden > 0 ? `${expandLabel} (${hidden})` : expandLabel}
                </Button>
              )}
            </>
          ) : (
            <p className="m-auto text-center text-body-sm text-ink-muted">{emptyDetailText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
