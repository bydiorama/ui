import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Avatar } from "./avatar.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const avatar = container.querySelector('[data-slot="avatar"]');
  if (!avatar) throw new Error("Avatar did not render");
  return { avatar: avatar as HTMLElement, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Avatar accessible name", () => {
  test("a photo carries the full name as alt text", () => {
    const { container: c } = mount(<Avatar name="Miroslava Vrbová" src="/photo.jpg" />);
    const img = c.querySelector("img")!;
    expect(img.alt).toBe("Miroslava Vrbová");
  });

  test("initials are hidden from assistive tech and the full name exposed", () => {
    const { container: c } = mount(<Avatar name="Miroslava Vrbová" />);
    const initials = c.querySelector('[data-slot="avatar-initials"]')!;

    // A screen reader spelling out "M V" helps nobody.
    expect(initials.getAttribute("aria-hidden")).toBe("true");
    expect(initials.textContent).toBe("MV");
    expect(c.textContent).toContain("Miroslava Vrbová");
  });

  test("initials derive from first and last word, and can be overridden", () => {
    const a = mount(<Avatar name="Jakub Otčenáš" />);
    expect(a.container.querySelector('[data-slot="avatar-initials"]')!.textContent).toBe("JO");
    act(() => root?.unmount());
    container?.remove();

    const b = mount(<Avatar name="Diorama" />);
    expect(b.container.querySelector('[data-slot="avatar-initials"]')!.textContent).toBe("D");
    act(() => root?.unmount());
    container?.remove();

    const c = mount(<Avatar name="Miroslava Vrbová" initials="MV" />);
    expect(c.container.querySelector('[data-slot="avatar-initials"]')!.textContent).toBe("MV");
  });
});

describe("Avatar rendering", () => {
  test("initials ink clears AA on the well — not the disabled ink the sheet used", () => {
    const { container: c } = mount(<Avatar name="Miroslava Vrbová" />);
    const initials = c.querySelector('[data-slot="avatar-initials"]') as HTMLElement;
    const style = getComputedStyle(initials.parentElement!);

    // The sheet's disabled ink measured 1.8:1 here. Assert the colour actually
    // resolved rather than trusting the class name.
    expect(style.color).toBe("rgb(105, 99, 93)");
    expect(style.backgroundColor).toBe("rgb(237, 232, 227)");
  });

  test.each([
    ["lg", "48px"],
    ["md", "32px"],
    ["sm", "24px"],
  ] as const)("size %s is %s square", (size, px) => {
    const { avatar } = mount(<Avatar name="Miroslava Vrbová" size={size} />);
    const style = getComputedStyle(avatar);
    expect(style.width).toBe(px);
    expect(style.height).toBe(px);
  });

  test("shape switches between a circle and the rounded radius", () => {
    const circle = mount(<Avatar name="X Y" shape="circle" />);
    expect(getComputedStyle(circle.avatar).borderRadius).not.toBe("8px");
    act(() => root?.unmount());
    container?.remove();

    const rounded = mount(<Avatar name="X Y" shape="rounded" />);
    expect(getComputedStyle(rounded.avatar).borderRadius).toBe("8px");
  });
});
