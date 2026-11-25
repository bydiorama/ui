import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { durationOf, mountStack, type StackEngine } from "./stack/engine";
import { HOME, INK, baseOf, layers, riseOf, stateOf } from "./stack/layers";
import { plates } from "./stack/plates";
import { role } from "./stack/parts";

const last = layers.length - 1;
/** How many of the theme's loop beats one layer is held for: twelve seconds. */
const DWELL_BEATS = 6;

/** A plate's edge, drawn as the outline repeated downwards: the lit side, then
 *  the shaded side clipped to the left of the front corner. */
function Slab({ depth }: { depth: number }) {
  const copies = (className: string) => Array.from({ length: depth }, (_, n) => (
    <g key={n} transform={`translate(0 ${depth - n})`}><rect className={`stack-iso ${className}${n === 0 ? " stack-foot" : ""}`} x={-120} y={-120} width={240} height={240} rx={8} /></g>
  ));
  return <g className="stack-slab">{copies("stack-side")}<g clipPath="url(#stack-left)">{copies("stack-shade")}</g></g>;
}

/**
 * The drawing, rendered once at the resting layer. From then on the engine
 * owns its attributes, so it never re-renders: without script (or before
 * hydration) it is complete and still, with the waiting layers drawn as
 * faint intact sheets.
 */
const Drawing = memo(function Drawing() {
  return (
    <div className="stack-stage">
      <svg className="stack-svg" viewBox="0 0 520 700" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="stack-ground" width="24" height="24" patternUnits="userSpaceOnUse"><path className="stack-line" d="M24 0H0V24" fill="none" /></pattern>
          <pattern id="stack-rule" x="-120" y="-120" width="30" height="30" patternUnits="userSpaceOnUse"><path className="stack-line" d="M30 0H0V30" fill="none" /></pattern>
          {/* The ground fades out toward its edges. */}
          <radialGradient id="stack-ground-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="290"><stop offset=".3" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <mask id="stack-ground-mask" maskUnits="userSpaceOnUse" x="-300" y="-300" width="600" height="600"><rect x="-300" y="-300" width="600" height="600" fill="url(#stack-ground-fade)" /></mask>
          {/* One erosion front per plate, moved by the engine as the plate dissolves. */}
          {layers.map((layer, index) => (
            <g key={layer.key}>
              <radialGradient id={`stack-fade-${index}`} gradientUnits="userSpaceOnUse" cx="120" cy="120" r="340"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0" stopColor="#fff" /></radialGradient>
              <mask id={`stack-mask-${index}`} maskUnits="userSpaceOnUse" x="-170" y="-170" width="340" height="340"><rect x="-170" y="-170" width="340" height="340" fill={`url(#stack-fade-${index})`} /></mask>
            </g>
          ))}
          <clipPath id="stack-left" clipPathUnits="userSpaceOnUse"><rect data-shade x="-400" y="-400" width="400" height="900" /></clipPath>
        </defs>
        <g transform="translate(260 0)">
          <g className="stack-rig">
            <g transform="translate(0 5)"><g className="stack-iso"><rect x="-300" y="-300" width="600" height="600" fill="url(#stack-ground)" mask="url(#stack-ground-mask)" /></g></g>
            <line className="stack-guide" data-guide="-1" /><line className="stack-guide" data-guide="1" /><line className="stack-guide" data-guide="0" />
            {layers.map((layer, index) => {
              const Art = plates[layer.key];
              return (
                <g key={layer.key} className="stack-plate" data-plate={index} data-key={layer.key} data-state={stateOf(index, HOME)} style={{ "--stack-y": riseOf(index, HOME), "--stack-o": index > HOME ? INK[index - HOME] : 1 } as CSSProperties}>
                  {/* The three inks the engine reads for this plate's grains. */}
                  <g className="stack-probe"><g style={{ color: role("text-muted") }} /><g style={{ color: role("text-primary") }} /><g style={{ color: role("bg-accent-legible") }} /></g>
                  <Slab depth={layer.key === "proof" ? 2 : 4} />
                  <g className="stack-iso stack-body">
                    <rect className="stack-face" x={-120} y={-120} width={240} height={240} rx={8} />
                    <rect className="stack-rule" x={-120} y={-120} width={240} height={240} rx={8} fill="url(#stack-rule)" />
                    <g className="stack-art"><Art /></g>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <canvas className="stack-grains" aria-hidden="true" />
    </div>
  );
});

/**
 * The system as a stack of seven plates beside a legend that names them.
 *
 * The legend lists the layers in the order they are built, the seed first,
 * so its first row is the bottom plate. The section has no controls. While
 * it is on screen every layer has a timer: it is held for twelve seconds,
 * then the next row opens, and after the last the tour starts again at the
 * seed. Choosing a row or a plate jumps there and the timer carries on from
 * it. Keyboard focus in the legend holds the current layer. Under reduced
 * motion nothing advances and it rests on Components. Its look is the
 * page's: the engine follows the site's brand and scheme.
 */
export function LayerStack() {
  const root = useRef<HTMLDivElement>(null);
  const engine = useRef<StackEngine | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const isLanding = useRef(false);
  const [active, setActive] = useState(HOME);
  const [isTouring, setIsTouring] = useState(false);
  const [inView, setInView] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isCounting, setIsCounting] = useState(false);

  const choose = (index: number) => setActive(Math.max(0, Math.min(last, index)));

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const mounted = mountStack(element, { onPick: setActive });
    engine.current = mounted;
    // The tour starts at the seed. Reduced motion keeps the resting layer.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setIsTouring(!reduce.matches);
    if (!reduce.matches) { isLanding.current = true; setActive(0); setIsTouring(true); }
    reduce.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setInView(entry!.isIntersecting), { threshold: 0.35 });
    observer.observe(element.querySelector(".stack-svg")!);
    const onVisibility = () => setIsPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.destroy();
      engine.current = null;
      reduce.removeEventListener("change", sync);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // The move from the resting layer to the seed lands without easing, so the
  // tour does not open by taking the resting stack apart.
  useEffect(() => {
    const isInstant = isLanding.current && active === 0;
    if (isInstant) isLanding.current = false;
    engine.current?.show(active, isInstant);
  }, [active]);

  const isRunning = isTouring && inView && !isPageHidden && !isFocused;
  useEffect(() => {
    if (!isRunning || !root.current) return;
    // One dwell per layer, counted in the theme's loop beats; the open row's
    // rule counts the same time down in the stylesheet.
    const timer = window.setTimeout(() => setActive(current => current === last ? 0 : current + 1), DWELL_BEATS * durationOf(root.current, "--ui-duration-loop", 2000));
    // The rule restarts from empty: one frame without the transition, then on.
    let frame = window.requestAnimationFrame(() => { frame = window.requestAnimationFrame(() => setIsCounting(true)); });
    return () => { window.clearTimeout(timer); window.cancelAnimationFrame(frame); setIsCounting(false); };
  }, [isRunning, active]);

  const onKeyDown = (event: KeyboardEvent) => {
    // Down is the next row, which is the next layer up the stack.
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next = Math.max(0, Math.min(last, active + (event.key === "ArrowDown" ? 1 : -1)));
    choose(next);
    buttons.current[next]?.focus();
  };

  return (
    <div ref={root} className="stack" data-touring={isRunning ? "" : undefined} style={{ "--stack-base": baseOf(HOME), "--stack-dwell-beats": DWELL_BEATS } as CSSProperties}>
      <div className="stack-well"><Drawing /></div>
      <div
        className="stack-legend"
        onFocus={event => { if (event.target.matches(":focus-visible")) setIsFocused(true); }}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false); }}
      >
        <h2 id="stack-title">Seven layers run through the stack.</h2>
        <ol className="stack-list" aria-label="Layers, from the seed up" onKeyDown={onKeyDown}>
          {layers.map((layer, index) => {
            const isOpen = index === active;
            return (
              <li key={layer.key} className="stack-item" data-open={isOpen ? "" : undefined} data-counting={isOpen && isCounting ? "" : undefined}>
                <h3>
                  <button ref={element => { buttons.current[index] = element; }} type="button" className="stack-row" id={`stack-row-${layer.key}`} aria-expanded={isOpen} aria-controls={`stack-panel-${layer.key}`} onClick={() => choose(index)}>{layer.name}</button>
                </h3>
                <div className="stack-panel" id={`stack-panel-${layer.key}`} role="region" aria-labelledby={`stack-row-${layer.key}`}><p>{layer.summary}</p></div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
