import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";

const storageKey = "diorama-ui-appearance";
const defaults = { scheme: "auto", density: "default", brand: "zero", effects: "off" };
const settle = async page => {
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-appearance-changing"));
  await page.evaluate(async () => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
};
export async function checkAppearance(page, base, artifacts) {
  artifacts = join(artifacts, process.argv.includes("--webkit") ? "webkit" : "chromium");
  mkdirSync(artifacts, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/components/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const open = async () => {
    await page.locator('astro-island[component-export="AppearanceControls"]:not([ssr])').waitFor();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await settle(page);
  };
  await open();
  const panel = page.locator(".appearance-panel");
  const choose = async (group, label) => {
    await page.getByRole("group", { name: group, exact: true }).getByText(label, { exact: true }).click();
    await settle(page);
    assert(await page.getByRole("group", { name: group, exact: true }).getByRole("radio", { name: label, exact: true }).isChecked());
  };
  const sample = page.locator('[data-gallery-item][data-search^="Button "] [data-slot="button"]').first();
  const field = page.locator('[data-gallery-item][data-search^="Input "] [data-slot="control"]');
  const progress = page.locator('[data-gallery-item] [data-slot="progress"] [data-slot="fill"]');
  const switchTrack = page.locator('[data-gallery-item] [data-slot="switch"]').first().locator('[data-slot="track"]');
  const effect = page.getByRole("switch", { name: "Effects", exact: true });
  const material = () => sample.evaluate(el => getComputedStyle(el).backgroundImage);
  assert.equal(await material(), "none", "Effects OFF must remove material layers, not just update the switch");
  const plainSwitch = await switchTrack.evaluate(el => getComputedStyle(el).boxShadow);
  const toggle = async on => {
    if (await effect.isChecked() !== on) await panel.getByText("Effects", { exact: true }).click();
    await settle(page);
    assert.equal(await effect.isChecked(), on);
    assert.equal((await material()) !== "none", on, "Button material follows Effects");
    assert.equal(await progress.evaluate(el => getComputedStyle(el).backgroundImage !== "none"), on, "Progress material follows Effects");
    assert.equal(await panel.locator('.appearance-preview [data-slot="button"]').evaluate(el => getComputedStyle(el).backgroundImage !== "none"), on, "The panel preview follows Effects");
  };
  await toggle(true);
  assert.notEqual(await switchTrack.evaluate(el => getComputedStyle(el).boxShadow), plainSwitch, "Enabled switches gain a visible glow");
  await toggle(false);
  assert.equal(await switchTrack.evaluate(el => getComputedStyle(el).boxShadow), plainSwitch, "Switch glow is reversible");

  const themes = new Map();
  let combinations = 0;
  for (const brand of ["Diorama", "Graphite", "Hockney", "Stress"]) {
    await choose("Brand", brand);
    const corners = await panel.locator('.appearance-segments [data-slot="radio-group-options"]').first().evaluate(track => {
      const outer = getComputedStyle(track), inner = getComputedStyle(track.querySelector('[data-slot="radio"]'));
      return { actual: parseFloat(inner.borderRadius), expected: Math.max(0, parseFloat(outer.borderRadius) - parseFloat(outer.paddingLeft) - parseFloat(outer.borderLeftWidth)) };
    });
    assert(Math.abs(corners.actual - corners.expected) < 0.05, `${brand}: segment corners follow the track's rendered inset`);
    for (const [scheme, os] of [["Light", "light"], ["Dark", "dark"], ["System", "light"], ["System", "dark"]]) {
      await page.emulateMedia({ colorScheme: os });
      await choose("Scheme", scheme);
      const ground = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      const key = `${brand}-${os}`;
      if (scheme === "System") assert.equal(ground, themes.get(key), `${brand}: System must follow the OS`);
      else themes.set(key, ground);
      const panelHeight = (await panel.boundingBox()).height;
      for (const [density, buttonHeight, fieldHeight] of [["Compact", 28, 36], ["Default", 32, 40], ["Comfortable", 36, 44]]) {
        await choose("Density", density);
        for (const on of [true, false]) {
          await toggle(on);
          const rendered = await sample.evaluate(el => ({ height: el.getBoundingClientRect().height, radius: parseFloat(getComputedStyle(el).borderRadius), background: getComputedStyle(el).backgroundColor }));
          assert.equal(rendered.height, buttonHeight, `${brand}/${scheme}/${density}: button density must render`);
          assert.equal((await field.boundingBox()).height, fieldHeight, `${brand}/${scheme}/${density}: field density must render`);
          assert.equal((await panel.locator('.appearance-preview [data-slot="button"]').boundingBox()).height, buttonHeight, "Local preview follows density even though settings stay stable");
          assert.equal((await panel.boundingBox()).height, panelHeight, "Density must not shift the settings panel");
          if (brand === "Hockney") assert(rendered.radius >= buttonHeight / 2, "Hockney keeps its capsule shape across densities");
          combinations++;
        }
      }
      if (scheme !== "System") {
        let axe = new AxeBuilder({ page }).include(".appearance-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
        if (process.argv.includes("--webkit")) axe = axe.exclude("[data-base-ui-focus-guard]");
        const { violations } = await axe.analyze();
        assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join("; ")}`), [], `${brand}/${scheme}: appearance accessibility`);
      }
    }
    assert.notEqual(themes.get(`${brand}-light`), themes.get(`${brand}-dark`), `${brand}: schemes must paint different grounds`);
  }
  assert.equal(combinations, 96);
  // Native radio navigation remains intact when the visual circle is hidden.
  await choose("Scheme", "Light");
  await panel.getByRole("button", { name: "Reset", exact: true }).focus();
  // WebKit on macOS respects the system full-keyboard-access preference;
  // Option-Tab visits every control without modifying the user's settings.
  await page.keyboard.press(process.argv.includes("--webkit") && process.platform === "darwin" ? "Alt+Tab" : "Tab");
  assert(await page.getByRole("radio", { name: "Light", exact: true }).evaluate(el => el === document.activeElement), "Tab enters the selected radio");
  await page.keyboard.press("ArrowRight");
  await settle(page);
  assert(await page.getByRole("radio", { name: "Dark", exact: true }).isChecked());
  assert.equal(await page.getByRole("radio", { name: "Dark", exact: true }).evaluate(el => getComputedStyle(el.closest("label")).outlineStyle), "solid", "Segmented radios retain a visible keyboard focus indicator");
  await choose("Brand", "Hockney");
  await choose("Density", "Compact");
  await toggle(true);
  await effect.focus();
  await page.keyboard.press("Space");
  await settle(page);
  assert.equal(await material(), "none", "Effects works from the keyboard");
  await toggle(true);
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden" });
  assert(await page.getByRole("button", { name: "Appearance", exact: true }).evaluate(el => document.activeElement === el), "Closing restores trigger focus");
  await page.reload();
  await open();
  for (const label of ["Dark", "Compact", "Hockney"]) assert(await panel.getByRole("radio", { name: label, exact: true }).isChecked(), "Preferences survive reload");
  await toggle(true);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  assert.deepEqual(saved, { scheme: "dark", density: "compact", brand: "hockney", effects: "on" });
  await panel.screenshot({ path: join(artifacts, "appearance-hockney-dark.png") });

  await panel.getByRole("button", { name: "Reset", exact: true }).click();
  await settle(page);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey), defaults);
  assert(await panel.getByRole("button", { name: "Reset", exact: true }).isDisabled());
  for (const scheme of ["Light", "Dark"]) {
    await choose("Scheme", scheme);
    await panel.screenshot({ path: join(artifacts, `appearance-refactored-${scheme.toLowerCase()}.png`) });
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator(".appearance-dialog").waitFor();
  await settle(page);
  const bounds = await panel.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 320 && bounds.y >= 0 && bounds.y + bounds.height <= 568, "Appearance fits a small phone");
  assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), "Choices never overflow the panel");
  assert(await panel.evaluate(el => el.scrollHeight <= el.clientHeight), "All settings fit the short portrait viewport without scrolling");
  await panel.screenshot({ path: join(artifacts, "appearance-refactored-mobile.png") });
  await panel.getByRole("button", { name: "Close appearance" }).click();
  await panel.waitFor({ state: "hidden" });
  assert(await page.getByRole("button", { name: "Appearance", exact: true }).evaluate(el => document.activeElement === el));
  await open();
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press(process.argv.includes("--webkit") && process.platform === "darwin" ? "Alt+Tab" : "Tab");
    await page.waitForFunction(() => !!document.activeElement.closest(".appearance-panel"));
  }
  await page.setViewportSize({ width: 568, height: 320 });
  await panel.locator('.appearance-preview button').scrollIntoViewIfNeeded();
  const landscape = await panel.boundingBox();
  const lastControl = await panel.locator('.appearance-preview button').boundingBox();
  assert(landscape.y >= 0 && landscape.y + landscape.height <= 320);
  assert(lastControl.y >= landscape.y && lastControl.y + lastControl.height <= landscape.y + landscape.height, "Every setting remains reachable in landscape");
  await page.setViewportSize({ width: 320, height: 568 });
  // Persisted garbage must fall back per field rather than poisoning a theme.
  for (const invalid of ["null", "{", JSON.stringify({ brand: "obsolete", density: false, scheme: "dark", effects: "on" })]) {
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, invalid]);
    await page.reload();
    await open();
    assert(await panel.getByRole("radio", { name: "Diorama", exact: true }).isChecked());
    assert(await panel.getByRole("radio", { name: "Default", exact: true }).isChecked());
    assert.equal(await page.locator("html").getAttribute("data-site-scheme"), invalid.startsWith('{"brand"') ? "dark" : "auto");
  }
  // A real second tab exercises the storage event and every subscribed island.
  const sibling = await page.context().newPage();
  await sibling.goto(base);
  await sibling.evaluate(([key, preferences]) => localStorage.setItem(key, JSON.stringify(preferences)), [storageKey, defaults]);
  await page.waitForFunction(() => document.documentElement.dataset.siteEffects === "off");
  await settle(page);
  assert.equal(await material(), "none");
  assert(await panel.getByRole("button", { name: "Reset", exact: true }).isDisabled());
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
  await blockedPage.locator('astro-island[component-export="AppearanceControls"]:not([ssr])').waitFor();
  await blockedPage.getByRole("button", { name: "Appearance", exact: true }).click();
  await blockedPage.getByRole("group", { name: "Scheme", exact: true }).getByText("Dark", { exact: true }).click();
  await blockedPage.getByText("Effects", { exact: true }).click();
  await settle(blockedPage);
  assert.equal(await blockedPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
  assert(await blockedPage.locator('.specimen-well [data-slot="button"]').first().evaluate(el => getComputedStyle(el).backgroundImage !== "none"), "Effects remains usable when storage is blocked");
  assert.deepEqual(blockedErrors, []);
  await blockedContext.close();
  console.log(`Appearance: ${combinations} rendered combinations, material reversal, keyboard, persistence, reset, malformed storage and cross-tab sync checked`);
}
