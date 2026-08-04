import test from "node:test";
import assert from "node:assert/strict";

import { BRANDABLE_TOKENS, CONTRAST_PAIRS, NONTEXT_CONTRAST_PAIRS } from "./contract.ts";
import { resolveTheme, resolveThemePair, missingTokens } from "./resolve.ts";
import { AA_TEXT, contrastRatio, flatten, toOklch } from "./color.ts";
import { SEED_BOUNDS, validateSeed } from "./seed.ts";
import { THEME_ZERO, ZERO_AUTHORED } from "./themes/zero.ts";
import type { ThemeSeed } from "./seed.ts";

/**
 * Brands chosen to break things, not to look nice. Each one is a shape the
 * previous seven-token implementation got wrong.
 */
const STRESS_BRANDS: Array<{ name: string; seed: ThemeSeed }> = [
  {
    name: "pale yellow accent on white — white label would vanish",
    seed: {
      colors: {
        bg: "#ffffff", surface: "#ffffff", muted: "#faf5e6",
        textPrimary: "#1a1a1a", textMuted: "#6b6b6b",
        border: "rgba(0,0,0,0.1)", accent: "#ffe066",
      },
    },
  },
  {
    name: "deliberately dark identity",
    seed: {
      colors: {
        bg: "#0b1220", surface: "#121a2b", muted: "#1b2438",
        textPrimary: "#e8ecf5", textMuted: "#98a2b8",
        border: "rgba(255,255,255,0.14)", accent: "#1e3a8a",
      },
    },
  },
  {
    name: "dark muted block on a light page — text-on-muted must flip",
    seed: {
      colors: {
        bg: "#fafafa", surface: "#ffffff", muted: "#1f2933",
        textPrimary: "#111111", textMuted: "#666666",
        border: "rgba(0,0,0,0.08)", accent: "#0f766e",
      },
    },
  },
  {
    name: "saturated mid-tone accent — hover/active must not cross its own ink",
    seed: {
      colors: {
        bg: "#ffffff", surface: "#ffffff", muted: "#f4f4f5",
        textPrimary: "#18181b", textMuted: "#71717a",
        border: "rgba(0,0,0,0.1)", accent: "#22c55e",
      },
      chrome: { navStyle: "accent" },
    },
  },
  {
    name: "low-contrast author input — the audit has to intervene",
    seed: {
      colors: {
        bg: "#f0f0f0", surface: "#f5f5f5", muted: "#ebebeb",
        textPrimary: "#8a8a8a", textMuted: "#a5a5a5",
        border: "rgba(0,0,0,0.06)", accent: "#d9d9d9",
      },
    },
  },
];

const ALL_SEEDS = [{ name: "theme zero", seed: THEME_ZERO }, ...STRESS_BRANDS];

test("the resolver is total over the contract", () => {
  for (const { name, seed } of ALL_SEEDS) {
    for (const scheme of ["light", "dark"] as const) {
      const { theme } = resolveTheme(seed, { scheme });
      assert.deepEqual(missingTokens(theme), [], `${name} (${scheme}) left tokens unresolved`);
      assert.equal(Object.keys(theme).length, BRANDABLE_TOKENS.length, `${name} (${scheme}) token count`);
    }
  }
});

test("every declared contrast pair clears AA after the audit", () => {
  for (const { name, seed } of ALL_SEEDS) {
    for (const scheme of ["light", "dark"] as const) {
      const { theme } = resolveTheme(seed, { scheme });
      for (const [fg, bg] of CONTRAST_PAIRS) {
        const ratio = contrastRatio(theme[fg], flatten(theme[bg], theme["--ui-bg-base"]));
        assert.ok(
          ratio >= AA_TEXT - 0.05,
          `${name} (${scheme}): ${fg} on ${bg} = ${ratio.toFixed(2)}`,
        );
      }
    }
  }
});

test("the audit reports what it moved instead of silently fixing it", () => {
  const lowContrast = STRESS_BRANDS[4]!.seed;
  const { adjustments } = resolveTheme(lowContrast, { scheme: "light" });
  assert.ok(adjustments.length > 0, "a deliberately illegible seed should produce adjustments");
  for (const a of adjustments) {
    assert.ok(a.ratioAfter > a.ratioBefore, `${a.token} was reported but not improved`);
    assert.notEqual(a.from, a.to);
  }
});

test("emphasis keeps contrast monotonic across rest, hover and active", () => {
  // The failure this encodes: keying hover/active direction on the PAGE's
  // scheme walks a mid-tone fill toward its own label until the pressed state
  // drops under AA. One ink must serve all three states.
  for (const { name, seed } of ALL_SEEDS) {
    const { theme } = resolveTheme(seed, { scheme: "light" });
    const ink = theme["--ui-text-on-emphasis"];
    for (const state of ["--ui-bg-emphasis", "--ui-bg-emphasis-hover", "--ui-bg-emphasis-active"] as const) {
      assert.ok(
        contrastRatio(ink, theme[state]) >= 4,
        `${name}: on-emphasis ink fails against ${state} (${contrastRatio(ink, theme[state]).toFixed(2)})`,
      );
    }
  }
});

test("text-on-muted flips for a dark muted block on a light page", () => {
  const { theme } = resolveTheme(STRESS_BRANDS[2]!.seed, { scheme: "light" });
  assert.ok(
    contrastRatio(theme["--ui-text-on-muted"], theme["--ui-bg-muted"]) >= AA_TEXT,
    "ink on a dark muted surface must not stay dark",
  );
  assert.notEqual(theme["--ui-text-on-muted"], theme["--ui-text-primary"]);
});

test("elevated surfaces are never darker than what they float over", () => {
  for (const { name, seed } of ALL_SEEDS) {
    for (const scheme of ["light", "dark"] as const) {
      const { theme } = resolveTheme(seed, { scheme });
      const surface = toOklch(theme["--ui-bg-surface"])!;
      const elevated = toOklch(theme["--ui-bg-elevated"])!;
      assert.ok(elevated.L >= surface.L - 0.001, `${name} (${scheme}): elevated is darker than surface`);
    }
  }
});

test("an authored dark seed wins over derivation", () => {
  const { theme } = resolveTheme(THEME_ZERO, { scheme: "dark" });
  assert.equal(theme["--ui-bg-base"], THEME_ZERO.dark!.bg);
  assert.equal(theme["--ui-text-primary"], THEME_ZERO.dark!.textPrimary);
});

test("a seed with no dark counterpart still resolves a usable dark scheme", () => {
  const lightOnly = STRESS_BRANDS[0]!.seed;
  const { theme } = resolveTheme(lightOnly, { scheme: "dark" });
  const bg = toOklch(theme["--ui-bg-base"])!;
  assert.ok(bg.L < 0.4, "derived dark background should actually be dark");
  assert.ok(contrastRatio(theme["--ui-text-primary"], theme["--ui-bg-base"]) >= AA_TEXT);
});

test("a deliberately dark identity is not inverted when asked for its own scheme", () => {
  const darkBrand = STRESS_BRANDS[1]!.seed;
  const { theme } = resolveTheme(darkBrand, { scheme: "dark" });
  assert.equal(theme["--ui-bg-base"], darkBrand.colors.bg, "author's dark page must be used verbatim");
});

test("the authored type table is emitted verbatim at the default base size", () => {
  // ADR 0009: the scale is a hand-tuned table, not base × ratio^n.
  const { theme } = resolveTheme(THEME_ZERO, { scheme: "light" });
  assert.equal(theme["--ui-text-body-md"], "0.875rem", "body-md is the 14px base target");
  assert.equal(theme["--ui-text-body-lg"], "1rem");
  assert.equal(theme["--ui-text-label-md"], "0.8125rem");
  assert.equal(theme["--ui-text-button-sm"], "0.75rem");
  assert.ok(theme["--ui-text-display-lg"].startsWith("clamp("), "display roles are fluid");
});

test("type roles are driven by the seed and clamped; ratio is reserved", () => {
  const big = resolveTheme({ ...THEME_ZERO, typography: { baseSize: 999, ratio: 99 } }, { scheme: "light" });
  const maxFactor = SEED_BOUNDS.baseSize.max / SEED_BOUNDS.baseSize.default;
  assert.equal(big.theme["--ui-text-body-md"], `${Number(((14 * maxFactor) / 16).toFixed(4))}rem`, "baseSize must clamp");

  const small = resolveTheme({ ...THEME_ZERO, typography: { baseSize: 14 } }, { scheme: "light" });
  assert.equal(small.theme["--ui-text-body-md"], `${Number(((14 * (14 / 16)) / 16).toFixed(4))}rem`);
  assert.ok(small.theme["--ui-text-title-lg"].startsWith("clamp("), "title roles are fluid");
  assert.ok(!small.theme["--ui-text-body-sm"].includes("clamp"), "body roles are fixed");

  // Same seed with a wild ratio resolves identically — ratio is ignored (ADR 0009).
  const withRatio = resolveTheme({ ...THEME_ZERO, typography: { baseSize: 14, ratio: 1.414 } }, { scheme: "light" });
  assert.deepEqual(withRatio.theme, small.theme);
});

test("theme zero's authored roles reproduce the approved handover exactly", () => {
  const { theme, adjustments } = resolveTheme(THEME_ZERO, { scheme: "light", authored: ZERO_AUTHORED.light });
  // Spot-check the roles the derivation would get wrong on its own.
  assert.equal(theme["--ui-bg-accent"], "#9EDBF3", "the brand colour is a fixed point");
  assert.equal(theme["--ui-bg-elevated"], "#F6F3F0", "elevation separates by tint, not lightness");
  assert.equal(theme["--ui-intent-success-bg"], "#D6EFCB", "intent grounds are opaque ramp-90 tints");
  assert.equal(theme["--ui-border-control"], "#98918A");
  assert.deepEqual(missingTokens(theme), [], "authored overlay must not break completeness");
  // Derived chrome (nav) may still get nudged; the APPROVED values must not.
  const authoredTokens = new Set(Object.keys(ZERO_AUTHORED.light));
  const touchedAuthored = adjustments.filter((a) => authoredTokens.has(a.token));
  assert.deepEqual(touchedAuthored, [], "every approved value must clear the audit unaided");
});

test("non-text pairs clear SC 1.4.11 in every theme", () => {
  for (const { name, seed } of ALL_SEEDS) {
    for (const scheme of ["light", "dark"] as const) {
      const { theme } = resolveTheme(seed, { scheme });
      for (const [fg, bg] of NONTEXT_CONTRAST_PAIRS) {
        const ratio = contrastRatio(theme[fg], flatten(theme[bg], theme["--ui-bg-base"]));
        assert.ok(ratio >= 3 - 0.05, `${name} (${scheme}): ${fg} on ${bg} = ${ratio.toFixed(2)}`);
      }
    }
  }
});

test("nav chrome derives its ink from the rail it lands on, not the page", () => {
  const accentRail = STRESS_BRANDS[3]!.seed;
  const { theme } = resolveTheme(accentRail, { scheme: "light" });
  assert.ok(contrastRatio(theme["--ui-nav-ink"], theme["--ui-nav-bg"]) >= AA_TEXT);
  assert.ok(contrastRatio(theme["--ui-nav-active-ink"], theme["--ui-nav-active-bg"]) >= AA_TEXT);
});

test("resolveThemePair produces both schemes from one seed", () => {
  const pair = resolveThemePair(THEME_ZERO);
  assert.deepEqual(missingTokens(pair.light), []);
  assert.deepEqual(missingTokens(pair.dark), []);
  assert.notEqual(pair.light["--ui-bg-base"], pair.dark["--ui-bg-base"]);
});

test("unsafe seed values are rejected at intake, not dropped at emit", () => {
  const hostile: ThemeSeed = {
    colors: {
      ...THEME_ZERO.colors,
      accent: "#fff; } body { display: none",
    },
  };
  const issues = validateSeed(hostile);
  assert.ok(issues.some((i) => i.path === "colors.accent"), "injection attempt must be reported");
});

test("a bad seed still resolves, so one bad value cannot blank a page", () => {
  const broken: ThemeSeed = {
    colors: { ...THEME_ZERO.colors, accent: "not-a-colour" },
  };
  const { theme, issues } = resolveTheme(broken, { scheme: "light" });
  assert.deepEqual(missingTokens(theme), []);
  assert.equal(issues.length, 0, "unparseable-but-safe values are the resolver's problem, not intake's");
});

test("the border stack is ordered by MEASURED contrast, in both schemes", () => {
  // ADR 0010 names four steps subtle → default → control → strong. The names
  // are not the guarantee; before this test, dark `strong` composited to
  // 1.78:1 while `control` sat at 3.09:1, so the stack ran backwards and a
  // Checkbox's mixed box — drawn entirely with `strong` — had no visible
  // boundary at all on the dark ground.
  for (const { name, seed } of [{ name: "theme zero", seed: THEME_ZERO }, ...STRESS_BRANDS]) {
    const pair = resolveThemePair(seed, { authored: seed === THEME_ZERO ? ZERO_AUTHORED : {} });
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      const page = theme["--ui-bg-base"];
      const against = (token: (typeof BRANDABLE_TOKENS)[number]) =>
        contrastRatio(flatten(theme[token], page), page);

      const control = against("--ui-border-control");
      const strong = against("--ui-border-strong");

      assert.ok(
        control >= 3 - 0.05,
        `${name} (${scheme}): border-control must clear SC 1.4.11 — got ${control.toFixed(2)}`,
      );
      assert.ok(
        strong >= control,
        `${name} (${scheme}): border-strong (${strong.toFixed(2)}) is weaker than border-control (${control.toFixed(2)}) — the stack is inverted`,
      );
    }
  }
});

test("no fluid type role shrinks below the scale's own floor", () => {
  // Fluid roles used a flat 72% of their maximum with no absolute minimum, so
  // `title-sm` (16px) resolved to 11.52px on a narrow viewport — under the
  // 12px floor ADR 0009 set after an 11px label pushed the small button below
  // the WCAG target size. Found by a Popover title rendering at 11.68px.
  const FLOOR_REM = 12 / 16;

  for (const { name, seed } of [{ name: "theme zero", seed: THEME_ZERO }, ...STRESS_BRANDS]) {
    const { theme } = resolveTheme(seed, { scheme: "light" });
    const factor = (seed.typography?.baseSize ?? SEED_BOUNDS.baseSize.default) / SEED_BOUNDS.baseSize.default;

    for (const [token, value] of Object.entries(theme)) {
      if (!token.startsWith("--ui-text-") || !value.startsWith("clamp(")) continue;
      const min = Number(/clamp\(([\d.]+)rem/.exec(value)?.[1]);
      assert.ok(
        Number.isFinite(min),
        `${name}: ${token} has an unparseable clamp minimum — ${value}`,
      );
      assert.ok(
        min >= FLOOR_REM * factor - 0.001,
        `${name}: ${token} shrinks to ${(min * 16).toFixed(2)}px, below the ${(FLOOR_REM * factor * 16).toFixed(0)}px floor`,
      );
    }
  }
});
