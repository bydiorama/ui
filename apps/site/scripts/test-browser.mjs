import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { checkAppearance, waitForAppearance } from "./appearance-checks.mjs";
import { checkPreviews } from "./preview-checks.mjs";

const site = fileURLToPath(new URL("../", import.meta.url));
const out = join(site, "dist");
const catalog = JSON.parse(readFileSync(join(site, "src/data/catalog.generated.json"), "utf8"));
const exampleNames = readdirSync(join(site, "src/examples")).filter(name => name.endsWith(".tsx")).map(name => name.slice(0, -4));
assert.deepEqual(exampleNames.toSorted(), catalog.items.map(item => item.name).toSorted(), "Every public component and block must have a preview");
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
  // The hero reel's resting words are ghosts by design (bg-sunken on base):
  // aria-hidden decoration beside the heading's own sr-only text, which is
  // WCAG 1.4.3's decoration exception. The word on show is still audited.
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).exclude(".hero-reel-word:not([data-current])");
  return process.argv.includes("--webkit") ? builder.exclude("[data-base-ui-focus-guard]") : builder;
};
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  // When a page is wider than the window, name what sticks out: elements past the right edge
  // with no clipping or scrolling ancestor, which are the ones that widen the page.
  const overflowCulprits = page => page.evaluate(() => {
    const clipped = el => { for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) if (getComputedStyle(node).overflowX !== "visible") return true; return false; };
    return [...document.querySelectorAll("body *")]
      .filter(el => el.getBoundingClientRect().right > innerWidth + 0.5 && el.getBoundingClientRect().width > 0 && !clipped(el))
      .slice(0, 6).map(el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} right=${Math.round(el.getBoundingClientRect().right)}`).join("; ");
  });
  const visit = async url => {
    await page.goto(url);
    // `client:visible` islands hydrate only once scrolled to, so they are not waited for.
    await page.waitForFunction(() => [...document.querySelectorAll('astro-island:not([client="visible"])')].every(island => !island.hasAttribute("ssr")));
    if (await page.locator('.stage-bar .look-dock').count()) await waitForAppearance(page);
  };
  if (process.argv.includes("--previews-only")) {
    await checkPreviews(page, base, artifacts);
    assert.deepEqual(errors, []);
  } else if (process.argv.includes("--appearance-only")) {
    await checkAppearance(page, base, artifacts);
    assert.deepEqual(errors, []);
    console.log("Appearance rendering and combinations checked");
  } else {
  const paths = ["/", "/components/", "/docs/", "/docs/agents/", "/changelog/", ...catalog.items.map(item => `/components/${item.name}/`)];
  for (const scheme of process.argv.includes("--interactions-only") ? [] : ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const path of paths) {
      await visit(`${base}${path}`);
      await page.waitForFunction(() => [...document.querySelectorAll('astro-island[component-export="Stage"]')].every(island => !island.hasAttribute("ssr")));
      await page.evaluate(() => document.fonts.ready);
      if (path.startsWith("/components/") && path !== "/components/") {
        assert(await page.locator('.preview-frame').isVisible(), `${path}: missing example stage`);
        assert(await page.locator('.preview-frame .stage-well').evaluate(well => [...well.children].some(child => child.getBoundingClientRect().width > 0 && child.getBoundingClientRect().height > 0)), `${path}: empty preview`);
        assert.match(await page.locator('.example-code code').textContent(), /export (?:function|const) Example\b/, `${path}: missing example source`);
      }
      assert(await page.evaluate(() => [...document.fonts].some(face => face.family === "Aspekta" && face.status === "loaded")), "The bundled Aspekta face must load");
      const { violations } = await audit(page).analyze();
      if (violations.length) errors.push(`${scheme} ${path}: ${violations.map(v => `${v.id} (${v.nodes.map(n => n.target.join(" ")).join(", ")})`).join("; ")}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows the desktop viewport`);
    }
    console.log(`${scheme}: public pages checked for accessibility and overflow`);
    await visit(base);
    await page.screenshot({ path: join(artifacts, `home-desktop-${scheme}.png`), fullPage: true });
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of ["/", "/components/", "/components/button/", "/docs/", "/docs/agents/"]) {
      await visit(`${base}${path}`);
      if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))) assert.fail(`${scheme} ${path} overflows at 320px: ${await overflowCulprits(page)}`);
    }
    await visit(base);
    await page.screenshot({ path: join(artifacts, `home-mobile-${scheme}.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  // The live examples answer on their own pages (the home page and the
  // catalog show drawings and purpose-built tiles, not the examples).
  await visit(`${base}/components/button/`);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();
  await visit(`${base}/components/checkbox/`);
  const checkbox = page.getByRole("checkbox", { name: "Notify by email" });
  await page.getByText("Notify by email", { exact: true }).click(); assert.equal(await checkbox.isChecked(), false);
  await visit(`${base}/components/tabs/`);
  await page.getByRole("tab", { name: "Files", exact: true }).click();
  assert.equal(await page.getByRole("tab", { name: "Files", exact: true }).getAttribute("aria-selected"), "true");

  await visit(`${base}/docs/agents/`);
  assert.equal(await page.locator('.desktop-nav [aria-current="page"]').count(), 1, "Only one primary navigation item is current");
  assert.equal(await page.locator('.desktop-nav [aria-current="page"]').innerText(), "Docs");
  await visit(`${base}/components/table/`);
  assert.equal(await page.locator('table.props-table').count(), 1, "The API reference is one table, beside the page's live Table example");
  const projectTable = page.getByRole("table", { name: "Project overview", exact: true });
  await projectTable.getByRole("button", { name: "Project", exact: true }).click();
  await projectTable.getByRole("button", { name: "Project", exact: true }).click();
  assert.equal(await projectTable.locator('tbody tr').first().locator('td').first().innerText(), "Website", "The live table example sorts its supplied rows");
  await visit(`${base}/components/`);
  const families = page.getByRole("group", { name: "Filter family", exact: true });
  const statuses = page.getByRole("group", { name: "Filter status", exact: true });
  assert.equal(await page.locator(".catalog-tile-well:empty").count(), 0, "Every catalog tile draws its component");
  await families.getByRole("button", { name: "Forms", exact: true }).click();
  assert(await page.locator('[data-gallery-item]:visible').evaluateAll(items => items.every(item => item.dataset.category === "Forms")));
  assert.equal(await page.locator("[data-gallery-family]:visible").count(), 1, "A family with no matches hides, head and all");
  await page.keyboard.press("/");
  assert.equal(await page.locator("[data-gallery-query]").evaluate(field => document.activeElement === field), true, "/ focuses the catalog search");
  await page.locator("[data-gallery-query]").fill("a-component-that-does-not-exist");
  assert.equal(await page.locator("[data-gallery-empty]").isVisible(), true);
  await page.locator("[data-gallery-query]").fill("");
  await families.getByRole("button", { name: "All", exact: true }).click();
  assert.equal(await page.locator("[data-gallery-item]:visible").count(), catalog.items.length);
  const liveLinks = await page.locator('.catalog-tile-title a').evaluateAll(links => links.map(link => link.getAttribute("href")));
  assert.deepEqual(liveLinks.toSorted(), exampleNames.map(name => `/components/${name}/`).toSorted(), "Every live example must appear in the catalog exactly once");

  await statuses.getByRole("button", { name: "Experimental", exact: true }).click();
  assert(await page.locator('[data-gallery-item]:visible').evaluateAll(items => items.length > 0 && items.every(item => item.dataset.status === "experimental")));
  await page.getByRole("button", { name: "List", exact: true }).click();
  assert.equal(await page.locator('.catalog-tile-well:visible').count(), 0);
  await statuses.getByRole("button", { name: "All", exact: true }).click();
  assert.equal(await page.locator('[data-gallery-item]:visible').count(), catalog.items.length);
  await page.getByRole("button", { name: "Grid", exact: true }).click();

  await page.keyboard.press("Control+k");
  const search = page.getByRole("textbox", { name: "Search the library" });
  await search.waitFor(); await search.fill("button");
  assert(await page.getByRole("dialog").getByRole("link", { name: /Button/ }).count() > 0);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  // The catalog draws its components; the live ones, and the look dock that
  // re-themes them, are on each component's page.
  await visit(`${base}/components/button/`);
  const settled = () => page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  await settled();
  const lookDock = page.locator(".stage-bar .look-dock");
  const darkSwitch = lookDock.getByRole("switch", { name: "Dark", exact: true });
  const setDark = async on => {
    if (await darkSwitch.isChecked() !== on) await lookDock.getByText("Dark", { exact: true }).click();
    await settled();
    assert.equal(await darkSwitch.isChecked(), on);
  };
  assert.equal(await page.locator(".appearance-panel").count(), 0, "The look dock replaces the appearance popover");
  assert.equal(await lookDock.getByRole("radiogroup", { name: "Look", exact: true }).count(), 1);
  await page.emulateMedia({ colorScheme: "dark" });
  for (const brand of ["Zero", "Mono", "Soft", "Hockney"]) {
    await lookDock.locator(".look-option", { hasText: brand }).click();
    await setDark(false);
    const shape = await page.locator('.preview-frame .specimen-well button').first().evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), height: el.getBoundingClientRect().height, appearance: getComputedStyle(el).appearance }));
    assert.equal(shape.appearance, "none", "Library buttons must suppress native platform chrome");
    assert.equal(shape.height, 32, "Changing brand shape must not change density");
    if (brand === "Hockney") {
      assert(shape.radius >= shape.height / 2, "Hockney's default button is a pill");
      // The chosen brand is stored, so a second page in this context opens in it.
      const inputPage = await context.newPage();
      await inputPage.goto(`${base}/components/input/`);
      const field = await inputPage.locator('.preview-frame [data-slot="control"]').first().evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), padding: parseFloat(getComputedStyle(el).paddingLeft) }));
      await inputPage.close();
      assert(field.radius >= 20 && field.padding === 12, "Hockney's capsule field carries its wider inset");
    }
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "light");
    const light = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await setDark(true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
    const dark = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    assert.notEqual(light, dark, `${brand}: rendered ground must change, not only the saved setting`);
  }
  await page.screenshot({ path: join(artifacts, "appearance-library-controls.png") });
  // A stored look the dock does not offer (Stress, compact) still renders and survives a reload.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ scheme: "dark", density: "compact", brand: "stress", effects: "on" })), "diorama-ui-appearance");
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
      await visit(`${base}/components/${name}/`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(await page.locator(".props-table .props-name:visible").evaluateAll(names => names.every(name => { const range = document.createRange(); range.selectNodeContents(name); return range.getClientRects().length === 1; })), `${name}: a prop name must stay on one line`);
      assert.equal(await page.getByRole("heading", { name: "Recent changes", exact: true }).count(), 0);
      assert(await page.locator(".props").evaluate(el => el.scrollWidth <= el.clientWidth), `${name}: the API reference never scrolls sideways`);
      if (width === 320) {
        const phoneLanes = await page.locator('.props-row:visible').first().evaluate(row => [...row.querySelectorAll('.props-name, .props-type, .props-default')].map(el => el.getBoundingClientRect().left));
        assert(Math.max(...phoneLanes) - Math.min(...phoneLanes) < 1, "Stacked reference cells share their leading edge");
      } else if (width === 1440) {
        const lanes = await page.locator('.detail-rail').evaluate(rail => [...rail.querySelectorAll('h2,a')].map(el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().left; }));
        assert(Math.max(...lanes) - Math.min(...lanes) < 1, "Rail headings and rows must share a left edge");
      }
      const note = page.locator(".prop-disclosure:visible").first();
      if (await note.count()) {
        const lanes = () => page.locator('.props-table thead th').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
        const before = await lanes();
        await note.focus();
        await page.keyboard.press("Enter");
        assert.equal(await note.getAttribute("aria-expanded"), "true");
        assert.equal(await note.evaluate(el => document.activeElement === el), true, "Opening details preserves focus");
        const detail = page.locator('.props-note:visible');
        assert.equal(await detail.count(), 1);
        assert(await note.evaluate(button => document.getElementById(button.getAttribute("aria-controls"))?.classList.contains("props-note")), "The disclosure points at its note");
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
  // The rest of a long reference waits behind one button, and the rail marks the section being read.
  await visit(`${base}/components/chart/`);
  const moreProps = page.locator(".props-more button");
  assert.equal(await moreProps.getAttribute("aria-expanded"), "false");
  const shownBefore = await page.locator(".props-row:visible").count();
  await moreProps.click();
  assert(await page.locator(".props-row:visible").count() > shownBefore, "Show more reveals the remaining props");
  assert.equal(await moreProps.getAttribute("aria-expanded"), "true");
  await page.evaluate(() => document.getElementById("accessibility").scrollIntoView({ block: "start" }));
  await page.waitForFunction(() => document.querySelector('.detail-rail nav:first-child a[aria-current="location"]')?.textContent === "Accessibility");
  const stage = page.locator(".preview-frame");
  await stage.getByRole("tab", { name: "Code", exact: true }).click();
  await stage.locator(".stage-code").waitFor({ state: "visible" });
  await stage.locator(".stage-well").waitFor({ state: "hidden" });
  assert(await stage.getByRole("button", { name: "Copy code", exact: true }).isVisible(), "The source can be copied");
  await stage.getByRole("tab", { name: "Preview", exact: true }).click();
  await stage.locator(".stage-well").waitFor({ state: "visible" });
  await stage.locator(".stage-code").waitFor({ state: "hidden" });
  for (const item of catalog.items) {
    const grouped = Object.entries(item.docs.props).filter(([name, prop]) => /\s/.test(name) && prop.notes);
    if (!grouped.length) continue;
    await visit(`${base}/components/${item.name}/`);
    for (const [name] of grouped) {
      const more = page.locator(".props-more button");
      if (await more.count() && await more.getAttribute("aria-expanded") === "false") await more.click();
      const disclosure = page.getByRole("button", { name: `${name} details`, exact: true });
      await disclosure.click();
      assert(await disclosure.evaluate(button => {
        const id = button.getAttribute("aria-controls");
        return id && !/\s/.test(id) && document.getElementById(id)?.classList.contains("props-note");
      }), `${item.name}: grouped prop names must resolve to one disclosure target`);
      assert(await page.locator(".props").evaluate(el => el.scrollWidth <= el.clientWidth), `${item.name}: grouped names wrap in the stacked reference`);
      await disclosure.click();
    }
  }
  await visit(`${base}/components/accordion/`);
  await page.getByRole("button", { name: "Can I use my own brand?", exact: true }).click();
  await page.getByText("Use the shared tokens to bring your colours, type and shape into the system.", { exact: true }).waitFor();
  await page.setViewportSize({ width: 320, height: 640 });
  await visit(`${base}/components/button/`);
  const phoneDock = await page.locator(".stage-bar .look-dock").boundingBox();
  assert(phoneDock && phoneDock.x >= 0 && phoneDock.x + phoneDock.width <= 320, "The look dock must fit the available viewport");
  const appearanceAudit = await audit(page).analyze();
  if (appearanceAudit.violations.length) errors.push(`Appearance: ${appearanceAudit.violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join("; ")}`).join(", ")}`);
  await page.screenshot({ path: join(artifacts, "appearance-mobile-light.png") });
  for (const item of catalog.items) {
    await visit(`${base}/components/${item.name}/`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${item.name}: reference overflows a phone`);
  }
  await checkPreviews(page, base, artifacts);
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
  assert.equal(await staticPage.locator(".props-more:visible").count(), 0, "The show-more button is inert without JavaScript, so every prop is listed");
  assert.equal(await staticPage.locator(".props-row:visible").count(), Object.keys(catalog.items.find(item => item.name === "button").docs.props).length, "Every prop row is visible without JavaScript");
  assert.match(await staticPage.locator(".stage-code").textContent(), /export (?:function|const) Example\b/, "The example source is in the HTML");
  const fallback = staticPage.locator(".props-notes-fallback details").filter({ hasText: "variant details" });
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
