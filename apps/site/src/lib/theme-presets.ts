import { THEME_ZERO, type ThemeSeed } from "@bydiorama/tokens";

// Approved Paper seeds, recorded in docs/site-design-brief.md §5.5.
// These are brand inputs; component styling still uses semantic roles.
export const themePresets: Record<string, ThemeSeed> = {
  graphite: {
    colors: { bg: "#F3F3F2", surface: "#F8F8F7", muted: "#E7E7E6", textPrimary: "#3B3B3A", textMuted: "#6A6A69", border: "#D9D9D8", accent: "#585857" },
    dark: { bg: "#1E1E1E", surface: "#252525", muted: "#2B2B2B", textPrimary: "#D4D4D3", textMuted: "#9A9A99", border: "#3A3A3A", accent: "#C4C4C3" },
    shape: { radiusPx: { sm: 4, md: 6, lg: 12, xl: 16, "2xl": 24 }, shadow: "none" },
  },
  hockney: {
    colors: { bg: "#FFFFFF", surface: "#FAEBE6", muted: "#F5DED7", textPrimary: "#1D1D1F", textMuted: "#6E6E73", border: "#E6E3E1", accent: "#1672C4" },
    dark: { bg: "#0E1620", surface: "#15202C", muted: "#1C2836", textPrimary: "#F2F1EE", textMuted: "#A3A9B1", border: "#2A3644", accent: "#5CB8F0" },
    shape: { controlShape: "full", radiusPx: { sm: 6, md: 12, lg: 20, xl: 28, "2xl": 36 }, shadow: "subtle" },
  },
  // The home page's look switch (Paper, Home v2): Mono is ink on paper with
  // no chroma and square-ish corners; Soft is a warm grey with rounder
  // corners and a quiet stone accent.
  mono: {
    colors: { bg: "#FFFFFF", surface: "#FAFAFA", muted: "#F0F0F0", textPrimary: "#0A0A0A", textMuted: "#666666", border: "#E3E3E3", accent: "#111111" },
    dark: { bg: "#0A0A0A", surface: "#131313", muted: "#1E1E1E", textPrimary: "#F4F4F4", textMuted: "#A3A3A3", border: "#2C2C2C", accent: "#F4F4F4" },
    shape: { radiusPx: { sm: 3, md: 5, lg: 8, xl: 12, "2xl": 16 }, shadow: "none" },
  },
  soft: {
    colors: { bg: "#F7F5F2", surface: "#FBFAF8", muted: "#EDE9E4", textPrimary: "#2B2724", textMuted: "#6F6861", border: "#E2DCD5", accent: "#B7B0A9" },
    dark: { bg: "#1C1A18", surface: "#24211F", muted: "#2D2A27", textPrimary: "#EFEBE6", textMuted: "#A8A099", border: "#3A3633", accent: "#B7B0A9" },
    shape: { radiusPx: { sm: 8, md: 12, lg: 18, xl: 24, "2xl": 32 }, shadow: "subtle" },
  },
  stress: { ...THEME_ZERO, colors: { ...THEME_ZERO.colors, accent: "#FFF2A6" }, dark: { ...THEME_ZERO.dark!, accent: "#FFF2A6" } },
};
