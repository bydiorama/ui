// Renders Paper's MeshGradient (0.0.82, Apache-2.0, downloaded to the scratchpad)
// under the same conditions as lab.html. Files are served by page.route.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const PAPER = path.join(__dirname, ".out/paper/package/dist");
(async () => {
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.route("http://lab.local/**", (route) => {
    const u = new URL(route.request().url());
    const file = u.pathname.startsWith("/paper/") ? path.join(PAPER, u.pathname.slice(7)) : path.join(__dirname, u.pathname);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
    route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith(".js") ? "text/javascript" : "text/html" });
  });
  await p.goto("http://lab.local/paper.html");
  await p.waitForFunction(() => window.__done, null, { timeout: 15000 });
  console.log("errors", errs);
  for (const id of ["paper-dark", "paper-light", "papergrain-dark"]) await p.locator("#" + id).screenshot({ path: `${__dirname}/.out/${id}.png` });
  await p.addStyleTag({ content: ".copy{visibility:hidden}" });
  fs.mkdirSync(path.join(__dirname, ".out/bg"), { recursive: true });
  for (const id of await p.$$eval(".tile", (els) => els.map((e) => e.id)))
    await p.locator("#" + id).screenshot({ path: path.join(__dirname, ".out/bg", id + ".png") });
  await b.close();
})();
