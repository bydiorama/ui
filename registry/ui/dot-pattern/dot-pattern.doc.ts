/**
 * Typed documentation for DotPattern.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const dotPatternDoc = {
  name: "DotPattern",
  status: "stable",
  summary:
    "A decorative dot-grid layer for canvas grounds — the texture behind the Creative Editor stage and the Library's business-card previews. It fills its container absolutely and paints evenly spaced circular dots, nothing else: no ground of its own, no edge, no pointer target. Geometry defaults transcribe the shipped Paper shader recipe (2px dots on a 16px pitch); the dot ink is border-subtle carried as currentColor, so className retints it with any ink utility, and the container keeps its own background showing through between the dots.",

  anatomy: [
    {
      part: "layer",
      slot: "dot-pattern",
      notes:
        "The only node — an aria-hidden SVG, absolutely inset to the container's box, pointer-events none. It holds a <pattern> tile of one centred circle per gap×gap cell and a full-size <rect> painted with it. The CONTAINER is the caller's: position relative, its own background (bg-sunken in both shipped usages) and any clipping radius belong there, never here.",
    },
  ],

  composition: `
DotPattern
└─ (no children — gap and dotSize shape the tile, className carries colour)

<div className="relative overflow-clip rounded-md bg-sunken">
  <DotPattern />
  {/* content stacks above in normal flow — no z-index needed */}
  <Card>…</Card>
</div>

// Denser, stronger, retinted — geometry via props, colour via className:
<div className="relative bg-sunken">
  <DotPattern gap={8} dotSize={2} className="text-edge-default" />
</div>
  `.trim(),

  props: {
    gap: {
      type: "number",
      default: "16",
      notes:
        "Pitch between dot centres, px, both axes. A plain number rather than a spacing token on purpose — density is geometry, not spacing semantics (sheet, Geometry). The tile starts at the container's top-left, so the first dot centre sits at (gap/2, gap/2) and edges clip mid-dot instead of the grid re-centring on resize.",
    },
    dotSize: {
      type: "number",
      default: "2",
      notes:
        "Dot diameter, px. The default is the shader's `size: 1` read as a radius — @paper-design/shaders' dot-grid GLSL treats u_dotSize as the distance from cell centre to dot edge — so the shipped look is 2px diameter (sheet, Gaps § Dot size).",
    },
    className: {
      type: "string",
      notes:
        "Colour lives here, in tokens. The dots ride on currentColor with text-edge-subtle as the default ink, so `text-edge-default` is the strong opt-in and any ink utility retints. A background on the layer itself is a `bg-*` utility the same way — but the shipped composition paints the CONTAINER instead, which is what keeps one pattern working over any surface token.",
    },
  },

  do: [
    "Give the container position: relative, its own background, and the clipping radius — the layer paints dots and nothing else.",
    "Put content after the pattern in source order; it stacks above without z-index because the layer comes first.",
    "Retint with an ink utility in className (text-edge-default when the grid must read at a glance); the default border-subtle grain is deliberately near-invisible.",
    "Change density with gap and weight with dotSize — 8/16/24 and 1/2/4 are the drawn range on the sheet.",
  ],

  dont: [
    "Do not make the grid carry information. It measures 1.21:1 against bg-sunken by design — anything that must be read sits on the content above it.",
    "Do not wrap it in a positioned shim to place it — the component is already absolute inset 0; position the CONTAINER.",
    "Do not reach for a raw hex to retint it. The two inks the design draws are border-subtle and border-default; a third colour is a design question for the sheet, not a call-site invention.",
    "Do not expect pointer events on it — the layer is pointer-events none so canvas interactions land on the container and content.",
  ],

  a11y: {
    role: "none — an aria-hidden SVG. The attribute sits AFTER the prop spread, so it is contract rather than default: a texture never names anything, which is the difference from Skeleton's overridable default.",
    name: "None, ever.",
    keyboard: [],
    focus:
      "Never focusable and never a pointer target (pointer-events: none). Nothing about the layer participates in interaction.",
    contrastPairs: [
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-sunken",
        floor: "decorative",
        why: "The default dot ink against the canvas ground both shipped usages use — 1.21:1 light, 1.53:1 dark, deliberately below any floor and declared decorative on the sheet (Gaps § Contrast). The grid is grain, not information; nothing may depend on seeing it. Declared rather than omitted so the number stays measured in both schemes.",
      },
      {
        fg: "--ui-border-default",
        bg: "--ui-bg-sunken",
        floor: "decorative",
        why: "The strong opt-in ink (sheet, Colour). Still decorative — stronger only so the grid reads at a glance where the canvas metaphor wants it, never because something depends on it.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the svg — the only node, not a form control, so the §5 default applies.",
    className:
      "Lands on the svg and merges last: text-* utilities displace the default ink, bg-* adds a layer ground, and pointer-events/position defaults are displaceable the same way.",
    rest: "Native SVG props go to the svg. `children` is typed out — the tile is generated from gap and dotSize, and arbitrary children inside the <svg> would silently not be the pattern. `aria-hidden` is set after the spread and cannot be overridden.",
  },

  motion:
    "None. The shader's sizeRange and opacityRange randomisers were 0 in both shipped usages; the grid is static, so prefers-reduced-motion has nothing to remove (sheet, Behaviour § Motion).",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Only square grids are drawn: the shader exposes gapX/gapY separately but both usages set them equal, so the component ships one `gap`. An anisotropic grid is a new sheet row before it is a prop.",
    "DotGrid's square and diamond dot shapes, stroke, and the size/opacity randomisers are not carried over — both shipped usages draw plain circles (sheet, Gaps § Shader extras).",
  ],

  knownGaps: [
    "No geometry spec (design/paper/specs/) exists for this item, deliberately: the geometry laws measure container/child insets and gaps from world coordinates, and a tile pitch has neither a padding box nor children to measure. The pattern numbers the sheet fixes (gap 16, dot 2, first centre at gap/2) are asserted directly in dot-pattern.browser.test.tsx instead.",
    "The dot ink defaults through a Tailwind utility (text-edge-subtle), not a component CSS variable — so retinting is a className, which is the system's idiom, but there is no --ui-dot-pattern-* override surface below it. If a brand needs to move the default without touching call sites, that is the moment to add one.",
    "The layer needs a positioned ancestor. Inside a static container, absolute inset-0 resolves against the nearest positioned ancestor instead — the grid silently paints somewhere else. The browser test pins the intended composition; the doc cannot stop a static container.",
    "Sub-pixel dot edges are the browser's to rasterise. A 2px circle on a 16px pitch renders crisply at 1x and 2x, but a fractional dotSize lands on antialiasing — the sheet only draws integer diameters (1, 2, 4).",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2EKF-0",
} as const;

export type DotPatternDoc = typeof dotPatternDoc;
