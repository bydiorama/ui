#!/usr/bin/env node
/**
 * Visual diff of a running app against 1× design exports.
 *
 *   node scripts/visual-diff.mjs                        # every case
 *   node scripts/visual-diff.mjs comment-row tag-picker # only these ids
 *
 * Options (flag, or environment variable):
 *   --cases <file>  CASES    cases module    (default scripts/visual-cases.mjs)
 *   --refs  <dir>   REFS     reference PNGs  (default design/references)
 *   --out   <dir>   OUT      report folder   (default visual — ignore it in git)
 *                   BASE_URL app under test (default http://localhost:5173)
 *                   THRESHOLD max channel delta still counted equal (default 48)
 * Paths resolve from the working directory: run it from the app root.
 *
 * For every case it opens the app in the reference's state and size,
 * screenshots the page or one element at deviceScaleFactor 1, compares it
 * with the export on a <canvas> in the same browser, and writes ref / actual
 * / diff PNGs plus `report.html` (a wipe slider and the diff in red).
 * Dependency-free besides Playwright, which it resolves from the app.
 *
 * THE CASES MODULE exports `CASES` (required) and `CONFIG` (optional):
 *
 *   export const CONFIG = {
 *     viewport: { width: 1440, height: 900 },   // default for every case
 *     css: "[data-dev-chrome]{display:none!important}", // injected first
 *     reset: async (page) => { … },            // fresh state before setup
 *     settleMs: 700,                            // after setup, before capture
 *     links: { "comment-row": "https://…" },    // case id → design node URL
 *   };
 *   export const CASES = [{
 *     id: "comment-row",            // output names and the CLI filter
 *     ref: "comment-row.png",       // file in the references folder
 *     route: "/#/comments",         // appended to BASE_URL
 *     viewport, setup: async (page) => {},  // drive the page into the state
 *     target: (page) => page.getByRole("article").first(), // element case
 *     fullHeight: 1789,             // capture this much of a scrolling page
 *     refCrop: [x, y, w, h],        // when the export has an opaque margin
 *     masks: [[x, y, w, h]],        // ignored on both sides — say why
 *   }];
 *
 * Element exports carry the design tool's shadow bleed; an element case is
 * cropped to the export's opaque box (alpha ≥ 250) automatically, so
 * `target` should be the element's own box.
 *
 * The number is a guide, not a gate. A design tool and Chromium rasterise
 * text differently, so a perfect match is never 0%. Read the red: a red
 * glyph outline is font rendering, a doubled element is an offset, a red
 * block is a missing or mis-sized part. Compare runs, not absolutes.
 *
 * Installed from bydiorama/ui as the `visual-diff` registry item; the method
 * is the `diorama-visual-review` skill.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const opt = (flag, env, fallback) => {
  const i = argv.indexOf(`--${flag}`);
  if (i !== -1) {
    const value = argv[i + 1];
    argv.splice(i, 2);
    return value;
  }
  return process.env[env] ?? fallback;
};

const CWD = process.cwd();
const CASES_FILE = resolve(CWD, opt("cases", "CASES", "scripts/visual-cases.mjs"));
const REFS = resolve(CWD, opt("refs", "REFS", "design/references"));
const OUT = resolve(CWD, opt("out", "OUT", "visual"));
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const THRESHOLD = Number(process.env.THRESHOLD ?? 48);
const only = argv;

/** Playwright from the app, not from wherever this file happens to live. */
async function loadChromium() {
  for (const name of ["playwright", "@playwright/test"]) {
    try {
      return createRequire(join(CWD, "package.json"))(name).chromium;
    } catch {
      // not installed in the app under that name — try this file's own resolution
    }
    try {
      return (await import(name)).chromium;
    } catch {
      // nor here — try the next name
    }
  }
  console.error("✗ Needs Playwright in the app: pnpm add -D playwright && pnpm exec playwright install chromium");
  process.exit(1);
}

const { CASES, CONFIG = {} } = await import(pathToFileURL(CASES_FILE).href).catch((e) => {
  console.error(`✗ Cannot load the cases module ${CASES_FILE}: ${e.message}`);
  process.exit(1);
});
if (!Array.isArray(CASES)) {
  console.error(`✗ ${CASES_FILE} must export CASES, an array`);
  process.exit(1);
}

const chromium = await loadChromium();
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];

for (const c of CASES.filter((c) => !only.length || only.includes(c.id))) {
  const viewport = c.viewport ?? CONFIG.viewport ?? { width: 1440, height: 900 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    const refBuf = readFileSync(join(REFS, c.ref));
    await page.goto(`${BASE}${c.route ?? ""}`);
    if (CONFIG.reset) await CONFIG.reset(page);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    if (CONFIG.css) await page.addStyleTag({ content: CONFIG.css });
    if (c.setup) await c.setup(page);
    await page.waitForTimeout(c.settleMs ?? CONFIG.settleMs ?? 700); // enter transitions settle
    const shot = { animations: "disabled", caret: "hide" };
    const actual = c.target
      ? await c.target(page).screenshot(shot)
      : c.fullHeight
        ? await page.screenshot({ ...shot, fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height: c.fullHeight } })
        : await page.screenshot(shot);

    const cmp = await page.evaluate(
      async ({ ref, act, masks, threshold, crop, refCrop }) => {
        const load = (b64) =>
          new Promise((ok, fail) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = fail;
            i.src = `data:image/png;base64,${b64}`;
          });
        const [ri, ai] = await Promise.all([load(ref), load(act)]);
        const draw = (img, w, h) => {
          const cv = document.createElement("canvas");
          cv.width = w;
          cv.height = h;
          const cx = cv.getContext("2d");
          cx.drawImage(img, 0, 0);
          return { cv, data: cx.getImageData(0, 0, w, h).data };
        };
        const full = draw(ri, ri.width, ri.height);
        let [rx, ry, rw, rh] = [0, 0, ri.width, ri.height];
        if (refCrop) [rx, ry, rw, rh] = refCrop;
        else if (crop) {
          // Shadow bleed is translucent; the element's own box is opaque.
          let x0 = rw, y0 = rh, x1 = -1, y1 = -1;
          for (let y = 0; y < rh; y++)
            for (let x = 0; x < rw; x++)
              if (full.data[(y * rw + x) * 4 + 3] >= 250) {
                if (x < x0) x0 = x;
                if (y < y0) y0 = y;
                if (x > x1) x1 = x;
                if (y > y1) y1 = y;
              }
          if (x1 >= 0) [rx, ry, rw, rh] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
        }
        const refCv = document.createElement("canvas");
        refCv.width = rw;
        refCv.height = rh;
        refCv.getContext("2d").drawImage(full.cv, rx, ry, rw, rh, 0, 0, rw, rh);
        const w = Math.max(rw, ai.width);
        const h = Math.max(rh, ai.height);
        const R = draw(refCv, w, h);
        const A = draw(ai, w, h);
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const ox = out.getContext("2d");
        const od = ox.createImageData(w, h);
        const masked = (x, y) => masks.some(([mx, my, mw, mh]) => x >= mx && x < mx + mw && y >= my && y < my + mh);
        let bad = 0;
        let counted = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            od.data[i + 3] = 255;
            if (masked(x, y)) {
              od.data[i] = od.data[i + 1] = od.data[i + 2] = 200;
              continue;
            }
            counted++;
            let d = 0;
            for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(R.data[i + k] - A.data[i + k]));
            if (d > threshold) {
              bad++;
              od.data[i] = 230;
              od.data[i + 1] = 30;
              od.data[i + 2] = 40;
            } else {
              // A faint underlay of the reference, so the red has a place.
              od.data[i] = od.data[i + 1] = od.data[i + 2] = 255 - (255 - (R.data[i] + R.data[i + 1] + R.data[i + 2]) / 3) * 0.25;
            }
          }
        }
        ox.putImageData(od, 0, 0);
        return {
          mismatch: counted ? bad / counted : 0,
          size: { ref: [rw, rh], actual: [ai.width, ai.height] },
          refPng: refCv.toDataURL("image/png").split(",")[1],
          diffPng: out.toDataURL("image/png").split(",")[1],
        };
      },
      {
        ref: refBuf.toString("base64"),
        act: actual.toString("base64"),
        masks: c.masks ?? [],
        threshold: THRESHOLD,
        crop: Boolean(c.target),
        refCrop: c.refCrop ?? null,
      },
    );

    writeFileSync(join(OUT, `${c.id}.ref.png`), Buffer.from(cmp.refPng, "base64"));
    writeFileSync(join(OUT, `${c.id}.actual.png`), actual);
    writeFileSync(join(OUT, `${c.id}.diff.png`), Buffer.from(cmp.diffPng, "base64"));
    const sizes = cmp.size.ref.join("×") === cmp.size.actual.join("×") ? "" : `  size ref ${cmp.size.ref.join("×")} vs actual ${cmp.size.actual.join("×")}`;
    console.log(`${(cmp.mismatch * 100).toFixed(2).padStart(6)}%  ${c.id}${sizes}`);
    results.push({ ...c, mismatch: cmp.mismatch, size: cmp.size });
  } catch (e) {
    const message = String(e?.message ?? e).split("\n")[0];
    console.error(`  ✗  ${c.id}: ${message}`);
    results.push({ ...c, error: message });
  } finally {
    await page.close();
  }
}
await browser.close();

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const section = (r) => {
  if (r.error) return `<section><h2>${esc(r.id)}</h2><p class="bad">${esc(r.error)}</p></section>`;
  const link = CONFIG.links?.[r.id];
  const pct = (r.mismatch * 100).toFixed(2);
  return `<section><h2>${esc(r.id)} <span class="${r.mismatch > 0.05 ? "bad" : ""}">${pct}%</span></h2>
<p>${link ? `<a href="${esc(link)}">${esc(r.ref)}</a>` : esc(r.ref)} · ${esc(r.route ?? "")} · ref ${r.size.ref.join("×")}, actual ${r.size.actual.join("×")}</p>
<div class="slider"><img src="${esc(r.id)}.actual.png"><div class="top"><img src="${esc(r.id)}.ref.png"></div>
<input type="range" min="0" max="100" value="50" oninput="this.previousElementSibling.style.width=this.value+'%'"></div>
<div class="row"><figure><img src="${esc(r.id)}.ref.png"><figcaption>Design</figcaption></figure><figure><img src="${esc(r.id)}.actual.png"><figcaption>App</figcaption></figure><figure><img src="${esc(r.id)}.diff.png"><figcaption>Diff</figcaption></figure></div></section>`;
};
writeFileSync(
  join(OUT, "report.html"),
  `<!doctype html><meta charset="utf-8"><title>Visual diff</title>
<style>
body{font:13px/1.5 system-ui,sans-serif;margin:24px;background:#f4f4f2;color:#222}
section{background:#fff;border-radius:12px;padding:16px;margin:16px 0}
.row{display:flex;gap:12px;align-items:flex-start;overflow-x:auto} figure{margin:0} figcaption{font-size:11px;color:#666}
img{display:block;max-width:none;outline:1px solid #ddd} .bad{color:#b00}
.slider{position:relative;display:inline-block} .slider .top{position:absolute;inset:0;overflow:hidden;width:50%;border-right:2px solid #36c}
.slider input{width:100%}
</style>
<h1>Visual diff against the design</h1>
<p>Red: pixels differing by more than ${THRESHOLD}/255 on any channel. Grey: masked. Drag the slider to wipe between the design (left) and the app.</p>
${results.map(section).join("\n")}`,
);
console.log(`\nreport: ${join(OUT, "report.html")}`);
if (results.some((r) => r.error)) process.exitCode = 1;
