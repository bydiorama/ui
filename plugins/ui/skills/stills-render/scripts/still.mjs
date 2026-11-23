// usage (from the repo root): [PAGE=page.html] node still.mjs <outdir> <specs.json>
// each spec {name, mode, t, light, comp}; t = the moment in the video, in seconds. Then: python3 -I still.py <outdir> <final dir>
// Playwright is not hoisted in this repo (pnpm): use it if resolvable, else find the store copy from the cwd.
import { readdirSync } from "node:fs";
async function loadChromium() {
  try { return (await import("playwright")).chromium; } catch {}
  const store = process.cwd() + "/node_modules/.pnpm";
  const dir = readdirSync(store).filter((d) => /^playwright@/.test(d)).sort().pop();
  if (!dir) throw new Error("Playwright not found — run from the repo root after pnpm install, or `npm i playwright`");
  return (await import(`${store}/${dir}/node_modules/playwright/index.mjs`)).chromium;
}
const chromium = await loadChromium();
import fs from "node:fs";
import { resolve } from "node:path";
const [dir, specFile] = process.argv.slice(2); const PAGE = resolve(process.env.PAGE || `${dir}/index.html`); const specs = JSON.parse(fs.readFileSync(specFile, "utf8"));
const SLOW = 8, K = 2, PAD = 120; const b = await chromium.launch(); const out = [];
for (const sp of specs) {
  const SIZE = sp.comp === "portrait" ? [864, 1080] : sp.comp === "landscape" ? [1024, 768] : [1512 + 2 * PAD, 982 + 2 * PAD];
  const off = sp.comp === "portrait" ? { x: 48, y: 48 } : { x: 64, y: 64 };
  const ctx = await b.newContext({ viewport: { width: SIZE[0] * K, height: SIZE[1] * K } });
  await ctx.addInitScript(([slow, pad, k, light, comp, off]) => {
    window.__RENDER = true; window.__SLOW = slow; window.__STAGE_SCALE = k; window.__PAD = pad * k;
    if (light) window.__LIGHT = true; if (comp) window.__COMPOSE = { x: off.x, y: off.y, k };
    const o = window.setTimeout.bind(window); window.setTimeout = (f, ms, ...a) => o(f, (Number(ms) || 0) * slow, ...a);
  }, [SLOW, PAD, K, !!sp.light, sp.comp || "", off]);
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("file://" + PAGE + "#demo"); await p.evaluate(() => document.fonts.ready);
  let crop = null;
  if (sp.mode === "main") { await p.waitForTimeout(300); crop = await p.evaluate(() => { const r = document.getElementById("app").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); }
  else if (sp.mode !== "composition") { await p.evaluate(() => window.showIntroInstant()); await p.waitForTimeout(1500); crop = await p.evaluate((m) => window.snippetRect(m, 40), sp.mode); }
  const cdp = await ctx.newCDPSession(p); await cdp.send("Animation.enable"); await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
  p.evaluate(([m, comp]) => m === "main" ? window.runDemo() : m === "composition" ? window.runComposition(comp) : window.runSnippet(m), [sp.mode, sp.comp]).catch(() => {});
  await p.waitForTimeout(Math.max(0, sp.t * SLOW * 1000 - 300));
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });   // freeze transitions mid-state
  await p.evaluate(() => { const c = document.getElementById("cursor"); c.style.transition = "none"; c.style.opacity = "0"; });
  await p.waitForTimeout(120);
  await p.screenshot({ path: `${dir}/raw-${sp.name}.png` });
  out.push({ ...sp, crop, size: SIZE, errors }); console.log(sp.name, errors.length ? errors : "ok");
  await ctx.close();
}
fs.writeFileSync(`${dir}/raw.json`, JSON.stringify(out)); await b.close();
