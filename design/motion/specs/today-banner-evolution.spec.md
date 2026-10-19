# Spec · Today banner evolution film

The job trail: what was asked, what was decided and why, what was made, how
it was checked, and how to make it again.

| | |
| --- | --- |
| Date | 2026-10-19 |
| Requested by | Jakub Otčenáš |
| Made with | Claude Code (Opus 5.5) · skills `ui-motion-media`, `ui-demo-page`, `ui-video-render`, `ui-stills-render` |
| Status | delivered: 2 films + 2 stills. `.gitignore` narrowed from `design/` to `design/*` + `!design/motion/`, so the storyboard, spec, page and tools are trackable while `exports/` and `__pycache__/` stay ignored. Committed on branch `claude/today-banner-evolution` |

## 1 · Request

> Create a video that will show the creation and progress of the banner
> element evolution in a motion video. Use the attached skills and create a
> markdown storyboard. Add a new folder to the design folder […]. As a trail
> of the job create a markdown spec file that can be located in a dedicated
> folder.

Follow-ups during the job:

1. "The iterations can be found here" →
   `https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-2-0/HD9-0`
2. Export location: first "outside of the git folder", then revised to
   "use the git folder, however, update the `.gitignore` file".
3. Toolchain: approved to install a Python render toolchain, kept out of the repo.
4. "Narrow the design/ ignore rule so design/motion/ (storyboard, spec, page, tools) is tracked while exports
   stay ignored."

## 2 · What "the banner" is

The repo has a `Banner` component (`registry/ui/banner`), and its git history
was read first. The Paper link settled the question: the subject is the
**Daylight Today banner** (the hero card of the Daylight demo screen). Paper
has four iterations of it on the 1600×900 artboard `HD9-0`:

| Pill | Node | Gist |
| --- | --- | --- |
| First Attempt | `HDB` | greeting + *Three things matter today.* + body, Aspekta, no card |
| Exploration | `HDI` | date + *You have 4 hours to yourself.* at 48 px + 12 px timeline, no card |
| Revision | `HE9` | the same content in a white card, 32 px, 12 px timeline |
| Redesign | `HF2` | Inter, 24 px radius card, *Friday* + chip, figure *4h*, note, 20 px timeline, six-step scale |

The artboard is the result frame of *Prompt 02 · Iterate* (`ANH-0` landscape
1080×810, `AWE-0` portrait 1080×1350): "Good job. Please check my comments
and implement them on a new frame." That line sets the film's structure:
each iteration is built on a new frame, to the right.

## 3 · Inputs read

- **Paper.** The connector was not yet loaded in this session, so the design
  was read from Paper's own DOM in the browser. Paper draws its canvas as
  HTML, so each node's `style` and its token variables can be resolved
  through `getComputedStyle`, the same numbers `get_computed_styles` returns.
  Every size, gap, radius, colour and type setting in the page comes from
  that dump, not from screenshots.
- **Dark scheme.** The asset is light only. Dark values come from the Daylight
  Jet Black ladder (Rev 6) in `ui-demo-page/reference/daylight-demo.html`.
  Its light half equals Paper's resolved values one for one, so the mapping
  is token to token, not by eye. The table is in the storyboard.
- **Type.** Aspekta from `registry/fonts/aspekta/AspektaVF.woff2` (OFL),
  inlined as base64 so the page stands alone. Inter from Google Fonts, as the
  reference demo does.

## 4 · Decisions

| Decision | Why |
| --- | --- |
| Canvas 1600×900, the asset's own artboard | The film can replace the static asset 1:1. The prompt cards are 1080×810 / 1080×1350, and other sizes are a re-run with `--size` |
| Camera pans frame to frame, then pulls back to the overview | "implement them on a new frame": progress is literally left to right, and the overview *is* the Paper asset |
| Shared-element flights between frames | "Evolution" means seeing what carried over change. Without them it is four builds in a row |
| Focus zoom 1.75 (43 % width) | Within the ≤ 60 % rule, and the neighbours stay visible so the sequence still reads |
| The ground is fixed to the frame and only the content moves | The skill's seamless-ground rule. No frame edges, and the loop seam is empty ground = empty ground |
| Unfocused frames washed to opacity 0.28 | Washes toward the ground in light and dims toward black in dark, with one mechanism |
| Iteration pills kept | They are part of the Paper asset, not added captions |
| No cursor | Nothing is clicked. A cursor would imply interaction that is not there |
| All motion is WAAPI/CSS on the document timeline and all waits are `setTimeout` | Both are slowed ×8 by the renderer (CDP playback rate, wrapped timers). A `requestAnimationFrame` tween would run at the wrong speed |
| Python port of the render scripts | No Node, pnpm or ffmpeg on this Mac. The port keeps the pipeline's mechanics: ×8 slow-down, 2× stage, CDP screencast, tail hold, concat retime, CRF 15 |
| Exports in `design/motion/today-banner-evolution/exports/`, git-ignored | The user's revised instruction |

## 5 · Files

```
design/motion/
├─ specs/today-banner-evolution.spec.md     ← this file
├─ tools/                                   ← Python port of the ui-video-render / ui-stills-render scripts
└─ today-banner-evolution/
   ├─ storyboard.md
   ├─ today-banner-evolution.html          ← the demo page (#demo, #demo-light)
   └─ exports/                              ← mp4 + png, git-ignored
```

## 6 · Results

### Iterations of the job itself

| Pass | What was looked at | Found | Done |
| --- | --- | --- | --- |
| Smoke (1×, no CDP) | 15 frames + overview, both schemes | Columns at 62/362/754/1146 px, 418 tall, exactly Paper's layout. No page errors, fonts loaded | — |
| Render 1 (dark) | seam + 16-frame sheet | **Seam diff 5.08 (fail).** The last frame was the overview, not the ground. With the CDP Animation domain on, Chromium dropped finished, filled, unreferenced WAAPI animations from `document.getAnimations()` while their effects stayed applied (127 → 6 listed), so `reset()` could not cancel them | The page keeps its own registry of every animation and `reset()` cancels it. Verified under CDP at ×2: end state = rest state |
| Render 1 (dark) | mid-flight frames | A double exposure: old and new text legible together mid-flight | The ghost now fades 12–45 % (blur 3 px) and the arrival resolves 40–80 % |
| Render 2 (both) | seams 0.003 / 0.020, sheets | Lift-off frames still busy (7.9 s, 11.4 s): the copy separates from a full-strength original | The outgoing frame washes out at once (0 ms delay, 450 ms) |
| Render 3 (both) | seams, 16-frame sheets incl. every lift-off, stills, pixel samples | Pass | — |

### Deliverables (`design/motion/today-banner-evolution/exports/`, git-ignored)

| File | Spec | Seam diff | Size |
| --- | --- | --- | --- |
| `daylight-banner-evolution-1600x900-60fps.mp4` | dark · 1600×900 · 60 fps · 1262 frames · 21.03 s · H.264 CRF 15, BT.709 | **0.003** | 1.28 MB |
| `daylight-banner-evolution-light-1600x900-60fps.mp4` | light · same | **0.020** | 1.49 MB |
| `daylight-banner-evolution-3200x1800.png` | dark still · 2× · film time 18.5 s (overview) | — | 0.24 MB |
| `daylight-banner-evolution-light-3200x1800.png` | light still · same | — | 0.58 MB |

### Evidence

- **Loop:** seam diff 0.003 / 0.020 against a < 0.5 bar. The first and last frames are both bare ground.
- **Cadence:** 2449 / 2481 captured frames for 21.0 s of film. Frame-to-frame gaps during motion: median
  3.1 ms of film time, p99 14 ms (under one 60 fps frame, 16.7 ms), worst 32 ms (one dropped frame) at a few
  motion starts.
- **Layout vs Paper:** columns at x 62 / 362 / 754 / 1146, 418 px tall, centred, the same as `HD9-0`. Cards
  measure 328×214 (Revision) and 328×256 (Redesign).
- **Frames looked at:** 16 per clip across all beats, plus 8 per clip around the lift-offs, plus both stills
  at full size.
- **Stills:** ground sampled at top / left / bottom. A smooth gradient, no band.

### Not verified

- **Dark scheme is derived, not drawn.** Paper has the asset in light only. Dark uses the Daylight ladder that
  the reference demo already ships, token for token. Confirm it in Paper if a dark asset is needed there.
- **No pixel diff against a Paper export.** The overview was compared by geometry and by eye.
- **Inter loads from Google Fonts at render time.** An offline render would fall back to the system face.
  Aspekta is embedded.
- **Not played back in a video player here.** Only frames extracted with ffmpeg were inspected.
- **Mid-flight frames still overlap briefly** while a line joins another (e.g. *4 hours* + *to yourself.*
  at 7.8 s). At 60 fps this reads as motion, but a paused frame there is not clean.

## 7 · Reproduce

One-time toolchain (no sudo, nothing in the repo; about 200 MB):

```sh
python3 -m venv ~/.cache/ui-motion/venv
~/.cache/ui-motion/venv/bin/pip install playwright pillow numpy imageio-ffmpeg
~/.cache/ui-motion/venv/bin/python -m playwright install chromium
```

Per clip, from `design/motion/tools/`. Captures go to a scratch dir, never into the repo (≈ 3–4 k JPEGs at 2×):

```sh
PY=~/.cache/ui-motion/venv/bin/python
PAGE=../today-banner-evolution/today-banner-evolution.html
OUT=../today-banner-evolution/exports
CAP=/tmp/banner-cap

$PY render.py $PAGE $CAP/dark                       # ×8 slow, 2× stage, ~3 min real time
$PY encode.py $CAP/dark $OUT/daylight-banner-evolution-1600x900-60fps.mp4
$PY check.py  $OUT/daylight-banner-evolution-1600x900-60fps.mp4 --sheet $CAP/dark-sheet.png

$PY render.py $PAGE $CAP/light --light
$PY encode.py $CAP/light $OUT/daylight-banner-evolution-light-1600x900-60fps.mp4
$PY check.py  $OUT/daylight-banner-evolution-light-1600x900-60fps.mp4 --sheet $CAP/light-sheet.png

$PY still.py $PAGE $OUT/daylight-banner-evolution-3200x1800.png --at 18.5
$PY still.py $PAGE $OUT/daylight-banner-evolution-light-3200x1800.png --at 18.5 --light
```

Other sizes: `--size WxH` on `render.py` and `still.py` re-frames the same film. The camera keeps zoom 1.75 around
a fixed centre, so check the overview still fits on a narrow canvas before batching.

Preview without rendering: open the page in a browser and press **Play** (Space). **Loop**, **Light/Dark** and
**Overview** are beside it. `#demo-light` opens it in render mode, light.
