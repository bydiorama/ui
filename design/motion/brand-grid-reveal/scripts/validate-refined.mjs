// Validates the refined 6s / 9s previews, landscape and portrait.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=... node validate-refined.mjs
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const pixelHash = b => createHash('sha256').update(execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {input: b, maxBuffer: 40000000})).digest('hex');
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {});
const report = [];
try {
  for (const length of ['6s', '9s']) for (const portrait of [false, true]) {
    const name = `refined-${length}${portrait ? '-portrait' : ''}`;
    const page = await browser.newPage({viewport: {width: portrait ? 1080 : 1600, height: portrait ? 1350 : 1200}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => errors.push(r.url()));
    await page.goto(new URL(`../previews/brand-grid-reveal-${name}.html#render`, import.meta.url).href);
    await page.evaluate(() => window.ready);
    const at = t => page.evaluate(t => {seek(t);return filmAudit();}, t);
    const cue = await page.evaluate(() => cueSheet());
    const checks = [];
    const ok = (label, cond) => {assert.ok(cond, `${name}: ${label}`);checks.push(label);};

    ok('embedded fonts loaded', await page.evaluate(() => document.fonts.check('11px "Paper Mono"') && document.fonts.check('16px Aspekta') && [...document.fonts].every(f => f.status !== 'error')));

    // Cue sheet order: code lands, then releases its region; interactions wait for a finished UI.
    cue.blocks.forEach((b, i) => {
      ok(`block ${b.name}: its region starts only after the block has landed`, b.firstCue >= b.commit - 1e-6);
      if (i) ok(`block ${b.name}: starts only after ${cue.blocks[i - 1].name} has committed`, b.start >= cue.blocks[i - 1].commit + .08);
    });
    ok('widget outlasts generation', cue.generated >= cue.blocks.at(-1).commit);
    const parts = (await at(0)).parts;
    ok('bare grid at t=0', (await at(0)).visible === 0);
    ok('UI complete before the photo stack moves', (await at(cue.photo - .01)).visible === parts);
    ok('photo stack moves before the first tick', cue.photo < cue.ticks[0]);
    ok('retirement begins after the last tick', cue.retire.start >= cue.ticks.at(-1) + .34 + .05);
    ok('everything is retired before the loop point', (await at(cue.duration - .02)).visible === 0);

    // Legibility: at each commit the active block is fully inside the clear part of the viewport.
    for (const [i, b] of cue.blocks.entries()) {
      const g = await page.evaluate(([t, i]) => codeLegibility(t, i), [b.commit, i]);
      ok(`block ${b.name}: ${g.rows.length} rows clear of both faders`, g.rows.every(r => r.top >= g.viewport.top - .5 && r.bottom <= g.viewport.bottom + .5));
      ok(`block ${b.name}: no line is clipped on the right`, g.rows.every(r => r.textRight <= g.viewport.width - 20 * g.scale + .5));
    }
    const w = (await page.evaluate(() => (seek(0), revealAudit()))).widget;
    ok('code is 11px on a 22px line', w.fontSize === '11px' && w.lineHeight === '22px');
    await at(cue.blocks.at(-1).commit + .2);
    ok('line counter reaches the total', (await page.evaluate(() => revealAudit().widget.lines)) === '24 lines');
    await at(cue.generated + .05);
    ok('status reads Generated', (await page.evaluate(() => revealAudit().widget.status)) === 'Generated');
    for (const t of [.3, .8, 1.2, 1.6, 2, 2.5]) { await at(t); ok(`no skeleton/glyph overlap at ${t}s`, await page.evaluate(() => revealAudit().textOverlap) === 0); }
    ok('settled values', JSON.stringify((await at(cue.ticks.at(-1) + .6)).values) === JSON.stringify(['1.3k', '72%', '72 of 100 GB used', '15']));

    if (portrait) {
      const expected = {'#app': [32, 208, 1144, 784], '#code-widget': [480, 32, 448, 242]};
      await at(cue.photo - .01);
      for (const [sel, rect] of Object.entries(expected)) {
        const actual = await page.locator(sel).boundingBox();
        ['x', 'y', 'width', 'height'].forEach((key, i) => assert.ok(Math.abs(actual[key] - rect[i] * 1.125) < .6, `${name}: ${sel} ${key}`));
      }
      checks.push('portrait geometry matches the Paper artboard');
    }

    // Loop seam: first and last frames decode to identical pixels.
    await page.evaluate(() => seek(0));
    const first = await page.screenshot();
    await page.evaluate(t => seek(t), cue.duration);
    ok('loop endpoints are pixel-identical', pixelHash(first) === pixelHash(await page.screenshot()));

    const dir = new URL(`../exports/stills/${name}/`, import.meta.url);
    mkdirSync(dir, {recursive: true});
    const beats = [...cue.blocks.map(b => b.commit + .02), cue.photo + .3, cue.ticks.at(-1) + .6];
    for (const t of beats) { await at(t); await page.screenshot({path: fileURLToPath(new URL(`preview-${t.toFixed(2)}.png`, dir))}); }

    await page.emulateMedia({reducedMotion: 'reduce'});
    const r = await at(0);
    ok('reduced motion shows the finished UI', r.visible === r.parts && r.wireVisible === 0);
    ok('no page or resource errors', errors.length === 0);
    await page.close();
    report.push({name, checks});
    console.log(`${name}: ${checks.length} checks passed`);
  }
  mkdirSync(new URL('../exports/reports/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../exports/reports/refined-validation.json', import.meta.url), JSON.stringify({passed: true, report}, null, 2));
} finally {
  await browser.close();
}
