"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SVGAttributes,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro, motionStandard } from "@/lib/motion";

/**
 * What the run is doing, as the matrix draws it.
 *
 * Live states loop; the three endings draw once and hold. Typing is the one
 * state about a PERSON rather than the agent, which is why it alone takes the
 * muted ink (see `INK`).
 */
export type StatusMatrixStatus =
  | "waiting"
  | "typing"
  | "thinking"
  | "working"
  | "streaming"
  | "progress"
  | "done"
  | "failed"
  | "stopped";

/** 16px beside a body-sm status line; 14px in a step list or a dock row. */
export type StatusMatrixSize = "sm" | "md";

// ---------------------------------------------------------------- the screen
//
// A 5×5 grid on a 16 viewBox, dot centres at 2 + 3n. Every cell sits at one
// of four levels. The rule that produces every trail, echo and hand-over:
// each tick, every cell fades ONE level, then the signal's beam re-lights the
// cells it touches this tick. frame(t) = max(beam(t), fade(frame(t − 1))).
// It is the simulator the Paper sheet was generated from, ported unchanged —
// the browser test checks the key frames against the sheet's own drawings.

type Level = 0 | 1 | 2 | 3;
const OFF = 0, EMBER = 1, GLOW = 2, LIT = 3;
type Ink = "accent" | "success" | "danger" | "muted";
type Beam = (t: number) => Array<readonly [number, Level]>;

interface Signal {
  /** Ticks to one loop. Absent on an ending, which runs once and holds. */
  period?: number;
  /** The tick drawn in stills, held by `isHeld` and under reduced motion. */
  key: number;
  /** Cells that never fall below a level while the signal runs. */
  floor?: Array<readonly [number, Level]>;
  beam: Beam;
}

const idx = (x: number, y: number) => y * 5 + x;

/** Python's round() — ties to even — so the port matches the simulator exactly. */
function pyRound(v: number): number {
  const f = Math.floor(v);
  return Math.abs(v - f - 0.5) < 1e-12 ? (f % 2 === 0 ? f : f + 1) : Math.round(v);
}

/** Anti-aliased vertical sample: the nearest row Lit, its neighbour Glow when the sample leans 0.3 towards it. */
function snap(y: number): Array<readonly [number, Level]> {
  const r = pyRound(y), f = y - r, out: Array<readonly [number, Level]> = [];
  if (r >= 0 && r <= 4) out.push([r, LIT]);
  const n = r + (f > 0 ? 1 : -1);
  if (Math.abs(f) >= 0.3 && n >= 0 && n <= 4) out.push([n, GLOW]);
  return out;
}

/** Keeps the brightest level when two samples land on one cell. */
function brightest(pairs: Iterable<readonly [number, Level]>): Array<readonly [number, Level]> {
  const m = new Map<number, Level>();
  for (const [i, l] of pairs) m.set(i, Math.max(m.get(i) ?? OFF, l) as Level);
  return [...m];
}

/** Typing lift per dot, by ticks from its press: anticipation, up, up, half-way down. */
const TYPING_LIFT: Record<number, number> = { [-1]: 0.35, 0: 1, 1: 1, 2: 0.65 };

/** The level meter's order: columns bottom-up, left to right. */
const FILL: number[] = [];
for (let x = 0; x < 5; x++) for (let y = 4; y >= 0; y--) FILL.push(idx(x, y));

const CHECK = [idx(0, 2), idx(1, 3), idx(2, 2), idx(3, 1), idx(4, 0)];
/** Failed opens from the centre: the middle, the inner diagonals, the corners. */
const CROSS_OUT = [[idx(2, 2)], [idx(1, 1), idx(3, 1), idx(1, 3), idx(3, 3)], [idx(0, 0), idx(4, 0), idx(0, 4), idx(4, 4)]];
const STOP = [1, 2, 3].flatMap((y) => [1, 2, 3].map((x) => idx(x, y)));

const SIGNALS: Record<Exclude<StatusMatrixStatus, "progress">, Signal> = {
  // A flat Lit trace; a soft dip drifts across half a column a tick — its
  // centre skipped, its edges Glow — then the trace rests.
  waiting: {
    period: 20,
    key: 14,
    beam: (t) => {
      const p = t / 2 - 1, out: Array<readonly [number, Level]> = [];
      for (let x = 0; x < 5; x++) {
        const d = Math.abs(x - p);
        if (d < 0.5 && t < 12) continue;
        out.push([idx(x, 2), d < 1.25 && t < 12 ? GLOW : LIT]);
      }
      return out;
    },
  },
  // Each dot leaves the baseline for the row above, 2 ticks apiece, eased on
  // its own column only.
  typing: {
    period: 10,
    key: 3,
    beam: (t) =>
      brightest(
        [0, 2, 4].flatMap((x, k) => {
          const u = (((t - 2 * k + 5) % 10) + 10) % 10 - 5;
          return snap(2 - (TYPING_LIFT[u] ?? 0)).map(([r, l]) => [idx(x, r), l] as const);
        }),
      ),
  },
  // A radial wave from the centre, sampled on the true distance:
  // I = e^(−r/1.6) · max(0, cos 2π(r − 0.25t′)/2.5), its tempo breathing
  // (t′ = t + 0.6 sin 2πt/20) so no two pulses match. The centre never goes dark.
  thinking: {
    period: 20,
    key: 9,
    floor: [[idx(2, 2), EMBER]],
    beam: (t) => {
      const tt = t + 0.6 * Math.sin((2 * Math.PI * t) / 20), out: Array<readonly [number, Level]> = [];
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 5; x++) {
          const r = Math.hypot(x - 2, y - 2);
          const i = Math.exp(-r / 1.6) * Math.max(0, Math.cos((2 * Math.PI * (r - 0.25 * tt)) / 2.5));
          const q: Level = i >= 0.62 ? LIT : i >= 0.28 ? GLOW : i >= 0.1 ? EMBER : OFF;
          if (q) out.push([idx(x, y), q]);
        }
      return out;
    },
  },
  // A Lissajous figure drifting in phase: line, ellipse, ring and back.
  working: {
    period: 20,
    key: 5,
    beam: (t) => {
      const phi = (2 * Math.PI * t) / 20, cells = new Set<number>();
      for (let i = 0; i < 12; i++) {
        const th = (2 * Math.PI * i) / 12;
        cells.add(idx(pyRound(2 + 2 * Math.sin(th)), pyRound(2 - 2 * Math.sin(th + phi))));
      }
      return [...cells].map((i) => [i, LIT] as const);
    },
  },
  // A sine travelling right a column a tick, its crest spread over two rows.
  streaming: {
    period: 10,
    key: 0,
    beam: (t) =>
      brightest(
        [0, 1, 2, 3, 4].flatMap((x) =>
          snap(2 - 2 * Math.sin((2 * Math.PI * (x - t)) / 10)).map(([r, l]) => [idx(x, r), l] as const),
        ),
      ),
  },
  // The endings draw once and hold — the beam keeps returning the whole
  // shape once it is drawn, which is what holds it.
  done: { key: 99, beam: (t) => CHECK.filter((_, i) => i <= t).map((i) => [i, LIT] as const) },
  failed: { key: 99, beam: (t) => CROSS_OUT.slice(0, t + 1).flat().map((i) => [i, LIT] as const) },
  stopped: { key: 99, beam: () => STOP.map((i) => [i, LIT] as const) },
};

/** A level meter: 4% a cell, and the next cell breathes — Glow, then Ember. */
function progressSignal(fraction: number): Signal {
  const n = pyRound(Math.min(1, Math.max(0, fraction)) * 25);
  return {
    period: 20,
    key: 10,
    beam: (t) => {
      const out: Array<readonly [number, Level]> = FILL.slice(0, n).map((i) => [i, LIT] as const);
      const next = FILL[n];
      if (next !== undefined) out.push([next, t < 10 ? GLOW : EMBER]);
      return out;
    },
  };
}

/**
 * The ink each status draws in. Live states are the agent and take the
 * accent; Typing is a person's presence and takes the muted ink, as Stopped
 * does — stopping is the reader's act, not a result.
 */
const INK: Record<StatusMatrixStatus, Ink> = {
  waiting: "accent", typing: "muted", thinking: "accent", working: "accent", streaming: "accent",
  progress: "accent", done: "success", failed: "danger", stopped: "muted",
};

/**
 * Literal class strings — Tailwind finds utilities by scanning source.
 *
 * Forced colours (the behaviour sheet's Measured row): the Off grid is
 * texture, not signal, so it drops out, and the figure draws in CanvasText —
 * the system ink, since the theme's accent means nothing in that mode.
 */
const LEVEL_CLASS = ["opacity-10 forced-colors:opacity-0", "opacity-15", "opacity-35", "opacity-100"] as const;
const INK_CLASS = {
  accent: "fill-accent-legible",
  success: "fill-success",
  danger: "fill-danger",
  muted: "fill-ink-muted",
} as const satisfies Record<Ink, string>;

const SIZE_CLASS = { sm: "size-[14px]", md: "size-4" } as const satisfies Record<StatusMatrixSize, string>;

interface Screen {
  lv: Level[];
  ink: Ink[];
}

function signalOf(status: StatusMatrixStatus, fraction: number): Signal {
  return status === "progress" ? progressSignal(fraction) : SIGNALS[status];
}

/** One tick of the screen: fade a level, hold the floor, let the beam re-light. */
function step(screen: Screen, signal: Signal, t: number, ink: Ink) {
  for (let i = 0; i < 25; i++) if (screen.lv[i]! > OFF) screen.lv[i] = (screen.lv[i]! - 1) as Level;
  for (const [i, l] of signal.floor ?? []) if (l > screen.lv[i]!) { screen.lv[i] = l; screen.ink[i] = ink; }
  for (const [i, l] of signal.beam(t)) if (l >= screen.lv[i]! && l > OFF) { screen.lv[i] = l; screen.ink[i] = ink; }
}

/**
 * The frame a signal settles to at its key tick, in the steady state — two
 * warm-up loops first, so trails that wrap round the loop are already there.
 * An ending's key frame is simply the whole shape.
 */
function keyFrame(signal: Signal, ink: Ink): Screen {
  const screen: Screen = { lv: Array<Level>(25).fill(OFF), ink: Array<Ink>(25).fill(ink) };
  if (signal.period === undefined) {
    for (const [i, l] of signal.beam(signal.key)) screen.lv[i] = l;
    return screen;
  }
  for (let t = 0; t <= signal.period * 2 + signal.key; t++) step(screen, signal, t % signal.period, ink);
  return screen;
}

// ---------------------------------------------------------------- one clock
//
// Every moving matrix on the page steps on the SAME tick, so two of them can
// never drift into a visible beat against each other. It is a scheduler, not
// a store: it holds no data, only the set of matrices waiting for the next
// tick, and it stops when that set is empty.
//
// The tick is `--ui-stagger-step`, read once from the first matrix to
// subscribe. A brand that retunes the token retunes the tempo; a page with no
// token gets a still matrix rather than an invented number.

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();
let tickMs = 0;
let frameId = 0;
let last = 0;
let carry = 0;

/**
 * The tick: `--ui-stagger-step` divided by `--ui-fx-ambient-speed`, the one
 * knob that moves every ambient loop together (0.5 calm, 1.7 expressive). The
 * speed belongs to the effects layer and is absent where that layer is not
 * loaded, which reads as 1.
 */
function readTick(el: Element): number {
  const style = getComputedStyle(el);
  const raw = style.getPropertyValue("--ui-stagger-step").trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const ms = raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : 0;
  const speed = Number.parseFloat(style.getPropertyValue("--ui-fx-ambient-speed"));
  return Number.isFinite(speed) && speed > 0 ? ms / speed : ms;
}

function onFrame(now: number) {
  if (!last) last = now;
  // A tab brought back from the background does not replay what it missed.
  carry += Math.min(now - last, tickMs * 10);
  last = now;
  while (carry >= tickMs && subscribers.size) {
    carry -= tickMs;
    for (const fn of [...subscribers]) fn();
  }
  // Rescheduled only while someone is listening: the last matrix to settle
  // (an ending, once drawn) stops the clock from inside its own tick.
  frameId = subscribers.size ? requestAnimationFrame(onFrame) : 0;
}

/** Returns null — and subscribes nothing — when there is no tick to keep. */
function subscribe(el: Element, fn: Subscriber): (() => void) | null {
  if (!subscribers.size) {
    tickMs = readTick(el);
    if (!tickMs) return null;
  }
  subscribers.add(fn);
  if (!frameId) {
    last = 0;
    carry = 0;
    frameId = requestAnimationFrame(onFrame);
  }
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };
}

// ---------------------------------------------------------------- reduced motion
//
// The token layer collapses every CSS duration under reduced motion, but this
// clock is JavaScript and the token cannot reach it (CONVENTIONS §8), so it
// asks the media query itself. The server answers "no preference": the first
// render is the key frame either way, so the two cannot disagree on markup.

const REDUCED = "(prefers-reduced-motion: reduce)";
function onReducedChange(notify: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
const isReduced = () => window.matchMedia(REDUCED).matches;
const isReducedOnServer = () => false;

// ---------------------------------------------------------------- props

interface StatusMatrixBaseProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "role" | "viewBox"> {
  size?: StatusMatrixSize;
  /**
   * Draw the status's key frame and keep it still. Only ONE matrix in a turn
   * moves — the live edge — and every other matrix in it is held, so the eye
   * has one place to go. Which one is the live edge is the caller's call: it
   * is a fact about the whole turn that no single matrix can see.
   */
  isHeld?: boolean;
  /**
   * The accessible name, which makes the matrix an image (`role="img"`).
   * Leave it out when a visible status line sits beside the matrix — the
   * line says it in words, and the matrix is then decorative.
   */
  label?: string;
}

/**
 * Progress needs its value; nothing else takes one. A union, so a progress
 * matrix with no value — a meter that cannot say how full it is — does not
 * compile.
 */
type StatusMatrixStatusProps =
  | { status: Exclude<StatusMatrixStatus, "progress">; value?: undefined; max?: undefined }
  | { status: "progress"; value: number; max?: number };

export type StatusMatrixProps = StatusMatrixBaseProps & StatusMatrixStatusProps;

/** What a moving matrix carries between ticks. Written only in effects and ticks. */
interface Run {
  screen: Screen;
  status: StatusMatrixStatus;
  t: number;
}

const copy = (s: Screen): Screen => ({ lv: [...s.lv], ink: [...s.ink] });

/**
 * The dot-matrix status mark: a 5×5 screen whose dots fade a level a tick,
 * so each state is a signal drawn on phosphor rather than a looping GIF.
 *
 * A signal, not a spinner. The shape says WHICH kind of wait this is —
 * waiting, thinking, working, writing — and the endings settle to a drawn
 * mark in their intent ink. It never carries the state alone: a status line
 * in words sits beside it, or `label` names it.
 *
 * Server-safe: the first render is the key frame, the same frame the sheet
 * draws, so server and client markup agree. The motion starts after mount,
 * continuing from that frame. A status changing hands over IN PLACE — the
 * outgoing signal fades a level a tick while the incoming one lights — so
 * there is never a second matrix or a jump. An ending arrived at draws on;
 * an ending mounted (a finished run scrolled back into view) is already drawn.
 */
export const StatusMatrix = forwardRef<SVGSVGElement, StatusMatrixProps>(function StatusMatrix(props, ref) {
  const { status, value, max = 100, size = "md", isHeld = false, label, className, ...rest } = props;

  const fraction = status === "progress" && max > 0 ? (value ?? 0) / max : 0;
  const ink = INK[status];
  const reduced = useSyncExternalStore(onReducedChange, isReduced, isReducedOnServer);
  const isStill = isHeld || reduced;

  const svgRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => svgRef.current!, []);

  const still = useMemo(() => keyFrame(signalOf(status, fraction), ink), [status, fraction, ink]);
  const [frame, setFrame] = useState<Screen | null>(null);

  // Leaving or entering stillness discards the last moving frame, so a matrix
  // resumed from held shows its key frame until its first tick rather than a
  // stale frame from before it was held.
  const [wasStill, setWasStill] = useState(isStill);
  if (wasStill !== isStill) {
    setWasStill(isStill);
    setFrame(null);
  }

  // What the next tick draws, and the subscription that draws it. Kept apart
  // on purpose: the subscription lives as long as the matrix is MOVING, and
  // a status or value change only rewrites what the next tick reads. Tearing
  // the subscription down on every change restarted the shared clock's phase
  // whenever this was the only moving matrix — which, by the one-live-edge
  // rule, it usually is — so an upload reporting faster than a tick froze the
  // meter, and a status flickering faster than a tick froze the hand-over.
  const runRef = useRef<Run | null>(null);
  const targetRef = useRef<{ signal: Signal; ink: Ink } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (isStill || !el) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      runRef.current = null;
      return;
    }
    const signal = signalOf(status, fraction);
    targetRef.current = { signal, ink };
    const prev = runRef.current;
    // Three ways in. Fresh — first mount, or resumed from held — continues
    // from the key frame already on screen. A new status hands over in place:
    // on the very next tick the outgoing figure fades a level while the
    // incoming one lights from its own tick 0 — the "one-tick lead" the
    // behaviour sheet draws, so there is never a beat with no figure at all.
    // A progress value moving is neither, and the meter breathes on.
    if (!prev) runRef.current = { screen: keyFrame(signal, ink), status, t: signal.key + 1 };
    else if (prev.status !== status) runRef.current = { screen: prev.screen, status, t: 0 };

    // An ending is finished once its shape is drawn and the outgoing trail
    // has faded: five cells at most, plus the three levels a trail falls. A
    // fresh ending starts past that point (its key tick is 99), so an ending
    // MOUNTED never subscribes at all — it is already drawn.
    const settled = (run: Run, s: Signal) => s.period === undefined && run.t > 8;
    if (settled(runRef.current!, signal) || unsubscribeRef.current) return;

    unsubscribeRef.current = subscribe(el, () => {
      const run = runRef.current, target = targetRef.current;
      if (!run || !target) return;
      const next = copy(run.screen);
      const { signal: s, ink: k } = target;
      step(next, s, s.period === undefined ? run.t : run.t % s.period, k);
      run.screen = next;
      run.t += 1;
      setFrame(next);
      if (settled(run, s)) {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
      }
    });
  }, [isStill, status, fraction, ink]);

  const screen = isStill || !frame ? still : frame;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 16 16"
      data-slot="status-matrix"
      data-status={status}
      data-size={size}
      {...(isHeld ? { "data-held": "" } : {})}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
      className={cn("shrink-0", SIZE_CLASS[size], className)}
      {...rest}
    >
      {screen.lv.map((level, i) => (
        <circle
          key={i}
          data-slot="status-matrix-dot"
          data-level={level}
          cx={2 + 3 * (i % 5)}
          cy={2 + 3 * Math.floor(i / 5)}
          r={1}
          className={cn(
            // An unlit dot takes the CURRENT ink: the grid behind a settled
            // Done is the success grid, not a leftover of the accent one.
            INK_CLASS[level === OFF ? ink : screen.ink[i]!],
            LEVEL_CLASS[level],
            "forced-colors:fill-[CanvasText]",
            "transition-[opacity,fill]",
            // Typing's lift is a press and wants the longer settle; every
            // other signal fades on the micro timing, under one tick, which
            // is what makes a trail read as phosphor rather than as steps.
            status === "typing" ? motionStandard : motionMicro,
          )}
        />
      ))}
    </svg>
  );
});
