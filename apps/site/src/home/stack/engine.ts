import { GRAIN, HOME, INK, baseOf, layers, riseOf } from "./layers";

/*
 * The drawing's engine. React renders the stack once and owns which layer is
 * current; everything that moves between two layers is eased here, frame by
 * frame, so the SVG plates and the canvas grains stay in step.
 *
 * Grains. Each plate has a fixed set of samples over its face and along its
 * edge. A sample knows its home on the plate, how early the erosion front
 * reaches it, and how far it may wander: most stay close, some drift, a few
 * travel. Every offset is multiplied by how far the plate has dissolved, so a
 * grain always returns exactly home.
 *
 * Cost is the number of grains drawn per frame, so it is held down four
 * ways: fewer samples and a lower pixel ratio on touch devices, far plates
 * draw only a share of their samples, the idle drift runs at half rate, and
 * a running measure of paint time trims the share further on a slow device.
 * The drift's trigonometry is precomputed per sample; a frame only multiplies.
 */

export interface StackEngine {
  /** Make a layer current. `isInstant` lands it without easing. */
  show(index: number, isInstant?: boolean): void;
  destroy(): void;
}

interface Eased { now: number; goal: number }
interface Plate {
  el: SVGGElement;
  body: SVGGElement;
  slab: SVGGElement;
  stops: SVGStopElement[];
  probes: SVGGElement[];
  rise: Eased;
  gone: Eased;
  dense: Eased;
  grains: Float32Array[];
  inks: string[];
  wrote: Record<string, string>;
  art: number;
}

/** Values per grain sample: x, y, erosion, reach, size, then six precomputed sines and cosines. */
const STRIDE = 11;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const smooth = (low: number, high: number, value: number) => { const t = clamp((value - low) / (high - low), 0, 1); return t * t * (3 - 2 * t); };
/** Erosion at a point of the plate: distance from the front corner, plus a
 *  small continuous noise. The solid is clipped by the same front. */
const erosion = (x: number, y: number) => clamp(0.08 + Math.hypot(x - 120, y - 120) / 340 * 0.6 + 0.038 * Math.sin(x * 0.19 + y * 0.11) + 0.023 * Math.cos(x * -0.14 + y * 0.29), 0.04, 0.85);

/** A duration token in milliseconds. A build may rewrite `2000ms` as `2s`,
 *  so the unit is read, not assumed. */
export function durationOf(element: Element, name: string, fallback: number) {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(getComputedStyle(element).getPropertyValue(name).trim());
  if (!match) return fallback;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

export function mountStack(root: HTMLElement, { onPick }: { onPick: (index: number) => void }): StackEngine {
  const svg = root.querySelector<SVGSVGElement>(".stack-svg")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".stack-grains")!;
  const context = canvas.getContext("2d")!;
  const page = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  const last = layers.length - 1;
  const stop = new AbortController();
  const listen = { signal: stop.signal };

  // Every wait and every easing rate is read from the motion tokens, never
  // restated. Under reduced motion the tokens collapse and so do these.
  const token = (name: string, fallback: number) => durationOf(root, name, fallback);
  const pace = { settle: 0, turn: 0, dissolve: 0, reform: 0, thin: 0, step: 0, enter: 0 };
  const tune = () => {
    const enter = token("--ui-duration-enter", 400) / 1000;
    const slow = token("--ui-duration-slow", 320) / 1000;
    Object.assign(pace, { settle: 2.2 / enter, turn: 2.9 / slow, dissolve: 2.4 / slow, reform: 1.4 / enter, thin: 1.6 / enter, step: token("--ui-stagger-step", 100), enter: enter * 1000 });
  };

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const count = isTouch ? 1100 : 2400;
  const maxRatio = isTouch ? 1.5 : 2;
  let seed = 722;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function sample(index: number) {
    const tones: number[][] = [[], [], []];
    for (let n = 0; n < count; n++) {
      let x: number, y: number;
      if (n % 6 === 0) {
        const along = random() * 240 - 120, side = Math.floor(random() * 4);
        x = side === 0 ? along : side === 1 ? 120 : side === 2 ? along : -120;
        y = side === 0 ? -120 : side === 1 ? along : side === 2 ? 120 : along;
      } else { x = random() * 236 - 118; y = random() * 236 - 118; }
      const cornerX = Math.abs(x) - 112, cornerY = Math.abs(y) - 112;
      if (cornerX > 0 && cornerY > 0 && cornerX * cornerX + cornerY * cornerY > 64) { n--; continue; }
      const spread = random(), tone = random(), phase = spread * 6.283 + index;
      const p1 = y * 0.03 + phase, p2 = x * 0.04 + phase * 0.75, p3 = x * 0.03 + phase;
      tones[tone < 0.62 ? 0 : tone < 0.95 ? 1 : 2]!.push(x, y, erosion(x, y), spread < 0.65 ? 5 : spread < 0.91 ? 20 : 52, 0.8 + 1.1 * random(), Math.sin(p1), Math.cos(p1), Math.sin(p2), Math.cos(p2), Math.sin(p3), Math.cos(p3));
    }
    return tones.map(list => new Float32Array(list));
  }

  const plates: Plate[] = [...root.querySelectorAll<SVGGElement>(".stack-plate")].map((el, index) => ({
    el,
    body: el.querySelector<SVGGElement>(".stack-body")!,
    slab: el.querySelector<SVGGElement>(".stack-slab")!,
    stops: [...root.querySelectorAll<SVGStopElement>(`#stack-fade-${index} stop`)],
    probes: [...el.querySelectorAll<SVGGElement>(".stack-probe g")],
    rise: { now: Number(el.style.getPropertyValue("--stack-y")), goal: 0 },
    gone: { now: 0, goal: 0 },
    dense: { now: 1, goal: 1 },
    grains: sample(index),
    inks: [],
    wrote: {},
    art: 0,
  }));
  const base: Eased = { now: Number(getComputedStyle(root).getPropertyValue("--stack-base")), goal: 0 };
  const guides = [...root.querySelectorAll<SVGLineElement>("[data-guide]")];
  const shade = root.querySelector<SVGRectElement>("[data-shade]")!;
  const turn = { now: 45, user: 45, lean: 0 };
  const K = Math.sqrt(1.5), S = Math.tan(Math.PI / 6);
  const view = { a: 0.866, b: 0.5, c: -0.866, d: 0.5 };
  const size = { width: 0, height: 0 };
  let active = HOME;
  let frame = 0, before = 0, painted = 0;
  let isSeen = true, isInstant = false, hasTurned = true, hasNewInk = true;
  let guided = "", quality = 1, cost = 0;

  function render() {
    tune();
    base.goal = baseOf(active);
    plates.forEach((plate, index) => {
      const isWaiting = index > active;
      plate.rise.goal = riseOf(index, active);
      plate.gone.goal = isWaiting && !reduce.matches ? 1 : 0;
      plate.dense.goal = isWaiting ? GRAIN[index - active]! : 1;
      plate.el.dataset.state = index < active ? "settled" : index === active ? "active" : "ghost";
      plate.el.style.setProperty("--stack-o", String(reduce.matches && isWaiting ? INK[index - active] : 1));
      // Objects are needed on the current plate and under the Proof film,
      // which is see-through. Anywhere else they are switched off once the
      // plate has been covered or has dissolved.
      const isShown = index === active || (index === active - 1 && layers[active]!.key === "proof") || reduce.matches;
      window.clearTimeout(plate.art);
      if (isShown) plate.el.removeAttribute("data-art");
      else plate.art = window.setTimeout(() => plate.el.setAttribute("data-art", "off"), 2 * pace.enter + pace.step);
    });
    kick();
  }

  function kick() { if (!frame) frame = window.requestAnimationFrame(draw); }

  /** Write a value to the page only when it has changed. */
  const put = (plate: Plate, key: string, value: string, write: (value: string) => void) => { if (plate.wrote[key] !== value) { plate.wrote[key] = value; write(value); } };

  function draw(now: number) {
    frame = 0;
    const dt = Math.min(0.05, (now - before) / 1000 || 0.016);
    before = now;
    const isJump = reduce.matches || isInstant;
    const ease = (value: Eased, rate: number) => {
      if (value.now === value.goal) return false;
      value.now += (value.goal - value.now) * (isJump ? 1 : 1 - Math.exp(-rate * dt));
      if (Math.abs(value.goal - value.now) < 0.002) value.now = value.goal;
      return true;
    };
    let isMoving = false;
    if (ease(base, pace.settle)) { isMoving = true; root.style.setProperty("--stack-base", base.now.toFixed(2)); }

    // Turning: a true projection, azimuth 45 degrees at rest.
    const aim: Eased = { now: turn.now, goal: turn.user + turn.lean };
    if (ease(aim, pace.turn) || hasTurned) {
      isMoving = isMoving || aim.now !== aim.goal;
      hasTurned = false;
      turn.now = aim.now;
      const angle = turn.now * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      view.a = K * cos; view.b = K * S * sin; view.c = -K * sin; view.d = K * S * cos;
      const set = (name: string, value: number) => root.style.setProperty(name, value.toFixed(4));
      set("--stack-a", view.a); set("--stack-b", view.b); set("--stack-c", view.c); set("--stack-d", view.d);
      set("--stack-ux", -sin / (K * S)); set("--stack-uy", -cos / (K * S));
      // The seam between the two visible sides sits under the front corner.
      shade.setAttribute("width", (400 + 120 * (view.a + view.c)).toFixed(2));
    }

    let top = 0, hasGrains = false;
    plates.forEach((plate, index) => {
      if (ease(plate.rise, pace.settle)) isMoving = true;
      // Dissolve quickly, reform slowly.
      if (ease(plate.gone, plate.gone.goal > plate.gone.now ? pace.dissolve : pace.reform)) isMoving = true;
      if (ease(plate.dense, pace.thin)) isMoving = true;
      put(plate, "y", plate.rise.now.toFixed(2), value => plate.el.style.setProperty("--stack-y", value));
      top = Math.max(top, plate.rise.now);
      const gone = plate.gone.now;
      if (gone > 0) hasGrains = true;
      // The solid is clipped by the erosion front the grains fade in on. A
      // plate that is whole carries no mask; one that is gone is not drawn.
      const front = clamp((gone - 0.08) / 0.6, 0, 1.2);
      put(plate, "mask", gone <= 0 ? "" : front >= 1.1 ? "gone" : front.toFixed(3), value => {
        if (value === "") { plate.body.removeAttribute("mask"); plate.body.style.visibility = ""; plate.slab.style.opacity = ""; return; }
        if (value === "gone") { plate.body.style.visibility = "hidden"; plate.slab.style.opacity = "0"; return; }
        plate.stops[0]!.setAttribute("offset", clamp(front - 0.1, 0, 1).toFixed(3));
        plate.stops[1]!.setAttribute("offset", clamp(front, 0, 1).toFixed(3));
        plate.body.setAttribute("mask", `url(#stack-mask-${index})`);
        plate.body.style.visibility = "";
        plate.slab.style.opacity = (1 - smooth(0.05, 0.5, gone)).toFixed(2);
      });
    });

    // Construction lines through the left, right and front corners.
    const key = `${turn.now.toFixed(2)}/${top.toFixed(1)}`;
    if (key !== guided) {
      guided = key;
      for (const line of guides) {
        const side = Number(line.dataset.guide);
        const x = side ? side * 120 * (view.a - view.c) : 120 * (view.a + view.c);
        const y = side ? side * 120 * (view.b - view.d) : 120 * (view.b + view.d);
        line.setAttribute("x1", x.toFixed(1)); line.setAttribute("x2", x.toFixed(1));
        line.setAttribute("y1", (y + 6).toFixed(1)); line.setAttribute("y2", (y - top).toFixed(1));
      }
    }

    // Grain ink comes from each plate's own theme roles, so a new look
    // recolours the grains with the plate. Read only when a theme changed.
    if (hasNewInk) { hasNewInk = false; for (const plate of plates) plate.inks = plate.probes.map(probe => getComputedStyle(probe).color); }

    // While something is moving the grains keep pace; drifting on their own
    // they are painted at half rate.
    if (isMoving || now - painted > 30) {
      painted = now;
      const started = performance.now();
      paint(now / 1000, hasGrains);
      cost += (performance.now() - started - cost) * 0.1;
      quality = clamp(quality + (cost > 6 ? -0.04 : cost < 3 ? 0.02 : 0), 0.35, 1);
    }
    if (isInstant && !isMoving) { isInstant = false; window.requestAnimationFrame(() => root.removeAttribute("data-instant")); }
    if (isMoving || (hasGrains && isSeen && !document.hidden && !reduce.matches)) kick();
  }

  function paint(clock: number, hasGrains: boolean) {
    const { width, height } = size;
    if (!width) return;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    context.clearRect(0, 0, width, height);
    if (!hasGrains) return;
    const unit = width / 520;
    const ax = view.a * unit, bx = view.b * unit, cx = view.c * unit, dx = view.d * unit, originX = 260 * unit;
    const s1 = Math.sin(clock * 1.3), c1 = Math.cos(clock * 1.3), s2 = Math.sin(clock), c2 = Math.cos(clock);
    for (const plate of plates) {
      const gone = plate.gone.now;
      if (gone <= 0) continue;
      const originY = (base.now - plate.rise.now) * unit, isWhole = gone >= 1;
      // A thinner plate draws fewer of its samples, not fainter ones.
      const share = clamp(plate.dense.now * quality, 0, 1), fade = smooth(0, 0.06, gone) * (0.55 + 0.45 * plate.dense.now);
      plate.grains.forEach((list, tone) => {
        const end = Math.floor(list.length / STRIDE * share) * STRIDE;
        context.fillStyle = plate.inks[tone] ?? "currentColor";
        context.globalAlpha = fade * (tone === 0 ? 0.7 : 1);
        context.beginPath();
        for (let n = 0; n < end; n += STRIDE) {
          let freed = 1;
          if (!isWhole) { const edge = list[n + 2]!; freed = smooth(edge - 0.045, edge + 0.13, gone); if (freed < 0.03) continue; }
          const reach = list[n + 3]! * freed;
          const px = list[n]! + reach * 0.5 * (list[n + 5]! * c1 + list[n + 6]! * s1);
          const py = list[n + 1]! + reach * 0.5 * (list[n + 8]! * c2 - list[n + 7]! * s2);
          const pz = reach * (0.63 + 0.3 * (list[n + 9]! * c2 - list[n + 10]! * s2)) * unit;
          const side = list[n + 4]! * unit * (0.45 + 0.55 * freed);
          context.rect(originX + ax * px + cx * py, originY + bx * px + dx * py - pz, side, side);
        }
        context.fill();
      });
    }
    context.globalAlpha = 1;
  }

  // Drag turns the drawing and letting go returns it; a fine pointer also
  // leans it toward the cursor. A press that never becomes a drag picks the
  // plate under it.
  let drag: { id: number; x: number; from: number; hasMoved: boolean; plate: SVGGElement | null } | null = null;
  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, from: turn.user, hasMoved: false, plate: (event.target as Element).closest<SVGGElement>(".stack-plate") };
  }, listen);
  svg.addEventListener("pointermove", event => {
    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x;
      if (!drag.hasMoved && Math.abs(dx) < 6) return;
      if (!drag.hasMoved) { drag.hasMoved = true; svg.setPointerCapture(drag.id); svg.toggleAttribute("data-dragging", true); }
      turn.user = clamp(drag.from - dx * 0.28, 18, 72);
      turn.lean = 0;
      kick();
    } else if (!drag && event.pointerType === "mouse" && !reduce.matches) {
      const box = svg.getBoundingClientRect();
      turn.lean = ((event.clientX - box.left) / box.width - 0.5) * -7;
      kick();
    }
  }, listen);
  const release = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.hasMoved && event.type === "pointerup" && drag.plate) onPick(Number(drag.plate.dataset.plate));
    if (drag.hasMoved) { turn.user = 45; kick(); }
    svg.removeAttribute("data-dragging");
    drag = null;
  };
  svg.addEventListener("pointerup", release, listen);
  svg.addEventListener("pointercancel", release, listen);
  svg.addEventListener("pointerleave", () => { if (!drag) { turn.lean = 0; kick(); } }, listen);

  // The section has no look control of its own. It follows the page: when the
  // site's brand changes, the new seed climbs the stack, each plate taking it
  // a beat after the one below. A plate carries a brand of its own only while
  // the wave passes; at rest it inherits the page's.
  let brand = page.dataset.siteBrand ?? "";
  let wave: number[] = [];
  const reink = () => { hasNewInk = true; kick(); };
  function follow() {
    const next = page.dataset.siteBrand ?? "";
    if (next === brand) { reink(); return; }
    wave.forEach(window.clearTimeout);
    const beat = reduce.matches ? 0 : pace.step;
    // Runs before the page paints its new brand, so no plate shows it early.
    for (const plate of plates) plate.el.dataset.siteBrand ||= brand;
    brand = next;
    wave = plates.map((plate, index) => window.setTimeout(() => { plate.el.dataset.siteBrand = next; reink(); }, index * beat));
    wave.push(window.setTimeout(() => { for (const plate of plates) delete plate.el.dataset.siteBrand; reink(); }, plates.length * beat));
  }
  const themes = new MutationObserver(follow);
  themes.observe(page, { attributes: true, attributeFilter: ["data-theme", "data-site-scheme", "data-site-brand"] });
  dark.addEventListener("change", reink, listen);

  // The grains only run while the drawing is on screen and the tab is open.
  const sight = new IntersectionObserver(([entry]) => { isSeen = entry!.isIntersecting; if (isSeen) kick(); });
  sight.observe(svg);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); }, listen);
  reduce.addEventListener("change", render, listen);
  // The canvas is measured when its box changes, never inside a frame.
  const measure = new ResizeObserver(() => {
    const ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
    size.width = Math.round(canvas.clientWidth * ratio);
    size.height = Math.round(canvas.clientHeight * ratio);
    kick();
  });
  measure.observe(canvas);

  render();

  return {
    show(index, instant = false) {
      active = clamp(index, 0, last);
      if (instant) { isInstant = true; root.toggleAttribute("data-instant", true); }
      render();
    },
    destroy() {
      stop.abort();
      themes.disconnect();
      sight.disconnect();
      measure.disconnect();
      wave.forEach(window.clearTimeout);
      for (const plate of plates) window.clearTimeout(plate.art);
      window.cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
