// usage (from the repo root): [PAGE=page.html] LIGHT=1 COMP=landscape|portrait node render.mjs <outdir> <mode> [slow=8] [pad=120]
// PAGE defaults to <outdir>/index.html — a full HTML document exposing the ui-demo-page API.
// Frames land in <outdir>/cap-<light|dark>-<landscape|portrait|ui>-<mode>/; feed that to compose.py.
// mode: main | <snippet> | composition
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
const [dir, mode, slowArg, padArg] = process.argv.slice(2);
const PAGE = resolve(process.env.PAGE || `${dir}/index.html`);
const SLOW = Number(slowArg || 8), PAD = Number(padArg || 120), K = 2, LIGHT = process.env.LIGHT === "1", COMP = process.env.COMP || "";
const tag = `${LIGHT ? "light" : "dark"}-${COMP || "ui"}-${mode}`;
const out = `${dir}/cap-${tag}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(`${out}/frames`, { recursive: true });
const SIZE = COMP === "portrait" ? [864, 1080] : COMP === "landscape" ? [1024, 768] : [1512 + 2 * PAD, 982 + 2 * PAD];
const OFFSET = COMP === "portrait" ? { x: 48, y: 48 } : { x: 64, y: 64 };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: SIZE[0] * K, height: SIZE[1] * K }, deviceScaleFactor: 1 });
await ctx.addInitScript(([slow, pad, k, light, comp, off]) => {
  window.__RENDER = true; window.__SLOW = slow; window.__STAGE_SCALE = k; window.__PAD = pad * k;
  if (light) window.__LIGHT = true;
  if (comp) window.__COMPOSE = { x: off.x, y: off.y, k };
  const o = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => o(f, (Number(ms) || 0) * slow, ...a);
}, [SLOW, PAD, K, LIGHT, COMP, OFFSET]);
const p = await ctx.newPage(); const errors = [];
p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await p.goto("file://" + PAGE + "#demo");
await p.evaluate(() => document.fonts.ready);
let crop = null;
if (mode !== "main" && mode !== "composition") {
  await p.evaluate(() => window.showIntroInstant()); await p.waitForTimeout(1500);
  crop = await p.evaluate((m) => window.snippetRect(m, 40), mode);
}
const cdp = await ctx.newCDPSession(p);
await cdp.send("Animation.enable"); await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
const frames = []; let n = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const name = `f${String(n++).padStart(6, "0")}.jpg`;
  fs.writeFileSync(`${out}/frames/${name}`, Buffer.from(f.data, "base64")); frames.push({ name, t: f.metadata.timestamp });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: SIZE[0] * K, maxHeight: SIZE[1] * K, everyNthFrame: 1 });
await p.waitForTimeout(300);
const t0 = Date.now();
if (mode === "main") await p.evaluate(() => window.runDemo());
else if (mode === "composition") await p.evaluate((o) => window.runComposition(o), COMP);
else await p.evaluate((m) => window.runSnippet(m), mode);
const tEnd = Date.now() / 1000;
await p.waitForTimeout(200); await cdp.send("Page.stopScreencast");
fs.writeFileSync(`${out}/meta.json`, JSON.stringify({ frames, crop, slow: SLOW, tEnd, light: LIGHT, comp: COMP, size: SIZE }));
console.log(JSON.stringify({ tag, frames: frames.length, realSeconds: (Date.now() - t0) / 1000, crop, errors }));
await b.close();
