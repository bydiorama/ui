/** The optional renderer; Network owns interaction and the accessible fallback. */
export const networkCanvasDoc = {
  name: "NetworkCanvas",
  status: "experimental",
  lead: "Paints a larger network on a canvas while Network keeps the controls and accessible table.",
  summary: "Pass NetworkCanvas to Network's renderer slot. This optional paint surface is not a standalone graph viewer.",
  anatomy: [{ part: "canvas", slot: null, notes: "Paint-only canvas. Network owns hit testing, focus, announcements and the table." }],
  composition: "Network → renderer={NetworkCanvas}",
  props: {
    nodes: { type: "NetworkRendererProps['nodes']", notes: "Positioned nodes supplied by Network." },
    edges: { type: "NetworkRendererProps['edges']", notes: "Edge paths supplied by Network." },
    view: { type: "NetworkRendererProps['view']", notes: "The current pan and scale." },
    size: { type: "NetworkRendererProps['size']", notes: "The measured drawing surface." },
  },
  do: ["Use it through Network's renderer slot."],
  dont: ["Do not use the canvas as a standalone interactive surface."],
  a11y: {
    role: "Decorative renderer inside Network; the parent owns semantics.",
    keyboard: [{ key: "Inherited", does: "Network retains its keyboard controls and adjacency table." }],
  },
  knownGaps: ["Node glyphs and edge labels are omitted at canvas density; Network's table and announcer retain that information."],
  motion: "The parent supplies viewport changes. The renderer does not animate independently.",
} as const;
