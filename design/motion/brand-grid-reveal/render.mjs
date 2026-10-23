// Deterministic variant of ui-video-render/scripts/render.mjs: seek every
// film frame instead of recording wall time. Same 2× capture, 60fps and CRF15.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
// CHROMIUM_EXECUTABLE=/absolute/path/to/chromium node design/motion/brand-grid-reveal/render.mjs
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = dirname(fileURLToPath(import.meta.url));
const output = join(dir, 'exports');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('requestfailed', r => errors.push(r.url() + ': ' + r.failure()?.errorText));
await page.goto(pathToFileURL(join(dir, 'brand-grid-reveal.html')).href + '#render');
await page.evaluate(() => window.ready);
if (!await page.evaluate(() => document.fonts.check('500 32px Aspekta'))) throw Error('Aspekta not loaded');
const outFile = join(output, 'brand-grid-reveal-light-1600x1200-60fps.mp4');
const encoder = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60',
  '-vcodec', 'mjpeg', '-i', 'pipe:0', '-vf', 'scale=1600:1200:flags=lanczos',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
encoder.stderr.pipe(process.stderr);
const completed = once(encoder, 'close');
const fps = 60, count = 570, samples = [0, 42, 96, 168, 216, 258, 288, 336, 372, 444, 569];
try {
  for (let i = 0; i < count; i++) {
    await page.evaluate(t => window.seek(t), i / fps);
    if (samples.includes(i)) await page.screenshot({ path: join(output, `beat-${String(i).padStart(4, '0')}.png`) });
    const data = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!encoder.stdin.write(data)) await once(encoder.stdin, 'drain');
    if (i % 120 === 0) console.log(`${i}/${count} frames`);
  }
  encoder.stdin.end();
  const [code] = await completed;
  if (code) throw Error(`ffmpeg exited ${code}`);
  if (errors.length) throw Error(errors.join('\n'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(() => { window.seek(0); return window.filmAudit(); });
  if (reduced.visible !== reduced.parts || reduced.wireVisible !== 0) throw Error('Reduced motion must show finished UI');
  fs.writeFileSync(join(output, 'render-report.json'), JSON.stringify({
    width: 1600, height: 1200, captureScale: 2, fps, frames: count, duration: count / fps,
    filmTimeGapMs: 1000 / fps, sampling: 'exact deterministic seek; no screencast cadence gaps',
    errors, font: 'embedded Aspekta', embeddedImages: 3, reducedMotion: reduced.visible === reduced.parts, proceduralAudit: reduced
  }, null, 2));
  console.log(outFile);
} finally {
  await browser.close();
  if (encoder.exitCode === null) encoder.kill();
}
