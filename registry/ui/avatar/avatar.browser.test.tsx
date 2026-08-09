import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { CSSProperties, ReactElement } from "react";

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
   * A lone avatar wears NO edge, and that is the fix rather than an omission.
   *
   * It used to carry a full-perimeter hairline in the page's colour — which is
   * what shadcn, MUI, Atlassian and Flowbite all ship, and what all of them
   * have filed against them (MUI #21700). Three of that ring's four sides
   * never touch another avatar: they sit on the ground claiming to BE the
   * ground, and are wrong the moment the avatar is on a card. Separating two
   * overlapping avatars is the GROUP's job, and it does it on one edge.
   */
  test("a lone avatar has no ring at all — there is nothing behind it", () => {
    const { frame, avatar } = mount(<Avatar name="X Y" />);
    for (const part of [avatar, frame]) {
      const style = getComputedStyle(part);
      // `none` OR zero width — either way nothing paints. Asserted both ways
      // because an outline with a colour and no style is the failure mode that
      // shipped once already (Button's focus ring).
      expect(style.outlineStyle === "none" || style.outlineWidth === "0px").toBe(true);
      expect(style.boxShadow).toBe("none");
    }
  });
});

/**
 * The seam: painted on ONE edge, only inside a group, and only where it lands
 * on another avatar.
 *
 * The version this replaced put a full-perimeter ring in `bg-surface` on every
 * avatar — the industry-standard implementation, and the industry-standard bug
 * with it (MUI #21700, and the same code in shadcn, Atlassian and Flowbite).
 * Three of that ring's four sides sit on the ground claiming to BE it, which
 * is a visible mismatched rim on a card (#FDFCFB on #F6F3F0) and pure
 * liability on a lone avatar, where there is nothing behind it at all.
 *
 * Primer's insight is the fix: paint the seam only where it does work. Here it
 * is the LEADING edge — the one that lands on top of the avatar beneath it —
 * which under DOM-order stacking needs no z-index inversion, unlike Primer's
 * trailing border.
 */
describe("the seam is painted where it does work, and nowhere else", () => {
  function group(style?: CSSProperties) {
    return mount(
      <div style={style}>
        <Avatar.Group max={2} overflowLabel="1 more person">
          <Avatar name="Mira Vance" status="success" statusLabel="Online" />
          <Avatar name="Peter Roth" />
          <Avatar name="Dana Ilic" />
        </Avatar.Group>
      </div>,
    );
  }

  test("the first child carries no seam; every other child does", () => {
    const { container: c } = group();
    const stacked = [
      ...c.querySelectorAll<HTMLElement>('[data-slot="avatar"]'),
      c.querySelector<HTMLElement>('[data-slot="avatar-overflow"]')!,
    ];
    expect(stacked).toHaveLength(3);

    // Nothing to separate from on the left of the first one.
    expect(getComputedStyle(stacked[0]!).boxShadow).toBe("none");
    for (const part of stacked.slice(1)) {
      const shadow = getComputedStyle(part).boxShadow;
      expect(shadow, "a stacked child needs a leading seam").not.toBe("none");
      // Offset toward the LEADING edge and nowhere else: no blur, no spread,
      // so it is a copy of the shape rather than a glow. A positive x here
      // would put the seam on the ground instead of on the avatar beneath.
      expect(shadow).toContain("-1.5px 0px 0px 0px");
      // The surface by default, from the var()'s fallback.
      expect(shadow).toContain("rgb(253, 252, 251)");
    }
  });

  test("the seam sits INSIDE the overlap, so it never reaches the ground", () => {
    const { container: c } = group();
    const [first, second] = [...c.querySelectorAll<HTMLElement>('[data-slot="avatar"]')];
    const a = first!.getBoundingClientRect();
    const b = second!.getBoundingClientRect();
    // Overlap is 4px and the seam extends 1.5px back from the leading edge —
    // the whole seam is over the avatar beneath. This is the property that
    // makes the ground irrelevant, so it is asserted as a relationship rather
    // than left to the two constants agreeing by luck.
    const overlap = a.right - b.left;
    expect(overlap).toBeCloseTo(4, 1);
    expect(overlap).toBeGreaterThan(1.5);
  });

  test("a container rebinds one value and the seam follows", () => {
    const { container: c } = group({ "--ui-avatar-ring-color": "var(--ui-bg-elevated)" } as CSSProperties);
    const second = [...c.querySelectorAll<HTMLElement>('[data-slot="avatar"]')][1]!;
    // The same escape hatch every library lands on — it now governs a 1.5px
    // sliver rather than every avatar's whole perimeter.
    expect(getComputedStyle(second).boxShadow).toContain("rgb(246, 243, 240)");
  });

  test("the status dot keeps an opaque ring — a cut-out there would show the photo", () => {
    const { container: c } = mount(
      <Avatar name="Mira Vance" src="/photo.jpg" status="success" statusLabel="Online" />,
    );
    const dot = c.querySelector<HTMLElement>('[data-slot="avatar-status"]')!;
    const style = getComputedStyle(dot);
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineColor).toBe("rgb(253, 252, 251)");
    // OUTSET, unlike the old frame ring: it separates the mark from the image
    // underneath it, and most of it is painted over that image rather than
    // over the ground.
    expect(style.outlineOffset).toBe("0px");
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
    // And the seam, from the same container rule — the counter is a child like
    // any other, so it gets one for being second and the avatar gets none for
    // being first. The previous version of this compared two `outline-width`s
    // that both became `0px` and passed vacuously.
    expect(getComputedStyle(counter).boxShadow).not.toBe("none");
    expect(getComputedStyle(c.querySelector<HTMLElement>('[data-slot="avatar"]')!).boxShadow).toBe("none");
  });
});
