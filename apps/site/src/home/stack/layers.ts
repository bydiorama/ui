/** The seven layers of the system, bottom to top, each with the one sentence
 *  the legend shows when its row is open. */
export const layers = [
  { key: "seed", name: "Seed", summary: "What a brand supplies: page, surface, muted, two inks, a border and an accent, plus settings for type, shape and chrome. Diorama's own look is the same shape with no special case." },
  { key: "resolver", name: "Resolver", summary: "A function that turns the seed into every role a component can read, for light and for dark. Where a pair of colours falls under AA it corrects the pair and records the adjustment." },
  { key: "tokens", name: "Tokens", summary: "Named roles for colour, type, space, radius, stroke, motion and elevation. This is the one part you install as a package, because it has to be identical in every app." },
  { key: "behaviour", name: "Behaviour", summary: "Focus management, dismissal, positioning and keyboard paths come from Base UI, unstyled. Calendar and drag-and-drop reordering are written here." },
  { key: "components", name: "Components", summary: "React components written to be read, owned and changed. Each one ships with a typed doc, stories under a second brand, and tests that run in a real browser." },
  { key: "proof", name: "Proof", summary: "The claims are computed. Contrast is measured from the resolver, layout is held to the numbers on the design sheet, and every component is compared with a committed baseline in both colour schemes." },
  { key: "app", name: "Your app", summary: "One command copies a component and what it depends on into your repo. From then on the code is yours, and a lockfile tracks how far it has moved from the registry." },
] as const;
export type LayerKey = (typeof layers)[number]["key"];

/**
 * Resting geometry, in viewBox units, shared by the drawing and its engine:
 * a plate's rise once it has landed, the opening above the current plate and
 * the pitch of the plates still waiting. `HOME` is the layer the section
 * rests on without script or under reduced motion.
 */
export const REST = [0, 10, 20, 30, 40, 50, 57];
export const OPEN = 215;
export const GAP = 34;
export const HOME = 4;
/** Ink left on a waiting plate when it is drawn intact (no script, or reduced
 *  motion), by distance above the current plate. */
export const INK = [1, 0.5, 0.36, 0.26, 0.18, 0.12, 0.08];
/** How densely a waiting plate's grains are drawn, by the same distance. */
export const GRAIN = [1, 0.8, 0.5, 0.32, 0.2, 0.12, 0.08];

export const riseOf = (index: number, active: number) => index <= active ? REST[index]! : REST[active]! + OPEN + (index - active - 1) * GAP;
/** Where the ground sits, so the whole stack stays centred as it opens. */
export const baseOf = (active: number) => 345 + riseOf(layers.length - 1, active) / 2;
export const stateOf = (index: number, active: number) => index < active ? "settled" : index === active ? "active" : "ghost";
