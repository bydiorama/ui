import { useEffect, useRef, useState, type CSSProperties } from "react";

/** The Button taken apart into the four layers its tokens own, top to
 *  bottom, over the same ground as the layer stack below it (Paper: "Home v3
 *  — Stack section · 1440"). Each label names the token, and inks its layer's
 *  edge. Drawn as the stack's schematic is: flat hairline sheets, softly
 *  shaded, in the page's own look (its radii, strokes and elevation). */
const parts = [
  { key: "label", title: "Label", token: "button-sm, weight 600", top: 144 },
  { key: "ring", title: "Ring", token: "1.5 px inset hairline", top: 212 },
  { key: "surface", title: "Surface", token: "bg-accent, radius-md", top: 280 },
  { key: "focus", title: "Focus", token: "2 px outline, border-focus", top: 358 },
] as const;
type Part = (typeof parts)[number]["key"];

/** One plane of the drawing, centred on the button, `y` down the page. */
const iso = (y: number) => `matrix(0.866 0.5 -0.866 0.5 247 ${y})`;

/**
 * Composition. The drawing is authored on a 656 by 456 sheet; the component
 * shows a window of it, cut to the ink so it sits centred in its well: the
 * sheets with their labels beside them on a wide well, and on a narrow one
 * the sheets alone, with every layer inked.
 *
 * The layers start stacked and part once the drawing is on screen. Nothing
 * plays on its own after that: a label inks its layer when the reader points
 * at it, focuses it or presses it, and the last one stays inked.
 */
export function ExplodedButton() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Part>("label");
  // Opens once and stays open.
  const [isOpen, setIsOpen] = useState(false);

  // A brand with no shadows of its own is a flat look: no shading here either.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const sync = () => element.toggleAttribute("data-flat", getComputedStyle(element).getPropertyValue("--ui-shadow-md").trim() === "none");
    sync();
    document.addEventListener("appearance-change", sync);
    return () => document.removeEventListener("appearance-change", sync);
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry!.isIntersecting) return;
      setIsOpen(true);
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="exploded" data-open={isOpen ? "" : undefined} data-active={active}>
      <div className="exploded-figure"><svg className="exploded-drawing" width="656" height="456" viewBox="0 0 656 456" aria-hidden="true">
        <defs>
          <pattern id="exploded-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path className="exploded-grid" d="M24 0H0V24" fill="none" /></pattern>
          {/* The ground fades out toward its edges. */}
          <radialGradient id="exploded-ground-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="150"><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <mask id="exploded-ground-mask" maskUnits="userSpaceOnUse" x="-156" y="-156" width="312" height="312"><rect x="-156" y="-156" width="312" height="312" fill="url(#exploded-ground-fade)" /></mask>
          {/* Shading: a sheet darkens a touch toward the front corner, and
              the parts rest on a soft shadow. Mixed from the theme's roles. */}
          <linearGradient id="exploded-sheet-shade" x1="0" y1="0" x2="1" y2="1"><stop className="exploded-sheet-0" offset="0" /><stop className="exploded-sheet-1" offset="1" /></linearGradient>
          <linearGradient id="exploded-accent-shade" x1="0" y1="0" x2="1" y2="1"><stop className="exploded-accent-0" offset="0" /><stop className="exploded-accent-1" offset="1" /></linearGradient>
          <radialGradient id="exploded-shadow-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="150"><stop className="exploded-shadow-0" offset=".2" /><stop className="exploded-shadow-1" offset="1" /></radialGradient>
        </defs>
        <g transform={iso(379)}>
          <rect x="-156" y="-156" width="312" height="312" fill="url(#exploded-grid)" mask="url(#exploded-ground-mask)" />
          <rect className="exploded-shadow" x="-150" y="-150" width="300" height="300" fill="url(#exploded-shadow-fade)" />
        </g>
        <g className="exploded-layer" data-part="focus" style={{ "--rest": "-214px" } as CSSProperties}>
          <g transform={iso(335)}><rect className="exploded-outline" x="-118" y="-38" width="236" height="76" rx="14" fill="none" /></g>
        </g>
        <g className="exploded-layer" data-part="surface" style={{ "--rest": "-136px" } as CSSProperties}>
          <g transform={iso(257)}><rect x="-110" y="-30" width="220" height="60" rx="8" /></g>
        </g>
        <g className="exploded-layer" data-part="ring" style={{ "--rest": "-68px" } as CSSProperties}>
          <g transform={iso(189)}><rect x="-110" y="-30" width="220" height="60" rx="8" fill="none" /></g>
        </g>
        <g className="exploded-layer" data-part="label">
          <g transform={iso(121)}>
            <rect x="-110" y="-30" width="220" height="60" rx="8" />
            <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight="600" letterSpacing="-0.32">Save changes</text>
          </g>
        </g>
        <path className="exploded-leaders" d="M376 161h40M376 229h40M376 297h40M376 375h40" fill="none" />
      </svg></div>
      <ul className="exploded-labels" aria-label="The parts of a button">
        {parts.map(part => (
          <li key={part.key} style={{ "--top": `${part.top}px` } as CSSProperties}>
            <button
              type="button"
              aria-pressed={active === part.key}
              onPointerEnter={() => setActive(part.key)}
              onFocus={() => setActive(part.key)}
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
