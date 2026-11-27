import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { slideRadioSelection } from "../lib/site-motion";
import { Drawer } from "@/ui/drawer";
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

/** Whether the page currently paints dark, the scheme resolved against the system. */
export function useIsDark() {
  const appearance = useAppearance();
  const isSystemDark = useSyncExternalStore(subscribeDark, systemIsDark, () => false);
  return appearance.scheme === "dark" || (appearance.scheme === "auto" && isSystemDark);
}

/**
 * The page's gradient grounds. With effects off they hold one still frame
 * (the design's), with effects on they move. Whatever offers the look owns
 * the runtime for the page, so it runs even while the controls are closed.
 */
export function useShaderRuntime() {
  const appearance = useAppearance();
  useEffect(() => startShaders(), []);
  useEffect(() => { configureShaders({ reducedMotion: appearance.effects === "on" ? null : true }); }, [appearance.effects]);
}

/** The controls themselves: the four looks, then Effects and Dark. `name` keeps two copies' radios apart. */
export function LookControls({ name = "look" }: { name?: string }) {
  const appearance = useAppearance();
  const isDark = useIsDark();
  return <>
    <div className="look-options" role="radiogroup" aria-label="Look">
      {looks.map(look => (
        <label key={look.value} className="look-option" data-selected={appearance.brand === look.value ? "" : undefined}>
          <input type="radio" name={name} value={look.value} checked={appearance.brand === look.value} onChange={event => {
            slideRadioSelection(event.currentTarget);
            setAppearance("brand", look.value);
          }} />
          <span className="look-fill selection-fill" aria-hidden="true" />
          <span className="look-swatch" data-site-brand={look.value} aria-hidden="true" />
          {look.label}
        </label>
      ))}
    </div>
    <div className="look-switches">
      <Switch className="look-switch" labelPlacement="start" isChecked={appearance.effects === "on"} onCheckedChange={isChecked => setAppearance("effects", isChecked ? "on" : "off")}>Effects</Switch>
      <Switch className="look-switch" labelPlacement="start" isChecked={isDark} onCheckedChange={isChecked => setAppearance("scheme", isChecked ? "dark" : "light")}>Dark</Switch>
    </div>
  </>;
}

/**
 * The look switch: brand, effects and scheme for the whole page. It sits
 * under the hero, and once the reader scrolls past it a copy of the same
 * control floats at the foot of the window, so the look can be changed
 * beside whatever section is being read. It steps aside at the footer,
 * where the card fan has its own look card.
 *
 * `isFloatingOnly` drops the inline dock: the floating one is shown from
 * the top of the page (the components page, where the switch is a tool
 * beside the catalog rather than a section of its own). A component page
 * offers the same `LookControls` from its stage bar instead.
 */
export function LookDock({ isFloatingOnly = false }: { isFloatingOnly?: boolean }) {
  const slot = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);
  useShaderRuntime();

  useEffect(() => {
    const element = slot.current;
    const end = document.querySelector("[data-dock-end]");
    if (!element && !isFloatingOnly) return;
    let isPast = isFloatingOnly;
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
    update();
    if (element) past.observe(element);
    if (end) atEnd.observe(end);
    return () => { past.disconnect(); atEnd.disconnect(); };
  }, [isFloatingOnly]);

  const dock = (isCopy: boolean) => (
    <div className="look-dock" data-floating={isCopy ? "" : undefined} data-visible={isCopy ? String(isFloating) : undefined} inert={isCopy && !isFloating ? true : undefined}>
      <LookControls name={isCopy ? "look-floating" : "look"} />
    </div>
  );

  return (
    <>
      {!isFloatingOnly && <div ref={slot} className="look-dock-slot">{dock(false)}</div>}
      {dock(true)}
      <LookDrawer isVisible={isFloating} />
    </>
  );
}

/**
 * The floating copy on a phone. The dock is wider than the window there, so
 * what floats is one round button showing the current look, and the controls
 * come up in a Drawer. CSS shows this where it hides the floating dock, so
 * only one of the two is ever reachable.
 */
function LookDrawer({ isVisible }: { isVisible: boolean }) {
  return (
    <Drawer>
      <Drawer.Trigger render={
        <button type="button" className="look-fab" data-visible={String(isVisible)} inert={!isVisible ? true : undefined} aria-label="Change the look">
          <span className="look-fab-swatch" aria-hidden="true" />
        </button>
      } />
      <Drawer.Panel label="Change the look">
        <Drawer.Body>
          <Drawer.Title>Change the look</Drawer.Title>
          <div className="look-sheet"><LookControls name="look-drawer" /></div>
        </Drawer.Body>
      </Drawer.Panel>
    </Drawer>
  );
}
