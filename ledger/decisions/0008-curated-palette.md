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
