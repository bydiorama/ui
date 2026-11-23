# Library showcase

A 16-second, 60fps seamless loop of `@bydiorama/ui` components, set as one
compact block on the library's dot ground. Every edge sits on a dot and every
gutter is one dot pitch. A single cursor works through the components in
order: it searches and ticks Docs, drags the Slider, flips the Switch,
switches Tabs, picks a date, changes the Select, then publishes, which shows
busy, then done, then a Toast. The direction comes from Stageshow
(benji.org/stageshow).

- [Light video](exports/videos/library-showcase-light-1600x1200-60fps.mp4)
- [Dark video](exports/videos/library-showcase-dark-1600x1200-60fps.mp4)
- [Interactive preview](previews/library-showcase.html) ·
  [dark](previews/library-showcase-dark.html). Open either directly to play
  or scrub.
- Poster stills at 12.4 s (2×, no cursor): [light](exports/stills/masters/library-showcase-published-light-3200x2400.png) · [dark](exports/stills/masters/library-showcase-published-dark-3200x2400.png)
- [Storyboard and decisions](docs/storyboard.md)

## How it is built

- **Tokens:** `scripts/build.mjs` inlines the `:root` block of
  `apps/storybook/styles/tokens.generated.css` verbatim. Light and dark is
  `color-scheme`, which is how consumers get it.
- **Fonts and icons:** Aspekta (OFL) is embedded as base64. The icons are real
  `griddy-icons` glyphs.
- **Geometry:** each component's size and spacing were taken from
  `registry/ui/*` (heights, insets, radii, type roles, state tokens, 120 ms
  ease-out feedback, 0.96 press). The page is a media prototype, not the React
  source.
- **Timing:** `source/timeline.js` is a pure function of time. `seek(t)`
  sets the whole scene, so `render-seek.mjs` films the page frame by frame,
  and the first and last frames match by construction.

`source/` holds the markup, CSS and timeline. `scripts/` has the build, the
contact-sheet tool and the stills tool. `exports/` is git-ignored.

## Reproduce

From the repository root:

```sh
node design/motion/library-showcase/scripts/build.mjs
node design/motion/library-showcase/scripts/sheet.mjs pass light   # contact sheet
for s in light dark; do
  PLAYWRIGHT_MODULE="$PWD/apps/storybook/node_modules/playwright/index.mjs" \
  PAGE=design/motion/library-showcase/previews/library-showcase$([ $s = dark ] && echo -dark).html \
  OUT=design/motion/library-showcase/exports/videos/library-showcase-$s-1600x1200-60fps.mp4 \
  node registry/skills/video-render/scripts/render-seek.mjs
done
node design/motion/library-showcase/scripts/stills.mjs
python3 -I registry/skills/video-render/scripts/seam.py design/motion/library-showcase/exports/videos/*.mp4
```
