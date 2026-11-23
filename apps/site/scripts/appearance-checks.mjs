import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";

const storageKey = "diorama-ui-appearance";
const defaults = { scheme: "auto", density: "default", brand: "zero", effects: "off" };
export async function waitForAppearance(page) {
  await page.locator('astro-island[component-export="Stage"]:not([ssr])').waitFor();
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
  const dock = page.locator(".stage-bar .look-dock");
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
        let axe = new AxeBuilder({ page }).include(".stage-bar").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
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
  assert(await look("Hockney").isChecked(), "The look survives a reload");
  assert(await dark.isChecked(), "Dark survives a reload");
  assert(await effect.isChecked(), "Effects survives a reload");
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey), { scheme: "dark", density: "default", brand: "hockney", effects: "on" });
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
    assert(await look("Zero").isChecked());
    assert.equal(await page.locator("html").getAttribute("data-ui-density"), "default");
    assert.equal(await page.locator("html").getAttribute("data-site-scheme"), invalid.startsWith('{"brand"') ? "dark" : "auto");
  }
  // A real second tab exercises the storage event and every subscribed island.
  await page.evaluate(([key, preferences]) => localStorage.setItem(key, JSON.stringify(preferences)), [storageKey, { ...defaults, effects: "on" }]);
  await page.reload();
  await waitForAppearance(page);
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
  await blockedPage.locator(".stage-bar .look-dock").getByText("Dark", { exact: true }).click();
  await blockedPage.locator(".stage-bar .look-dock").getByText("Effects", { exact: true }).click();
  await settle(blockedPage);
  assert.equal(await blockedPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
  assert(await blockedPage.locator('.specimen-well [data-slot="button"]').first().evaluate(el => getComputedStyle(el).backgroundImage !== "none"), "Effects remains usable when storage is blocked");
  assert.deepEqual(blockedErrors, []);
  await blockedContext.close();
  console.log(`Appearance: ${combinations} rendered combinations, material reversal, keyboard, persistence, malformed storage and cross-tab sync checked`);
}
