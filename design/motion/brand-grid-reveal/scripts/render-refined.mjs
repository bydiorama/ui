// Deterministic render of a refined cut: every frame is sought to its exact film
// time, captured at 2x, Lanczos-downsampled and encoded H.264 CRF15 at 60fps.
//   node render-refined.mjs <6s|9s> [portrait]
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=... as for the other renderers.
import fs from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const length = process.argv[2];
const portrait = process.argv[3] === 'portrait';
if (!['6s', '9s'].includes(length)) throw Error('Usage: render-refined.mjs <6s|9s> [portrait]');
const [w, h] = portrait ? [1080, 1350] : [1600, 1200];
const name = `refined-${length}${portrait ? '-portrait' : ''}`;
const out = join(root, 'exports/videos', `brand-grid-reveal-refined-${length}-light-${w}x${h}-60fps.mp4`);
fs.mkdirSync(join(root, 'exports/videos'), {recursive: true});
fs.mkdirSync(join(root, 'exports/reports'), {recursive: true});

const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {});
const page = await browser.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 2});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('requestfailed', r => errors.push(r.url()));
await page.goto(pathToFileURL(join(root, `previews/brand-grid-reveal-${name}.html`)).href + '#render');
await page.evaluate(() => window.ready);
const cue = await page.evaluate(() => cueSheet());
const encoder = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-vcodec', 'mjpeg', '-i', 'pipe:0',
  '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
encoder.stderr.pipe(process.stderr);
const closed = once(encoder, 'close');
const frames = Math.round(cue.duration * 60);
try {
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.seek(t), i / 60);
    const data = await page.screenshot({type: 'jpeg', quality: 95});
    if (!encoder.stdin.write(data)) await once(encoder.stdin, 'drain');
    if (i % 120 === 0) console.log(`${name} ${i}/${frames}`);
  }
  encoder.stdin.end();
  const [code] = await closed;
  if (code) throw Error(`ffmpeg exited ${code}`);
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(join(root, `exports/reports/${name}-render-report.json`), JSON.stringify({
    width: w, height: h, captureScale: 2, fps: 60, frames, duration: frames / 60,
    sampling: 'exact deterministic seek; no screencast cadence gaps', errors, cue}, null, 2));
  console.log(out);
} finally {
  await browser.close();
  if (encoder.exitCode === null) encoder.kill();
}
