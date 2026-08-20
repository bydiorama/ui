"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { AspectRatio, type AspectRatioName } from "@/ui/aspect-ratio";

/**
 * The artifact container — the thing the agent hands you to take away.
 *
 * `bg-elevated`, radius-lg, an 8px inset on all four sides and a gap to match.
 * No border and no shadow: the fill alone separates the artifact from the
 * receiver's prose, which is the same lift the sender bubble uses.
 *
 * WHAT IT IS NOT. An explanation, a question, a summary of what the agent just
 * did — those are the receiver block, uncontained. The failure mode the sheet
 * names is putting conversation in here: once everything is a card, the
 * container stops meaning "take this with you" and the thread turns into a
 * stack of boxes.
 */
const ChatWidgetRoot = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatWidget({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        data-slot="chat-widget"
        className={cn("flex w-full flex-col gap-sm rounded-lg bg-elevated p-sm", className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export interface ChatWidgetHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * What the artifact IS — a filename, a post title. Truncates with an
   * ellipsis; it is the only part of this row that may shrink.
   */
  name: string;
  /** Slot: the leading glyph, 16px. `FileText` in the sheet. */
  icon?: ReactElement;
  /**
   * Slot: the kind chip on the trailing edge — a `Badge`, unselected. A fixed
   * slot that never shrinks, so the name gives way first.
   */
  chip?: ReactElement;
}

/**
 * The header the media widget does not have: text has no thumbnail to identify
 * it by, so it carries a name and a kind instead.
 *
 * `px-md` on top of the container's 8px inset puts the name 20px from the
 * container edge — the same 20px an action-bar label starts at, since those
 * buttons sit at the inset plus their own `px-md`. Type aligns to type.
 */
const ChatWidgetHeader = forwardRef<HTMLDivElement, ChatWidgetHeaderProps>(function ChatWidgetHeader(
  { name, icon, chip, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="chat-widget-header"
      className={cn("flex items-center gap-sm px-md pt-xs", "[&_svg]:size-4 [&_svg]:shrink-0", className)}
      {...rest}
    >
      {icon}
      <p
        data-slot="chat-widget-name"
        className="min-w-0 flex-1 truncate font-body text-label-md font-bold leading-normal tracking-normal text-ink-primary"
      >
        {name}
      </p>
      {chip}
    </div>
  );
});

export interface ChatWidgetBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * The name of the scrollable region, used ONLY while the body actually
   * overflows its cap.
   *
   * Required rather than optional: a capped body that scrolls is a scrollable
   * region (SC 2.1.1) and needs a keyboard path, and a region reachable by
   * keyboard with no name is as useless as a named one nobody can reach. When
   * the content fits, none of it is applied — an unconditional tab stop in
   * front of every short draft is the other half of this failure.
   */
  scrollLabel: string;
}

/** The sheet's cap: past this the body scrolls inside the container. */
const BODY_MAX_HEIGHT = 320;

/**
 * The prose payload — the receiver block's typography, unchanged.
 *
 * The cap is what stops a 900-word draft pushing the composer off screen, and
 * the fade is what says there is more below it. The fade is a GRADIENT FROM THE
 * CONTAINER'S OWN FILL, drawn with `from-elevated to-transparent` rather than
 * from a token: the sheet raised it as a Conflict because no single colour
 * token can express "this fill, fading to nothing", and the answer is that it
 * is not a colour — it is two stops the theme already has.
 */
const ChatWidgetBody = forwardRef<HTMLDivElement, ChatWidgetBodyProps>(function ChatWidgetBody(
  { children, scrollLabel, className, ...rest },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // One device pixel of slack: a body whose content is exactly its cap is not
    // scrollable, and sub-pixel line heights make the equality unreliable.
    setIsScrollable(el.scrollHeight - el.clientHeight > 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // The content is streamed in, so this is not a mount-time question. Both
    // the box AND its contents are observed — a paragraph arriving does not
    // change the scroller's own size.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    measure();
    return () => observer.disconnect();
  }, [measure, children]);

  return (
    <div data-slot="chat-widget-body-frame" className={cn("relative min-w-0", className)}>
      <div
        ref={(node) => {
          (scrollerRef as { current: HTMLDivElement | null }).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
        }}
        data-slot="chat-widget-body"
        data-scrollable={isScrollable || undefined}
        // `role`, the name and the tab stop are applied TOGETHER or not at all.
        // A named region nobody can reach and a reachable one with no name are
        // the same defect wearing different clothes.
        {...(isScrollable ? { role: "region", "aria-label": scrollLabel, tabIndex: 0 } : {})}
        style={{ maxHeight: `${BODY_MAX_HEIGHT}px` }}
        className={cn(
          "flex flex-col gap-md overflow-y-auto px-md",
          "font-body text-body-md font-regular leading-relaxed tracking-normal text-ink-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
        )}
        {...rest}
      >
        {children}
      </div>
      {isScrollable ? (
        // Decoration over content: it says there is more below, and the
        // scrollbar and the keyboard path are what let you reach it.
        <span
          aria-hidden="true"
          data-slot="chat-widget-fade"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-md bg-linear-to-t from-elevated to-transparent"
        />
      ) : null}
    </div>
  );
});

export interface ChatWidgetMediaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * The frame's shape. All frames in one widget share it — mixing ratios is
   * what splits an answer into separate widgets.
   */
  ratio?: AspectRatioName;
  /**
   * Slot: controls floating inside the stage's trailing bottom corner — the
   * sheet's paging arrows and frame counter.
   */
  overlay?: ReactNode;
}

/**
 * The media stage.
 *
 * radius-md inside the container's radius-lg, which is CONCENTRIC by
 * construction: 16 outer minus the 8px inset is 8 inner, and it is the one
 * rule here that breaks visibly if the inset changes without the radius
 * following (CONVENTIONS §6).
 *
 * The stage reserves its final size from the first byte, so generating,
 * loading and failure all happen inside the same frame and the thread never
 * reflows when the image lands. What goes in it is the caller's — an <img>, a
 * DotPattern over a Progress, a failure well — because only the caller knows
 * which of those it has.
 */
const ChatWidgetMedia = forwardRef<HTMLDivElement, ChatWidgetMediaProps>(function ChatWidgetMedia(
  { children, ratio = "landscape", overlay, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="chat-widget-media"
      // The radius is on THIS node as well as on the sizer inside it, and that
      // is not belt-and-braces: the concentric rule is arithmetic between the
      // container's corner and its CHILD's, and the child a measurement reaches
      // is this one. A radius living only on an inner sizer is a radius the
      // geometry laws cannot see.
      className={cn("relative min-w-0 rounded-md", className)}
      {...rest}
    >
      <AspectRatio
        ratio={ratio}
        // `bg-media-floor` is the ground a picture is judged against and the
        // one that shows through before it loads — never `bg-emphasis`, which
        // IS the accent and would turn the stage into the brand's colour.
        className="overflow-clip rounded-md bg-media-floor"
      >
        {children}
      </AspectRatio>
      {overlay ? (
        <div data-slot="chat-widget-media-overlay" className="absolute end-sm bottom-sm flex items-center gap-xs">
          {overlay}
        </div>
      ) : null}
    </div>
  );
});

export interface ChatWidgetRailProps extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  children: ReactNode;
  /** Accessible name of the frame list — "Frames", "Variations". */
  label: string;
}

/**
 * The carousel's frame rail: a row of `Thumbnail`s under the stage.
 *
 * A list, so a screen reader is given the count. Which frame is current, and
 * what pressing one does, belong to whatever owns the stage — this part lays
 * them out and nothing else.
 */
const ChatWidgetRail = forwardRef<HTMLUListElement, ChatWidgetRailProps>(function ChatWidgetRail(
  { children, label, className, ...rest },
  ref,
) {
  return (
    <ul
      ref={ref}
      data-slot="chat-widget-rail"
      aria-label={label}
      className={cn("flex min-w-0 items-center gap-xs overflow-x-auto", className)}
      {...rest}
    >
      {children}
    </ul>
  );
});

/**
 * The provenance line between the media and the bar — "Grounded in brand
 * palette · 2 sources".
 */
const ChatWidgetCaption = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function ChatWidgetCaption({ className, children, ...rest }, ref) {
    return (
      <p
        ref={ref}
        data-slot="chat-widget-caption"
        className={cn("px-md font-body text-caption leading-normal text-ink-muted", className)}
        {...rest}
      >
        {children}
      </p>
    );
  },
);

export interface ChatWidgetActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** The leading verbs — `Button secondary · md`. Copy and Edit, or Edit and Download. */
  children: ReactNode;
  /** Slot: the trailing icon buttons — `Button ghost · md · isIconOnly`. */
  end?: ReactNode;
}

/**
 * The action bar. The same bar in both families with its verbs swapped, which
 * is the whole reason they are one component.
 *
 * It never wraps: the leading verbs and the trailing icons are pushed apart by
 * a spacer rather than by `justify-between`, so a bar with one verb still puts
 * its icons on the trailing edge.
 */
const ChatWidgetActions = forwardRef<HTMLDivElement, ChatWidgetActionsProps>(
  function ChatWidgetActions({ children, end, className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        data-slot="chat-widget-actions"
        // No transition: nothing here changes over time. A `transition-[opacity]`
        // on a bar whose opacity never moves is the motion version of a prop
        // that does nothing — it reads as a considered decision and animates
        // no state that exists.
        className={cn("flex items-center gap-sm", className)}
        {...rest}
      >
        {children}
        <span aria-hidden="true" className="flex-1" />
        {end}
      </div>
    );
  },
);

/**
 * One container, three payloads — the sheet's own Not built row asks for
 * exactly this, and names the reason: the container, the action bar and the
 * dark treatment are identical across the text and media families and would
 * drift apart if split.
 *
 * The QUESTIONNAIRE family is deliberately NOT here. It has no container at
 * all: the sheet draws its question and options directly in the thread, with
 * no fill, no header and no action bar. Six of the parts below mean nothing to
 * it, which is §7a's Sheet-and-Drawer test — it ships as `chat-questionnaire`.
 */
export const ChatWidget = Object.assign(ChatWidgetRoot, {
  Header: ChatWidgetHeader,
  Body: ChatWidgetBody,
  Media: ChatWidgetMedia,
  Rail: ChatWidgetRail,
  Caption: ChatWidgetCaption,
  Actions: ChatWidgetActions,
});
