export const SITE_CATEGORIES = [
  "Actions", "Forms", "Navigation", "Overlays", "Display", "Feedback",
  "Media", "Data", "Conversation", "Utilities",
];

export const isPublicItem = item =>
  ["ui", "block"].includes(item.type) && ["stable", "experimental"].includes(item.status);

// Growth metrics do not belong in public copy, whether typed or generated.
// Fixture values, token measurements and API defaults are a different contract.
export const GROWTH_METRIC = /\b[\d,]+\s+(?:(?:browser|unit|passing|automated|contrast)\s+)?(?:components?|tests?|contrast pairs?|pairs?\s+(?:pass|measured))\b|\b\d+\s+of\s+\d+\s+pairs?\b/i;
