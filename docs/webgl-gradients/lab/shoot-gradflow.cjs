// Renders gradflow's shader types (meerbahadin/gradflow, cloned to
// .out/gradflow) with theme zero's dark tokens, under the same conditions as
// lab.html: 960x540, 1x DPR, one still frame, the Ground story's copy on top.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, ".out/gradflow/src/core/shader.ts"), "utf8");
const grab = (name) => src.match(new RegExp(`export const ${name} = \`([\\s\\S]*?)\``))[1];
const VERTEX = grab("VERTEX_SHADER");
const FRAGMENT = grab("FRAGMENT_SHADER");

// gradflow's type indices (src/core/shader.ts, shade()).
const TYPES = { mesh: 7, silk: 4, stripe: 6, fold: 15, horizon: 19, aurora: 8 };
// color2 is the ground in horizon/aurora/fold; 1 and 3 are the light.
const COLORS = ["#9EDBF3", "#171411", "#5E7FB8"];

const tiles = Object.entries(TYPES).map(([name, type]) => ({ id: `gradflow-${name}`, type, noise: 0 }));
tiles.push({ id: "gradflow-horizon-noise", type: TYPES.horizon, noise: 0.25 });

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:13px system-ui;background:#171411}.tile{position:relative;width:960px;height:540px;margin-bottom:4px}
canvas{position:absolute;inset:0;width:960px;height:540px}.copy{position:absolute;left:48px;bottom:44px}
.copy b{display:block;font-size:22px;font-weight:600;margin-bottom:6px;color:#FAF7F3}.copy span{color:#A69F98}</style>
${tiles.map((t) => `<div class="tile" id="${t.id}"><canvas width="960" height="540"></canvas><div class="copy"><b>Nothing on this board yet</b><span>Drop images here or start from a template.</span></div></div>`).join("")}
<script>
const VERTEX = ${JSON.stringify(VERTEX)}, FRAGMENT = ${JSON.stringify(FRAGMENT)};
const TILES = ${JSON.stringify(tiles)}, COLORS = ${JSON.stringify(COLORS)};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
window.__errors = [];
for (const t of TILES) {
  const gl = document.querySelector('#' + t.id + ' canvas').getContext('webgl');
  const sh = (k, s) => { const o = gl.createShader(k); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) window.__errors.push(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(p); gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(p, 'position'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(p, n);
  gl.uniform1f(U('u_time'), 6); gl.uniform1f(U('u_time2'), 6); gl.uniform1f(U('u_scale'), 1); gl.uniform1f(U('u_noise'), t.noise);
  gl.uniform1i(U('u_type'), t.type); gl.uniform1i(U('u_prevType'), t.type); gl.uniform1f(U('u_mix'), 1);
  gl.uniform2f(U('u_resolution'), 960, 540); gl.uniform3f(U('u_pointer'), 0.5, 0.5, 0);
  COLORS.forEach((c, i) => gl.uniform3fv(U('u_color' + (i + 1)), hex(c)));
  gl.viewport(0, 0, 960, 540); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
window.__done = true;
</script>`;

(async () => {
  fs.mkdirSync(path.join(__dirname, ".out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, ".out/gradflow.html"), html);
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(__dirname, ".out/gradflow.html"));
  await p.waitForFunction(() => window.__done);
  console.log("errors", await p.evaluate(() => window.__errors));
  for (const t of tiles) await p.locator("#" + t.id).screenshot({ path: path.join(__dirname, ".out", t.id + ".png") });
  await p.addStyleTag({ content: ".copy{visibility:hidden}" });
  fs.mkdirSync(path.join(__dirname, ".out/bg"), { recursive: true });
  for (const id of await p.$$eval(".tile", (els) => els.map((e) => e.id)))
    await p.locator("#" + id).screenshot({ path: path.join(__dirname, ".out/bg", id + ".png") });
  await b.close();
})();
