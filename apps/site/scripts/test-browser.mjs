import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { checkAppearance } from "./appearance-checks.mjs";

const site = fileURLToPath(new URL("../", import.meta.url));
const out = join(site, "dist");
const catalog = JSON.parse(readFileSync(join(site, "src/data/catalog.generated.json"), "utf8"));
const exampleNames = readdirSync(join(site, "src/examples")).filter(name => name.endsWith(".tsx")).map(name => name.slice(0, -4));
const artifacts = join(site, "test-results");
mkdirSync(artifacts, { recursive: true });
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  let path = resolve(out, `.${decodeURIComponent(new URL(req.url, "http://local.test").pathname)}`);
  if (!path.startsWith(`${out}/`) && path !== out) { res.writeHead(403).end(); return; }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await (process.argv.includes("--webkit") ? webkit : chromium).launch({ headless: true });
const errors = [];
// Base UI intentionally gives its invisible focus sentinels role=button on
// WebKit so VoiceOver can enter/leave the trap (utils/FocusGuard.mjs).
// Audit product controls normally; these are navigation infrastructure.
const audit = page => {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
  return process.argv.includes("--webkit") ? builder.exclude("[data-base-ui-focus-guard]") : builder;
};
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  if (process.argv.includes("--appearance-only")) {
    await checkAppearance(page, base, artifacts);
    assert.deepEqual(errors, []);
    console.log("Appearance rendering and combinations checked");
  } else {
  const paths = ["/", "/components/", "/docs/", "/docs/agents/", "/changelog/", ...catalog.items.map(item => `/components/${item.name}/`)];
  for (const scheme of process.argv.includes("--interactions-only") ? [] : ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const path of paths) {
      await page.goto(`${base}${path}`);
      await page.evaluate(() => document.fonts.ready);
      assert(await page.evaluate(() => [...document.fonts].some(face => face.family === "Aspekta" && face.status === "loaded")), "The bundled Aspekta face must load");
      const { violations } = await audit(page).analyze();
      if (violations.length) errors.push(`${scheme} ${path}: ${violations.map(v => `${v.id} (${v.nodes.map(n => n.target.join(" ")).join(", ")})`).join("; ")}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows the desktop viewport`);
    }
    console.log(`${scheme}: public pages checked for accessibility and overflow`);
    await page.goto(base);
    await page.screenshot({ path: join(artifacts, `home-desktop-${scheme}.png`), fullPage: true });
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of ["/", "/components/", "/components/button/", "/docs/", "/docs/agents/"]) {
      await page.goto(`${base}${path}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme} ${path} overflows at 320px`);
    }
    await page.goto(base);
    await page.screenshot({ path: join(artifacts, `home-mobile-${scheme}.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => ({
    ctaMargin: getComputedStyle(document.querySelector(".lead .browse-link")).marginTop,
    galleryGap: getComputedStyle(document.querySelector(".specimen-grid")).rowGap,
    headline: getComputedStyle(document.querySelector(".lead h1")).color,
    continuation: getComputedStyle(document.querySelector(".lead h1 span")).color,
  }));
  assert.equal(geometry.ctaMargin, "0px", "Hero gap must not include the gallery link's margin");
  assert.equal(geometry.galleryGap, "32px", "Paper desktop gallery rows have a 32px gap");
  assert.equal(geometry.headline, geometry.continuation, "Paper headline has one ink role");
  await page.waitForFunction(() => [...document.querySelectorAll('astro-island[component-export="Specimen"]')].every(island => !island.hasAttribute("ssr")));
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();
  const checkbox = page.getByRole("checkbox", { name: "Notify by email" });
  await page.getByText("Notify by email", { exact: true }).click(); assert.equal(await checkbox.isChecked(), false);
  await page.getByRole("tab", { name: "Files", exact: true }).click();
  assert.equal(await page.getByRole("tab", { name: "Files", exact: true }).getAttribute("aria-selected"), "true");

  await page.goto(`${base}/docs/agents/`);
  assert.equal(await page.locator('.desktop-nav [aria-current="page"]').count(), 1, "Only one primary navigation item is current");
  assert.equal(await page.locator('.desktop-nav [aria-current="page"]').innerText(), "For agents");
  await page.goto(`${base}/components/table/`);
  assert.equal(await page.locator('.props-table[data-slot="table"]').count(), 1, "Reference content must compose the registry Table");
  const projectTable = page.getByRole("table", { name: "Project overview", exact: true });
  await projectTable.getByRole("button", { name: "Project", exact: true }).click();
  await projectTable.getByRole("button", { name: "Project", exact: true }).click();
  assert.equal(await projectTable.locator('tbody tr').first().locator('td').first().innerText(), "Website", "The live table example sorts its supplied rows");
  await page.goto(`${base}/components/`);
  await page.getByRole("button", { name: "Forms", exact: true }).click();
  assert(await page.locator('[data-gallery-item]:visible').evaluateAll(items => items.every(item => item.dataset.category === "Forms")));
  await page.locator("[data-gallery-query]").fill("a-component-that-does-not-exist");
  assert.equal(await page.locator("[data-gallery-empty]").isVisible(), true);
  await page.locator("[data-gallery-query]").fill("");
  await page.getByRole("button", { name: "All", exact: true }).click();
  assert.equal(await page.locator("[data-gallery-item]:visible").count(), catalog.items.length);
  const liveLinks = await page.locator('.gallery-item .tile-caption a').evaluateAll(links => links.map(link => link.getAttribute("href")));
  assert.deepEqual(liveLinks.toSorted(), exampleNames.map(name => `/components/${name}/`).toSorted(), "Every live example must appear in the catalog exactly once");


  await page.getByRole("group", { name: "Filter status", exact: true }).getByRole("button", { name: "Experimental", exact: true }).click();
  assert(await page.locator('[data-gallery-item]:visible').evaluateAll(items => items.length > 0 && items.every(item => item.dataset.status === "experimental")));
  await page.getByRole("button", { name: "List", exact: true }).click();
  assert.equal(await page.locator('.specimen-well:visible').count(), 0);
  await page.getByRole("button", { name: "All statuses", exact: true }).click();
  assert.equal(await page.locator('[data-gallery-item]:visible').count(), catalog.items.length);
  await page.getByRole("button", { name: "Gallery", exact: true }).click();

  await page.keyboard.press("Control+k");
  const search = page.getByRole("textbox", { name: "Search the library" });
  await search.waitFor(); await search.fill("button");
  assert(await page.getByRole("dialog").getByRole("link", { name: /Button/ }).count() > 0);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  const choose = async (label, value) => {
    await page.getByRole("group", { name: label, exact: true }).getByText(value, { exact: true }).click();
    assert(await page.getByRole("group", { name: label, exact: true }).getByRole("radio", { name: value, exact: true }).isChecked());
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  };
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  assert.equal(await page.locator(".appearance-panel select:visible").count(), 0);
  assert.equal(await page.locator('.appearance-panel [data-slot="radio-group"]').count(), 3);
  await page.emulateMedia({ colorScheme: "dark" });
  for (const brand of ["Diorama", "Graphite", "Hockney", "Stress"]) {
    await choose("Brand", brand);
    await choose("Scheme", "Light");
    const shape = await page.locator('[data-gallery-item][data-search^="Button "] button').first().evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), height: el.getBoundingClientRect().height, appearance: getComputedStyle(el).appearance }));
    assert.equal(shape.appearance, "none", "Library buttons must suppress native platform chrome");
    assert.equal(shape.height, 32, "Changing brand shape must not change density");
    if (brand === "Hockney") {
      assert(shape.radius >= shape.height / 2, "Hockney's default button is a pill");
      const field = await page.locator('[data-gallery-item][data-search^="Input "] [data-slot="control"]').evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), padding: parseFloat(getComputedStyle(el).paddingLeft) }));
      assert(field.radius >= 20 && field.padding === 12, "Hockney's capsule field carries its wider inset");
    }

    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "light");
    const light = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await choose("Scheme", "Dark");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
    const dark = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    assert.notEqual(light, dark, `${brand}: rendered ground must change, not only the saved setting`);
  }
  await choose("Scheme", "System");
  for (const scheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    const rendered = await page.evaluate(() => ({ scheme: getComputedStyle(document.documentElement).colorScheme, ground: getComputedStyle(document.documentElement).backgroundColor }));
    assert(rendered.scheme.includes(scheme));
    await choose("Scheme", scheme === "light" ? "Dark" : "Light");
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), rendered.ground);
    await choose("Scheme", "System");
  }
  await choose("Scheme", "Dark");
  await choose("Density", "Compact");
  await page.getByText("Effects", { exact: true }).click();
  assert.equal(await page.getByRole("switch", { name: "Effects", exact: true }).isChecked(), true);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  const panelBounds = await page.locator(".appearance-panel").boundingBox();
  assert(panelBounds && panelBounds.y >= 0 && panelBounds.y + panelBounds.height <= 900, "Appearance panel stays in the viewport");
  await page.screenshot({ path: join(artifacts, "appearance-library-controls.png") });
  await page.keyboard.press("Escape");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-site-brand"), "stress");
  assert.equal(await page.locator("html").getAttribute("data-ui-density"), "compact");
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
  await page.keyboard.press("Control+k");
  const themed = await audit(page).analyze();
  if (themed.violations.length) errors.push(`Stress theme search: ${themed.violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join("; ")}`).join(", ")}`);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.evaluate(() => localStorage.clear());
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ["button", "accordion", "date-picker"]) {
      await page.goto(`${base}/components/${name}/`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(await page.locator(".props-table .prop-name").evaluateAll(names => names.every(name => { const range = document.createRange(); range.selectNodeContents(name); return range.getClientRects().length === 1; })), `${name}: a prop name must stay on one line`);
      assert.equal(await page.getByRole("heading", { name: "Recent changes", exact: true }).count(), 0);
      if (width === 320) {
        assert(await page.locator('.table-scroll').first().evaluate(el => el.scrollWidth <= el.clientWidth));
        assert(await page.locator(".mobile-cell-label").first().isVisible());
        const phoneLanes = await page.locator('.props-table [data-slot="table-row"]').first().evaluate(row => [...row.querySelectorAll('.prop-name, .mobile-cell-label')].map(el => el.getBoundingClientRect().left));
        assert(Math.max(...phoneLanes) - Math.min(...phoneLanes) < 1, "Stacked reference cells share their leading edge");
      } else if (width === 1440) {
        const lanes = await page.locator('.desktop-component-nav').evaluate(nav => [...nav.querySelectorAll('h2,a')].map(el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().left; }));
        assert(Math.max(...lanes) - Math.min(...lanes) < 1, "Navigation headings and rows must share a left edge");
      }
      const note = page.locator(".prop-disclosure").first();
      if (await note.count()) {
        const lanes = () => page.locator('.props-table [data-slot="table-header-cell"]').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
        const before = await lanes();
        await note.focus();
        await page.keyboard.press("Enter");
        assert.equal(await note.getAttribute("aria-expanded"), "true");
        assert.equal(await note.evaluate(el => document.activeElement === el), true, "Opening details preserves focus");
        const detail = page.locator('.props-table [data-slot="table-details"]');
        assert.equal(await detail.getAttribute("colspan"), "3");
        assert(await detail.isVisible());
        const detailWidth = (await detail.boundingBox()).width;
        const gridWidth = (await page.locator('.props-table [data-slot="table-grid"]').boundingBox()).width;
        assert(Math.abs(detailWidth - gridWidth) < 1, "Details span every lane");
        if (width > 700) assert.deepEqual(await lanes(), before, "Opening details must not resize the lanes");
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const violations = (await audit(page).analyze()).violations;
        assert.equal(violations.length, 0, `${name}: expanded API accessibility: ${violations.map(v => v.id).join(", ")}`);
        await page.screenshot({ path: join(artifacts, `${name}-details-${width}.png`) });
        await page.keyboard.press("Space");
        assert.equal(await note.getAttribute("aria-expanded"), "false");
        assert.equal(await detail.count(), 0);
        assert.equal(await note.evaluate(el => document.activeElement === el), true, "Closing details preserves focus");
      }
      await page.screenshot({ path: join(artifacts, `${name}-${width}.png`) });
    }
  }
  for (const item of catalog.items) {
    const grouped = Object.entries(item.docs.props).filter(([name, prop]) => /\s/.test(name) && prop.notes);
    if (!grouped.length) continue;
    await page.goto(`${base}/components/${item.name}/`);
    for (const [name] of grouped) {
      const disclosure = page.getByRole("button", { name: `${name} details`, exact: true });
      await disclosure.click();
      assert(await disclosure.evaluate(button => {
        const id = button.getAttribute("aria-controls");
        return id && !/\s/.test(id) && document.getElementById(id)?.classList.contains("prop-note");
      }), `${item.name}: grouped prop names must resolve to one disclosure target`);
      assert(await page.locator('.props-table [data-slot="table-body-clip"]').evaluate(el => el.scrollWidth <= el.clientWidth), `${item.name}: grouped names wrap in the stacked reference`);
      await disclosure.click();
    }
  }
  await page.goto(`${base}/components/accordion/`);
  await page.getByRole("button", { name: "Can I use my own brand?", exact: true }).click();
  await page.getByText("Use the shared tokens to bring your colours, type and shape into the system.", { exact: true }).waitFor();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${base}/components/`);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await choose("Scheme", "Light");
  const mobilePanel = await page.locator(".appearance-panel").boundingBox();
  assert(mobilePanel && mobilePanel.x >= 0 && mobilePanel.x + mobilePanel.width <= 320 && mobilePanel.y >= 0 && mobilePanel.y + mobilePanel.height <= 640, "Mobile appearance panel must fit the available viewport");
  const appearanceAudit = await audit(page).analyze();
  if (appearanceAudit.violations.length) errors.push(`Appearance: ${appearanceAudit.violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join("; ")}`).join(", ")}`);
  await page.screenshot({ path: join(artifacts, "appearance-mobile-light.png") });
  await page.keyboard.press("Escape");
  for (const item of catalog.items) {
    await page.goto(`${base}/components/${item.name}/`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${item.name}: reference overflows a phone`);
  }
  await checkAppearance(page, base, artifacts);
  await context.close();

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base);
  assert(await staticPage.getByRole("heading", { level: 1 }).isVisible());
  assert(await staticPage.getByRole("link", { name: "Browse components" }).isVisible());
  await staticPage.goto(`${base}/components/button/`);
  assert(await staticPage.getByRole("heading", { name: "API reference", exact: true }).isVisible());
  assert.equal(await staticPage.locator(".prop-disclosure:visible").count(), 0, "Inactive disclosure controls must not appear without JavaScript");
  const fallback = staticPage.locator(".prop-notes-fallback details").filter({ hasText: "variant details" });
  await fallback.locator("summary").click();
  assert(await fallback.locator("p").isVisible(), "API descriptions remain readable without JavaScript");
  await noJs.close();
  if (errors.length) throw Error([...new Set(errors)].join("\n"));
  console.log("search, filters, examples, preferences and no-JavaScript content checked");
  }
} finally {
  await browser.close();
  server.close();
}
