# Spec — library showcase (2026-11-05)

**Request:** a new showcase video for the library, using the motion skills, inspired by Stageshow (benji.org/stageshow, github.com/benjitaylor/skills). The references were a presence dashboard with named cursors and Stageshow's control collage.

**Decisions:** see `library-showcase/docs/storyboard.md`. In short: a collage of single components with no app chrome; the real `:root` tokens inlined; components at 1.5×; the library's DotGrid ground; one unnamed cursor (originally three named ones, removed in review 2); one action leading at a time; the reset as an in-place reverse stagger.

**Passes**
1. First layout left the bottom-right and bottom-centre empty, and the send button stretched. Fixed by rebalancing the columns (calendar to column B, a members table bleeding right), centring the stack vertically and correcting the composer selector.
2. Rest points put cursors on controls: Ana on the pause button, Mira and Tomas over cards. All moved onto open ground or gutters.
3. Dark: `bg-media` on a dark card hid the MediaToggle. Moved it onto the artwork, which is its intended use.
4. Tomas's name pill sat on Preview once Published widened the button. His rest point moved into the gutter.

**Review 2 (user):** components should connect to the dot pattern; one cursor and no user indicator; names of notable European designers; the centre felt empty; the bottom-right was empty and the composition should be more compact and contained.
5. Rebuilt as one block on the dot lattice: three 320-wide columns, 16 px gutters, every edge on a dot, and every column ending at y 760. Preview and Publish each take half the row. The calendar fills its column and gained a footer that follows the picked date. The media card is vertical. The members table fills the right column: Dieter Rams, Wim Crouwel, Ladislav Sutnar, Adrian Frutiger, Otl Aicher, Massimo Vignelli, Anni Albers, Karel Martens.
6. One cursor runs every beat; the loop is now 16 s. The toast first cut a row in half, so the rows are now 54 px and the toast (112 px, with a View release action) covers exactly the last two.

**Final:** 2 × 960 frames, 1600×1200, 60 fps, H.264 CRF 15. Seam 0.213 light / 0.192 dark. Poster stills at 12.4 s, 3200×2400, cursors hidden.

**Not verified:** a portrait or 4:5 cut (not made); the film on a phone-width page; per-frame pixel comparison against the React components. Geometry comes from source specs, not a side-by-side render.

**Reproduce:** `library-showcase/README.md`.
