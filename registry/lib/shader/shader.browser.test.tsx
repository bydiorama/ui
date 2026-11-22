/**
 * The shader runtime, in a real browser with a real WebGL2 context
 * (ADR 0022, 0025). check:fx holds the first two clauses of the admission
 * rule on the source; the last two only exist here:
 *
 *   3. the floor is the component — not started, stopped, or without a
 *      context, the element is exactly what it draws on its own (for a
 *      ground, its CSS floor);
 *   4. the ink stays legible — on a ground, the QUIET ZONE around the copy
 *      is the exact base, measured on the pixels the shader drew, for every
 *      look of the gradient, in both schemes and under the brand whose accent is the
 *      hardest to keep legible; and the measurement is shown to fail when
 *      the zone is switched off.
 *
 * And the dither: a ground's slow ramps carry no band wider than a few
 * pixels — and the measure is shown to see a band on an undithered ramp.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, type CSSProperties, type ReactElement } from "react";

import { contrastRatio, resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { fx } from "@/lib/fx";
import { configureShaders, readColor, sampleShader, startShaders } from "@/lib/shader";
import { GRADIENT_LOOKS, GRADIENT_PRESETS, type GradientLook } from "@/lib/shader-programs";
import { Button } from "@/ui/button/button.tsx";

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

/** A ground the size of an empty state, carrying the gradient in one look. */
const ground = (look: GradientLook, style?: CSSProperties) => (
  <div
    data-ground
    className={fx("gradient")}
    style={{ width: 480, height: 300, borderRadius: 16, ["--ui-fx-gradient-look" as string]: look, ...style }}
  />
);

describe("the floor is the component", () => {
  test("before startShaders() nothing is mounted and nothing is marked", () => {
    const el = q(render(ground("wash")), "[data-ground]");
    expect(el.querySelector("canvas")).toBeNull();
    expect(el.hasAttribute("data-fx-gradient")).toBe(false);
  });

  test("before it draws, a ground shows its CSS floor: its base, and the light in the far corner", () => {
    const el = q(render(ground("sweep")), "[data-ground]");
    const css = getComputedStyle(el);
    expect(css.backgroundImage).toContain("radial-gradient");
    expect(css.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("started, one canvas covers the ground's border box and the root says it is live", async () => {
    const el = q(render(ground("wash")), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    expect(el.getAttribute("data-fx-gradient")).toBe("live");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = q(el, "canvas.ui-fx-canvas-gradient");
    const a = canvas.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    for (const k of ["left", "top", "width", "height"] as const) expect(Math.abs(a[k] - b[k]), k).toBeLessThan(0.5);
    // It fades in over the floor (--ui-duration-enter), so look once it has.
    await until(() => getComputedStyle(canvas).opacity === "1", "the canvas to fade in");
  });

  test("stopped, everything is put back: no canvas, no state, no inline styles", async () => {
    const el = q(render(ground("fold")), "[data-ground]");
    const before = el.getAttribute("style");
    const stop = start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    stop();
    expect(el.querySelector("canvas")).toBeNull();
    expect(el.hasAttribute("data-fx-gradient")).toBe(false);
    expect(el.getAttribute("style")).toBe(before);
  });

  test("callers are counted: StrictMode's double effect shares one runtime", async () => {
    const el = q(render(ground("wash")), "[data-ground]");
    const first = start();
    start();
    first();
    first(); // a second call of the same stop is a no-op
    await until(drawing(el, "gradient"), "the gradient to keep drawing");
    expect(el.querySelectorAll("canvas").length).toBe(1);
  });

  test("without a context the ground keeps its floor, and the canvas stays hidden", async () => {
    configureShaders({ forceFloor: true });
    const el = q(render(ground("rise")), "[data-ground]");
    start();
    await until(() => el.getAttribute("data-fx-gradient") === "floor", "the floor state");
    expect(getComputedStyle(q(el, "canvas")).opacity).toBe("0");
  });

  test("reduced motion draws one still frame", async () => {
    configureShaders({ reducedMotion: true });
    const el = q(render(ground("wash")), "[data-ground]");
    start();
    await until(() => el.getAttribute("data-fx-gradient") === "still", "the still state");
  });

  test("a large ground keeps full resolution: a dither must not be scaled", async () => {
    const el = q(render(ground("fold", { width: 900, height: 560 })), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const s = sampleShader(el, "gradient")!;
    expect(s.width).toBe(Math.round(900 * s.dpr));
    expect(s.dpr).toBe(Math.min(devicePixelRatio, 2));
  });
});

describe("one gradient, parametric", () => {
  test("a knob at auto takes the look's preset; a token set on the ground overrides it", async () => {
    configureShaders({ freezeAt: 6 });
    const rise = q(render(ground("rise")), "[data-ground]");
    const tilted = q(render(ground("sweep", { ["--ui-fx-gradient-angle" as string]: "12deg" })), "[data-ground]");
    start();
    await until(() => drawing(rise, "gradient")() && drawing(tilted, "gradient")(), "both to draw");
    const r = sampleShader(rise, "gradient")!.values;
    expect(r.u_look).toBe(GRADIENT_LOOKS.indexOf("rise"));
    expect(r.u_quietY).toBe(GRADIENT_PRESETS.rise.quietY);
    expect(r.u_angle).toBe(GRADIENT_PRESETS.rise.angle);
    const t = sampleShader(tilted, "gradient")!.values;
    expect(t.u_angle).toBe(12);
    expect(t.u_intensity).toBe(GRADIENT_PRESETS.sweep.intensity);
  });

  test("changing the look token redraws the same canvas in the new look", async () => {
    configureShaders({ freezeAt: 6 });
    const el = q(render(ground("wash")), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const canvas = q(el, "canvas");
    const before = sampleShader(el, "gradient")!.data.slice();
    el.style.setProperty("--ui-fx-gradient-look", "rise");
    await until(() => sampleShader(el, "gradient")?.values.u_look === GRADIENT_LOOKS.indexOf("rise"), "the new look");
    expect(q(el, "canvas")).toBe(canvas);
    const after = sampleShader(el, "gradient")!.data;
    let differ = 0;
    for (let i = 0; i < after.length; i += 4) if (Math.abs(after[i]! - before[i]!) > 24) differ++;
    expect(differ, "the frame did not change with the look").toBeGreaterThan(after.length / 40);
  });
});

describe("state follows the component", () => {
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

// ----------------------------------------------------------- the quiet zone

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

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/**
 * Every fully covered pixel the shader drew, with where it sits in the
 * field the GLSL uses: x 0..1 across, y 0..aspect up.
 */
function pixels(el: HTMLElement) {
  const s = sampleShader(el, "gradient");
  if (!s) return [];
  const w = s.width / s.dpr;
  const out: Array<{ rgb: [number, number, number]; u: number; v: number }> = [];
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      const i = (y * s.width + x) * 4;
      if (s.data[i + 3] !== 255) continue;
      out.push({
        rgb: [s.data[i]!, s.data[i + 1]!, s.data[i + 2]!],
        u: (x + 0.5) / s.dpr / w,
        v: (s.height - y - 0.5) / s.dpr / w,
      });
    }
  }
  return out;
}

type Zone = { quiet: number; x: number; y: number; aspect: number };

/** The quiet zone the runtime drew with — `auto` resolved to the look's preset. */
function zoneOf(el: HTMLElement): Zone {
  const v = sampleShader(el, "gradient")!.values;
  const r = el.getBoundingClientRect();
  return { quiet: v.u_quiet as number, x: v.u_quietX as number, y: v.u_quietY as number, aspect: r.height / r.width };
}

/** Inside the zone's CORE, as the GLSL defines it (fx_quietMask): an ellipse at half the radius. */
const inCore = (z: Zone) => (p: { u: number; v: number }) =>
  Math.hypot((p.u - z.x) * 0.75, (p.v - (1 - z.y) * z.aspect) * 1.5) < 0.5 * z.quiet;

/** The least contrast between a pixel under the copy and the ink. NaN: nothing sampled. */
function worstUnderCopy(el: HTMLElement, ink: string, core: (p: { u: number; v: number }) => boolean) {
  const against = hex(readColor(el, ink).map((c) => c * 255));
  const seen = new Map<string, number>();
  let min = Infinity;
  for (const p of pixels(el)) {
    if (!core(p)) continue;
    const key = hex(p.rgb);
    let ratio = seen.get(key);
    if (ratio === undefined) seen.set(key, (ratio = contrastRatio(key, against)));
    min = Math.min(min, ratio);
  }
  return seen.size ? min : NaN;
}

describe("the copy keeps its contrast in the quiet zone", () => {
  const cases = THEMES.flatMap(([theme, style]) =>
    (["light", "dark"] as const).flatMap((scheme) => GRADIENT_LOOKS.map((look) => [theme, scheme, look, style] as const)),
  );

  test.each(cases)("%s, %s: %s", async (_theme, scheme, look, style) => {
    configureShaders({ freezeAt: 6 });
    const el = q(render(ground(look), { ...style, colorScheme: scheme }), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const core = inCore(zoneOf(el));
    for (const ink of ["--ui-text-primary", "--ui-text-muted"]) {
      const ratio = worstUnderCopy(el, ink, core);
      // NaN means no pixel was measured — a gate must never pass on no data.
      expect(Number.isNaN(ratio), "no pixel in the quiet zone was sampled").toBe(false);
      expect(ratio, `${ink}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
    // And outside the zone the ground is a ground, not a flat base: the
    // light moves at least 24 steps off it somewhere.
    const base = readColor(el, "--ui-fx-gradient-base").map((c) => c * 255);
    const far = pixels(el).some((p) => !core(p) && p.rgb.some((c, i) => Math.abs(c - base[i]!) > 24));
    expect(far, "the ground drew no light outside its quiet zone").toBe(true);
  });

  test("the measurement measures something: with the zone off, some look falls under 4.5:1 where the copy sits", async () => {
    configureShaders({ freezeAt: 6 });
    const failures: string[] = [];
    for (const [theme, style] of THEMES) {
      for (const scheme of ["light", "dark"] as const) {
        for (const look of GRADIENT_LOOKS) {
          const el = q(render(ground(look), { ...style, colorScheme: scheme }), "[data-ground]");
          if (!stops.length) start();
          await until(drawing(el, "gradient"), "the gradient to draw");
          // Where the copy sits, from the look's own zone; then the zone goes.
          const core = inCore(zoneOf(el));
          el.style.setProperty("--ui-fx-gradient-quiet", "0");
          await until(() => sampleShader(el, "gradient")?.values.u_quiet === 0, "the zone to switch off");
          const ratio = worstUnderCopy(el, "--ui-text-muted", core);
          if (ratio < 4.5) failures.push(`${theme}/${scheme}/${look}`);
        }
      }
    }
    expect(failures.length, "no look fails without its quiet zone, so the passing cases above prove nothing").toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------- the dither

type Frame = { data: Uint8ClampedArray; width: number; height: number };

/**
 * The widest run of identical pixels along a row that changes at all, in the
 * frame's middle. A run of the ground's own BASE is skipped: a flat area of
 * base (the quiet zone, rise's sky) is flat by design, and a one-step dither
 * leaves most of a flat area's pixels on the same value. A band is a plateau
 * inside a ramp, and every ramp leaves the base.
 */
function widestBand(s: Frame, base?: readonly number[]) {
  const isBase = (i: number) => !!base && [0, 1, 2].every((c) => Math.abs(s.data[i + c]! - base[c]!) <= 1);
  let widest = 0;
  for (let y = Math.floor(s.height * 0.1); y < s.height * 0.6; y += 3) {
    let run = 1;
    let changes = 0;
    let rowWidest = 1;
    for (let x = Math.floor(s.width * 0.1) + 1; x < s.width * 0.9; x++) {
      const i = (y * s.width + x) * 4;
      const same = s.data[i] === s.data[i - 4] && s.data[i + 1] === s.data[i - 3] && s.data[i + 2] === s.data[i - 2];
      if (same) run++;
      else {
        changes++;
        if (!isBase(i - 4)) rowWidest = Math.max(rowWidest, run);
        run = 1;
      }
    }
    const last = (y * s.width + Math.floor(s.width * 0.9) - 1) * 4;
    if (changes) widest = Math.max(widest, rowWidest, isBase(last) ? 0 : run);
  }
  return widest;
}

describe("a ground never bands", () => {
  test.each([...GRADIENT_LOOKS])("%s: no band wider than 32 device px, in light or dark", async (look) => {
    configureShaders({ freezeAt: 6 });
    const [, style] = THEMES[0]!;
    const els = (["light", "dark"] as const).map((scheme) =>
      q(render(ground(look, { width: 640, height: 400 }), { ...style, colorScheme: scheme }), "[data-ground]"),
    );
    start();
    for (const el of els) await until(drawing(el, "gradient"), `${look} to draw`);
    for (const el of els) {
      const base = readColor(el, "--ui-fx-gradient-base").map((c) => Math.round(c * 255));
      expect(widestBand(sampleShader(el, "gradient")!, base)).toBeLessThanOrEqual(32);
    }
  });

  test("the measure sees a band: an undithered dark ramp fails it", () => {
    // 640 px from sRGB 20 to 36: sixteen steps, each a 40 px band.
    const width = 640;
    const height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = 20 + Math.floor((x / width) * 16);
        data.set([v, v, v, 255], (y * width + x) * 4);
      }
    }
    expect(widestBand({ data, width, height })).toBeGreaterThan(32);
  });
});
