/**
 * The shader runtime of the effects layer (ADR 0022) — OPTIONAL. Install it
 * only for `aurora` and `halo`; every CSS effect works without it.
 *
 *   // once, in a client component at the app root (or a <script> in Astro)
 *   useEffect(() => startShaders(), []);
 *
 *   <Button className={fx("aurora")}>Publish</Button>
 *
 * It finds every element carrying a shader effect's class, mounts one canvas
 * in the part the effect paints, and draws it from tokens read where that
 * part sits. When it cannot draw — no WebGL2, a lost context, before it has
 * started, on the server — the component is untouched: THE FLOOR IS THE
 * COMPONENT, and it was already finished.
 *
 * Three objects, one job each:
 *   Renderer   the one WebGL2 context for the page (browsers allow about 16),
 *              its programs, and context loss
 *   Target     one canvas in one part: geometry, token reads, paint
 *   Scheduler  discovery, observers, the frame loop, states, quality
 *
 * The page sees each target's state on the effect's root as
 * `data-fx-<name>`: `live` · `still` (reduced motion, or a frozen clock) ·
 * `floor` (not drawing) · `lost` (context lost) · `unsupported` (no WebGL2).
 * shader.css shows a canvas only when it is `live` or `still`.
 *
 * Found on an iPhone, not in headless Chromium, and the reason for two
 * choices below: iOS Safari drops a CSS border-radius clip on a canvas while
 * its layer animates, so the SHADER draws the part's rounded shape; and a
 * positioned child starts at the padding box, so the canvas steps back over
 * the border to cover the border box.
 */

import { SHADERS, VERTEX, PRELUDE, type ShaderDef, type ShaderName } from "@/lib/shader-programs";

type Values = Record<string, number | number[]>;

export type ShaderState = "floor" | "live" | "still" | "lost" | "unsupported";

export interface ShaderSettings {
  /** null follows the OS setting; true/false forces it (stories, tests). */
  reducedMotion: boolean | null;
  /** Every target shows its floor, as without WebGL. For tests and stories. */
  forceFloor: boolean;
  /** A number freezes every clock at that time: deterministic frames. */
  freezeAt: number | null;
  /** Device-pixel cap. 2 is indistinguishable from 3 at these feature sizes. */
  maxDpr: number;
}

/**
 * Where a shader effect draws, per component — keyed by the ROOT's
 * `data-slot`, with `*` for any other element (a ground).
 *
 * - `part`   the rounded box the shader draws. Default: the root.
 * - `mount`  where the canvas lives; it covers this element's border box.
 *            Default: the part. A Slider's or a Progress's FILL is drawn on
 *            a canvas in the TRACK, so a growing fill reveals a still field
 *            and its rounded end is drawn by the shader, not clipped by CSS.
 *            `"root"` mounts a halo where its part's own overflow cannot cut it.
 * - `layer`  `under` (default): above the mount's background, below its
 *            content — a label, a check glyph. `over`: above a sibling fill
 *            inside a track, inserted DIRECTLY AFTER the fill so every later
 *            sibling (the origin mark, the THUMB) still paints above it.
 *            Appended last, it covered the Slider's thumb.
 *
 * A part that does not exist leaves the root at its floor: Slider's inline
 * variant carries text on its fill, so `aurora` applies to the track variant
 * only, and the selector says so.
 */
export interface ShaderRecipe {
  part?: string;
  mount?: string;
  layer?: "under" | "over";
}

export const SHADER_RECIPES: Record<ShaderName, Record<string, ShaderRecipe>> = {
  aurora: {
    button: {},
    switch: { part: '[data-slot="track"]' },
    checkbox: { part: '[data-slot="control"]' },
    slider: {
      part: '[data-variant="track"] [data-slot="slider-fill"]',
      mount: '[data-variant="track"] [data-slot="slider-track"]',
      layer: "over",
    },
    progress: { part: '[data-slot="fill"]', mount: '[data-slot="track"]', layer: "over" },
    "*": {},
  },
  halo: {
    button: {},
    field: { part: '[data-slot="control"]', mount: "root" },
    "*": {},
  },
};

const NAMES = Object.keys(SHADERS) as ShaderName[];
const SELECTOR = NAMES.map((n) => `.fx-${n}`).join(", ");

export const settings: ShaderSettings = { reducedMotion: null, forceFloor: false, freezeAt: null, maxDpr: 2 };

// --- reading tokens ----------------------------------------------------------

let swatch: CanvasRenderingContext2D | null = null;

/**
 * A colour token resolved where `el` sits — its brand scope, its scheme — as
 * sRGB 0..1. The browser resolves light-dark(), color-mix() and oklch(); a
 * 1×1 canvas reads the result back, which is the one parser that agrees with
 * the browser on every colour syntax by construction.
 */
export function readColor(el: HTMLElement, token: string): [number, number, number] {
  if (!swatch) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    swatch = c.getContext("2d", { willReadFrequently: true });
  }
  const prev = el.style.color;
  el.style.color = `var(${token})`;
  const css = getComputedStyle(el).color;
  el.style.color = prev;
  if (!swatch) return [0, 0, 0];
  swatch.clearRect(0, 0, 1, 1);
  swatch.fillStyle = "#000";
  swatch.fillStyle = css;
  swatch.fillRect(0, 0, 1, 1);
  const d = swatch.getImageData(0, 0, 1, 1).data;
  return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
}

/** A numeric token: `2000ms` → 2 (seconds), `16px` → 16, `0.6` → 0.6. */
export function readNumber(el: Element, token: string, fallback: number): number {
  const raw = getComputedStyle(el).getPropertyValue(token).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n / 1000 : n;
}

// --- Renderer ------------------------------------------------------------------

interface Program {
  program: WebGLProgram;
  loc: Map<string, WebGLUniformLocation | null>;
}

class Renderer {
  readonly canvas = document.createElement("canvas");
  gl: WebGL2RenderingContext | null = null;
  lost = false;
  private programs = new Map<ShaderName, Program | null>();

  constructor(private readonly onRestored: () => void) {}

  /** True when drawing is possible right now. */
  init(): boolean {
    if (this.gl) return !this.lost;
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return false;
    this.gl = gl;
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.programs.clear();
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      this.onRestored();
    });
    return true;
  }

  private program(def: ShaderDef): Program | null {
    const cached = this.programs.get(def.name);
    if (cached !== undefined) return cached;
    const gl = this.gl!;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "compile failed");
      return s;
    };
    let result: Program | null = null;
    try {
      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, PRELUDE + def.fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      result = { program, loc: new Map() };
    } catch (err) {
      // A program that does not compile on this GPU leaves its targets at the
      // floor. Said once, not every frame.
      console.error(`[shader] ${def.name}:`, (err as Error).message);
    }
    this.programs.set(def.name, result);
    return result;
  }

  /** Draw one target's frame into the bottom-left w×h of the shared canvas. */
  draw(def: ShaderDef, w: number, h: number, uniforms: Values): boolean {
    const gl = this.gl;
    if (!gl || this.lost) return false;
    const p = this.program(def);
    if (!p) return false;
    // Grows only, in 128px steps: resizing a canvas reallocates its buffer.
    const W = Math.max(this.canvas.width, Math.ceil(w / 128) * 128);
    const H = Math.max(this.canvas.height, Math.ceil(h / 128) * 128);
    if (W !== this.canvas.width || H !== this.canvas.height) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(p.program);
    for (const [name, v] of Object.entries(uniforms)) {
      if (!p.loc.has(name)) p.loc.set(name, gl.getUniformLocation(p.program, name));
      const loc = p.loc.get(name);
      if (!loc) continue;
      if (name === "u_seed") gl.uniform1ui(loc, v as number);
      else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v);
      else gl.uniform1f(loc, v);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  dispose() {
    this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
    this.gl = null;
    this.programs.clear();
  }
}

// --- Target --------------------------------------------------------------------

/** Targets larger than this (CSS px²) step down in resolution when frames get slow. */
const BIG_AREA = 40_000;

class Target {
  readonly canvas = document.createElement("canvas");
  private readonly ctx = this.canvas.getContext("2d")!;
  /** Where the canvas lives; it covers this element's border box. */
  readonly mount: HTMLElement;
  values: Values = {};
  clock: number;
  speed = 1;
  visible = true;
  dirty = true;
  /** Null until the first frame publishes one, so even "floor" is said out loud. */
  state: ShaderState | null = null;
  w = 0;
  h = 0;
  cssW = 0;
  cssH = 0;
  dpr = 1;
  /** Live-value transitions in flight on this canvas. */
  easing = 0;
  private radius = 0;
  private readonly restore: Array<() => void> = [];

  constructor(
    readonly root: HTMLElement,
    /** The rounded box the shader draws. */
    readonly part: HTMLElement,
    readonly def: ShaderDef,
    readonly recipe: ShaderRecipe,
    readonly seed: number,
    private readonly scheduler: Scheduler,
  ) {
    this.clock = def.restTime;
    this.canvas.className = `ui-fx-canvas ui-fx-canvas-${def.name}`;
    this.canvas.setAttribute("aria-hidden", "true");
    this.mount =
      recipe.mount === "root" ? root : recipe.mount ? (root.querySelector<HTMLElement>(recipe.mount) ?? part) : part;

    // The mount must contain an absolutely positioned child; an UNDER canvas
    // also needs a stacking context so z-index -1 lands above the mount's own
    // background. Both are put back on unmount.
    const style = this.mount.style;
    const hadStyle = this.mount.hasAttribute("style");
    this.restore.push(() => {
      if (!hadStyle && this.mount.getAttribute("style") === "") this.mount.removeAttribute("style");
    });
    if (getComputedStyle(this.mount).position === "static") {
      const prev = style.position;
      style.position = "relative";
      this.restore.push(() => (style.position = prev));
    }
    if (recipe.layer === "over") this.canvas.classList.add("ui-fx-canvas-over");
    else {
      const prev = style.isolation;
      style.isolation = "isolate";
      this.restore.push(() => (style.isolation = prev));
    }

    // State values (--ui-fx-on, --ui-fx-halo-strength) are read every frame
    // only while the canvas is transitioning one of them, so they follow the
    // component's own motion token. At rest a target costs no style read.
    this.canvas.addEventListener("transitionrun", (e) => {
      if (!e.propertyName.startsWith("--ui-fx-")) return;
      this.easing++;
      this.scheduler.wake();
    });
    const settle = (e: TransitionEvent) => {
      if (!e.propertyName.startsWith("--ui-fx-")) return;
      this.easing = Math.max(0, this.easing - 1);
      this.readLive();
      this.scheduler.wake();
    };
    this.canvas.addEventListener("transitionend", settle);
    this.canvas.addEventListener("transitioncancel", settle);

    if (recipe.layer === "over" && this.mount !== part && part.parentElement === this.mount) part.after(this.canvas);
    else this.mount.appendChild(this.canvas);
    this.refresh();
  }

  setState(s: ShaderState) {
    if (this.state === s) return;
    this.state = s;
    this.dirty = true;
    this.root.setAttribute(`data-fx-${this.def.name}`, s);
  }

  /** Re-read every token. Theme, scheme and class changes call this. */
  refresh() {
    for (const [name, spec] of Object.entries(this.def.uniforms)) {
      this.values[name] =
        "color" in spec ? readColor(this.canvas, spec.color) : readNumber(this.canvas, spec.number, spec.fallback ?? 0);
    }
    this.speed = readNumber(this.canvas, "--ui-fx-ambient-speed", 1);
    this.layout();
  }

  readLive() {
    for (const [name, spec] of Object.entries(this.def.uniforms)) {
      if (!("live" in spec) || !spec.live) continue;
      const v = readNumber(this.canvas, spec.number, spec.fallback ?? 0);
      if (v !== this.values[name]) {
        this.values[name] = v;
        this.dirty = true;
      }
    }
  }

  layout(quality = this.scheduler.quality) {
    const bleed = this.def.bleed ?? 0;
    const m = this.mount;
    // LAYOUT size, not the transformed box: a pressed Button is scaled by
    // --ui-press-scale and its canvas scales with it.
    this.cssW = m.offsetWidth + 2 * bleed;
    this.cssH = m.offsetHeight + 2 * bleed;
    const s = this.canvas.style;
    // An absolutely positioned child is placed from the PADDING box; the
    // canvas covers the BORDER box, so it steps back over the border.
    s.left = `${-m.clientLeft - bleed}px`;
    s.top = `${-m.clientTop - bleed}px`;
    s.width = `${this.cssW}px`;
    s.height = `${this.cssH}px`;
    const big = this.cssW * this.cssH > BIG_AREA;
    this.dpr = Math.min(devicePixelRatio || 1, settings.maxDpr) * (big ? quality : 1);
    const w = Math.max(1, Math.round(this.cssW * this.dpr));
    const h = Math.max(1, Math.round(this.cssH * this.dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = this.w = w;
      this.canvas.height = this.h = h;
    }
    this.values.u_bleed = bleed;
    this.radius = parseFloat(getComputedStyle(this.part).borderTopLeftRadius) || 0;
    this.measureShape();
    this.dirty = true;
  }

  /**
   * The shape's box in canvas CSS px, y up (GL). Measured every frame for a
   * shape that moves inside its mount: a Progress fill growing through its
   * transition, a Slider fill under the pointer.
   */
  measureShape() {
    const bleed = this.def.bleed ?? 0;
    let x = 0;
    let y = 0;
    let w = this.mount.offsetWidth;
    let h = this.mount.offsetHeight;
    if (this.part !== this.mount) {
      const mr = this.mount.getBoundingClientRect();
      const k = mr.width / (this.mount.offsetWidth || 1) || 1;
      const r = this.part.getBoundingClientRect();
      x = (r.left - mr.left) / k;
      y = (r.top - mr.top) / k;
      w = r.width / k;
      h = r.height / k;
    }
    const center = [bleed + x + w / 2, this.cssH - (bleed + y + h / 2)];
    const box = [w / 2, h / 2];
    const prev = this.values.u_center as number[] | undefined;
    const prevBox = this.values.u_box as number[] | undefined;
    if (prev?.[0] === center[0] && prev?.[1] === center[1] && prevBox?.[0] === box[0] && prevBox?.[1] === box[1]) return;
    this.values.u_center = center;
    this.values.u_box = box;
    this.values.u_radius = Math.min(this.radius, w / 2, h / 2);
    this.dirty = true;
  }

  paint(renderer: Renderer): boolean {
    const uniforms: Values = {
      ...this.values,
      u_resolution: [this.w, this.h],
      u_time: this.clock,
      u_dpr: this.dpr,
      u_seed: this.seed,
    };
    if (!renderer.draw(this.def, this.w, this.h, uniforms)) return false;
    this.ctx.globalCompositeOperation = "copy";
    // GL rows start at the bottom: the drawn region is the bottom-left corner.
    this.ctx.drawImage(renderer.canvas, 0, renderer.canvas.height - this.h, this.w, this.h, 0, 0, this.w, this.h);
    this.ctx.globalCompositeOperation = "source-over";
    this.dirty = false;
    return true;
  }

  /** The last frame's pixels, premultiplied. What a contrast test samples. */
  pixels(): ImageData {
    return this.ctx.getImageData(0, 0, this.w, this.h);
  }

  unmount() {
    this.canvas.remove();
    this.root.removeAttribute(`data-fx-${this.def.name}`);
    // Last in, first out: the attribute check runs after the values are back.
    for (const undo of this.restore.splice(0).reverse()) undo();
  }
}

// --- Scheduler ----------------------------------------------------------------

class Scheduler {
  readonly renderer: Renderer;
  readonly targets = new Set<Target>();
  quality = 1;
  private byRoot = new WeakMap<HTMLElement, Map<ShaderName, Target>>();
  private byMount = new Map<Element, Set<Target>>();
  private seed = 1;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private spent = 0;
  private since = 0;
  private refreshQueued = false;
  /** Set by stop(). A font load or a queued refresh still in flight must not
   *  resurrect canvases into the next page — found by the refcount test. */
  private stopped = false;
  private pending = new Set<Element>();
  private readonly teardown: Array<() => void> = [];
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  private intersection = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        for (const t of this.byMount.get(e.target) ?? []) {
          t.visible = e.isIntersecting;
          if (t.visible) t.dirty = true;
        }
      }
      this.wake();
    },
    { rootMargin: "160px" },
  );

  private resize = new ResizeObserver((entries) => {
    for (const e of entries) {
      for (const t of this.targets) if (t.mount === e.target || t.part === e.target) t.layout();
    }
    this.wake();
  });

  constructor() {
    this.renderer = new Renderer(() => {
      for (const t of this.targets) t.dirty = true;
      this.wake();
    });
  }

  private isStill() {
    return settings.freezeAt !== null || (settings.reducedMotion ?? this.reducedMotion.matches);
  }

  start() {
    this.sweep();

    // The runtime writes styles on its own canvases and mounts and appends
    // canvases: those mutations must not schedule another read.
    const ours = (n: Node) => n instanceof HTMLCanvasElement && n.classList.contains("ui-fx-canvas");
    const observer = new MutationObserver((records) => {
      let added = false;
      for (const r of records) {
        if (r.type === "childList") {
          if (![...r.addedNodes, ...r.removedNodes].every(ours)) added = true;
          continue;
        }
        if (ours(r.target)) continue;
        // Geometry is the observers' business: a Slider fill's inline width
        // changes on every pointer move, and re-reading tokens for it would
        // cost a style read per uniform per frame of a drag. But an inline
        // TOKEN on the same element — `style={{ "--ui-fx-aurora-intensity":
        // 0.5 }}` on a Button — is a token change like any other.
        if (r.attributeName === "style" && this.geometry(r.target as Element)) {
          const tokens = (css: string | null) => (css?.match(/--[\w-]+\s*:[^;]*/g) ?? []).join(";");
          if (tokens(r.oldValue) === tokens((r.target as Element).getAttribute("style"))) continue;
        }
        this.pending.add(r.target as Element);
      }
      if (added || this.pending.size) this.queueRefresh(added);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      // What can change a token or an effect class: a class, an inline style,
      // and the attributes the token emitter scopes brands and schemes with.
      attributeFilter: ["class", "style", "data-ui-theme", "data-theme", "data-scheme", "data-color-scheme"],
    });
    this.teardown.push(() => observer.disconnect());

    const all = () => {
      this.pending.add(document.documentElement);
      this.queueRefresh(false);
    };
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", all);
    this.reducedMotion.addEventListener("change", all);
    this.teardown.push(() => {
      scheme.removeEventListener("change", all);
      this.reducedMotion.removeEventListener("change", all);
    });
    void document.fonts?.ready.then(() => this.targets.size && all());
    this.wake();
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const undo of this.teardown.splice(0)) undo();
    this.intersection.disconnect();
    this.resize.disconnect();
    for (const t of this.targets) t.unmount();
    this.targets.clear();
    this.byMount.clear();
    this.byRoot = new WeakMap();
    this.renderer.dispose();
  }

  /** Is `el` a part or a mount — something the runtime measures rather than reads? */
  private geometry(el: Element) {
    if (this.byMount.has(el)) return true;
    for (const t of this.targets) if (t.part === el) return true;
    return false;
  }

  private attach(root: HTMLElement) {
    let mine = this.byRoot.get(root);
    if (!mine) this.byRoot.set(root, (mine = new Map()));
    for (const name of NAMES) {
      if (!root.classList.contains(`fx-${name}`) || mine.has(name)) continue;
      const recipes = SHADER_RECIPES[name];
      const slot = root.dataset.slot;
      const recipe = (slot ? recipes[slot] : undefined) ?? recipes["*"]!;
      const part = recipe.part ? root.querySelector<HTMLElement>(recipe.part) : root;
      if (!part) continue;
      const t = new Target(root, part, SHADERS[name], recipe, this.seed++, this);
      mine.set(name, t);
      this.targets.add(t);
      let set = this.byMount.get(t.mount);
      if (!set) this.byMount.set(t.mount, (set = new Set()));
      set.add(t);
      this.intersection.observe(t.mount);
      this.resize.observe(t.mount);
      if (t.mount !== part) this.resize.observe(part);
    }
  }

  private detach(t: Target) {
    t.unmount();
    this.targets.delete(t);
    this.byRoot.get(t.root)?.delete(t.def.name);
    const set = this.byMount.get(t.mount);
    set?.delete(t);
    if (set && !set.size) {
      this.byMount.delete(t.mount);
      this.intersection.unobserve(t.mount);
      this.resize.unobserve(t.mount);
    }
  }

  private sweep() {
    for (const t of [...this.targets]) {
      const stillThere = t.root.isConnected && t.part.isConnected && t.root.classList.contains(`fx-${t.def.name}`);
      if (!stillThere) this.detach(t);
    }
    for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) this.attach(el);
  }

  /**
   * Batched to the next frame. A changed element re-reads only the targets
   * it can reach: its own subtree, or an ancestor's (a class on <html> moves
   * every token beneath it). Typing in a field re-reads nothing.
   */
  private queueRefresh(sweep: boolean) {
    if (this.stopped) return;
    if (sweep) this.pending.add(document.documentElement);
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      if (this.stopped) return;
      const changed = [...this.pending];
      this.pending.clear();
      this.sweep();
      for (const t of this.targets) {
        if (changed.some((el) => el.contains(t.root) || t.root.contains(el))) t.refresh();
      }
      this.wake();
    });
  }

  /** Schedule a frame if none is pending. The loop sleeps while nothing moves. */
  wake() {
    if (this.stopped || this.raf || !this.targets.size) return;
    this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const t0 = performance.now();
    const still = this.isStill();
    const usable = !settings.forceFloor && this.renderer.init();
    const offState: ShaderState = settings.forceFloor
      ? "floor"
      : this.renderer.lost
        ? "lost"
        : this.renderer.gl
          ? "floor"
          : "unsupported";
    let moving = false;
    for (const t of this.targets) {
      if (!usable) {
        t.setState(offState);
        continue;
      }
      t.setState(still ? "still" : "live");
      if (!t.visible) continue;
      if (t.easing) {
        t.readLive();
        moving = true;
      }
      if (t.part !== t.mount) t.measureShape();
      if (t.def.idle?.(t.values) && !t.dirty) continue;
      if (still) {
        const at = settings.freezeAt ?? t.def.restTime;
        if (t.clock !== at) {
          t.clock = at;
          t.dirty = true;
        }
        if (t.dirty) t.paint(this.renderer);
        continue;
      }
      t.clock += dt * t.speed;
      t.paint(this.renderer);
      moving = true;
    }
    this.measure(now, performance.now() - t0);
    // The loop sleeps once nothing moves: still targets are drawn once, an
    // idle halo not at all. Anything that changes a target — a transition on
    // the canvas, a resize, a token, visibility — wakes it again. With no
    // usable context there is nothing to wake for until it comes back.
    if (usable && (moving || [...this.targets].some((t) => t.dirty && t.visible))) this.wake();
    else this.last = 0;
  }

  /**
   * Adaptive quality. Full device resolution by default. Only when frames
   * get slow do LARGE targets step down, a quarter at a time, and step back
   * up once there is room. Small controls always render at full resolution.
   */
  private measure(now: number, ms: number) {
    if (!this.since) this.since = now;
    this.spent += ms;
    this.frames++;
    if (now - this.since < 500) return;
    const per = this.spent / this.frames;
    this.frames = 0;
    this.spent = 0;
    this.since = now;
    const next = per > 12 ? Math.max(0.5, this.quality - 0.25) : per < 5 ? Math.min(1, this.quality + 0.25) : this.quality;
    if (next === this.quality) return;
    this.quality = next;
    for (const t of this.targets) if (t.cssW * t.cssH > BIG_AREA) t.layout(next);
  }

  /** Draw a target now and read its pixels back. */
  sample(root: HTMLElement, name: ShaderName) {
    const t = this.byRoot.get(root)?.get(name);
    if (!t || !t.paint(this.renderer)) return null;
    const { data } = t.pixels();
    return { data, width: t.w, height: t.h, dpr: t.dpr };
  }
}

// --- public API --------------------------------------------------------------

let scheduler: Scheduler | null = null;
let starts = 0;

/**
 * Start the runtime and return its stop function. Safe to call on the
 * server (it does nothing there) and more than once: it counts its callers
 * and stops when the last one has, so React's StrictMode double effect, or
 * two islands that each start it, share one runtime.
 */
export function startShaders(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (typeof IntersectionObserver === "undefined" || typeof ResizeObserver === "undefined") return () => {};
  starts++;
  if (!scheduler) {
    scheduler = new Scheduler();
    scheduler.start();
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    if (--starts > 0 || !scheduler) return;
    scheduler.stop();
    scheduler = null;
  };
}

/** Override what the runtime would detect — for stories, tests and screenshots. */
export function configureShaders(next: Partial<ShaderSettings>): void {
  Object.assign(settings, next);
  if (!scheduler) return;
  for (const t of scheduler.targets) {
    t.dirty = true;
    t.layout();
  }
  scheduler.wake();
}

/**
 * Draw the effect on `root` now and return its pixels (premultiplied RGBA,
 * device px), or null if it is not drawing. What a contrast test samples:
 * the guard is only as good as the measurement that holds it.
 */
export function sampleShader(root: HTMLElement, name: ShaderName) {
  return scheduler?.sample(root, name) ?? null;
}
