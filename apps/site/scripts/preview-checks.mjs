import assert from "node:assert/strict";
import { join } from "node:path";

// The catalog shows a drawing of each component (components/motifs), drawn
// to fit its 259px well at 1440. Each must stay inside the well at desktop
// and phone widths, in both schemes, and the page must not overflow.
async function checkCatalogDrawings(page, base, artifacts) {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scheme of ["light", "dark"]) {
      await page.goto(`${base}/components/`);
      await page.evaluate(scheme => localStorage.setItem("diorama-ui-appearance", JSON.stringify({ scheme, brand: "zero", density: "default", effects: "off" })), scheme);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      const outside = await page.locator(".catalog-tile").evaluateAll(tiles => tiles.filter(tile => {
        const well = tile.querySelector(".catalog-tile-well").getBoundingClientRect();
        const drawing = tile.querySelector(".catalog-tile-well > *")?.getBoundingClientRect();
        // A drawing wider than a phone's well may clip evenly at both sides;
        // at desktop it must fit whole.
        const tolerance = innerWidth < 640 ? 24 : 1;
        return !drawing || drawing.left < well.left - tolerance || drawing.right > well.right + tolerance || drawing.top < well.top - 1 || drawing.bottom > well.bottom + 1;
      }).map(tile => tile.querySelector(".catalog-tile-title a").textContent));
      assert.deepEqual(outside, [], `${scheme}/${width}: catalog drawings stay within their wells`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}/${width}: catalog overflows`);
      await page.screenshot({ path: join(artifacts, `catalog-${width}-${scheme}.png`), fullPage: true });
    }
  }
  // These decorative cells have no text or outline to reveal them if their
  // fill collapses onto the well. Resolve both CSS colours to sRGB pixels.
  for (const brand of ["mono", "hockney"]) {
    await page.evaluate(brand => Object.assign(document.documentElement.dataset, { siteBrand: brand, siteScheme: "light" }), brand);
    for (const [selector, ground] of [
      [".motif-calendar-days > span", ".catalog-tile-well"],
      [".motif-date-picker-panel > span", ".motif-date-picker-panel"],
    ]) {
      const contrast = await page.locator(selector).first().evaluate((day, ground) => {
        const ctx = document.createElement("canvas").getContext("2d");
        const luminance = element => {
          ctx.fillStyle = getComputedStyle(element).backgroundColor;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data, value => {
            const s = value / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        return (luminance(day.closest(ground)) + 0.05) / (luminance(day) + 0.05);
      }, ground);
      assert(contrast >= 1.15, `${brand} light: resting cells in ${selector} disappear into ${ground} (${contrast})`);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

export async function checkPreviews(page, base, artifacts) {
  const hydrate = () => page.waitForFunction(() => [...document.querySelectorAll('astro-island[component-export="Specimen"]')].every(island => !island.hasAttribute("ssr")));
  const visit = async name => {
    await page.goto(`${base}/components/${name}/`);
    await hydrate();
  };
  await checkCatalogDrawings(page, base, artifacts);
  await page.evaluate(() => localStorage.clear());
  await visit("sparkline");
  const metric = page.locator('.preview-frame [data-slot="stat-tile"]');
  assert.equal(await metric.locator('[data-slot="stat-label"]').innerText(), "Completed projects");
  assert.equal(await metric.locator('[data-slot="stat-value"]').innerText(), "24");
  assert.equal(await metric.locator('[data-slot="sparkline"]').getAttribute("data-variant"), "line");
  const sparklineColour = await metric.locator('[data-slot="sparkline-line"]').evaluate(line => getComputedStyle(line).stroke);
  await visit("chart");
  assert.equal(await page.locator('.preview-frame [data-slot="chart-series"]').first().evaluate(series => getComputedStyle(series).fill), sparklineColour, "Matching series keep the same ink in Sparkline and Chart");
  const plot = page.locator('.preview-frame [data-slot="chart-plot"]');
  await plot.hover();
  await page.locator('[data-slot="chart-tooltip"]').waitFor();
  await plot.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector('[data-slot="chart-announcer"]')?.textContent.includes("18"));
  await page.getByRole("button", { name: "View as table", exact: true }).click();
  assert.equal(await page.getByRole("table", { name: "Completed projects", exact: true }).locator('tbody tr').count(), 4);
  for (const [name, trigger, title, close] of [
    ["modal", "Review changes", "Ready for review?", "Keep editing"],
    ["sheet", "Filter projects", "Project filters", "Apply filters"],
    ["drawer", "Choose a view", "Project view", "Done"],
  ]) {
    await visit(name);
    await page.getByRole("button", { name: trigger, exact: true }).click();
    await page.getByRole("dialog").getByRole("heading", { name: title, exact: true }).waitFor();
    await page.getByRole("dialog").getByRole("button", { name: close, exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForFunction(label => document.activeElement?.textContent === label, trigger);
  }
  await visit("popover");
  await page.getByRole("button", { name: "Project settings", exact: true }).click();
  await page.getByRole("heading", { name: "Notifications", exact: true }).waitFor();
  const email = page.getByRole("switch", { name: "Email updates", exact: true });
  assert.equal(await email.isChecked(), true);
  await page.getByText("Email updates", { exact: true }).click();
  assert.equal(await email.isChecked(), false);
  await page.keyboard.press("Escape");

  await visit("menu");
  await page.getByRole("button", { name: "Project actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Project duplicated" }).waitFor();
  await visit("context-menu");
  await page.locator('.preview-frame [data-slot="context-menu-trigger"]').focus();
  // CDP keyboard events do not synthesize macOS's native contextmenu event.
  // Keep the focusable region, and exercise its real pointer path here.
  await page.locator('[data-slot="context-menu-trigger"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Project archived" }).waitFor();

  await visit("toast");
  await page.getByRole("button", { name: "Create toast", exact: true }).click();
  await page.getByText("Draft saved", { exact: true }).waitFor();
  await page.locator('[data-slot="toast-close"]').click();
  await page.getByText("Draft saved", { exact: true }).waitFor({ state: "hidden" });
  await visit("tooltip");
  await page.getByRole("button", { name: "Save to collection", exact: true }).focus();
  await page.getByRole("tooltip").waitFor();
  await page.keyboard.press("Escape");

  await visit("combobox");
  await page.getByRole("combobox", { name: "Find a project", exact: true }).fill("Website");
  await page.getByRole("option", { name: "Website", exact: true }).click();
  assert.equal(await page.getByRole("combobox", { name: "Find a project", exact: true }).inputValue(), "Website");
  for (const name of ["slider", "range-slider"]) {
    await visit(name);
    const slider = page.getByRole("slider").first();
    const before = Number(await slider.getAttribute("aria-valuenow"));
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    // Read until the value moves, up to a second: on a loaded runner the
    // commit can land after an immediate read (CI on 5179750), and the claim
    // is that the key changes the value, not that it does so synchronously.
    const after = async () => Number(await slider.getAttribute("aria-valuenow"));
    for (let i = 0; i < 20 && !((await after()) > before); i++) await page.waitForTimeout(50);
    assert((await after()) > before, `${name}: keyboard changes the value`);
  }
  await visit("card-sorting");
  const handle = page.getByRole("button", { name: /Reorder Research/ });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  assert.match(await page.locator('[data-slot="card-sorting-item"]').first().innerText(), /Design/);

  await visit("image-upload");
  await page.locator('input[type="file"]').setInputFiles(join(artifacts, "../public/media/gradient.svg"));
  await page.getByRole("status").filter({ hasText: "Selected: gradient.svg" }).waitFor();
  await visit("thumbnail");
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await page.getByRole("button", { name: "Restore image", exact: true }).click();
  assert(await page.getByRole("img", { name: "A gradient placeholder", exact: true }).isVisible());
  await visit("media-toggle");
  await page.getByRole("button", { name: "Play preview", exact: true }).click();
  await page.getByRole("button", { name: "Pause preview", exact: true }).waitFor();

  await visit("chat-composer");
  await page.getByRole("textbox", { name: "Message the assistant", exact: true }).fill("Make a project brief");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Sent: Make a project brief" }).waitFor();
  await visit("chat-questionnaire");
  await page.getByText("Warm and personal", { exact: true }).click();
  await page.getByRole("button", { name: "Choose again", exact: true }).click();
  await page.getByText("Clear and direct", { exact: true }).waitFor();
  await visit("chat-run-dock");
  await page.getByRole("button", { name: "Stop Project draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Run stopped" }).waitFor();
  await page.getByRole("button", { name: "Restart preview", exact: true }).click();
  await page.getByRole("button", { name: "Stop Project draft", exact: true }).waitFor();

  await visit("network-canvas");
  await page.locator('[data-slot="network"][data-renderer="custom"] canvas').waitFor();
  assert(await page.locator('[data-slot="network"] canvas').evaluate(canvas => canvas.width > 0 && canvas.height > 0), "Canvas renderer paints a sized preview");
  console.log("Complete preview catalog checked in both schemes and sizes; overlay, form, media, graph and chat examples exercised");
}
