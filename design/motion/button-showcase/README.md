# Button showcase

A 9.5-second, 60fps film based on the Paper **Article Asset Button Landscape**
composition. It builds the sheet, demonstrates press → busy → completion,
then moves through sizes and variant focus states before returning to the grid.

- [Video](exports/videos/button-showcase-light-1600x1200-60fps.mp4)
- [Interactive preview](previews/button-showcase.html)
- [Contact sheet](exports/contact-sheets/beats.png)
- [Completion still](exports/stills/masters/button-complete-3200x2400.png)
- [Variants still](exports/stills/masters/button-variants-3200x2400.png)
- [Storyboard](docs/storyboard.md)

`source/` contains the Paper export, editable timeline and CSS. `scripts/`
contains build and validation helpers. `exports/` separates videos, stills,
contact sheets and reports; generated media is ignored by Git. Font and icon
licenses are in `licenses/`.

The native-button demo mirrors the library's press scale, size geometry and
busy activation guard. It is a media prototype, not a replacement for the
React Button source. The Paper layout is retained; duplicate headings,
outdated busy copy and the disabled ghost specimen are corrected in this demo.

## Reproduce

From the repository root. Build dependencies are React 18, React DOM 18,
esbuild and griddy-icons 0.2.0 in `MOTION_DEPS` (default
`/tmp/brand-grid-tools/node_modules`). Rendering uses Playwright and ffmpeg;
set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` for external installations.

```sh
node design/motion/button-showcase/scripts/build.mjs
node design/motion/button-showcase/scripts/validate.mjs
PAGE=design/motion/button-showcase/previews/button-showcase.html \
OUT=design/motion/button-showcase/exports/videos/button-showcase-light-1600x1200-60fps.mp4 \
BEATS=0.4,1.15,1.8,2.3,3,4.8,6.2,8.2,9.2 \
node registry/skills/ui-video-render/scripts/render-seek.mjs
python3 design/motion/button-showcase/scripts/review.py
node design/motion/button-showcase/scripts/stills.mjs
```

Open the HTML directly to play or scrub. The anatomy specimen can be clicked
for a busy-to-complete interaction. Fonts and icon glyphs are embedded.
