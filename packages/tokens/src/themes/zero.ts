/**
 * Theme zero — Diorama's own look.
 *
 * APPROVED VALUES (Paper handover, 2026-08-03; ADR 0008). The provisional
 * neutrals are gone: the seed below is the approved warm-grey ramp and the
 * brand blue, and `ZERO_AUTHORED` pins every semantic colour role to its
 * approved ramp step.
 *
 * Why an authored map exists at all: for Diorama's own theme, the *design* is
 * the source of truth and the resolver's derivation is an approximation of it.
 * Client brand themes take the pure-derivation path from an ordinary seed —
 * which keeps the honesty rule (if theming breaks for clients it breaks for
 * us first) because both paths share the same contract, completeness check
 * and contrast audit. See ADR 0008 for the boundary: `authored` is not a
 * brand-author surface.
 */

import { BLUE, GREEN, LAVENDER, NEUTRAL, ORANGE, RED } from "../palette.ts";
import type { ResolvedTheme } from "../contract.ts";
import type { ThemeSeed } from "../seed.ts";

export const THEME_ZERO: ThemeSeed = {
  colors: {
    bg: NEUTRAL[100],
    surface: NEUTRAL[98],
    muted: NEUTRAL[90],
    textPrimary: NEUTRAL[0],
    textMuted: NEUTRAL[40],
    border: NEUTRAL[80],
    accent: BLUE[80], // #9EDBF3 — THE brand colour.
  },

  // Authored rather than derived (ADR 0006(b)). The dark ground is the warm
  // mid-grey neutral-20 — a deliberate identity choice from the handover's
  // dark portal, not an oversight (ADR 0008).
  dark: {
    bg: NEUTRAL[20],
    surface: NEUTRAL[10],
    muted: NEUTRAL[10],
    textPrimary: NEUTRAL[95],
    textMuted: NEUTRAL[70],
    border: "rgba(246, 243, 240, 0.14)",
    accent: BLUE[80],
  },

  typography: {
    baseSize: 16,
    // Aspekta is the system's single typeface (ADR 0007) — body and display
    // differ by weight and scale, not by family. The scale itself is the
    // authored table in resolve.ts (ADR 0009).
    fontBody: "Aspekta, ui-sans-serif, system-ui, sans-serif",
    fontDisplay: "Aspekta, ui-sans-serif, system-ui, sans-serif",
  },

  shape: {
    radiusPx: { sm: 4, md: 8, lg: 16, xl: 24, "2xl": 32, pill: 999 },
    borderWidthPx: 1,
    shadow: "standard",
  },

  chrome: {
    navStyle: "page",
    contentWidthPx: 880,
    sectionGap: "4rem",
    logoHeight: "2rem",
  },
};

/**
 * The approved semantic mapping — role → ramp step, exactly as the handover
 * sheet draws it. Colour roles only: type sizes, radii, chrome and shadows
 * derive correctly from the seed already.
 */
export const ZERO_AUTHORED: { light: Partial<ResolvedTheme>; dark: Partial<ResolvedTheme> } = {
  light: {
    // Text
    "--ui-text-primary": NEUTRAL[0],
    "--ui-text-secondary": NEUTRAL[10],
    "--ui-text-muted": NEUTRAL[40],
    "--ui-text-placeholder": NEUTRAL[40],
    "--ui-text-disabled": NEUTRAL[70],
    "--ui-text-inverse": NEUTRAL[95],
    "--ui-text-link": BLUE[40],
    "--ui-text-link-hover": BLUE[20],
    "--ui-text-on-accent": NEUTRAL[0],
    "--ui-text-on-emphasis": NEUTRAL[100],
    "--ui-text-on-muted": NEUTRAL[0],
    "--ui-text-on-danger-solid": NEUTRAL[100],

    // Surfaces. Elevation separates by warm tint + shadow, not lightness —
    // the sheet's "ascending visual weight" reading (ADR 0008).
    "--ui-bg-base": NEUTRAL[100],
    "--ui-bg-surface": NEUTRAL[98],
    "--ui-bg-elevated": NEUTRAL[95],
    "--ui-bg-sunken": NEUTRAL[90],
    "--ui-bg-field": NEUTRAL[100],
    // Theme zero AUTHORS bg-elevated as neutral-95, while the derivation
    // shifts surface lighter — so the aliased nav fill has to be pinned too,
    // or it lands nearly white and the current item disappears.
    "--ui-nav-active-bg": NEUTRAL[95],
    "--ui-gradient-brand": `linear-gradient(in oklab 270deg, ${BLUE[80]} 0%, ${LAVENDER[80]} 50%, ${RED[80]} 100%)`,
    // The slider ramp exactly as the sheet draws it. Pinned in BOTH schemes
    // because the design is the same sweep on either ground.
    "--ui-gradient-accent": `linear-gradient(in oklab 90deg, ${BLUE[80]} 50%, ${BLUE[70]} 100%)`,
    "--ui-bg-muted": NEUTRAL[90],
    "--ui-bg-overlay": NEUTRAL[80],
    "--ui-bg-hover": NEUTRAL[90],
    "--ui-bg-active": NEUTRAL[80],
    // The value the sheet already draws for a selected tab. Pinned so the
    // light drawing is unchanged; only dark, which was derived and unreadable,
    // moves. Dark is left to derivation, which now steps the right way.
    "--ui-bg-selected": NEUTRAL[90],
    "--ui-bg-accent": BLUE[80],
    "--ui-bg-accent-hover": BLUE[70],
    "--ui-bg-accent-active": BLUE[60],
    "--ui-bg-accent-subtle": BLUE[90],
    // NOT pinned to a palette step: blue-60 measures under 3:1 on the sunken
    // well and the audit rejected it. The derivation floors the brand accent
    // at 3:1 instead, which is the whole point of the role.
    "--ui-bg-emphasis": NEUTRAL[0],
    "--ui-bg-emphasis-hover": NEUTRAL[10],
    "--ui-bg-emphasis-active": NEUTRAL[20],
    "--ui-bg-danger-solid": RED[40],

    // Borders (ADR 0010)
    "--ui-border-subtle": NEUTRAL[80],
    "--ui-border-default": NEUTRAL[70],
    "--ui-border-control": NEUTRAL[60],
    "--ui-border-strong": NEUTRAL[40],
    "--ui-border-focus": BLUE[40],
    "--ui-focus-ring-color": BLUE[40],
    "--ui-focus-ring": `0 0 0 2px ${NEUTRAL[100]}, 0 0 0 4px ${BLUE[40]}`,

    // Intents — fg on step 40, ground on step 90
    "--ui-intent-success-fg": GREEN[40],
    "--ui-intent-success-bg": GREEN[90],
    "--ui-intent-warning-fg": ORANGE[40],
    "--ui-intent-warning-bg": ORANGE[90],
    "--ui-intent-danger-fg": RED[40],
    "--ui-intent-danger-bg": RED[90],
    "--ui-intent-danger-bg-hover": RED[80],
    "--ui-intent-danger-border": RED[80],
    "--ui-text-on-danger-subtle": RED[20],
    "--ui-intent-info-fg": BLUE[40],
    "--ui-intent-info-bg": BLUE[90],

    // Categorical data — fg 40, ground 90, solid 60
    "--ui-data-informational-fg": BLUE[40],
    "--ui-data-informational-bg": BLUE[90],
    "--ui-data-informational-solid": BLUE[60],
    "--ui-data-commercial-fg": ORANGE[40],
    "--ui-data-commercial-bg": ORANGE[90],
    "--ui-data-commercial-solid": ORANGE[60],
    "--ui-data-transactional-fg": GREEN[40],
    "--ui-data-transactional-bg": GREEN[90],
    "--ui-data-transactional-solid": GREEN[60],
    "--ui-data-navigational-fg": LAVENDER[40],
    "--ui-data-navigational-bg": LAVENDER[90],
    "--ui-data-navigational-solid": LAVENDER[60],
  },

  // From the handover's dark portal: ramp-80 inks on translucent ramp-60
  // grounds, brand blue as both accent and link.
  dark: {
    // Recessed from the card, matching the dark portal in the sheet: the
    // field reads as a well, not as another panel.
    "--ui-bg-field": NEUTRAL[0],
    "--ui-gradient-brand": `linear-gradient(in oklab 270deg, ${BLUE[80]} 0%, ${LAVENDER[80]} 50%, ${RED[80]} 100%)`,
    // The slider ramp exactly as the sheet draws it. Pinned in BOTH schemes
    // because the design is the same sweep on either ground.
    "--ui-gradient-accent": `linear-gradient(in oklab 90deg, ${BLUE[80]} 50%, ${BLUE[70]} 100%)`,
    "--ui-text-link": BLUE[70],
    "--ui-text-link-hover": BLUE[80],
    "--ui-text-on-accent": NEUTRAL[0],
    "--ui-bg-emphasis": NEUTRAL[0],
    "--ui-bg-emphasis-hover": NEUTRAL[10],
    "--ui-bg-emphasis-active": NEUTRAL[20],
    "--ui-bg-accent": BLUE[80],
    "--ui-bg-accent-hover": BLUE[70],
    "--ui-bg-accent-active": BLUE[60],
    "--ui-bg-accent-subtle": "rgba(158, 219, 243, 0.16)",
    "--ui-bg-accent-legible": BLUE[80],
    "--ui-border-focus": BLUE[70],
    "--ui-focus-ring-color": BLUE[70],
    "--ui-focus-ring": `0 0 0 2px ${NEUTRAL[20]}, 0 0 0 4px ${BLUE[70]}`,
    "--ui-intent-success-fg": GREEN[80],
    "--ui-intent-success-bg": "rgba(70, 164, 105, 0.18)",
    "--ui-intent-warning-fg": ORANGE[80],
    "--ui-intent-warning-bg": "rgba(204, 128, 67, 0.18)",
    "--ui-intent-danger-fg": RED[80],
    "--ui-intent-danger-bg": "rgba(212, 116, 74, 0.18)",
    "--ui-intent-danger-border": "rgba(212, 116, 74, 0.36)",
    "--ui-text-on-danger-subtle": RED[80],
    "--ui-intent-info-fg": BLUE[80],
    "--ui-intent-info-bg": "rgba(87, 153, 177, 0.18)",
    "--ui-data-informational-fg": BLUE[80],
    "--ui-data-commercial-fg": ORANGE[80],
    "--ui-data-transactional-fg": GREEN[80],
    "--ui-data-navigational-fg": LAVENDER[80],
  },
};

/** Theme zero, resolved the approved way. */
export const resolveZeroPairOptions = { authored: ZERO_AUTHORED } as const;
