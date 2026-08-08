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
  return {
    avatar: avatar as HTMLElement,
    frame: container.querySelector('[data-slot="avatar-frame"]') as HTMLElement,
    container: container!,
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

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
    unmount();

    const b = mount(<Avatar name="Diorama" />);
    expect(b.container.querySelector('[data-slot="avatar-initials"]')!.textContent).toBe("D");
    unmount();

    const c = mount(<Avatar name="Miroslava Vrbová" initials="MV" />);
    expect(c.container.querySelector('[data-slot="avatar-initials"]')!.textContent).toBe("MV");
  });
});

describe("Avatar rendering", () => {
  test("initials ink clears AA on the well — not the disabled ink the sheet used", () => {
    const { frame } = mount(<Avatar name="Miroslava Vrbová" />);
    const style = getComputedStyle(frame);

    // The sheet's disabled ink measures 1.76:1 here. Assert the colour actually
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

  test("shape uses Button's own two words, and both actually paint", () => {
    const soft = mount(<Avatar name="X Y" shape="soft" />);
    // md's soft radius is Button's md soft radius. Asserted as a number here
    // and as a RELATIONSHIP to Button in the concentric test below.
    expect(getComputedStyle(soft.frame).borderRadius).toBe("8px");
    unmount();

    const full = mount(<Avatar name="X Y" shape="full" />);
    const r = parseFloat(getComputedStyle(full.frame).borderRadius);
    expect(r).toBeGreaterThan(100);
  });

  /**
   * The sheet's hairline, which the component did not have before this pass.
   *
   * Two ways this fails silently and neither is visible in the source. The
   * width and the colour are BOTH `outline-*` utilities, so tailwind-merge can
   * classify one as the other and delete it — the exact shape of the
   * `text-button-sm` bug. And an outline whose style resolves to `none` paints
   * nothing at any width, which is how Button's focus ring disappeared. So
   * assert all three parts, not the ring's existence.
   */
  test("the frame draws the sheet's 1.5px inset hairline", () => {
    const { frame } = mount(<Avatar name="X Y" />);
    const style = getComputedStyle(frame);

    expect(style.outlineStyle).toBe("solid");
    // 1px and -1px, not 1.5 — BOTH halves of an outline snap to whole device
    // pixels, exactly as border-width does, and the test browser runs at
    // dPR 1. That is the platform, not a lost class;
    // `border-hairline.browser.test.tsx` pins it for outline as well as
    // border so it is not re-investigated. At dPR 2 both are exact.
    expect(style.outlineWidth).toBe("1px");
    expect(style.outlineOffset).toBe("-1px");
    // --ui-bg-surface in light. A width with no colour would report the ink.
    expect(style.outlineColor).toBe("rgb(253, 252, 251)");
  });
});

describe("Avatar status dot", () => {
  const dot = () => document.querySelector('[data-slot="avatar-status"]') as HTMLElement;

  test("no status means no dot at all", () => {
    const { container: c } = mount(<Avatar name="X Y" />);
    expect(c.querySelector('[data-slot="avatar-status"]')).toBeNull();
    expect(c.querySelector('[data-slot="avatar"]')!.getAttribute("data-status")).toBeNull();
  });

  test("the dot is hidden from assistive tech and the LABEL carries the state", () => {
    const { container: c } = mount(
      <Avatar name="Mira Vance" status="success" statusLabel="Online" />,
    );
    expect(dot().getAttribute("aria-hidden")).toBe("true");
    // WCAG 1.4.1: colour is not the only channel. The sentence is in the DOM
    // next to the name, so the two are announced together.
    expect(c.textContent).toContain("Online");
    expect(c.textContent).toContain("Mira Vance");
  });

  test.each([
    ["success", "rgb(36, 110, 65)"],
    ["neutral", "rgb(105, 99, 93)"],
    ["danger", "rgb(169, 68, 31)"],
  ] as const)("%s resolves to its ROLE, not to the sheet's value", (status, fill) => {
    mount(<Avatar name="X Y" status={status} statusLabel="s" />);
    expect(getComputedStyle(dot()).backgroundColor).toBe(fill);
  });

  test("the three fills differ from one another", () => {
    const fills = new Set<string>();
    for (const status of ["success", "neutral", "danger"] as const) {
      mount(<Avatar name="X Y" status={status} statusLabel="s" />);
      fills.add(getComputedStyle(dot()).backgroundColor);
      unmount();
    }
    // A status set where two states paint the same colour conveys two states
    // and shows one. Nothing else in this file would notice.
    expect(fills.size).toBe(3);
  });

  test("the dot sits ON the avatar and is not clipped by the frame", () => {
    const { avatar, frame } = mount(<Avatar name="X Y" status="success" statusLabel="Online" />);
    const box = avatar.getBoundingClientRect();
    const mark = dot().getBoundingClientRect();

    // Inside the avatar's box, at the bottom-right, as the sheet draws it.
    expect(mark.right).toBeLessThanOrEqual(box.right + 0.01);
    expect(mark.bottom).toBeLessThanOrEqual(box.bottom + 0.01);
    expect(mark.left).toBeGreaterThan(box.left + box.width / 2);
    expect(mark.top).toBeGreaterThan(box.top + box.height / 2);
    // The reason there are two nodes: the frame clips, so a dot inside it
    // would lose its outer half to the radius.
    expect(getComputedStyle(frame).overflow).toBe("clip");
    expect(dot().parentElement).toBe(avatar);
    expect(getComputedStyle(avatar).overflow).toBe("visible");
  });

  test("the dot scales with the avatar but never below 4px", () => {
    const sizes = (["lg", "md", "sm"] as const).map((size) => {
      mount(<Avatar name="X Y" size={size} status="success" statusLabel="Online" />);
      const w = parseFloat(getComputedStyle(dot()).width);
      unmount();
      return w;
    });
    const [lg, md, sm] = sizes;
    expect(lg).toBeGreaterThan(md!);
    // Deliberately NOT smaller at sm: 3px is a mark nobody can see, and the
    // dot is the only visual carrier of the state.
    expect(sm).toBe(md);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(4);
  });
});

describe("Avatar.Group", () => {
  /**
   * Three avatars as SIBLINGS, which is the documented shape. `max` counts
   * direct children, so a component that returns three of them counts as one
   * — asserted below rather than left to be discovered.
   */
  const three = [
    <Avatar key="a" name="Mira Vance" />,
    <Avatar key="b" name="Peter Roth" />,
    <Avatar key="c" name="Dana Ilic" />,
  ];

  test("children overlap by the sheet's 4px, first one flush", () => {
    const { container: c } = mount(<Avatar.Group>{three}</Avatar.Group>);
    const avatars = [...c.querySelectorAll<HTMLElement>('[data-slot="avatar"]')];
    expect(avatars).toHaveLength(3);

    // Measured as a GAP between painted boxes, not as a margin declaration:
    // `-space-x-*` is the first negative utility in this library and the one
    // thing that proves it compiled is where the second box actually lands.
    const [a, b] = avatars.map((el) => el.getBoundingClientRect());
    expect(b!.left - a!.right).toBeCloseTo(-4, 1);
  });

  test("max hides the rest behind a counter that says how many", () => {
    const { container: c } = mount(
      <Avatar.Group max={2} overflowLabel="1 more person">
        {three}
      </Avatar.Group>,
    );
    expect(c.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);

    const overflow = c.querySelector('[data-slot="avatar-overflow"]')!;
    expect(overflow.textContent).toContain("+1");
    // The glyph is aria-hidden; the sentence is what gets announced.
    expect(overflow.querySelector('[aria-hidden="true"]')!.textContent).toBe("+1");
    expect(overflow.textContent).toContain("1 more person");
  });

  test("a conditional child does not silently consume a slot", () => {
    const show = false;
    const { container: c } = mount(
      <Avatar.Group max={2} overflowLabel="1 more">
        <Avatar name="Mira Vance" />
        {show && <Avatar name="Ghost User" />}
        <Avatar name="Peter Roth" />
        <Avatar name="Dana Ilic" />
      </Avatar.Group>,
    );
    // `{false && …}` is a child. Counting it would show one real avatar and
    // report "+2" for two people while hiding a third.
    expect(c.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
    expect(c.querySelector('[data-slot="avatar-overflow"]')!.textContent).toContain("+1");
  });

  test("no counter when nothing is hidden", () => {
    const { container: c } = mount(
      <Avatar.Group max={5} overflowLabel="never shown">
        {three}
      </Avatar.Group>,
    );
    expect(c.querySelector('[data-slot="avatar-overflow"]')).toBeNull();
    expect(c.textContent).not.toContain("never shown");
  });

  test("the counter is the same tile as an avatar, at the group's size", () => {
    const { container: c } = mount(
      <Avatar.Group max={1} overflowLabel="2 more" size="lg" shape="full">
        <Avatar name="Mira Vance" size="lg" shape="full" />
        <Avatar name="Peter Roth" size="lg" shape="full" />
        <Avatar name="Dana Ilic" size="lg" shape="full" />
      </Avatar.Group>,
    );
    const avatar = c.querySelector<HTMLElement>('[data-slot="avatar-frame"]')!;
    const counter = c.querySelector<HTMLElement>('[data-slot="avatar-overflow"]')!;
    const a = getComputedStyle(avatar);
    const o = getComputedStyle(counter);

    // A RELATIONSHIP, not numbers: the counter sits in the stack, so it has to
    // wear the same tile or it reads as a different kind of object.
    expect(o.width).toBe(a.width);
    expect(o.height).toBe(a.height);
    expect(o.borderRadius).toBe(a.borderRadius);
    expect(o.backgroundColor).toBe(a.backgroundColor);
    expect(o.color).toBe(a.color);
    expect(o.outlineWidth).toBe(a.outlineWidth);
    expect(o.outlineColor).toBe(a.outlineColor);
  });
});
