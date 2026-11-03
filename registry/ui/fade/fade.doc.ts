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
    "An edge fade — the gradient that dissolves overflowing content into the ground it sits on, signalling continuation: under a pinned header, above a composer bar, at the cut of a truncated preview. One aria-hidden span, absolutely pinned to one edge of the caller's clipping container, painting a PERCEPTUAL ramp in the container's own bg role: a Gaussian penumbra sampled at seventeen stops (no corner at either end for the eye to read as a stripe), with a dark-scheme table that leaves the same perceptual fraction of ink visible as light does. Bound to a scroll container it eases out over the last band-depth of scroll instead of switching off, and keeps off a classic scrollbar. No new colour tokens: the ramp is an existing bg role, its depth the spacing scale (24/48/96). Elsewhere this pattern is a \"scroll scrim\" (GitLab) or \"ScrollShadow\" (HeroUI); here --ui-scrim already names the modal veil, so the fade keeps its own name.",

  anatomy: [
    {
      part: "band",
      slot: "fade",
      notes:
        "The only node — an aria-hidden span, absolutely pinned to one edge, spanning the cross axis (less a classic scrollbar, when bound to a scroller), pointer-events none. It paints the ramp and nothing else. The CONTAINER is the caller's: position relative, the clipping (overflow-clip or a max-height), the ground the ramp ends on, and the route to the full content all belong there. An action slot (Show more, a 32px chrome control) is caller-composed and sits past the solid end of the ramp, never mid-band.",
    },
  ],

  composition: `
Fade
└─ (no children — side, size, ground shape the band; the caller owns the container)

// A scrolling region — bind the band to the scroller and it does the rest:
// full while content runs past the edge, easing out over the last 48px,
// inset off a classic scrollbar, hidden until measured (SSR-safe):
const [node, setNode] = useState<HTMLDivElement | null>(null);
<div className="relative overflow-clip">
  <div ref={setNode} className="max-h-60 overflow-y-auto">…rows…</div>
  <Fade ground="elevated" scrollContainer={node} />
</div>

// Truncated text with a route to the rest (sheet § Patterns, Truncated text):
<div className="relative flex flex-col rounded-lg bg-elevated">
  <div className="relative max-h-32 overflow-clip px-lg pt-lg">
    <p className="text-body-md">…long message…</p>
    <Fade ground="elevated" size="sm" />
  </div>
  <button type="button" className="…">Show more</button>
</div>

// Pinned header — DON'T hand-roll this one: Header ships it as the affix
// variant, with ground="affix" so the ramp starts at the bar's own 90%:
<Header affix={{ fade: true }}>…</Header>

// Horizontal overflow — a chip row continuing past the clip:
<div className="relative overflow-clip">
  <div ref={setNode} className="flex gap-sm overflow-x-auto">…chips…</div>
  <Fade side="right" ground="surface" size="sm" scrollContainer={node} />
</div>

// Unknown or brand-defined ground — mask the scroller instead of painting:
<div ref={attach} style={fadeMask({ sides: useScrollEdges(node) })} className="overflow-auto">…</div>
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
        "Ramp depth on the spacing scale: sm 24px (space-xl) for dense chrome, md 48px (space-3xl) as the default, lg 96px (1.5 × space-4xl, the top of the scale and half again) for display-scale content and document previews — a three-line dissolve of body-md. One step deeper than the linear ramp's 16/32/64 because the Gaussian spends its first quarter under 9% alpha: a 48px eased ramp covers about what a 32px linear one did, and dissolves where that one ghosted (knownGaps, Ramp research). A caller who needs a depth sized to a type role sets --ui-fade-band-depth.",
    },
    ground: {
      type: '"base" | "surface" | "elevated" | "sunken" | "affix"',
      default: '"surface"',
      notes:
        "The bg role the ramp ends on — the CONTAINER's own ground, so every stop is one role at a different alpha. A fade painted in the wrong ground reads as a smudge (sheet § Grounds). `affix` is the translucent pinned-bar ground: the ramp scales by its 90%, so a band hung under that bar starts at the bar's own alpha and the two meet without a seam (Header uses it). Media is deliberately absent: text-over-image is ImageOverlay's contract; unknown or mixed grounds want fadeMask, not a painted colour.",
    },
    isVisible: {
      type: "boolean",
      default: "true",
      notes:
        "Whether the band shows at all — opacity over --ui-duration-fast, never a ramp resize, which reads as the content moving. The band keeps its box either way, so toggling never reflows. On its own it is the right control for a non-scroll state (a bar parked or not, a preview truncated or not). With scrollContainer it is a gate on top of the scroll-linked strength: off means off.",
    },
    scrollContainer: {
      type: "HTMLElement | null",
      notes:
        "The scroller this band belongs to — pass the element (hold it in state from a ref callback). The band then binds itself: its strength follows how much content runs past its edge, easing (smoothstep) from full to nothing over the last band-depth of scroll, so arriving at the end reveals the final lines as they arrive rather than in a 120ms pop at the last pixel. A band that is not inside the scroller is inset by the scroller's classic scrollbar on the cross axis — right (left in RTL) for a vertical band, bottom for a horizontal one — so it never veils the track or its arrows; overlay scrollbars measure zero and change nothing. Renders hidden until the first measure, server-side too. Strength is written to the band's own style, never React state, so scrolling re-renders nothing. Replaces wiring useScrollEdges into isVisible for the common case; the hook stays for callers that need the booleans.",
    },
    className: {
      type: "string",
      notes:
        "Lands on the band and merges last. The shipped use is placement nudges — `top-full` to hang a top fade below a pinned header, `top-auto bottom-full` to hang a bottom fade above a sticky region — and stacking context fixes. Cross-axis insets are the component's while bound to a scroller.",
    },
    style: {
      type: "CSSProperties",
      notes:
        "Shallow-merged over the band's own (ADR 0014). The sanctioned override is --ui-fade-band-depth, which both the paint and the scroll-linked strength follow. The scroll-linked strength (--ui-fade-band-strength) is contract and cannot be overridden.",
    },
  },

  do: [
    "Give the container position: relative, the clipping (overflow-clip or a max-height), and the ground the ramp names — the band paints and nothing else.",
    "Pair every fade with a reachable route to the full content: Show more, an expand control, or the scroll itself. The fade signals; the paired control discloses.",
    "Bind a scrolling region with scrollContainer rather than wiring a boolean — the eased exit and the scrollbar inset come with it.",
    "Under a translucent pinned bar, paint in ground=\"affix\" so the ramp starts at the bar's alpha.",
    "Put the action slot past the solid end of the ramp (the anatomy card's chevron sits 12px off the edge), never mid-band.",
  ],

  dont: [
    "Do not put anything interactive inside the band — mid-ramp ground fails every contrast floor by design, and the layer must not steal clicks (it is pointer-events none so content under it stays clickable).",
    "Do not paint a fade over media or mixed grounds — no overlay colour is right there. Text over an image is ImageOverlay's contract; a ground-agnostic fade is fadeMask.",
    "Do not use it as the only affordance — a fade with no route to the content is a defect, not a style (sheet § Behaviour, Affordance).",
    "Do not animate the ramp's depth to show or hide it — that reads as the content moving. Visibility is opacity.",
    "Do not hand-roll a two-stop ramp beside it (`bg-linear-to-t from-elevated to-transparent`). Its linear corners are the stripe this component was rebuilt to remove, and it cannot carry the dark correction — ChatWidget's was one, and it covered the last message even at the end of the scroll.",
  ],

  a11y: {
    role: "none — an aria-hidden span. The attribute sits AFTER the prop spread, so it is contract rather than default: paint never names anything (same reasoning as DotPattern).",
    name: "None, ever.",
    keyboard: [],
    focus:
      "Never focusable and never a pointer target (pointer-events: none). Content under the band stays in the accessibility tree unclamped, stays selectable, and stays clickable — the band veils paint, not semantics. The conformance story for the faded region is the un-faded route (Show more, expand, scroll), which is a caller obligation the do/don't records. In forced-colors mode the painted ramp computes to none (CSS Color Adjust: a non-url background-image is reverted), so the content simply shows — the safe failure.",
    contrastPairs: [
      {
        fg: "--ui-text-secondary",
        bg: "--ui-bg-surface",
        floor: "decorative",
        why: "Text mid-ramp sits under its own ground at ~40-48% alpha — below every floor, by design. The band is declared decorative like DotPattern's grain: nothing may depend on reading through it, which is why no interactive target may live inside it and why the un-faded route is mandatory. The dark-scheme table exists precisely because the same alpha left light-on-dark text MORE legible mid-ramp (3.78:1 against 2.95:1 at 50%) — a longer, dirtier trail, not a conformance gain.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the span — the only node, not a form control, so the §5 default applies.",
    className:
      "Lands on the span and merges last: placement utilities (top-full, bottom-full) displace the side's default pin. Bound to a scroller, the cross-axis inset is written to the band's style and wins over a className inset.",
    rest: "Native span props go to the span (a caller's data-slot replaces \"fade\" — ChatWidget's band keeps chat-widget-fade). `children` is typed out — the band is paint. `aria-hidden` is set after the spread and cannot be overridden.",
  },

  motion:
    "One transition: opacity over --ui-duration-fast with --ui-ease-out — when isVisible toggles, and when a bound scroller moves the strength. The scroll-linked strength rides the same transition, which reads as the veil settling a beat after a fling stops rather than tracking every frame. 1ms under prefers-reduced-motion, handled at the token layer. Never the ramp's size. The static cue accompanying the motion (CONVENTIONS §8) is the content edge itself: at the flush edge there is visibly nothing more to scroll.",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Horizontal fades are drawn at sm-to-md over chip rows; the eased lg (96px) has no horizontal row on the sheet. A carousel or kanban edge at that depth is a sheet row before it is a call site.",
    "The sheet's action-slot chevron control (32px, bg-elevated, radius-md, ChevronDownSmall) is the same chrome control Header, Sheet and Calendar draw; Fade composes it from @/lib/chrome-control at call sites and does not own it. If a dedicated \"expand\" affordance becomes a pattern, it wants its own sheet row.",
  ],

  knownGaps: [
    "Ramp research (2026-11-02), the record of why the ramp is what it is. The two-stop linear ramp was rendered against the shipped copy beside smoothstep, smootherstep, sine, Larsen's scrim and a Gaussian at 32-96px, light and dark, over a document preview, a list, a chat column and a pinned header. Findings: (1) a linear ramp's corners read as a stripe with a start line, and at 32px over body-md it covered 1.5 lines — one line uniformly ghosted rather than a dissolve; (2) the scrim curve leaves the last line legible right at the edge, a hard cut of its own; (3) the Gaussian penumbra (mean 0.55, sigma 0.22) is the smoothest, and depth matters more than curve: three lines dissolve at ~96px, two at ~64; (4) at equal alpha light ink on a dark ground keeps more perceptual lightness (53% vs 46% at 0.5), so dark needed its own table — measured across five role pairs, the correction is the polarity's (±0.015). @/lib/fade-ramp carries the tables; its test re-derives them.",
    "Progressive blur under a translucent bar — measured and DECLINED (2026-11-02). Continuing the bar's 8px backdrop blur down the band would remove the last difference between bar and band (blurred vs sharp at 10% visibility), but: an element with backdrop-filter is a backdrop root, so blur layers inside Header see nothing until Header's own blur moves to a child layer (verified in Chromium); any ancestor with opacity < 1, a filter or a mask silently disables it, including Fade's own opacity transition; and WebKit cannot be verified here — Playwright's WebKit drops backdrop-filter from screenshots headless and headed. The seam that WAS visible was the alpha step, and ground=\"affix\" closes it. Revisit if a consumer's bar uses a heavier blur than 8px.",
    "fadeMask is not reverted in forced-colors mode — mask-image is not a forced property — so a masked scroller keeps its faded edge for users who forced colours for contrast. It is an inline style helper, so it cannot carry a media query; the painted Fade has no such gap (its background-image is reverted). Use the painted band wherever the ground is a role.",
    "Overlay scrollbars (macOS default) measure zero width, so a bound band still passes over an overlay thumb while it is shown. There is no API that reports an overlay bar's geometry; the classic-bar inset is what can be done. The contract test stubs the client box because headless Chromium hides scrollbars outright.",
    "Mask mode, as `fadeMask`, is a style helper rather than a prop. A mask applies to the element being masked, so it lands on the CALLER'S scrolling container. It exists for grounds the painted ramp cannot serve: a brand-scoped surface whose fill is a project token, a document-defined canvas. The trade is real, which is why the painted band stays the default: a mask cuts every child that overlaps the band — the container's own scrollbar included — forces a compositing layer, and cannot be transitioned as cheaply as opacity. Measured trap: the prefixed and standard mask-composite are one property with two keyword sets, so writing the standard one first lets the legacy spelling win in Chromium.",
    "Physical sides, so a left fade does not become a right fade in RTL. The band tracks the container's box like Sheet's side prop does; a consumer mirroring a layout in RTL flips the side themselves. start/end aliases are a conscious non-goal until an RTL consumer exists. (The scrollbar inset IS direction-aware: it reads the scroller's client box, which puts an RTL scrollbar on the left.)",
    "No geometry spec (design/paper/specs/) exists for this item, deliberately — same decision as DotPattern: the geometry laws measure container/child insets, and an edge-pinned band is the shape they cannot express. The sheet's numbers — depth 24/48/96, full cross-axis span, flush to the pinned edge — are asserted directly in fade.browser.test.tsx instead.",
    "The band needs a positioned ancestor, like every absolute layer: inside a static container it resolves against some ancestor and paints somewhere else. The type cannot stop a static container.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2WCF-0",
} as const;

export type FadeDoc = typeof fadeDoc;
