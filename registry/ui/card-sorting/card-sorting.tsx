"use client";

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { DragIndicator } from "griddy-icons";

import { Button } from "@/ui/button";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * A reorderable list of cards.
 *
 * Built here rather than on a drag library (ADR 0012, AGENTS.md — independence).
 * That is not stubbornness: the accessible half of this pattern is the half a
 * drag library does not solve, and it is most of the work. Dragging is one of
 * three ways to reorder, and the other two carry the same weight —
 *
 *   POINTER DRAG   grab the handle, move, release. Escape, or a cancelled
 *                  pointer, puts the row back where it started.
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

/** What every message is told about the row it describes. */
export interface CardSortingMessageDetails {
  /** The row's own `label`. */
  label: string;
  /** The row's position, 1-based, in the order the message describes. */
  position: number;
  /** How many rows the list has. */
  total: number;
  /** The list's own `label`. */
  listLabel: string;
}

/**
 * Every string CardSorting speaks. All of them reach assistive technology
 * only, which is exactly why they are props: a string nobody SEES is the one a
 * localised product forgets, and a Slovak screen-reader user then hears English
 * for every step of a reorder (CONVENTIONS §9 — every user-visible string is a
 * prop, and "visible" includes heard).
 *
 * Functions rather than strings, because every phrase carries a position and a
 * count, and the word order around a number is the part a translator must own.
 */
export interface CardSortingMessages {
  /** The handle's accessible name. It names the row AND where it is. */
  handleLabel: (details: CardSortingMessageDetails) => string;
  /** A row was picked up — by Space, Enter, or a click on its handle. */
  lifted: (details: CardSortingMessageDetails) => string;
  /** A held or dragged row changed position. */
  moved: (details: CardSortingMessageDetails) => string;
  /** A row was put down where it now is. */
  dropped: (details: CardSortingMessageDetails) => string;
  /** Escape or a cancelled pointer put the row back; `position` is where it went back to. */
  cancelled: (details: CardSortingMessageDetails) => string;
}

const ENGLISH: CardSortingMessages = {
  handleLabel: ({ label, position, total }) => `Reorder ${label}, position ${position} of ${total}`,
  lifted: ({ label, position, total, listLabel }) => `${label}, lifted, position ${position} of ${total}, in ${listLabel}.`,
  moved: ({ label, position, total, listLabel }) => `${label}, moved, position ${position} of ${total}, in ${listLabel}.`,
  dropped: ({ label, position, total, listLabel }) => `${label}, dropped, position ${position} of ${total}, in ${listLabel}.`,
  cancelled: ({ listLabel }) => `Reordering cancelled, in ${listLabel}.`,
};

/**
 * How far the pointer must travel before a press on the handle is a DRAG
 * rather than a click. A click on the handle is the single-pointer path's
 * "lift", so the two have to be told apart — and a hand never presses
 * perfectly still. Pixels of pointer travel, not a visual dimension.
 */
const DRAG_SLOP = 4;

/** The live pointer gesture. A ref, not state: it is read inside the same event. */
interface Gesture {
  id: string;
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  /** Past the slop. Until then this press may still turn out to be a click. */
  didDrag: boolean;
}

interface SortingContext {
  order: string[];
  listLabel: string;
  messages: CardSortingMessages;
  liftedId: string | null;
  isDraggingId: string | null;
  lift: (id: string) => void;
  drop: () => void;
  cancel: () => void;
  moveBy: (id: string, delta: number) => void;
  moveTo: (id: string, index: number) => void;
  registerRow: (id: string, node: HTMLElement | null) => void;
  beginDrag: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  /** True exactly once, for the click that ends a drag. */
  consumeDragClick: () => boolean;
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
  /**
   * The phrases the handle and the live region speak. Each one passed
   * replaces its English default; a localised list should pass all five, or
   * the ones it leaves out stay English.
   */
  messages?: Partial<CardSortingMessages>;
}

/** Reads the ids the caller actually rendered, in source order. */
function childIds(children: ReactNode): string[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<{ id: string }> => isValidElement(child))
    .map((child) => child.props.id)
    .filter(Boolean);
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Releasing capture throws for a pointer that is no longer active. Never let it break a handler. */
function release(gesture: Gesture) {
  try {
    if (gesture.element.hasPointerCapture(gesture.pointerId)) {
      gesture.element.releasePointerCapture(gesture.pointerId);
    }
  } catch {
    // The pointer is already gone, which is what releasing it was for.
  }
}

function CardSortingRoot({
  children,
  label,
  order: controlledOrder,
  defaultOrder,
  onOrderChange,
  messages: consumerMessages,
  className,
  onPointerMove: onConsumerPointerMove,
  onPointerUp: onConsumerPointerUp,
  onPointerCancel: onConsumerPointerCancel,
  ...rest
}: CardSortingProps) {
  const ids = useMemo(() => childIds(children), [children]);
  const [order, setOrder] = useControllableState<string[]>({
    ...(controlledOrder !== undefined ? { value: controlledOrder } : {}),
    defaultValue: defaultOrder ?? ids,
    ...(onOrderChange ? { onChange: onOrderChange } : {}),
  });
  const messages = useMemo<CardSortingMessages>(() => ({ ...ENGLISH, ...consumerMessages }), [consumerMessages]);

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
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);

  const registerRow = useCallback((id: string, node: HTMLElement | null) => {
    if (node) rows.current.set(id, node);
    else rows.current.delete(id);
  }, []);

  const say = useCallback(
    (id: string, phrase: "lifted" | "moved" | "dropped" | "cancelled", list: string[]) => {
      setAnnouncement(
        messages[phrase]({
          label: rows.current.get(id)?.dataset["itemLabel"] ?? id,
          position: list.indexOf(id) + 1,
          total: list.length,
          listLabel: label,
        }),
      );
    },
    [messages, label],
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

  /**
   * Puts it BACK — for Escape during a lift, Escape during a drag, and a
   * cancelled pointer. A cancel that leaves the item where the arrows or the
   * pointer happened to take it is not a cancel. On a touch screen
   * `pointercancel` is the browser taking the gesture away, not the person
   * choosing a spot, so committing it would persist a move they abandoned.
   */
  const cancel = useCallback(() => {
    const live = gesture.current;
    if (live) {
      gesture.current = null;
      release(live);
      setIsDraggingId(null);
      // Escape mid-press: the pointer is still down, and the click its release
      // produces must not lift the row the person just put back.
      suppressClick.current = true;
    }
    const id = liftedId ?? (live?.didDrag ? live.id : null);
    if (!id) {
      // A press that never became a drag, cancelled: nothing moved, nothing to say.
      orderBeforeLift.current = null;
      return;
    }
    const restored = orderBeforeLift.current ?? resolved;
    if (!sameOrder(restored, resolved)) setOrder(restored);
    say(id, "cancelled", restored);
    orderBeforeLift.current = null;
    setLiftedId(null);
  }, [liftedId, resolved, setOrder, say]);

  /**
   * Pointer drag. The target index comes from the MIDPOINT of each row rather
   * than from the pointer's own travel: rows differ in height, so a fixed
   * step would swap early on tall neighbours and late on short ones.
   */
  const beginDrag = useCallback(
    (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      // A new press starts clean. A drag whose closing click never arrived
      // (released off the handle, capture refused) must not swallow this one.
      suppressClick.current = false;
      // Primary button only. A right click opens a context menu and a middle
      // click scrolls; neither is a request to move anything.
      if (event.button !== 0) return;
      const element = event.currentTarget;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Throws for a pointer that is no longer active. The drag still works
        // while the pointer stays over the list, which beats a broken handler.
      }
      gesture.current = {
        id,
        pointerId: event.pointerId,
        element,
        startX: event.clientX,
        startY: event.clientY,
        didDrag: false,
      };
      // Keep a lift's snapshot if one is open, so Escape restores the order
      // from before the LIFT, exactly as it would have without the drag.
      orderBeforeLift.current ??= resolved;
      setIsDraggingId(id);
    },
    [resolved],
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const live = gesture.current;
      if (!live || event.pointerId !== live.pointerId) return;
      if (!live.didDrag) {
        if (Math.hypot(event.clientX - live.startX, event.clientY - live.startY) < DRAG_SLOP) return;
        live.didDrag = true;
      }
      const y = event.clientY;
      // Measured against the OTHER rows, never the dragged one. Including it
      // makes the target depend on where the item currently sits, which shifts
      // the moment it moves — the index came out one short, and the list
      // juddered between two positions while the pointer stood still.
      // `moveTo`'s index is already post-removal, so this drops straight in.
      const others = resolved
        .filter((id) => id !== live.id)
        .map((id) => rows.current.get(id))
        .filter((node): node is HTMLElement => Boolean(node));
      const before = others.findIndex((node) => {
        const box = node.getBoundingClientRect();
        return y < box.top + box.height / 2;
      });
      moveTo(live.id, before === -1 ? others.length : before);
    },
    [resolved, moveTo],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const live = gesture.current;
      if (!live || event.pointerId !== live.pointerId) return;
      gesture.current = null;
      release(live);
      setIsDraggingId(null);
      if (!liftedId) orderBeforeLift.current = null;
      // A press that never travelled was a CLICK: its own click event lifts or
      // drops, and saying "dropped" first would describe a drag that did not
      // happen.
      if (!live.didDrag) return;
      // The pointer was captured on the handle, so the click this release
      // produces lands there too — and a finished drag must not also lift.
      suppressClick.current = true;
      say(live.id, "dropped", resolved);
    },
    [liftedId, resolved, say],
  );

  const consumeDragClick = useCallback(() => {
    const swallow = suppressClick.current;
    suppressClick.current = false;
    return swallow;
  }, []);

  // Escape during a pointer drag. Listened for on the document rather than on
  // the handle, because a press does not focus a button in every browser
  // (Safari leaves focus where it was), and someone pressing Escape mid-drag
  // is not thinking about where focus is.
  useEffect(() => {
    if (!isDraggingId) return;
    function onKeyDown(event: KeyboardEvent) {
      // The handle's own keydown runs first and has already cancelled.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      cancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDraggingId, cancel]);

  const value = useMemo<SortingContext>(
    () => ({
      order: resolved,
      listLabel: label,
      messages,
      liftedId,
      isDraggingId,
      lift,
      drop,
      cancel,
      moveBy,
      moveTo,
      registerRow,
      beginDrag,
      consumeDragClick,
    }),
    [resolved, label, messages, liftedId, isDraggingId, lift, drop, cancel, moveBy, moveTo, registerRow, beginDrag, consumeDragClick],
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
        {...rest}
        aria-label={label}
        data-slot="card-sorting"
        className={cn("flex list-none flex-col gap-sm", className)}
        onPointerMove={composeEventHandlers(onConsumerPointerMove, onDragMove)}
        onPointerUp={(event) => {
          onConsumerPointerUp?.(event);
          // Ending a drag is cleanup, not optional behaviour: a consumer must
          // not be able to strand the list in a dragging state.
          endDrag(event);
        }}
        onPointerCancel={(event) => {
          onConsumerPointerCancel?.(event);
          // The same invariant with the opposite outcome: the browser took the
          // gesture away, so the row goes back to where it started.
          const live = gesture.current;
          if (live && event.pointerId === live.pointerId) cancel();
        }}
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

interface ItemContext {
  id: string;
  label: string;
  handleId: string;
  /** A placed Handle registers itself, so the default grip steps aside. */
  registerHandle: () => () => void;
}

const Item = createContext<ItemContext | null>(null);

function useItem(): ItemContext {
  const value = useContext(Item);
  if (!value) throw new Error("CardSorting.Handle must be rendered inside CardSorting.Item.");
  return value;
}

/**
 * Whether the caller placed a Handle anywhere in the row's own JSX. Read during
 * render, so the first paint — and a server's HTML — never carries two grips
 * sharing one id. A Handle rendered from inside another component is invisible
 * to this, and is caught by registration instead.
 */
function containsHandle(node: ReactNode): boolean {
  return Children.toArray(node).some(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (child.type === CardSortingHandle || containsHandle(child.props.children)),
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

function CardSortingItem({ children, id, label, className, onClick, ...rest }: CardSortingItemProps) {
  const sorting = useSorting("Item");
  const handleId = useId();
  const isLifted = sorting.liftedId === id;
  const isDragging = sorting.isDraggingId === id;

  const [registeredHandles, setRegisteredHandles] = useState(0);
  const registerHandle = useCallback(() => {
    setRegisteredHandles((count) => count + 1);
    return () => setRegisteredHandles((count) => count - 1);
  }, []);
  const hasPlacedHandle = registeredHandles > 0 || containsHandle(children);

  const item = useMemo<ItemContext>(
    () => ({ id, label, handleId, registerHandle }),
    [id, label, handleId, registerHandle],
  );

  return (
    <Item.Provider value={item}>
      <li
        {...rest}
        ref={(node) => sorting.registerRow(id, node)}
        data-slot="card-sorting-item"
        data-item-label={label}
        data-lifted={isLifted || undefined}
        data-dragging={isDragging || undefined}
        aria-labelledby={handleId}
        onClick={composeEventHandlers(onClick, () => {
          // Click-to-place: with something lifted, any row is a destination.
          // This is the no-drag pointer path SC 2.5.7 asks for.
          if (sorting.liftedId && sorting.liftedId !== id) {
            sorting.moveTo(sorting.liftedId, sorting.order.indexOf(id));
            sorting.drop();
          }
        })}
        className={cn(
          "flex items-center gap-sm rounded-lg py-lg",
          // pl-xs makes room for the leading grip's own 24px box, which the
          // sheet draws close to the card's edge. A placed Handle takes no
          // lane, so the content gets the card's full inset back.
          hasPlacedHandle ? "px-lg" : "pr-lg pl-xs",
          "bg-elevated text-ink-primary",
          // outline, not border: the sheet draws a 1px edge on the active card,
          // and a border would add a pixel the resting card does not have and
          // nudge every row's content as it lifts.
          "outline-offset-0 data-[lifted]:outline data-[lifted]:outline-edge-focus",
          "data-[dragging]:outline data-[dragging]:outline-edge-focus data-[dragging]:shadow-md",
          "transition-[outline-color,box-shadow]", motionMicro,
          className,
        )}
      >
        {hasPlacedHandle ? null : <HandleButton />}
        <div data-slot="card-sorting-content" className="flex min-w-0 flex-1 items-center justify-between gap-md">
          {children}
        </div>
      </li>
    </Item.Provider>
  );
}

/**
 * The handle's own props. Its name, id, pressed state and type are the
 * contract (§5 — contract props win), so they are not accepted at all rather
 * than accepted and silently overwritten.
 */
export type CardSortingHandleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "id" | "type" | "disabled" | "aria-label" | "aria-labelledby" | "aria-pressed"
>;

/**
 * The grip, wired. Shared by the default leading grip and a placed
 * `CardSorting.Handle`, so the two cannot drift: one keyboard contract, one
 * pointer path, one accessible name.
 */
const HandleButton = forwardRef<HTMLButtonElement, CardSortingHandleProps>(function HandleButton(
  { className, onKeyDown, onPointerDown, onClick, ...rest },
  ref,
) {
  const sorting = useSorting("Handle");
  const { id, label, handleId } = useItem();
  const isLifted = sorting.liftedId === id;
  const isDragging = sorting.isDraggingId === id;

  function onHandleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (isLifted) sorting.drop();
      else sorting.lift(id);
      return;
    }
    if (event.key === "Escape" && (isLifted || isDragging)) {
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

  function onHandleClick() {
    // The click that ends a drag is the release, not a request to lift.
    if (sorting.consumeDragClick()) return;
    // A click that was not a drag lifts or drops.
    if (isLifted) sorting.drop();
    else sorting.lift(id);
  }

  // A real Button — ghost, small, soft — not a bespoke control. It was
  // `size-6 rounded-md`, which is the medium soft radius at a small size and
  // matches nothing the sheet draws; Button's own small soft radius is 4px.
  // Every handler and aria attribute passes straight through.
  return (
    <Button
      {...rest}
      ref={ref}
      variant="ghost"
      size="sm"
      isIconOnly
      id={handleId}
      data-slot="card-sorting-handle"
      aria-pressed={isLifted}
      aria-label={sorting.messages.handleLabel({
        label,
        position: sorting.order.indexOf(id) + 1,
        total: sorting.order.length,
        listLabel: sorting.listLabel,
      })}
      onKeyDown={composeEventHandlers(onKeyDown, onHandleKeyDown)}
      onPointerDown={composeEventHandlers(onPointerDown, (event) => sorting.beginDrag(id, event))}
      onClick={composeEventHandlers(onClick, onHandleClick)}
      // The grab cursor is the handle's own affordance and displaces
      // Button's pointer via tailwind-merge (§5).
      className={cn("cursor-grab touch-none select-none text-ink-muted active:cursor-grabbing", className)}
      icon={<GripIcon />}
    />
  );
});

/**
 * The grip, placed by the caller — in a tile's corner, at the row's end,
 * wherever the design puts it. It carries the whole keyboard and pointer
 * contract and the row's accessible name, and the row renders no leading grip
 * of its own while one is present.
 */
const CardSortingHandle = forwardRef<HTMLButtonElement, CardSortingHandleProps>(function CardSortingHandle(
  props,
  ref,
) {
  const { registerHandle } = useItem();
  // A layout effect, so the default grip is gone before the browser paints
  // for a Handle the render-time scan could not see.
  useLayoutEffect(() => registerHandle(), [registerHandle]);
  return <HandleButton {...props} ref={ref} />;
});

/** The sheet's six-dot grip, at 16px. */
function GripIcon() {
  return <DragIndicator size={16} aria-hidden="true" />;
}

export const CardSorting = Object.assign(CardSortingRoot, {
  Item: CardSortingItem,
  Handle: CardSortingHandle,
});
