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
  stress: { ...THEME_ZERO, colors: { ...THEME_ZERO.colors, accent: "#FFF2A6" }, dark: { ...THEME_ZERO.dark!, accent: "#FFF2A6" } },
};
