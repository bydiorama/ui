---
name: ui-stills-render
description: Render static, lossless 2× PNG stills of a scripted UI demo — one per video, frozen at the moment that best tells its story, framed exactly like the clip (60% width, dim and vignette, or dotted-ground composition) with the cursor hidden. Use when asked for static images, key visuals, thumbnails, posters or article images of a UI animation, or stills matching rendered videos. Part of ui-motion-media.
---

# UI stills render

Reference scripts beside this file: **`scripts/still.mjs`** (capture, `PAGE=`
the demo page, run from the repo root) and **`scripts/still.py`** (frame + mask). A still is **a fresh render, not a frame pulled
from the video**: the video is 1×, H.264-compressed and has the cursor in it.

## 1 · Pick the moment from a contact sheet

Pull 8 evenly spaced frames per clip (`ffmpeg -ss t`) into one strip per
clip, stack the strips, and choose the frame where the clip's intent is fully
visible — not mid-transition:

| Clip intent | Moment |
| --- | --- |
| An action (block, tick, add) | the settled result **with its feedback**, e.g. the toast |
| A counter or morph | the changed value, fully landed |
| A reveal (accordion, tooltip, hover) | fully open |
| A conversation | the complete reply, before the loop fade begins |
| A composition | the richest state: recap open, a task ticked |

Record the video time `t`. The page time is `t × slow − 0.3s`, because the
renderer starts the run 300ms after the screencast.

## 2 · Capture

Same init script as the video renderer (slowed `setTimeout`, stage scale 2,
`__LIGHT`, `__COMPOSE`), then:

```js
page.evaluate(() => runSnippet(name));          // do NOT await
await page.waitForTimeout(t * 8 * 1000 - 300);
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 }); // freeze transitions
await page.evaluate(() => { cursor.style.transition = "none"; cursor.style.opacity = "0"; });
await page.screenshot({ path });                // PNG, lossless
```

Hide the cursor: in a still it reads as a screenshot of someone mid-click.
The hover state it caused (tooltip, fanned avatars) stays.

## 3 · Frame

Use the video's framing math at 2× (2048×1536 landscape, 1728×2160 portrait),
with numpy rather than per-pixel Python loops:

- Crop the window with **`np.pad(mode="edge")`** where it leaves the capture.
  A flat black fill left a visible band at the top of a dark still.
- Same mask as the clip: dark dims to black (0.46 + vignette 0.62); light
  washes toward the ground (0.55) with a 0.05 ink vignette. Blur and radius
  scale × 2.
- Compositions: resize only; the vignette is already on the ground.

## 4 · Verify

Test two stills (one light, one dark) before the batch. Then sample pixels
across every boundary that could band (frame edge, padded edge), and look at
each still. Name them like their videos, with the 2× size:
`daylight-<clip>[-light]-2048x1536.png`.

## Traps

| Trap | Rule |
| --- | --- |
| Grabbing the still from the mp4 | 1×, compressed, cursor baked in. Re-render |
| Screenshot during a transition | Freeze with `playbackRate: 0` first; screenshotting a 3504px viewport takes long enough to catch a blend |
| Waiting the clip's real duration | Remember the ×8: a 15s-in moment is a 2-minute wait. Batch in the background |
| One still per clip, by the clip's start frame | The first frame is the loop's resting state — usually the least telling |
