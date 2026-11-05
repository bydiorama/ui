# Library showcase — storyboard

A seamless 16-second loop of `@bydiorama/ui` components set as one compact
block on the dot ground, worked by a single cursor. Inspired by Stageshow
(benji.org/stageshow): its control collage (segmented, switch, search,
checklist, button, slider, select, avatars cropped by the frame), its bento
rules and its loop resets.

## Decisions

| Decision | Why |
| --- | --- |
| A collage of single components, not windows | Stageshow bento rule 3: a UI tile shows one thing. The library *is* the components, so no app chrome at all |
| Real tokens, embedded verbatim | The `:root` block of `apps/storybook/styles/tokens.generated.css` is inlined; light/dark is `color-scheme`, exactly as consumers get it |
| Components drawn at 1.5× (design canvas 1067×800 → 1600×1200) | Close-up, like Stageshow's collage; at 1× a 32px control is a sliver in an article frame |
| Ground = `DotGrid` recipe (16px gap, 2px dot, `border-subtle` ink) on `bg-elevated` / `bg-base` | The library's own dot pattern, not an invented texture |
| One block, x 40–1032 · y 40–760, three 320-wide columns, 16 px gutters, edges on dots at 8 + 16n (design px) | Review 2: connect the components to the dot pattern; more compact and contained, no empty corners |
| One cursor, no name tag, the macOS arrow | Review 2: remove the multiple cursors and the user indicator |
| No captions or logos outside the UI | ui-motion-media art direction |
| One action at a time | Stageshow bento rule 11: motion needs one place to lead |
| Reset = in-place reverse stagger while the cursor leaves | Stageshow loops: undo in place, last change first, ~80 ms apart |

## Beats (as built — `T` in source/timeline.js)

| t (s) | Beat | Payoff |
| --- | --- | --- |
| 0.00–0.45 | Calm opening frame | Works as a still |
| 1.25–1.87 | Click Search, type “Docs” | Field focuses, row highlights |
| 2.55 | Tick Docs | Release 2.4 rolls 50 → 75 % |
| 3.35–4.55 | Drag Slider 40 → 72 | Value follows the thumb |
| 5.20 | Switch on | Thumb travels, track fills |
| 5.90 | Tabs Week → Month | Selected fill crossfades |
| 6.85 | Pick the 24th | Selection moves; footer “Wed, 18 Nov” → “Tue, 24 Nov” |
| 7.85–8.90 | Open Select, pick Monthly | Panel opens and closes, check moves |
| 9.75–11.15 | Publish → busy → Published | Toast covers exactly the last two table rows (11.25) |
| 12.15–13.55 | Cursor rests on a gutter dot, payoff holds | Poster still at 12.4 s |
| 13.55–14.40 | Toast leaves, reverse stagger 80 ms apart, cursor fades | Frame 0 again |
| 14.40–16.00 | Calm frame into the seam | |

Measured: seam diff 0.213 light / 0.192 dark (threshold 0.5).
