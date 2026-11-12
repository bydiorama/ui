import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ensureVisible, fitView, zoomAt, type Box, type ScaleLimits, type Size, type View } from "@/lib/graph";

/* useLayoutEffect warns on the server; the effect only measures the DOM. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface UseGraphViewportOptions {
  /** The drawing's bounds in world units, or null while there is nothing to draw. */
  content: Box | null;
  /**
   * The frame's size before it has been measured — what the server lays the
   * first frame out against. The frame is re-fitted once it is measured, if
   * nobody has panned or zoomed yet.
   */
  initialSize: Size;
  /** Space kept around the content when fitting. */
  padding?: number;
  limits?: ScaleLimits;
}

export interface GraphViewport {
  /** Attach to the frame: the element that clips the drawing and takes the gestures. */
  frameRef: (el: HTMLDivElement | null) => void;
  size: Size;
  view: View;
  /** The world layer's style: one transform for the HTML nodes and the SVG edges alike. */
  worldStyle: CSSProperties;
  /** True while a drag is panning — the world drops its transition so it tracks the pointer. */
  isPanning: boolean;
  fit: () => void;
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  /** Pan the least needed to bring a world box into view (follow focus). */
  reveal: (box: Box) => void;
  /** Pointer handlers for the frame: a drag on the ground pans. */
  bind: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  };
  /**
   * The keyboard path for every gesture above, for the component's own
   * onKeyDown to call first: `+`/`=` zoom in, `-` zoom out, `0` fits,
   * Shift + an arrow pans 64px. Returns true when it handled the key.
   */
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => boolean;
  /**
   * True when the last pointer press turned into a pan. A click handler on a
   * node checks it, so letting go of a drag over a node does not select it.
   */
  wasDrag: () => boolean;
}

/** Movement under this, in px, is a click rather than a pan. */
const DRAG_THRESHOLD = 4;

/**
 * Pan and zoom for a drawn graph — Diagram's and Network's viewport.
 *
 * The plan rules out d3-zoom (§3.4): its event model owns the DOM, which
 * React already does, and it has no keyboard path. This is the small
 * transform that replaces it, and every gesture here has a key binding in the
 * components that use it (`+`, `-`, `0`, Shift+arrows), which is what
 * check:gestures asks of a pointer initiator.
 *
 * - A drag on the ground pans. It becomes a pan only after 4px, so a click on
 *   a node is still a click.
 * - Pinch, or Ctrl/⌘ + wheel, zooms about the pointer. A plain wheel is left
 *   to the page: a diagram in the middle of an article must not swallow the
 *   reader's scroll.
 * - Until someone pans or zooms, the view follows the content: it fits when
 *   the frame is measured and again when the drawing grows.
 */
export function useGraphViewport({ content, initialSize, padding = 32, limits }: UseGraphViewportOptions): GraphViewport {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>(initialSize);
  // Callers pass fresh objects every render; everything below keys on their
  // numbers instead, so a new literal with the same values is the same view.
  const min = limits?.min;
  const max = limits?.max;
  const scaleLimits = useMemo<ScaleLimits>(() => ({ ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) }), [min, max]);
  const fitOptions = useMemo(() => ({ padding, ...scaleLimits }), [padding, scaleLimits]);
  const [view, setView] = useState<View>(() =>
    content ? fitView(content, initialSize, fitOptions) : { x: 0, y: 0, k: 1 },
  );
  const [isPanning, setIsPanning] = useState(false);
  const touched = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; view: View; moved: boolean } | null>(null);
  const dragged = useRef(false);
  // Handlers read the latest view and size without re-binding; the refs are
  // written after commit, which is before any handler can run.
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  useIsomorphicLayoutEffect(() => {
    viewRef.current = view;
    sizeRef.current = size;
  });
  const contentKey = content ? `${content.x},${content.y},${content.width},${content.height}` : "";
  const box = useMemo<Box | null>(() => {
    if (!contentKey) return null;
    const [x, y, width, height] = contentKey.split(",").map(Number) as [number, number, number, number];
    return { x, y, width, height };
  }, [contentKey]);

  const frameRef = useCallback((el: HTMLDivElement | null) => setFrame(el), []);

  useIsomorphicLayoutEffect(() => {
    if (!frame) return;
    const measure = () => {
      const r = frame.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [frame]);

  // Fit while nobody has taken the view over.
  useIsomorphicLayoutEffect(() => {
    if (touched.current || !box) return;
    setView(fitView(box, size, fitOptions));
  }, [box, size, fitOptions]);

  const fit = useCallback(() => {
    touched.current = false;
    if (box) setView(fitView(box, sizeRef.current, fitOptions));
  }, [box, fitOptions]);

  const zoomBy = useCallback(
    (factor: number) => {
      touched.current = true;
      const s = sizeRef.current;
      setView((v) => zoomAt(v, factor, { x: s.width / 2, y: s.height / 2 }, scaleLimits));
    },
    [scaleLimits],
  );

  const panBy = useCallback((dx: number, dy: number) => {
    touched.current = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const reveal = useCallback((box: Box) => {
    setView((v) => {
      const next = ensureVisible(v, box, sizeRef.current);
      if (next !== v) touched.current = true;
      return next;
    });
  }, []);

  // Wheel needs a non-passive listener to stop the page zooming on a pinch;
  // React's onWheel is passive.
  useEffect(() => {
    if (!frame) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      touched.current = true;
      const r = frame.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.01);
      setView((v) => zoomAt(v, factor, { x: e.clientX - r.left, y: e.clientY - r.top }, scaleLimits));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [frame, scaleLimits]);

  const end = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    dragged.current = d.moved;
    drag.current = null;
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const bind: GraphViewport["bind"] = {
    onPointerDown: (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      // A press on a control (Controls, a group's expand) is that control's.
      if ((e.target as Element).closest("button, a, input, [data-graph-no-pan]")) return;
      dragged.current = false;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, view: viewRef.current, moved: false };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        d.moved = true;
        touched.current = true;
        setIsPanning(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
    },
    onPointerUp: end,
    onPointerCancel: end,
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>): boolean => {
    if (e.altKey || e.ctrlKey || e.metaKey) return false;
    const step = 64;
    const pans: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.shiftKey && pans[e.key]) {
      const [dx, dy] = pans[e.key]!;
      panBy(dx, dy);
    } else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-" || e.key === "_") zoomBy(0.8);
    else if (e.key === "0") fit();
    else return false;
    e.preventDefault();
    return true;
  };

  const worldStyle: CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
    transformOrigin: "0 0",
  };

  return {
    frameRef,
    size,
    view,
    worldStyle,
    isPanning,
    fit,
    zoomBy,
    panBy,
    reveal,
    bind,
    onKeyDown,
    wasDrag: () => dragged.current,
  };
}
