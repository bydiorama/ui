import test from "node:test";
import assert from "node:assert/strict";

import { resolveThemePair } from "../resolve.ts";
import { THEME_ZERO } from "../themes/zero.ts";
import { toCss } from "./css.ts";
import { toTailwindTheme } from "./tailwind.ts";
import { toThemeStylesheet } from "./stylesheet.ts";

const pair = resolveThemePair(THEME_ZERO);

test("the stylesheet is a comment header, the @theme map, then the :root token layer", () => {
  const css = toThemeStylesheet(pair, { header: ["Line one.", "", "Line two."] });
  assert.equal(
    css,
    ["/*", " * Line one.", " *", " * Line two.", " */", "", toTailwindTheme(), "", toCss(pair, { scope: ":root", scheme: "auto" })].join("\n"),
  );
});

test("the scheme reaches the token layer", () => {
  const css = toThemeStylesheet(pair, { header: [], scheme: "light" });
  assert.ok(css.endsWith(toCss(pair, { scope: ":root", scheme: "light" })));
});
