import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { resolveThemePair, toCss } from "../../../packages/tokens/src/index.ts";
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
writeFileSync(fileURLToPath(new URL("src/styles/presets.generated.css", site)), css.join("\n"));
