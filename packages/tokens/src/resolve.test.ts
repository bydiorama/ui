import test from "node:test";
import assert from "node:assert/strict";

import { BRANDABLE_TOKENS, CONTRAST_PAIRS, NONTEXT_CONTRAST_PAIRS, type BrandableToken, type FixedToken } from "./contract.ts";
import { CONTROL_FLOOR_PX, CONTROL_SIZES, DENSITY_STEP_PX, FIXED_TOKEN_VALUES } from "./base.ts";
import { resolveTheme, resolveThemePair, missingTokens, MEDIA_SCRIM_ALPHA, AFFIX_BG_ALPHA, GLASS_MIN_ALPHA, GLASS_LIGHT_UNDER_TEXT, TYPE_ROLES, WEIGHT_LADDER } from "./resolve.ts";
import { AA_TEXT, contrastRatio, flatten, toOklch, withAlpha } from "./color.ts";
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

test("elevated surfaces are raised where raising is possible, and never invisible", () => {
  // The rule used to be only the first half — "never darker than what it
  // floats over" — and a surface already at the top of the lightness range
  // satisfied it by not moving at all. `bg-elevated` then equalled
  // `bg-surface`, which the pale-yellow-on-white brand does exactly.
  //
  // For a modal that is survivable: its border and shadow carry the
  // separation. For the two things in this system that are a FILL WITH NO
  // EDGE — the chrome control, and a Header item's hover — it means there is
  // no control and no hover feedback at all. So visibility is the harder
  // requirement and direction gives way to it.
  for (const { name, seed } of ALL_SEEDS) {
    for (const scheme of ["light", "dark"] as const) {
      const { theme } = resolveTheme(seed, { scheme });
      const surface = toOklch(theme["--ui-bg-surface"])!;
      const elevated = toOklch(theme["--ui-bg-elevated"])!;
      const ratio = contrastRatio(theme["--ui-bg-elevated"], theme["--ui-bg-surface"]);

      assert.ok(
        ratio >= 1.02,
        `${name} (${scheme}): bg-elevated measures ${ratio.toFixed(3)} against bg-surface — a raised surface nobody can see`,
      );
      // Raised, unless the surface had no headroom left to raise into.
      const headroom = surface.L < 0.99;
      if (headroom) {
        assert.ok(elevated.L >= surface.L - 0.001, `${name} (${scheme}): elevated is darker than surface with headroom to spare`);
      }
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

      const subtle = against("--ui-border-subtle");
      const dflt = against("--ui-border-default");
      const control = against("--ui-border-control");
      const strong = against("--ui-border-strong");

      // Four steps must be four steps. `default` was an alpha hairline while
      // control and strong were measured, so in dark it composited onto
      // `subtle` — 1.48:1 both — and ADR 0010's stack silently had three
      // levels. Names are not separation; require a real gap.
      const SEPARATION = 1.2;
      assert.ok(
        dflt >= subtle * SEPARATION,
        `${name} (${scheme}): border-default (${dflt.toFixed(2)}) is not distinguishable from border-subtle (${subtle.toFixed(2)})`,
      );
      assert.ok(
        control >= dflt * SEPARATION,
        `${name} (${scheme}): border-control (${control.toFixed(2)}) is not distinguishable from border-default (${dflt.toFixed(2)})`,
      );

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

test("the neutral fill stack is ordered by MEASURED contrast, in both schemes", () => {
  // The sibling of the border-stack test above, and it exists for the same
  // reason: the names ordered correctly while the values did not.
  //
  // Every neutral ramp in this library is drawn as elevated → hover → active —
  // Header.Item's four-step item ramp, the chrome control's rest → hover →
  // press, Multiselect's selected vs highlighted rows. In DARK, elevation and
  // interaction both move the page LIGHTER, so a raise larger than hover's step
  // interleaves the two: theme zero's dark scheme measured elevated 1.247
  // against surface while hover measured 1.210, so all three ramps ran
  // backwards at their first rung, 1.031 apart — invisible AND inverted. Light
  // was unaffected and every gate was green, because a computed-style test that
  // asserts "these fills differ" passes at 1.031.
  //
  // Asserted as an ORDERING against the ground rather than as hexes: pinned
  // values would pass while any two of them converged, which is the failure
  // that actually happened.
  const SEPARATION = 1.04;
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      const ground = theme["--ui-bg-surface"];
      const against = (token: (typeof BRANDABLE_TOKENS)[number]) =>
        contrastRatio(flatten(theme[token], ground), ground);

      const elevated = against("--ui-bg-elevated");
      const hover = against("--ui-bg-hover");
      const active = against("--ui-bg-active");

      // A raised surface that measures as nothing is not a surface. A brand
      // whose page is already white cannot be raised, so the derivation steps
      // the other way rather than emitting `bg-surface` twice — the chrome
      // control and a Header item's hover are a FILL WITH NO EDGE and have
      // nothing else to fall back on.
      assert.ok(
        elevated >= 1.02,
        `${name} (${scheme}): bg-elevated is indistinguishable from bg-surface (${elevated.toFixed(3)})`,
      );
      assert.ok(
        hover >= elevated * SEPARATION,
        `${name} (${scheme}): bg-hover (${hover.toFixed(3)}) does not step past bg-elevated (${elevated.toFixed(3)}) — a hovered item reads quieter than a resting chrome control`,
      );
      assert.ok(
        active >= hover * SEPARATION,
        `${name} (${scheme}): bg-active (${active.toFixed(3)}) does not step past bg-hover (${hover.toFixed(3)})`,
      );
    }
  }
});

test("a hairline separates from the sunken fill it is drawn on, in both schemes", () => {
  // DotPattern inks its dots in border-subtle on a bg-sunken container, and a
  // neutral Badge outlines its sunken fill in border-subtle. On the warm-ink
  // dark ramp the first sunken FILL tried sat at 1.04:1 to the hairline, and the
  // dots disappeared while every other gate was green. Light measures 1.16.
  const { light, dark } = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
  for (const [scheme, t] of [["light", light], ["dark", dark]] as const) {
    const sunken = flatten(t["--ui-bg-sunken"], t["--ui-bg-base"]);
    const ratio = contrastRatio(flatten(t["--ui-border-subtle"], sunken), sunken);
    assert.ok(ratio >= 1.1, `theme zero (${scheme}): border-subtle on bg-sunken measures ${ratio.toFixed(3)}`);
    // …and DotPattern's STRONG opt-in (border-default) has to read stronger
    // than that default, or the opt-in is a downgrade.
    const strong = contrastRatio(flatten(t["--ui-border-default"], sunken), sunken);
    assert.ok(strong > ratio * 1.05, `theme zero (${scheme}): border-default on bg-sunken (${strong.toFixed(3)}) is not stronger than border-subtle (${ratio.toFixed(3)})`);
  }
});

test("an intent ground carries its ink on ANY surface, not only on the page", () => {
  // A derived intent ground used to be a 14% tint, and the audit flattens
  // every pair over `bg-base` — so the measured number was the number you got
  // on the PAGE and nowhere else. A Badge in a Table sits on a `bg-elevated`
  // mat or a `bg-sunken` well, and the same ink measured 4.87 / 4.57 / 4.47
  // there on the pale-yellow stress brand. Nothing was wrong with the ink; the
  // ground moved under it, and no gate could see it because no pair can name
  // "over elevated".
  //
  // Compositing at derivation is what makes the audited number true
  // everywhere, and it is the rule `--ui-border-control` already follows.
  // Asserted across the grounds a component may legitimately put a tinted
  // label on.
  const GROUNDS = ["--ui-bg-base", "--ui-bg-surface", "--ui-bg-elevated", "--ui-bg-sunken"] as const;
  const INTENTS = ["success", "warning", "danger", "info"] as const;

  for (const { name, seed } of ALL_SEEDS) {
    // Theme zero's own DARK intents are authored translucent (the handover
    // draws them that way), so it is checked through the authored path in
    // light and left to the derivation in dark, exactly as it ships.
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      for (const intent of INTENTS) {
        const fg = theme[`--ui-intent-${intent}-fg` as const];
        const ratios = GROUNDS.map((g) => contrastRatio(fg, flatten(theme[`--ui-intent-${intent}-bg` as const], theme[g])));
        const [worst, best] = [Math.min(...ratios), Math.max(...ratios)];
        assert.ok(
          best - worst < 0.01,
          `${name} (${scheme}): ${intent} ink measures ${worst.toFixed(2)}–${best.toFixed(2)} depending on which surface the tint lands on — the ground is translucent, so its audited value is only true on the page`,
        );
      }
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

test("every nav style gives a VISIBLE, legible current item, in both schemes", () => {
  // Both defects this pins were in code that already passed every other gate.
  // `tinted` floored its active ink against the RAIL while the ink sits on the
  // tint above it — 4.36:1, under AA. And `page` derived its active fill from
  // the elevated surface, which moves the wrong way in light: 1.00:1 against
  // the rail, i.e. no visible current state for any brand that does not author
  // one. Theme zero's pin hid that; an unauthored seed did not.
  for (const navStyle of ["page", "tinted", "accent"] as const) {
    const seed: ThemeSeed = { ...THEME_ZERO, chrome: { ...THEME_ZERO.chrome, navStyle } };
    const pair = resolveThemePair(seed);

    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      const rail = theme["--ui-nav-bg"];
      const fill = flatten(theme["--ui-nav-active-bg"], rail);
      const where = `${navStyle} (${scheme})`;

      assert.ok(
        contrastRatio(theme["--ui-nav-active-ink"], fill) >= AA_TEXT - 0.05,
        `${where}: the current item's ink measures ${contrastRatio(theme["--ui-nav-active-ink"], fill).toFixed(2)}:1 against its own fill`,
      );
      assert.ok(
        contrastRatio(fill, rail) >= 1.1,
        `${where}: the current item's fill is ${contrastRatio(fill, rail).toFixed(2)}:1 against the rail — indistinguishable`,
      );
    }
  }
});

test("a selected fill is distinguishable from its track, in BOTH schemes", () => {
  // `--ui-bg-sunken` was doing this job and measured 1.10:1 against
  // `--ui-bg-surface` in dark — reported as "the selected tab doesn't look
  // contrasted enough", and correctly. "Recessed" is a RELATIVE role and the
  // surface scale inverts between schemes: below the surface there is room on
  // a light page and almost none on a dark one. `--ui-bg-selected` steps AWAY
  // from the surface in whichever direction the scheme reads.
  //
  // Asserted across seeds, not just theme zero, because theme zero PINS its
  // light value to the drawn neutral and only the derivation is at risk.
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, name === "theme zero" ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const t = pair[scheme];
      const ratio = contrastRatio(t["--ui-bg-selected"], t["--ui-bg-surface"]);
      assert.ok(
        ratio >= 1.15,
        `${name} (${scheme}): --ui-bg-selected on --ui-bg-surface = ${ratio.toFixed(2)}, too close to read as chosen`,
      );
    }
  }
});

/**
 * The slider ramp is the DESIGN's, and the thumb's ring is what has to clear
 * the floor.
 *
 * Worth being precise about, because the first version of this got the
 * conformance argument the wrong way round. The ramp is deliberately pale —
 * measured 1.24:1 and 1.80:1 against the track in light — and darkening it
 * until the fill itself cleared 3:1 destroyed the sweep the design is for.
 * SC 1.4.11 asks that the CONTROL and its state be identifiable, and on a
 * slider that is the thumb: it marks the value, it is what a user grabs, and
 * it carries --ui-bg-accent-legible, floored at 3:1 by the audit. The fill is
 * a secondary cue and is declared decorative in the doc with these numbers.
 *
 * So what is asserted here is the ring, for every stress brand — including
 * against the thumb's own fill, because a ring that vanishes into the white
 * thumb identifies nothing either.
 */
test("the slider thumb's ring clears 3:1 on both the track and the thumb", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      const ring = theme["--ui-bg-accent-legible"]!;
      for (const [against, label] of [
        [theme["--ui-bg-sunken"]!, "track"],
        [theme["--ui-bg-base"]!, "thumb fill"],
      ] as const) {
        const ratio = contrastRatio(ring, against);
        assert.ok(
          ratio >= 3 - 0.005,
          `${name}/${scheme}: thumb ring measures ${ratio.toFixed(2)}:1 on the ${label}, under 3:1`,
        );
      }

      // The ramp itself only has to BE a ramp, and must not smuggle a var()
      // into the TS constants emitter, which cannot resolve one.
      const gradient = theme["--ui-gradient-accent"]!;
      assert.ok(!gradient.includes("var("), `${name}/${scheme}: gradient holds a var()`);
      assert.equal(
        [...gradient.matchAll(/#[0-9a-fA-F]{6}|rgba?\([^)]*\)/g)].length,
        2,
        `${name}/${scheme}: expected a two-stop ramp`,
      );
    }
  }
});

/**
 * The scrim floor IS the scrim, composited.
 *
 * `--ui-bg-media-floor` is the only role in the contract whose value is
 * arithmetic on another role rather than a colour decision, which makes it the
 * only one that can be quietly wrong: it is never painted, so no screenshot
 * shows it, and every gate that consumes it — the contrast audit,
 * `check:contrast`, the doc's declared pairs — trusts it completely. If the
 * ink moved and the floor did not, every one of those would go on reporting
 * the old numbers with nothing to compare them against.
 *
 * Theme zero pins BOTH as literals, so this is also what proves the pinned
 * `#5c5b59` is still the composite of the pinned `--ui-bg-media`.
 */
test("the media floor equals the media ground composited over white, in every theme", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      assert.equal(
        theme["--ui-bg-media-floor"],
        flatten(withAlpha(theme["--ui-bg-media"]!, MEDIA_SCRIM_ALPHA), "#ffffff"),
        `${name}/${scheme}: the media floor is not the media ground at ${MEDIA_SCRIM_ALPHA} over white`,
      );
    }
  }
});

/**
 * The affix floor IS the affix fill, composited over the page's own ink.
 *
 * Same hazard as the media floor above, and the same reason it is pinned: the
 * floor is arithmetic on two other roles, it is NEVER painted, and the only
 * things that read it are gates. `--ui-bg-affix` is the fill a bar actually
 * wears; `--ui-bg-affix-floor` is the worst ground that fill can produce, and
 * the whole point of declaring the bar's ink against the second rather than
 * the first is that the first reconstructs the best case. If `AFFIX_BG_ALPHA`
 * moved and the floor did not, the contrast audit would go on clearing a bar
 * at an alpha nobody ships.
 *
 * The composite is over an ABSOLUTE extreme — black in light, white in dark —
 * rather than over `--ui-text-primary`, and that is the second thing this
 * test pins. The ink is audited AGAINST this floor, so building the floor
 * from the ink is circular: the audit moves the ink afterwards and the floor
 * is left describing a colour the theme no longer ships. This assertion is
 * what found it, on the low-contrast stress seed in light.
 */
test("the affix floor equals the affix fill composited over the scheme's extreme, in every theme", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      assert.equal(
        theme["--ui-bg-affix"],
        withAlpha(theme["--ui-bg-base"]!, AFFIX_BG_ALPHA),
        `${name}/${scheme}: the affix fill is not the page ground at ${AFFIX_BG_ALPHA}`,
      );
      assert.equal(
        theme["--ui-bg-affix-floor"],
        flatten(theme["--ui-bg-affix"]!, scheme === "dark" ? "#ffffff" : "#000000"),
        `${name}/${scheme}: the affix floor is not the affix fill over the scheme's extreme`,
      );
    }
  }
});

/**
 * The glass pair (ADR 0022): a tint derived per brand, and its floor.
 *
 * Three things are pinned. The floor is the tint over the scheme's extreme
 * plus, in dark, the light the material lays under text — the same
 * non-circular construction as the affix floor. The tint is the LEAST alpha
 * that carries the inks: one hundredth less must fail, or the derivation
 * has drifted to a constant and a high-contrast brand pays for nothing. And
 * the inks clear AA on the floor with NO help from the audit — an adjustment
 * against the glass floor would mean the material moved an ink the rest of
 * the system shows, which is the trade the affix bar refused (contract.ts).
 */
test("glass is the surface at the least alpha that carries the inks, and its floor is the worst ground", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const options = seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {};
    const pair = resolveThemePair(seed, options);
    for (const scheme of ["light", "dark"] as const) {
      const theme = pair[scheme];
      const glass = theme["--ui-bg-glass"]!;
      const alpha = Number(glass.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1] ?? 1);
      assert.ok(alpha >= GLASS_MIN_ALPHA && alpha <= 1, `${name}/${scheme}: glass alpha ${alpha} is outside [${GLASS_MIN_ALPHA}, 1]`);
      assert.equal(glass, withAlpha(theme["--ui-bg-surface"]!, alpha), `${name}/${scheme}: glass is not the surface at its alpha`);

      const floorAt = (a: number) => {
        const behind = flatten(withAlpha(theme["--ui-bg-surface"]!, a), scheme === "dark" ? "#ffffff" : "#000000");
        return scheme === "dark" ? flatten(withAlpha("#ffffff", GLASS_LIGHT_UNDER_TEXT), behind) : behind;
      };
      assert.equal(theme["--ui-bg-glass-floor"], floorAt(alpha), `${name}/${scheme}: the glass floor is not the tint over the extreme`);

      const inks = ["--ui-text-primary", "--ui-text-muted"] as const;
      for (const ink of inks) {
        const ratio = contrastRatio(theme[ink]!, theme["--ui-bg-glass-floor"]!);
        assert.ok(ratio >= AA_TEXT, `${name}/${scheme}: ${ink} on the glass floor is ${ratio.toFixed(2)}:1`);
      }
      if (alpha > GLASS_MIN_ALPHA && alpha < 1) {
        const thinner = Math.round((alpha - 0.01) * 100) / 100;
        assert.ok(
          inks.some((ink) => contrastRatio(theme[ink]!, floorAt(thinner)) < AA_TEXT),
          `${name}/${scheme}: glass at ${thinner} would still carry the inks — the alpha is not the least`,
        );
      }
      const moved = pair.adjustments[scheme].filter((a) => a.against === "--ui-bg-glass-floor");
      assert.deepEqual(moved, [], `${name}/${scheme}: the audit moved an ink to fit glass`);
    }
  }
});

/**
 * A photograph does not invert with the page.
 *
 * The scrim and its ink are the one place in this contract where light and
 * dark must AGREE, and the failure it prevents is specific: the sheet reached
 * for `--ui-text-inverse`, which resolves as "the ink readable on the page's
 * own text colour" and is therefore near-black in the dark scheme. A caption
 * over a photo would have been dark ink on a dark veil in dark mode only.
 */
test("the media ground and its inks follow neither the scheme nor the brand", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const token of [
      "--ui-bg-media",
      "--ui-bg-media-floor",
      "--ui-text-on-media",
      "--ui-text-on-media-muted",
    ] as const) {
      assert.equal(
        pair.light[token], pair.dark[token],
        `${name}: ${token} differs between schemes`,
      );
    }
    // And the veil is DARK in both, whatever the brand seed is — a pale
    // "scrim" is a wash, and white ink on a wash is the failure this whole
    // role exists to prevent.
    assert.ok(
      contrastRatio(pair.light["--ui-bg-media"]!, "#ffffff") > 10,
      `${name}: the media ground is not dark`,
    );
  }
});

/**
 * ELEVATION (ADR 0016).
 *
 * A shadow is occlusion, and the resolver used to ink it with
 * `colors.textPrimary` — which INVERTS. In theme zero's dark scheme that
 * resolved to #F6F3F0, so all four steps cast a white glow, and because every
 * offset is positive the glow pooled BELOW the element: a light puddle under a
 * card, in every brand, on every dark page, for the whole life of the scale.
 *
 * Nothing existing could have caught it. `check:contrast` measures ink on
 * grounds and a shadow is neither; the emit test asserted the *shape* of the
 * `light-dark()` pair and would have passed on any two colours.
 */
test("a shadow is occlusion — dark ink, in BOTH schemes and every brand", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      for (const step of ["sm", "md", "lg", "xl"] as const) {
        const value = pair[scheme][`--ui-shadow-${step}`]!;
        // Every layer's ink, opaque, must be nearly black — a shadow lighter
        // than the page it falls on is a glow.
        for (const [, r, g, b] of value.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)) {
          const opaque = `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
          assert.ok(
            contrastRatio(opaque, "#ffffff") > 10,
            `${name} ${scheme} shadow-${step}: ink ${opaque} is not dark (${value})`,
          );
        }
      }
    }
  }
});

/**
 * Dark needs MORE opacity for the same read: the surfaces a shadow separates
 * are far apart in light (#FFFFFF page against a near-black ink) and close
 * together in dark (#423E3A page, #2F2C29 surface). Equal alphas would make
 * the dark shadow measure as nothing, which is how "elevation separates by
 * tint, the shadow is a whisper" quietly becomes "in dark there is only tint".
 */
test("dark elevation is deeper than light, never equal", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    const alphas = (v: string) => [...v.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
    for (const step of ["sm", "md", "lg", "xl"] as const) {
      const light = alphas(pair.light[`--ui-shadow-${step}`]!);
      const dark = alphas(pair.dark[`--ui-shadow-${step}`]!);
      assert.equal(light.length, dark.length, `${name}: shadow-${step} layer count differs`);
      light.forEach((a, i) => {
        assert.ok(
          dark[i]! > a,
          `${name}: shadow-${step} layer ${i} is not deeper in dark (${a} → ${dark[i]})`,
        );
      });
    }
  }
});

/**
 * The `-up` variants are the SAME elevation lit from below, for a surface
 * anchored to the bottom edge of the viewport. Derived, never authored twice —
 * both editor sheets hand-wrote a negated copy of `--ui-shadow-lg` before this
 * existed, which is exactly how a pair drifts.
 */
test("every upward cast is its own step with the Y offsets negated, nothing else", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      for (const step of ["sm", "md", "lg", "xl"] as const) {
        const down = pair[scheme][`--ui-shadow-${step}`]!;
        const up = pair[scheme][`--ui-shadow-${step}-up`]!;
        assert.notEqual(up, down, `${name} ${scheme}: shadow-${step}-up did not move`);
        // Negating Y twice returns the original, so the two differ in exactly
        // that and in nothing else — no drifted blur, spread or alpha.
        const flip = (v: string) => v.replace(/(^|, )0 (-?)([\d.]+)px/g, (_, sep, sign, n) => `${sep}0 ${sign ? "" : "-"}${n}px`);
        assert.equal(flip(up), down, `${name} ${scheme}: shadow-${step}-up differs from its step beyond the cast`);
      }
    }
  }
});

/**
 * The scale must be a scale: a surface that sits further off the page casts a
 * larger shadow than one nearer it. Four steps named sm/md/lg/xl are a claim
 * about ordering, and nothing asserted it — the geometry is authored by hand,
 * one row each, and a transposed digit would read as deliberate.
 */
test("the elevation scale is ordered by total cast, in both schemes", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      // Reach: how far the shadow extends below the element — the first
      // layer's offset plus its blur, which is what a reader actually sees.
      const reach = (v: string) => {
        const m = v.match(/^0 (-?[\d.]+)px (-?[\d.]+)px/);
        return m ? Math.abs(Number(m[1])) + Number(m[2]) : 0;
      };
      const steps = (["sm", "md", "lg", "xl"] as const).map((s) => ({
        s, reach: reach(pair[scheme][`--ui-shadow-${s}`]!),
      }));
      steps.slice(1).forEach((cur, i) => {
        assert.ok(
          cur.reach > steps[i]!.reach,
          `${name} ${scheme}: shadow-${cur.s} (${cur.reach}) does not reach past shadow-${steps[i]!.s} (${steps[i]!.reach})`,
        );
      });
    }
  }
});

/**
 * FIELDS ARE A GROUND-AND-STATE MATRIX (ADR 0017).
 *
 * A fill means nothing on its own — it means something against the floor it is
 * cut from. `--ui-bg-field-disabled` and `--ui-bg-field-chrome` are the SAME
 * VALUE in theme zero, and that is the whole point: neutral-90 under a white
 * page reads as unavailable, and the identical neutral-90 inside a neutral-95
 * inspector reads as a well you can type into.
 *
 * So what has to hold is not that the four values differ, but that each PAIR
 * separates on its own ground. Before these roles existed the editor's panel
 * reached for `bg-sunken` — the page's disabled fill — and an enabled field on
 * chrome was indistinguishable from a disabled one.
 */
test("each field pair separates on its OWN ground, in both schemes", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const pair = resolveThemePair(seed, seed === THEME_ZERO ? { authored: ZERO_AUTHORED } : {});
    for (const scheme of ["light", "dark"] as const) {
      const t = pair[scheme];
      const page = contrastRatio(t["--ui-bg-field-disabled"]!, t["--ui-bg-field"]!);
      const chrome = contrastRatio(t["--ui-bg-field-chrome-disabled"]!, t["--ui-bg-field-chrome"]!);
      assert.ok(page >= 1.1, `${name} ${scheme}: field vs disabled on the PAGE is ${page.toFixed(3)}`);
      assert.ok(chrome >= 1.1, `${name} ${scheme}: field vs disabled on CHROME is ${chrome.toFixed(3)}`);
      // And the chrome field is a WELL — it has to read as cut into the panel,
      // or the whole reason for a second pair disappears.
      const well = contrastRatio(t["--ui-bg-field-chrome"]!, t["--ui-bg-elevated"]!);
      assert.ok(well >= 1.06, `${name} ${scheme}: the chrome field is not a well (${well.toFixed(3)} against the panel)`);
    }
  }
});

/**
 * A DARK PAGE FIELD IS AN INPUT ON ITS GROUND, NOT A HOLE THROUGH IT (ADR 0017,
 * amended 2026-10-05 and 2026-11-03; closes #24).
 *
 * The failure this exists for: theme zero pinned the field to neutral-0, the
 * darkest ground in the scheme, 1.62:1 under its `bg-base` Sheet, and every
 * field in a dark form read as an inlay cut through the panel. The 2026-10-05
 * amendment answered it by moving the field BETWEEN `surface` and `elevated`,
 * and that is still where the derivation puts it — asserted below for every
 * seed that takes the derived path.
 *
 * What has to hold for EVERY theme is the depth, not the direction. Theme
 * zero's warm-ink page is low enough that its field is a shallow well under
 * the page — 1.05:1, light's own rule of a field flush with its page and the
 * hairline doing the identifying — which is what the approved boards draw. So
 * a field may sit under its page, but never deeper than HOLE, and it may never
 * collapse onto any ground it can land on.
 */
const HOLE = 1.2;

test("a dark page field is never a hole through its page, and never collapses onto a ground", () => {
  for (const { name, seed } of ALL_SEEDS) {
    const authored = seed === THEME_ZERO;
    const pair = resolveThemePair(seed, authored ? { authored: ZERO_AUTHORED } : {});
    const d = pair.dark;

    const depth = contrastRatio(d["--ui-bg-field"], d["--ui-bg-base"]);
    assert.ok(
      depth <= HOLE,
      `${name} dark: --ui-bg-field (${d["--ui-bg-field"]}) measures ${depth.toFixed(3)} against its page — a hole, not a well`,
    );
    for (const ground of ["--ui-bg-base", "--ui-bg-surface", "--ui-bg-elevated", "--ui-bg-sunken"] as const) {
      const ratio = contrastRatio(d["--ui-bg-field"], d[ground]);
      assert.ok(ratio >= 1.03, `${name} dark: the field collapses onto ${ground} (${ratio.toFixed(3)})`);
    }

    // The derivation's own placement: strictly between the two panel steps.
    if (!authored) {
      const L = (token: BrandableToken) => toOklch(d[token])!.L;
      const [lo, hi] = [L("--ui-bg-surface"), L("--ui-bg-elevated")].sort((a, b) => a - b) as [number, number];
      const field = L("--ui-bg-field");
      assert.ok(
        field > lo && field < hi,
        `${name} dark: the derived --ui-bg-field (${d["--ui-bg-field"]}) is outside surface..elevated (${d["--ui-bg-surface"]}..${d["--ui-bg-elevated"]})`,
      );
    }

    // And light is the page, exactly as before.
    assert.equal(pair.light["--ui-bg-field"], pair.light["--ui-bg-base"], `${name} light: the field moved off the page`);
  }
});

test("the z scale orders every surface under the surfaces it can open", () => {
  // THIS ARRAY IS THE SPECIFICATION. The scale shipped unconsumed for months
  // and an unconsumed token is a guess; both guesses it made were wrong.
  // First sticky sat above dropdown, so a Menu opened from the affix bar
  // would have slid under the bar. Then, with sticky corrected, dropdown sat
  // under modal — which reads natural and breaks every Select inside a
  // Modal the moment Modal takes its own role, because the two are BODY
  // SIBLINGS and only z-index separates them.
  //
  // The order below is forced by that sibling relationship: a surface
  // outranks anything it can be OPENED FROM. Ordering is asserted, not the
  // numbers, in the same spirit as the border-stack test: names are not
  // guarantees. base.ts reads each rung against the composition behind it.
  const z = (name: string) => Number(FIXED_TOKEN_VALUES[`--ui-z-${name}` as FixedToken]);
  const ladder = ["below", "base", "sticky", "overlay", "modal", "toast", "dropdown", "tooltip"];
  for (const name of ladder) assert.ok(Number.isFinite(z(name)), `--ui-z-${name} is numeric`);
  for (let i = 1; i < ladder.length; i++) {
    assert.ok(
      z(ladder[i - 1]!) < z(ladder[i]!),
      `--ui-z-${ladder[i - 1]} (${z(ladder[i - 1]!)}) must sit under --ui-z-${ladder[i]} (${z(ladder[i]!)})`,
    );
  }

  // The pairs the ordering exists for, named so a reordering fails with the
  // COMPOSITION it breaks rather than with two numbers.
  const above = (top: string, bottom: string, why: string) =>
    assert.ok(z(top) > z(bottom), `--ui-z-${top} must sit above --ui-z-${bottom}: ${why}`);
  above("dropdown", "sticky", "a Menu opened from the affix Header is a body sibling of it");
  above("dropdown", "overlay", "the Sheet navigation composition opens Menus");
  above("dropdown", "modal", "a dialog form holds Selects");
  above("dropdown", "toast", "a toast action can open a Menu");
  above("toast", "modal", "a notification has to be seen over a dialog");
  above("modal", "overlay", "a confirmation is raised from a panel");
  above("tooltip", "dropdown", "a tooltip attaches to controls on every other surface");
  above("overlay", "sticky", "the affix Header must not cover a Sheet — the defect this fixed");
});

// ── Strokes (ADR 0020 §2) ───────────────────────────────────────────────────

test("theme zero's stroke scale is the widths the library drew as literals", () => {
  const { light, dark } = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
  for (const theme of [light, dark]) {
    assert.equal(theme["--ui-stroke-default"], "1px");
    // Not rounded. The shared `px()` helper rounds, and would have made the
    // hairline 2px — every control edge in the library a third heavier.
    assert.equal(theme["--ui-stroke-hairline"], "1.5px");
    assert.equal(theme["--ui-stroke-thick"], "2px");
    assert.equal(theme["--ui-focus-ring-width"], "2px");
    assert.equal(theme["--ui-focus-ring-offset"], "2px");
  }
});

test("borderWidthPx drives the whole stroke scale, in proportion", () => {
  const { theme } = resolveTheme({ ...THEME_ZERO, shape: { borderWidthPx: 2 } }, { scheme: "light" });
  assert.equal(theme["--ui-stroke-default"], "2px");
  assert.equal(theme["--ui-stroke-hairline"], "3px");
  assert.equal(theme["--ui-stroke-thick"], "4px");
  // …and NOT the focus ring, which has its own knob: a brand choosing
  // delicate edges must not thin the focus indicator with them.
  assert.equal(theme["--ui-focus-ring-width"], "2px");
});

test("stroke knobs clamp: no borderless brand, no focus ring under 2px", () => {
  const thin = resolveTheme({ ...THEME_ZERO, shape: { borderWidthPx: 0, focusRingWidthPx: 1 } }, { scheme: "light" }).theme;
  assert.equal(thin["--ui-stroke-default"], "1px", "a 0 base would erase every control boundary");
  assert.equal(thin["--ui-focus-ring-width"], "2px", "SC 2.4.13's 2px floor, adopted on purpose");
  const heavy = resolveTheme({ ...THEME_ZERO, shape: { borderWidthPx: 9, focusRingWidthPx: 9 } }, { scheme: "light" }).theme;
  assert.equal(heavy["--ui-stroke-default"], `${SEED_BOUNDS.borderWidthPx.max}px`);
  assert.equal(heavy["--ui-focus-ring-width"], `${SEED_BOUNDS.focusRingWidthPx.max}px`);
});

test("the focus ring is composed from its own tokens, after authoring", () => {
  // It used to be a hand-written string beside the two tokens it duplicated,
  // in the resolver AND twice in theme zero. Now nothing can make the drawn
  // ring disagree with its stated colour, width or gap.
  for (const { seed, authored } of [
    { seed: THEME_ZERO, authored: ZERO_AUTHORED },
    { seed: { ...THEME_ZERO, shape: { focusRingWidthPx: 3 } }, authored: undefined },
    ...STRESS_BRANDS.map((b) => ({ seed: b.seed, authored: undefined })),
  ]) {
    const pair = resolveThemePair(seed, authored ? { authored } : {});
    for (const theme of [pair.light, pair.dark]) {
      const offset = parseFloat(theme["--ui-focus-ring-offset"]);
      const width = parseFloat(theme["--ui-focus-ring-width"]);
      assert.equal(
        theme["--ui-focus-ring"],
        `0 0 0 ${offset}px ${theme["--ui-bg-base"]}, 0 0 0 ${offset + width}px ${theme["--ui-focus-ring-color"]}`,
      );
    }
  }
});

test("theme zero's focus ring is unchanged by being composed", () => {
  const { light, dark } = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
  assert.equal(light["--ui-focus-ring"], "0 0 0 2px #FFFFFF, 0 0 0 4px #1B6C84");
  assert.equal(dark["--ui-focus-ring"], "0 0 0 2px #171411, 0 0 0 4px #9EDBF3");
});

test("an authored --ui-focus-ring is discarded but never silently (review finding I1)", () => {
  // It is derived-only: always recomposed from -color/-width/-offset, so it
  // can never disagree with the tokens that state its geometry. This is what
  // stops that recomposition from being a SILENT overwrite of an author's
  // intent — theme zero itself used to author this exact string twice.
  const { theme, issues } = resolveTheme(THEME_ZERO, {
    scheme: "light",
    authored: { ...ZERO_AUTHORED.light, "--ui-focus-ring": "0 0 0 99px red" },
  });
  assert.notEqual(theme["--ui-focus-ring"], "0 0 0 99px red", "the composite always wins");
  assert.ok(
    issues.some((i) => i.path === "authored.--ui-focus-ring"),
    "discarding an authored value must be reported, not silent",
  );
});

// ── Type roles (ADR 0020 §3) ────────────────────────────────────────────────


test("every role's weight, leading and tracking is the table's — the table is the truth", () => {
  const { theme } = resolveTheme(THEME_ZERO, { scheme: "light" });
  for (const [token, role] of Object.entries(TYPE_ROLES)) {
    const t = token as keyof typeof TYPE_ROLES;
    assert.equal(theme[`${t}-weight`], String(role.weight), `${t} weight`);
    assert.equal(theme[`${t}-leading`], String(role.leading), `${t} leading`);
    assert.equal(theme[`${t}-tracking`], role.tracking, `${t} tracking`);
  }
  assert.equal(theme["--ui-weight-semibold"], "550");
  assert.equal(theme["--ui-tracking-tight"], "-0.02em");
});

test("typography.weights re-points a ladder step, and every role on it follows", () => {
  // A static face with no 550 cut: semibold goes to 600, bold to 700.
  const { theme } = resolveTheme(
    { ...THEME_ZERO, typography: { weights: { semibold: 600, bold: 700 } } },
    { scheme: "light" },
  );
  assert.equal(theme["--ui-weight-semibold"], "600");
  assert.equal(theme["--ui-text-title-md-weight"], "600", "title-md sits on semibold");
  assert.equal(theme["--ui-text-label-md-weight"], "700", "label-md sits on bold");
  assert.equal(theme["--ui-text-body-md-weight"], String(WEIGHT_LADDER.regular), "untouched steps keep Aspekta's");
});

test("weights clamp to the named range", () => {
  const { theme } = resolveTheme({ ...THEME_ZERO, typography: { weights: { regular: 20, bold: 2000 } } }, { scheme: "light" });
  assert.equal(theme["--ui-weight-regular"], String(SEED_BOUNDS.weight.min));
  assert.equal(theme["--ui-weight-bold"], String(SEED_BOUNDS.weight.max));
});

// ── Malformed numeric knobs (ADR 0020, review finding C1) ───────────────────
//
// A seed is untyped JSON at the boundary, not a TypeScript literal, so a
// non-numeric value is a real input, not a type error someone can catch
// upstream. Before this, `borderWidthPx: "2"` threw ("2".toFixed is not a
// function — clamp assumed a finite number), and `focusRingWidthPx: NaN`
// silently produced a NaN-wide focus ring: a control with no visible
// indicator at all, and no build error to find it by.

test("a non-numeric borderWidthPx falls back to the default instead of throwing", () => {
  assert.doesNotThrow(() => resolveTheme({ ...THEME_ZERO, shape: { borderWidthPx: "2" as unknown as number } }, { scheme: "light" }));
  const { theme, issues } = resolveTheme({ ...THEME_ZERO, shape: { borderWidthPx: "2" as unknown as number } }, { scheme: "light" });
  assert.equal(theme["--ui-stroke-default"], `${SEED_BOUNDS.borderWidthPx.default}px`);
  assert.ok(issues.some((i) => i.path === "shape.borderWidthPx"), "validateSeed must report the bad value");
});

test("a NaN focusRingWidthPx falls back to the default instead of poisoning the focus ring", () => {
  const { theme, issues } = resolveTheme({ ...THEME_ZERO, shape: { focusRingWidthPx: Number.NaN } }, { scheme: "light" });
  assert.equal(theme["--ui-focus-ring-width"], `${SEED_BOUNDS.focusRingWidthPx.default}px`);
  assert.doesNotMatch(theme["--ui-focus-ring"], /NaN/);
  assert.ok(issues.some((i) => i.path === "shape.focusRingWidthPx"));
});

test("a non-numeric weight falls back to that step's ladder default", () => {
  const { theme, issues } = resolveTheme(
    { ...THEME_ZERO, typography: { weights: { bold: "heavy" as unknown as number } } },
    { scheme: "light" },
  );
  assert.equal(theme["--ui-weight-bold"], String(WEIGHT_LADDER.bold));
  assert.doesNotMatch(theme["--ui-text-title-sm-weight"], /NaN/);
  assert.ok(issues.some((i) => i.path === "typography.weights.bold"));
});

test("tracking: 'font' zeroes every tracking, role and ladder alike", () => {
  const { theme } = resolveTheme({ ...THEME_ZERO, typography: { tracking: "font" } }, { scheme: "light" });
  for (const token of Object.keys(TYPE_ROLES)) {
    assert.equal(theme[`${token as keyof typeof TYPE_ROLES}-tracking`], "0em");
  }
  assert.equal(theme["--ui-tracking-tight"], "0em");
  assert.equal(theme["--ui-tracking-normal"], "0em");
});

test("leading has no knob: no seed moves a role's line-height (ADR 0020 §3)", () => {
  const a = resolveTheme(THEME_ZERO, { scheme: "light" }).theme;
  for (const { seed } of STRESS_BRANDS) {
    const b = resolveTheme(seed, { scheme: "light" }).theme;
    for (const token of Object.keys(TYPE_ROLES)) {
      const t = `${token as keyof typeof TYPE_ROLES}-leading` as const;
      assert.equal(b[t], a[t]);
    }
  }
});

// ── Density (ADR 0020 §4) ───────────────────────────────────────────────────


const heightPx = (rem: string) => parseFloat(rem) * 16;

test("default density is the drawn ladders: actions 24/32/44, fields 32/40/48", () => {
  const d = CONTROL_SIZES.default;
  assert.deepEqual(
    [d["--ui-control-sm-height"], d["--ui-control-md-height"], d["--ui-control-lg-height"]].map(heightPx),
    [24, 32, 44],
  );
  assert.deepEqual(
    [d["--ui-field-sm-height"], d["--ui-field-md-height"], d["--ui-field-lg-height"]].map(heightPx),
    [32, 40, 48],
  );
  // The default block IS the fixed table — one source for both.
  for (const [token, value] of Object.entries(d)) assert.equal(FIXED_TOKEN_VALUES[token as FixedToken], value);
});

test("every density step is 4px on the grid, and nothing goes under the 24px floor", () => {
  for (const density of ["compact", "default", "comfortable"] as const) {
    for (const [token, value] of Object.entries(CONTROL_SIZES[density])) {
      if (!token.endsWith("-height")) continue;
      const px = heightPx(value);
      assert.ok(px >= CONTROL_FLOOR_PX, `${density} ${token} is ${px}px, under SC 2.5.8's floor`);
      assert.equal(px % 4, 0, `${density} ${token} is ${px}px, off the 4px grid`);
    }
  }
  const c = CONTROL_SIZES.compact;
  const d = CONTROL_SIZES.default;
  assert.equal(heightPx(c["--ui-control-sm-height"]), 24, "compact action sm holds at the floor");
  assert.equal(heightPx(d["--ui-control-lg-height"]) - heightPx(c["--ui-control-lg-height"]), DENSITY_STEP_PX);
  assert.equal(heightPx(CONTROL_SIZES.comfortable["--ui-field-lg-height"]) - heightPx(d["--ui-field-lg-height"]), DENSITY_STEP_PX);
});

// ── Categorical data slots (ADR 0023) ───────────────────────────────────────
//
// A categorical palette has one job: two series side by side must look like
// two series. That is computable, so it is computed — OKLab ΔE ×100 between
// ADJACENT slots, under normal vision and under Machado, Oliveira & Fernandes
// (2009) protan and deutan simulation at severity 1.0. The floors are the
// dataviz method's: 15 for normal vision is a hard floor; 6 under CVD is the
// floor that is legal only WITH secondary encoding (direct labels, gaps,
// marker shape), which the chart a11y contract requires anyway (ADR 0023 §4).

const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
} as const;

function linearRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

function oklab([r, g, b]: readonly [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function simulate(rgb: [number, number, number], matrix: readonly (readonly number[])[]): [number, number, number] {
  return matrix.map((row) => Math.min(1, Math.max(0, row[0]! * rgb[0] + row[1]! * rgb[1] + row[2]! * rgb[2]))) as [number, number, number];
}

function deltaE(a: string, b: string, matrix?: readonly (readonly number[])[]): number {
  const la = oklab(matrix ? simulate(linearRgb(a), matrix) : linearRgb(a));
  const lb = oklab(matrix ? simulate(linearRgb(b), matrix) : linearRgb(b));
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]) * 100;
}

const CAT_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const catSolid = (i: number) => `--ui-data-cat-${i}-solid` as BrandableToken;

test("adjacent categorical slots stay apart, normally and under protan/deutan", () => {
  const zero = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
  const themes = [
    ...ALL_SEEDS.flatMap(({ name, seed }) =>
      (["light", "dark"] as const).map((scheme) => ({ label: `${name} (${scheme})`, theme: resolveTheme(seed, { scheme }).theme })),
    ),
    { label: "theme zero authored (light)", theme: zero.light },
    { label: "theme zero authored (dark)", theme: zero.dark },
  ];
  for (const { label, theme } of themes) {
    for (const i of CAT_SLOTS.slice(0, -1)) {
      const a = flatten(theme[catSolid(i)], theme["--ui-bg-base"]);
      const b = flatten(theme[catSolid(i + 1)], theme["--ui-bg-base"]);
      const normal = deltaE(a, b);
      assert.ok(normal >= 15, `${label}: slots ${i}/${i + 1} ΔE ${normal.toFixed(1)} under normal vision (floor 15)`);
      for (const kind of ["protan", "deutan"] as const) {
        const cvd = deltaE(a, b, MACHADO[kind]);
        assert.ok(cvd >= 6, `${label}: slots ${i}/${i + 1} ΔE ${cvd.toFixed(1)} under ${kind} (floor 6)`);
      }
    }
  }
});

test("categorical slots are distinct tokens in fixed order — no slot repeats another", () => {
  const { light, dark } = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
  for (const theme of [light, dark]) {
    const solids = CAT_SLOTS.map((i) => theme[catSolid(i)].toUpperCase());
    assert.equal(new Set(solids).size, 8, `two slots resolved to the same mark: ${solids.join(", ")}`);
  }
});
