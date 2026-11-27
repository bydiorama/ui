import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { FIXED_TOKEN_VALUES, resolveThemePair, THEME_ZERO, toCss, ZERO_AUTHORED } from "../../../packages/tokens/src/index.ts";
import { themePresets } from "../src/lib/theme-presets.ts";

const site = new URL("../", import.meta.url);
mkdirSync(new URL("public/downloads/", site), { recursive: true });
execFileSync("pnpm", ["--filter", "@bydiorama/ui", "pack", "--pack-destination", fileURLToPath(new URL("public/downloads/", site))], { cwd: fileURLToPath(new URL("../../../", import.meta.url)), stdio: "pipe" });
const manifest = JSON.parse(readFileSync(new URL("../../../ui.manifest.json", import.meta.url), "utf8"));
const paths = Object.fromEntries(manifest.items.flatMap(item => item.files)
  .filter(file => /\.[cm]?[jt]sx?$/.test(file.path) && !file.target.startsWith("."))
  .map(file => [`@/${file.target.replace(/\.[cm]?[jt]sx?$/, "")}`, [`../../${file.path}`]]));
paths["@bydiorama/tokens"] = ["../../packages/tokens/src/index.ts"];
writeFileSync(new URL("tsconfig.paths.generated.json", site), JSON.stringify({ extends: "../../tsconfig.json", compilerOptions: { paths } }, null, 2) + "\n");
mkdirSync(new URL("public/fonts/aspekta/", site), { recursive: true });
for (const file of ["AspektaVF.woff2", "OFL.txt"]) {
  cpSync(new URL(`../../../registry/fonts/aspekta/${file}`, import.meta.url), new URL(`public/fonts/aspekta/${file}`, site));
}
const css = ["/* Generated from the token resolver by scripts/prepare.mjs. */"];
for (const [name, seed] of Object.entries(themePresets)) {
  const pair = resolveThemePair(seed);
  css.push(toCss(pair, { scope: `[data-site-brand="${name}"]`, includeBase: false }));
}
// A nested Zero swatch owns its brand, while density and motion still inherit.
css.push(toCss(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), {
  scope: '[data-site-brand="zero"]:not(html)', includeBase: false,
}));
// A timing pair resolves its var() references on the element that declares it.
// Recompute it at local level boundaries so a quiet region gets its own durations.
const intents = ["micro", "standard", "deliberate", "choreographed"].map(name => `--ui-motion-${name}`);
css.push(`[data-ui-motion] {
${intents.map(key => `  ${key}: ${FIXED_TOKEN_VALUES[key]};`).join("\n")}
}`);
writeFileSync(fileURLToPath(new URL("src/styles/presets.generated.css", site)), css.join("\n"));
