import { useEffect, useRef, useState, type CSSProperties } from "react";

/** The Button taken apart into the four layers its tokens own, top to
 *  bottom, over the same ground as the layer stack below it (Paper: "Home v3
 *  — Stack section · 1440"). Each label names the token, and inks its layer's
 *  edge. */
const parts = [
  { key: "label", title: "Label", token: "button-sm, weight 600", top: 153 },
  { key: "ring", title: "Ring", token: "1.5 px inset hairline", top: 215 },
  { key: "surface", title: "Surface", token: "bg-accent, radius-md", top: 277 },
  { key: "focus", title: "Focus", token: "2 px outline, border-focus", top: 349 },
] as const;
type Part = (typeof parts)[number]["key"];

/** One plane of the drawing, centred on the button, `y` down the page. */
const iso = (y: number) => `matrix(0.866 0.5 -0.866 0.5 247 ${y})`;
/** The surface is a solid: its outline repeated once per unit of height. */
const wall = [3, 6];

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
        <defs>
          <pattern id="exploded-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path className="exploded-grid" d="M24 0H0V24" fill="none" /></pattern>
          {/* The ground fades out toward its edges. */}
          <radialGradient id="exploded-ground-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="150"><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <mask id="exploded-ground-mask" maskUnits="userSpaceOnUse" x="-156" y="-156" width="312" height="312"><rect x="-156" y="-156" width="312" height="312" fill="url(#exploded-ground-fade)" /></mask>
        </defs>
        <g transform={iso(370)}><rect x="-156" y="-156" width="312" height="312" fill="url(#exploded-grid)" mask="url(#exploded-ground-mask)" /></g>
        <path className="exploded-guides" d="M125.8 290V90M368.2 370V170M316.3 410V210" fill="none" />
        <g className="exploded-layer" data-part="focus" style={{ "--rest": "-196px" } as CSSProperties}>
          <g transform={iso(326)}><rect x="-118" y="-38" width="236" height="76" rx="14" fill="none" /></g>
        </g>
        <g className="exploded-layer" data-part="surface" style={{ "--rest": "-124px" } as CSSProperties}>
          <g transform={iso(254)}>
            <rect className="exploded-shadow" x="-104" y="-24" width="220" height="60" rx="8" />
            <rect className="exploded-wall exploded-edge" x="-110" y="-30" width="220" height="60" rx="8" />
            {wall.map(rise => <rect key={rise} className="exploded-wall" x={-110 - rise} y={-30 - rise} width="220" height="60" rx="8" />)}
            <rect className="exploded-top exploded-edge" x="-119" y="-39" width="220" height="60" rx="8" />
          </g>
        </g>
        <g className="exploded-layer" data-part="ring" style={{ "--rest": "-62px" } as CSSProperties}>
          <g transform={iso(192)}><rect x="-110" y="-30" width="220" height="60" rx="8" fill="none" /></g>
        </g>
        <g className="exploded-layer" data-part="label">
          <g transform={iso(130)}>
            <rect x="-110" y="-30" width="220" height="60" rx="8" />
            <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight="600" letterSpacing="-0.32">Save changes</text>
          </g>
        </g>
        <path className="exploded-leaders" d="M376 170h40M376 232h40M376 294h40M376 366h40" fill="none" />
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
