/**
 * Typed documentation for Fade.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const fadeDoc = {
  name: "Fade",
  status: "stable",
  summary:
    "An edge fade — the gradient that dissolves overflowing content into the ground it sits on, signalling continuation: under a pinned header, above a composer bar, at the cut of a truncated preview. One aria-hidden span, absolutely pinned to one edge of the caller's clipping container, painting a two-stop ramp from the container's own bg role at 0% alpha to that role solid. No new colour tokens: the ramp is an existing bg role, its depth the spacing scale (16/32/64), and the pinned-bar pairing the shipped affix pair. Elsewhere this pattern is a \"scroll scrim\" (GitLab) or \"ScrollShadow\" (HeroUI); here --ui-scrim already names the modal veil, so the fade keeps its own name.",

  anatomy: [
    {
      part: "band",
      slot: "fade",
      notes:
        "The only node — an aria-hidden span, absolutely pinned to one edge, spanning the cross axis, pointer-events none. It paints the ramp and nothing else: no edge, no ground of its own beyond the gradient, no pointer target. The CONTAINER is the caller's: position relative, the clipping (overflow-clip or a max-height), the ground the ramp ends on, and the route to the full content all belong there. An action slot (Show more, a 32px chrome control) is caller-composed and sits past the solid end of the ramp, never mid-band.",
    },
  ],

  composition: `
Fade
└─ (no children — side, size and ground shape the band; the caller owns the container)

// Truncated text with a route to the rest (sheet § Patterns, Truncated text):
<div className="relative flex flex-col rounded-lg bg-elevated">
  <div className="relative max-h-32 overflow-clip px-lg pt-lg">
    <p className="text-body-md">…long message…</p>
    <Fade ground="elevated" size="sm" />
  </div>
  <button type="button" className="…">Show more</button>
</div>

// Pinned header — DON'T hand-roll this one: Header ships it as the affix
// variant, wiring the fade to its own stuck-state observer (sheet
// § Patterns, Pinned header; Header sheet 05 Affix · Fade variant):
<Header affix={{ fade: true }}>…</Header>

// The manual shape, for a bar that is not a Header — the ramp replaces the
// bar's bottom hairline while anything is scrolled under:
<div className="relative overflow-clip">
  <div className="absolute inset-x-0 top-0 h-12 bg-affix">…bar…</div>
  <Fade side="top" ground="base" className="top-12" isVisible={isScrolled} />
  <div className="overflow-y-auto">…content…</div>
</div>

// Horizontal overflow — a chip row continuing past the clip:
<div className="relative overflow-clip">
  <div className="flex gap-sm overflow-x-auto">…chips…</div>
  <Fade side="right" ground="surface" size="sm" isVisible={canScrollRight} />
</div>
  `.trim(),

  props: {
    side: {
      type: '"top" | "bottom" | "left" | "right"',
      default: '"bottom"',
      notes:
        "The edge the content disappears under; the solid end of the ramp sits against it. Bottom is the default because truncation reads downward. Physical sides on purpose, like Sheet's: the band tracks the container's box — the geometry a scrollbar has — not the writing direction (knownGaps records the RTL consequence).",
    },
    size: {
      type: '"sm" | "md" | "lg"',
      default: '"md"',
      notes:
        "Ramp depth on the spacing scale: sm 16px (space-lg) for dense chrome, md 32px (space-2xl) as the default — deliberately the same 32px ramp ImageOverlay ships — lg 64px (space-4xl) for display-scale content and document previews. No new size tokens (sheet § Depth).",
    },
    ground: {
      type: '"base" | "surface" | "elevated" | "sunken"',
      default: '"surface"',
      notes:
        "The bg role the ramp ends on — the CONTAINER's own ground, restated so both stops name the same role at different alphas. A fade painted in the wrong ground reads as a smudge (sheet § Grounds). Media is deliberately absent: text-over-image is ImageOverlay's contract (its 72% cap is a conformance floor); unknown or mixed grounds want a mask, not a painted colour (knownGaps).",
    },
    isVisible: {
      type: "boolean",
      default: "true",
      notes:
        "The overflow state, owned by the caller: hidden when content fits or the container is scrolled flush to this edge (sheet § Behaviour, Visibility). Visual only — opacity over --ui-duration-fast (the sheet's \"~150ms\" mapped onto the motion scale), never a ramp resize, which reads as the content moving. The band keeps its box either way, so toggling never reflows.",
    },
    className: {
      type: "string",
      notes:
        "Lands on the band and merges last. The shipped use is placement nudges — `top-12` to hang a top fade below a pinned header — and stacking context fixes. Retinting the ramp through className is possible but almost always wrong: the ground prop exists so both stops move together.",
    },
  },

  do: [
    "Give the container position: relative, the clipping (overflow-clip or a max-height), and the ground the ramp names — the band paints and nothing else.",
    "Pair every fade with a reachable route to the full content: Show more, an expand control, or the scroll itself. The fade signals; the paired control discloses.",
    "Match ground to the container's actual bg role — both stops move together, which is the point of the prop.",
    "Bind isVisible to overflow: hidden when content fits or the container sits flush at that edge, and let the opacity transition do the appearing.",
    "Put the action slot past the solid end of the ramp (the anatomy card's chevron sits 12px off the edge), never mid-band.",
  ],

  dont: [
    "Do not put anything interactive inside the band — mid-ramp ground fails every contrast floor by design, and the layer must not steal clicks (it is pointer-events none so content under it stays clickable).",
    "Do not paint a fade over media or mixed grounds — no overlay colour is right there. Text over an image is ImageOverlay's contract; a ground-agnostic fade is a mask, recorded as a gap.",
    "Do not use it as the only affordance — a fade with no route to the content is a defect, not a style (sheet § Behaviour, Affordance).",
    "Do not animate the ramp's depth to show or hide it — that reads as the content moving. Visibility is opacity, on the motion tokens.",
    "Do not compose a bespoke ramp whose SOLID stop is anything but the container's ground role — that is what the ground prop moves for you. (The transparent end's hue is irrelevant: gradient interpolation is premultiplied, so a zero-alpha stop cannot grey the mid-band — the /0 stop in fact computes to transparent black through color-mix, and the browser test pins the alpha, not the hue.)",
  ],

  a11y: {
    role: "none — an aria-hidden span. The attribute sits AFTER the prop spread, so it is contract rather than default: paint never names anything (same reasoning as DotPattern).",
    name: "None, ever.",
    keyboard: [],
    focus:
      "Never focusable and never a pointer target (pointer-events: none). Content under the band stays in the accessibility tree unclamped, stays selectable, and stays clickable — the band veils paint, not semantics. The conformance story for the faded region is the un-faded route (Show more, expand, scroll), which is a caller obligation the doc's do/don't records.",
    contrastPairs: [
      {
        fg: "--ui-text-secondary",
        bg: "--ui-bg-surface",
        floor: "decorative",
        why: "Text mid-ramp sits under its own ground at ~50% alpha — below every floor, by design (sheet, Gaps § Mid-ramp contrast). The band is declared decorative like DotPattern's grain: nothing may depend on reading through it, which is why no interactive target may live inside it and why the un-faded route is mandatory. Declared rather than omitted so the decision stays visible where the audit looks.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the span — the only node, not a form control, so the §5 default applies.",
    className:
      "Lands on the span and merges last: placement utilities (top-12) displace the side's default pin, opacity/transition defaults are displaceable the same way.",
    rest: "Native span props go to the span. `children` is typed out — the band is paint, and content inside it would sit on unreadable ground and violate the no-targets rule. `aria-hidden` is set after the spread and cannot be overridden.",
  },

  motion:
    "One transition: opacity over --ui-duration-fast with --ui-ease-out when isVisible toggles — the sheet's \"~150ms\" mapped onto the motion scale (120ms; 1ms under prefers-reduced-motion, handled at the token layer). Never the ramp's size. The static cue accompanying the motion (CONVENTIONS §8) is the content edge itself: at the flush edge there is visibly nothing more to scroll.",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Horizontal fades are drawn only at size=sm-to-md over chip rows; the sheet draws no lg horizontal case. If a wide horizontal ramp is ever wanted (a carousel edge, a kanban board), that is a sheet row before it is a call site.",
    "The sheet's action-slot chevron control (32px, bg-elevated, radius-md, ChevronDownSmall) is the same chrome control Header, Sheet and Calendar draw; Fade composes it from @/lib/chrome-control at call sites and does not own it. If a dedicated \"expand\" affordance becomes a pattern, it wants its own sheet row.",
  ],

  knownGaps: [
    "Scroll binding is CLOSED (2026-09-04) and this row stays as the record of what it cost. isVisible is still caller-owned — the component's half is the two states and the opacity transition — but the wiring is no longer every caller's to write: `useScrollEdges` answers where a container sits between its ends on both axes, and `useIsStuck` answers whether a pinned bar has parked. Both were deferred here until a second consumer existed; the portal wrote six and handed back two hooks. Two traps came with them and are pinned by tests: content appended to an already-full list resizes NOTHING, so a ResizeObserver alone never fires and the far fade stays hidden over scrollable content; and an RTL container scrolls to a negative scrollLeft, where taking the magnitude is necessary and still wrong on its own — it gives the distance from the INLINE start, and these edges are physical.",
    "Mask mode is CLOSED (2026-09-04) as `fadeMask`, a style helper rather than a prop — which is what this row always said it would have to be. A mask applies to the element being masked, so it lands on the CALLER'S scrolling container and there is no drop-in span form. It exists for the grounds the painted ramp cannot serve: a brand-scoped surface whose fill is a project token rather than one of the four --ui-bg-* roles, and a canvas whose ground is document-defined. The trade is real and unchanged, which is why the painted band stays the default: a mask cuts every child that overlaps the band, forces a compositing layer, and cannot be transitioned as cheaply as opacity. Measured trap: the prefixed and standard mask-composite are one property with two keyword sets, so writing the standard one first lets the legacy spelling win in Chromium — a fallback quietly in charge of a browser that supports the modern property.",
    "Physical sides, so a left fade does not become a right fade in RTL. The band tracks the container's box like Sheet's side prop does, and the horizontal-overflow compositions the sheet draws are direction-neutral chip rows — but a consumer mirroring a layout in RTL flips the side themselves. start/end aliases are a conscious non-goal until an RTL consumer exists (CONVENTIONS §10 records the naming rule this trades against).",
    "No geometry spec (design/paper/specs/) exists for this item, deliberately — same decision as DotPattern: the geometry laws measure container/child insets from world coordinates, and an edge-pinned band is exactly the shape they cannot express (its off-edge inset is the container's height minus the depth, not a declared padding). The sheet's numbers — depth 16/32/64, full cross-axis span, flush to the pinned edge, the anatomy card's 24/12px action-slot inset — are asserted directly in fade.browser.test.tsx instead.",
    "The band needs a positioned ancestor, like every absolute layer: inside a static container it resolves against some ancestor and paints somewhere else. The browser test pins the intended composition; the type cannot stop a static container.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2WCF-0",
} as const;

export type FadeDoc = typeof fadeDoc;
