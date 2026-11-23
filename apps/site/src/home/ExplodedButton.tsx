import { useEffect, useRef, useState, type CSSProperties } from "react";

/** The Button taken apart into the four layers its tokens own, top to
 *  bottom. Each label names the token, and lights its layer. */
const parts = [
  { key: "label", title: "Label", token: "button-sm, weight 600", top: 153 },
  { key: "ring", title: "Ring", token: "1.5 px inset hairline", top: 215 },
  { key: "surface", title: "Surface", token: "bg-accent, radius-md", top: 277 },
  { key: "focus", title: "Focus", token: "2 px outline, border-focus", top: 349 },
] as const;
type Part = (typeof parts)[number]["key"];

const iso = (y: number) => `matrix(0.866 0.5 -0.866 0.5 156 ${y})`;

/**
 * The layers start stacked and part once the drawing is on screen. Then the
 * labels take turns, unless the reader points at one: pointing or focusing
 * holds that layer until they leave.
 */
export function ExplodedButton() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Part>("label");
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(false);
  // Opens once and stays open; the label cycle runs only while it is seen.
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry!.isIntersecting);
      if (entry!.isIntersecting) setIsOpen(true);
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive(current => parts[(parts.findIndex(part => part.key === current) + 1) % parts.length]!.key);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [inView, held]);

  return (
    <div ref={root} className="exploded" data-open={isOpen ? "" : undefined} data-active={active}>
      <svg className="exploded-drawing" width="656" height="456" viewBox="0 0 656 456" aria-hidden="true">
        <g className="exploded-layer" data-part="focus" style={{ "--rest": "-196px" } as CSSProperties}>
          <g transform={iso(246)}><rect x="-8" y="-8" width="256" height="82" rx="22" fill="none" strokeWidth="2" /></g>
        </g>
        <g className="exploded-layer" data-part="shadow" style={{ "--rest": "-132px" } as CSSProperties}>
          <g transform={iso(182)}><rect width="240" height="66" rx="14" /></g>
        </g>
        <g className="exploded-layer" data-part="surface" style={{ "--rest": "-124px" } as CSSProperties}>
          <g transform={iso(174)}><rect width="240" height="66" rx="14" /></g>
        </g>
        <g className="exploded-layer" data-part="ring" style={{ "--rest": "-62px" } as CSSProperties}>
          <g transform={iso(112)}><rect width="240" height="66" rx="14" fill="none" strokeWidth="1.5" /></g>
        </g>
        <g className="exploded-layer" data-part="label">
          <g transform={iso(50)}>
            <rect width="240" height="66" rx="14" fill="none" />
            <text x="120" y="41" textAnchor="middle" fontSize="21" fontWeight="600" letterSpacing="-0.42">Save changes</text>
          </g>
        </g>
        <path className="exploded-leaders" d="M376 170 L416 170 M376 232 L416 232 M376 294 L416 294 M390 366 L416 366" fill="none" />
      </svg>
      <ul className="exploded-labels" aria-label="The parts of a button">
        {parts.map(part => (
          <li key={part.key} style={{ top: part.top }}>
            <button
              type="button"
              aria-pressed={active === part.key}
              onPointerEnter={() => { setActive(part.key); setHeld(true); }}
              onPointerLeave={() => setHeld(false)}
              onFocus={() => { setActive(part.key); setHeld(true); }}
              onBlur={() => setHeld(false)}
              onClick={() => setActive(part.key)}
            >
              <strong>{part.title}</strong>
              <span>{part.token}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
