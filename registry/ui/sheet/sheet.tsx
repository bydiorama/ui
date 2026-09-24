"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { motionStandard } from "@/lib/motion";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `modal.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

/** The shape of Base UI's change-event details we rely on, restated locally so
 *  no third-party type reaches an exported signature (ADR 0002). */
interface DismissDetails {
  reason?: string;
  cancel: () => void;
}

export type SheetSide = "left" | "right";
export type SheetSize = "sm" | "md" | "lg";

/**
 * The panel is flush against three viewport edges and only the INNER two
 * corners are rounded — the sheet draws `borderTopRightRadius` and
 * `borderBottomRightRadius` for a left drawer and the mirror for a right one.
 * A fully rounded panel would leave four slivers of scrim in the screen
 * corners, which is what a modal looks like, not a drawer.
 */
const SIDE = {
  left: {
    edge: "left-0 rounded-r-lg",
    // `translate`, never `transform`: Tailwind v4's translate-* writes the
    // standalone property, so a transition naming transform animates nothing
    // and the drawer would appear fully open. `check:utilities` enforces this.
    offscreen: "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  },
  right: {
    edge: "right-0 rounded-l-lg",
    offscreen: "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  },
} as const satisfies Record<SheetSide, { edge: string; offscreen: string }>;

/**
 * Three caps, all of them width tokens that already existed.
 *
 * A Sheet that needed its own width scale would be asking for a token nothing
 * else could reach: `sm` is the navigation rail's own width because a Sidebar
 * is what that size holds, and `md`/`lg` are Modal's two dialog widths, so a
 * panel and a dialog carrying the same form are the same width.
 *
 * These are `--spacing-*` entries in the emitted theme, NOT `--container-*` —
 * `max-w-md` would read Tailwind's container scale, fall back to this system's
 * `--spacing-md`, and cap the panel at 12px. Modal shipped that defect; its
 * browser test now pins 416 and 640, and Sheet's pins all three.
 */
const SIZE = {
  sm: "max-w-nav",
  md: "max-w-dialog-md",
  lg: "max-w-dialog-lg",
} as const satisfies Record<SheetSize, string>;

/**
 * Which edges of the Body have content hidden behind them.
 *
 * Held on the Panel rather than the Body because the two parts that render it
 * — Header and Footer — are the Body's SIBLINGS, and a sibling cannot read a
 * sibling's state. The Panel stamps it as `data-overflow-*` and owns the
 * `group/sheet` name the two hairlines key off.
 */
interface SheetOverflow {
  top: boolean;
  bottom: boolean;
}

interface SheetPanelValue {
  /** The dialog's accessible name, reused to name the scroll region. */
  label: string;
  overflow: SheetOverflow;
  setOverflow: (next: SheetOverflow) => void;
}

const SheetPanel_ = createContext<SheetPanelValue | null>(null);

export interface SheetProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the sheet own it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Allow dismissal by Escape and by tapping the scrim. On by default: a
   * drawer is a navigation surface, and tapping outside to leave is the
   * gesture every phone user already has.
   */
  isDismissable?: boolean;
}

/**
 * A panel anchored to the left or right edge of the viewport, full height,
 * over a scrim — the surface a narrow screen uses for what a wide one keeps
 * docked: the navigation rail, a filter set, a record edited beside the page.
 *
 * Third component on the Base UI behaviour layer (ADR 0012) and deliberately
 * Modal's shape: focus trapping, scroll locking, Escape, outside-press and
 * focus restoration are the same problem, and a drawer that solved them again
 * by hand would solve them worse. What differs is only where the panel sits.
 *
 * Sheet and Drawer are NOT side variants of each other (§7a). A Drawer's
 * contract is a gesture — a handle, a velocity threshold, a body that follows
 * the finger — so there is no `side="bottom"` here, and never will be: it
 * would be a Drawer that cannot be dragged.
 */
function SheetRoot({ children, isOpen, defaultIsOpen, onOpenChange, isDismissable = true }: SheetProps) {
  return (
    <BaseDialog.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Root>>({
        ...(isOpen !== undefined ? { open: isOpen } : {}),
        ...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {}),
        onOpenChange: (open: boolean, details: DismissDetails) => {
          // Base UI has no `dismissible` prop; opting out means CANCELLING the
          // two incidental reasons. An explicit Sheet.Close (`close-press`)
          // and a programmatic change must still work, or it cannot be closed.
          if (
            !isDismissable &&
            !open &&
            (details?.reason === "escape-key" || details?.reason === "outside-press")
          ) {
            details.cancel();
            return;
          }
          onOpenChange?.(open);
        },
      })}
    >
      {children}
    </BaseDialog.Root>
  );
}

export interface SheetTriggerProps {
  children?: ReactNode;
  /** Slot: the control that opens it. Passed through, never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function SheetTrigger({ children, render, className }: SheetTriggerProps) {
  return (
    <BaseDialog.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Trigger>>({
        "data-slot": "sheet-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Trigger>
  );
}

export interface SheetPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "aria-label"> {
  /**
   * Refused, not overridden. `label` sets aria-label, so a second one would be
   * silently discarded, and a dialog quietly announcing the wrong name is the
   * exact failure `label` exists to prevent.
   *
   * It must be DECLARED as never rather than merely omitted: TypeScript lets
   * any undeclared hyphenated attribute through on a JSX component — that is
   * how `data-*` works — so omitting it made the prop MORE permissive, which
   * the type test caught by reporting an unused @ts-expect-error.
   */
  "aria-label"?: never;
  /**
   * Required — a dialog with no accessible name is announced as "dialog" and
   * nothing else. Use the same words as a visible `Sheet.Title` when there is
   * one: both are set, and `aria-labelledby` wins, so two that disagree
   * announce the Title and leave this one silently unused.
   *
   * It also names the scroll region inside `Sheet.Body`, which is why it lives
   * on the Panel rather than being a second prop further down.
   */
  label: string;
  side?: SheetSide;
  /**
   * The panel's width CAP. Defaults to `sm`, which is the geometry Sheet has
   * always shipped, so adding this axis moves nothing that already renders.
   *
   * Reach for `md` whenever the panel is not holding the navigation rail — a
   * filter set, a short form, a record. `lg` is the working panel: wide enough
   * for a field row to hold two controls.
   */
  size?: SheetSize;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope applied to a wrapper and paints theme zero —
   * visible as a drawer that stays Diorama-blue inside a client's yellow
   * portal. Pass the themed element and the panel inherits from it again.
   *
   * It is a prop rather than something resolved automatically because the
   * container becomes the panel's containing block: an ancestor with a
   * transform or `overflow: hidden` would clip a full-height fixed drawer, and
   * only the caller knows whether theirs is safe.
   */
  container?: HTMLElement | null;
}

function SheetPanel({
  children,
  className,
  label,
  side = "left",
  size = "sm",
  container,
  ...rest
}: SheetPanelProps) {
  const [overflow, setOverflowState] = useState<SheetOverflow>({ top: false, bottom: false });

  // Bail out when nothing changed. `Sheet.Body` measures on every scroll event,
  // and a setState per frame would re-render the whole panel for a boolean that
  // flips twice in a scroll: returning the previous object makes React skip the
  // update entirely rather than diffing its way to the same tree.
  const setOverflow = useCallback((next: SheetOverflow) => {
    setOverflowState((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
  }, []);

  const value = useMemo<SheetPanelValue>(
    () => ({ label, overflow, setOverflow }),
    [label, overflow, setOverflow],
  );

  return (
    <BaseDialog.Portal {...(container ? { container } : {})}>
      <BaseDialog.Backdrop
        data-slot="sheet-scrim"
        className={cn(
          // Scrim and panel take the SAME role, so the pair moves as one.
          "fixed inset-0 z-(--ui-z-overlay) bg-scrim",
          "transition-opacity", motionStandard,
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <BaseDialog.Popup
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(rest)}
        aria-label={label}
        data-slot="sheet-panel"
        data-side={side}
        data-size={size}
        data-overflow-top={overflow.top || undefined}
        data-overflow-bottom={overflow.bottom || undefined}
        className={cn(
          // Full height, flush to one edge. `inset-y-0` rather than a height:
          // a drawer is as tall as the screen, and 100vh lies on mobile.
          //
          // --ui-z-overlay. Carrying no z at all was the bug: the affix
          // Header at z-100 is a positive z in the ROOT stacking context, and
          // that paints above a z-auto positioned element whatever the DOM
          // order — so a portalled panel with no z sat under the bar. The nav
          // composition's Menus stay in front from --ui-z-dropdown.
          "fixed inset-y-0 z-(--ui-z-overlay) flex flex-col",
          // NAMED, because Header and Footer key their hairlines off the
          // panel's overflow state and an unnamed `group` would also match a
          // group in whatever the caller puts inside.
          "group/sheet",
          // 80% of the viewport, as drawn (256 of 320). Floored at that same
          // 256 because a `fixed` element resolves against the nearest
          // TRANSFORMED ancestor — Storybook's docs blocks transform their
          // preview, so a percentage silently scopes to a docs cell.
          //
          // SIZE[size] is the ONLY max-width in this list, and the reason is
          // not the one recorded here until 2026-09-04. That comment said
          // tailwind-merge "silently drops the rest". It did not: `dialog-md`
          // and `dialog-lg` were not registered in cn.ts, so the merger could
          // not CLASSIFY them, kept every competing max-width, and stylesheet
          // order picked the winner. Nothing was dropped — the cascade
          // decided, which is the failure cn() exists to prevent.
          //
          // Now that they are registered, the merge is real and this list is
          // genuinely last-wins. So a second max-width here would drop the
          // size for real. A viewport cap has to be ONE class — `min()` in a
          // single arbitrary value — not two racing declarations.
          "w-4/5 min-w-64",
          SIZE[size],
          SIDE[side].edge,
          // The fallback scroller, for a caller who fills the panel directly
          // rather than using Sheet.Body — which is what the navigation
          // composition does. With a Body present the three regions exactly
          // fill the fixed height, so this never engages.
          "overflow-y-auto",
          // shadow-md, the value the sheet draws and the one Drawer takes from
          // the same drawing. Approved 2026-08-25 over Modal's shadow-sm, and
          // it is doing real work rather than decorating: the panel and the
          // page are both --ui-bg-base, so in light the scrim leaves only a
          // 1.16:1 step between them and a single 0.5px blur does not close it.
          // Dark reaches 1.61:1 on its own, because that scrim is black at 55%.
          "bg-base text-ink-primary shadow-md",
          "transition-[translate,opacity]", motionStandard,
          SIDE[side].offscreen,
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          className,
        )}
      >
        <SheetPanel_.Provider value={value}>{children}</SheetPanel_.Provider>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

/**
 * The seam between a pinned region and the scrolling one, drawn as an INSET
 * BOX-SHADOW rather than a border. The difference is one pixel of layout.
 *
 * `h-12` is a border-box height, so a `border-b` on the band takes its pixel
 * out of the content lane: 48 − 1 − 8 − 8 leaves 31 for a 32px control, and
 * `items-center` pays the difference out as 7.5 above and 8.5 below. That is
 * the Tabs defect exactly — a fixed height fighting a declared inset — and it
 * is why the sheet's uniform 8px inset cannot survive a border here. Header's
 * own bar carries it today for the same reason and has no geometry spec to
 * catch it.
 *
 * A box-shadow costs no layout at all, so the band keeps a true 32px lane and
 * `uniform-inset` can prove it. Header's principle is kept rather than dropped:
 * the shadow is ALWAYS declared and only its colour changes, so there is
 * nothing to jog and the change is animatable.
 *
 * `inset-shadow-*` rather than `shadow-[inset_…]`: v4 gives the inset a slot of
 * its own, so a caller adding `shadow-*` through className composes with the
 * hairline instead of evicting it. Header takes the same spelling, where it
 * has to — the affix state stacks a `shadow-lg` on the same element.
 */
const HAIRLINE = {
  header:
    "inset-shadow-[0_-1px_0_transparent] group-data-[overflow-top]/sheet:inset-shadow-[0_-1px_0_var(--ui-border-subtle)]",
  footer:
    "inset-shadow-[0_1px_0_transparent] group-data-[overflow-bottom]/sheet:inset-shadow-[0_1px_0_var(--ui-border-subtle)]",
} as const;

export type SheetHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * The 48px chrome band at the top of the panel. Pinned — it does not scroll
 * with the body.
 *
 * The same 48px as Header's bar, so the band and the bar it covers sit at one
 * height. `p-sm` is uniform on purpose: 8 + 32 + 8 = 48 makes the height and
 * the padding agree rather than one of them being a second author of the
 * inset, and the 8 plus a 32px chrome control's own 8 puts the glyph on the
 * body's 16px lane.
 *
 * It holds chrome controls — a fill with no edge, which is page chrome and not
 * a Button (§7b) — never a Title: at this 8px inset a text node would miss the
 * body's 16px lane by exactly 8. The Title goes at the top of Sheet.Body.
 *
 * Optional, and deliberately absent from the navigation composition, where
 * Sidebar.Group is already a 48px band at the same inset.
 */
function SheetHeader({ className, ...rest }: SheetHeaderProps) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-sm p-sm",
        "transition-[box-shadow]", motionStandard,
        HAIRLINE.header,
        className,
      )}
      {...rest}
    />
  );
}

export type SheetTitleProps = HTMLAttributes<HTMLHeadingElement>;

/**
 * Drawer.Title's values exactly, because both came from the same drawing.
 *
 * `body-lg`, NOT `title-sm`: both peak at 16px but the title roles are fluid
 * (`clamp(…vw…)`), and a panel at its narrowest would draw the ceiling of a
 * scale it never reaches — smallest on the phone where the sheet draws it
 * largest. Sidebar hit the same trap.
 */
function SheetTitle({ className, ...rest }: SheetTitleProps) {
  return (
    <BaseDialog.Title
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Title>>(rest)}
      data-slot="sheet-title"
      className={cn(
        "line-clamp-1 text-body-lg font-body font-bold leading-normal tracking-tight text-ink-primary",
        className,
      )}
    />
  );
}

export type SheetBodyProps = HTMLAttributes<HTMLDivElement>;

/**
 * The content region, and the ONLY part that scrolls.
 *
 * Drawer.Body's values plus the `flex-1` a full-height panel needs. This is
 * what pins the other two: with the scroll on the panel — where it sat until
 * this part existed — a header scrolls away with the content it labels.
 */
function SheetBody({ className, children, ...rest }: SheetBodyProps) {
  const ctx = useContext(SheetPanel_);
  const node = useRef<HTMLDivElement | null>(null);
  const setOverflow = ctx?.setOverflow;

  useEffect(() => {
    const el = node.current;
    if (!el || !setOverflow) return;
    const measure = () => {
      // A pixel of slack at both ends. Chromium's scroll offset is fractional,
      // and a hairline that flickers on and off at the extremes of a scroll is
      // worse than one that arrives a pixel late.
      setOverflow({
        top: el.scrollTop > 1,
        bottom: el.scrollHeight - el.scrollTop - el.clientHeight > 1,
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
    // `children` is a dependency because content can grow without this element
    // changing size: it is `flex-1` inside a panel pinned to the viewport, so
    // the ResizeObserver never fires for a row added to a list that already
    // overflowed. Table re-measures on the same reasoning.
  }, [setOverflow, children]);

  /**
   * A tab stop ONLY while it actually scrolls — Table's rule, in the other
   * axis. A region a keyboard user cannot reach is content they cannot read
   * (SC 2.1.1), and a Sheet.Body holding only static text has no focusable
   * child to scroll it into view. Making it unconditionally focusable is the
   * version most implementations ship, and it puts a silent tab stop in front
   * of every panel that fits.
   *
   * Derived rather than a fourth boolean: content hidden above or below IS
   * `scrollHeight > clientHeight`.
   */
  const isScrollable = Boolean(ctx && (ctx.overflow.top || ctx.overflow.bottom));

  return (
    <div
      ref={node}
      data-slot="sheet-body"
      data-scrollable={isScrollable || undefined}
      // role / name / tabIndex applied TOGETHER or not at all: a named region
      // nobody can reach is as useless as a reachable one with no name. The
      // name is the dialog's own `label`, which is why that prop lives on the
      // Panel rather than being duplicated here.
      {...(isScrollable && ctx ? { role: "region", "aria-label": ctx.label, tabIndex: 0 } : {})}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto p-lg",
        // An INSET outline: this region is flush with the panel's edges, so an
        // outward ring would be clipped by the panel's own overflow on three
        // sides. `outline` rather than a box-shadow ring because forced-colors
        // mode forces box-shadow to `none`, and an outline needs no fallback.
        "focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-edge-focus",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type SheetFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * The action region. Pinned.
 *
 * Buttons STACK full width — Drawer's footer, not Modal's `justify-between`
 * row: a panel capped at 272–416px has no room for two side by side, and the
 * committing action wants the full width. 104px tall with two `md` buttons:
 * 16 + 32 + 8 + 32 + 16.
 */
function SheetFooter({ className, ...rest }: SheetFooterProps) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex shrink-0 flex-col gap-sm p-lg",
        "transition-[box-shadow]", motionStandard,
        HAIRLINE.footer,
        className,
      )}
      {...rest}
    />
  );
}

export interface SheetCloseProps {
  children?: ReactNode;
  /** Slot: the control that dismisses. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function SheetClose({ children, render, className }: SheetCloseProps) {
  return (
    <BaseDialog.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Close>>({
        "data-slot": "sheet-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Close>
  );
}

export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Panel: SheetPanel,
  Header: SheetHeader,
  Title: SheetTitle,
  Body: SheetBody,
  Footer: SheetFooter,
  Close: SheetClose,
});
