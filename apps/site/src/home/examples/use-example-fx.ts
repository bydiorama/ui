import { fx } from "@/lib/fx";
import { useAppearance } from "../../lib/use-appearance";

/**
 * The page's Effects switch, as the example screens wear it: the same finish
 * the card fan gives each part, so turning Effects on changes the screens the
 * way it changes the fan. Each value is a class for the part's root, or
 * undefined while Effects is off (cn drops it).
 *
 * - primary: the filled action, lit and textured (the fan's Button).
 * - card: a pane of glass with a lit edge (the fan's Look card).
 * - panel: a floating surface — a toolbar island, a menu — frosted.
 * - meter: a fill with a sweep of light (the fan's Slider).
 */
export function useExampleFx() {
  const isOn = useAppearance().effects === "on";
  return {
    isOn,
    primary: isOn ? fx("sheen", "grain") : undefined,
    card: isOn ? fx("glass", "edge") : undefined,
    panel: isOn ? fx("glass") : undefined,
    meter: isOn ? fx("sheen") : undefined,
  };
}
