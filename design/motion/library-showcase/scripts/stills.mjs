// 2× poster stills at the payoff (t = 11 s), cursors hidden → exports/stills/masters/
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const job = dirname(dirname(fileURLToPath(import.meta.url)));
const {chromium} = createRequire(join(job, '../../../apps/storybook/package.json'))('playwright');
const out = join(job, 'exports/stills/masters'); fs.mkdirSync(out, {recursive: true});
const b = await chromium.launch();
for (const s of ['light', 'dark']) {
  const p = await b.newPage({viewport: {width: 1600, height: 1200}, deviceScaleFactor: 2});
  await p.goto(pathToFileURL(resolve(job, `previews/library-showcase${s === 'dark' ? '-dark' : ''}.html`)).href + '#render');
  await p.evaluate(async () => { await window.ready; seek(12.4); document.querySelector('#cursors').style.display = 'none'; });
  await p.screenshot({path: join(out, `library-showcase-published-${s}-3200x2400.png`)});
}
await b.close(); console.log('stills done');
