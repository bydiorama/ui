// @ts-check
/**
 * Diorama boundaries for a consumer app — an ESLint flat-config preset.
 *
 * The library lints its own source against these rules (CONVENTIONS §7, §8,
 * README § Independence); an app built on it needs the same ones, or the
 * first agent that cannot find a glyph in griddy-icons installs lucide.
 * Spread it into your flat config, after the presets it should override:
 *
 *   import diorama from "./eslint.diorama.mjs";
 *   export default [
 *     ...yourPresets,
 *     ...diorama,
 *   ];
 *
 * Already setting `no-restricted-imports` yourself? ESLint does not merge a
 * rule's options across config objects — the later object REPLACES the
 * earlier one. Build yours from the exported lists instead:
 *
 *   import { restrictedImports } from "./eslint.diorama.mjs";
 *   rules: { "no-restricted-imports": ["error", {
 *     paths: [...restrictedImports.paths, ...mine],
 *     patterns: [...restrictedImports.patterns],
 *   }] }
 *
 * WHY PACKAGE NAMES ARE `paths`, NOT `patterns`. A `patterns` entry is
 * gitignore syntax: a name with no slash in it matches at ANY depth. The
 * first consumer listed `"motion"` there and it also matched `@/lib/motion`
 * — Diorama's own motion recipes, which every installed component imports.
 * Exact package names go in `paths`; `patterns` only holds entries with a
 * slash in the middle (`@mui/*`, `motion/react*`), which gitignore anchors
 * to the start of the specifier.
 *
 * Dependency-free on purpose: plain objects, no plugin, so it works with any
 * flat config (typescript-eslint, plain espree, a framework preset).
 * Installed from bydiorama/ui as the `eslint-preset` registry item.
 */

const ICONS = "griddy-icons only (Diorama CONVENTIONS §7, ADR 0004). Missing a glyph? Use the nearest one and record the gap.";
const COMPONENTS =
  "Build on Diorama (`@/ui`) and its behaviour layer, Base UI — no second component library or design language (Diorama README § Independence, ADR 0002).";
const MOTION =
  "CSS first: Diorama components animate themselves from the motion tokens, product motion is CSS transitions (CONVENTIONS §8). A JS runtime only for layout/shared-element, gesture, velocity springs or interruptible sequences — then `motion/mini`'s animate(), never <motion.*> (ADR 0018).";

/** @type {{ name: string, message: string }[]} */
const paths = [
  // Icon sets whose root is a bare name (scoped sets are patterns below).
  { name: "lucide-react", message: ICONS },
  { name: "@radix-ui/react-icons", message: ICONS },
  { name: "react-icons", message: ICONS },
  { name: "react-feather", message: ICONS },
  { name: "@iconify/react", message: ICONS },
  // Component libraries and design languages whose root is a bare name.
  { name: "antd", message: COMPONENTS },
  { name: "react-bootstrap", message: COMPONENTS },
  { name: "react-aria-components", message: COMPONENTS },
  // Motion runtimes. Bare names: `motion` must never be a pattern (see above).
  { name: "framer-motion", message: MOTION },
  { name: "motion", message: MOTION },
  { name: "gsap", message: `${MOTION} GSAP is not MIT — adopting it is a licensing decision (ADR 0005).` },
];

/** @type {{ group: string[], message: string }[]} */
const patterns = [
  {
    group: ["@heroicons/*", "react-icons/*", "@fortawesome/*", "@phosphor-icons/*", "@tabler/*"],
    message: ICONS,
  },
  {
    group: [
      "@radix-ui/*",
      "!@radix-ui/react-icons",
      "@mui/*",
      "@chakra-ui/*",
      "@headlessui/*",
      "@mantine/*",
      "@nextui-org/*",
      "@heroui/*",
      "@ark-ui/*",
      "antd/*",
      "react-bootstrap/*",
    ],
    message: COMPONENTS,
  },
  { group: ["framer-motion/*", "motion/react*", "gsap/*"], message: MOTION },
];

export const restrictedImports = { paths, patterns };

/** @type {import("eslint").Linter.Config[]} */
const preset = [
  {
    name: "diorama/boundaries",
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-imports": ["error", restrictedImports],
    },
  },
];

export default preset;
