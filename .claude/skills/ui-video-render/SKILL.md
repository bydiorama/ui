---
name: ui-video-render
description: Render a scripted UI demo page into smooth, seamless-looping 60fps videos with Playwright and ffmpeg — full walkthroughs, component snippets framed at 60% width with dim and vignette, and dotted-ground compositions in light and dark, landscape and portrait. Use when asked to record, render or export a UI animation as video, make looping clips or snippets, fix stutter, low resolution, loop jumps or framing in rendered UI videos. Part of ui-motion-media.
---

# UI video render

Reference scripts beside this file: **`scripts/render.mjs`** (capture),
**`scripts/compose.py`** (frame + mask + encode), **`scripts/seam.py`** (loop
check). Run them from the repo root so Playwright resolves from the pnpm store.
The page must expose the `ui-demo-page` API; pass it as `PAGE=`.

## Why the pipeline looks like this

A headless browser cannot record 60fps of real-time animation, so **time is
slowed, captured, then retimed.**

| Step | Mechanism | The defect it removes |
| --- | --- | --- |
| Slow JS time ×8 | init script wraps `setTimeout` (`ms * 8`) | dropped frames — the screencast cannot keep up at 1× |
| Slow CSS time ×8 | CDP `Animation.setPlaybackRate(1/8)` | transitions running at full speed against slowed JS |
| Capture | CDP `Page.startScreencast`, JPEG q95, ack every frame | — |
| Resolution | stage drawn at `__STAGE_SCALE = 2` in a 2× viewport | **the screencast captures CSS px, not device px** — `deviceScaleFactor` does nothing |
| Retime | ffmpeg concat list, each frame's duration = timestamp delta ÷ 8 | — |
| Tail hold | record `tEnd`; the last frame lasts `(tEnd − t) / 8` | **the screencast emits nothing while the page is static**, so a closing hold silently vanished and the loop jumped |
| Encode | `fps=60`, libx264 `-preset slow -crf 15`, `+faststart` | — |

## Framing a snippet (compose.py)

```
z  = min(0.60 · W / crop.w,  0.84 · H / crop.h)   # ≤ 60% width, ≤ 84% height
crop window = W/z × H/z, centred on the focus rect
```

- Pad only the overhang when the window leaves the capture. A blanket
  3000px pad made ffmpeg crawl. Pad with the **page's edge colour**, not black,
  or the light set gets a band.
- Mask = feathered dim (rounded focus rect, Gaussian ~22px at 1×) combined
  with a radial vignette, overlaid as one PNG:
  - **dark:** black, dim 0.46, vignette 0.62
  - **light:** wash toward the ground (≈ `#F8F6F3`) at 0.55, plus a barely
    there ink vignette (0.05). Black over a light UI goes grey.
- **Compositions get no overlay at all** — their vignette is in the page,
  behind the screen. Just scale to the artboard size.

## Batch

```sh
K=.claude/skills/ui-video-render/scripts
PAGE=.claude/skills/ui-demo-page/reference/daylight-demo.html \
  LIGHT=1 COMP=landscape node $K/render.mjs "$OUT" composition 8
(cd "$OUT" && python3 -I "$OLDPWD/$K/compose.py" cap-light-landscape-composition clip.mp4)
python3 -I $K/seam.py "$OUT/clip.mp4"   # seam_diff = mean |first − last| frame, 0–255
```

Accept seam diff **< 0.5** (typically 0.04–0.35). Above that, the run does
not return to its first frame — fix the page, not the encode.

Write the batch as one background command, then verify every clip: seam diff
from the log, then a contact sheet (8 frames across the duration) per clip.
The seam number cannot see a wrong state, a cropped tooltip or a missing
toast.

## Traps

| Trap | Rule |
| --- | --- |
| Settings passed through a zsh `set -- $spec` loop | Not word-split: every clip rendered with empty settings, then compose failed on `cap---composition`. Spell each command out, or loop in Python |
| A render "succeeded" | Exit 0 says nothing about the picture. Look at frames |
| Main walkthrough framed like a snippet | The main clip frames the whole app at 60% (crop = `#app` rect); it keeps its frame on purpose |
| Re-rendering one clip after a page edit | Re-stage `index.html` from the built page first — the renderer reads the staged copy |
| ffmpeg concat timing | The list needs `file`/`duration` pairs and the last file repeated without a duration, or the final frame is dropped |
