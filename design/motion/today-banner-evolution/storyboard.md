# Today banner — evolution · storyboard

One looping film of the Daylight **Today banner** being made and then
iterated. It goes through the four frames of the Paper asset *Asset Today
Banner Iterations*, then pulls back to that asset exactly as drawn.

| | |
| --- | --- |
| Source | Paper, *Assets* page, artboard `HD9-0` — [link](https://app.paper.design/file/01M4GMVJN4AY0DTXQ9FYJ61JNF/p-2-0/HD9-0) |
| Context | The result frame for *Prompt 02 · Iterate* — "Good job. Please check my comments and implement them on a new frame." (`ANH-0`, `AWE-0`) |
| Page | [`today-banner-evolution.html`](./today-banner-evolution.html) (`#demo`, `#demo-light`) |
| Pipeline | `ui-motion-media` → `ui-demo-page` → `ui-video-render` → `ui-stills-render`, Python port in `ui-video-render/scripts/python/` (`registry/skills/ui-video-render/scripts/python`) |
| Output | `exports/` beside this file, git-ignored |
| Job trail | [`../specs/today-banner-evolution.spec.md`](../specs/today-banner-evolution.spec.md) |

## The idea

Each iteration is **implemented on a new frame**, exactly as the prompt asks,
so the film walks to the right one frame at a time. What carries over is
shown *carrying over*: the date line, the headline and the timeline lift off
the previous frame and fly into their new places, changing size, colour and
face on the way. What is new arrives new: a card, a time chip, a sentence.
At the end the camera pulls back to the four frames side by side, the Paper
asset itself, then the banner fades back into the ground and the loop starts
again.

## Frame and camera

- **Canvas 1600 × 900**, the asset's own artboard. The video can replace the
  static asset 1:1 in the article.
- **The ground is the artboard's own background**, held fixed to the frame
  (light `#FDFCFB → #F6F3F0`, dark `#0B0A09 → #000000`, top to bottom). Only
  the content moves under the camera, so nothing ever shows a frame edge.
- **Focus shots at zoom 1.75**: a 392 px frame is 686 px of 1600, **43 % of
  the width** (rule: ≤ 60 %). The neighbouring frames stay in the shot,
  washed toward the ground (opacity 0.28), so the eye goes to the one
  true-colour frame. The camera's vertical centre stays fixed for the whole
  pan, so the shot never bobs.
- **Overview at zoom 1.0** is the Paper artboard, unchanged.
- The vignette sits on the ground only, under the UI (light ink 0.05, dark black 0.5).
- **No text outside the UI.** The iteration pills (*First Attempt …
  Redesign*) are part of the Paper asset, so they stay. There is no cursor,
  because nothing is clicked.

## Beats

Times at 1×. Total **21.0 s**, a seamless loop: the first and last frames are
both the bare ground.

| # | Time (s) | Shot | What happens | Motion |
| --- | --- | --- | --- | --- |
| 0 | 0.00–0.40 | Ground, camera on frame 1 | Nothing. The loop's rest frame | — |
| 1 | 0.40–2.70 | **First Attempt** (focus) | The pill pops in, then *Good morning, Cipe* rises. The headline *Three things / matter today.* comes in line by line, and the body streams in word by word | pill: scale .96→1 + blur 2→0, 350 ms bounce · lines: text reveal 12 px rise, blur 3 px, 500 ms, 40 ms stagger · body: stream, 60 ms/word |
| 1h | 2.70–3.70 | hold | Read | — |
| 2 | 3.70–6.30 | Pan → **Exploration** | The camera pans one frame right and frame 1 washes out at once (450 ms), so each lifting copy reads against a dimmed original. The greeting lifts off and lands as *Friday, 9 October*. The headline lands as *You have / **4 hours** / to yourself.*, grows 32 → 48 px and turns informational blue. The body sentence dissolves into the timeline: segments grow in left to right, the past veil settles and the *now* tick drops in. 08:00 · 13:00 · 18:00 fade up | camera 1000 ms ease-in-out · flights 900 ms smooth-out; the ghost fades 12–45 % (blur 3 px), the arrival resolves 40–80 % · segments scaleX 0→1, 300 ms, 35 ms stagger · tick drop 8 px, bounce |
| 2h | 6.30–7.50 | hold | Read | — |
| 3 | 7.50–9.90 | Pan → **Revision** | Frame 3's white card grows out of frame 2's content box. Every line flies across into it and shrinks to fit (48 → 32 px). *4 hours* and *to yourself.* join on one line, and the timeline narrows to the card | card plate: rect + radius morph, opacity 0→1, 900 ms · flights as beat 2 |
| 3h | 9.90–11.10 | hold | Read | — |
| 4 | 11.10–14.30 | Pan → **Redesign** | The card re-forms (radius 16 → 24, deeper shadow) and the typeface turns from Aspekta to Inter. *Friday, 9 October* splits into **Friday** and *9 October · Week 41*. *4 hours* becomes the figure **4h**, and *to yourself* settles beside it in muted ink. The 10:40 chip pops in with its live dot, the note *2h 30m still ahead. Next free stretch at 11:30.* streams in, the timeline thickens 12 → 20 px and the scale reads 08 … 18. The pill turns green: *Redesign* | plate morph 900 ms · flights · chip: scale .9→1 + blur, bounce · note: stream 60 ms/word · track height via flight |
| 4h | 14.30–15.90 | hold | The richest single-frame moment | — |
| 5 | 15.90–17.30 | **Pull back** to overview | The camera eases out to zoom 1.0 and all four frames return to full colour. This is the Paper asset | camera 1400 ms ease-in-out · wash 0.28 → 1, 800 ms |
| 5h | 17.30–19.70 | hold | The whole evolution at once | — |
| 6 | 19.70–20.70 | Overview | The frames dissolve right to left into the ground | opacity → 0, blur 4 px, rise 6 px, 500 ms, 70 ms stagger |
| 6h | 20.70–21.00 | Ground | The camera resets to frame 1 unseen. This equals frame 0 | — |

The still is taken at **beat 5h** (the overview, all four frames in full
colour). That is the frame that tells the whole story.

## What flies where

| Step | From (Paper node) | To (Paper node) | Change on the way |
| --- | --- | --- | --- |
| 1 → 2 | greeting `HDF` | date `HDM` | text swap |
| 1 → 2 | headline `HDG` | headline block `HDN` | 32 → 48 px, 2 → 3 lines, *4 hours* turns `data-informational-fg` |
| 1 → 2 | body `HDH` | timeline `HDR` | the sentence dissolves into the bar |
| 2 → 3 | date `HDM` | date `HEE` | — |
| 2 → 3 | *You have* / *4 hours* / *to yourself.* `HDO`/`HDP`/`HDQ` | `HEG`/`HEI`/`HEJ` | 48 → 32 px, the last two lines join, blue goes `-fg` → `-solid` |
| 2 → 3 | track + scale `HDS`/`HE5` | `HEL`/`HEY` | narrows to the card |
| 2 → 3 | content box | card `HEC` | a card plate grows in |
| 3 → 4 | card `HEC` | card `HF5` | radius 16 → 24, padding 16·24 → 24, shadow sm → lg |
| 3 → 4 | date `HEE` | day `HF8` + sub `HF9` | Aspekta 12 → Inter 20/600, the sub reveals after |
| 3 → 4 | *4 hours* `HEI` | figure `HFF` *4h* | 32 → 48 px, blue → ink, Inter |
| 3 → 4 | *to yourself.* `HEJ` | label `HFG` | 32 → 20 px, ink → muted |
| 3 → 4 | track `HEL` | track `HFJ` | 12 → 20 px tall |
| 3 → 4 | scale `HEY` | scale `HFW` | three labels → six |
| new | — | chip `HFA`, note `HFH` | pop-in, stream |

## Tokens, both schemes

Light comes from Paper and is resolved per node. Dark comes from the Daylight
dark ladder (Jet Black, Rev 6) that the reference demo already ships for this
product; its light half matches Paper value for value.

| Token (Paper) | Light | Dark | Used for |
| --- | --- | --- | --- |
| `bg-surface → bg-elevated` | `#FDFCFB → #F6F3F0` | `#0B0A09 → #000000` | ground |
| `text-primary` | `#1D1B19` | `#F6F3F0` | headlines, figure, tick |
| `text-secondary` | `#2F2C29` | `#E1DEDB` | chip time |
| `text-muted` | `#69635D` | `#B7B0A9` | eyebrows, body, scale, pills |
| `bg-active` | `#DAD4CE` | `#1F1D1B` | iteration pill |
| `data-informational-fg` | `#1B6C84` | `#9EDBF3` | *4 hours* (Exploration) |
| `data-informational-solid` | `#5799B1` | `#4893AC` | *4 hours* (Revision), focus segment |
| `data-navigational-solid` | `#8788CF` | `#8083D3` | meeting segments |
| `data-transactional-solid` | `#46A469` | `#519868` | personal segment |
| `data-commercial-solid` | `#CC8043` | `#B97A4D` | client segment |
| `bg-sunken` | `#EDE8E3` | `#1F1D1B` | open segments |
| `bg-base` | `#FFFFFF` | `#121110` | Redesign card, suggestion fill, veil |
| `nav-bg` | `#FFFFFF` | `#0E0D0C` | Revision card |
| `bg-accent-legible` | `#518CA2` | `#9EDBF3` | suggestion outline |
| `bg-elevated` (veil on ground) | `#F6F3F0` | `#0B0A09` | past veil, tick ring (frames 2–3) |
| `intent-success-bg / -fg` | `#D6EFCB / #246E41` | `#16261A / #B3DFA4` | Redesign pill, live dot |
| `border-subtle` | `#DAD4CE` | `rgba(246,243,240,.14)` | chip hairline |

Type: frames 1–3 are **Aspekta** (variable, bundled in `registry/fonts`);
frame 4 and the pills are **Inter** (Google Fonts, as in the reference demo).

## Deliverables

| File (in `exports/`) | Size |
| --- | --- |
| `daylight-banner-evolution-1600x900-60fps.mp4` | dark · 1600×900 · 60 fps · H.264 CRF 15 |
| `daylight-banner-evolution-light-1600x900-60fps.mp4` | light · same |
| `daylight-banner-evolution-3200x1800.png` | dark still, 2× |
| `daylight-banner-evolution-light-3200x1800.png` | light still, 2× |

## Acceptance

- Seam diff (first vs last frame) **< 0.5**.
- A contact sheet of 8 frames per clip, checked for each beat's state.
- The overview frame matches the Paper artboard: the same four columns at
  the same positions.
- Nothing escapes its frame mid-flight, and no text overflows a card at 2× capture.
