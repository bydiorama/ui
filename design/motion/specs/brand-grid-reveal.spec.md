# Brand dashboard — procedural grid reveal, revision 2

Source: https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-2-0/43-0

## Brief

Loop under 30 seconds. Dots connect into a procedural skeleton and resolve
the supplied UI. Revision feedback: remove the doubled construction grid,
full-screen shimmer/scan and falling Matrix-style particles; give each element
precise local timing and show subtle component interactions at the end.

## Implementation

The repo's ui-motion-media, ui-demo-page and ui-video-render workflow is used.
The first pass's generic generation runtime was replaced for this revision by
an explicit local timeline to honor the feedback. The original source DOM,
images and font are preserved; each visual primitive is measured once at 1×
and placed in a compositing layer. The final layer retains text properties,
original SVGs, rotation, borders, radii, images and shadows. The application
boundary clips to the original 16px corners. No Paper boards were modified.

The composition remains 1600 × 1200, screen 1280 × 784 at (160,208), header
48px, sidebar 240 × 720. The construction grid has a single stationary 16px
pitch and shared origin. Dot size and opacity never animate. Small stationary
anchors belong to individual local outlines; no other dot field is generated.
Each outline is connected to its nearest lattice center, using
`8 + round((coordinate - 8) / 16) × 16`. These short orthogonal links draw
over 140ms. Rotated artwork endpoints use the same rotation matrix as their
outline, so anchors and connections land on the actual contour.
The source artwork's dot textures remain inside the two original cards.

72 visual primitives belong to 10 groups. Each local trace has an explicit
cue and smoothstep interpolation; no noise or wall-clock randomness. Local
text/icon clips reveal only their own element. Surfaces paint in place.
The end sequence demonstrates search focus, a 3px library-card lift, then
Invite tooltip and press feedback. These are scripted presentation states,
not product navigation. See the storyboard for the exact cue table.

## Editing and reproduction

Open `design/motion/brand-grid-reveal/brand-grid-reveal.html` directly.
Pause and scrub controls appear at the bottom on hover or keyboard focus.
All assets are embedded; no server or network is required.

Edit `timeline.js`, then:

```sh
node design/motion/brand-grid-reveal/sync-timeline.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node design/motion/brand-grid-reveal/render.mjs
python3 -I registry/skills/ui-video-render/scripts/seam.py \
  design/motion/brand-grid-reveal/exports/brand-grid-reveal-light-1600x1200-60fps.mp4
pnpm verify
```

The deterministic capture adapts the skill renderer: every frame is sampled
at its exact film time, captured at 3200 × 2400, downsampled with Lanczos,
encoded H.264 CRF15 at 1600 × 1200 and 60fps. Duration: 20s / 1200 frames.
There are no wall-clock capture gaps. Exports are git-ignored.

## Verification

Eleven beat frames inspected, including construction, all interaction states,
retirement and return. Browser audit: one construction grid, zero legacy
animation overlays, 72/72 primitives fully visible and zero visible outlines
at rest. Reduced motion shows the same fully resolved state. Unencoded seam:
0.0 mean absolute difference. Final UI compared against the original DOM
within the screen rectangle: 0.281/255 mean absolute difference, reflecting
paint flattening and edge rasterization. Original imagery and embedded
Aspekta load locally. No page/resource errors.

The source Paper DotGrid shaders use static CSS dot textures in this preview;
shader rasterization is not claimed pixel-identical. Checked in Chromium;
Safari and Firefox remain untested. This is a presentation job, not a
registry/distributed-item change, so no consumer ledger entry is needed.

Final revision-2 encode: 1600 × 1200, 60fps, 1200 frames, 20.00 seconds.
Encoded seam mean absolute difference 0.131/255, below the 0.5 limit.
Final decoded frames at 5.9, 11.1 and 14.7s inspected, together with the
11-frame 2× capture contact sheet. Render report: no page/resource errors,
reduced-motion pass, exactly one construction grid and zero legacy effects.
`pnpm verify` and `git diff --check` passed. No files staged or committed.

## Revision 3 — skeletons, independent images and metric activity

This section supersedes revision-2 timings and validation results above.
The film is now 23 seconds / 1380 frames. Sidebar radius is 8px in both the
source snapshot and animated paint. Paper get_computed_styles already
returned 8px at the user's follow-up; the node screenshot was reviewed for
spacing, type, contrast, alignment, fit and repeated rows, all unchanged and
clear. No redundant Paper mutation was made.

Construction ink changes from #69635D to #B7B0A9 and contour opacity from
0.55 to 0.4. Text strokes, text links and text anchors are replaced by filled
#EDE8E3 skeleton bars sized from the actual text range. Library photos and
their frames have independent paired pivots, fixed tile geometry and 40ms
stagger. Metrics change coherently: 1.2k→1.3k with rising graph, 70→72% with
matching ring and capacity label, and 14→15 after the scripted Invite action.
The ring's original colored 30% versus numeric 70% mismatch is corrected.
These are presentation states, not real account mutations or invitations.

### Transitions.dev review

Read the current transitions-dev and transitions-polish skills and the
references below on 2026-10-23. Scope: all motion in this film, including
construction, preview controls, text, photos, numbers, graphs and tooltip.
The deterministic adapter samples the documented curves at exact film time;
it does not run independent CSS clocks during export.

| Motion | Review and implementation |
| --- | --- |
| Text loading | [14-skeleton-reveal](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/14-skeleton-reveal.md): same-slot layers, matching 400ms ease-in-out crossfade. Pulse and blur omitted deliberately to preserve the requested crisp, shimmer-free construction. |
| Number updates | [02-number-pop-in](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/02-number-pop-in.md): per-digit 500ms, 8px, 70ms stagger, 2px blur, cubic-bezier(.34,1.45,.64,1); unchanged characters stay fixed. Explicit nowrap fixes the new character spans wrapping k/% during the first QA pass. |
| Image stack | [11-avatar-group-hover](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/11-avatar-group-hover.md): independent inner pieces, 1.05 scale, 320ms smooth-out entry. Adapted to a three-image fan; 400ms smooth-out return preserves precision rather than introducing the library's strong return bounce. Total stagger 80ms. |
| Ring and line chart | [35-donut-chart](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/35-donut-chart.md): ring-sector helper adapted inline, 400ms smooth-out numeric interpolation, stable segment order. 1px gap and .5px corner fit the existing 36px ring. The sparkline uses the same data-update timing. |
| Tooltip | [17-tooltip](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/17-tooltip.md): 80ms intent delay, 150ms ease-out in, 50ms out, .98→1 scale. Replaces the previous 250/300ms translated appearance. |
| Construction | Precise contour draw, local surface paint and lattice connections are film choreography, with no matching token usage; timings retained per transitions-polish's usage-first rule. |
| Grid | Stationary, single field; no matrix, rain, or shimmer recipe. |
| Search/press | Small in-place state feedback, explicit properties, no transition-all or overshooting dismissal. |
| Reduced motion | Explicit JavaScript guard shows the original completed state, no construction, photo motion, changing data, or tooltip. |

References are used only inside this presentation under the repository's
Transitions.dev license; no reusable motion library or registry package is
published. Review deviations are deliberate, not claims of verbatim runtime
installation. `timeline.js` is the single editable timeline; the offline HTML
contains its synchronized copy.

### Revision 3 validation

`validate.mjs` verifies the 8px radius, filled text skeletons with no stroke,
three photo groups moving independently within the preview and returning
exactly, changed sparkline geometry, matching storage numbers/ring share,
nonwrapping digits at rest and mid-animation, one grid/no global effects,
pixel-identical unencoded loop endpoints, reduced-motion behavior, and no
page/resource errors. It writes a machine-readable report and 13 beat PNGs.
The first QA pass caught digit wrapping introduced by per-character spans;
explicit inline-flex/nowrap resolved it before rendering. Final representative
frames were visually inspected, including skeleton, expanded photos, graph
updates, and settled numbers. Render artifacts remain in ignored exports/.

Final revision-3 encode: 1600 × 1200, 60fps, 1380 frames, 23.00 seconds.
Encoded first/last mean absolute pixel difference: 0.112/255 (limit 0.5).
The 13-frame final capture sheet and decoded MP4 frames at 12.7, 15.2 and
17.5 seconds were inspected. Three independently expanded photos are intact;
metric changes, 8px sidebar and settled typography remain clear after encoding.
`pnpm verify`, `git diff --check` and all job validation checks passed.

## Revision 4 — faster, less linear social opening

Supersedes revision-3 film timing. User requested a shorter and less linear
first 3–4 seconds. Replaced serial construction cues with overlapping groups,
reduced dead opening from 600ms to 40ms, and changed trace/paint interpolation
to the transitions.dev smooth-out cubic (.22,1,.36,1). Trace: 320ms; paint:
250ms. Text keeps its 400ms ease-in-out skeleton crossfade. Heading and
navigation are legible around 1.2s; cards resolve together; all 72 primitives
are fully visible by 3.2s (checked). Later photo/metric interactions retain
all their durations, distances and easings, shifted 5.5 seconds earlier.
New total: 17.5s / 1050 frames at 60fps. No global effects added.

Validation now checks first-second progress and complete UI at 3.2s in
addition to the retained geometry, imagery, metric, reduced-motion and seam
checks. Opening frames at 0.3, 0.7, 1.2, 1.6, 2.2 and 3.2s are captured for
visual review; the reviewed 1.2/2.2s frames show the overlapping construction.

Revision-4 final encode verified: 1600 × 1200, 60fps, 1050 frames, 17.50s;
seam mean absolute difference 0.102/255 (limit 0.5). Decoded opening frames
at .7, 1.6 and 3.2s inspected: staggered skeletons, overlapping card resolution,
then complete UI. All browser validation checks and `pnpm verify` passed.

## Revision 5 — compact stack and continuous 9.5-second pacing

Supersedes prior timing and photo transforms. Read the current Paper 66-0
comparison and used the tighter left-hand stack: back-left (71.059,46.457)
at -2.12°, back-right (110.491,46.872) at 2.82°, front (83,58) unrotated.
Updated the embedded source and JSX snapshot together. Photo action travel
is now (-8,-3), (8,-4), (0,5) px at 1.02 scale, 250ms entry, 40ms stagger,
and 320ms return. The three images retain independent frame/image pivots.

Opening choreography is retained. Search acts at 2.85s, photos at 3.1s,
views at 4.1s, storage at 4.55s, invitation/member action at 5–5.25s.
Local retirement starts at 6.6s; the opening grid returns by approximately
8.6s. Total 9.5s / 570 frames. There are no long pauses between interactions.
The storyboard contains the current complete sequence.

Browser validation passes geometry, compact photo spread and exact return,
metric/graph agreement, text skeletons, nonwrapping digits, single grid,
reduced motion, page/resource checks and pixel-identical loop endpoints.

Final revision-5 encode: 1600 × 1200, 60fps, 570 frames, 9.50 seconds.
Encoded seam mean absolute pixel difference is 0.121/255 (limit 0.5).
Decoded frames at 2.8, 3.6 and 6.2s and the complete beat contact sheet were
visually reviewed. Compact overlap remains clear during the photo movement;
settled metrics read 1.3k, 72%, and 15. `pnpm verify`, job validation and
`git diff --check` pass. Outputs remain in ignored exports/.


## Revision 6 — clean skeleton handoff, progressive corners, Paper expansion

Retains the 9.5s timeline. Removes skeleton/glyph crossfade overlap: a filled
placeholder fades over 120ms, then after 20ms the text enters over 200ms.
No placeholder ever overlays visible glyphs. Removes invitation tooltip and
button halo; retains press feedback and member-count change.

Frame styling read from the current Paper app: 1px solid #ECE7E3 and
0px 2px 8px #0000000A. Shadow renders outside the frame; a synchronized
border overlay keeps the top hairline visible above the header.

Photo expansion destination read from Paper’s wider library card: left
(37,58), -8°; right (147,36), 7°; front (83,58), 0°. Measure the destinations
using the source DOM, then interpolate center translation and rotation as
rigid image/frame groups. 420ms ease-in-out, 40ms stagger; front lifts 3px
and lands in place. Hold the expanded arrangement through the metric actions.

Every painted rounded rectangle and its outline begins at zero radius and
interpolates its measured final corners over 390ms starting 180ms after its
local cue. Shell content clipping and the frame edge follow the shell radius.

Validator additionally checks no skeleton/text overlap across reveal samples,
square initial corners and exact final radii, frame border/shadow, absence of
the tooltip, and photo destination geometry within 0.05px. Existing metric,
resource, reduced-motion and exact browser seam checks all pass.

Final revision-6 export: 1600 × 1200, 60fps, 570 frames, 9.50s. Encoded seam
mean absolute difference 0.125/255 (limit 0.5). Reviewed the 11-beat contact
sheet and decoded MP4 frames at 1.6, 3.6 and 6.2 seconds: skeleton-only slots,
expanded photo destination, and clean final metrics. Job validation,
`pnpm verify`, and `git diff --check` passed.

## Revision 7 — Paper widget with code faders

Updated the linked card pair in Paper: outer radius 16px, 1px border, inner
well top corners 15px, lower corners square, outer overflow clipped. The
film mirrors this and clips all inner content with a radius derived from the
animated outer radius minus the border. This also prevents staggered inner
surfaces from crossing the outer corners. Corrected inherited shader corner
geometry to preserve independent corners rather than forcing four equal radii.

Reworked the linked widget directly in Paper with separately editable header,
code viewport, gradient faders, and footer. Stored its export in
widget-source.jsx. Design review: consistent inset rhythm, readable Paper Mono,
quiet warm-neutral contrast, aligned number column, no unintended overflow.
Paper’s viewport deliberately clips and fades the scrolling code.

Film widget uses the same 448 × 304 geometry at (40,40). A local alpha mask
fades scrolling code at viewport boundaries; each generated character resolves
independently. The visible code represents values used by this animation,
not unrelated sample code. The widget exits before component retirement and
is hidden in reduced-motion mode. The current storyboard records its timing.

Paper Mono Regular is embedded for offline rendering, obtained from the
[official Paper Mono repository](https://github.com/paper-design/paper-mono).
SIL OFL retained in Paper-Mono-OFL.txt. Font is confined to this requested
presentation artifact; no distributable design-system item or manifest changed.

Validation covers loaded Paper Mono, local fader mask, twelve completed lines,
widget visibility/exit, and all previous geometry, text, metric and loop checks.

Final revision-7 export: 1600 × 1200, 60fps, 570 frames, 9.50s. Encoded seam
mean absolute difference 0.137/255 (limit 0.5). Reviewed the 11-beat contact
sheet and decoded frames at 1.6, 3.6, 6.2s. Paper edits and film show aligned
card corners; widget code is legible, locally faded, and clears before the
final screen. Visual QA caught small controls incorrectly inheriting zero
radius; fixed inheritance to apply only from a rounded parent and re-rendered.
Added explicit checks for 15px upper and 0px lower card-well corners.
Job validation, `pnpm verify`, and `git diff --check` passed.

## Revision 8 — user refinements and comment review

Read the full current Paper artboard JSX/styles and the page's comments.
One open thread, pinned to the footer status, requested “add shimmer”. Applied
this only to Generating... with a deterministic text-clipped gradient; no
screen-wide effect. Synced 11px text, new title and section label, viewport
background and tinted faders. Preserved hand-refined Paper styles.

User then requested more substantive generated code. Expanded to 55 lines
and six timed sections. Content references the demo's actual geometry and
motion values and the library Button SOFT_RADIUS mapping read directly from
registry/ui/button/button.tsx. These are presentation excerpts/configuration,
not a replacement executable module. Updated Paper's code text/count and the
clean JSX export. Design review: same alignment, type and inset geometry;
viewport intentionally clips the long source through its local faders.

Validation checks 55 populated lines, section progression, precise 11px font
and viewport color, both faders, shimmer during generation and plain status
after completion, in addition to retained component geometry and loop tests.

Final revision-8 encode: 1600 × 1200, 60fps, 570 frames, 9.50s. Reviewed
11-beat contact sheet and decoded 1.6/3.6/5.6s frames for scrolling sections,
refined colors/type, intact cards and completed 55-line count. Browser tests,
`pnpm verify` and `git diff --check` pass. The addressed shimmer comment was
marked resolved after rendering and visual verification.

## Revision 9 — widget placement

Read the updated widget styles from Paper: right 32px, top 32px, 448 × 304.
Synced the film to the top-right anchor; reviewed the 2.8s frame to confirm
placement and clearance from the main heading. Retained all choreography.

Revision-9 validation: browser checks, `pnpm verify`, and `git diff --check`
passed. Reviewed the updated contact sheet. Final video remains 1600 × 1200,
60fps, 570 frames, 9.50s; encoded loop seam verified below the 0.5 threshold.
