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

Each sub-skill carries its working reference beside its `SKILL.md`:
`ui-demo-page/reference/daylight-demo.html`, `ui-video-render/scripts/`
(`render.mjs`, `compose.py`, `seam.py`) and `ui-stills-render/scripts/`
(`still.mjs`, `still.py`). Copy and adapt them; do not start from a blank file.
Write outputs to a scratch directory, never into the skill folders.

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
| Respect the design file's padding, spacing and frame background | Read them from Paper with `get_computed_styles`; never eyeball |
| The cursor fades in, acts, returns to its park point, fades out | It is what makes a loop seamless — and it is hidden in stills |
| Design-system compliance holds at 2× zoom | A checkbox glyph that was "close enough" at 1× was called out at snippet scale. Use the real `Check` at the real size |

## Default formats

| Deliverable | Size | Notes |
| --- | --- | --- |
| Snippet / main video | 1024×768 (4:3), 60fps, H.264 CRF 15 | seamless loop, seam diff < 0.5 |
| Composition, landscape | 1024×768 | screen bleeds off right/bottom, offset 64,64 |
| Composition, portrait | 864×1080 | screen at x 48, vertically centred |
| Still | 2× the video size, PNG | same framing as its video |

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
- Report outcomes with evidence: seam diff per clip, frames looked at, what
  was not checked.

## Traps

| Trap | Rule |
| --- | --- |
| A bash `for spec in "a b c"; do set -- $spec` loop | **zsh does not word-split `$spec`.** Every iteration got empty settings and rendered the wrong thing silently. Drive loops from Python or Node, or use `${=spec}` |
| `rm -f dir/*.mp4` before a re-render | Blocked by the safety check, and unnecessary — `ffmpeg -y` overwrites |
| Re-rendering while the page file changes under a running batch | Each clip loads the page fresh, so a mid-batch edit splits the batch. Note which clips predate the edit and re-run them |
| Blender for UI intros | Out of scope here — this pipeline is browser-native |
