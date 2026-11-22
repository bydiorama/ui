const { chromium } = require('playwright');
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/.out/lab.html');
  await p.waitForFunction(() => window.__done);
  console.log('errors', await p.evaluate(() => window.__errors));
  for (const id of await p.$$eval('.tile', els => els.map(e => e.id))) {
    await p.locator('#' + id).screenshot({ path: `${__dirname}/.out/${id}.png` });
  }
  await p.addStyleTag({ content: ".copy{visibility:hidden}" });
  fs.mkdirSync(path.join(__dirname, ".out/bg"), { recursive: true });
  for (const id of await p.$$eval(".tile", (els) => els.map((e) => e.id)))
    await p.locator("#" + id).screenshot({ path: path.join(__dirname, ".out/bg", id + ".png") });
  await b.close();
})();
