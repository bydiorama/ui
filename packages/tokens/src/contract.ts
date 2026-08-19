/**
 * The token contract.
 *
 * This file answers one question precisely: **what must a resolved theme
 * contain?** It exists because the previous generation of brand theming in
 * service-portal re-bound only seven semantic tokens, so any component using
 * one of the other ~90 silently kept Diorama's colours inside a client's
 * branded portal. The fix is not "remember to derive more tokens" — it is
 * making the set enumerable, so a resolver that misses one fails to type-check
 * instead of failing in a client's browser months later.
 *
 * Each token is classified by how it behaves under theming:
 *
 * - `brandable`   the resolver MUST produce a value for every theme. Missing
 *                 one is a build error.
 * - `schemeOnly`  varies between light and dark, but not between brands.
 * - `fixed`       structural. Identical in every theme and every scheme, so it
 *                 is emitted once at `:root` and never per-theme.
 *
 * Phase 1 builds the resolver against this contract. Adding a token here
 * without teaching the resolver to derive it is intended to break the build.
 */

/** Colour, shape and type roles every theme must supply. */
export const BRANDABLE_TOKENS = [
  // Text
  "--ui-text-primary",
  "--ui-text-secondary",
  "--ui-text-muted",
  "--ui-text-disabled",
  "--ui-text-placeholder",
  "--ui-text-inverse",
  "--ui-text-link",
  "--ui-text-link-hover",
  "--ui-text-on-accent",
  "--ui-text-on-emphasis",
  "--ui-text-on-muted",
  "--ui-text-on-danger-solid",
  // Ink on MEDIA — see the `--ui-bg-media` note below for what that family is.
  //
  // It cannot be `--ui-text-inverse`: inverse resolves as
  // `readableInkOn(textPrimary)`, so in the dark scheme it is near-BLACK. A
  // caption over a photograph would be dark ink on a dark veil in exactly the
  // scheme nobody opens. Media does not invert with the page, so its ink must
  // not either.
  "--ui-text-on-media",
  "--ui-text-on-media-muted",

  // Surfaces
  "--ui-bg-base",
  "--ui-bg-surface",
  "--ui-bg-elevated",
  "--ui-bg-sunken",
  // A form field is RECESSED from whatever contains it — white on a light
  // page, darker than the card in dark. No single existing role does both,
  // because the surface scale inverts between schemes: in dark `bg-base` is
  // the LIGHTEST surface, so a field painted with it vanished into its panel.
  "--ui-bg-field",
  // Fields come in GROUND-AND-STATE pairs (ADR 0017). A field is a well cut
  // from whatever contains it, so the same control needs a different fill on
  // the page than on a chrome surface — an inspector, an island, a sheet — and
  // its DISABLED fill has to be named per ground too. Without that, the
  // recessed field on one ground was literally the disabled field on the
  // other, which is what an editor panel drawn on `bg-elevated` surfaced.
  "--ui-bg-field-disabled",
  "--ui-bg-field-chrome",
  "--ui-bg-field-chrome-disabled",
  "--ui-bg-muted",
  "--ui-bg-overlay",
  "--ui-bg-hover",
  "--ui-bg-active",
  // The fill on a CHOSEN item — a selected tab, a segment. Not hover, not
  // active, and not `sunken`: "recessed" is a RELATIVE role, and the surface
  // scale inverts between schemes, so a fill defined as "darker than the
  // track" has room in light and none in dark. Measured at 1.10:1 against
  // `bg-surface` in dark while Tabs used `bg-sunken` for it, which is where
  // "the selected tab doesn't look contrasted enough" came from. This one
  // steps AWAY from the surface in whichever direction that scheme reads.
  "--ui-bg-selected",
  "--ui-bg-accent",
  // Symmetric with the emphasis triple: a filled control needs all three
  // states as roles, or components reach into the palette for two of them.
  "--ui-bg-accent-hover",
  "--ui-bg-accent-active",
  "--ui-bg-accent-subtle",
  // The same subtle fill, HOVERED. A selected table row is a persistent state
  // that still has to answer the pointer, and neither existing role can do it:
  // `bg-hover` is a neutral and would drop the selection colour on hover, and
  // stepping to `bg-accent` would make one hovered row louder than the button
  // that submits the page. The Table sheet drew it as a raw hex (#C3DBE7) and
  // annotated it "new token" — this is that token. Symmetric with
  // `--ui-intent-danger-bg-hover`, which deepens the danger tint the same way.
  "--ui-bg-accent-subtle-hover",
  // The accent, adjusted until it CARRIES MEANING at 3:1 against a neutral
  // well. The brand accent is a pale blue by design, which is right for a
  // resting fill and wrong for anything that conveys a value: a progress fill,
  // a slider fill and a switch's on-track each measured ~1.2-1.5:1 against
  // their track and each failed SC 1.4.11 separately before this existed.
  "--ui-bg-accent-legible",
  // THE MEDIA FAMILY: the neutral dark ground that pictures are shown on.
  //
  // One role, two uses, and they are the same decision:
  //  - OPAQUE, as the GROUND BEHIND media — an image editor's stage, a
  //    lightbox, a viewer. What sits on it is a photograph, and a photograph
  //    reads truly only against a neutral.
  //  - AT AN ALPHA, as a SCRIM OVER media — `bg-media/72` under a caption.
  //
  // It is deliberately invariant to BOTH the scheme and the brand, which no
  // other surface role in this contract is. The scheme, because a photograph
  // does not invert when the page does. The brand, because the obvious
  // alternative — `--ui-bg-emphasis` — DERIVES FROM THE ACCENT: under a
  // pale-yellow brand seed an editor's stage resolves to #ffe066, and every
  // colour in the picture on it is judged against bright yellow.
  //
  // It is also not `--ui-scrim` (the airy 16% veil behind a modal) and not
  // `--ui-bg-overlay`: both dim things this system drew and can measure. This
  // family covers content the system has never seen.
  "--ui-bg-media",
  // The PALEST GROUND the media SCRIM can produce: the ink above composited at
  // `MEDIA_SCRIM_ALPHA` over white — i.e. the veil over the brightest possible
  // photograph.
  //
  // It exists because contrast over an image is otherwise unmeasurable, and an
  // unmeasurable pair is one nobody measures. Declaring ink against
  // `--ui-bg-media` would overstate it by a factor of three: the ink is opaque
  // and what the reader sees is 72% of it over an unknown picture. This role
  // is that worst case, made opaque so `check:contrast` can do arithmetic on
  // it — and it is the right target for the OPAQUE use too, since ink on the
  // full-strength ground can only measure better. `resolve.test.ts` pins it to
  // the composite so the two cannot drift apart.
  "--ui-bg-media-floor",
  "--ui-bg-emphasis",
  "--ui-bg-emphasis-hover",
  "--ui-bg-emphasis-active",
  "--ui-bg-danger-solid",

  // A three-stop brand spectrum, as a full `linear-gradient(...)` value. It is
  // a background-IMAGE, not a colour, so the Tailwind emitter deliberately
  // mints no utility for it — components reach it with `bg-(image:--ui-...)`.
  // Brandable rather than fixed: a client's portal must not display Diorama's
  // blue-lavender-red, so it is derived by rotating the brand's own accent and
  // only theme zero pins the designed stops.
  "--ui-gradient-brand",

  // The SLIDER's fill: a two-stop ramp along the accent, not the three-stop
  // brand spectrum above. It exists as its own role because the sheet drew the
  // ramp with raw palette steps (blue-80 -> blue-70) that measure 1.24:1 and
  // 1.80:1 against the sunken track in light — under the 3:1 SC 1.4.11 wants
  // from the boundary that shows a slider's value. Both stops are derived from
  // --ui-bg-accent-legible, which is floored at 3:1 against that same well, so
  // the ramp cannot start below the floor whatever the brand seed is.
  "--ui-gradient-accent",

  // Borders and focus. Four structural weights plus focus, ordered by measured
  // contrast: subtle → default → control → strong.
  //
  // WHICH ONE AN EDGE TAKES IS ADR 0010's § "Which token an edge takes", and
  // it is not restated here. It used to be — half of it, in a form that read
  // as "control is the conformant boundary for form controls" while Input
  // ships `subtle` and Checkbox ships `control`. Two half-statements of one
  // decision, in two files, disagreeing: raised by a consumer review that had
  // to reconcile them (2026-08-09). The rule turns on whether the boundary is
  // the only thing identifying the control, which is a property of the
  // drawing rather than of the component's category — so it lives in the
  // decision record, and a component records its own measurement in its doc's
  // contrastPairs where `check:contrast` reads it.
  "--ui-border-subtle",
  "--ui-border-default",
  "--ui-border-control",
  "--ui-border-strong",
  "--ui-border-focus",
  "--ui-focus-ring-color",
  "--ui-focus-ring",

  // Intents — meaning-bearing, re-toned per theme for legibility
  "--ui-intent-success-fg",
  "--ui-intent-success-bg",
  "--ui-intent-warning-fg",
  "--ui-intent-warning-bg",
  "--ui-intent-danger-fg",
  "--ui-intent-danger-bg",
  // The danger *surface* pattern (subtle fill + its own border and ink), as
  // drawn for the danger button. Its ink is deeper than -fg because a control
  // label carries more weight than alert prose.
  "--ui-intent-danger-bg-hover",
  "--ui-intent-danger-border",
  "--ui-text-on-danger-subtle",
  "--ui-intent-info-fg",
  "--ui-intent-info-bg",

  // Categorical data — distinguishable-by-design, NOT derived from the accent
  "--ui-data-informational-fg",
  "--ui-data-informational-bg",
  "--ui-data-informational-solid",
  "--ui-data-commercial-fg",
  "--ui-data-commercial-bg",
  "--ui-data-commercial-solid",
  "--ui-data-transactional-fg",
  "--ui-data-transactional-bg",
  "--ui-data-transactional-solid",
  "--ui-data-navigational-fg",
  "--ui-data-navigational-bg",
  "--ui-data-navigational-solid",

  // Shape
  "--ui-radius-sm",
  "--ui-radius-md",
  "--ui-radius-lg",
  "--ui-radius-xl",
  "--ui-radius-2xl",
  "--ui-radius-full",
  "--ui-border-width",
  "--ui-shadow-sm",
  "--ui-shadow-md",
  "--ui-shadow-lg",
  "--ui-shadow-xl",
  // The same four elevations cast upward, for a surface anchored to the bottom
  // edge of the viewport — a bottom sheet, a docked drawer. A downward shadow
  // there falls off-screen, so the surface reads as having no edge (ADR 0016).
  "--ui-shadow-sm-up",
  "--ui-shadow-md-up",
  "--ui-shadow-lg-up",
  "--ui-shadow-xl-up",

  // Typography — faces plus the roles a theme's base size and ratio drive.
  // These are brandable so a themed surface stops needing its own parallel
  // type scale, which is what forced portal components to bypass the library.
  // Aspekta is the only face (ADR 0007) and there is no monospace counterpart
  // (ADR 0011) — the two roles differ by weight and scale, not by family.
  "--ui-font-body",
  "--ui-font-display",
  "--ui-text-display-lg",
  "--ui-text-display-md",
  "--ui-text-title-lg",
  "--ui-text-title-md",
  "--ui-text-title-sm",
  "--ui-text-body-lg",
  "--ui-text-body-md",
  "--ui-text-body-sm",
  "--ui-text-label-md",
  "--ui-text-label-sm",
  "--ui-text-caption",
  "--ui-text-button-lg",
  "--ui-text-button-sm",

  // Chrome — the layout surfaces a themed portal legitimately re-skins
  "--ui-nav-bg",
  "--ui-nav-ink",
  "--ui-nav-ink-muted",
  "--ui-nav-ink-disabled",
  "--ui-nav-border",
  "--ui-nav-hover-bg",
  "--ui-nav-active-bg",
  "--ui-nav-active-ink",
  "--ui-nav-width",
  "--ui-nav-rail-width",
  // Overlay widths. They are TOKENS rather than utilities because Tailwind's
  // container scale shares its names with this system's spacing scale, so
  // `max-w-md` silently means 12px here (see check:utilities).
  "--ui-dialog-width-md",
  "--ui-dialog-width-lg",
  "--ui-content-width",
  "--ui-section-gap",
  "--ui-logo-height",
] as const;

/** Varies with light/dark, but never with the brand. */
export const SCHEME_ONLY_TOKENS = [
  "--ui-scrim",
  "--ui-selection-bg",
  "--ui-selection-fg",
] as const;

/** Structural constants. One value, every theme, every scheme. */
export const FIXED_TOKENS = [
  // The base spacing scale (approved handover). The intents below alias onto
  // these steps, so "which pixel values exist" has exactly one answer.
  "--ui-space-xs", "--ui-space-sm", "--ui-space-md", "--ui-space-lg",
  "--ui-space-xl", "--ui-space-2xl", "--ui-space-3xl", "--ui-space-4xl",

  // Spacing intents
  "--ui-space-stack-xs", "--ui-space-stack-sm", "--ui-space-stack-md",
  "--ui-space-stack-lg", "--ui-space-stack-xl", "--ui-space-stack-2xl",
  "--ui-space-inline-xs", "--ui-space-inline-sm", "--ui-space-inline-md", "--ui-space-inline-lg",
  "--ui-space-inset-xs", "--ui-space-inset-sm", "--ui-space-inset-md",
  "--ui-space-inset-lg", "--ui-space-inset-xl",

  // Typography attributes shared across roles (ADR 0009). Sizes are brandable;
  // the weights of the single face, leadings and trackings are structural.
  "--ui-weight-regular", "--ui-weight-book", "--ui-weight-medium",
  "--ui-weight-semibold", "--ui-weight-bold",
  "--ui-leading-flat", "--ui-leading-tight", "--ui-leading-snug",
  "--ui-leading-normal", "--ui-leading-relaxed",
  "--ui-tracking-tight", "--ui-tracking-normal",

  // Motion. Durations collapse under prefers-reduced-motion at this layer, so
  // every CSS-driven animation in the system complies without per-component work.
  "--ui-duration-fast", "--ui-duration-base", "--ui-duration-slow", "--ui-duration-enter",
  "--ui-duration-loop",
  "--ui-ease-default", "--ui-ease-in", "--ui-ease-out", "--ui-ease-spring",
  "--ui-motion-micro", "--ui-motion-standard", "--ui-motion-deliberate", "--ui-motion-choreographed",

  // Interaction constants. Named values so "how much does a button shrink on
  // press" has exactly one answer across the system.
  "--ui-press-scale", "--ui-stagger-step",

  // Hit targets. The floor is conformance; the touch value is the recommended
  // target for primary controls.
  "--ui-hit-area-min", "--ui-hit-area-touch",

  // Measure
  "--ui-measure-prose", "--ui-measure-narrative", "--ui-measure-dense",

  // Stacking
  "--ui-z-below", "--ui-z-base", "--ui-z-dropdown", "--ui-z-sticky",
  "--ui-z-overlay", "--ui-z-modal", "--ui-z-toast", "--ui-z-tooltip",
] as const;

export type BrandableToken = (typeof BRANDABLE_TOKENS)[number];
export type SchemeOnlyToken = (typeof SCHEME_ONLY_TOKENS)[number];
export type FixedToken = (typeof FIXED_TOKENS)[number];
export type TokenName = BrandableToken | SchemeOnlyToken | FixedToken;

/**
 * What `resolveTheme()` returns in Phase 1. Total over the brandable set: a
 * resolver that forgets a token does not compile.
 */
export type ResolvedTheme = Record<BrandableToken, string>;

/**
 * Foreground/background pairs that must clear WCAG AA. The resolver audits
 * these after derivation and reports any it had to adjust, so a brand author
 * is told "we nudged your link colour for legibility" rather than silently
 * shipping either a contrast failure or a colour they did not choose.
 */
export const CONTRAST_PAIRS: ReadonlyArray<readonly [BrandableToken, BrandableToken]> = [
  ["--ui-text-primary", "--ui-bg-base"],
  ["--ui-text-primary", "--ui-bg-surface"],
  ["--ui-text-secondary", "--ui-bg-surface"],
  ["--ui-text-muted", "--ui-bg-surface"],
  // Placeholder is TEXT — WCAG exempts disabled controls, not placeholders.
  // Its absence here let the derived dark value sit at 3.2:1 undetected: the
  // audit only ever looks at pairs it is told about, so an unlisted role is
  // an unchecked role no matter how carefully it is derived.
  ["--ui-text-primary", "--ui-bg-field"],
  ["--ui-text-placeholder", "--ui-bg-field"],
  // The same two, on the OTHER ground a field can be cut from (ADR 0017). A
  // second ground is a second audit: the ink is the same role, the fill is
  // not, and the whole reason the chrome pair exists is that the two grounds
  // measure differently.
  ["--ui-text-primary", "--ui-bg-field-chrome"],
  ["--ui-text-placeholder", "--ui-bg-field-chrome"],
  // Surfaced by check:contrast: every one of these is rendered by a shipped
  // component and none was audited. A component may legitimately put ink on
  // any surface role, so the audit has to cover the cross-product it actually
  // uses, not just the pairs someone happened to think of.
  ["--ui-text-primary", "--ui-bg-elevated"],
  // A hovered chrome control. Hover is a STATE, and a state whose contrast
  // nobody measured is where a 5-10% darker fill quietly falls under AA —
  // `bg-hover` had never been audited against any ink.
  ["--ui-text-primary", "--ui-bg-hover"],
  // The selected day in a Calendar. `accent-subtle` is a fill that carries
  // TEXT here rather than being decoration, and nothing had put ink on it
  // before — so nothing had ever measured it.
  ["--ui-text-primary", "--ui-bg-accent-subtle"],
  ["--ui-text-primary", "--ui-bg-selected"],
  // A TABLE ROW is the first thing to put a full column of secondary and muted
  // ink on a state fill rather than on a resting surface, and every one of
  // these pairs was unlisted. A selected row's Discipline and Year cells are
  // `text-secondary` on the accent wash; a hovered row's are `text-secondary`
  // on `bg-hover`; a pressed row's are on `bg-active`, which no pair had ever
  // named at all. Ink that is legible at rest and not while the pointer is on
  // it is a state nobody measures, because the screenshot is always taken at
  // rest.
  ["--ui-text-secondary", "--ui-bg-accent-subtle"],
  ["--ui-text-secondary", "--ui-bg-accent-subtle-hover"],
  ["--ui-text-primary", "--ui-bg-accent-subtle-hover"],
  ["--ui-text-secondary", "--ui-bg-hover"],
  ["--ui-text-primary", "--ui-bg-active"],
  ["--ui-text-secondary", "--ui-bg-active"],
  // The sortable column header the pointer is on: `bg-hover` is the fill and
  // the label steps to primary ink. The muted resting label sits on
  // `bg-elevated`, which is already listed below.
  ["--ui-text-muted", "--ui-bg-hover"],
  // The grip on a CardSorting row. `elevated` is the only surface a muted ink
  // sits on that was never audited, because nothing had drawn one there.
  ["--ui-text-muted", "--ui-bg-elevated"],
  ["--ui-text-primary", "--ui-bg-sunken"],
  ["--ui-text-secondary", "--ui-bg-elevated"],
  ["--ui-text-secondary", "--ui-bg-base"],
  ["--ui-text-muted", "--ui-bg-base"],
  ["--ui-text-muted", "--ui-bg-sunken"],
  // Second-level nav items. nav-ink and nav-active-ink were already audited;
  // the muted step was not, and Sidebar is the first thing to render it.
  ["--ui-nav-ink-muted", "--ui-nav-bg"],
  ["--ui-text-placeholder", "--ui-bg-base"],
  ["--ui-text-placeholder", "--ui-bg-surface"],
  ["--ui-text-on-muted", "--ui-bg-muted"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis-hover"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis-active"],
  ["--ui-text-on-accent", "--ui-bg-accent"],
  ["--ui-text-link", "--ui-bg-base"],
  // The open month/year trigger in a Calendar header. `text-link` was audited
  // on the page and nowhere else, so the moment anything inked it on a raised
  // surface the audit stopped covering it — and the Calendar panel is
  // `bg-surface`, with `bg-hover` under the pointer.
  ["--ui-text-link", "--ui-bg-surface"],
  ["--ui-text-link", "--ui-bg-hover"],
  // The "browse" control inside an Image Upload dropzone, while a file is
  // being dragged over it: the target washes to `accent-subtle` and the link
  // sits on that wash. Measured 4.82:1 light and 3.37:1 DARK before this pair
  // existed — an unlisted pair is an unchecked pair, and this is the third
  // time that sentence has been earned. Declaring it moves dark's link from
  // blue-70 to a lighter step, which RAISES every other link pair too
  // (6.59:1 on the page, 8.63:1 on a panel). See the ledger.
  ["--ui-text-link", "--ui-bg-accent-subtle"],
  // The same control at rest: the dropzone's well is `elevated`, and link ink
  // had been audited on the page, a panel and a hover fill but never there.
  ["--ui-text-link", "--ui-bg-elevated"],
  ["--ui-text-on-danger-solid", "--ui-bg-danger-solid"],
  ["--ui-text-on-danger-subtle", "--ui-intent-danger-bg"],
  ["--ui-intent-success-fg", "--ui-intent-success-bg"],
  ["--ui-intent-warning-fg", "--ui-intent-warning-bg"],
  ["--ui-intent-danger-fg", "--ui-intent-danger-bg"],
  // A field's error message sits on the PAGE, not on a danger surface — every
  // form component draws one and the pair had never been audited, because the
  // only danger pair anyone thought to list was ink on its own tinted well.
  ["--ui-intent-danger-fg", "--ui-bg-base"],
  ["--ui-intent-info-fg", "--ui-intent-info-bg"],
  ["--ui-nav-ink", "--ui-nav-bg"],
  ["--ui-nav-active-ink", "--ui-nav-active-bg"],
  // The CURRENT row's ink, since 2026-08-10 — muted rather than full strength,
  // on the fill that marks it. Sidebar and NavRail both step the ink back
  // there instead of lifting it, the same two-channel split Header settled:
  // the fill says where you are, the ink says it is the one row not worth
  // pointing at. `--ui-nav-active-ink` above stays listed because the token
  // still exists and a re-skin can still reach for it; this is the pair the
  // two components actually render.
  ["--ui-nav-ink-muted", "--ui-nav-active-bg"],
  // A rail row under the pointer, and the marker on the current one. Both put
  // `nav-ink` on the ACTIVE fill rather than on the rail — the pair the family
  // never had, because Sidebar's hover lifts its ink onto that same fill and
  // nobody listed it. NavRail leans on it harder: with no label to change
  // weight, the marker is the only thing separating current from hover, so an
  // unlisted pair here would be the one measurement that matters going
  // unmeasured. Fifth time that sentence has been earned.
  ["--ui-nav-ink", "--ui-nav-active-bg"],
  // The rail's hover fill. It exists because a 2px left-edge marker was the
  // wrong way to separate current from hover — a rule inside a control reads
  // as clutter, and Menu.Separator had already written the principle down
  // ("SPACE, not a rule"). Depth is the channel that was missing, so depth is
  // what was added, and the new ground carries ink that has to be measured.
  ["--ui-nav-ink", "--ui-nav-hover-bg"],
  // Ink on an image scrim, measured against the palest ground that scrim can
  // produce rather than against the ink it is made of. The sheet drew this
  // pair at 48% with `--ui-text-inverse` and `--ui-neutral-80`, which measure
  // 2.81:1 and 2.11:1 over a white photograph — the caption on a bright image
  // was never readable, in either scheme, and no gate could see it because no
  // token described the ground.
  ["--ui-text-on-media", "--ui-bg-media-floor"],
  ["--ui-text-on-media-muted", "--ui-bg-media-floor"],
] as const;

/**
 * Non-text pairs that must clear WCAG 2.2 SC 1.4.11 (3:1).
 *
 * Deliberately short. Focus indication and the conformant control boundary are
 * the two places where a boundary is the only thing identifying an interactive
 * element. `--ui-border-subtle` and `--ui-border-default` are NOT here — they
 * are quiet by design (ADR 0010), and auto-nudging them would undo the
 * decision; likewise the brand fills, whose identity outranks the grid and
 * whose labels are audited as text above.
 */
export const NONTEXT_CONTRAST_PAIRS: ReadonlyArray<readonly [BrandableToken, BrandableToken]> = [
  ["--ui-border-focus", "--ui-bg-base"],
  // The outline on a lifted CardSorting row, which sits on `elevated` rather
  // than on the page. It is the only thing distinguishing a row the user is
  // holding from one they are not, so 3:1 is the floor it has to clear.
  ["--ui-border-focus", "--ui-bg-elevated"],
  ["--ui-focus-ring-color", "--ui-bg-base"],
  ["--ui-border-control", "--ui-bg-base"],
  ["--ui-border-control", "--ui-bg-surface"],
  // An unlisted pair is an unchecked pair. These went unmeasured until the
  // Checkbox mixed state — whose box is drawn entirely with border-strong —
  // turned out to be invisible on the dark ground.
  ["--ui-border-strong", "--ui-bg-base"],
  ["--ui-border-strong", "--ui-bg-surface"],
  ["--ui-bg-accent-legible", "--ui-bg-sunken"],
  ["--ui-bg-accent-legible", "--ui-bg-base"],
  // The INVALID border on a form field — Input, Select, DatePicker and
  // Textarea all draw it, and none of them had ever declared it, so the one
  // boundary in this library whose whole job is to say "this control is in
  // error" was going unmeasured. It is the SC 1.4.11 case exactly: state
  // conveyed by a boundary against the field's own fill.
  //
  // Note which role it is. `border-danger` resolves to --ui-intent-danger-fg,
  // an INK role used as a boundary, which normally means the role you want
  // does not exist yet. Here it is right and the tidy-looking alternative is
  // wrong: --ui-intent-danger-border measures 1.45:1 light / 1.76:1 dark,
  // because it is the edge of a danger-TINTED SURFACE (a Banner), not the
  // edge of a control in an error state. Names are not guarantees; this pair
  // is in the list so the next person reads a number instead of a name.
  ["--ui-intent-danger-fg", "--ui-bg-field"],
  // Avatar's status dot, against the ring it is drawn with. The dot is a
  // graphical object carrying meaning (SC 1.4.11) and its ONLY visual channel
  // is colour, so what it must clear is the surface immediately around it.
  //
  // Both of these come from the intent family rather than from what the sheet
  // drew, and the neutral one is why the list matters: the sheet's neutral
  // fill was --ui-bg-emphasis-active, which measures 10.34:1 in light and
  // 1.31:1 in DARK — a state indicator that disappears in the scheme nobody
  // opened. Neutral now uses --ui-text-muted, Banner's own neutral ink, which
  // is already audited on this ground a few lines above.
  // Image Edit's crop window: its edge and corner marks are the only thing
  // identifying where the crop falls, so SC 1.4.11 applies. Measured against
  // the media family's FLOOR rather than against the stage at full strength,
  // because the window sits over a photograph and the floor is the guarantee.
  ["--ui-text-on-media", "--ui-bg-media-floor"],
  ["--ui-intent-success-fg", "--ui-bg-surface"],
  ["--ui-intent-danger-fg", "--ui-bg-surface"],
  // The mark on an EmptyState's well. It is `aria-hidden` — the sentence
  // beneath carries the meaning — but a mark nobody can see is a 32px grey
  // square, so it is held to the graphical floor rather than waved through as
  // decoration. `text-secondary` on `sunken` had never been measured: the two
  // inks audited on that well are primary and muted.
  ["--ui-text-secondary", "--ui-bg-sunken"],
  // NOT here: `--ui-bg-accent-legible` against the accent washes. A selected
  // table row was briefly drawn with a 3px leading edge in that role, and
  // listing the pair floored the token against the WASH as well as the sunken
  // well — which darkened the Switch track, the Slider fill, the Progress fill
  // and ImageUpload's, none of which had anything to do with a table. The edge
  // is gone and so is the pair: a pair nothing renders is not a safety net, it
  // is a constraint on every component that does render the role.
  // A focus ring drawn INSIDE a table row. Every ring pair here measured
  // against `bg-base`, and a row is `bg-surface` — one step off the page, and
  // the step is in the direction that costs contrast in light.
  ["--ui-focus-ring-color", "--ui-bg-surface"],
  // Toast's intent glyph, on the toast surface. The glyph is the ONLY channel
  // carrying the toast's type — the fill never tints (the sheet's rule: a
  // tinted stack reads as a traffic light) — so each intent ink is a
  // meaningful graphic against `bg-elevated` (SC 1.4.11) rather than text on
  // an intent-tinted well the way Banner's pairs measure it. `danger-fg` on
  // this ground also covers Toast's Close glyph hover-tint arithmetic, but it
  // is the four glyph inks that were unaudited: elevated is one step off the
  // grounds every intent pair had ever been measured against.
  ["--ui-intent-info-fg", "--ui-bg-elevated"],
  ["--ui-intent-success-fg", "--ui-bg-elevated"],
  ["--ui-intent-warning-fg", "--ui-bg-elevated"],
  ["--ui-intent-danger-fg", "--ui-bg-elevated"],
] as const;
