/**
 * The effects layer (ADR 0022): materials, light and motion a brand can lay
 * over the components without any component growing a prop.
 *
 *   <Card className={fx("glass", "edge", "specular")}>…</Card>
 *   <Button className={fx("aurora", "sheen")}>Publish</Button>
 *   <p className={fx("shimmer")}>Generating…</p>
 *
 * HOW AN EFFECT REACHES A PART. An effect is a CLASS on a component's root.
 * `className` is the one prop CONVENTIONS §5 guarantees lands on the
 * outermost node of every component; native props do not (a Checkbox sends
 * them to its hidden <input>). From the root, the stylesheet reaches the part
 * it paints through `data-slot` — the surface CONVENTIONS §6 already
 * sanctions for targeting internals — so a Switch's grain lands on its track
 * and a Slider's aurora on its fill, and the component never knows.
 *
 * THE FLOOR IS THE COMPONENT. Every effect is a layer over a component that
 * is already finished. When it cannot apply — reduced transparency, forced
 * colours, no WebGL, before hydration — the part keeps its own fill, ink and
 * shadow, and nothing else has to be drawn or kept in sync.
 *
 * TWO ITEMS, ONE VOCABULARY. The CSS effects ship here, one stylesheet each
 * (`fx/*.css`, imported through `fx/fx.css`). The two SHADER effects are a
 * separate, optional item, `@/lib/shader`, because a canvas costs a runtime
 * and most products will never want one. They are named here anyway, so
 * `fx("aurora")` type-checks in an app that has not installed the runtime
 * yet — and renders exactly the component, which is the floor.
 *
 * WHAT MAY BE A SHADER is a rule, not a taste (ADR 0022): a shader paints only
 * pixels it owns, every input is a token, its floor is the component, and it
 * guards the contrast of the ink its part carries. Glass that bends the page
 * behind it fails the first clause — a canvas cannot read the DOM — which is
 * why glass is CSS. `pnpm check:fx` enforces the rule on the shader sources.
 */

/** A component, or kind of element, an effect is written for. */
export type FxTarget =
  | "button"
  | "card"
  | "badge"
  | "switch"
  | "checkbox"
  | "slider"
  | "progress"
  | "field"
  /** Any element that sets text: a heading, a status line. */
  | "text"
  /** Any unslotted surface: a hero band, an empty state's ground. */
  | "ground";

export interface FxSpec {
  /** CSS ships in `@/lib/fx`; a shader needs `@/lib/shader` and its runtime. */
  readonly kind: "css" | "shader";
  /** The stylesheet that owns it: `fx/<sheet>.css`, or `shader.css`. */
  readonly sheet: string;
  /** What it is FOR — the question to ask before reaching for it. */
  readonly job: string;
  /** Where it applies. Anywhere else it does nothing, which `check:fx` reports. */
  readonly on: readonly FxTarget[];
}

/**
 * Every effect, its job and where it applies — the single source the
 * stylesheets, the shader recipes, the stories and `check:fx` are checked
 * against. A new effect is a row here plus its stylesheet; nothing else.
 */
export const EFFECTS = {
  glass: {
    kind: "css",
    sheet: "glass",
    job: "A translucent surface over moving or busy content: --ui-bg-glass (a tint the resolver derives per brand so the inks still clear AA) over a blurred, saturated backdrop, lit along its top edge.",
    on: ["button", "card", "badge"],
  },
  edge: {
    kind: "css",
    sheet: "glass",
    job: "Glass modifier: a 1px gradient edge in place of the border, brightest at the top left where the light comes from.",
    on: ["card", "badge"],
  },
  inner: {
    kind: "css",
    sheet: "glass",
    job: "Glass modifier: the thickness of a pane — a light line along the top, a soft bloom inside the rim, a line of shade along the bottom.",
    on: ["button", "card", "badge"],
  },
  specular: {
    kind: "css",
    sheet: "glass",
    job: "Glass modifier: a broad light across the surface from the top left, over a tint a shade lighter at the top.",
    on: ["button", "card", "badge"],
  },
  grain: {
    kind: "css",
    sheet: "grain",
    job: "Film grain blended into a fill, so a flat colour reads as a material rather than as plastic.",
    on: ["button", "card", "switch", "slider", "progress"],
  },
  sheen: {
    kind: "css",
    sheet: "sheen",
    job: "Light on the top of a fill; with sweep(), one pass of light across it to mark a moment — a success, a value reached. Never on hover.",
    on: ["button", "badge", "slider", "progress"],
  },
  glow: {
    kind: "css",
    sheet: "glow",
    job: "Soft light under a control while it is ON. Composes with the focus ring instead of replacing it.",
    on: ["button", "switch", "checkbox"],
  },
  shimmer: {
    kind: "css",
    sheet: "shimmer",
    job: "Light travelling through a status label while work runs. Both stops are text roles, so every point of the label keeps its contrast.",
    on: ["text"],
  },
  ink: {
    kind: "css",
    sheet: "ink",
    job: "Display text filled with a slowly turning gradient between two text roles.",
    on: ["text"],
  },
  aurora: {
    kind: "shader",
    sheet: "shader",
    job: "The brand colour moving through a fill or a ground. The shader keeps the part's ink at its contrast floor, per pixel.",
    on: ["button", "switch", "checkbox", "slider", "progress", "ground"],
  },
  halo: {
    kind: "shader",
    sheet: "shader",
    job: "Light travelling round a surface while it works (aria-busy) or listens (focus within a field). Never a crisp ring, which would read as the focus indicator.",
    on: ["button", "field", "ground"],
  },
} as const satisfies Record<string, FxSpec>;

export type FxName = keyof typeof EFFECTS;

/** The effects that need `@/lib/shader` and its runtime. */
export type ShaderFxName = { [K in FxName]: (typeof EFFECTS)[K]["kind"] extends "shader" ? K : never }[FxName];

/**
 * Class names for one or more effects, in the order given.
 *
 * Order does not change the result — every effect owns its own layer — but
 * keeping it lets a reader see the stack: `fx("glass", "edge", "grain")`.
 */
export function fx(...names: FxName[]): string {
  return names.map((name) => `fx-${name}`).join(" ");
}

/**
 * One pass of light across an element carrying `fx("sheen")` — the moment a
 * value is reached or a save succeeds. A ONE-SHOT, so a keyframe (CONVENTIONS
 * §8), restarted by removing and re-adding the attribute the stylesheet keys
 * on. Under reduced motion the stylesheet runs no animation at all, so this
 * sets nothing: the moment is carried by whatever static cue the caller
 * already shows (CONVENTIONS §8 — motion is never the only channel).
 *
 * Call it from an event handler or an effect, never during render.
 */
export function sweep(element: HTMLElement): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.removeAttribute("data-fx-sweep");
  // Reading layout between the two writes is what makes the browser see a
  // NEW animation rather than the same one still applied.
  void element.offsetWidth;
  element.setAttribute("data-fx-sweep", "");
  element.addEventListener("animationend", () => element.removeAttribute("data-fx-sweep"), { once: true });
}
