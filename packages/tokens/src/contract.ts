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
  // The accent, adjusted until it CARRIES MEANING at 3:1 against a neutral
  // well. The brand accent is a pale blue by design, which is right for a
  // resting fill and wrong for anything that conveys a value: a progress fill,
  // a slider fill and a switch's on-track each measured ~1.2-1.5:1 against
  // their track and each failed SC 1.4.11 separately before this existed.
  "--ui-bg-accent-legible",
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

  // Borders and focus. Four structural weights plus focus (ADR 0010):
  // subtle is the everyday hairline (inputs included — the field is identified
  // by fill, label and padding); control is the SC 1.4.11-conformant boundary
  // for engagements that require it on form controls.
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
] as const;
