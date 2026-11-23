"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import {
  createContext,
  useContext,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { useRender } from "@base-ui/react/use-render";
import { Search } from "griddy-icons";

import { cn } from "@/lib/cn";
import { menuItem } from "@/lib/menu-surface";
import { motionMicro } from "@/lib/motion";

import type { OwnedSlot } from "@/lib/data-slot";
/**
 * Absorbs one impedance mismatch, in one place.
 *
 * This repo compiles with `exactOptionalPropertyTypes`, so `prop?: string`
 * means "absent or a string" — never `undefined`. Base UI declares its props
 * the looser way, so spreading our own optionals into its parts fails to
 * type-check even when every value is correct at runtime.
 *
 * Absorbing that here is exactly what a wrapper is for: the alternative is
 * relaxing the flag library-wide, which would weaken every component to suit
 * one dependency. It stays inside this file, which `check:boundaries` already
 * isolates from everything else.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Our own placement vocabulary, deliberately restated rather than re-exported.
 *
 * Base UI's `Side`/`Align` types would work identically — and would also mean
 * every consumer's code is typed against Base UI, which is exactly what makes
 * a behaviour layer unswappable (ADR 0002/0012). `check:boundaries` fails the
 * build if one of its types reaches an exported signature.
 */
export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps extends OwnedSlot {
  children: ReactNode;
  /** Controlled open state. Omit to let the popover own it. */
  isOpen?: boolean;
  /** Starting state when uncontrolled. */
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Traps focus and blocks the page behind. A menu or a hint is not modal; a
   * short form inside a popover usually is.
   */
  isModal?: boolean;
}

/**
 * A panel anchored to a trigger, for secondary content that should not take
 * over the page the way a Modal does.
 *
 * Positioning, focus restoration, outside-click and Escape dismissal, and the
 * `aria-expanded`/`aria-controls` wiring come from Base UI (ADR 0012). What
 * lives here is the API, the anatomy, and every pixel of the design.
 *
 * Open state is NOT run through `useControllableState`: the behaviour layer
 * already implements the controlled/uncontrolled contract, and running two
 * implementations over one piece of state is how they drift. CONVENTIONS §4
 * bans a *bespoke* implementation, which this is the opposite of.
 */
function PopoverRoot({ children, isOpen, defaultIsOpen, onOpenChange, isModal }: PopoverProps) {
  return (
    <BasePopover.Root
      {...(isOpen !== undefined ? { open: isOpen } : {})}
      {...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {})}
      {...(onOpenChange ? { onOpenChange: (open: boolean) => onOpenChange(open) } : {})}
      {...(isModal !== undefined ? { modal: isModal } : {})}
    >
      {children}
    </BasePopover.Root>
  );
}

export interface PopoverTriggerProps extends OwnedSlot {
  children?: ReactNode;
  /**
   * Slot: the element that opens the popover — usually a `<Button>`. Passed
   * straight through, never wrapped (§3), so the trigger keeps its own type,
   * ref and accessible name and gains only the ARIA wiring.
   */
  render?: ReactElement;
  className?: string;
}

function PopoverTrigger({ children, render, className }: PopoverTriggerProps) {
  return (
    <BasePopover.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Trigger>>({
        "data-slot": "popover-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BasePopover.Trigger>
  );
}

/**
 * What a list panel's parts share: the search field registers itself here so
 * the panel can hand it initial focus. A content panel leaves it empty.
 */
const PanelContext = createContext<{ searchRef: RefObject<HTMLInputElement | null> | null }>({ searchRef: null });

export type PopoverPanelVariant = "content" | "list";

/** The panel surface per variant; everything else about the popup is shared. */
const PANEL_SURFACE: Record<PopoverPanelVariant, string> = {
  // radius-lg (16), Card's corner (issue #40). A radius-md (8) boxed child at
  // p-lg (16) is no longer concentric (§6 would ask for 24); the 2026-10-29
  // owner review accepted that — cards, popovers and dialogs draw at 16
  // platform-wide, and the 24 read as too round.
  content: "min-w-80 gap-lg rounded-lg p-lg overflow-y-auto bg-elevated",
  // Menu's surface (lib/menu-surface's menuPanel), not a second recipe (#55):
  // radius-md (8) over radius-sm rows at a 4px inset is concentric exactly,
  // and #40's 16px is for windows that hold content, not for lists. No
  // padding of its own: Search, List and Footer each carry theirs, so the
  // hairlines between them run edge to edge. The LIST scrolls, not the panel,
  // so the search row and the footer stay put.
  list: "w-70 rounded-md overflow-hidden bg-surface",
};

export interface PopoverPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title">, OwnedSlot {
  /**
   * `content` (default) is a small window: a title, a description, a field or
   * a banner, at p-lg on Card's surface. `list` is a picker: an optional
   * Popover.Search, a Popover.List of dense rows and an optional
   * Popover.Footer, on Menu's surface, 280px wide (#55). Either way it is a
   * dialog. The rows' keyboard model is the caller's.
   */
  variant?: PopoverPanelVariant;
  /** Preferred side. Flips automatically when it would collide. */
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Distance from the trigger, in px. Defaults to `--ui-space-sm` worth. */
  sideOffset?: number;
  alignOffset?: number;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero. Pass the
   * themed element to bring it back inside. See the fuller note in `sheet.tsx`
   * on why this is a prop and not resolved automatically.
   */
  container?: HTMLElement | null;
}

function PopoverPanel({
  children,
  className,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  container,
  variant = "content",
  ...rest
}: PopoverPanelProps) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  return (
    <BasePopover.Portal {...(container ? { container } : {})}>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        // Keeps the panel off the viewport edge when it flips or shifts.
        collisionPadding={8}
        // The POSITIONER carries the layer, not the popup — it is the
        // portalled root, and the popup inside it is positioned against it.
        // Same placement Menu, Select, MultiSelect, DatePicker and
        // ContextMenu use. --ui-z-dropdown sits above modal and overlay
        // because a Popover opened from inside a Sheet or a dialog is that
        // surface's BODY SIBLING, so only the scale keeps it in front.
        className="z-(--ui-z-dropdown)"
      >
        <BasePopover.Popup
          {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Popup>>(rest)}
          data-slot="popover-panel"
          data-variant={variant}
          // A list panel opens with its search field focused, so typing
          // filters at once; without a search it falls back to Base UI's
          // default, the popup itself.
          initialFocus={() => searchRef.current ?? true}
          className={cn(
            "flex flex-col",
            PANEL_SURFACE[variant],
            // Never larger than the space Base UI measured. Flipping and
            // shifting reposition a panel; they cannot shrink one, so a tall
            // popover on a short window runs off the bottom without this (§7c).
            "max-h-(--available-height) max-w-(--available-width)",
            "border border-edge-subtle shadow-md",
            // The panel is the thing that must be identifiable against the
            // page (SC 1.4.11): bg-elevated alone measures 1.11:1 on white,
            // so the hairline and the shadow carry the boundary, not the fill.
            "text-ink-primary",
            // `scale`, not `transform` — see the identical note in modal.tsx.
            "transition-[opacity,scale]", motionMicro,
            // Base UI stamps these while the enter/exit transition runs.
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
            "origin-(--transform-origin)",
            className,
          )}
        >
          <PanelContext.Provider value={{ searchRef: variant === "list" ? searchRef : null }}>
            {children}
          </PanelContext.Provider>
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/**
 * The inset that makes a 32px-radius panel work.
 *
 * Bare text sitting flush at the panel's own padding crowds the corner arc, so
 * unboxed content steps in by one space unit while boxed content (an info
 * well, an input) stays flush. Encoding it here rather than documenting it
 * means a consumer gets the alignment right by composing, not by reading.
 */
const UNBOXED_INSET = "px-sm";

export type PopoverTitleProps = HTMLAttributes<HTMLHeadingElement> & OwnedSlot;

function PopoverTitle({ className, ...rest }: PopoverTitleProps) {
  return (
    <BasePopover.Title
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Title>>(rest)}
      data-slot="popover-title"
      className={cn(
        UNBOXED_INSET,
        "py-xs text-title-sm font-body text-ink-primary",
        className,
      )}
    />
  );
}

export type PopoverDescriptionProps = HTMLAttributes<HTMLParagraphElement> & OwnedSlot;

function PopoverDescription({ className, ...rest }: PopoverDescriptionProps) {
  return (
    <BasePopover.Description
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Description>>(rest)}
      data-slot="popover-description"
      className={cn(
        UNBOXED_INSET,
        // From the actions sheet: body-md at the relaxed leading, in secondary
        // ink. Weight is `medium`, not the sheet's 600 — the only description
        // drawn anywhere sits in a destructive confirmation, and that emphasis
        // does not generalise to ordinary body copy. Confirmed with design.
        "py-xs text-body-md font-body text-ink-secondary",
        className,
      )}
    />
  );
}

export interface PopoverCloseProps extends OwnedSlot {
  children?: ReactNode;
  /** Slot: the control that dismisses the popover. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function PopoverClose({ children, render, className }: PopoverCloseProps) {
  return (
    <BasePopover.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Close>>({
        "data-slot": "popover-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BasePopover.Close>
  );
}

export interface PopoverSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size">, OwnedSlot {
  /**
   * Required: the accessible name, visually hidden. The row draws a
   * placeholder and a glyph, and a placeholder is not a label (§10).
   */
  label: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * The list panel's search row: a bare input on a 36px row with a bottom
 * hairline and no field box, because the panel is the box (#55).
 *
 * px-md, so the glyph sits on the rows' 12px text lane (the list's 4px inset
 * plus a row's 8). The typed text then starts at 36px, the same lane as a
 * footer row's label after its glyph. It takes the panel's initial focus.
 * Filtering is the caller's, as is the list it filters.
 */
function PopoverSearch({ label, className, placeholder = "Search", ref, ...rest }: PopoverSearchProps) {
  const id = useId();
  const { searchRef } = useContext(PanelContext);
  return (
    <div
      data-slot="popover-search"
      className={cn(
        "flex h-9 shrink-0 items-center gap-sm px-md",
        "border-b border-edge-subtle",
        // The row draws the focus indicator, so the bare input inside may
        // carry outline-none: the bottom hairline takes the focus colour and
        // the caret is in the field (§6).
        "transition-[border-color]", motionMicro,
        "focus-within:border-edge-focus",
        "focus-within:forced-colors:outline focus-within:forced-colors:outline-focus",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={(node) => {
          if (searchRef) searchRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as RefObject<HTMLInputElement | null>).current = node;
        }}
        id={id}
        type="search"
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent outline-none",
          "text-body-md font-body text-ink-primary",
          "placeholder:text-ink-placeholder",
        )}
        {...rest}
      />
    </div>
  );
}

/** A row's height in a list panel: the min-h-8 floor (32px). */
const ROW_REM = 2;

export interface PopoverListProps extends HTMLAttributes<HTMLDivElement>, OwnedSlot {
  /**
   * Caps the list at this many rows, then scrolls. 4 rows is 4 × 32 + 8:
   * the rows plus the list's own 4px inset top and bottom. Omit it and the
   * list grows until the panel reaches the space Base UI measured.
   */
  maxRows?: number;
}

/** The list panel's scrolling body: p-xs around rows that stack flush. */
function PopoverList({ maxRows, className, style, ...rest }: PopoverListProps) {
  return (
    <div
      data-slot="popover-list"
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto p-xs", className)}
      style={{
        ...(maxRows !== undefined
          ? { maxHeight: `calc(${maxRows} * ${ROW_REM}rem + 2 * var(--ui-space-xs))` }
          : {}),
        ...style,
      }}
      {...rest}
    />
  );
}

export interface PopoverRowProps extends Omit<HTMLAttributes<HTMLElement>, "children">, OwnedSlot {
  children: ReactNode;
  /** Slot: a leading glyph, 16px, decorative. Never wrapped (§3). */
  icon?: ReactElement;
  /** Slot: a trailing mark, such as the selected check, or a count. */
  trailing?: ReactElement;
  /**
   * The row the caller's keyboard model points at. Popover owns no listbox:
   * the caller moves the highlight (or Combobox does, #17) and says which row
   * it is on, and the row paints Menu's highlight for it.
   */
  isHighlighted?: boolean;
  isDisabled?: boolean;
  /**
   * Slot: the element to render instead of the default `<button>`, such as
   * an `<a>` or a router link. Passed through, never wrapped (§3).
   */
  render?: ReactElement;
}

/**
 * A row in a list panel: Menu's item recipe, DENSE.
 *
 * Menu's rows are 46px (p-md around a 21.7px line). A list panel is a picker
 * of many short names, so its rows are px-sm py-xs on a 32px floor, and the
 * label lands on a 12px lane (4 + 8) shared with the search glyph and a footer
 * row's glyph. Menu keeps its own rows; the density belongs to this panel.
 */
function PopoverRow({ children, icon, trailing, isHighlighted, isDisabled, render, className, ...rest }: PopoverRowProps) {
  return useRender({
    render,
    defaultTagName: "button",
    props: {
      ...(render ? {} : { type: "button" as const }),
      ...(rest as HTMLAttributes<HTMLElement>),
      "data-slot": "popover-row",
      "data-highlighted": isHighlighted || undefined,
      "data-disabled": isDisabled || undefined,
      ...(isDisabled ? { "aria-disabled": true as const } : {}),
      className: menuItem(
        cn(
          "min-h-8 px-sm py-xs text-start",
          // Menu's highlight is set by its behaviour layer; here the pointer
          // and focus set it too, since the caller's model may not.
          "not-data-[disabled]:hover:bg-hover",
          "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
          "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus",
          className,
        ),
      ),
      children: (
        <>
          <span className="flex min-w-0 items-center gap-sm">
            {icon}
            <span data-slot="popover-row-label" className="truncate">
              {children}
            </span>
          </span>
          {trailing}
        </>
      ),
    },
  });
}

export type PopoverFooterProps = HTMLAttributes<HTMLDivElement> & OwnedSlot;

/** The list panel's foot: p-xs under a top hairline. Holds rows or a button pair. */
function PopoverFooter({ className, ...rest }: PopoverFooterProps) {
  return (
    <div
      data-slot="popover-footer"
      className={cn("flex shrink-0 flex-col border-t border-edge-subtle p-xs", className)}
      {...rest}
    />
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Panel: PopoverPanel,
  Title: PopoverTitle,
  Description: PopoverDescription,
  Close: PopoverClose,
  Search: PopoverSearch,
  List: PopoverList,
  Row: PopoverRow,
  Footer: PopoverFooter,
});
