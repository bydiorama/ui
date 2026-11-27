"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/cn";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * Presence — content arriving and leaving (ADR 0028 §6; the Presence sheet,
 * Components - Handoff).
 *
 * It renders no element of its own. Each keyed child is an ITEM: Presence adds
 * `data-presence` (entering · present · leaving), its transition classes and a
 * ref to it, so the child must be an element that forwards `className`, `ref`
 * and `data-*` to its DOM node — every component in this library does
 * (CONVENTIONS §5). A child removed by the caller stays rendered, inert and
 * hidden from assistive technology, until its exit has finished.
 *
 * Every kind is a CSS transition on the motion tokens, so the motion level
 * (full · reduced · off) needs no code here: `reduced` zeroes rise's travel
 * through `--ui-motion-travel`, and `off` turns every duration to 1ms.
 */

export type PresenceKind = "fade" | "rise" | "collapse";

type ItemState = "entering" | "present" | "leaving";

interface Entry {
  key: string;
  element: ReactElement<ItemProps>;
  state: ItemState;
  /** Arrived after Presence mounted (or with `appear`): it plays the entrance. */
  isArrival: boolean;
}

/** The props Presence writes onto each item. */
interface ItemProps {
  className?: string;
  "data-presence"?: ItemState;
  "aria-hidden"?: boolean;
}

export interface PresenceProps extends OwnedSlot {
  /**
   * fade (default) — opacity only. rise — opacity and a lift of
   * `--ui-space-xs` × `--ui-motion-travel`, for content landing in a stream.
   * collapse — the item's height opens and folds, for rows in a list, so
   * nothing below jumps.
   */
  kind?: PresenceKind | undefined;
  /**
   * Play the entrance for the items present on the FIRST render too. Off by
   * default: a page that loads a list shows the list. Use it when one action
   * both mounts the Presence and adds the row.
   */
  appear?: boolean | undefined;
  /**
   * The items: elements, each with a stable `key` — the key is how Presence
   * tells a removal from a change. Text and other non-element children are
   * not rendered.
   */
  children?: ReactNode;
}

/**
 * Transition classes per kind, written out in full: Tailwind compiles only
 * class names it finds in source (CONVENTIONS §8, `@/lib/motion`).
 *
 * - Arrivals run on `--ui-duration-base`; every exit's fade on
 *   `--ui-duration-fast`. Nothing travels on the way out.
 * - `starting:` is CSS `@starting-style`, so an arrival needs no JavaScript.
 *   It is added only to arrivals, which is how items present at mount skip it.
 * - collapse folds the WHOLE box: height, vertical padding, border and
 *   margin, set inline from a measurement (an `auto` height cannot
 *   transition). Height alone stalls: with border-box sizing, `height: 0`
 *   stops at padding + border, so the row sat there invisible and then
 *   vanished in one jump.
 * - collapse leaving: the fade (fast) and the fold (base) start together —
 *   one gesture, one motion. Arriving: the fold starts at once and the fade
 *   half a fast step later, so the room opens before the content shows.
 * - Each property's duration and delay is written out: a shorter list than
 *   `transition-property` repeats cyclically, which would hand the fast
 *   duration to every other property.
 */
const KIND = {
  fade: {
    item: "transition-[opacity] duration-(--ui-duration-base) ease-(--ui-ease-out) data-[presence=leaving]:duration-(--ui-duration-fast) data-[presence=leaving]:opacity-0",
    arrival: "starting:opacity-0",
  },
  rise: {
    item: "transition-[opacity,translate] duration-(--ui-duration-base) ease-(--ui-ease-out) data-[presence=leaving]:duration-(--ui-duration-fast) data-[presence=leaving]:opacity-0",
    arrival: "starting:opacity-0 starting:translate-y-[calc(var(--ui-space-xs)*var(--ui-motion-travel))]",
  },
  collapse: {
    item: "transition-[opacity,height,padding-top,padding-bottom,border-top-width,border-bottom-width,margin-top,margin-bottom] duration-(--ui-duration-base) ease-(--ui-ease-out) data-[presence=entering]:[transition-delay:calc(var(--ui-duration-fast)/2),0s,0s,0s,0s,0s,0s,0s] data-[presence=leaving]:opacity-0 data-[presence=leaving]:[transition-duration:var(--ui-duration-fast),var(--ui-duration-base),var(--ui-duration-base),var(--ui-duration-base),var(--ui-duration-base),var(--ui-duration-base),var(--ui-duration-base),var(--ui-duration-base)]",
    arrival: "starting:opacity-0",
  },
} as const satisfies Record<PresenceKind, { item: string; arrival: string }>;

/** Element children, in order. `Children.toArray` gives each a key — the caller's, or its index. */
function keyed(children: ReactNode): ReactElement<ItemProps>[] {
  return Children.toArray(children).filter((child): child is ReactElement<ItemProps> => isValidElement(child));
}

/**
 * The next list: every current child in its order, with each departing item
 * kept in the place it held, after the neighbour that preceded it.
 */
function merge(previous: Entry[], children: ReactElement<ItemProps>[]): Entry[] {
  const before = new Map(previous.map((entry) => [entry.key, entry]));
  const now = new Set(children.map((child) => child.key!));
  const next: Entry[] = children.map((element) => {
    const was = before.get(element.key!);
    if (!was) return { key: element.key!, element, state: "entering", isArrival: true };
    // Added back while leaving: it turns around from the frame it is on.
    const state = was.state === "leaving" ? "present" : was.state;
    return { ...was, element, state };
  });
  previous.forEach((entry, index) => {
    if (now.has(entry.key)) return;
    const leaving: Entry = { ...entry, state: "leaving" };
    // After the nearest earlier neighbour that is still in the list.
    for (let i = index - 1; i >= 0; i--) {
      const at = next.findIndex((e) => e.key === previous[i]!.key);
      if (at !== -1) {
        next.splice(at + 1, 0, leaving);
        return;
      }
    }
    next.unshift(leaving);
  });
  return next;
}

export function Presence({ kind = "fade", appear = false, children }: PresenceProps) {
  const [state, setState] = useState(() => ({
    children,
    entries: keyed(children).map<Entry>((element) => ({
      key: element.key!,
      element,
      state: appear ? "entering" : "present",
      isArrival: appear,
    })),
  }));
  // Derived from props during render (React's documented pattern): no effect,
  // so an item never renders one frame in the wrong state.
  let entries = state.entries;
  if (state.children !== children) {
    entries = merge(state.entries, keyed(children));
    setState({ children, entries });
  }

  const settle = useCallback((key: string, from: ItemState) => {
    setState((s) => ({
      ...s,
      entries:
        from === "leaving"
          ? s.entries.filter((e) => !(e.key === key && e.state === "leaving"))
          : s.entries.map((e) => (e.key === key && e.state === "entering" ? { ...e, state: "present" } : e)),
    }));
  }, []);

  return (
    <>
      {entries.map((entry) => (
        <PresenceItem
          key={entry.key}
          entry={entry}
          kind={kind}
          onSettled={settle}
        />
      ))}
    </>
  );
}

/** Wait for the transitions running on `el` itself (never its subtree, where a spinner never finishes). */
async function transitionsDone(el: HTMLElement, isCancelled: () => boolean) {
  // One frame first: a transition is created on the style change, not on the
  // attribute write, so reading at once can find nothing on working code.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  for (let pass = 0; pass < 4 && !isCancelled(); pass++) {
    const running = el.getAnimations();
    if (!running.length) return;
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
}

/** The box a collapse folds: everything that gives an item vertical room. */
const BOX = ["height", "paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth", "marginTop", "marginBottom"] as const;
type Box = Record<(typeof BOX)[number], string>;

/** The box as it is drawn now: its rest size, or wherever a fold has it mid-flight. */
function measureBox(el: HTMLElement): Box {
  const cs = getComputedStyle(el);
  return Object.fromEntries(BOX.map((p) => [p, cs[p]])) as Box;
}
function setBox(el: HTMLElement, box: Box | "closed") {
  for (const p of BOX) el.style[p] = box === "closed" ? "0px" : box[p];
}
function releaseBox(el: HTMLElement) {
  for (const p of BOX) el.style[p] = "";
  el.style.overflow = "";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';


interface PresenceItemProps {
  entry: Entry;
  kind: PresenceKind;
  onSettled: (key: string, from: ItemState) => void;
}

/**
 * Where focus goes when `el` leaves: the nearest item after it that is not
 * leaving, else the nearest before it. Presence renders no element, so its
 * items are DOM siblings and the neighbour is found by walking them — a
 * registry of refs was tried first and lost the race against React
 * re-attaching a sibling's ref in the same commit.
 */
function neighbourOf(el: HTMLElement): HTMLElement | null {
  const isItem = (n: Element | null): n is HTMLElement =>
    n instanceof HTMLElement && n.hasAttribute("data-presence") && n.dataset.presence !== "leaving";
  for (let n = el.nextElementSibling; n; n = n.nextElementSibling) if (isItem(n)) return n;
  for (let n = el.previousElementSibling; n; n = n.previousElementSibling) if (isItem(n)) return n;
  return null;
}

function PresenceItem({ entry, kind, onSettled }: PresenceItemProps) {
  const ref = useRef<HTMLElement | null>(null);
  // collapse: the box at rest, measured before a fold first changes it, so an
  // item turned around mid-fold opens back to its real size.
  const rest = useRef<Box | null>(null);
  const { key, state, element } = entry;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const isCancelled = () => cancelled;

    if (state === "leaving") {
      // Focus moves BEFORE the item turns inert: setting inert on a focused
      // element drops focus to <body> and loses the reader's place, which is
      // why inert is set here rather than rendered as a prop.
      if (el.contains(document.activeElement)) {
        const target = neighbourOf(el);
        const focusable = target?.matches(FOCUSABLE) ? target : target?.querySelector<HTMLElement>(FOCUSABLE);
        focusable?.focus();
      }
      el.inert = true;
      if (kind === "collapse") {
        const folding = el.style.height !== "";
        const now = measureBox(el);
        if (!folding) rest.current = now;
        el.style.overflow = "clip";
        setBox(el, now);
        void el.offsetHeight; // commit the start box before changing it
        setBox(el, "closed");
      }
      void transitionsDone(el, isCancelled).then(() => {
        if (!cancelled) onSettled(key, "leaving");
      });
    } else {
      el.inert = false;
      // An arrival, or a collapse turned around mid-fold (its height is inline).
      const turning = kind === "collapse" && el.style.height !== "";
      if (state !== "entering" && !turning) return;
      if (kind === "collapse") {
        // Measured at rest, BEFORE the box is closed: read while squeezed, an
        // arrival ran to the squeezed height and snapped the rest of the way.
        if (!turning) rest.current = measureBox(el);
        const target = rest.current ?? measureBox(el);
        el.style.overflow = "clip";
        if (!turning) {
          setBox(el, "closed");
          void el.offsetHeight; // commit the closed box before opening it
        }
        setBox(el, target);
      }
      void transitionsDone(el, isCancelled).then(() => {
        if (cancelled) return;
        if (kind === "collapse") releaseBox(el);
        if (state === "entering") onSettled(key, "entering");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [state, key, kind, onSettled]);

  // useRender (the behaviour layer, ADR 0012) attaches our ref merged with the
  // item's OWN ref, which a cloneElement cannot do without reading a ref
  // during render. The classes go through cn() first, so they merge with the
  // item's className by tailwind-merge's rules rather than being concatenated.
  return useRender({
    render: cloneElement(element, {
      className: cn(element.props.className, KIND[kind].item, entry.isArrival && KIND[kind].arrival),
      "data-presence": state,
      ...(state === "leaving" ? { "aria-hidden": true } : {}),
    }),
    ref,
  });
}
