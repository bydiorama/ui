# Spec · Daylight feature series (hero, agentic chat, calendar event)

The job trail for three feature films with thumbnails, dark only. It is the
third job on the same pipeline, after
[`today-banner-evolution`](./today-banner-evolution.spec.md) and
[`daylight-walkthrough`](./daylight-walkthrough.spec.md).

| | |
| --- | --- |
| Date | 2026-10-19 |
| Requested by | Jakub Otčenáš |
| Made with | Claude Code (Opus 5.5) · skills `ui-motion-media`, `ui-demo-page`, `ui-video-render`, `ui-stills-render` |
| Status | delivered: 3 films + 3 thumbnails, dark. Committed on branch `claude/today-banner-evolution` |

## 1 · Request

> Once you are done, create a series of three feature presentation videos with a complementary thumbnail.
> Focus on the following features: 1. hero banner 2. agentic sidebar/chat input box 3. calendar/calendar event.
> Use the dark mode only.

An example frame came with the request: the hero banner at about 48 % of a
4:3 frame, the rest of the screen dimmed and vignetted, in the *5h 30m to
yourself* state. That is the skill's snippet framing at 1600×1200. It sets
the format, the framing and the hero thumbnail's moment.

## 2 · Decisions

| Decision | Why |
| --- | --- |
| One story from three angles: the banner (your day), the chat (ask), the calendar (it lands) | The page's agentic request, *Add an hour before lunch to outline the agentic design systems article*, touches all three features. A series that shares one action reads as a series, and each film still stands alone |
| Hero: the reference snippet, extended | The reference only showed the suggestion being declined (4h → 5h 30m). The banner also answers the agent taking an hour (4h → 3h, the next free stretch moves to 13:30, the 11:30 segment fills), so the film shows both, each reverting before the next |
| Chat: the reference `addtask-chat` snippet (composer + 300 px of thread) | It is the agentic flow: typing, the generating pill's thinking states, the streamed reply. The framing keeps the request, the work and the answer in one focus box |
| Calendar: the reference `addtask-schedule` snippet (the free hour ± its neighbours) | The generated event resolving in place is the calendar's most distinctive moment. The cursor is off because the request comes from the off-frame chat |
| 1600×1200, dark, framing = the skill's snippet maths (≤ 60 % width, ≤ 84 % height, dim 0.46 + vignette 0.62) | It matches the example frame (its hero sits at 48 % width) and the walkthrough's canvas |
| The snippet ground follows the new screen paint | The page extends the screen's own background past its edges. After the Paper sync that background is the oklab gradient, not the reference's `#0B0A09 → #000` |
| Thumbnails are fresh 2× renders, framed like their clip | `ui-stills-render`: a frame pulled from the mp4 would be 1×, compressed and have the cursor baked in |

## 3 · Changes made for this job

| Where | Change | Why |
| --- | --- | --- |
| `daylight-walkthrough.html`, `SNIPPETS.hero` | Adds the agent-taken hour after the declined suggestion | The banner's second live response (above) |
| `daylight-walkthrough.html`, snippet ground | `html.is-demo:not(.is-compose)` uses the design's oklab gradient | Seamless ground after the sync |
| `daylight-walkthrough.html`, `ask()` → `finish()` | Scrolls the thread to the reply's reference line | The action's feedback, *In your calendar at 11:30*, was appended below the fold and never showed. Found on the chat clip's first contact sheet |
| `tools/render.py` | `--snippet NAME`: the stage + 120 px of ground, settled first, focus rect recorded | Snippet capture (`render.mjs`) |
| `tools/encode.py` | Snippet framing: window maths, edge smear, dim + vignette overlay | `compose.py`, in numpy |
| `tools/still.py` | `--snippet`: the same framing at 2× with `np.pad(mode="edge")` | `still.py` from `ui-stills-render` |
| `tools/common.py` | `snippet_window`, `snippet_mask`, `font_guard` | Shared by the three tools |
| Font guard | Every capture asserts each declared font family has a loaded face and none errored, after load and after the run | The calendar's first render logged `ERR_INTERNET_DISCONNECTED`, and a fallback face passes a visual check at this size. That render was discarded |

None of these changes affects the finished walkthrough films. The ground rule
applies outside composition mode only, the hero snippet is not used by
`runDemo()`, and *Plan Monday* has no reference line.

## 4 · Files

```
design/motion/
├─ specs/daylight-features.spec.md           ← this file
├─ daylight-walkthrough/daylight-walkthrough.html   ← the one product page (walkthrough + feature snippets)
└─ daylight-features/
   ├─ storyboard.md
   └─ exports/                                ← mp4 + png, git-ignored
```

## 5 · Results

### Passes

| Pass | Looked at | Found | Done |
| --- | --- | --- | --- |
| Hero test clip | seam, 8-frame sheet | Pass: 4h → 5h 30m → 4h → 3h (+ the 11:30 segment, the note to 13:30, the task glowing into *Focus* below) → 4h. The hero sits at 48 % width, as in the example | — |
| Chat + calendar, render 1 | seams, sheets, log | The calendar log had `ERR_INTERNET_DISCONNECTED` (unknown resource, typeface unverifiable by eye). In the chat, the confirmation *In your calendar at 11:30* never came into view | Font guard added. The page scrolls to the reference. Both re-rendered |
| Chat + calendar, render 2 | seams, sheets, fonts | Pass. Fonts: Inter loaded, nothing errored, after load and after the run | — |
| Thumbnails | all three at full size, crop windows | Each one at its telling moment. No window leaves the capture, so no edge fill and no band | — |

### Deliverables (`design/motion/daylight-features/exports/`, git-ignored)

| Feature | Film | Length | Seam diff | Thumbnail (2×, 3200×2400) | At |
| --- | --- | --- | --- | --- | --- |
| Hero banner | `daylight-hero-1600x1200-60fps.mp4` (0.65 MB) | 10.43 s · 626 frames | **0.166** | `daylight-hero-3200x2400.png` | 2.6 s: *5h 30m to yourself* |
| Agentic chat | `daylight-assistant-1600x1200-60fps.mp4` (1.18 MB) | 16.92 s · 1015 frames | **0.147** | `daylight-assistant-3200x2400.png` | 12.5 s: the complete reply + *In your calendar at 11:30* |
| Calendar event | `daylight-calendar-1600x1200-60fps.mp4` (0.96 MB) | 12.03 s · 722 frames | **0.215** | `daylight-calendar-3200x2400.png` | 7.0 s: the landed, resolved event |

All three are dark, 1600×1200, 60 fps, H.264 CRF 15, BT.709-tagged.

### Evidence

- **Framing:** z = min(60 % · W / focus w, 84 % · H / focus h). The hero's focus is 816×672 capture px → z 2.35 →
  the banner at 48 % width (the example's proportion). The chat: 840×988 → z 2.04, height-bound. The calendar:
  1224×606 → z 1.57, width-bound at the 60 % cap.
- **Cadence** (film time between captured frames, median / p99): hero 6.9 / 9.9 ms, calendar 6.6 / 14.3 ms, chat 6.5 /
  39.6 ms. The chat's long gaps were located. 12 of the 14 are keystrokes: 38 ms apart, inside the input field,
  so the picture really is static between characters. The other two are single steps: the field clearing on send
  (5.27 s) and the added messages starting to fold (14.23 s). Hero and calendar each have one step over two frames.
- **Fonts:** the guard passed for both re-rendered clips and all three thumbnails. The hero clip predates the guard;
  its log shows no errors, and its sheet matches the guarded thumbnail's type.

### Not verified

- **Hero clip font:** rendered before the guard existed. Its run logged no errors, but the guard did not run on it.
- **The two discrete steps in the chat clip** (send, fold) are left as they are. They come from the page's state
  changes, not from capture.
- **Light versions:** not made, as asked (dark only). The tools and the page support them (`--light`).

## 6 · Reproduce

From `design/motion/tools/`, with the venv from the banner spec:

```sh
PY=~/.cache/ui-motion/venv/bin/python
PAGE=../daylight-walkthrough/daylight-walkthrough.html
OUT=../daylight-features/exports
CAP=/tmp/feature-cap

# snippet name in the page → file name
for pair in hero:hero addtask-chat:assistant addtask-schedule:calendar; do
  snip=${pair%%:*}; name=${pair##*:}
  $PY render.py $PAGE $CAP/$name --snippet $snip
  $PY encode.py $CAP/$name $OUT/daylight-$name-1600x1200-60fps.mp4 --size 1600x1200
  $PY check.py  $OUT/daylight-$name-1600x1200-60fps.mp4 --sheet $CAP/$name-sheet.png
done

$PY still.py $PAGE $OUT/daylight-hero-3200x2400.png      --snippet hero             --size 1600x1200 --at 2.6
$PY still.py $PAGE $OUT/daylight-assistant-3200x2400.png --snippet addtask-chat     --size 1600x1200 --at T_CHAT
$PY still.py $PAGE $OUT/daylight-calendar-3200x2400.png  --snippet addtask-schedule --size 1600x1200 --at T_CAL
```

`T_CHAT` = 12.5 and `T_CAL` = 7.0 (§5). A loop over `pair` splits with `%%`/`##`, which zsh and bash both do. It does
not rely on word-splitting a variable, the trap the skill records.
