"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `modal.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Dismissal thresholds. Either one alone closes it.
 *
 * Distance catches the deliberate push; velocity catches the flick, which
 * travels almost no distance before the finger leaves the glass. A drawer that
 * only measured distance would ignore the fastest, most confident gesture a
 * user can make.
 */
const CLOSE_DISTANCE_PX = 96;
const CLOSE_VELOCITY_PX_PER_MS = 0.5;

/**
 * Distance that commits a drag to the NEXT detent.
 *
 * Deliberately shorter than CLOSE_DISTANCE_PX: moving between resting heights
 * is a smaller decision than dismissing, and asking for the same 96px to go
 * half-open as to throw the drawer away makes the detent feel stuck.
 */
const SNAP_DISTANCE_PX = 48;

/** Lets the handle close a drawer that owns its own state. */
const DrawerClose_ = createContext<(() => void) | null>(null);

export interface DrawerProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the drawer own it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Allow dismissal by Escape and by tapping the scrim. On by default. Note
   * this does NOT disable the drag: the handle is the drawer's defining
   * affordance, and a drawer you can grab but not move is broken furniture.
   */
  isDismissable?: boolean;
}

/**
 * A panel that comes up from the bottom and is dismissed by dragging it down.
 *
 * Distinct from Sheet, and the distinction is the gesture rather than the
 * geometry (CONVENTIONS §7a). A Sheet is anchored to a side edge and dismissed
 * by scrim or Escape; a Drawer carries a handle, follows the finger, and closes
 * when the drag passes a distance or a velocity. Adding `side="bottom"` to a
 * Sheet would produce a drawer that cannot be dragged, which is the worst of
 * both — so they are two components.
 *
 * The gesture is ours. Base UI supplies the focus trap, the scroll lock,
 * Escape and focus restoration (ADR 0012); no drag library enters the
 * dependency list for it (AGENTS.md — independence).
 *
 * Open state is held HERE rather than left to Base UI, because the handle has
 * to be able to close a drawer that nobody is controlling from outside.
 */
function DrawerRoot({ children, isOpen, defaultIsOpen, onOpenChange, isDismissable = true }: DrawerProps) {
  const [open, setOpen] = useControllableState({
    ...(isOpen !== undefined ? { value: isOpen } : {}),
    defaultValue: defaultIsOpen ?? false,
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });

  return (
    <DrawerClose_.Provider value={() => setOpen(false)}>
      <BaseDialog.Root
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Root>>({
          open,
          onOpenChange: (next: boolean, details: { reason?: string; cancel: () => void }) => {
            // There is no `dismissible` prop on Base UI's Dialog; opting out
            // means CANCELLING the two incidental reasons. An explicit close
            // and a programmatic change must still work.
            if (
              !isDismissable &&
              !next &&
              (details?.reason === "escape-key" || details?.reason === "outside-press")
            ) {
              details.cancel();
              return;
            }
            setOpen(next);
          },
        })}
      >
        {children}
      </BaseDialog.Root>
    </DrawerClose_.Provider>
  );
}

export interface DrawerTriggerProps {
  children?: ReactNode;
  /** Slot: the control that opens it. Passed through, never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function DrawerTrigger({ children, render, className }: DrawerTriggerProps) {
  return (
    <BaseDialog.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Trigger>>({
        "data-slot": "drawer-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Trigger>
  );
}

export interface DrawerPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "aria-label"> {
  /**
   * Refused, not overridden — `label` sets it. See the identical note in
   * `sheet.tsx`: TypeScript lets any UNDECLARED hyphenated attribute through,
   * so omitting this would make the prop more permissive, not less.
   */
  "aria-label"?: never;
  /**
   * Required — a dialog with no accessible name is announced as "dialog" and
   * nothing else. Use the same words as the visible Drawer.Title when there
   * is one.
   */
  label: string;
  /** Accessible name for the drag handle, which is also a close button. */
  handleLabel?: string;
  /** Where to portal the panel. See the fuller note in `sheet.tsx`. */
  container?: HTMLElement | null;
  /**
   * Resting heights, as fractions of the viewport, ASCENDING — `[0.5, 0.9]`.
   *
   * Omit and the drawer keeps one resting height sized to its content, which
   * is what the sheet drew before the half-open state existed. The unit is
   * `dvh` rather than `vh`: on mobile `vh` is the viewport with the browser
   * chrome hidden, so a 50% drawer is not half the screen until you scroll.
   */
  snapPoints?: number[];
  /** Controlled detent, as an INDEX into `snapPoints`. */
  snapPoint?: number;
  defaultSnapPoint?: number;
  /** Always `onSnapPointChange(index)` — never onExpand/onCollapse (§1). */
  onSnapPointChange?: (index: number) => void;
}

function DrawerPanel({
  children,
  className,
  label,
  handleLabel,
  container,
  snapPoints,
  snapPoint,
  defaultSnapPoint,
  onSnapPointChange,
  ...rest
}: DrawerPanelProps) {
  const close = useContext(DrawerClose_);
  // An empty array is not "no detents" by accident — it is a caller passing a
  // computed list that came back empty, and falling back to the content-sized
  // drawer is the only behaviour that does not render a zero-height panel.
  const detents = snapPoints && snapPoints.length > 0 ? snapPoints : null;
  const [detent, setDetent] = useControllableState({
    ...(snapPoint !== undefined ? { value: snapPoint } : {}),
    defaultValue: defaultSnapPoint ?? 0,
    ...(onSnapPointChange ? { onChange: onSnapPointChange } : {}),
  });
  const index = detents ? Math.min(Math.max(detent, 0), detents.length - 1) : 0;
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  /**
   * `start` anchors the distance; `prev` anchors the velocity.
   *
   * Velocity is measured over the LAST segment of the gesture, not averaged
   * across the whole of it. Averaging punishes the common shape — grab, pause
   * to read, then decide — by reporting a slow flick, and rewards a fast grab
   * followed by a long hold with a flick it never made. What matters is how
   * fast the finger was travelling when it left the glass.
   */
  const drag = useRef<{ startY: number; prevY: number; prevT: number } | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    // Capture, so the drag survives the pointer leaving the 32px handle — it
    // will, immediately, because the panel moves out from under the finger.
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, prevY: event.clientY, prevT: event.timeStamp };
    setIsDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    // Upward movement is only honest when there IS a taller detent to reach.
    // Without one, rubber-banding up would promise an expansion that cannot
    // happen — which is why this was downward-only before detents existed.
    const dy = event.clientY - state.startY;
    setOffset(detents ? dy : Math.max(0, dy));
    state.prevY = event.clientY;
    state.prevT = event.timeStamp;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    drag.current = null;
    setIsDragging(false);
    if (!state) return;
    const dy = event.clientY - state.startY;
    const velocity = (event.clientY - state.prevY) / Math.max(1, event.timeStamp - state.prevT);

    if (!detents) {
      if (dy >= CLOSE_DISTANCE_PX || velocity >= CLOSE_VELOCITY_PX_PER_MS) close?.();
      setOffset(0);
      return;
    }

    // With detents a downward drag STEPS rather than dismisses, and only
    // dismisses from the lowest one. Dragging a drawer from full height
    // straight off the screen would skip the state the detent exists to
    // offer, and is the surest way to lose whatever is in the drawer.
    const committedDown = dy >= SNAP_DISTANCE_PX || velocity >= CLOSE_VELOCITY_PX_PER_MS;
    const committedUp = -dy >= SNAP_DISTANCE_PX || -velocity >= CLOSE_VELOCITY_PX_PER_MS;
    if (committedDown) {
      if (index <= 0) close?.();
      else setDetent(index - 1);
    } else if (committedUp) {
      setDetent(Math.min(detents.length - 1, index + 1));
    }
    // Always returns to rest. On close the panel unmounts through its exit
    // transition from wherever it was, and leaving a stale offset behind would
    // reopen it part-way down.
    setOffset(0);
  }

  return (
    <BaseDialog.Portal {...(container ? { container } : {})}>
      <BaseDialog.Backdrop
        data-slot="drawer-scrim"
        className={cn(
          "fixed inset-0 bg-scrim",
          "transition-opacity duration-(--ui-duration-base) ease-(--ui-ease-out)",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <BaseDialog.Popup
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(rest)}
        aria-label={label}
        data-slot="drawer-panel"
        data-dragging={isDragging || undefined}
        data-snap-point={detents ? index : undefined}
        style={{
          ...(offset ? { translate: `0 ${offset}px` } : {}),
          // `dvh`, not `vh`: on mobile `vh` is the viewport with the browser
          // chrome HIDDEN, so a 0.5 detent is not half of what anyone can see
          // until the page has been scrolled. dvh tracks the chrome.
          ...(detents ? { height: `${detents[index]! * 100}dvh` } : {}),
        }}
        className={cn(
          // Inset 4px on three sides rather than flush: the sheet floats the
          // panel inside its window, which is why all four corners are rounded
          // and why it keeps a border. A Sheet is edge-flush, so a border there
          // would be a seam against the viewport.
          "fixed inset-x-xs bottom-xs flex flex-col overflow-clip rounded-lg",
          // 80% is DERIVED — the sheet draws one drawer nearly filling its
          // window. A cap matters: the strip of scrim above the drawer is what
          // says it can be pushed away. With detents the tallest one IS the
          // cap, and applying both would silently truncate a 0.9 snap point.
          !detents && "max-h-4/5",
          "bg-base text-ink-primary border border-edge-subtle shadow-md",
          "transition-[translate,opacity] duration-(--ui-duration-base) ease-(--ui-ease-out)",
          "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
          // While a finger is down the panel must track it exactly. A
          // transition here would lag the drag by a frame and feel like syrup.
          isDragging && "transition-none",
          className,
        )}
      >
        <button
          type="button"
          data-slot="drawer-handle"
          // "Close" is a lie once the handle steps between heights, and the
          // label is the only thing a screen-reader user has to go on.
          aria-label={handleLabel ?? (detents ? "Resize drawer" : "Close")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => {
            // A tap, not a drag. WCAG 2.5.7 requires a single-pointer
            // alternative to EVERY dragging movement, and this is it — the
            // same control, without the gesture.
            //
            // With detents the drag can do three things, so the tap has to
            // reach all three: it steps up, and wraps from the tallest back to
            // the shortest so collapsing is reachable too. Dismissal stays on
            // the scrim and Escape, which are already single-pointer and
            // keyboard paths — a tap that sometimes expanded and sometimes
            // threw the drawer away would be worse than either.
            if (drag.current) return;
            if (!detents) { close?.(); return; }
            setDetent(index >= detents.length - 1 ? 0 : index + 1);
          }}
          className={cn(
            // 32px tall, which is what the sheet draws and what SC 2.5.8 wants:
            // the 8px bar alone would be an 8px target.
            "flex w-full shrink-0 cursor-grab items-center justify-center pt-sm pb-lg",
            // The browser must not scroll or select while the finger drags.
            "touch-none select-none active:cursor-grabbing",
            "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
          )}
        >
          <span data-slot="drawer-handle-bar" className="h-sm w-3/10 rounded-full bg-sunken" />
        </button>
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export type DrawerTitleProps = HTMLAttributes<HTMLHeadingElement>;

function DrawerTitle({ className, ...rest }: DrawerTitleProps) {
  return (
    <BaseDialog.Title
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Title>>(rest)}
      data-slot="drawer-title"
      className={cn(
        // body-lg, NOT title-sm: both peak at 16px but the title roles are
        // fluid, and a drawer is at its narrowest on the phone where the sheet
        // draws this at 16. The same trap Sidebar hit.
        "line-clamp-1 text-body-lg font-body font-bold leading-normal tracking-tight text-ink-primary",
        className,
      )}
    />
  );
}

export type DrawerBodyProps = HTMLAttributes<HTMLDivElement>;

/** The content region. Scrolls when the drawer hits its cap. */
function DrawerBody({ className, ...rest }: DrawerBodyProps) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex min-h-0 flex-col gap-sm overflow-y-auto p-lg", className)}
      {...rest}
    />
  );
}

export type DrawerFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * The action region. Buttons STACK, full width — unlike Modal's row, because
 * a drawer is a thumb surface and a full-width target at the bottom of the
 * screen is the easiest thing on it to hit.
 */
function DrawerFooter({ className, ...rest }: DrawerFooterProps) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("flex shrink-0 flex-col gap-sm p-lg", className)}
      {...rest}
    />
  );
}

export interface DrawerCloseProps {
  children?: ReactNode;
  /** Slot: the control that dismisses. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function DrawerCloseControl({ children, render, className }: DrawerCloseProps) {
  return (
    <BaseDialog.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Close>>({
        "data-slot": "drawer-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Close>
  );
}

export const Drawer = Object.assign(DrawerRoot, {
  Trigger: DrawerTrigger,
  Panel: DrawerPanel,
  Title: DrawerTitle,
  Body: DrawerBody,
  Footer: DrawerFooter,
  Close: DrawerCloseControl,
});
