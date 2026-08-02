export {
  BRANDABLE_TOKENS,
  SCHEME_ONLY_TOKENS,
  FIXED_TOKENS,
  CONTRAST_PAIRS,
} from "./contract.js";

export type {
  BrandableToken,
  SchemeOnlyToken,
  FixedToken,
  TokenName,
  ResolvedTheme,
} from "./contract.js";

// Phase 1 adds here:
//   - the DTCG-shaped token source and its generators (CSS, TS, Tailwind theme,
//     Paper/Figma payloads)
//   - `resolveTheme(seed, { scheme })`, total over BRANDABLE_TOKENS
//   - the contrast audit over CONTRAST_PAIRS
// See docs/ui-design-system-plan.md §4.2 in bydiorama/service-portal.
