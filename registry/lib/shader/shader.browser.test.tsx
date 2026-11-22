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
 * pixels along rows or columns — and the measure is shown to see a band on
 * an undithered ramp in either direction.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { commands } from "vitest/browser";
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
  configureShaders({ reducedMotion: null, forceFloor: false, freezeAt: null, quality: null });
  vi.restoreAllMocks();
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

  test("when frames are slow a large ground keeps full resolution (a dither must not be scaled); a large halo steps down", async () => {
    // Pin the step the runtime would reach under slow frames.
    configureShaders({ quality: 0.5 });
    const el = q(render(ground("fold", { width: 900, height: 560 })), "[data-ground]");
    const halo = q(render(<div data-halo data-fx-active className={fx("halo")} style={{ width: 900, height: 560 }} />), "[data-halo]");
    start();
    await until(() => drawing(el, "gradient")() && drawing(halo, "halo")(), "both to draw");
    const full = Math.min(devicePixelRatio, 2);
    const s = sampleShader(el, "gradient")!;
    expect(s.dpr).toBe(full);
    expect(s.width).toBe(Math.round(900 * s.dpr));
    // The control: without `adaptive: false` a large target does step down.
    await until(() => (sampleShader(halo, "halo")?.dpr ?? 0) > 0, "the halo to sample");
    expect(sampleShader(halo, "halo")!.dpr).toBe(full * 0.5);
  });

  test("under forced colours nothing is drawn: the target is at its floor", async () => {
    await commands.setForcedColors(true);
    try {
      const el = q(render(ground("wash")), "[data-ground]");
      start();
      await until(() => el.getAttribute("data-fx-gradient") === "floor", "the floor state");
      expect(sampleShader(el, "gradient")).toBeNull();
    } finally {
      await commands.setForcedColors(false);
    }
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

describe("tokens are read as authors write them", () => {
  test("knobs set on a wrapper or a brand scope reach the ground; the colours fall back to the scope's own", async () => {
    configureShaders({ freezeAt: 6 });
    const host = render(
      <div style={{ ["--ui-fx-gradient-look" as string]: "dawn", ["--ui-bg-accent" as string]: "#ff0000" }}>
        <div data-ground className={fx("gradient")} style={{ width: 480, height: 300 }} />
      </div>,
    );
    const el = q(host, "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const v = sampleShader(el, "gradient")!.values;
    expect(v.u_look).toBe(GRADIENT_LOOKS.indexOf("dawn"));
    expect((v.u_light as number[]).map((c) => Math.round(c * 255))).toEqual([255, 0, 0]);
  });

  test("units are converted, quotes and case forgiven; what cannot be read is said once and falls back", async () => {
    configureShaders({ freezeAt: 6 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = q(
      render(
        ground("wash", {
          ["--ui-fx-gradient-look" as string]: '"Sweep"',
          ["--ui-fx-gradient-angle" as string]: "0.1turn",
          ["--ui-fx-gradient-quiet-x" as string]: "25%",
          ["--ui-fx-gradient-scale" as string]: "calc(1 + 1)",
        }),
      ),
      "[data-ground]",
    );
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const v = sampleShader(el, "gradient")!.values;
    expect(v.u_look).toBe(GRADIENT_LOOKS.indexOf("sweep"));
    expect(v.u_angle as number).toBeCloseTo(36, 5);
    expect(v.u_quietX as number).toBeCloseTo(0.25, 5);
    expect(v.u_scale).toBe(1);
    expect(warn.mock.calls.filter(([m]) => String(m).includes("--ui-fx-gradient-scale")).length).toBe(1);
  });

  test("an out-of-range knob is clamped to what the GLSL is written for, and draws finite pixels", async () => {
    configureShaders({ freezeAt: 6 });
    const el = q(
      render(ground("fold", { ["--ui-fx-gradient-sharpness" as string]: 80, ["--ui-fx-gradient-intensity" as string]: 3 })),
      "[data-ground]",
    );
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const s = sampleShader(el, "gradient")!;
    expect(s.values.u_sharpness).toBe(1);
    expect(s.values.u_intensity).toBe(1);
    // NaN in a fragment shader comes out as black or garbage: the fold's
    // lit panes must still be lit.
    let lit = 0;
    for (let i = 0; i < s.data.length; i += 4) if (s.data[i]! + s.data[i + 1]! + s.data[i + 2]! > 120) lit++;
    expect(lit).toBeGreaterThan(s.data.length / 4 / 50);
  });

  test("intensity 0 is the base alone — grain included", async () => {
    configureShaders({ freezeAt: 6 });
    const el = q(render(<div data-ground className={fx("gradient", "grain")} style={{ width: 480, height: 300, ["--ui-fx-gradient-intensity" as string]: 0 }} />), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    const base = readColor(el, "--ui-fx-gradient-base", "--ui-bg-base").map((c) => Math.round(c * 255));
    const s = sampleShader(el, "gradient")!;
    let worst = 0;
    for (let i = 0; i < s.data.length; i += 4) {
      if (s.data[i + 3] !== 255) continue;
      for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(s.data[i + c]! - base[c]!));
    }
    expect(worst, "a pixel left the base by more than the dither").toBeLessThanOrEqual(1);
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
 * A ground at a page's proportions with its copy where a page puts it: an
 * empty state's title and muted line, bottom left — or top left for a look
 * whose preset puts its quiet zone in the sky.
 */
function GroundWithCopy({ look, style }: { look: GradientLook; style?: CSSProperties }) {
  const top = GRADIENT_PRESETS[look].quietY < 0.5;
  return (
    <div
      data-ground
      className={fx("gradient")}
      style={{
        width: 960,
        height: 540,
        padding: 48,
        display: "flex",
        flexDirection: "column",
        justifyContent: top ? "flex-start" : "flex-end",
        ["--ui-fx-gradient-look" as string]: look,
        ...style,
      }}
    >
      <p data-ink="--ui-text-primary" className="text-title-sm text-ink-primary">
        Nothing on this board yet
      </p>
      <p data-ink="--ui-text-muted" className="text-body-sm text-ink-muted">
        Drop images here or start from a template.
      </p>
    </div>
  );
}

/**
 * The least contrast between each line of text and the pixels the shader
 * drew under ITS OWN glyph boxes — the boxes of its text, measured by a
 * Range, not a region derived from the shader. NaN: nothing sampled.
 */
function worstUnderText(el: HTMLElement) {
  const s = sampleShader(el, "gradient");
  if (!s) return { ratio: NaN, where: "" };
  const box = el.getBoundingClientRect();
  let ratio = Infinity;
  let where = "";
  let sampled = 0;
  for (const line of el.querySelectorAll<HTMLElement>("[data-ink]")) {
    const against = hex(readColor(line, line.dataset.ink!).map((c) => c * 255));
    const range = document.createRange();
    range.selectNodeContents(line);
    for (const r of range.getClientRects()) {
      const x0 = Math.floor((r.left - box.left) * s.dpr);
      const x1 = Math.ceil((r.right - box.left) * s.dpr);
      const y0 = Math.floor((r.top - box.top) * s.dpr);
      const y1 = Math.ceil((r.bottom - box.top) * s.dpr);
      const seen = new Map<string, number>();
      for (let y = Math.max(0, y0); y < Math.min(s.height, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(s.width, x1); x++) {
          const i = (y * s.width + x) * 4;
          if (s.data[i + 3] !== 255) continue;
          const key = hex([s.data[i]!, s.data[i + 1]!, s.data[i + 2]!]);
          let c = seen.get(key);
          if (c === undefined) seen.set(key, (c = contrastRatio(key, against)));
          sampled++;
          if (c < ratio) {
            ratio = c;
            where = line.dataset.ink!;
          }
        }
      }
    }
  }
  return { ratio: sampled ? ratio : NaN, where };
}

describe("the copy keeps its contrast where it actually sits", () => {
  const cases = THEMES.flatMap(([theme, style]) =>
    (["light", "dark"] as const).flatMap((scheme) => GRADIENT_LOOKS.map((look) => [theme, scheme, look, style] as const)),
  );

  test.each(cases)("%s, %s: %s", async (_theme, scheme, look, style) => {
    configureShaders({ freezeAt: 6 });
    const el = q(render(<GroundWithCopy look={look} />, { ...style, colorScheme: scheme }), "[data-ground]");
    start();
    await until(drawing(el, "gradient"), "the gradient to draw");
    await document.fonts.ready;
    const { ratio, where } = worstUnderText(el);
    // NaN means no pixel was measured — a gate must never pass on no data.
    expect(Number.isNaN(ratio), "no pixel under the text was sampled").toBe(false);
    expect(ratio, `${where}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    // And the ground is a ground, not a flat base: somewhere the light
    // moves at least 24 steps off it.
    const base = readColor(el, "--ui-fx-gradient-base", "--ui-bg-base").map((c) => c * 255);
    const s = sampleShader(el, "gradient")!;
    let far = false;
    for (let i = 0; i < s.data.length && !far; i += 4) far = [0, 1, 2].some((c) => Math.abs(s.data[i + c]! - base[c]!) > 24);
    expect(far, "the ground drew no light anywhere").toBe(true);
  });

  /**
   * The looks that fill the frame owe the copy's contrast to the zone, and
   * each must fall under 4.5:1 somewhere without it, or the passing cases
   * above prove nothing for it. The horizons (rise, dawn) are exempt by
   * composition: their copy sits in a sky that is quiet without a zone.
   */
  const OWES_THE_ZONE: GradientLook[] = ["wash", "sweep", "fold"];
  test.each(OWES_THE_ZONE)("the measurement measures something: %s falls under 4.5:1 under its copy with the zone off", async (look) => {
    configureShaders({ freezeAt: 6 });
    const failures: string[] = [];
    for (const [theme, style] of THEMES) {
      for (const scheme of ["light", "dark"] as const) {
        const el = q(
          render(<GroundWithCopy look={look} style={{ ["--ui-fx-gradient-quiet" as string]: 0 }} />, { ...style, colorScheme: scheme }),
          "[data-ground]",
        );
        if (!stops.length) start();
        await until(drawing(el, "gradient"), "the gradient to draw");
        await document.fonts.ready;
        const { ratio } = worstUnderText(el);
        if (ratio < 4.5) failures.push(`${theme}/${scheme}`);
      }
    }
    expect(failures.length, `${look} keeps 4.5:1 without its zone, so its passing case proves nothing`).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------- the dither

type Frame = { data: Uint8ClampedArray; width: number; height: number };

/**
 * The widest run of identical pixels along a line that changes at all — every
 * third row AND every third column, across the whole frame but its outer 5%.
 * A run of the ground's EXACT base is skipped: a flat area of base (the
 * quiet zone, a horizon's sky) is flat by design, and a one-step dither
 * leaves most of a flat area's pixels on the same value. A plateau one step
 * off the base — the first band beside it — is still measured.
 */
function widestBand(s: Frame, base?: readonly number[]) {
  const at = (x: number, y: number) => (y * s.width + x) * 4;
  const same = (a: number, b: number) => s.data[a] === s.data[b] && s.data[a + 1] === s.data[b + 1] && s.data[a + 2] === s.data[b + 2];
  const isBase = (i: number) => !!base && s.data[i] === base[0] && s.data[i + 1] === base[1] && s.data[i + 2] === base[2];
  const scan = (count: number, length: number, index: (line: number, k: number) => number) => {
    let widest = 0;
    for (let line = Math.floor(count * 0.05); line < count * 0.95; line += 3) {
      let run = 1;
      let changes = 0;
      let lineWidest = 0;
      const k0 = Math.floor(length * 0.05) + 1;
      const k1 = Math.floor(length * 0.95);
      for (let k = k0; k < k1; k++) {
        if (same(index(line, k), index(line, k - 1))) run++;
        else {
          changes++;
          if (!isBase(index(line, k - 1))) lineWidest = Math.max(lineWidest, run);
          run = 1;
        }
      }
      if (!isBase(index(line, k1 - 1))) lineWidest = Math.max(lineWidest, run);
      if (changes) widest = Math.max(widest, lineWidest);
    }
    return widest;
  };
  return Math.max(
    scan(s.height, s.width, (y, x) => at(x, y)),
    scan(s.width, s.height, (x, y) => at(x, y)),
  );
}

/** An undithered dark ramp, 16 steps of sRGB 20→36 over 640 px, horizontal or vertical. */
function ramp(vertical: boolean): Frame {
  const width = vertical ? 60 : 640;
  const height = vertical ? 640 : 60;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = 20 + Math.floor(((vertical ? y : x) / 640) * 16);
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { data, width, height };
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
      const base = readColor(el, "--ui-fx-gradient-base", "--ui-bg-base").map((c) => Math.round(c * 255));
      expect(widestBand(sampleShader(el, "gradient")!, base)).toBeLessThanOrEqual(32);
    }
  });

  test("the measure sees a band: an undithered dark ramp fails it, along rows and along columns", () => {
    expect(widestBand(ramp(false))).toBeGreaterThan(32);
    expect(widestBand(ramp(true))).toBeGreaterThan(32);
  });
});
