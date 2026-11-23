import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Switch } from "@/ui/switch";
import { configureShaders, startShaders } from "@/lib/shader";
import { setAppearance, type Appearance } from "../lib/appearance";
import { useAppearance } from "../lib/use-appearance";

/** The four looks the home page offers. The swatch is each brand's own
 *  accent, read inside that brand's scope, so it can never drift from the
 *  theme it names. */
export const looks = [
  { value: "mono", label: "Mono" },
  { value: "soft", label: "Soft" },
  { value: "zero", label: "Zero" },
  { value: "hockney", label: "Hockney" },
] as const satisfies readonly { value: Appearance["brand"]; label: string }[];

const darkQuery = "(prefers-color-scheme: dark)";
function subscribeDark(listener: () => void) {
  const query = window.matchMedia(darkQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const systemIsDark = () => window.matchMedia(darkQuery).matches;

/**
 * The look switch: brand, effects and scheme for the whole page. It sits
 * under the hero, and once the reader scrolls past it a copy of the same
 * control floats at the foot of the window, so the look can be changed
 * beside whatever section is being read. It steps aside at the footer,
 * where the card fan has its own look card.
 */
export function LookDock() {
  const appearance = useAppearance();
  const isSystemDark = useSyncExternalStore(subscribeDark, systemIsDark, () => false);
  const isDark = appearance.scheme === "dark" || (appearance.scheme === "auto" && isSystemDark);
  const slot = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);

  // The page's gradient grounds. With effects off they hold one still
  // frame (the design's), with effects on they move. The dock is on every
  // load of the home page, so it owns the runtime for the page.
  useEffect(() => startShaders(), []);
  useEffect(() => { configureShaders({ reducedMotion: appearance.effects === "on" ? null : true }); }, [appearance.effects]);

  useEffect(() => {
    const element = slot.current;
    const end = document.querySelector("[data-dock-end]");
    if (!element) return;
    let isPast = false;
    let isAtEnd = false;
    const update = () => setIsFloating(isPast && !isAtEnd);
    const past = new IntersectionObserver(([entry]) => {
      isPast = !entry!.isIntersecting && entry!.boundingClientRect.top < 0;
      update();
    });
    const atEnd = new IntersectionObserver(([entry]) => {
      isAtEnd = entry!.isIntersecting || entry!.boundingClientRect.top < 0;
      update();
    });
    past.observe(element);
    if (end) atEnd.observe(end);
    return () => { past.disconnect(); atEnd.disconnect(); };
  }, []);

  const dock = (isCopy: boolean) => (
    <div className="look-dock" data-floating={isCopy ? "" : undefined} data-visible={isCopy ? String(isFloating) : undefined} inert={isCopy && !isFloating ? true : undefined}>
      <div className="look-options" role="radiogroup" aria-label="Look">
        {looks.map(look => (
          <label key={look.value} className="look-option" data-selected={appearance.brand === look.value ? "" : undefined}>
            <input type="radio" name={isCopy ? "look-floating" : "look"} value={look.value} checked={appearance.brand === look.value} onChange={() => setAppearance("brand", look.value)} />
            <span className="look-swatch" data-site-brand={look.value} aria-hidden="true" />
            {look.label}
          </label>
        ))}
      </div>
      <Switch className="look-switch" labelPlacement="start" isChecked={appearance.effects === "on"} onCheckedChange={isChecked => setAppearance("effects", isChecked ? "on" : "off")}>Effects</Switch>
      <Switch className="look-switch" labelPlacement="start" isChecked={isDark} onCheckedChange={isChecked => setAppearance("scheme", isChecked ? "dark" : "light")}>Dark</Switch>
    </div>
  );

  return (
    <>
      <div ref={slot} className="look-dock-slot">{dock(false)}</div>
      {dock(true)}
    </>
  );
}
