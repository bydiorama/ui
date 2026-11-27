import { motionLevel, subscribeMotionLevel } from "@/lib/motion";

/** A duration token in milliseconds. A build may rewrite `2000ms` as `2s`,
 *  so the unit is read, not assumed. */
export function durationOf(element: Element, name: string, fallback: number) {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(getComputedStyle(element).getPropertyValue(name).trim());
  if (!match) return fallback;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

/** Retarget the selected fill from its painted position on a rapid reversal. */
export function slideSelection(previous: HTMLElement | null, target: HTMLElement) {
  const from = previous?.querySelector<HTMLElement>(".selection-fill");
  const fill = target.querySelector<HTMLElement>(".selection-fill");
  if (!previous || !from || !fill || previous === target || motionLevel(target) !== "full") return;
  // Offsets share the controls' local coordinate system, including on rotated
  // cards and horizontally scrolled tracks. Read the in-flight frame first.
  const style = getComputedStyle(from);
  const [dx, dy] = style.translate.split(" ").map(value => parseFloat(value) || 0);
  const x = previous.offsetLeft - target.offsetLeft + (dx ?? 0);
  const y = previous.offsetTop - target.offsetTop + (dy ?? 0);
  const width = style.width;
  for (const animation of from.getAnimations()) {
    if (animation.id === "selection-slide") animation.cancel();
  }
  const slide = fill.animate([
    { translate: `${x}px ${y}px`, width },
    { translate: "0px", width: getComputedStyle(target).width },
  ], {
    id: "selection-slide",
    duration: durationOf(target, "--ui-duration-base", 200),
    easing: getComputedStyle(target).getPropertyValue("--ui-ease-out").trim(),
  });
  const unsubscribe = subscribeMotionLevel(() => {
    if (motionLevel(target) !== "full") slide.cancel();
  });
  void slide.finished.then(unsubscribe, unsubscribe);
}

export function slideRadioSelection(input: HTMLInputElement) {
  const label = input.labels?.[0];
  if (label) slideSelection(label.closest('[role="radiogroup"]')?.querySelector<HTMLElement>("[data-selected]") ?? null, label);
}
