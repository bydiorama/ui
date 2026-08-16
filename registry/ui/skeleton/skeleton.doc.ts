/**
 * Typed documentation for Skeleton.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const skeletonDoc = {
  name: "Skeleton",
  status: "stable",
  summary:
    "A placeholder standing in for content that has not arrived. One element, no variants, sized entirely from the outside with className — the same shape as shadcn/ui's Skeleton, so a consumer's intuition transfers. Defaults to a full-width bar at body height, pulses under motion-safe, and is aria-hidden: the announcement belongs on the region that is loading, as aria-busy, which only the caller can place.",

  anatomy: [
    {
      part: "bar",
      slot: "skeleton",
      notes:
        "The only node. Owns the fill, the radius, the pulse, className and the ref. Its SIZE is the caller's — `h-4 w-full` is a default to be displaced, not a specification.",
    },
  ],

  composition: `
Skeleton
└─ (no props of its own — className sizes it, native div props pass through)

<div aria-busy={isLoading}>
  {isLoading
    ? <Skeleton className="h-8 w-48" />
    : <h1>{title}</h1>}
</div>

// A shape is composed at the call site rather than configured:
<div className="flex items-center gap-md">
  <Skeleton className="size-10 rounded-full" />
  <div className="flex-1 space-y-xs">
    <Skeleton className="h-4 w-2/5" />
    <Skeleton className="h-4 w-4/5" />
  </div>
</div>
  `.trim(),

  props: {
    className: {
      type: "string",
      notes:
        "The whole API. Merges last, so every default is displaceable: `size-10 rounded-full` is an avatar, `h-2.5 w-3/5` is Table's own bar, `h-48` is a media block. This is deliberate rather than minimal-for-its-own-sake — a `variant` or `lines` prop would re-describe the layout the skeleton is standing in for, and the layout is already written next to it.",
    },
  },

  do: [
    "Size it with className at the call site — it should be the shape of the thing that is loading.",
    "Put aria-busy on the REGION being replaced, so assistive tech is told once rather than per placeholder.",
    "Match the real content's height, so nothing jumps when the data arrives.",
    "Compose several to make a shape; that is what the component is for.",
  ],

  dont: [
    "Do not render one for every field of a large form — a few bars standing for the shape read better than a faithful wireframe, and 40 pulsing boxes is noise.",
    "Do not put text or controls inside it. It is a rectangle; anything real inside it is hidden from assistive tech by the aria-hidden it carries.",
    "Do not use it as an empty state — that is EmptyState, and the two must not look alike. A skeleton says 'coming'; an empty slot says 'nothing here'.",
    "Do not re-invent it for a dense surface — pass a height. Table's loading body composes this at h-2.5 rather than drawing its own bar, which is what stopped the library having two placeholder treatments.",
  ],

  a11y: {
    role: "none — aria-hidden div. It carries no semantics on purpose: a screen reader announcing a dozen empty boxes says nothing anyone can act on.",
    name: "None, and it must not have one. The loading state is announced by aria-busy on the region the skeletons replace, which is the only place that knows what is loading and when it stops.",
    keyboard: [],
    focus:
      "Never focusable, and never replacing a focused element without the caller moving focus deliberately (§10). A skeleton swapped in under the user's focus point is how focus falls to <body>.",
    contrastPairs: [
      {
        fg: "--ui-bg-sunken",
        bg: "--ui-bg-base",
        floor: "decorative",
        why: "The bar against the page — the same pair AspectRatio declares for the same fill. Decorative rather than a boundary: nothing depends on identifying a skeleton's edge, and it is replaced by real content within a second or so. Declared rather than omitted so the number stays visible, because a placeholder too quiet to see is a page that looks broken rather than busy, and that is a design question rather than a code one.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the bar — the only node, and not a form control, so the §5 default applies.",
    className: "Lands on the bar and merges last, which is the whole API.",
    rest: "Native div props go to the bar. `aria-hidden` is set BEFORE the spread rather than after — the one deliberate exception to §5's contract-props-win rule, so a caller with a single skeleton standing for a single named thing can label it instead. Everything else follows §5.",
  },

  motion:
    "A `motion-safe:animate-pulse` keyframe, and the only thing the component animates. The guard is required rather than stylistic: a keyframe carries its own timing, so the token layer's duration collapse cannot reach it (ADR 0018) — without `motion-safe:` this would pulse straight through prefers-reduced-motion. It settles to a plain recessed rectangle there, and the shape carries the meaning on its own. The TIMING is taken back off Tailwind: `animate-pulse` bakes 2s and its own curve into the class NAME, which is a hard-coded duration in the one place check:motion cannot look and no brand can reach, so `[animation-duration:var(--ui-duration-loop)]` and `[animation-timing-function:var(--ui-ease-default)]` override it while the keyframes stay Tailwind's. --ui-duration-loop exists for this: it is the only duration token describing a REPEAT rather than a journey, which is why it sits an order of magnitude above the rest. motion.browser.test.tsx asserts the override actually wins the cascade — an arbitrary property losing to the shorthand would leave the token decorative and every gate still green.",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "THERE IS NO SHEET. design/paper/README.md lists Skeleton among the components still to be drawn, so every value below is derived rather than transcribed. Everything in this list is a question, not a defect.",
    "RESOLVED as a token rather than an exception: --ui-duration-loop (2000ms) now carries the pulse period, and --ui-ease-default its curve, both applied over animate-pulse so the keyframes stay Tailwind's and the timing becomes ours. 2000ms is Tailwind's number kept deliberately — it is a reasonable loading rhythm and nothing had measured an alternative — so the VALUE is still a question for the sheet even though its home is no longer. What changed is that it is now reachable: check:motion can see it, a brand can move it, and motion.browser.test.tsx asserts the pulse runs at it.",
    "The pulse animates OPACITY, so the bar fades toward the page rather than brightening toward the ink. On a dark scheme that reads as the bar receding rather than shimmering. A left-to-right sheen is the common alternative and is a different decision, not a tweak.",
    "The default height (h-4, 16px) and radius (rounded-sm) are derived from Table's internal skeleton bar, which is drawn at h-2.5 (10px) inside a dense row. Two heights for one idea is exactly the kind of divergence the library records rather than hides; which is the system's placeholder height is a question for the sheet.",
    "No contrast floor is drawn for a placeholder. --ui-bg-sunken on --ui-bg-base measures 1.22:1 light and 1.44:1 dark, which is quiet enough that a page of skeletons can read as blank rather than loading. Whether a placeholder should be louder than a well is a design decision this component inherited by reusing the well.",
  ],

  knownGaps: [
    "Table composes this component for its loading body, passing h-2.5 for its denser row. It did not at first: it drew its own static bars, and the reason recorded was that a pulsing bar cannot have a reproducible visual baseline. That reason no longer holds — the visual harness pauses infinite animations at their first keyframe rather than banning them — so the two placeholder treatments are now one. The remaining difference is height, which is a real difference: a table row is not a line of body text.",
    "There is no `lines` or `variant` prop, so a paragraph of three bars is three elements at the call site. That is the intended trade — see props.className — but it does mean a repeated pattern has no name yet. If one earns a name it belongs in blocks/, composed from this, not as a prop on it.",
    "aria-hidden is a default rather than an invariant, so a caller can remove it. Nothing stops them announcing a wall of placeholders; the doc is the only thing saying not to.",
    "The pulse is not synchronised across instances. Several skeletons mounted at different times breathe out of phase, which is visible in a list that streams in. CSS animations start on element creation and there is no shared clock without JavaScript.",
    "The default width is `w-full`, so it needs a parent with a resolved width. Inside a shrink-to-fit parent — a bare flex item, an inline-block, a Storybook Docs cell — `w-full` is circular and an empty div collapses to nothing, which is the same 0px box the default height exists to prevent, arriving down the other axis. The browser test mounts into a fixed 200px container for exactly this reason. If a skeleton renders at zero width, look at its parent before looking at the component; `w-32` or a sized parent both fix it.",
    "The visual baseline captures the pulse PAUSED at its first keyframe. That is deliberate and is what let Skeleton have a baseline at all — `stable()` in the visual harness used to await `animation.finished`, which never resolves for a loop, so any looping frame hung the suite. What a baseline can therefore prove about this component is its fill, radius and rhythm, never its motion; `skeleton.browser.test.tsx` covers that instead.",
  ],

  /**
   * No Paper URL: the sheet does not exist yet (see needsDesign). Explicitly
   * null rather than omitted, so it reads as "not drawn" instead of "someone
   * forgot to link it".
   */
  design: null,
} as const;

export type SkeletonDoc = typeof skeletonDoc;
