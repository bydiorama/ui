import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";

const storageKey = "diorama-ui-appearance";
const defaults = { scheme: "auto", density: "default", brand: "zero", effects: "off", motion: "auto" };
export async function waitForAppearance(page) {
  await page.locator('astro-island[component-export="Stage"]:not([ssr])').waitFor();
}
// A component page offers the look from its stage bar: a trigger, and a panel under it.
export async function openLooks(page) {
  const panel = page.locator(".look-panel");
  if (!(await panel.isVisible())) await page.locator(".stage-bar .look-trigger").click();
  await panel.waitFor();
  return panel;
}
const settle = async page => {
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-appearance-changing"));
  await page.evaluate(async () => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
};
// The dock offers four looks, Effects and Dark. Graphite, Stress and the three
// densities are still themes the system renders (and a reader can store), so the
// matrix applies them exactly as the app does: the four attributes, then the event.
const apply = (page, preferences) => page.evaluate(preferences => {
  const attributes = { scheme: "siteScheme", density: "uiDensity", brand: "siteBrand", effects: "siteEffects" };
  const root = document.documentElement;
  for (const [key, attribute] of Object.entries(attributes)) root.dataset[attribute] = preferences[key];
  root.dataset.theme = `${preferences.brand} ${preferences.scheme}`;
  document.dispatchEvent(new Event("appearance-change"));
}, preferences);
export async function checkHomeSelection(page, base) {
  await page.goto(base);
  const dock = page.locator(".look-dock-slot");
  await page.locator('astro-island[component-export="LookDock"]:not([ssr])').waitFor({ state: "attached" });

  const list = page.getByRole("tablist", { name: "Example screens" });
  await list.scrollIntoViewIfNeeded();
  await page.locator('astro-island[component-export="UseCaseStage"]:not([ssr])').waitFor({ state: "attached" });
  for (const [level, brand, example] of [
    ["full", "soft", "Creative Editor"],
    ["reduced", "mono", "AI Workspace"],
    ["off", "zero", "Image Library"],
  ]) {
    await page.locator("html").evaluate((root, level) => { root.dataset.uiMotion = level; }, level);
    const travel = await dock.locator(`input[value="${brand}"]`).evaluate(input => {
      input.click();
      return input.labels[0].querySelector(".look-fill").getAnimations()
        .some(animation => animation.effect.getKeyframes().some(frame => "translate" in frame));
    });
    assert.equal(travel, level === "full", `The chosen look travels at Full only (${level})`);
    const tab = list.getByRole("tab", { name: example, exact: true });
    await tab.click();
    const panel = page.locator(".use-case-panel:visible");
    assert.equal(await panel.getAttribute("aria-label"), `${example} example`);
    assert.equal(await panel.evaluate(el => getComputedStyle(el).animationName), "none", "The stage leaves panel motion to Tabs");
    const indicator = list.locator('[data-slot="tabs-indicator"]');
    assert.equal(await indicator.isVisible(), level === "full");
    const fill = await tab.evaluate(async el => {
      await Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {})));
      return getComputedStyle(el).backgroundColor;
    });
    assert.equal(fill === "rgba(0, 0, 0, 0)", level === "full", "Exactly one layer paints the selection");
  }
  await page.evaluate(() => localStorage.removeItem("diorama-ui-appearance"));
}

export async function checkAppearance(page, base, artifacts) {
  artifacts = join(artifacts, process.argv.includes("--webkit") ? "webkit" : "chromium");
  mkdirSync(artifacts, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  // Earlier checks leave the browser emulating dark; a first visit follows a light system.
  await page.emulateMedia({ colorScheme: "light" });
  // The catalog draws its components, so the live samples are on their own
  // pages: the dock is driven on Button's, and Input, Progress and Switch
  // are read in a second tab, which opens in the same stored settings.
  await page.goto(`${base}/components/button/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForAppearance(page);
  const dock = await openLooks(page);
  const look = name => dock.getByRole("radio", { name, exact: true });
  const chooseLook = async name => {
    await dock.locator(".look-option", { hasText: name }).click();
    await settle(page);
    assert(await look(name).isChecked(), `${name} is chosen`);
    assert.equal(await page.locator("html").getAttribute("data-site-brand"), name.toLowerCase());
  };
  const sample = page.locator('.preview-frame [data-slot="button"]').first();
  // Reads one value from another component's page under the stored settings.
  const elsewhere = async (name, selector, read) => {
    const other = await page.context().newPage();
    await other.goto(`${base}/components/${name}/`);
    await other.waitForFunction(() => [...document.querySelectorAll('astro-island[component-export="Stage"]')].every(island => !island.hasAttribute("ssr")));
    await settle(other);
    const value = await other.locator(`.preview-frame ${selector}`).first().evaluate(read);
    await other.close();
    return value;
  };
  const progressMaterial = () => elsewhere("progress", '[data-slot="progress"] [data-slot="fill"]', el => getComputedStyle(el).backgroundImage !== "none");
  const switchGlow = () => elsewhere("switch", '[data-slot="switch"] [data-slot="track"]', el => getComputedStyle(el).boxShadow);
  const effect = dock.getByRole("switch", { name: "Effects", exact: true });
  const dark = dock.getByRole("switch", { name: "Dark", exact: true });
  const material = () => sample.evaluate(el => getComputedStyle(el).backgroundImage);
  assert.equal(await material(), "none", "Effects OFF must remove material layers, not just update the switch");
  const plainSwitch = await switchGlow();
  const toggle = async on => {
    if (await effect.isChecked() !== on) await dock.getByText("Effects", { exact: true }).click();
    await settle(page);
    assert.equal(await effect.isChecked(), on);
    assert.equal((await material()) !== "none", on, "Button material follows Effects");
  };
  await toggle(true);
  assert.equal(await progressMaterial(), true, "Progress material follows Effects");
  assert.notEqual(await switchGlow(), plainSwitch, "Enabled switches gain a visible glow");
  await toggle(false);
  assert.equal(await progressMaterial(), false, "Progress material steps aside with Effects off");
  assert.equal(await switchGlow(), plainSwitch, "Switch glow is reversible");

  // The dock's own looks and its Dark switch.
  assert.deepEqual(await dock.getByRole("radio").evaluateAll(radios => radios.map(radio => radio.closest("label").textContent.trim())), ["Mono", "Soft", "Zero", "Hockney"]);
  assert(await look("Zero").isChecked(), "Zero is the look a first visit shows");
  for (const name of ["Mono", "Soft", "Hockney", "Zero"]) await chooseLook(name);
  await dock.getByText("Dark", { exact: true }).click();
  await settle(page);
  assert(await dark.isChecked());
  assert.equal(await page.locator("html").getAttribute("data-site-scheme"), "dark");
  await dock.getByText("Dark", { exact: true }).click();
  await settle(page);
  assert.equal(await page.locator("html").getAttribute("data-site-scheme"), "light");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForAppearance(page);
  await openLooks(page);

  const themes = new Map();
  let combinations = 0;
  for (const brand of ["zero", "graphite", "hockney", "stress"]) {
    for (const [scheme, os] of [["light", "light"], ["dark", "dark"], ["auto", "light"], ["auto", "dark"]]) {
      await page.emulateMedia({ colorScheme: os });
      await apply(page, { ...defaults, brand, scheme });
      await settle(page);
      const ground = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      const key = `${brand}-${os}`;
      if (scheme === "auto") assert.equal(ground, themes.get(key), `${brand}: System must follow the OS`);
      else themes.set(key, ground);
      for (const [density, buttonHeight, fieldHeight] of [["compact", 28, 36], ["default", 32, 40], ["comfortable", 36, 44]]) {
        await apply(page, { ...defaults, brand, scheme, density });
        await settle(page);
        // Once per brand and density: the field renders its density too.
        if (scheme === "light") {
          await page.evaluate(([key, preferences]) => localStorage.setItem(key, JSON.stringify(preferences)), [storageKey, { ...defaults, brand, density }]);
          assert.equal(await elsewhere("input", '[data-slot="control"]', el => el.getBoundingClientRect().height), fieldHeight, `${brand}/${density}: field density must render`);
        }
        for (const effects of ["on", "off"]) {
          await apply(page, { ...defaults, brand, scheme, density, effects });
          await settle(page);
          const rendered = await sample.evaluate(el => ({ height: el.getBoundingClientRect().height, radius: parseFloat(getComputedStyle(el).borderRadius), material: getComputedStyle(el).backgroundImage !== "none" }));
          assert.equal(rendered.height, buttonHeight, `${brand}/${scheme}/${density}: button density must render`);
          assert.equal(rendered.material, effects === "on", `${brand}/${scheme}/${density}: button material follows Effects`);
          if (brand === "hockney") assert(rendered.radius >= buttonHeight / 2, "Hockney keeps its capsule shape across densities");
          combinations++;
        }
      }
      if (scheme !== "auto") {
        let axe = new AxeBuilder({ page }).include(".stage-bar").include(".look-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
        if (process.argv.includes("--webkit")) axe = axe.exclude("[data-base-ui-focus-guard]");
        const { violations } = await axe.analyze();
        assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join("; ")}`), [], `${brand}/${scheme}: appearance accessibility`);
      }
    }
    assert.notEqual(themes.get(`${brand}-light`), themes.get(`${brand}-dark`), `${brand}: schemes must paint different grounds`);
  }
  assert.equal(combinations, 96);
  await page.evaluate(() => localStorage.clear());
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await waitForAppearance(page);
  await openLooks(page);

  // Native radio navigation: Tab enters the chosen look, arrows move and choose.
  await chooseLook("Soft");
  await look("Soft").focus();
  await page.keyboard.press("ArrowRight");
  await settle(page);
  assert(await look("Zero").isChecked(), "Arrow keys choose the next look");
  assert.equal(await look("Zero").evaluate(el => getComputedStyle(el.closest("label")).outlineStyle), "solid", "Looks retain a visible keyboard focus indicator");
  await chooseLook("Hockney");
  await dark.focus();
  await page.keyboard.press("Space");
  await settle(page);
  assert.equal(await page.locator("html").getAttribute("data-site-scheme"), "dark", "Dark works from the keyboard");
  await effect.focus();
  await page.keyboard.press("Space");
  await settle(page);
  assert((await material()) !== "none", "Effects works from the keyboard");
  await page.reload();
  await waitForAppearance(page);
  await openLooks(page);
  assert(await look("Hockney").isChecked(), "The look survives a reload");
  assert(await dark.isChecked(), "Dark survives a reload");
  assert(await effect.isChecked(), "Effects survives a reload");
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey), { scheme: "dark", density: "default", brand: "hockney", effects: "on", motion: "auto" });
  await dock.screenshot({ path: join(artifacts, "appearance-hockney-dark.png") });
  for (const name of ["Mono", "Soft", "Zero"]) {
    await chooseLook(name);
    await dock.screenshot({ path: join(artifacts, `appearance-${name.toLowerCase()}-dark.png`) });
  }

  // On a phone the dock wraps inside the bar and the page never scrolls sideways.
  await page.setViewportSize({ width: 320, height: 568 });
  await settle(page);
  const bounds = await dock.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 320, "The look dock fits a small phone");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "The look dock never widens the page");
  assert.equal(await dock.getByRole("radio").count(), 4, "Every look stays reachable on a phone");
  await dock.screenshot({ path: join(artifacts, "appearance-mobile.png") });

  // Persisted garbage must fall back per field rather than poisoning a theme.
  for (const invalid of ["null", "{", JSON.stringify({ brand: "obsolete", density: false, scheme: "dark", effects: "on" })]) {
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, invalid]);
    await page.reload();
    await waitForAppearance(page);
    await openLooks(page);
    assert(await look("Zero").isChecked());
    assert.equal(await page.locator("html").getAttribute("data-ui-density"), "default");
    assert.equal(await page.locator("html").getAttribute("data-site-scheme"), invalid.startsWith('{"brand"') ? "dark" : "auto");
  }
  // A real second tab exercises the storage event and every subscribed island.
  await page.evaluate(([key, preferences]) => localStorage.setItem(key, JSON.stringify(preferences)), [storageKey, { ...defaults, effects: "on" }]);
  await page.reload();
  await waitForAppearance(page);
  await openLooks(page);
  assert((await material()) !== "none");
  const sibling = await page.context().newPage();
  await sibling.goto(base);
  await sibling.evaluate(([key, preferences]) => localStorage.setItem(key, JSON.stringify(preferences)), [storageKey, defaults]);
  await page.waitForFunction(() => document.documentElement.dataset.siteEffects === "off");
  await settle(page);
  assert.equal(await material(), "none");
  assert(!(await effect.isChecked()), "The dock follows another tab");
  await sibling.close();
  const blockedContext = await page.context().browser().newContext({ viewport: { width: 320, height: 568 } });
  await blockedContext.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  const blockedPage = await blockedContext.newPage();
  const blockedErrors = [];
  blockedPage.on("pageerror", error => blockedErrors.push(error.message));
  await blockedPage.goto(`${base}/components/button/`);
  await waitForAppearance(blockedPage);
  const blockedDock = await openLooks(blockedPage);
  await blockedDock.getByText("Dark", { exact: true }).click();
  await blockedDock.getByText("Effects", { exact: true }).click();
  await settle(blockedPage);
  assert.equal(await blockedPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
  assert(await blockedPage.locator('.specimen-well [data-slot="button"]').first().evaluate(el => getComputedStyle(el).backgroundImage !== "none"), "Effects remains usable when storage is blocked");
  assert.deepEqual(blockedErrors, []);
  await blockedContext.close();
  console.log(`Appearance: ${combinations} rendered combinations, material reversal, keyboard, persistence, malformed storage and cross-tab sync checked`);
}

/**
 * The site's motion setting (ADR 0028), on the Motion docs page: choosing a
 * level sets the attribute the tokens read, the tokens answer, the choice is
 * stored with the rest of the appearance, and it is applied again before the
 * first paint of the next page.
 */
export async function checkMotionSetting(page, base) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/docs/motion/`);
  const lab = page.locator(".motion-lab");
  await page.locator('astro-island[component-export="MotionLab"]:not([ssr])').waitFor();
  const level = () => page.evaluate(() => [document.documentElement.dataset.uiMotion, getComputedStyle(document.documentElement).getPropertyValue("--ui-motion-level").trim(), getComputedStyle(document.documentElement).getPropertyValue("--ui-motion-travel").trim()]);
  // "System" follows the operating system, in both directions. The suite's
  // context may emulate reduced motion, so each side is set explicitly.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.deepEqual(await level(), ["auto", "full", "1"], "With no choice and no OS preference the site moves fully");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.deepEqual(await level(), ["auto", "reduced", "0"], "With no choice the site follows the OS asking for less");
  await lab.getByText("Full", { exact: true }).click();
  assert.deepEqual(await level(), ["full", "full", "1"], "Choosing Full in the site overrides the OS");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await lab.getByText("Reduced", { exact: true }).click();
  assert.deepEqual(await level(), ["reduced", "reduced", "0"], "Reduced takes travel away");
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).motion, storageKey), "reduced", "The motion level is stored with the appearance");
  await page.goto(`${base}/docs/`);
  assert.deepEqual(await level(), ["reduced", "reduced", "0"], "The stored level applies on the next page");
  await page.goto(`${base}/docs/motion/`);
  await page.locator('astro-island[component-export="MotionLab"]:not([ssr])').waitFor();
  await lab.getByText("System", { exact: true }).click();
  assert.deepEqual(await level(), ["auto", "full", "1"], "System hands the choice back");
}

// Exercise the site-owned animations under opposing OS and page preferences.
// A setting change must reach a running clock as well as newly clicked controls.
export async function checkSiteMotion(page, base) {
  await page.goto(base);
  const root = page.locator("html");
  const setLevel = level => root.evaluate((el, value) => { el.dataset.uiMotion = value; }, level);
  const cursor = page.locator(".terminal-cursor");
  await cursor.scrollIntoViewIfNeeded();
  await page.waitForSelector("[data-revealed] .terminal-cursor", { state: "attached" });
  const stack = page.locator(".stack");
  await stack.scrollIntoViewIfNeeded();
  await page.locator('astro-island[component-export="LayerStack"]:not([ssr])').waitFor({ state: "attached" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await setLevel("full");
  await page.waitForSelector(".stack[data-touring]", { state: "attached" });
  assert.equal(await cursor.evaluate(el => getComputedStyle(el).animationName), "terminal-blink");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const level of ["reduced", "off"]) {
    await setLevel(level);
    await page.waitForSelector(".stack:not([data-touring])", { state: "attached" });
    assert.equal(await cursor.evaluate(el => getComputedStyle(el).animationName), "none");
    assert.equal(await page.locator('.look-dock-slot .look-swatch[data-site-brand="zero"]').evaluate(el => getComputedStyle(el).getPropertyValue("--ui-motion-level").trim()), level, "A Zero swatch inherits the page motion level");
    assert.equal(await page.locator(".terminal-typed").evaluate(el => getComputedStyle(el).clipPath), "none");
    assert.equal(await page.locator(".hero-reel").evaluate(el => el.hasAttribute("data-instant")), true);
  }

  await page.goto(`${base}/components/`);
  const status = page.locator(".catalog-segments [data-status-filter]");
  for (const [level, index] of [["full", 1], ["reduced", 2], ["off", 0]]) {
    await setLevel(level);
    const motion = await status.nth(index).evaluate(button => {
      button.click();
      const fill = button.querySelector(".selection-fill");
      const css = getComputedStyle(fill);
      return { sliding: fill.getAnimations().some(a => a.id === "selection-slide"), duration: css.transitionDuration };
    });
    assert.equal(motion.sliding, level === "full", `Catalog selection travel at ${level}`);
    if (level === "off") assert.equal(motion.duration, "0.001s", "Off resolves the fill transition to 1ms");
    assert.equal(await status.nth(index).getAttribute("aria-pressed"), "true");
  }
  await setLevel("full");
  await page.locator(".catalog-controls").evaluate(el => { el.dataset.uiMotion = "off"; });
  assert.equal(await status.first().locator(".selection-fill").evaluate(el => getComputedStyle(el).transitionDuration), "0.001s", "A local Off region re-resolves the inherited timing pair");
  await setLevel("auto");
}
