/**
 * Theme zero — Diorama's own look.
 *
 * Note what this file is NOT: a special case. Diorama's identity is expressed
 * as an ordinary seed, resolved by the same code path as any client brand. That
 * is what guarantees the system stays honest — if theming breaks for clients, it
 * breaks for us first.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PROVISIONAL VALUES.                                                     │
 * │ The redesign's palette and type choices are still being drawn in Paper. │
 * │ These neutrals exist so the pipeline is runnable and testable end to    │
 * │ end; every colour below is expected to be replaced wholesale. Only the  │
 * │ SHAPE of this file is settled.                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import type { ThemeSeed } from "../seed.ts";

export const THEME_ZERO: ThemeSeed = {
  colors: {
    bg: "#fbfbfa",
    surface: "#ffffff",
    muted: "#f2f2f0",
    textPrimary: "#141416",
    textMuted: "#5f5f66",
    border: "rgba(20, 20, 22, 0.1)",
    accent: "#1f2937",
  },

  // Authored rather than derived (ADR 0006(b)) — this is what makes the app's
  // dark mode exact instead of approximated.
  dark: {
    bg: "#0e0e10",
    surface: "#161619",
    muted: "#1e1e22",
    textPrimary: "#f4f4f5",
    textMuted: "#a1a1aa",
    border: "rgba(255, 255, 255, 0.12)",
    accent: "#d4d4d8",
  },

  typography: {
    baseSize: 16,
    ratio: 1.2,
    // Aspekta is the system's single typeface (ADR 0007) — body and display
    // differ by weight and scale, not by family. The roles stay separate
    // tokens so brand themes (and any future face change) override cleanly.
    fontBody: "Aspekta, ui-sans-serif, system-ui, sans-serif",
    fontDisplay: "Aspekta, ui-sans-serif, system-ui, sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  shape: {
    radiusPx: { sm: 6, md: 10, lg: 16, pill: 999 },
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
