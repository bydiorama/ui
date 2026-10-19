# Daylight — feature series · storyboard

Three short feature films, each with a thumbnail, dark only. Each one puts a
single part of the Daylight screen in focus while the rest of the screen
stays in frame, dimmed. Together they tell one story from three angles:
**the banner** tells you what your day holds, **the assistant** acts on a
request, and **the calendar** shows the result land.

| | |
| --- | --- |
| Design | Paper `5F5-0` (*Screens*, dark), the same screen as the walkthrough |
| Page | [`../daylight-walkthrough/daylight-walkthrough.html`](../daylight-walkthrough/daylight-walkthrough.html): one product page for the walkthrough and the features |
| Framing reference | The example frame from the brief: the hero banner at ~48 % width, the screen around it dimmed and vignetted, 4:3 |
| Pipeline | `ui-demo-page` snippets → `ui-video-render` framing → `ui-stills-render` thumbnails, Python port in [`../tools/`](../tools/) |
| Output | `exports/` beside this file, git-ignored |
| Job trail | [`../specs/daylight-features.spec.md`](../specs/daylight-features.spec.md) |

## Frame (all three)

- **1600 × 1200, 60 fps, dark.** The same 4:3 canvas as the walkthrough and as
  the brief's example frame.
- **The feature is the focus box** (`snippetRect`, 40 px of air), scaled to fill
  at most **60 % of the width** and 84 % of the height, and centred.
- **Everything else stays in frame, but pushed back:** a feathered, rounded
  dim (black 0.46) combined with a radial vignette (0.62). The feature stays
  true-colour, and so does its feedback.
- **The ground continues the screen's own paint past its edges**, using the
  current design's oklab gradient, so a frame near the screen's edge shows no
  band.
- **No captions or titles.** The thumbnail is a fresh 2× render at the clip's
  telling moment, framed identically, with the cursor hidden.

## 1 · Hero banner — `daylight-hero`

*The banner always knows how much of the day is yours.* There is no cursor,
because what changes the day happens off-frame: the banner only answers.

| Time (s) | What happens | Motion |
| --- | --- | --- |
| 0.0–1.1 | Rest: **4h** to yourself, *2h 30m still ahead* | — |
| 1.1–3.7 | A suggestion is declined off-frame. **4h → 5h 30m**, the note streams *4h still ahead. Next free stretch at 11:30.*, and the 15:30 block frees on the timeline | line swap (old rises out, blurred), streaming text |
| 3.7–5.2 | Back to **4h** | line swap |
| 5.2–8.0 | The Assistant takes an hour before lunch. **4h → 3h**, *1h 30m still ahead. Next free stretch at 13:30.*, the 11:30 segment fills with focus blue, and the new task glows into *Focus* below (in the dim) | line swap, streaming text, segment colour |
| 8.0–10.4 | Undone. Back to **4h**, the loop's first frame | — |

**Thumbnail** at 2.6 s: **5h 30m to yourself**, the state of the brief's example frame.

## 2 · Agentic chat — `daylight-assistant`

*Ask in plain words, and the assistant does it.* The focus is the composer
plus the 300 px of thread above it, so the request, the thinking and the
answer are all in one box.

| Time (s) | What happens | Motion |
| --- | --- | --- |
| 0.0–1.3 | The cursor enters and clicks the chat input | cursor |
| 1.3–4.2 | *Add an hour before lunch to outline the agentic design systems article* is typed, with a drawn caret. The line scrolls with the text, its left edge fades, and the send button lights up | typing, field fade, icon state |
| 4.2–5.0 | Sent: the message rises into the thread as a bubble | text reveal |
| 5.0–≈9 | A generating pill cycles *Reading your day… → Finding an hour before lunch… → Writing the task…*, glowing while the task is written | thinking states, generation glow |
| ≈9–≈12 | The reply streams in word by word: *Done. It's first on your focus list, and I've blocked 11:30 – 12:30 for it…*, with the reference *In your calendar at 11:30* | streaming text |
| ≈12–end | The task is undone and the added messages fold away, back to the first frame | fade, height collapse |

**Thumbnail** at 12.5 s: the complete reply with its calendar reference, *In your calendar at 11:30*.

## 3 · Calendar event — `daylight-calendar`

*The request lands as a real event.* The focus is the free hour *1 hour,
unclaimed* with the events around it. This is the same request as film 2,
seen from the calendar: the chat is off-frame, so there is no cursor.

| Time (s) | What happens | Motion |
| --- | --- | --- |
| 0.0–1.1 | Rest: *Pictogram brief*, then the free hour, then *Lunch with Massimo* | — |
| 1.1–≈5 | The Assistant writes the task. The free hour is taken, and **Outline the agentic design systems article · 11:30 – 12:30 · added by Assistant** generates in place: blurred colour fields resolve into the event | generation (gen layers), land |
| ≈5–≈9 | The event sits in the calendar, focus blue, beside its neighbours | — |
| ≈9–end | Undone. It blurs out, and the free hour returns | fade + blur |

**Thumbnail** at 7.0 s: the landed event, fully resolved.

## Deliverables

| File (in `exports/`) | |
| --- | --- |
| `daylight-hero-1600x1200-60fps.mp4` + `daylight-hero-3200x2400.png` | hero banner |
| `daylight-assistant-1600x1200-60fps.mp4` + `daylight-assistant-3200x2400.png` | agentic chat |
| `daylight-calendar-1600x1200-60fps.mp4` + `daylight-calendar-3200x2400.png` | calendar event |

## Acceptance

- Each clip's seam diff < 0.5.
- A contact sheet per clip: the feature in true colour at every beat, its feedback inside the focus box.
- Thumbnails: the same framing as their clip, 2×, cursor hidden, no band at the frame or screen edge.
