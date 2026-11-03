# 0008 — Curated palette, pinned brand colours, and theme zero's authored role map

**Status:** accepted · 2026-08-03
**Supersedes:** the `PROVISIONAL` palette constants in `resolve.ts`; refines 0006.

## Decision

1. **The palette is a curated two-tier system, approved in the Paper handover:**
   an 11-step warm-grey neutral ramp and five accent ramps (blue, orange,
   lavender, green, red), tone-matched so step numbers track CIE lightness
   (20=L\*26, 40=L\*42, 60=L\*60, 70=L\*72, 80=L\*85, 90=L\*92). Step 40 is the
   AA-safe foreground step; 60–90 are fills and grounds. The ramps live in
   `packages/tokens/src/palette.ts`.

2. **Three brand colours are fixed points:** `#9EDBF3` (blue-80), `#F4BA8E`
   (orange-80, L\*80 — deliberately 5 under its anchor), `#A5AAF6`
   (lavender-70). The ramp bends to them, never the reverse. Re-toning them to
   the grid was tried and reverted: it erased the identity *and* lowered label
   contrast on every primary control.

3. **Intent and categorical data hues are the ramps' step 40** — curated, not
   accent-derived, exactly as 0006(a) requires; `legibleOn` still re-tones them
   per brand background.

4. **Theme zero carries an authored role map** (`ZERO_AUTHORED`): for
   Diorama's own theme the approved design is the source of truth and the
   derivation is its approximation. The map is applied through an `@internal`
   resolver option, layered *before* the completeness check and contrast
   audit, so both guarantees hold over the merged result. It is **not** a
   brand-author surface — brand themes remain plain `ThemeSeed` JSON and the
   per-token-override prohibition of 0006(d) stands unchanged. Where the
   derivation and the authored map disagree, narrowing that gap is standing
   engineering work; roles the derivation already gets right are not pinned.

5. **Two authored departures the derivation must not "fix":**
   - *Light elevation separates by warm tint + shadow, not lightness* —
     `bg-elevated` (neutral-95) is darker than `bg-surface` (neutral-98). The
     "elevated is never darker" invariant remains true for the derived path.
   - *The dark ground is the warm mid-grey neutral-20* (`#423E3A`) — a
     deliberate identity choice from the handover's dark portal, not a missed
     "true dark".

## Why

The seven-colour seed with full derivation (0006) is the right model for
client brands — it is what makes theming complete and safe. It is the wrong
model for Diorama's own identity, which was designed as specific values, three
of which are non-negotiable. Pretending the derivation produced them would
either contort the derivation around one theme or silently overwrite the brand
— the second of which actually happened during the tonal-parity pass and had
to be reverted.

## Amendment — 2026-11-03: the dark scheme is warm ink

**Supersedes point 5's second bullet.** The dark ground is no longer the
mid-grey neutral-20. Approved in Paper after four rounds of directions
(`Theme - Dark directions`: boards *Round 4 — B4 Draft, tuned* and
*Round 4 — Test layout, Guidelines*,
https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-10-0).

**Why the mid-grey went.** It inverted elevation: the page (`#423E3A`) sat
*lighter* than the cards on it (`#2F2C29`, 1.31:1), so every dark ramp built
up from the page ran the wrong way at its first rung. Primary ink on the page
was 9.59:1 and the intent grounds were muddy — warning ink on its ground
4.92:1.

**Why not plain near-black.** The first near-black candidate, `#0B0A09`, read
as generic black: OKLCH chroma 0.003, half the light paper's. Colourfulness
falls with luminance (the Hunt effect), so the warmth that identifies Diorama
in light was literally not on screen.

**What it is.** A second ramp, `DARK` in `palette.ts`, keyed by rounded CIE L\*
and carrying ~0.0075 chroma at hue 67 — half again NEUTRAL's 0.005, which is
what keeps the warmth visible this close to black. Grounds go UP from the
page, as light's go away from it: page L\* 6, rail 9, surface 10, elevated 16,
and the field a shallow well at 5. The inks are the scheme's own steps (97 / 84 / 66 / 59 /
38). Primary ink measures 17.18:1 on the page and 16.05:1 on a surface; muted
6.56:1 on a surface; `border-control` 4.59:1 on the page; warning ink on its
ground 7.93:1.

**Moved with it, from the approved boards:** link and focus are blue-80 (the
mid-grey page needed blue-70); danger ink is red-70 (red-80 read as neutral
pink near black); categorical solids are the 70 steps; the accent wash is
0.10 / 0.16 (was 0.16 / 0.24, which reads twice as blue on near-black); intent
grounds are composited over the surface at 16% rather than over the page at
18%; and `--ui-bg-emphasis` inverts to paper in dark, because neutral-0 is now
the surface itself (1.00:1) and the tooltip chip vanished.

**Where the code departs from the boards, and why.**

- Hover, active and selected are opaque steps (`DARK[18]`, `[20]`, `[17]`)
  instead of the boards' 5% wash: the chrome control rests on `elevated` and
  hovers on `bg-hover`, and a wash under the raise reads as the control going
  dark under the pointer — the fill-stack invariant.
- **`bg-sunken` is a FILL in dark, not a recess** (`#383531`, above the
  surface). The boards drew it only on a Table, where a recess reads. Near
  black there is no room below the page: the drawn depth measured 1.03:1 on it,
  and every page-level use — Skeleton, the Progress track, the neutral Banner,
  EmptyState's tile, Thumbnail and AspectRatio placeholders — disappeared. A
  fill reads on the page (1.50), a surface (1.41) and a menu (1.22), carries
  muted ink at 4.67:1, and agrees with the intent fills, which sit above the
  page too. It is one step above `border-subtle` so DotPattern's dots and a
  neutral Badge's outline still read on it (1.12; light 1.16 — the first fill
  tried, `#33302D`, measured 1.04 and the dots vanished). Avatars and neutral
  badges in a Table therefore read as chips, not wells.

- `border-default` sits one step further out than drawn (`#45423E`, not
  `#3E3A36`): DotPattern's strong opt-in is border-default on the sunken fill,
  and at the drawn value it measured 1.08:1 there — fainter than the 1.12:1
  default it exists to outdo. Now 1.22:1; the border stack still orders (1.84:1
  on the page, between subtle 1.34 and control 4.59).

The page field is exactly the drawn `#120F0C`; see 0017's amendment of the
same date.

**Unchanged:** point 5's first bullet, and the light scheme — the resolved
light theme was diffed before and after and no value moved. 65 dark roles did.
