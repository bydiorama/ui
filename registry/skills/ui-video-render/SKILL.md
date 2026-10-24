---
name: ui-video-render
description: Render a scripted UI demo page into smooth, seamless-looping 60fps videos with Playwright and ffmpeg (Node scripts, or a Python port for machines without Node) — full walkthroughs, component snippets framed at 60% width with dim and vignette, and dotted-ground or full-view compositions in light and dark, landscape and portrait. Use when asked to record, render or export a UI animation as video, make looping clips, feature films or snippets, check frame cadence, or fix stutter, low resolution, loop jumps or framing in rendered UI videos. Part of ui-motion-media.
---

# UI video render

Reference scripts beside this file: **`scripts/render.mjs`** (capture),
**`scripts/compose.py`** (frame + mask + encode), **`scripts/seam.py`** (loop
check). Run them from the repo root so Playwright resolves from the pnpm store.
The page must expose the `ui-demo-page` API; pass it as `PAGE=`.

## No Node

**`scripts/python/`** is the same pipeline for a machine with no Node or ffmpeg
(a fresh Mac had neither). It installs into a venv, with no sudo and nothing
in the repo:

```sh
python3 -m venv ~/.cache/ui-motion/venv && V=~/.cache/ui-motion/venv/bin
$V/pip install playwright pillow numpy imageio-ffmpeg   # imageio-ffmpeg bundles ffmpeg + libx264 (no ffprobe)
$V/python -m playwright install chromium
```

| Script | Does |
| --- | --- |
| `render.py PAGE CAP [--light] [--size WxH] [--compose X,Y] [--run main\|composition] [--snippet NAME]` | capture: ×8, 2×, screencast, tail hold, font guard |
| `encode.py CAP OUT.mp4 [--size WxH]` | retime + encode. Snippets get this skill's framing; `--size` is then the output size |
| `check.py OUT.mp4 [--sheet PNG] [--at t1,t2,…]` | seam diff + contact sheet at given film times |
| `still.py PAGE OUT.png --at T […same options]` | the `ui-stills-render` still; `--at` is **film** time |

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
| Font guard (Python) | assert every declared font family has a loaded face and none errored, after load and after the run | a network face silently replaced by the system fallback mid-capture |

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
toast. Pull a second sheet **at the beats**: the lift-offs, the moment the
feedback lands, the settled states. Evenly spaced frames walked straight
past a double exposure.

**Cadence.** Report the median and p99 of the film-time gaps between captured
frames (`meta.json`); under 16.7 ms is 60 fps. A longer gap is not a stutter
by itself, so diff the frames on either side:

| Frames across the gap | Means |
| --- | --- |
| identical | a hold: the screencast is silent while nothing changes |
| a small box in an input, 38 ms apart | keystrokes: typing is discrete |
| a large change | a real dropped frame. Count them and name them in the report |

Gaps of ≥ 0.1 s are the film's static holds. They give the measured beat times
for the storyboard and the safe moments for stills.

## Traps

| Trap | Rule |
| --- | --- |
| Settings passed through a zsh `set -- $spec` loop | Not word-split: every clip rendered with empty settings, then compose failed on `cap---composition`. Spell each command out, or loop in Python |
| A render "succeeded" | Exit 0 says nothing about the picture. Look at frames |
| Main walkthrough framed like a snippet | The main clip frames the whole app at 60% (crop = `#app` rect) and keeps its frame on purpose, unless a Full View draft asks for the whole screen at 1:1 (`--compose 44,109 --size 1600x1200`) |
| Captures run in parallel | Two 3200×1800 captures at once still gave ~113 fps of film time. One 3200×2400 capture alone gave 91. Render the heaviest alone, and judge by the cadence numbers, not the exit code |
| A render log line you do not recognise | One `net::ERR_INTERNET_DISCONNECTED` meant a font may have fallen back, and it was invisible on the contact sheet. Treat any resource error as a failed capture until the font guard says otherwise |
| Re-rendering one clip after a page edit | Re-stage `index.html` from the built page first — the renderer reads the staged copy |
| ffmpeg concat timing | The list needs `file`/`duration` pairs and the last file repeated without a duration, or the final frame is dropped |


## Deterministic capture

For a page exposing `seek(seconds)`, use **`scripts/render-seek.mjs`** instead
of slowing wall time. Capture every frame at `index / fps`, including holds.
This makes cadence exact without depending on browser screenshot throughput.
Set `PAGE`, `OUT`, `WIDTH`, `HEIGHT`; `PLAYWRIGHT_MODULE` and
`CHROMIUM_EXECUTABLE` support external toolchains. `BEATS` is an optional
comma-separated list of film times. Keep the capture sequential.

Before rendering, compare the composed geometry to Paper, including intended
cropping. Check loaded font faces, resource errors, reduced motion, text versus
skeleton separation, ongoing stream content during dismissal, and persistent
ground layers at multiple times. Regenerate each changed preview before capture.

For exact browser endpoint comparison, decode PNGs and compare pixels. PNG
byte hashes can differ for identical pixels because compression differs. Still
measure the encoded MP4 with `seam.py`; a passing browser seam does not verify
the encoder. Review decoded contact sheets at even times AND animation beats.
