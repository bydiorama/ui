"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { createContext, useContext, useEffect, useRef, useState, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Count } from "@/ui/count";
import { motionMicro } from "@/lib/motion";

import type { OwnedSlot } from "@/lib/data-slot";
/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type TabsOrientation = "horizontal" | "vertical";
export type TabsVariant = "enclosed" | "ghost";

/**
 * List and Tab both need to know the orientation and the variant, and neither
 * is a child the caller passes them explicitly — the sheet draws four
 * combinations and a consumer writing `orientation` three times would get one
 * of them wrong. Root owns it; the parts read it.
 */
const TabsShape = createContext<{
  orientation: TabsOrientation;
  variant: TabsVariant;
  /** True from a change of selection until the indicator's slide ends. */
  isSliding: boolean;
  endSlide: () => void;
}>({
  orientation: "horizontal",
  variant: "enclosed",
  isSliding: false,
  endSlide: () => {},
});

export interface TabsProps extends OwnedSlot {
  children: ReactNode;
  /** Controlled selection, by tab value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Vertical stacks the strip and — because it is forwarded to the behaviour
   * layer — swaps the arrow keys from Left/Right to Up/Down. A vertical strip
   * still driven by Left/Right is the usual way this prop is half-implemented.
   */
  orientation?: TabsOrientation;
  /**
   * `enclosed` is the sheet's default: a bordered track around the strip.
   * `ghost` drops the track entirely and lets the selected fill carry it, for
   * a strip that sits inside a surface that already has an edge.
   */
  variant?: TabsVariant;
  className?: string;
}

/**
 * A segmented control that switches which panel is shown.
 *
 * Roving `tabindex`, arrow-key navigation, Home/End and the
 * `aria-controls`/`aria-labelledby` pairing between each tab and its panel all
 * come from Base UI (ADR 0012). Those are the parts a hand-rolled tab strip
 * gets wrong: it usually leaves every tab in the tab order, so a keyboard user
 * must Tab through all of them to reach the content.
 */
function TabsRoot({
  children,
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  variant = "enclosed",
  className,
}: TabsProps) {
  // The indicator slides only for a CHOICE. A resize, a reflow or a web font
  // arriving re-measures the tab too, and gliding there animated something
  // nobody chose (CI's at-rest screenshot caught it mid-glide). So a change
  // of selection opens a window for the transition, and the slide's end
  // closes it.
  const [isSliding, setSliding] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    // A controlled value changed from outside, not through the tabs.
    if (value !== undefined && previous.current !== undefined && value !== previous.current) setSliding(true);
    previous.current = value;
  }, [value]);
  const endSlide = () => setSliding(false);
  return (
    <BaseTabs.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Root>>({
        ...(value !== undefined ? { value } : {}),
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        // Narrowed from Base UI's (value, eventDetails) and its `any` value
        // type, so no third-party shape reaches the signature.
        onValueChange: (next: unknown) => {
          setSliding(true);
          onValueChange?.(String(next));
        },
        orientation,
        "data-slot": "tabs",
        "data-orientation": orientation,
        "data-variant": variant,
        className: cn("flex w-full flex-col gap-lg", className),
      })}
    >
      <TabsShape.Provider value={{ orientation, variant, isSliding, endSlide }}>{children}</TabsShape.Provider>
    </BaseTabs.Root>
  );
}

export type TabsListProps = HTMLAttributes<HTMLDivElement> & OwnedSlot;

/** The enclosed tab's radius: the track's, minus its 3px inset and its stroke. */
const ENCLOSED_RADIUS = "rounded-[max(0px,calc(var(--ui-radius-md)-3px-var(--ui-stroke-hairline)))]";

function TabsList({ className, children, ...rest }: TabsListProps) {
  const { orientation, variant, isSliding, endSlide } = useContext(TabsShape);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!isSliding) return;
    // A choice that moves nothing (the same box, or Reduced where the
    // indicator is hidden) starts no transition, so no end event comes.
    // Two frames is when a started transition is visible to getAnimations().
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (!indicatorRef.current?.getAnimations().length) endSlide();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isSliding, endSlide]);
  const settle = (event: { currentTarget: HTMLElement }) => {
    if (!event.currentTarget.getAnimations().some((a) => a.playState === "running")) endSlide();
  };
  return (
    <BaseTabs.List
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.List>>(rest)}
      data-slot="tabs-list"
      data-orientation={orientation}
      data-variant={variant}
      className={cn(
        "relative flex gap-xs rounded-md",
        // The selected fill, read by every tab through a variable rather than
        // painted by a competing class. At Full, once the indicator is shown,
        // the tabs stop painting it: one fill slides instead of two
        // cross-fading. At Reduced and Off — and before the layout settles,
        // while Base UI keeps the indicator `hidden` (so static HTML is still
        // right) — each tab paints its own, as Tabs always did.
        "[--tabs-selected-fill:var(--ui-bg-selected)]",
        "motion-safe:has-[>[data-slot=tabs-indicator]:not([hidden])]:[--tabs-selected-fill:transparent]",
        // The inset is 3px, and it is the ONLY thing between the track's edge
        // and a tab's fill — which is why there is no height here.
        //
        // What shipped instead was `p-[2px] h-8`, and it read as symmetric in
        // the source and was not on screen. 24px rows + 2 + 2 + a 1.5px border
        // that Chromium uses as 1px is 31, `h-8` demands 32, and `items-center`
        // hands the spare pixel to the top and bottom gaps. Measured: 3px left
        // and right, 4px top and bottom. A fixed height is a SECOND author of
        // the inset, and the two only agree by arithmetic accident.
        //
        // Keep density independent of brand shape: the track owns its inset;
        // enclosed tabs derive their radius from that track minus this padding
        // and its stroke. Browser stroke snapping can differ by half a pixel.
        "p-[3px]",
        orientation === "vertical" ? "flex-col" : "justify-center",
        variant === "enclosed" && "bg-surface border-hairline border-edge-subtle",
        // Ghost hugs. It is a flex child of the root column, so the default
        // `stretch` had been making it full-width and `justify-center` then
        // centred the strip inside it — which is neither what the sheet draws
        // (a 280px box at x=0) nor what the Tab below already says it does
        // ("ghost sizes to its content and sits left"). The docstring was
        // right and the class was not.
        variant === "ghost" && "w-fit",
        className,
      )}
    >
      {/* One indicator per list (Tabs motion sheet). Base UI writes the
          selected tab's box as --active-tab-* and keeps it `hidden` until the
          layout is measured, then shows it already in place — so its first
          placement never animates; only a change does. */}
      <BaseTabs.Indicator
        ref={indicatorRef}
        data-slot="tabs-indicator"
        {...(isSliding ? { "data-sliding": "" } : {})}
        onTransitionEnd={settle}
        onTransitionCancel={settle}
        className={cn(
          "absolute top-0 left-0 bg-selected",
          "h-(--active-tab-height) w-(--active-tab-width)",
          "translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
          // A move settles without overshoot: a rounded pill that passes its
          // target dips its corners and reads as a wobble.
          // Only while sliding (see TabsRoot): a resize is simply followed.
          // The duration and curve are gated too — `transition-property`'s
          // initial value is `all`, so a duration alone animates everything.
          "data-sliding:transition-[translate,width,height] data-sliding:duration-(--ui-duration-base) data-sliding:ease-(--ui-ease-out)",
          variant === "enclosed" ? ENCLOSED_RADIUS : "rounded-md",
          // At Reduced the indicator steps aside; the tabs paint their own.
          "motion-reduce:hidden",
        )}
      />
      {children}
    </BaseTabs.List>
  );
}

export interface TabsTabProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children">, OwnedSlot {
  value: string;
  children: ReactNode;
  /** A count beside the label, as the sheet draws it on the selected tab. */
  count?: number;
  isDisabled?: boolean;
}

function TabsTab({ value, children, count, isDisabled = false, className, ...rest }: TabsTabProps) {
  const { orientation, variant } = useContext(TabsShape);
  return (
    <BaseTabs.Tab
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(rest)}
      value={value}
      disabled={isDisabled}
      data-slot="tabs-tab"
      data-variant={variant}
      className={cn(
        // `relative` puts the label above the indicator, which is absolute
        // and earlier in the list.
        "relative flex min-h-6 items-center gap-xs px-sm py-xs",
        "text-button-sm font-body whitespace-nowrap",
        // At Full only the ink transitions: the fill is the indicator's, and
        // its hand-over from the tab must be instant — same colour, same
        // place. A fade there animated nothing visible and made the at-rest
        // screenshot depend on when it was taken. At Reduced the tab paints
        // its own fill again, and that cross-fade is the selection's motion.
        "transition-[color] motion-reduce:transition-[background-color,color]", motionMicro,
        "text-ink-muted",
        // Enclosed divides the track evenly and centres each label; ghost sizes
        // to its content and sits left, because there is no track to divide.
        variant === "enclosed" ? cn("flex-1", ENCLOSED_RADIUS) : "rounded-md",
        orientation === "horizontal" ? "justify-center" : "self-stretch",
        // `bg-selected`, not `bg-sunken`. The sheet draws the selected tab
        // DARKER than its track, and "recessed" is a relative role: below the
        // surface there is room on a light page and almost none on a dark one,
        // where `bg-sunken` measured 1.10:1 against the track and the selected
        // tab read as unselected. `bg-selected` steps away from the surface in
        // whichever direction the scheme reads — 1.19 in light, unchanged from
        // the drawing, and 1.19 in dark on the 2026-11-03 warm-ink ramp (1.68
        // on the old mid-grey one, where bg-sunken measured 1.10).
        "aria-selected:bg-(--tabs-selected-fill) aria-selected:text-ink-primary",
        !isDisabled && "cursor-pointer not-aria-selected:hover:text-ink-secondary",
        // `aria-disabled:`, NOT `disabled:`. Base UI's Tab renders
        // `aria-disabled="true"` and `data-disabled` and never sets the native
        // attribute — deliberately, so a disabled tab stays focusable and can
        // still be announced, the same choice Calendar makes for unavailable
        // dates. Every `disabled:` class here therefore matched nothing, and
        // the row painted identically to an enabled one in both schemes: same
        // ink, same cursor. Shipped that way since Tabs did.
        "aria-disabled:cursor-not-allowed aria-disabled:text-ink-disabled",
        // Base UI leaves only the selected tab in the tab order (roving
        // tabindex), so the ring is the only thing telling a keyboard user
        // where they are.
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus focus-visible:outline-none",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          className={cn(
            // A 16px circle, as drawn — min-h as well as min-w, or a
            // single-digit count renders as a 16x12 lozenge and only a
            // two-digit one looks round.
            "flex min-h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-xs",
            // 12px, not the sheet's 11px: below the scale's own floor, which
            // ADR 0009 set after an 11px label pushed a control under the
            // WCAG target size.
            "text-label-sm font-body",
            "bg-elevated text-ink-primary",
          )}
        >
          {/* Count moves only the digits that change and keeps the text the
              plain number (ADR 0028). */}
          <Count value={count} />
        </span>
      )}
    </BaseTabs.Tab>
  );
}

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement>, OwnedSlot {
  value: string;
  /**
   * Keeps the panel in the DOM while another tab is selected, hidden with the
   * `hidden` attribute. Off by default, as before. Turn it on when the
   * content must exist without JavaScript — a statically rendered page only
   * ever ships the selected panel otherwise, so the rest is missing from the
   * HTML search engines read (#34) — or when a panel holds state (a
   * half-filled form) that must survive switching away.
   */
  isAlwaysMounted?: boolean;
}

function TabsPanel({ value, isAlwaysMounted = false, className, ...rest }: TabsPanelProps) {
  return (
    <BaseTabs.Panel
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Panel>>(rest)}
      value={value}
      keepMounted={isAlwaysMounted}
      data-slot="tabs-panel"
      className={cn(
        // The panel arrives from the side of the tab picked
        // (data-activation-direction), --ui-space-sm × --ui-motion-travel,
        // fading in on the same clock. `none` is the first render: a page
        // never opens with its panel sliding in. No blur (decided). The old
        // panel leaves at once, so two never share the frame.
        "transition-[opacity,translate] duration-(--ui-duration-base) ease-(--ui-ease-out)",
        "not-data-[activation-direction=none]:starting:opacity-0",
        "data-[activation-direction=right]:starting:translate-x-[calc(var(--ui-space-sm)*var(--ui-motion-travel))]",
        "data-[activation-direction=left]:starting:-translate-x-[calc(var(--ui-space-sm)*var(--ui-motion-travel))]",
        "data-[activation-direction=down]:starting:translate-y-[calc(var(--ui-space-sm)*var(--ui-motion-travel))]",
        "data-[activation-direction=up]:starting:-translate-y-[calc(var(--ui-space-sm)*var(--ui-motion-travel))]",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-focus focus-visible:outline-none", className)}
    />
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
