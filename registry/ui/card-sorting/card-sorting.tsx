"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Button } from "@/ui/button/button.tsx";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * A reorderable list of cards.
 *
 * Built here rather than on a drag library (ADR 0012, AGENTS.md — independence).
 * That is not stubbornness: the accessible half of this pattern is the half a
 * drag library does not solve, and it is most of the work. Dragging is one of
 * three ways to reorder, and the other two carry the same weight —
 *
 *   POINTER DRAG   grab the handle, move, release.
 *   KEYBOARD       focus the handle, Space to lift, arrows to move, Space to
 *                  drop, Escape to put it back where it started.
 *   SINGLE POINTER  click the handle to lift, then click the row you want it
 *                  to land on. WCAG 2.5.7 requires that every dragging
 *                  movement have a no-drag pointer path, and this is it.
 *
 * All three go through the same `move` so they cannot diverge, and every one of
 * them announces through the same live region — a reorder that only sighted
 * mouse users can perceive is not a reorder, it is a magic trick.
 */

interface SortingContext {
  order: string[];
  liftedId: string | null;
  isDraggingId: string | null;
  lift: (id: string) => void;
  drop: () => void;
  cancel: () => void;
  moveBy: (id: string, delta: number) => void;
  moveTo: (id: string, index: number) => void;
  registerRow: (id: string, node: HTMLElement | null) => void;
  beginDrag: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const Sorting = createContext<SortingContext | null>(null);

function useSorting(part: string): SortingContext {
  const value = useContext(Sorting);
  if (!value) throw new Error(`CardSorting.${part} must be rendered inside CardSorting.`);
  return value;
}

export interface CardSortingProps extends Omit<HTMLAttributes<HTMLUListElement>, "onChange"> {
  children: ReactNode;
  /**
   * Required — the list needs a name, and "list, 4 items" says nothing about
   * what is being sorted. It is also read out with every announcement.
   */
  label: string;
  /** Controlled order, as item ids. Omit to let the list own it. */
  order?: string[];
  defaultOrder?: string[];
  /** Always `onOrderChange(order)` — never onMove/onDrop (§1). */
  onOrderChange?: (order: string[]) => void;
}

/** Reads the ids the caller actually rendered, in source order. */
function childIds(children: ReactNode): string[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<{ id: string }> => isValidElement(child))
    .map((child) => child.props.id)
    .filter(Boolean);
}

function CardSortingRoot({
  children,
  label,
  order: controlledOrder,
  defaultOrder,
  onOrderChange,
  className,
  ...rest
}: CardSortingProps) {
  const ids = useMemo(() => childIds(children), [children]);
  const [order, setOrder] = useControllableState<string[]>({
    ...(controlledOrder !== undefined ? { value: controlledOrder } : {}),
    defaultValue: defaultOrder ?? ids,
    ...(onOrderChange ? { onChange: onOrderChange } : {}),
  });

  // Children can appear and disappear; a stored order that still lists a
  // removed id would render nothing for it and silently drop a new one.
  // Known ids keep their place, new ones join at the end.
  const resolved = useMemo(() => {
    const known = order.filter((id) => ids.includes(id));
    return [...known, ...ids.filter((id) => !known.includes(id))];
  }, [order, ids]);

  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [isDraggingId, setIsDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef(new Map<string, HTMLElement>());
  const orderBeforeLift = useRef<string[] | null>(null);

  const registerRow = useCallback((id: string, node: HTMLElement | null) => {
    if (node) rows.current.set(id, node);
    else rows.current.delete(id);
  }, []);

  const say = useCallback(
    (id: string, verb: string, list: string[]) => {
      const index = list.indexOf(id);
      const name = rows.current.get(id)?.dataset["itemLabel"] ?? id;
      setAnnouncement(`${name}, ${verb}, position ${index + 1} of ${list.length}, in ${label}.`);
    },
    [label],
  );

  const moveTo = useCallback(
    (id: string, index: number) => {
      const from = resolved.indexOf(id);
      const to = Math.min(Math.max(index, 0), resolved.length - 1);
      if (from < 0 || from === to) return;
      const next = [...resolved];
      next.splice(to, 0, ...next.splice(from, 1));
      setOrder(next);
      say(id, "moved", next);
    },
    [resolved, setOrder, say],
  );

  const moveBy = useCallback(
    (id: string, delta: number) => moveTo(id, resolved.indexOf(id) + delta),
    [moveTo, resolved],
  );

  const lift = useCallback(
    (id: string) => {
      orderBeforeLift.current = resolved;
      setLiftedId(id);
      say(id, "lifted", resolved);
    },
    [resolved, say],
  );

  const drop = useCallback(() => {
    if (!liftedId) return;
    orderBeforeLift.current = null;
    say(liftedId, "dropped", resolved);
    setLiftedId(null);
  }, [liftedId, resolved, say]);

  const cancel = useCallback(() => {
    if (!liftedId) return;
    // Escape puts it BACK. A cancel that leaves the item where the arrows
    // happened to take it is not a cancel.
    if (orderBeforeLift.current) setOrder(orderBeforeLift.current);
    setAnnouncement(`Reordering cancelled, in ${label}.`);
    orderBeforeLift.current = null;
    setLiftedId(null);
  }, [liftedId, setOrder, label]);

  /**
   * Pointer drag. The target index comes from the MIDPOINT of each row rather
   * than from the pointer's own travel: rows differ in height, so a fixed
   * step would swap early on tall neighbours and late on short ones.
   */
  const beginDrag = useCallback(
    (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDraggingId(id);
      orderBeforeLift.current = resolved;
    },
    [resolved],
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isDraggingId) return;
      const y = event.clientY;
      // Measured against the OTHER rows, never the dragged one. Including it
      // makes the target depend on where the item currently sits, which shifts
      // the moment it moves — the index came out one short, and the list
      // juddered between two positions while the pointer stood still.
      // `moveTo`'s index is already post-removal, so this drops straight in.
      const others = resolved
        .filter((id) => id !== isDraggingId)
        .map((id) => rows.current.get(id))
        .filter((node): node is HTMLElement => Boolean(node));
      const before = others.findIndex((node) => {
        const box = node.getBoundingClientRect();
        return y < box.top + box.height / 2;
      });
      moveTo(isDraggingId, before === -1 ? others.length : before);
    },
    [isDraggingId, resolved, moveTo],
  );

  const endDrag = useCallback(() => {
    if (!isDraggingId) return;
    say(isDraggingId, "dropped", resolved);
    orderBeforeLift.current = null;
    setIsDraggingId(null);
  }, [isDraggingId, resolved, say]);

  const value = useMemo<SortingContext>(
    () => ({ order: resolved, liftedId, isDraggingId, lift, drop, cancel, moveBy, moveTo, registerRow, beginDrag }),
    [resolved, liftedId, isDraggingId, lift, drop, cancel, moveBy, moveTo, registerRow, beginDrag],
  );

  const rendered = useMemo(() => {
    const byId = new Map(
      Children.toArray(children)
        .filter((child): child is ReactElement<{ id: string }> => isValidElement(child))
        .map((child) => [child.props.id, child] as const),
    );
    return resolved.map((id) => byId.get(id)).filter(Boolean);
  }, [children, resolved]);

  return (
    <Sorting.Provider value={value}>
      <ul
        aria-label={label}
        data-slot="card-sorting"
        className={cn("flex list-none flex-col gap-sm", className)}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        {...rest}
      >
        {rendered}
      </ul>
      {/*
        One live region for all three input methods. `polite` rather than
        `assertive`: reordering is the user's own action, and interrupting them
        mid-gesture to describe it is worse than telling them a moment later.
      */}
      <div
        data-slot="card-sorting-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </Sorting.Provider>
  );
}

export interface CardSortingItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "id"> {
  children: ReactNode;
  /** Stable identity. This is what `order` is made of, so an index will break. */
  id: string;
  /**
   * What the announcements call this row. Required, because "item 3 moved to
   * position 1" is not a reorder anyone can follow.
   */
  label: string;
}

function CardSortingItem({ children, id, label, className, ...rest }: CardSortingItemProps) {
  const sorting = useSorting("Item");
  const handleId = useId();
  const isLifted = sorting.liftedId === id;
  const isDragging = sorting.isDraggingId === id;
  const position = sorting.order.indexOf(id) + 1;

  function onHandleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (isLifted) sorting.drop();
      else sorting.lift(id);
      return;
    }
    if (event.key === "Escape" && isLifted) {
      event.preventDefault();
      sorting.cancel();
      return;
    }
    // Arrows move only while LIFTED. Otherwise they would fight the browser's
    // own scrolling, and a stray arrow key would silently reorder a list the
    // user was only reading.
    if (!isLifted) return;
    if (event.key === "ArrowUp") { event.preventDefault(); sorting.moveBy(id, -1); }
    if (event.key === "ArrowDown") { event.preventDefault(); sorting.moveBy(id, 1); }
  }

  return (
    <li
      ref={(node) => sorting.registerRow(id, node)}
      data-slot="card-sorting-item"
      data-item-label={label}
      data-lifted={isLifted || undefined}
      data-dragging={isDragging || undefined}
      aria-labelledby={handleId}
      onClick={() => {
        // Click-to-place: with something lifted, any row is a destination.
        // This is the no-drag pointer path SC 2.5.7 asks for.
        if (sorting.liftedId && sorting.liftedId !== id) {
          sorting.moveTo(sorting.liftedId, sorting.order.indexOf(id));
          sorting.drop();
        }
      }}
      className={cn(
        "flex items-center gap-sm rounded-lg py-lg pr-lg pl-xs",
        "bg-elevated text-ink-primary",
        // outline, not border: the sheet draws a 1px edge on the active card,
        // and a border would add a pixel the resting card does not have and
        // nudge every row's content as it lifts.
        "outline-offset-0 data-[lifted]:outline data-[lifted]:outline-edge-focus",
        "data-[dragging]:outline data-[dragging]:outline-edge-focus data-[dragging]:shadow-md",
        "transition-[outline-color,box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        className,
      )}
      {...rest}
    >
      {/*
        A real Button — ghost, small, soft — not a bespoke control. It was
        `size-6 rounded-md`, which is the medium soft radius at a small size
        and matches nothing the sheet draws; Button's own small soft radius is
        4px. Every handler and aria attribute passes straight through.
      */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        id={handleId}
        data-slot="card-sorting-handle"
        aria-pressed={isLifted}
        aria-label={`Reorder ${label}, position ${position} of ${sorting.order.length}`}
        onKeyDown={onHandleKeyDown}
        onPointerDown={(event) => sorting.beginDrag(id, event)}
        onClick={() => {
          // A click that was not a drag lifts or drops. `isDraggingId` is
          // already cleared by pointerup, so a completed drag never also
          // toggles the lift.
          if (isLifted) sorting.drop();
          else sorting.lift(id);
        }}
        // The grab cursor is the handle's own affordance and displaces
        // Button's pointer via tailwind-merge (§5).
        className="cursor-grab touch-none select-none text-ink-muted active:cursor-grabbing"
        icon={<GripIcon />}
      />
      <div data-slot="card-sorting-content" className="flex min-w-0 flex-1 items-center justify-between gap-md">
        {children}
      </div>
    </li>
  );
}

/** The sheet's six-dot grip, at 16px. */
function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm1.5 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6-7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm1.5 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      />
    </svg>
  );
}

export const CardSorting = Object.assign(CardSortingRoot, {
  Item: CardSortingItem,
});
