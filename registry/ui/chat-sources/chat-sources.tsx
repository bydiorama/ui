"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useRender } from "@base-ui/react/use-render";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeftSmall,
  ChevronRightSmall,
  FileText,
  Globe,
  Image,
  LinkBroken,
  LinkExternal,
  PdfFile,
} from "griddy-icons";

import { cn } from "@/lib/cn";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { HOVER_INTENT_DELAY_MS, HOVER_INTENT_SKIP_MS, motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { StatusMatrix } from "@/ui/status-matrix";

// ---------------------------------------------------------------- data

/**
 * What a source IS, carried by its glyph and never by colour (the sheet's
 * rule). Four kinds, closed: a fifth is a design decision, not a string.
 */
export type ChatSourceKind = "web" | "file" | "brandAsset" | "libraryItem";

/** The block's two forms: a folded list under an answer, or cards that ARE the answer. */
export type ChatSourcesLayout = "list" | "cards";

/** One source of a turn. Its marker number is its 1-based position in `sources`. */
export interface ChatSource {
  /** Stable id. Citations point at sources by id; the NUMBER is derived. */
  id: string;
  kind: ChatSourceKind;
  /** What it is called — truncates in a row, wraps to two lines on a card. */
  title: string;
  /** Where it is from: "moma.example", "Library · p. 48", "Attached to this chat". */
  origin: string;
  /** The passage the sentence leans on. Clamped to three lines in the preview; absent → the title stands alone. */
  excerpt?: string;
  /** Where the source opens. Without it the source is listed and previewed, but is not a link. */
  href?: string;
  /**
   * Leaves the product. Draws LinkExternal; an in-app destination draws
   * ArrowRight. Defaults to `kind === "web"` — a brand asset's link stays
   * in-app, per the sheet.
   */
  isExternal?: boolean;
  /** The preview's action for this source — "Open in guidelines". Defaults to `labels.openSource`. */
  actionLabel?: string;
  /** The source has gone: LinkBroken, disabled ink, not a link. */
  isUnavailable?: boolean;
  /**
   * Slot: renders this source's link as this element instead of an `<a>` —
   * `render={<Link href={href} />}` for a client-side transition. Passed
   * through, never wrapped (§3); the row's classes and data merge onto it.
   */
  render?: ReactElement;
}

/**
 * The strings the parts need beyond the data. Props, never an i18n runtime
 * (CONVENTIONS §9) — and one object rather than four loose props, because
 * they travel together and a citation reads them far from where they are set.
 */
export interface ChatSourcesLabels {
  /** The preview's link when a source names no `actionLabel` — "Open source". */
  openSource: string;
  /** The grouped preview's pager. */
  previousSource: string;
  nextSource: string;
  /** Replaces the origin of a source that has gone — "No longer available". */
  unavailable: string;
}

/** griddy-icons only; the layer names on the sheet ARE these imports. */
const KIND_GLYPH = {
  web: Globe,
  file: Image,
  brandAsset: FileText,
  libraryItem: PdfFile,
} as const satisfies Record<ChatSourceKind, ComponentType<SVGProps<SVGSVGElement>>>;

const isExternal = (source: ChatSource) => source.isExternal ?? source.kind === "web";
const isLink = (source: ChatSource) => !source.isUnavailable && source.href !== undefined;

/** The first three DISTINCT kinds in list order — a disc per kind, not per source. */
function discKinds(sources: readonly ChatSource[]): ChatSourceKind[] {
  const out: ChatSourceKind[] = [];
  for (const source of sources) {
    if (!out.includes(source.kind)) out.push(source.kind);
    if (out.length === 3) break;
  }
  return out;
}

// ---------------------------------------------------------------- shared state

interface ChatSourcesContextValue {
  sources: readonly ChatSource[];
  /** id → 1-based marker number. The ONE place a number comes from. */
  numberOf: ReadonlyMap<string, number>;
  labels: ChatSourcesLabels;
  isStreaming: boolean;
  container: HTMLElement | null | undefined;
  /** Ids whose marker is hovered or open — their rows take the accent wash. */
  citedIds: ReadonlySet<string>;
  setCited: (owner: string, id: string | null) => void;
  /** Unfold the block and bring a source's row into view. Registered by the block. */
  reveal: (id: string) => void;
  registerReveal: (fn: ((id: string) => void) | null) => void;
}

const ChatSourcesContext = createContext<ChatSourcesContextValue | null>(null);

function useChatSources(part: string): ChatSourcesContextValue {
  const ctx = useContext(ChatSourcesContext);
  if (!ctx) {
    throw new Error(
      `${part} must be rendered inside <ChatSources.Provider>. The block and its markers share ONE ` +
        `source list, so a marker's number and its row can never disagree — the provider is that list.`,
    );
  }
  return ctx;
}

export interface ChatSourcesProviderProps {
  children: ReactNode;
  /** The turn's sources, in the order the block lists them. */
  sources: readonly ChatSource[];
  labels: ChatSourcesLabels;
  /**
   * The answer is still arriving. Every marker is inert and drawn in disabled
   * ink — the list it points into is not final yet.
   */
  isStreaming?: boolean;
  /**
   * Where the previews portal to. Theme tokens are INHERITED custom
   * properties, so a preview portalled to `document.body` leaves a brand scope
   * and paints theme zero — pass the themed element (Popover's note).
   */
  container?: HTMLElement | null;
}

/**
 * The data set a turn's markers and its block share. Renders no DOM.
 *
 * It is a provider rather than a prop on each part because the markers live
 * in the answer's body and the block lives below it — two places in the tree
 * that must agree on what "3" means. A product that wants only the list wraps
 * the block alone.
 */
function ChatSourcesProvider({ children, sources, labels, isStreaming = false, container }: ChatSourcesProviderProps) {
  const numberOf = useMemo(() => new Map(sources.map((s, i) => [s.id, i + 1] as const)), [sources]);

  // One entry per open marker. A map rather than a single id so two previews
  // briefly overlapping (one closing as the next opens) never clear each
  // other's row.
  const [cited, setCitedMap] = useState<ReadonlyMap<string, string>>(new Map());
  const setCited = useCallback((owner: string, id: string | null) => {
    setCitedMap((prev) => {
      if (id === null ? !prev.has(owner) : prev.get(owner) === id) return prev;
      const next = new Map(prev);
      if (id === null) next.delete(owner);
      else next.set(owner, id);
      return next;
    });
  }, []);
  const citedIds = useMemo(() => new Set(cited.values()), [cited]);

  const revealRef = useRef<((id: string) => void) | null>(null);
  const registerReveal = useCallback((fn: ((id: string) => void) | null) => {
    revealRef.current = fn;
  }, []);
  const reveal = useCallback((id: string) => revealRef.current?.(id), []);

  const value = useMemo<ChatSourcesContextValue>(
    () => ({ sources, numberOf, labels, isStreaming, container, citedIds, setCited, reveal, registerReveal }),
    [sources, numberOf, labels, isStreaming, container, citedIds, setCited, reveal, registerReveal],
  );
  return <ChatSourcesContext.Provider value={value}>{children}</ChatSourcesContext.Provider>;
}

// ---------------------------------------------------------------- reduced motion

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- link

const FOCUS_RING = "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus";

interface SourceLinkProps {
  source: ChatSource;
  className: string;
  children: ReactNode;
  slot: string;
  extra?: Record<string, unknown>;
}

/**
 * Every place a source navigates — a row, a card, the preview's action —
 * renders through here, so the caller's `render` slot reaches all three.
 */
function SourceLink({ source, className, children, slot, extra }: SourceLinkProps) {
  return useRender({
    ...(source.render ? { render: source.render } : {}),
    defaultTagName: "a",
    props: {
      href: source.href,
      "data-slot": slot,
      className,
      children,
      ...extra,
    },
  });
}

// ---------------------------------------------------------------- citation

export interface ChatSourcesCitationProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "disabled"> {
  /**
   * The source(s) this clause leans on, by id. Two or more share ONE pill
   * ("2, 5") rather than stacking two. Non-empty by type: a marker that
   * points at nothing is a pill with no number.
   */
  sourceIds: readonly [string, ...string[]];
}

/**
 * The inline marker: a 16px pill after the clause it supports.
 *
 * A real `<button>`: it opens the preview on hover (after the hover-intent
 * delay Tooltip uses) and on keyboard focus, and on press it unfolds the
 * block and scrolls it to the source's row. On touch there is no hover — a
 * tap opens the preview, and a second tap on its link follows it.
 *
 * Open state is owned HERE, not by the Popover, because three inputs drive
 * it — pointer intent, focus and press — and Popover exposes only the
 * controlled pair. The Popover still owns dismissal (Escape, outside press),
 * positioning and the dialog wiring.
 */
const ChatSourcesCitation = forwardRef<HTMLButtonElement, ChatSourcesCitationProps>(function ChatSourcesCitation(
  { sourceIds, className, onPointerEnter, onPointerLeave, onPointerDown, onKeyDown, onClick, onFocus, onBlur, ...rest },
  ref,
) {
  const ctx = useChatSources("ChatSources.Citation");
  const owner = useId();
  const previewKey = useId();

  // Unknown ids are dropped rather than drawn as "?" — a marker whose source
  // is not in the list cannot be previewed, and a guessed number would lie.
  const ids = sourceIds.filter((id) => ctx.numberOf.has(id));
  const numbers = ids.map((id) => ctx.numberOf.get(id)!);
  const sources = ids.map((id) => ctx.sources[ctx.numberOf.get(id)! - 1]!);

  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const current = sources[Math.min(page, sources.length - 1)];

  /** The hover-intent timers. One object, so the unmount cleanup can hold it. */
  const timers = useRef<{ open?: ReturnType<typeof setTimeout>; close?: ReturnType<typeof setTimeout> }>({});
  /** How the press in flight began — set before Base UI's own click toggle runs. */
  const pressing = useRef<string | null>(null);
  /**
   * Dismissing the preview from inside it (Escape on its link) hands focus
   * back to the marker — and keyboard focus on the marker opens the preview.
   * This swallows that one returning focus, so a dismissal stays dismissed.
   */
  const suppressFocusOpen = useRef(false);

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.open);
      clearTimeout(t.close);
    };
  }, []);

  function clearTimers() {
    clearTimeout(timers.current.open);
    clearTimeout(timers.current.close);
  }
  function open() {
    clearTimers();
    setIsOpen(true);
  }
  function close() {
    clearTimers();
    setIsOpen(false);
    setPage(0);
  }
  function scheduleOpen() {
    clearTimers();
    timers.current.open = setTimeout(() => setIsOpen(true), HOVER_INTENT_DELAY_MS);
  }
  // The preview has to be REACHABLE — it holds a link — so leaving the marker
  // does not close it at once the way a tooltip goes. The pointer gets the
  // skip window to cross the gap into the panel (see the doc's needsDesign).
  function scheduleClose() {
    clearTimers();
    timers.current.close = setTimeout(() => {
      setIsOpen(false);
      setPage(0);
    }, HOVER_INTENT_SKIP_MS);
  }

  // The open marker's CURRENT source is the row that takes the wash.
  const citedId = isOpen && current ? current.id : null;
  const { setCited, reveal } = ctx;
  useEffect(() => {
    setCited(owner, citedId);
  }, [setCited, owner, citedId]);
  useEffect(() => () => setCited(owner, null), [setCited, owner]);

  const label = numbers.join(", ");
  const pillClass = cn(
    // 16px tall, min-width 16, px-xs, radius-full — centred on the line with
    // the sheet's 2px lead from the word before it.
    "relative inline-flex h-4 min-w-4 items-center justify-center rounded-full px-xs align-middle",
    "ms-[2px] font-body text-caption tabular-nums whitespace-nowrap",
    "bg-elevated text-ink-muted",
    "transition-[background-color,color]", motionMicro,
    "cursor-pointer disabled:cursor-not-allowed",
    // rest → hover·open → pressed, one direction. Hover and open share the
    // fill: the preview beside an open marker is the cue, so open adds nothing.
    "enabled:hover:bg-accent-subtle enabled:hover:text-ink-link",
    "data-[popup-open]:bg-accent-subtle data-[popup-open]:text-ink-link",
    "enabled:active:bg-accent-subtle-hover enabled:active:text-ink-link-hover",
    // Streaming: deliberately inert. The fill stays; only the numeral recedes.
    "disabled:text-ink-disabled",
    FOCUS_RING,
    className,
  );
  // Label-in-name (SC 2.5.3): the visible numeral leads, the titles follow,
  // so "1" alone is never the whole announcement.
  const name = (
    <>
      {label}
      <span className="sr-only">{`: ${sources.map((s) => s.title).join("; ")}`}</span>
    </>
  );

  if (ctx.isStreaming || sources.length === 0) {
    return (
      <button
        ref={ref}
        type="button"
        disabled
        data-slot="chat-sources-citation"
        data-streaming={ctx.isStreaming || undefined}
        className={pillClass}
        {...rest}
      >
        {name}
      </button>
    );
  }

  const insidePreview = (node: EventTarget | null) =>
    node instanceof Element && node.closest(`[data-chat-sources-preview="${previewKey}"]`) !== null;

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "touch") scheduleOpen();
  }
  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "touch") scheduleClose();
  }
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    pressing.current = event.pointerType;
  }
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") pressing.current = "keyboard";
  }
  function handleClick() {
    // Touch has no hover, so a tap is the preview's toggle and a second tap
    // on its link follows it. Mouse and keyboard already have the preview
    // (hover, focus): their press is the stronger intent — unfold the block
    // at the source's row.
    if (pressing.current === "touch") {
      if (isOpen) close();
      else open();
    } else {
      open();
      if (current) reveal(current.id);
    }
    // Cleared after Base UI's own click handler has run in this event.
    setTimeout(() => {
      pressing.current = null;
    }, 0);
  }
  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    // Keyboard focus opens it, exactly as hover does. A mouse press also
    // focuses the button, and the click handles that one.
    if (suppressFocusOpen.current) {
      suppressFocusOpen.current = false;
      return;
    }
    if (event.currentTarget.matches(":focus-visible")) open();
  }
  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    pressing.current = null;
    suppressFocusOpen.current = false;
    // Tabbing INTO the preview keeps it; tabbing anywhere else closes it.
    if (!insidePreview(event.relatedTarget)) scheduleClose();
  }

  const trigger = (
    <button
      ref={ref}
      type="button"
      data-slot="chat-sources-citation"
      className={pillClass}
      // Each handler composes at EVENT time, not at render: the internal
      // halves read refs, and building them during render is what the
      // compiler's refs rule refuses.
      onPointerEnter={(event) => composeEventHandlers(onPointerEnter, handlePointerEnter)(event)}
      onPointerLeave={(event) => composeEventHandlers(onPointerLeave, handlePointerLeave)(event)}
      onPointerDown={(event) => composeEventHandlers(onPointerDown, handlePointerDown)(event)}
      onKeyDown={(event) => composeEventHandlers(onKeyDown, handleKeyDown)(event)}
      // CAPTURE phase, so the flag is up before any bubble-phase click handler
      // — Base UI's toggle included — whichever order the two are merged in.
      // A click with no pointerdown or key before it is an assistive
      // technology's, and is treated as the keyboard's.
      onClickCapture={(event: MouseEvent<HTMLButtonElement>) => {
        pressing.current ??= event.detail === 0 ? "keyboard" : "mouse";
      }}
      onClick={(event) => composeEventHandlers(onClick, handleClick)(event)}
      onFocus={(event) => composeEventHandlers(onFocus, handleFocus)(event)}
      onBlur={(event) => composeEventHandlers(onBlur, handleBlur)(event)}
      {...rest}
    >
      {name}
    </button>
  );

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={(next) => {
        // A press in flight is the click handler's to decide — Base UI's own
        // trigger toggle would otherwise close a preview that hover opened.
        if (pressing.current !== null) return;
        if (next) {
          open();
          return;
        }
        // Focus is inside the preview, so the Popover is about to return it
        // to the marker.
        if (insidePreview(document.activeElement)) suppressFocusOpen.current = true;
        close();
      }}
    >
      <Popover.Trigger render={trigger} />
      <Popover.Panel
        side="bottom"
        align="start"
        // gap-xs below the marker, start-aligned (the sheet's 4px).
        sideOffset={4}
        {...(ctx.container ? { container: ctx.container } : {})}
        // The panel the sheet draws: Popover's surface at 320px, gap-md.
        className="w-80 gap-md"
        data-chat-sources-preview={previewKey}
        onPointerEnter={() => clearTimeout(timers.current.close)}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") scheduleClose();
        }}
        // Opening never moves focus into the panel: a preview opened by hover
        // must not take focus from wherever the reader is typing, and one
        // opened by focus leaves it on the marker — Tab then walks into it.
        // Popover's props do not name this, so it rides the rest spread to
        // the behaviour layer (see knownGaps).
        {...({ initialFocus: false } as object)}
      >
        {current ? (
          <Preview
            source={current}
            number={ctx.numberOf.get(current.id)!}
            labels={ctx.labels}
            page={page}
            count={sources.length}
            onPage={setPage}
          />
        ) : null}
      </Popover.Panel>
    </Popover>
  );
});

// ---------------------------------------------------------------- preview

interface PreviewProps {
  source: ChatSource;
  number: number;
  labels: ChatSourcesLabels;
  page: number;
  count: number;
  onPage: (page: number) => void;
}

function Preview({ source, number, labels, page, count, onPage }: PreviewProps) {
  const Glyph = source.isUnavailable ? LinkBroken : KIND_GLYPH[source.kind];
  const LinkGlyph = isExternal(source) ? LinkExternal : ArrowRight;
  return (
    <>
      <div data-slot="chat-sources-preview-origin" className="flex items-center gap-sm">
        <Glyph aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 truncate font-body text-caption text-ink-muted">
          {source.isUnavailable ? labels.unavailable : source.origin}
        </span>
        <span aria-hidden="true" className="shrink-0 font-body text-caption tabular-nums text-ink-muted">
          {number}
        </span>
      </div>

      <div data-slot="chat-sources-preview-text" className="flex flex-col gap-xs">
        {/* Popover.Title and .Description, so the dialog is named and
            described by them. Their own inset and role are replaced: this
            panel is radius-lg, and the sheet sets the title flush at label-md. */}
        <Popover.Title className="p-0 text-label-md text-ink-primary">{source.title}</Popover.Title>
        {source.excerpt ? (
          <Popover.Description className="line-clamp-3 p-0 text-body-sm text-ink-muted">
            {source.excerpt}
          </Popover.Description>
        ) : null}
      </div>

      {isLink(source) || count > 1 ? (
        <div data-slot="chat-sources-preview-footer" className="flex min-h-6 items-center gap-xs">
          <div className="flex min-w-0 flex-1 items-center">
            {isLink(source) ? (
              <SourceLink
                source={source}
                slot="chat-sources-preview-link"
                className={cn(
                  "inline-flex items-center gap-xs rounded-sm font-body text-label-sm text-ink-link no-underline",
                  "cursor-pointer hover:text-ink-link-hover",
                  "transition-[color]", motionMicro,
                  "[&_svg]:size-3 [&_svg]:shrink-0",
                  FOCUS_RING,
                )}
              >
                {source.actionLabel ?? labels.openSource}
                <LinkGlyph aria-hidden="true" />
              </SourceLink>
            ) : null}
          </div>
          {count > 1 ? (
            <div data-slot="chat-sources-preview-pager" className="flex shrink-0 items-center gap-xs">
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={labels.previousSource}
                icon={<ChevronLeftSmall aria-hidden="true" />}
                isDisabled={page === 0}
                onClick={() => onPage(page - 1)}
              />
              <span className="font-body text-caption tabular-nums text-ink-muted" aria-live="polite">
                {`${page + 1} / ${count}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={labels.nextSource}
                icon={<ChevronRightSmall aria-hidden="true" />}
                isDisabled={page === count - 1}
                onClick={() => onPage(page + 1)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- block parts

/** Overlapping kind discs: 20px, 2px ring in the ground's colour, 6px overlap. */
function KindDiscs({ kinds, ground }: { kinds: readonly ChatSourceKind[]; ground: "base" | "elevated" }) {
  return (
    <span data-slot="chat-sources-discs" aria-hidden="true" className="flex shrink-0 items-center">
      {kinds.map((kind, i) => {
        const Glyph = KIND_GLYPH[kind];
        return (
          <span
            key={kind}
            data-slot="chat-sources-disc"
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full ring-thick text-ink-muted [&_svg]:size-3",
              // The ring is the GROUND's colour, so the overlap reads as a cut
              // rather than as an edge: the page under the list, the card's
              // own fill inside the "+N more" card.
              ground === "base" ? "bg-elevated ring-base" : "bg-sunken ring-elevated",
              i > 0 && "-ms-[6px]",
            )}
          >
            <Glyph aria-hidden="true" />
          </span>
        );
      })}
    </span>
  );
}

function Chevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        "size-3 shrink-0 text-ink-muted",
        // Accordion's and Chat Progress's chevron: down when folded, rotated
        // up when open. `rotate`, never `transform` (v4's standalone property).
        "transition-[rotate]", motionMicro,
        "group-data-[panel-open]/summary:rotate-180",
      )}
    />
  );
}

interface SourceRowProps {
  source: ChatSource;
  /** 1-based; absent for the single-source row, which the sheet draws with no index lane. */
  number?: number;
  isCited: boolean;
  labels: ChatSourcesLabels;
  rowRef: (el: HTMLElement | null) => void;
}

function SourceRow({ source, number, isCited, labels, rowRef }: SourceRowProps) {
  const linked = isLink(source);
  const Glyph = source.isUnavailable ? LinkBroken : KIND_GLYPH[source.kind];
  const LinkGlyph = isExternal(source) ? LinkExternal : ArrowRight;
  const ink = source.isUnavailable ? "text-ink-disabled" : undefined;

  const className = cn(
    // Lanes: 16 index · 16 glyph · title flexes · 168 origin · 24 link slot.
    "group/row flex h-8 min-w-0 items-center gap-sm rounded-md px-sm no-underline",
    "transition-[background-color]", motionMicro,
    // The row whose marker is hovered takes the marker's own wash, so the eye
    // can cross from sentence to source. Mutually exclusive with hover by
    // construction, not by the order Tailwind sorts variants in.
    "data-[cited]:bg-accent-subtle",
    linked && cn("cursor-pointer not-data-[cited]:hover:bg-elevated", FOCUS_RING),
  );

  const content = (
    <>
      {number !== undefined ? (
        <span
          data-slot="chat-sources-row-index"
          className={cn(
            "w-4 shrink-0 text-end font-body text-caption tabular-nums",
            ink ?? (isCited ? "text-ink-link" : "text-ink-muted"),
          )}
        >
          {number}
        </span>
      ) : null}
      <Glyph aria-hidden="true" className={cn("size-4 shrink-0", ink ?? "text-ink-muted")} />
      <span
        data-slot="chat-sources-row-title"
        className={cn("min-w-0 flex-1 truncate font-body text-label-md", ink ?? "text-ink-primary")}
      >
        {source.title}
      </span>
      <span
        data-slot="chat-sources-row-origin"
        className={cn("w-[168px] shrink-0 truncate font-body text-caption", ink ?? "text-ink-muted")}
      >
        {source.isUnavailable ? labels.unavailable : source.origin}
      </span>
      {/* The slot keeps its 24px lane on every row, so the origins line up
          whether or not a row is a link. */}
      <span
        data-slot="chat-sources-row-link"
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center text-ink-link [&_svg]:size-[14px]",
          "opacity-0 transition-opacity", motionMicro,
          "group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
          // A device with no hover has no way to reveal it.
          "[@media(hover:none)]:opacity-100",
        )}
      >
        {linked ? <LinkGlyph aria-hidden="true" /> : null}
      </span>
    </>
  );

  const data = {
    "data-cited": isCited || undefined,
    "data-unavailable": source.isUnavailable || undefined,
  };

  if (linked) {
    return (
      <SourceLink
        source={source}
        slot="chat-sources-row"
        className={className}
        extra={{ ...data, ref: rowRef }}
      >
        {content}
      </SourceLink>
    );
  }
  return (
    <div
      ref={rowRef}
      data-slot="chat-sources-row"
      {...data}
      // A source that has gone is still LISTED — its number is still in the
      // answer — but it cannot be followed, and says so to assistive tech.
      {...(source.isUnavailable ? { "aria-disabled": true } : {})}
      className={className}
    >
      {content}
    </div>
  );
}

interface SourceCardProps {
  source: ChatSource;
  number: number;
  isCited: boolean;
  rowRef: (el: HTMLElement | null) => void;
  labels: ChatSourcesLabels;
}

function SourceCard({ source, number, isCited, rowRef, labels }: SourceCardProps) {
  const linked = isLink(source);
  const Glyph = source.isUnavailable ? LinkBroken : KIND_GLYPH[source.kind];
  const ink = source.isUnavailable ? "text-ink-disabled" : undefined;
  const className = cn(
    // 172 × 96, bg-elevated, radius-md, p-md — no edge and no shadow.
    "flex h-[96px] w-[172px] shrink-0 flex-col justify-between rounded-md bg-elevated p-md no-underline",
    "transition-[background-color]", motionMicro,
    "data-[cited]:bg-accent-subtle",
    // Hover inside an already-elevated object is bg-hover, one step up.
    linked && cn("cursor-pointer not-data-[cited]:hover:bg-hover", FOCUS_RING),
  );
  const content = (
    <>
      <span
        data-slot="chat-sources-card-title"
        className={cn("line-clamp-2 font-body text-label-md", ink ?? "text-ink-primary")}
      >
        {source.title}
      </span>
      <span className="flex min-w-0 items-center gap-xs">
        <Glyph aria-hidden="true" className={cn("size-3 shrink-0", ink ?? "text-ink-muted")} />
        <span className={cn("min-w-0 flex-1 truncate font-body text-caption", ink ?? "text-ink-muted")}>
          {source.isUnavailable ? labels.unavailable : source.origin}
        </span>
        <span className={cn("shrink-0 font-body text-caption tabular-nums", ink ?? "text-ink-muted")}>{number}</span>
      </span>
    </>
  );
  const data = { "data-cited": isCited || undefined, "data-unavailable": source.isUnavailable || undefined };
  if (linked) {
    return (
      <SourceLink source={source} slot="chat-sources-card" className={className} extra={{ ...data, ref: rowRef }}>
        {content}
      </SourceLink>
    );
  }
  return (
    <div
      ref={rowRef}
      data-slot="chat-sources-card"
      {...data}
      {...(source.isUnavailable ? { "aria-disabled": true } : {})}
      className={className}
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------- block

interface ChatSourcesBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The summary line, already counted and pluralised by the caller — "5
   * sources", or "3 sources so far" while gathering. It is the disclosure's
   * accessible name.
   */
  label: string;
  /**
   * Sources are still arriving. The count is live (a polite status), a
   * StatusMatrix replaces the discs, and there is nothing to fold yet.
   */
  isGathering?: boolean;
  /**
   * Holds the gathering StatusMatrix on its key frame. One matrix moves per
   * turn (StatusMatrix's rule): set this when another one — Chat Progress's
   * status line — is the turn's live edge. The caller knows the turn; the
   * block does not.
   */
  isHeld?: boolean;
  /** The disclosure. Folded by default — most readers want the answer. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * The layout axis. `cards` needs the "+N more" line; `list` never shows one —
 * a union, so a cards block with no way to name the rest does not compile.
 */
type ChatSourcesLayoutProps =
  | { layout?: "list"; moreLabel?: undefined; cardCount?: undefined }
  | {
      layout: "cards";
      /** The last card's line — `(n) => "+" + n + " more"`. It counts the sources the cards leave out. */
      moreLabel: (hiddenCount: number) => string;
      /** How many sources get a card before the "+N more" card. Default 2, as drawn. */
      cardCount?: number;
    };

export type ChatSourcesProps = ChatSourcesBaseProps & ChatSourcesLayoutProps;

/**
 * The block under the answer, above the actions row: everything the turn read.
 *
 * Folded by default to one line — up to three kind discs, the count, a
 * chevron — because most readers want the answer and a few want the
 * evidence. Open, it is a numbered list of link rows whose numbers are the
 * markers' numbers. `layout="cards"` leads with the sources instead, for a
 * turn whose answer IS what it found.
 */
const ChatSourcesBlock = forwardRef<HTMLDivElement, ChatSourcesProps>(function ChatSources(props, ref) {
  const {
    label,
    isGathering = false,
    isHeld = false,
    isOpen: isOpenProp,
    defaultIsOpen = false,
    onOpenChange,
    layout = "list",
    moreLabel,
    cardCount = 2,
    className,
    ...rest
  } = props;
  const ctx = useChatSources("ChatSources");
  const { sources, labels, citedIds, numberOf, registerReveal } = ctx;

  const [isOpen, setIsOpen] = useControllableState({
    value: isOpenProp,
    defaultValue: defaultIsOpen,
    onChange: onOpenChange,
  });

  // Rows by source id, so a marker's press can find its row — and the id a
  // press is waiting to scroll to, when its row has not mounted yet.
  const rows = useRef(new Map<string, HTMLElement>());
  const pendingReveal = useRef<string | null>(null);
  const scrollTo = (row: HTMLElement) =>
    row.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  const registerRow = (id: string, el: HTMLElement | null) => {
    if (!el) {
      rows.current.delete(id);
      return;
    }
    rows.current.set(id, el);
    // The list just unfolded under a press: this is the row it was for.
    if (pendingReveal.current === id) {
      pendingReveal.current = null;
      scrollTo(el);
    }
  };

  useEffect(() => {
    registerReveal((id) => {
      if (!numberOf.has(id)) return;
      const row = rows.current.get(id);
      if (row) scrollTo(row);
      else pendingReveal.current = id;
      setIsOpen(true);
    });
    return () => registerReveal(null);
  }, [registerReveal, numberOf, setIsOpen]);

  // "+N more" unmounts as the list opens, so focus is handed to the summary
  // that replaces it rather than falling to <body> (CONVENTIONS §10).
  const summaryRef = useRef<HTMLButtonElement>(null);
  const focusSummary = useRef(false);
  useEffect(() => {
    if (focusSummary.current && isOpen) {
      focusSummary.current = false;
      summaryRef.current?.focus();
    }
  }, [isOpen]);

  const single = sources.length === 1;
  const state = isGathering ? "gathering" : single ? "single" : isOpen ? "open" : "folded";

  const list = (
    <ol data-slot="chat-sources-list" role="list" className="m-0 flex list-none flex-col p-0">
      {sources.map((source, i) => (
        <li key={source.id} className="min-w-0">
          <SourceRow
            source={source}
            number={i + 1}
            isCited={citedIds.has(source.id)}
            labels={labels}
            rowRef={(el) => registerRow(source.id, el)}
          />
        </li>
      ))}
    </ol>
  );

  const summaryClass = cn(
    "group/summary flex min-h-5 cursor-pointer items-center gap-sm self-start rounded-sm text-start",
    FOCUS_RING,
  );
  const summaryText = (
    <span data-slot="chat-sources-count" className="font-body text-label-md text-ink-secondary">
      {label}
    </span>
  );

  let body: ReactNode;
  if (isGathering) {
    body = (
      // The count is LIVE: politely re-announced as sources arrive. Working,
      // not a spinner — the shape says which kind of wait this is.
      <div data-slot="chat-sources-gathering" role="status" className="flex h-5 items-center gap-sm">
        <StatusMatrix status="working" size="sm" isHeld={isHeld} />
        {summaryText}
      </div>
    );
  } else if (single) {
    // One source: no discs, no fold — the row itself.
    const only = sources[0]!;
    body = (
      <SourceRow source={only} isCited={citedIds.has(only.id)} labels={labels} rowRef={(el) => registerRow(only.id, el)} />
    );
  } else {
    const shown = layout === "cards" && sources.length > cardCount + 1 ? sources.slice(0, cardCount) : sources;
    const hidden = sources.slice(shown.length);
    body = (
      <Collapsible.Root open={isOpen} onOpenChange={(next: boolean) => setIsOpen(next)} className="flex flex-col gap-sm">
        {layout === "cards" && !isOpen ? (
          <div data-slot="chat-sources-cards" className="flex min-w-0 gap-sm">
            {shown.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                number={numberOf.get(source.id)!}
                isCited={citedIds.has(source.id)}
                rowRef={(el) => registerRow(source.id, el)}
                labels={labels}
              />
            ))}
            {hidden.length > 0 ? (
              <Collapsible.Trigger
                data-slot="chat-sources-more"
                onClick={() => {
                  focusSummary.current = true;
                }}
                className={cn(
                  "flex h-[96px] min-w-0 flex-1 basis-0 cursor-pointer flex-col items-start justify-between",
                  "rounded-md bg-elevated p-md text-start",
                  "transition-[background-color]", motionMicro,
                  "hover:bg-hover",
                  FOCUS_RING,
                )}
              >
                <KindDiscs kinds={discKinds(hidden)} ground="elevated" />
                <span className="font-body text-label-md text-ink-secondary">{moreLabel?.(hidden.length)}</span>
              </Collapsible.Trigger>
            ) : null}
          </div>
        ) : (
          <Collapsible.Trigger ref={summaryRef} data-slot="chat-sources-summary" className={summaryClass}>
            {isOpen ? null : <KindDiscs kinds={discKinds(sources)} ground="base" />}
            {summaryText}
            <Chevron />
          </Collapsible.Trigger>
        )}
        <Collapsible.Panel data-slot="chat-sources-panel">{list}</Collapsible.Panel>
      </Collapsible.Root>
    );
  }

  return (
    <div
      ref={ref}
      data-slot="chat-sources"
      data-layout={layout}
      data-state={state}
      className={cn("flex w-full min-w-0 flex-col", className)}
      {...rest}
    >
      {body}
    </div>
  );
});

/**
 * How an answer shows where it came from: the block (`ChatSources`), the
 * inline marker (`ChatSources.Citation`) and the data set they share
 * (`ChatSources.Provider`). A source's marker number is its position in the
 * list, so the three never disagree.
 */
export const ChatSources = Object.assign(ChatSourcesBlock, {
  Provider: ChatSourcesProvider,
  Citation: ChatSourcesCitation,
});
