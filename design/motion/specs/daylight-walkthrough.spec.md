# Spec · Daylight product walkthrough film

The job trail: what was asked, what was decided and why, what was made, how
it was checked, and how to make it again. It is the sibling of
[`today-banner-evolution.spec.md`](./today-banner-evolution.spec.md) and
reuses that job's tools.

| | |
| --- | --- |
| Date | 2026-10-19 |
| Requested by | Jakub Otčenáš |
| Made with | Claude Code (Opus 5.5) · skills `ui-motion-media`, `ui-demo-page`, `ui-video-render`, `ui-stills-render` |
| Status | delivered: 2 films + 2 stills. Committed on branch `claude/today-banner-evolution` |

## 1 · Request

> Could you please create a similar video, now a walkthrough for the product demo?
> Design: `https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-1-0/5F5-0`
> Composition draft: `https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-2-0/89Y-0`

"Similar" was read as: the same pipeline, the same artefacts (storyboard,
demo page, films in both schemes, 2× stills, this trail), and the same
folder and ignore conventions as the banner film.

## 2 · Inputs read

| Input | Node | What it is |
| --- | --- | --- |
| Design | `5F5-0` (*Screens*) | The Daylight screen, 1512×982, dark, 307 nodes |
| Composition draft | `89Y-0` (*_Assets*, "Article Asset Full View Dark Landscape") | 1600×1200. A ground gradient, a dot shader `EYS-0`, the screen `8IK-0` at (44, 109) |
| Light twin | `EYT-0` ("… Full View Light Landscape") | The same composition. Light ground, shader `EYU-0`, screen `EYV-0` |

All three were read from Paper's DOM in the browser (resolved computed
styles, the same numbers `get_computed_styles` gives). The Paper connector
was not loaded in this session. The dot shader is a WebGL canvas, so it was
read by sampling its pixels: pitch, dot profile, ink, grid phase and
uniformity (no vignette).

## 3 · Decisions

| Decision | Why |
| --- | --- |
| Start from `ui-demo-page/reference/daylight-demo.html`, not from blank | It *is* this product: the same screen, real interactions with transitions.dev snippets, a choreographed `runDemo()`, and composition hooks. The skill says to adapt its references |
| Sync the page to `5F5-0` / `EYV-0` as **one CSS layer appended last** (plus one markup change for the quick-add prompt) | The reference was built from an earlier revision. Diffing it node by node against Paper found real drift (table in the storyboard). One layer keeps the change reviewable against the reference |
| Verify the sync by re-running the diff | 68 text nodes matched with the design's weight, size and colour. The remaining position flags are measurement artefacts (padded containers and inline spans against Paper's tight text boxes) |
| Frame = the draft exactly: 1600×1200, screen at (44, 109) 1:1, no bleed | The skill's default composition bleeds off the frame at 1024×768. The draft is the newer art direction and the contract |
| No vignette, no frame border | Neither is in the draft. The reference composition had both |
| Dot ground re-specified from the shader's pixels | The reference's dots (r 1.5, ink 0.32 / 0.08, centred on the cell corner) differ from Paper's (soft r 1.25–2, ink 0.078 in both schemes, x ≡ 8 y ≡ 0) |
| The walkthrough is the reference `runDemo()`, unchanged | It already returns to its first frame. Its beats are the product's story, and its timing was art-directed in earlier rounds |
| `render.py` / `still.py` gain `--compose X,Y` and `--run` | So a composition-framed walkthrough is one command. The banner film's commands are unchanged |
| Exports in `design/motion/daylight-walkthrough/exports/` | Matched by the existing `design/motion/**/exports/` ignore rule |

## 4 · Files

```
design/motion/
├─ specs/daylight-walkthrough.spec.md        ← this file
├─ tools/                                     ← shared; gained --compose and --run
└─ daylight-walkthrough/
   ├─ storyboard.md
   ├─ daylight-walkthrough.html              ← reference page + Paper sync layer + Full View rules
   └─ exports/                                ← mp4 + png, git-ignored
```

## 5 · Results

### Passes

| Pass | Looked at | Found | Done |
| --- | --- | --- | --- |
| Diff 1: reference vs Paper `5F5-0` | 72 text nodes, 30 surfaces | The drift in the storyboard's *Synced* table | One sync layer + the quick-add markup |
| Diff 2: synced page vs Paper | same | 68 / 68 matched text nodes agree in weight, size and colour. The rest are measurement artefacts, plus the recap captions inheriting 400 | `.recap { font-weight: 450 }` |
| Full View still, both schemes | screen rect, ground | Screen at exactly (44, 109, 1512, 982). Dots and ground as in the draft | — |
| Render (dark) | seam, 16-frame sheet, frame gaps | Pass. The six gaps over two frames: five are true holds (0 px changed); one is a 36 ms step at 30.3 s, the start of the assistant re-expanding (a layout-heavy resize) | Accepted, see *Not verified* |
| Render (light), rendered alone | seam, sheet | Pass | — |

### Deliverables (`design/motion/daylight-walkthrough/exports/`, git-ignored)

| File | Spec | Seam diff | Size |
| --- | --- | --- | --- |
| `daylight-walkthrough-1600x1200-60fps.mp4` | dark · Full View 1600×1200 · 60 fps · 2071 frames · 34.52 s · H.264 CRF 15, BT.709 | **0.020** | 2.14 MB |
| `daylight-walkthrough-light-1600x1200-60fps.mp4` | light · same | **0.046** | 2.47 MB |
| `daylight-walkthrough-3200x2400.png` | dark still · 2× · film time 25.3 s · cursor hidden | — | 0.77 MB |
| `daylight-walkthrough-light-3200x2400.png` | light still · same | — | 0.91 MB |

### Evidence

- **Cadence:** 3141 (dark) / 2954 (light) captured frames for 34.47 s of film. Gaps during motion: median
  6.4 / 6.8 ms of film time, p99 10.7 / 11.5 ms, under one 60 fps frame. The 3200×2400 captures are heavier, so
  the light pass ran alone.
- **Beat timings** in the storyboard were measured from the capture's static holds, not taken from the script.
- **Stills:** the ground is sampled at the corner and bottom. A smooth gradient, no band.

### Not verified

- **One dropped frame** (a 36 ms step) at 30.3 s in the dark film, where the assistant re-expands. The light
  film was not checked frame by frame for the same step.
- **The dark draft's suggestion card** is hidden in `5F5-0` at rest but shown in the light twin. The film shows
  it, because the walkthrough's first beat acts on it.
- **Position offsets under 2 px** were not chased. They come from comparing padded containers with Paper's
  text boxes, and reading them visually matches.
- **Inter loads from Google Fonts at render time**, as in the reference.

## 6 · Reproduce

From `design/motion/tools/`, with the venv from the banner spec:

```sh
PY=~/.cache/ui-motion/venv/bin/python
PAGE=../daylight-walkthrough/daylight-walkthrough.html
OUT=../daylight-walkthrough/exports
CAP=/tmp/walk-cap

$PY render.py $PAGE $CAP/dark --size 1600x1200 --compose 44,109           # ×8 slow, 2×, ~5 min
$PY encode.py $CAP/dark $OUT/daylight-walkthrough-1600x1200-60fps.mp4
$PY check.py  $OUT/daylight-walkthrough-1600x1200-60fps.mp4 --sheet $CAP/dark-sheet.png

$PY render.py $PAGE $CAP/light --size 1600x1200 --compose 44,109 --light
$PY encode.py $CAP/light $OUT/daylight-walkthrough-light-1600x1200-60fps.mp4

$PY still.py $PAGE $OUT/daylight-walkthrough-3200x2400.png       --size 1600x1200 --compose 44,109 --at T
$PY still.py $PAGE $OUT/daylight-walkthrough-light-3200x2400.png --size 1600x1200 --compose 44,109 --at T --light
```

`T` is the still's film time: 25.3 (§5). Preview without rendering: open the page in a browser.
`#demo` loops the walkthrough, and `#demo-light` does the same in light.
