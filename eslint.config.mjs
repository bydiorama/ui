// @ts-check
import tseslint from "typescript-eslint";

/**
 * Boundary rules for distributed source.
 *
 * These encode CONVENTIONS.md §7 and §9 as lint rather than prose, because a
 * boundary that is only written down is a boundary agents cross. Each entry
 * carries its own message: a rule that explains itself gets fixed correctly,
 * one that just fails gets worked around.
 */
const registryBoundaries = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "lucide-react",
          message: "griddy-icons only (ledger/decisions/0004). Missing glyph? File it against the icon set.",
        },
        {
          name: "@heroicons/react",
          message: "griddy-icons only (ledger/decisions/0004).",
        },
        {
          name: "@radix-ui/react-icons",
          message: "griddy-icons only (ledger/decisions/0004).",
        },
        {
          name: "next/link",
          message: "No framework imports in distributed source. Accept a `render` slot so the app supplies its own Link (CONVENTIONS.md §9).",
        },
        {
          name: "next/image",
          message: "No framework imports in distributed source (CONVENTIONS.md §9).",
        },
        {
          name: "next/navigation",
          message: "No framework imports in distributed source (CONVENTIONS.md §9).",
        },
      ],
      patterns: [
        {
          group: ["next/*", "next"],
          message: "No framework imports in distributed source (CONVENTIONS.md §9).",
        },
        {
          group: ["*/paraglide/*", "@/paraglide*"],
          message: "No i18n runtime in components — every user-visible string is a prop (CONVENTIONS.md §9).",
        },
        {
          group: ["@supabase/*"],
          message: "No data layer in components — pass data in as props (CONVENTIONS.md §9).",
        },
        {
          group: ["motion-plus", "motion-plus/*"],
          message: "Motion+ is a paid entitlement and must not be distributed (ledger/decisions/0005).",
        },
      ],
    },
  ],
};

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "r/**", "registry.json", "storybook-static/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["registry/**/*.{ts,tsx}"],
    rules: registryBoundaries,
  },
  {
    // Scripts are dependency-free Node, not distributed source.
    files: ["scripts/**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
