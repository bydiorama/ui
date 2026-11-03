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

/* ------------------------------------------------------------------ *
 * Title and action (#9 proposals, owner's Audit #9 redesign)
 * ------------------------------------------------------------------ */

/** The resolved value of a colour role, through the same cascade. */
function role(token: string) {
  const probe = document.createElement("div");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe("Banner title", () => {
  test("is a <p> in the intent ink, NOT a heading, above the message", () => {
    const { banner } = mount(
      <Banner variant="warning" title="Layouts off-grid">Two layouts drift from the 8pt baseline.</Banner>,
    );
    const title = banner.querySelector<HTMLElement>('[data-slot="banner-title"]')!;
    const message = banner.querySelector<HTMLElement>('[data-slot="banner-message"]')!;
    expect(title.tagName).toBe("P");
    expect(banner.querySelector("h1,h2,h3,h4,h5,h6")).toBeNull();
    expect(getComputedStyle(title).color).toBe(role("--ui-intent-warning-fg"));
    expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(message.getBoundingClientRect().top);
  });

  test("a message-only banner is the same single flex row it always was", () => {
    const { banner } = mount(<Banner>Exports use the template.</Banner>);
    expect(getComputedStyle(banner).display).toBe("flex");
    expect(banner.querySelector('[data-slot="banner-text"]')).toBeNull();
  });
});

describe("Banner.Action takes the banner's role", () => {
  function actionIn(variant: "neutral" | "info" | "success" | "warning" | "danger") {
    const { banner } = mount(
      <Banner variant={variant} title="Title" action={<Banner.Action onClick={vi.fn()}>Act</Banner.Action>}>
        Message
      </Banner>,
    );
    return banner.querySelector<HTMLElement>('[data-slot="banner-action"]')!;
  }

  test("info: the filled primary", () => {
    const action = actionIn("info");
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--ui-bg-accent)";
    document.body.appendChild(probe);
    expect(getComputedStyle(action).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
  });

  test.each([
    ["neutral", "--ui-text-muted"],
    ["success", "--ui-intent-success-fg"],
    ["warning", "--ui-intent-warning-fg"],
    ["danger", "--ui-text-on-danger-subtle"],
  ] as const)("%s: an outline in its own ink, no fill", async (variant, ink) => {
    const action = actionIn(variant);
    const style = getComputedStyle(action);
    expect(style.color).toBe(role(ink));
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    // The ring is an inset box-shadow in the same ink — Button's hairline.
    expect(style.boxShadow).toContain(role(ink));
    // Hover is a tint of the ink, not Button outline's grey ring.
    await userEvent.hover(action);
    await expect.poll(() => getComputedStyle(action).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(action).boxShadow).toContain(role(ink));
  });

  test("always md (32px), and a real button with its own name", () => {
    const action = actionIn("warning");
    expect(action.tagName).toBe("BUTTON");
    expect(action.getBoundingClientRect().height).toBe(32);
    expect(action.textContent).toBe("Act");
  });
});

describe("Banner layout with an action", () => {
  function rich(width: number) {
    const host = document.createElement("div");
    host.style.width = `${width}px`;
    document.body.appendChild(host);
    const r = createRoot(host);
    act(() =>
      r.render(
        <Banner
          variant="warning"
          icon={<svg aria-hidden="true" />}
          title="Layouts off-grid"
          action={<Banner.Action onClick={vi.fn()}>Review layouts</Banner.Action>}
          onDismiss={vi.fn()}
          dismissLabel="Dismiss layout warning"
        >
          Two layouts drift from the 8pt baseline. Publishing will keep them as they are.
        </Banner>,
      ),
    );
    const q = (slot: string) => host.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!.getBoundingClientRect();
    const cleanup = () => {
      act(() => r.unmount());
      host.remove();
    };
    return { q, cleanup };
  }

  test("wide: action beside the text, dismiss after it, both centred on the block", () => {
    const { q, cleanup } = rich(720);
    const text = q("banner-text");
    const action = q("banner-action");
    const dismiss = q("banner-dismiss");
    expect(action.left).toBeGreaterThan(text.right);
    expect(dismiss.left).toBeGreaterThan(action.right);
    const centre = (r: DOMRect) => r.top + r.height / 2;
    expect(Math.abs(centre(action) - centre(text))).toBeLessThan(1);
    cleanup();
  });

  test("narrow (< 480px): the action drops UNDER the message, in the text column", () => {
    const { q, cleanup } = rich(360);
    const text = q("banner-text");
    const action = q("banner-action");
    const dismiss = q("banner-dismiss");
    expect(action.top).toBeGreaterThanOrEqual(text.bottom);
    expect(action.left).toBeCloseTo(text.left, 0);
    // At its own width, not stretched across the column.
    expect(action.width).toBeLessThan(text.width);
    // The dismiss stays up on the title's line.
    expect(dismiss.top).toBeLessThan(text.top + 8);
    cleanup();
  });
});
