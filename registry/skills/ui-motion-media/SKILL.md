---
name: ui-motion-media
description: Entry point for turning a Diorama UI design into presentation media — an animated front-end demo, looping 60fps videos, component snippets, compositions and static stills for articles, decks and social. Use when asked to animate a screen, make a demo or screen recording, render videos or stills of the UI, produce snippets of single components, or art-direct presentation visuals (vignette, framing, dotted ground, light/dark sets). Routes to ui-demo-page, ui-video-render and ui-stills-render.
---

# UI motion media

Three stages, one sub-skill each. Do them in order; each one's output is the
next one's input, and a defect fixed late costs a full re-render.

| Stage | Skill | Output |
| --- | --- | --- |
| 1 · A live page that performs the UI | **`ui-demo-page`** | one HTML file with a scripted, looping walkthrough and per-component snippets |
| 2 · Capture it as video | **`ui-video-render`** | 60fps seamless loops, framed and composited |
| 3 · Capture it as stills | **`ui-stills-render`** | 2× lossless PNGs at each clip's telling moment |

Each sub-skill carries its working reference beside its `SKILL.md`. Copy and
adapt them; do not start from a blank file.

| Reference | What it is |
| --- | --- |
| `ui-demo-page/reference/daylight-demo.html` | The Daylight product demo: walkthrough, snippets, compositions (incl. Full View), synced to Paper `5F5-0` |
| `ui-demo-page/reference/banner-evolution.html` | An iteration film: a camera over a fixed ground, shared-element flights between frames |
| `ui-video-render/scripts/` | `render.mjs` + `compose.py` + `seam.py` (Node), and **`python/`**: the whole pipeline without Node |
| `ui-stills-render/scripts/` | `still.mjs` + `still.py` (Node); the Python still lives in `ui-video-render/scripts/python/` |

**Check the toolchain before planning renders.** A fresh Mac had no Node, pnpm
or ffmpeg. The Python port runs from a venv with no sudo (`ui-video-render`
§ No Node).

Captures (thousands of 2× JPEGs) go to a scratch directory. The finished
media goes in the job's git-ignored `exports/`, and never into a skill folder.

## Art direction — every rule here was a round of feedback

The media serves an article about the UI, so **the UI is the only subject.**

| Rule | Why it is a rule |
| --- | --- |
| No text, captions, logos or graphics outside the UI | Asked for twice. Titles belong to the article, not the frame |
| The central element takes **≤ 60% of the frame width** | More reads as a screenshot; it needs room to breathe |
| Surroundings are dimmed and vignetted, the focus stays true-colour | The eye goes to the one undimmed thing |
| **The vignette never covers the UI** in a composition | A post-process vignette over the whole frame read as "vintage", like an aged photo filter. Put it on the ground, behind the screen (`ui-demo-page` § Compositions) |
| **No hard frame edges.** The ground continues the frame's own background | A light frame on a darker ground showed as a rectangle and a band. Extend the frame's gradient past its edges (`ui-demo-page` § Seamless ground) |
| The focus area includes the **feedback** of the action | A toast landing in the dim made the action look unanswered. Extend the focus to the toast, not just the button |
| Light snippets wash toward the ground colour; dark ones dim toward black | A black dim over a light UI goes grey and muddy |
| Respect the design file's padding, spacing and frame background | Read them from Paper with `get_computed_styles`, or from Paper's DOM when the connector is not loaded (`ui-demo-page` § Reading Paper); never eyeball |
| A composition draft in Paper beats the defaults below | The *Full View* draft (whole screen 1:1, centred, no bleed, no vignette, no border) replaced the bleed composition. Read the draft's size, offset and ground before choosing a format |
| The cursor fades in, acts, returns to its park point, fades out | It is what makes a loop seamless — and it is hidden in stills |
| Design-system compliance holds at 2× zoom | A checkbox glyph that was "close enough" at 1× was called out at snippet scale. Use the real `Check` at the real size |

## Default formats

| Deliverable | Size | Notes |
| --- | --- | --- |
| Snippet / main video | 1024×768 (4:3), 60fps, H.264 CRF 15 | seamless loop, seam diff < 0.5 |
| Article feature series | 1600×1200 snippet framing | the brief's example frame set it: the focus at ~48 % width |
| Composition, full view | 1600×1200 | whole screen 1:1 at 44,109; dot ground; no vignette, no border (Paper *_Assets* "Full View") |
| Composition, landscape | 1024×768 | screen bleeds off right/bottom, offset 64,64 |
| Composition, portrait | 864×1080 | screen at x 48, vertically centred |
| Still / thumbnail | 2× the video size, PNG | same framing as its video |

Name files `daylight-<clip>[-light]-<w>x<h>-60fps.mp4`, so the mode and size
are in the name and the folder can be handed off as is.

## Working rhythm

- **Verify before every long render.** One test clip or one still, look at
  it, then batch. A full set is 15–30 minutes; a wrong assumption costs all of it.
- **Look at contact sheets, not single frames.** 8 frames per clip across its
  duration shows the arc, the loop seam and the best still moment at once.
- Run batches in the background and keep answering; a new piece of feedback
  usually means stopping the batch, not queueing behind it.
- When feedback is ambiguous about direction (dim it more, or bring it into
  focus?), ask with two concrete options. Guessing costs a render cycle.
- Report outcomes with evidence: seam diff per clip, frame cadence, frames
  looked at, what was not checked.
- **Leave a trail per job.** In this repo: `design/motion/<job>/` holds the
  `storyboard.md`, the page and a git-ignored `exports/`. A spec in
  `design/motion/specs/` holds the request, the decisions with their reasons,
  each pass with what it found, the final numbers, what was not verified, and
  the commands to reproduce. The next job starts from it, not from memory.
- **Storyboard first, then measure it.** Write the beats before building. After
  the render, replace the planned times with times measured from the
  capture's static holds, and strike any claim the film does not bear out.

## Traps

| Trap | Rule |
| --- | --- |
| A bash `for spec in "a b c"; do set -- $spec` loop | **zsh does not word-split `$spec`.** Every iteration got empty settings and rendered the wrong thing silently. Drive loops from Python or Node, or use `${=spec}` |
| `rm -f dir/*.mp4` before a re-render | Blocked by the safety check, and unnecessary — `ffmpeg -y` overwrites |
| Re-rendering while the page file changes under a running batch | Each clip loads the page fresh, so a mid-batch edit splits the batch. Note which clips predate the edit and re-run them |
| A web font loaded over the network | A dropped connection mid-capture logged one `ERR_INTERNET_DISCONNECTED` and nothing else, and a fallback face passes a visual check at snippet size. The Python tools' font guard fails the capture instead. Embed a face (base64) where its licence allows |
| A reference page built from an older design revision | It looks right and is not. Diff it node by node against the current artboard before rendering (`ui-demo-page` § Syncing to a newer design) |
| Blender for UI intros | Out of scope here — this pipeline is browser-native |
