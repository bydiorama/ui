/**
 * The shader runtime, in a real browser with a real WebGL2 context
 * (ADR 0022). check:fx holds the first two clauses of the admission rule on
 * the source; the last two only exist here:
 *
 *   3. the floor is the component — not started, stopped, or without a
 *      context, the part is exactly what the component draws;
 *   4. the ink keeps its contrast — measured on the pixels the shader drew,
 *      for every part that carries one, in both schemes and under a brand
 *      whose accent is the hardest to keep legible.
 *
 * And the regression that made the runtime insert a fill's canvas right
 * after the fill: the Slider's thumb must paint above it.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, type CSSProperties, type ReactElement } from "react";

import { contrastRatio, resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { fx } from "@/lib/fx";
import { configureShaders, readColor, sampleShader, startShaders } from "@/lib/shader";
import { Button } from "@/ui/button/button.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { Switch } from "@/ui/switch/switch.tsx";

const mounted: Array<{ root: Root; host: HTMLElement }> = [];
const stops: Array<() => void> = [];

function render(ui: ReactElement, style?: CSSProperties): HTMLElement {
  const host = document.createElement("div");
  if (style) Object.assign(host.style, style);
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  mounted.push({ root, host });
  return host;
}

function start() {
  const stop = startShaders();
  stops.push(stop);
  return stop;
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  for (const { root, host } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  configureShaders({ reducedMotion: null, forceFloor: false, freezeAt: null });
});

const q = (c: ParentNode, s: string) => {
  const el = c.querySelector<HTMLElement>(s);
  if (!el) throw new Error(`no ${s}`);
  return el;
};

async function until(check: () => boolean, what: string, ms = 3000) {
  const end = performance.now() + ms;
  while (!check()) {
    if (performance.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => requestAnimationFrame(r));
  }
}

const drawing = (root: HTMLElement, name: string) => () =>
  ["live", "still"].includes(root.getAttribute(`data-fx-${name}`) ?? "");

describe("the floor is the component", () => {
  test("before startShaders() nothing is mounted and nothing is marked", () => {
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    expect(button.querySelector("canvas")).toBeNull();
    expect(button.hasAttribute("data-fx-aurora")).toBe(false);
  });

  test("started, one canvas covers the part's border box and the root says it is live", async () => {
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    start();
    await until(drawing(button, "aurora"), "aurora to draw");
    expect(button.getAttribute("data-fx-aurora")).toBe("live");
    // The label's web font can land after the canvas was first laid out, and
    // on a cold runner it does: the button grows ~6px and the runtime's
    // ResizeObserver re-lays the canvas before the NEXT paint. Measure after
    // that paint, or this reads the gap between two correct states.
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = q(button, "canvas.ui-fx-canvas-aurora");
    const a = canvas.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    for (const k of ["left", "top", "width", "height"] as const) expect(Math.abs(a[k] - b[k]), k).toBeLessThan(0.5);
    // It fades in over the floor (--ui-duration-enter), so look once it has.
    await until(() => getComputedStyle(canvas).opacity === "1", "the canvas to fade in");
  });

  test("stopped, everything is put back: no canvas, no state, no inline styles", async () => {
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    const before = button.getAttribute("style");
    const stop = start();
    await until(drawing(button, "aurora"), "aurora to draw");
    stop();
    expect(button.querySelector("canvas")).toBeNull();
    expect(button.hasAttribute("data-fx-aurora")).toBe(false);
    expect(button.getAttribute("style")).toBe(before);
  });

  test("callers are counted: StrictMode's double effect shares one runtime", async () => {
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    const first = start();
    start();
    first();
    first(); // a second call of the same stop is a no-op
    await until(drawing(button, "aurora"), "aurora to keep drawing");
    expect(button.querySelectorAll("canvas").length).toBe(1);
  });

  test("without a context the part keeps its own fill, and the canvas stays hidden", async () => {
    configureShaders({ forceFloor: true });
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    start();
    await until(() => button.getAttribute("data-fx-aurora") === "floor", "the floor state");
    expect(getComputedStyle(q(button, "canvas")).opacity).toBe("0");
  });

  test("reduced motion draws one still frame", async () => {
    configureShaders({ reducedMotion: true });
    const button = q(render(<Button className={fx("aurora")}>Publish</Button>), '[data-slot="button"]');
    start();
    await until(() => button.getAttribute("data-fx-aurora") === "still", "the still state");
  });
});

describe("stacking", () => {
  test("a Slider's thumb paints above its fill's canvas", async () => {
    const host = render(<Slider label="Grain amount" defaultValue={64} className={fx("aurora")} />);
    start();
    await until(drawing(q(host, '[data-slot="slider"]'), "aurora"), "aurora to draw");
    const fill = q(host, '[data-slot="slider-fill"]');
    const canvas = q(host, "canvas.ui-fx-canvas-aurora");
    // Inserted directly after the fill, so every later sibling paints above.
    expect(fill.nextElementSibling).toBe(canvas);
    const thumb = q(host, '[data-slot="slider-thumb"]');
    const r = thumb.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    expect(hit && thumb.contains(hit), `the topmost element at the thumb's centre is ${hit?.outerHTML.slice(0, 80)}`).toBe(true);
  });

  test("the inline Slider carries text on its fill, so aurora leaves it at its floor", async () => {
    const host = render(<Slider variant="inline" label="Opacity" defaultValue={40} className={fx("aurora")} />);
    start();
    await new Promise((r) => setTimeout(r, 100));
    expect(host.querySelector("canvas")).toBeNull();
  });
});

describe("state follows the component", () => {
  test("a Switch's light is off while it is off, and on once it is checked", async () => {
    configureShaders({ freezeAt: 4 });
    const host = render(<Switch className={fx("aurora")}>Sync</Switch>);
    const root = q(host, '[data-slot="switch"]');
    start();
    await until(drawing(root, "aurora"), "aurora to draw");
    const peak = () => {
      const s = sampleShader(root, "aurora");
      if (!s) return -1;
      let max = 0;
      for (let i = 3; i < s.data.length; i += 4) max = Math.max(max, s.data[i]!);
      return max;
    };
    expect(peak()).toBe(0);
    act(() => q(host, "input").click());
    await until(() => peak() === 255, "the light to come on");
  });

  test("a busy Button lights its halo; idle, the halo is dark", async () => {
    configureShaders({ freezeAt: 2 });
    const host = render(
      <div className="p-xl">
        <Button className={fx("halo")} isBusy>
          Publishing
        </Button>
      </div>,
    );
    const button = q(host, '[data-slot="button"]');
    start();
    await until(drawing(button, "halo"), "halo to draw");
    const lit = () => {
      const s = sampleShader(button, "halo");
      let sum = 0;
      for (let i = 3; i < (s?.data.length ?? 0); i += 4) sum += s!.data[i]!;
      return sum;
    };
    await until(() => lit() > 0, "the halo to light");
  });
});

// --------------------------------------------------------------- contrast

/** The hardest accent to keep ink legible on: pale yellow, as in the stress stories. */
const PALE: ThemeSeed = {
  colors: {
    bg: "#fffdf5",
    surface: "#ffffff",
    muted: "#f4ecd8",
    textPrimary: "#1a1400",
    textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)",
    accent: "#ffe066",
  },
};

const THEMES: Array<[string, CSSProperties]> = [
  ["theme zero", toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED })) as CSSProperties],
  ["pale yellow", toStyleObject(resolveThemePair(PALE)) as CSSProperties],
];

/** Each part that carries ink, the ink, and the floor it keeps. */
const GUARDED: Array<{ name: string; ui: ReactElement; root: string; ink: string; floor: number }> = [
  { name: "Button label", ui: <Button className={fx("aurora")}>Publish</Button>, root: '[data-slot="button"]', ink: "--ui-text-on-accent", floor: 4.5 },
  { name: "Switch track vs page", ui: <Switch defaultIsChecked className={fx("aurora")}>Sync</Switch>, root: '[data-slot="switch"]', ink: "--ui-bg-base", floor: 3 },
  { name: "Progress fill vs track", ui: <Progress label="Uploading" value={70} className={fx("aurora")} />, root: '[data-slot="progress"]', ink: "--ui-bg-sunken", floor: 3 },
  // A ground guards the WEAKEST ink placed on it: muted, body text.
  {
    name: "ground vs muted ink",
    ui: <div data-ground className={fx("aurora")} style={{ width: 320, height: 160 }} />,
    root: "[data-ground]",
    ink: "--ui-text-muted",
    floor: 4.5,
  },
];

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** The least contrast between any fully covered pixel and the ink. */
function worst(root: HTMLElement, ink: string) {
  const s = sampleShader(root, "aurora");
  if (!s) return NaN;
  const against = hex(readColor(root, ink).map((c) => c * 255));
  const seen = new Map<string, number>();
  let min = Infinity;
  for (let i = 0; i < s.data.length; i += 4) {
    if (s.data[i + 3] !== 255) continue;
    const key = hex([s.data[i]!, s.data[i + 1]!, s.data[i + 2]!]);
    let ratio = seen.get(key);
    if (ratio === undefined) seen.set(key, (ratio = contrastRatio(key, against)));
    min = Math.min(min, ratio);
  }
  return seen.size ? min : NaN;
}

describe("the guard keeps the ink's contrast, per pixel", () => {
  const cases = THEMES.flatMap(([theme, style]) =>
    (["light", "dark"] as const).flatMap((scheme) => GUARDED.map((g) => [theme, scheme, g, style] as const)),
  );

  test.each(cases)("%s, %s: %s", async (_theme, scheme, g, style) => {
    configureShaders({ freezeAt: 4 });
    const host = render(g.ui, { ...style, colorScheme: scheme });
    const root = q(host, g.root);
    start();
    await until(drawing(root, "aurora"), "aurora to draw");
    const ratio = worst(root, g.ink);
    // NaN means no pixel was measured — a gate must never pass on no data.
    expect(Number.isNaN(ratio), "no fully covered pixel was sampled").toBe(false);
    expect(ratio, `${g.name}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(g.floor);
  });

  test("the measurement measures something: with the guard off, some part falls under its floor", async () => {
    configureShaders({ freezeAt: 4 });
    const failures: string[] = [];
    for (const [theme, style] of THEMES) {
      for (const scheme of ["light", "dark"] as const) {
        for (const g of GUARDED) {
          const host = render(g.ui, { ...style, colorScheme: scheme });
          const root = q(host, g.root);
          root.style.setProperty("--ui-fx-aurora-guard", "0");
          if (!stops.length) start();
          await until(drawing(root, "aurora"), "aurora to draw");
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => requestAnimationFrame(r));
          const ratio = worst(root, g.ink);
          if (ratio < g.floor) failures.push(`${theme}/${scheme}/${g.name}`);
        }
      }
    }
    expect(failures.length, "no part fails without the guard, so the passing cases above prove nothing").toBeGreaterThan(0);
  });
});
