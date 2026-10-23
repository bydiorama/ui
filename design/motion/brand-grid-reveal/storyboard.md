# Brand grid reveal — revision 6

9.5-second silent loop, 1600 × 1200 at 60fps. Sidebar radius: 8px.
Source: [Paper library stack](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-2-0/6T-0).

| Time | Cue |
| --- | --- |
| 0.04–2.8s | Overlapping procedural construction: shell, navigation, heading, cards, metrics |
| 2.85–3.45s | Search focus feedback |
| 3.1–3.6s | Compact stack expands into the wider Paper arrangement; holds until exit |
| 4.1s | Views 1.2k → 1.3k; sparkline rises |
| 4.55s | Storage 70% → 72%; ring and label follow |
| 5–5.32s | Subtle Invite press; no tooltip or halo |
| 5.25s | Members 14 → 15 |
| 6.6–8.6s | Staggered local component retirement |
| 8.6–9.5s | Static opening grid; seamless return |

One stationary 16px lattice. Quiet warm-gray contours trace over 320ms;
surfaces resolve over 250ms using transitions.dev smooth-out (.22,1,.36,1).
Text uses filled skeleton bars, which clear fully before glyphs appear.
Skeleton fade-out: 120ms; 20ms separation; text arrival: 200ms. No global shimmer,
scan or falling pixels. Group cues overlap, with 120ms text and 80ms icon offsets.

The back-left image rests at (71.059,46.457), rotated -2.12°; back-right at
(110.491,46.872), rotated 2.82°; front at (83,58), unrotated. These reproduce
the tighter Paper stack. Expansion targets back-left (37,58) at -8°, back-right (147,36) at 7°,
front (83,58) at 0°. Each photo and frame move together over 420ms, with
40ms stagger. The front lifts 3px mid-flight and settles exactly. The wider
arrangement holds until exit. The tile stays still.

All painted rounded rectangles and construction contours begin square and
round progressively from local cue +180ms to +570ms. The app frame uses
Paper’s 1px #ECE7E3 border and 0 2px 8px #0000000A shadow; its border is
painted above the contents so the header cannot obscure the top hairline.

Changed digits pop over 500ms with 8px travel, 70ms trailing-digit stagger,
and 2px local blur. Shared characters stay still. Both graphs morph over
400ms with smooth-out easing. The storage ring represents its numeric share.

Edit `timeline.js`; run `node design/motion/brand-grid-reveal/sync-timeline.mjs`;
run `validate.mjs` before `render.mjs`. The HTML is self-contained with embedded
assets. Reduced motion displays the initial finished screen with motion skipped.
