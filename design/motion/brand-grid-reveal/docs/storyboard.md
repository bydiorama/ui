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

Edit `source/timeline.js`; run `node design/motion/brand-grid-reveal/scripts/sync-timeline.mjs`;
run `validate.mjs` before `render.mjs`. The HTML is self-contained with embedded
assets. Reduced motion displays the initial finished screen with motion skipped.

## Revision 7 — generated-code widget and concentric card corners

Paper card wells now use 15px 15px 0 0 inside a 16px shell with a 1px border.
Both Paper and the film clip contents to the parent. During construction the
film’s inner content clip is max(0, animated outer radius − 1px), so differing
child cue times cannot paint over the shell border. Shader paint inherits
all four parent corners separately.

The editable Paper widget is at (40,40), 448 × 304: 40px header, 222px code
viewport, 40px status footer, inside a 1px border. Paper Mono Regular at 13/22px
for code; 11–12px for chrome. Code rows begin at .3s with 190ms stagger;
characters fade over 140ms with 6ms offsets. The viewport has local top/bottom
faders, and scrolls 90px between 1.8 and 2.75s. The twelve lines contain the
actual surface/accent colors, 16/1/15px corner geometry, 320/250ms trace/paint,
390ms corner motion and smooth-out curve. The widget enters at .1s, completes
by 2.67s, holds, then fades out at 5.8–6.15s. Loop remains 9.5s.

## Revision 8 — hand-refined widget, 55-line build stream

Synced the user's Paper refinements: 11px Paper Mono, file path
`diorama / UI / build.ts`, initial Tokens heading, #EDE8E4 code surface,
and #EDE5E2-tinted 20px/32px top/bottom faders. Footer reads Generating...
with a restrained 1.4s shimmer clipped only to those glyphs while code is
being generated; becomes Generated when complete.

55 lines populate in six blocks: Tokens .30s, Layout 1.15s, Components 2s,
Motion 2.95s, Metrics 3.95s, Render 4.85s. Rows stagger by 35ms; glyphs fade
with 2ms offsets over 120ms. Scroll follows each section over 420ms, leaving
brief reading holds. Heading follows the active section. Last block completes
by 5.35s; the widget exits at 5.8–6.15s. Duration remains 9.5s.

Code includes demo geometry, tokens, the real Button SOFT_RADIUS mapping,
concentric clipping, exact reveal timings, metric values and deterministic
frame seeking. `widget-code.txt` holds the complete readable source, also
updated in the editable Paper text layer.

## Revision 9 — widget placement

Widget follows the updated Paper anchor: top 32px, right 32px on the
1600 × 1200 stage (x=1120, y=32), retaining its 448 × 304 dimensions.
Timing and code content unchanged.

## Alternative — dense code stream

Separate preview: brand-grid-reveal-dense.html. Separate renderer:
render-dense.mjs. Regenerate both with build-dense-variant.py.

Widget body is 6.5px Paper Mono on 9px lines. Continuous 220 lines/sec scroll
keeps approximately 25 lines in view, each for ~112ms; there are no section
reading holds or a static completed-code state. Header/footer remain 11px.
The stream draws from actual component and animation sources, with a 2400-line
buffer and 28 virtual rows. Widget placement, entry/exit and the 9.5s film
remain unchanged. All alternative frames/reports/video have distinct filenames.

### Dense alternative — typography correction

Restore the approved 11px Paper Mono, 22px line height, normal tracking and
20px horizontal code inset. Keep the 2400-line buffer and 220 lines/sec stream.
Only the alternative preview/video changes; the original version is preserved.
