# Brand grid reveal

The current film builds the brand workspace from a dot grid, then demonstrates its library, metrics and member interaction. Open any HTML preview directly; fonts and artwork are embedded.

## Current versions

| Version | Preview | MP4 | Duration |
| --- | --- | --- | --- |
| Directed | [Preview](previews/brand-grid-reveal-directed.html) | [1600 × 1200](exports/videos/brand-grid-reveal-directed-light-1600x1200-60fps.mp4) | 9.5s |
| Slower reveal | [Preview](previews/brand-grid-reveal-slow.html) | [1600 × 1200](exports/videos/brand-grid-reveal-slow-light-1600x1200-60fps.mp4) | 16s |
| Portrait 4:5 | [Preview](previews/brand-grid-reveal-portrait.html) | [1080 × 1350](exports/videos/brand-grid-reveal-portrait-light-1080x1350-60fps.mp4) | 9.5s |

All videos are 60fps H.264 loops. The slower version completes construction at nine seconds and retains the original pace for subsequent interactions. The portrait composition follows the Paper portrait artboard: app inset 32px from the left, deliberate right-edge crop, and a 448 × 242px code widget overlapping the app at the upper right. Paper’s 960 × 1200 coordinates are scaled uniformly to 1080 × 1350.

## Folder structure

- `previews/`: self-contained interactive HTML previews, including previous original and dense-code versions.
- `source/`: editable timelines, exported JSX and code content.
- `scripts/`: build, synchronization, validation and render helpers.
- `docs/`: storyboards and design rationale.
- `licenses/`: font license.
- `exports/videos/`: finished MP4s, including previous original and dense-code versions.
- `exports/contact-sheets/`: visual review sheets.
- `exports/stills/<version>/`: static previews and sampled render frames; older captures are in `archive/`.
- `exports/reports/`: machine-readable validation and render reports.

Generated media in `exports/` is intentionally ignored by Git.

## Rebuild

Run from the repository root. Node, Python, Playwright Chromium and ffmpeg must be available. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` when they are installed outside the project's default resolution paths.

```sh
node design/motion/brand-grid-reveal/scripts/sync-directed.mjs
python3 design/motion/brand-grid-reveal/scripts/build-versions.py
node design/motion/brand-grid-reveal/scripts/validate-versions.mjs
node design/motion/brand-grid-reveal/scripts/render-versions.mjs directed
node design/motion/brand-grid-reveal/scripts/render-versions.mjs slow
node design/motion/brand-grid-reveal/scripts/render-versions.mjs portrait
python3 design/motion/brand-grid-reveal/scripts/review-exports.py
pnpm verify
```

Renders run sequentially. Validation checks continuing code during dismissal, 11px typography, portrait bounds, settled values, reduced motion and decoded pixel equality at the loop endpoints. Export review measures encoded seams and produces contact sheets at evenly spaced times and key animation beats.
