import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Banner } from "./banner.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const banner = container.querySelector<HTMLElement>('[data-slot="banner"]');
  if (!banner) throw new Error("Banner did not render");
  return { banner, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Banner is a message, not an announcement by default", () => {
  test("no live region unless asked", () => {
    const { banner } = mount(<Banner>Exports use the template.</Banner>);
    // A banner rendered with the page is not news; a live region firing on
    // mount talks over whatever the user was already reading.
    expect(banner.getAttribute("role")).toBeNull();
    expect(banner.getAttribute("aria-live")).toBeNull();
  });

  test("isLive opts into a polite announcement", () => {
    const { banner } = mount(<Banner isLive>Saved.</Banner>);
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.getAttribute("aria-live")).toBe("polite");
  });

  test("the banner itself is not focusable", () => {
    const { banner } = mount(<Banner>Message</Banner>);
    expect(banner.getAttribute("tabindex")).toBeNull();
  });
});

describe("The dismiss control is a real button with a real name", () => {
  test("fires, is keyboard operable, and clears the 24px target floor", async () => {
    const onDismiss = vi.fn();
    const { container: c } = mount(
      <Banner variant="danger" onDismiss={onDismiss} dismissLabel="Dismiss export notice">
        Message
      </Banner>,
    );

    const button = c.querySelector<HTMLButtonElement>('[data-slot="banner-dismiss"]')!;
    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Dismiss export notice");

    // SC 2.5.8: the 16px glyph alone would be a 16px target.
    const box = button.getBoundingClientRect();
    expect(box.height).toBeGreaterThanOrEqual(24);
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(getComputedStyle(button).cursor).toBe("pointer");

    // The glyph must be at FULL strength: dimming it to 70% measured 2.77-2.89:1
    // against every light variant's fill, under SC 1.4.11's 3:1 floor. Hover is
    // a tint of the ink instead, which leaves the glyph alone.
    expect(getComputedStyle(button).opacity).toBe("1");

    button.focus();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard("{Enter}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("absent when there is nothing to dismiss", () => {
    const { container: c } = mount(<Banner>Message</Banner>);
    expect(c.querySelector('[data-slot="banner-dismiss"]')).toBeNull();
  });
});

describe("Every variant resolves to an intent ROLE, not a palette step", () => {
  test.each([
    // [variant, background, ink]
    ["neutral", "rgb(237, 232, 227)", "rgb(105, 99, 93)"],
    ["info", "rgb(210, 235, 248)", "rgb(27, 108, 132)"],
    ["success", "rgb(214, 239, 203)", "rgb(36, 110, 65)"],
    ["warning", "rgb(248, 231, 217)", "rgb(143, 84, 38)"],
    ["danger", "rgb(249, 226, 219)", "rgb(169, 68, 31)"],
  ] as const)("%s paints its fill and ink", (variant, bg, fg) => {
    const { banner } = mount(<Banner variant={variant}>Message</Banner>);
    const style = getComputedStyle(banner);
    expect(style.backgroundColor).toBe(bg);
    expect(style.color).toBe(fg);
  });

  test("geometry matches the sheet, and is concentric inside a Popover panel", () => {
    const { banner } = mount(<Banner>Message</Banner>);
    const style = getComputedStyle(banner);
    // radius-md (8) + the panel's p-lg (16) = the panel's radius-xl (24).
    expect(style.borderRadius).toBe("8px");
    expect(style.padding).toBe("16px");
    expect(style.gap).toBe("8px");
  });

  test("the message renders at the designed role", () => {
    const { container: c } = mount(<Banner>Message</Banner>);
    const message = c.querySelector<HTMLElement>('[data-slot="banner-message"]')!;
    const style = getComputedStyle(message);
    expect(style.fontSize).toBe("13px");
    expect(style.fontWeight).toBe("500");
  });

  test("the icon slot is never wrapped — it renders as passed", () => {
    const { container: c } = mount(
      <Banner icon={<svg data-testid="glyph" aria-hidden="true" />}>Message</Banner>,
    );
    const glyph = c.querySelector('[data-testid="glyph"]')!;
    // Direct child of the banner: a wrapper would break the flex layout the
    // sheet draws and is banned by §3 regardless.
    expect(glyph.parentElement?.dataset["slot"]).toBe("banner");
  });
});
