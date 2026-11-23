import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("ui.manifest.json", root), "utf8"));
// Install targets define aliases, so a newly registered component needs no
// second hand-maintained list here. Longest first: nested targets win.
const aliases = manifest.items.flatMap(item => item.files)
  .filter(file => /\.[cm]?[jt]sx?$/.test(file.path) && !file.path.endsWith(".doc.ts") && !file.target.startsWith("."))
  .map(file => ({ find: `@/${file.target.replace(/\.[cm]?[jt]sx?$/, "")}`, replacement: fileURLToPath(new URL(file.path, root)) }))
  .sort((a, b) => b.find.length - a.find.length);

export default defineConfig({
  site: "https://ui.bydiorama.com",
  output: "static",
  trailingSlash: "always",
  integrations: [react()],
  vite: { plugins: [tailwindcss()], resolve: { alias: aliases } },
});
