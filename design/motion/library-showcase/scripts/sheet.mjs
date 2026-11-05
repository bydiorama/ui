// Contact sheet: frames at given times → exports/contact-sheets/<name>.png
// usage: node scripts/sheet.mjs [name] [scheme light|dark] [t1,t2,...]
import fs from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

const job = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(job, '../../../apps/storybook/package.json'));
const {chromium} = require('playwright');
const [name = 'sheet', scheme = 'light', times = '0,1.7,2.7,4,5.3,6,7,8.5,10.2,12.4,14.2,15.98'] = process.argv.slice(2);
const ts = times.split(',').map(Number);
const out = join(job, 'exports/contact-sheets'), tmp = join(out, `.${name}`);
fs.mkdirSync(tmp, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1600, height: 1200}, deviceScaleFactor: 1});
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(resolve(job, 'previews/library-showcase.html')).href + '#render' + (scheme === 'dark' ? '-dark' : ''));
await page.evaluate(async () => { await window.ready; });
const files = [];
for (const [i, t] of ts.entries()) {
  await page.evaluate(t => seek(t), t);
  const f = join(tmp, `${String(i).padStart(2, '0')}.png`);
  await page.screenshot({path: f}); files.push(f);
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS', errors);
const cols = 3, rows = Math.ceil(files.length / cols);
const args = ['-v', 'error', '-y'];
files.forEach(f => args.push('-i', f));
const labels = files.map((_, i) => `[${i}:v]scale=800:600,pad=804:604:2:2:black[v${i}]`).join(';');
const layout = files.map((_, i) => `${(i % cols) * 804}_${Math.floor(i / cols) * 604}`).join('|');
args.push('-filter_complex', `${labels};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`, join(out, `${name}.png`));
if (files.length === 1) fs.copyFileSync(files[0], join(out, `${name}.png`)); else execFileSync('ffmpeg', args);
console.log('times', ts.join(' '));
console.log(join(out, `${name}.png`));
