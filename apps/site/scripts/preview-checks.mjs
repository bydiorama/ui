import assert from "node:assert/strict";
import { join } from "node:path";
import { waitForAppearance } from "./appearance-checks.mjs";

async function checkFeaturedFrames(page, base, artifacts) {
  const colours = new Map();
  for (const width of [1280, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const combinations = width === 1280
      ? ["zero", "graphite", "hockney", "stress"].flatMap(brand => ["compact", "default", "comfortable"].map(density => ({ brand, density })))
      : [{ brand: "zero", density: "default" }];
    for (const { brand, density } of combinations) for (const scheme of ["light", "dark"]) {
      await page.goto(base);
      await page.evaluate(preferences => localStorage.setItem("diorama-ui-appearance", JSON.stringify(preferences)), { scheme, brand, density, effects: "off" });
      await page.reload();
      await page.waitForFunction(() => [...document.querySelectorAll('astro-island')].every(island => !island.hasAttribute("ssr")));
      await page.evaluate(() => document.fonts.ready);
      const chart = page.locator('.home-content [data-slot="chart"]');
      if (await chart.isVisible()) {
        await page.waitForFunction(() => [...document.querySelectorAll('[data-slot="chart-plot"]')].every(plot => Math.abs(Number(plot.querySelector("svg").getAttribute("width")) - plot.clientWidth) <= 1));
        const thumbnail = page.locator('.home-content .example-chart-thumbnail');
        assert.equal(await thumbnail.getByRole("button").count(), 0, "A minimal preview exposes no chart controls");
        assert.equal(await thumbnail.getByRole("group").count(), 0, "The static preview adds no keyboard plot stop");
        assert.equal(await thumbnail.locator('[data-slot="chart-head"]:visible, [data-slot="chart-y-axis"]:visible, [data-slot="chart-x-axis"]:visible, [data-slot="chart-grid"]:visible, [data-slot="chart-baseline"]:visible').count(), 0, "The thumbnail contains only bars");
        const paint = await thumbnail.evaluate(el => {
          const probe = document.createElement("span");
          probe.style.color = "var(--ui-bg-accent-legible)";
          el.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          const bounds = el.getBoundingClientRect();
          const bars = [...el.querySelectorAll('[data-slot="chart-bar"]')];
          return { expected, fills: bars.map(bar => getComputedStyle(bar).fill), fits: bars.every(bar => { const rect = bar.getBoundingClientRect(); return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1; }) };
        });
        assert.equal(paint.fills.length, 4);
        assert(paint.fills.every(fill => fill === paint.expected), `${brand}/${scheme}: chart marks follow the active brand accent`);
        assert(paint.fits, "Every bar fits inside the minimal preview");
        if (width === 1280 && density === "default") colours.set(`${brand}-${scheme}`, paint.fills[0]);
      }
      const frames = await page.locator('.home-content .gallery-item:visible').evaluateAll(items => items.map(item => {
        const well = item.querySelector('.specimen-well'), rect = well.getBoundingClientRect();
        return { name: item.querySelector('.tile-caption a').textContent, top: Math.round(rect.top), height: rect.height, overflow: well.scrollHeight > well.clientHeight || well.scrollWidth > well.clientWidth, caption: item.querySelector('.tile-caption').getBoundingClientRect().top };
      }));
      const expected = width < 640 ? 200 : 240;
      assert(frames.every(frame => frame.height === expected && !frame.overflow), `${brand}/${density}/${scheme}/${width}: featured previews fit their fixed frames: ${JSON.stringify(frames)}`);
      for (const top of new Set(frames.map(frame => frame.top))) {
        const captions = frames.filter(frame => frame.top === top).map(frame => frame.caption);
        assert(Math.max(...captions) - Math.min(...captions) < 1, "Every caption in a homepage row shares its baseline");
      }
      if (width === 1280 && brand === "graphite" && density === "default") {
        const grid = page.locator('.specimen-grid');
        // scroll-padding otherwise leaves the last caption below the viewport
        // during an element capture even though the grid itself fits.
        await grid.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY));
        await grid.screenshot({ path: join(artifacts, `home-grid-aligned-${scheme}.png`) });
      }
    }
  }
  for (const scheme of ["light", "dark"]) assert.equal(new Set(["zero", "graphite", "hockney", "stress"].map(brand => colours.get(`${brand}-${scheme}`))).size, 4, `${scheme}: each brand must actually change the chart's rendered colour`);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base);
  await waitForAppearance(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  for (const scheme of ["light", "dark"]) {
    await page.getByRole("group", { name: "Scheme", exact: true }).getByText(scheme === "light" ? "Light" : "Dark", { exact: true }).click();
    for (const [brand, label] of [["zero", "Diorama"], ["graphite", "Graphite"], ["hockney", "Hockney"], ["stress", "Stress"]]) {
      await page.getByRole("group", { name: "Brand", exact: true }).getByText(label, { exact: true }).click();
      await page.waitForFunction(expected => getComputedStyle(document.querySelector('.example-chart-thumbnail [data-slot="chart-bar"]')).fill === expected, colours.get(`${brand}-${scheme}`));
    }
  }
  await page.keyboard.press("Escape");
  await page.locator('.example-chart-thumbnail').hover();
  assert.equal(await page.locator('[data-slot="chart-tooltip"]').count(), 0, "A static preview does not open tooltips");
}

export async function checkPreviews(page, base, artifacts) {
  const hydrate = () => page.waitForFunction(() => [...document.querySelectorAll('astro-island[component-export="Specimen"]')].every(island => !island.hasAttribute("ssr")));
  const visit = async name => {
    await page.goto(`${base}/components/${name}/`);
    await hydrate();
  };
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scheme of ["light", "dark"]) {
      await page.goto(`${base}/components/`);
      await page.evaluate(scheme => localStorage.setItem("diorama-ui-appearance", JSON.stringify({ scheme, brand: "zero", density: "default", effects: "off" })), scheme);
      await page.reload();
      await hydrate();
      await page.evaluate(() => document.fonts.ready);
      // Charts measure after hydration. Require the actual plot to follow its
      // column before checking containment; the SSR width is only a fallback.
      await page.waitForFunction(() => [...document.querySelectorAll('[data-slot="chart-plot"]')].every(plot => Math.abs(Number(plot.querySelector("svg").getAttribute("width")) - plot.clientWidth) <= 1));
      const overflow = await page.locator('.gallery-item').evaluateAll(items => items.filter(item => {
        const well = item.querySelector('.specimen-well');
        return well.scrollWidth > well.clientWidth + 1 || well.scrollHeight > well.clientHeight + 1;
      }).map(item => item.querySelector('.tile-caption a').textContent));
      assert.deepEqual(overflow, [], `${scheme}/${width}: previews stay within their wells`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}/${width}: catalog overflows`);
      assert(await page.locator('.specimen-well img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), "Preview media loads locally");
      await page.screenshot({ path: join(artifacts, `catalog-${width}-${scheme}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await checkFeaturedFrames(page, base, artifacts);
  await page.goto(base);
  await hydrate();
  assert.equal(await page.locator('.gallery-item [data-slot="chart"]').count(), 1, "The homepage features the real Chart");
  assert.equal(await page.locator('.gallery-item [data-slot="sparkline"]').count(), 0, "The compact trend belongs in its metric example");
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
  await page.locator('.preview-frame [tabindex="0"]').focus();
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
    assert(Number(await slider.getAttribute("aria-valuenow")) > before, `${name}: keyboard changes the value`);
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
  await page.getByRole("button", { name: "Remove grid study", exact: true }).click();
  await page.getByRole("button", { name: "Restore image", exact: true }).click();
  assert(await page.getByRole("img", { name: "Geometric grid study", exact: true }).isVisible());
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
