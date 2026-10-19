# Daylight — product walkthrough · storyboard

The whole Daylight screen, performing its day: one looping film that walks
through the product's key interactions. It is framed as the Paper *Full View*
composition and synced to the current screen design.

| | |
| --- | --- |
| Design | Paper, *Screens* page, artboard `5F5-0` (dark) — [link](https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-1-0/5F5-0) |
| Composition | *_Assets* page, **Article Asset Full View Dark Landscape** `89Y-0` — [link](https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-2-0/89Y-0) · light twin `EYT-0` |
| Page | [`daylight-walkthrough.html`](./daylight-walkthrough.html) — built from `ui-demo-page/reference/daylight-demo.html` plus a Paper sync layer |
| Pipeline | `ui-motion-media` → `ui-demo-page` → `ui-video-render` → `ui-stills-render`, Python port in [`../tools/`](../tools/) |
| Output | `exports/` beside this file, git-ignored |
| Job trail | [`../specs/daylight-walkthrough.spec.md`](../specs/daylight-walkthrough.spec.md) |

## Frame

Exactly the Paper draft:

- **Artboard 1600 × 1200.** The 1512 × 982 screen is centred at **(44, 109)**
  at 1:1. Nothing bleeds off the frame and nothing is cropped: this is the
  *full view*, not a detail.
- **Ground.** Dark `oklab(27.7 %) → oklab(18.2 %)`, light `#EDE8E3 →
  #DAD4CE` (oklab). Paper's dot shader sits on it, sampled from its canvas: a
  16 px pitch, dots centred at x ≡ 8 and y ≡ 0, a 1.25 px core fading out by
  2 px, ink `rgb(13 13 13 / 0.078)` in both schemes.
- **The draft has no vignette and no frame border, so neither does the film.**
  The screen's own paint (radius 24, its oklab gradient) separates it from
  the ground.
- **The cursor parks just off the frame's right edge** (stage 1560, 1040 → artboard 1604, 1149).
  It enters from there, acts, and leaves the same way, so a loop never shows
  it appearing out of nowhere.

## Beats

Times are at 1× and were measured from the rendered film's static holds. The
total is **34.47 s**. The loop's first and last frames are the same: the
screen frame with its content not yet revealed.

| # | Time (s) | Interaction | What it shows | Motion (transitions.dev) |
| --- | --- | --- | --- | --- |
| 0 | 0.00–2.02 | **Texts reveal** | The screen's content rises in, column by column (settled by 1.1, then held) | text reveal, 12 px rise, blur 3 px, 40 ms stagger |
| 1 | 2.02–5.76 | **Block the suggestion** | The cursor enters from the right edge and presses *Block it* on *Wayfinding pictograms*. The card turns to *Blocked for focus* with an *Undo*, and the toast *Blocked 15:30 – 17:00 for Wayfinding pictograms* confirms | button press, toast open |
| 2 | 5.76–8.15 | **Tick a task** | *Finish grid proofs* is checked off and struck through, and *1 of 3* rolls to *2 of 3* | checkbox draw (the real `Check` glyph), digit roll |
| 3 | 8.15–10.89 | **Open the morning** | The *Morning* fold opens: *08:52 Univers specimen sent*, *09:30 Grid proofs started* | accordion expand |
| 4 | 10.89–13.68 | **Avatar fan** | Hovering *Studio crit*'s attendees lifts them one after another | avatar group hover |
| 5 | 13.68–17.43 | **Tooltip travel** | *Switch to week view* → *Previous day* → *Next day* glide across the calendar header | tooltip move |
| 6 | 17.43–25.98 | **Ask the assistant** | *Plan Monday* goes into the thread, a thinking state cycles, and the reply streams in word by word (complete at 24.7) | thinking states, streaming text |
| 7 | 25.98–31.51 | **Collapse, expand** | The *Collapse assistant* tooltip shows, the panel folds to its rail and the calendar widens, then it opens again | card resize, icon swap, tooltip |
| 8 | 31.51–34.47 | **Out** | The cursor leaves to its park point, then the content fades back to the opening frame | text reveal (reverse) |

The still is at **25.3 s**, in the calm hold after the reply is complete. A
task is ticked, the morning is open, the suggestion is blocked, and the
assistant has answered. That is the richest state the screen reaches.

## Synced to the current design

The reference page was built from an earlier revision of this screen. What
changed, read node by node from Paper (`5F5-0` dark and `EYV-0` light, computed
styles) and diffed against the reference rendered at the same size:

| Area | Reference | Design now |
| --- | --- | --- |
| Screen | transparent (snippet ground) | its own paint: dark `#121212` under `oklab(.146)` → `oklab(.182)` at 45 %; light `#FDFCFB → #F6F3F0`; radius 24 |
| Hero, calendar (dark) | deep drop shadow | hairline ring only |
| Quick add, composer, suggestion (dark) | drop shadows | none |
| Task cards, quick add (dark) | `#0E0D0C` | `#0E0D0C` at 80 % |
| Hero (light) | blue wash at 60 % | plain sheet, the wash at 0 % |
| Secondary text | Inter 400, −0.01 em | Inter **450**, no tracking (meta, scales, stamps, captions) |
| Recap card captions | 400 (inherited from the message) | 450 |
| *Waiting for you in the calendar* | 400 | 500 |
| Assistant thread | bottom-aligned, 39 px low | top-aligned under the header |
| Quick add prompt | one placeholder, *Add a task · I'll find it a time* | two runs: **Add a task** (600, ink) + *I'll find it a time* (450, placeholder) |

After the sync, every text node in the design is matched in the page with the
same weight, size and colour. The remaining offsets come only from how a
padded container is measured against Paper's tight text box.

## Deliverables

| File (in `exports/`) | |
| --- | --- |
| `daylight-walkthrough-1600x1200-60fps.mp4` | dark · Full View · 60 fps · H.264 CRF 15 |
| `daylight-walkthrough-light-1600x1200-60fps.mp4` | light · same |
| `daylight-walkthrough-3200x2400.png` | dark still, 2×, cursor hidden |
| `daylight-walkthrough-light-3200x2400.png` | light still |

## Acceptance

- Seam diff < 0.5. The first and last frames are the unrevealed screen.
- A contact sheet with every beat in its settled state.
- The overview geometry matches the draft: the screen rect is (44, 109, 1512, 982) in both schemes.
- The cursor is never visible at rest, and is hidden in stills.
