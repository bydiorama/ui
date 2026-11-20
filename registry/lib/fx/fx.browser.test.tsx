/**
 * The effects layer's CSS, asserted where it is computed (ADR 0022).
 *
 * check:fx holds the stylesheets to EFFECTS on the source. What it cannot
 * see needs a rendered component: whether an effect actually changes the
 * part it claims, whether composing layers keeps a part's own image, whether
 * a layer leaks into a nested component, and whether every effect steps
 * aside — to the pixel the component had without it — for reduced
 * transparency, reduced motion and forced colours.
 */
import { afterEach, describe, expect, test } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { EFFECTS, fx, sweep, type FxName, type FxTarget } from "@/lib/fx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Card } from "@/ui/card/card.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
import { NavRail } from "@/ui/nav-rail/nav-rail.tsx";
import { Popover } from "@/ui/popover/popover.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { Switch } from "@/ui/switch/switch.tsx";

const mounted: Array<{ root: Root; host: HTMLElement }> = [];

function render(ui: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  mounted.push({ root, host });
  return host;
}

/** Media features through the DevTools protocol: the only way a test can be in forced colours. */
async function emulate(features: Array<{ name: string; value: string }>) {
  // vitest types the session as an empty interface; the Playwright provider's is the real one.
  const session = cdp() as unknown as { send(method: string, params: object): Promise<unknown> };
  await session.send("Emulation.setEmulatedMedia", { features });
}

afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  await emulate([]);
});

const q = (c: ParentNode, s: string) => {
  const el = c.querySelector<HTMLElement>(s);
  if (!el) throw new Error(`no ${s}`);
  return el;
};

/**
 * The NEWEST match in the document. Popover and Menu portal their panel to
 * the body, outside the host; a test that renders a plain and an effected
 * copy reads each right after rendering it, so the newest is the one wanted.
 */
const newest = (s: string) => {
  const all = document.querySelectorAll<HTMLElement>(s);
  const el = all[all.length - 1];
  if (!el) throw new Error(`no ${s}`);
  return el;
};

/** Glass and its modifiers are for UNFILLED buttons; light and grain for filled ones. */
const GLASS_FAMILY = new Set<FxName>(["glass", "edge", "inner", "specular"]);

/** Every component a CSS effect can list, rendered in the state the effect needs. */
const FIXTURES: Record<Exclude<FxTarget, "field" | "ground" | "scope">, {
  render: (className: string, effect: FxName) => ReactElement;
  part: (host: HTMLElement) => HTMLElement;
}> = {
  button: {
    render: (className, effect) => (
      <Button variant={GLASS_FAMILY.has(effect) ? "secondary" : "primary"} className={className}>
        Publish
      </Button>
    ),
    part: (h) => q(h, '[data-slot="button"]'),
  },
  card: {
    render: (className) => (
      <Card className={className}>
        <Card.Header subtitle="Grid systems · 1961">Josef Müller-Brockmann</Card.Header>
        <Card.Body>
          <p>Body text on glass.</p>
        </Card.Body>
      </Card>
    ),
    part: (h) => q(h, '[data-slot="card"]'),
  },
  badge: {
    render: (className) => <Badge className={className}>Draft</Badge>,
    part: (h) => q(h, '[data-slot="badge"]'),
  },
  switch: {
    render: (className) => (
      <Switch defaultIsChecked className={className}>
        Sync
      </Switch>
    ),
    part: (h) => q(h, '[data-slot="switch"] [data-slot="track"]'),
  },
  checkbox: {
    render: (className) => (
      <Checkbox defaultIsChecked className={className}>
        Agree
      </Checkbox>
    ),
    part: (h) => q(h, '[data-slot="checkbox"] [data-slot="control"]'),
  },
  slider: {
    render: (className) => <Slider label="Grain amount" defaultValue={50} className={className} />,
    part: (h) => q(h, '[data-slot="slider-fill"]'),
  },
  progress: {
    render: (className) => <Progress label="Uploading" value={50} className={className} />,
    part: (h) => q(h, '[data-slot="fill"]'),
  },
  text: {
    render: (className) => <p className={className}>Generating…</p>,
    part: (h) => q(h, "p"),
  },
  sidebar: {
    render: (className) => (
      <Sidebar label="Primary" className={className}>
        <Sidebar.Item href="/overview" isCurrent>Overview</Sidebar.Item>
        <Sidebar.Item href="/projects">Projects</Sidebar.Item>
      </Sidebar>
    ),
    part: (h) => q(h, '[data-slot="sidebar"]'),
  },
  "nav-rail": {
    render: (className) => (
      <NavRail label="Primary" className={className}>
        <NavRail.Item icon={<svg aria-hidden="true" />} label="Overview" href="/overview" isCurrent />
      </NavRail>
    ),
    part: (h) => q(h, '[data-slot="nav-rail"]'),
  },
  popover: {
    render: (className) => (
      <Popover defaultIsOpen>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Panel className={className}>
          <Popover.Title>Spring identity review</Popover.Title>
          <Popover.Description>Due Friday · 4 reviewers</Popover.Description>
        </Popover.Panel>
      </Popover>
    ),
    part: () => newest('[data-slot="popover-panel"]'),
  },
  menu: {
    render: (className) => (
      <Menu defaultIsOpen>
        <Menu.Trigger render={<Button>More</Button>} />
        <Menu.Panel className={className}>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu.Panel>
      </Menu>
    ),
    part: () => newest('[data-slot="menu-panel"]'),
  },
};

const LOOK = [
  // Tailwind's shadow slots: forced colours forces `box-shadow` to none
  // whatever the cascade says, which masks a step-aside that lost. The
  // slots themselves are not forced, so they say whether it did.
  "--tw-shadow",
  "--tw-ring-shadow",
  "--tw-inset-shadow",
  "background-image",
  "background-color",
  "backdrop-filter",
  "box-shadow",
  "color",
  "-webkit-text-fill-color",
  "border-top-color",
  "animation-name",
];

/** What a part looks like, as far as any effect can change it. */
function look(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const after = getComputedStyle(el, "::after");
  return Object.fromEntries([
    ...LOOK.map((p) => [p, cs.getPropertyValue(p)]),
    ["::after", `${after.content} ${after.backgroundImage} ${after.display}`],
  ]);
}

const CSS_EFFECTS = (Object.keys(EFFECTS) as FxName[]).filter((n) => EFFECTS[n].kind === "css");
// A scope has no part of its own; fx("opaque") is asserted on what it contains, below.
const CASES = CSS_EFFECTS.flatMap((effect) =>
  EFFECTS[effect].on.filter((t) => t !== "scope").map((target) => [effect, target as keyof typeof FIXTURES] as const),
);

describe("every CSS effect changes every component it lists", () => {
  // The per-part half of check:fx: a stylesheet can set a layer on a part
  // the composer in base.css never paints, and only a computed style says so.
  test.each(CASES)("%s on %s", (effect, target) => {
    const fixture = FIXTURES[target];
    // Read each as soon as it renders: a second open Menu can close the first.
    const plain = look(fixture.part(render(fixture.render("", effect))));
    const withFx = look(fixture.part(render(fixture.render(fx(effect), effect))));
    expect(withFx, `fx("${effect}") renders ${target} exactly as without it`).not.toEqual(plain);
  });
});

describe("layers", () => {
  test("composing keeps a part's own image: a Slider fill keeps its gradient under grain and sheen", () => {
    const fill = FIXTURES.slider.part(render(FIXTURES.slider.render(fx("grain", "sheen"), "grain")));
    const image = getComputedStyle(fill).backgroundImage;
    expect(image).toContain("url(");
    expect(image).toMatch(/gradient\([\s\S]*gradient\([\s\S]*gradient\(/);
    // The plain fill's own gradient, which the stack must still end with.
    const own = getComputedStyle(FIXTURES.slider.part(render(FIXTURES.slider.render("", "grain")))).backgroundImage;
    expect(image.endsWith(own), `the fill's own image (${own}) is gone`).toBe(true);
  });

  test("a disabled Slider fill stays flat: its own image is only restated when it has one", () => {
    const host = render(<Slider label="Grain" defaultValue={50} isDisabled className={fx("grain")} />);
    expect(getComputedStyle(q(host, '[data-slot="slider-fill"]')).backgroundImage).not.toContain("gradient(");
  });

  test("a layer does not inherit: a grained Card leaves the Switch inside it untouched", () => {
    const host = render(
      <Card className={fx("grain")}>
        <Card.Body>
          <Switch defaultIsChecked>Sync</Switch>
        </Card.Body>
      </Card>,
    );
    expect(getComputedStyle(q(host, '[data-slot="track"]')).backgroundImage).toBe("none");
  });

  test("the app's unlayered CSS outranks an effect (@layer fx)", () => {
    const style = document.createElement("style");
    style.textContent = ".app-ground { background-color: rgb(1, 2, 3); }";
    document.head.append(style);
    try {
      const card = q(render(FIXTURES.card.render(`${fx("glass")} app-ground`, "glass")), '[data-slot="card"]');
      expect(getComputedStyle(card).backgroundColor).toBe("rgb(1, 2, 3)");
    } finally {
      style.remove();
    }
  });
});

describe("glass", () => {
  /** A token resolved where it would be painted. */
  function resolved(token: string, scope: HTMLElement) {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${token})`;
    scope.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }

  test("paints --ui-bg-glass, the resolver's per-brand tint, over a blurred, saturated backdrop", () => {
    const host = render(FIXTURES.card.render(fx("glass"), "glass"));
    const card = q(host, '[data-slot="card"]');
    expect(getComputedStyle(card).backgroundColor).toBe(resolved("--ui-bg-glass", host));
    expect(getComputedStyle(card).backgroundColor).toMatch(/^rgba\(/);
    expect(getComputedStyle(card).backdropFilter).toBe("blur(24px) saturate(1.6)");
    const button = q(render(FIXTURES.button.render(fx("glass"), "glass")), '[data-slot="button"]');
    expect(getComputedStyle(button).backdropFilter).toBe("blur(12px) saturate(1.6)");
  });

  test("leaves a FILLED Button alone: it would replace the one accent action in the view", () => {
    const plain = q(render(<Button>Publish</Button>), '[data-slot="button"]');
    const glass = q(render(<Button className={fx("glass")}>Publish</Button>), '[data-slot="button"]');
    expect(getComputedStyle(glass).backgroundColor).toBe(getComputedStyle(plain).backgroundColor);
    expect(getComputedStyle(glass).backdropFilter).toBe("none");
  });

  test("the edge replaces the Card's border with a masked gradient, keeping its width", () => {
    const card = q(render(FIXTURES.card.render(fx("edge"), "edge")), '[data-slot="card"]');
    expect(getComputedStyle(card).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(card).borderTopWidth).toBe("1px");
    expect(getComputedStyle(card, "::after").backgroundImage).toContain("linear-gradient(");
  });

  test("the frame tier paints the nav's own glass, the least blur and no top rim", () => {
    for (const target of ["sidebar", "nav-rail"] as const) {
      const host = render(FIXTURES[target].render(fx("glass"), "glass"));
      const part = FIXTURES[target].part(host);
      expect(getComputedStyle(part).backgroundColor, target).toBe(resolved("--ui-nav-bg-glass", host));
      expect(getComputedStyle(part).backdropFilter, target).toBe("blur(12px) saturate(1.6)");
      expect(getComputedStyle(part).getPropertyValue("--tw-inset-shadow"), `${target}: a lit top rim`).not.toMatch(/inset 0(px)? 1px/);
    }
  });

  test("the overlay tier paints the thicker overlay tint, the most blur, lit along the top", () => {
    for (const target of ["popover", "menu"] as const) {
      const host = render(FIXTURES[target].render(fx("glass"), "glass"));
      const part = FIXTURES[target].part(host);
      expect(getComputedStyle(part).backgroundColor, target).toBe(resolved("--ui-bg-glass-overlay", host));
      expect(getComputedStyle(part).backdropFilter, target).toBe("blur(32px) saturate(1.6)");
    }
  });

  /** The alpha of a computed colour: rgba(r, g, b, a), or 1. */
  const alphaOf = (color: string) => Number(color.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1] ?? 1);

  test.each(["light", "dark"])("no tier is thinner than the surface glass (%s)", async (scheme) => {
    await emulate([{ name: "prefers-color-scheme", value: scheme }]);
    expect(matchMedia(`(prefers-color-scheme: ${scheme})`).matches, "emulation did not take").toBe(true);
    const floor = alphaOf(resolved("--ui-bg-glass", document.body));
    expect(floor).toBeLessThan(1);
    for (const target of EFFECTS.glass.on) {
      const fixture = FIXTURES[target as keyof typeof FIXTURES];
      const alpha = alphaOf(getComputedStyle(fixture.part(render(fixture.render(fx("glass"), "glass")))).backgroundColor);
      expect(alpha, `${target} glass in ${scheme}`).toBeGreaterThanOrEqual(floor);
    }
  });

  test.each(EFFECTS.glass.on)("reduced transparency hands a %s back its own opaque fill and no blur", async (target) => {
    await emulate([{ name: "prefers-reduced-transparency", value: "reduce" }]);
    expect(matchMedia("(prefers-reduced-transparency: reduce)").matches, "emulation did not take").toBe(true);
    const fixture = FIXTURES[target];
    const plain = fixture.part(render(fixture.render("", "glass")));
    const glass = fixture.part(render(fixture.render(fx("glass", "edge", "inner", "specular"), "glass")));
    expect(getComputedStyle(glass).backgroundColor).toBe(getComputedStyle(plain).backgroundColor);
    expect(getComputedStyle(glass).backdropFilter).toBe("none");
  });
});

describe("fx(\"opaque\")", () => {
  test.each(EFFECTS.glass.on)("inside the scope, a glass %s gets its own fill back and no blur, and keeps its edge light", (target) => {
    const fixture = FIXTURES[target as keyof typeof FIXTURES];
    // Each read as soon as it renders: a second open Menu can close the first.
    const plainFill = getComputedStyle(fixture.part(render(fixture.render("", "glass")))).backgroundColor;
    const glassLight = getComputedStyle(fixture.part(render(fixture.render(fx("glass"), "glass")))).getPropertyValue("--tw-inset-shadow");
    // Popover and Menu portal OUT of an app region, so the scope goes on the
    // panel itself; the rest are rendered inside a scoped region.
    const portalled = target === "popover" || target === "menu";
    const scoped = getComputedStyle(
      portalled
        ? fixture.part(render(fixture.render(fx("glass", "opaque"), "glass")))
        : fixture.part(render(<section className={fx("opaque")}>{fixture.render(fx("glass"), "glass")}</section>)),
    );
    expect(scoped.backgroundColor, `${target}: fill`).toBe(plainFill);
    expect(scoped.backdropFilter, `${target}: blur`).toBe("none");
    expect(scoped.getPropertyValue("--tw-inset-shadow"), `${target}: the edge light went with the glass`).toBe(glassLight);
  });

  test("a ghost Button's hover inside the scope is the component's own hover again", async () => {
    /** The settled fill under the pointer: the button transitions its background. */
    const hovered = async (el: HTMLElement) => {
      await userEvent.hover(el);
      await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
      const fill = getComputedStyle(el).backgroundColor;
      await userEvent.unhover(el);
      return fill;
    };
    const plain = await hovered(q(render(<Button variant="ghost">More</Button>), '[data-slot="button"]'));
    const host = render(
      <section className={fx("opaque")}>
        <Button variant="ghost" className={fx("glass")}>More</Button>
      </section>,
    );
    expect(await hovered(q(host, '[data-slot="button"]'))).toBe(plain);
  });

  test("outside the scope, glass is untouched", () => {
    const host = render(
      <div>
        <section className={fx("opaque")} />
        {FIXTURES.card.render(fx("glass"), "glass")}
      </div>,
    );
    expect(getComputedStyle(q(host, '[data-slot="card"]')).backdropFilter).toBe("blur(24px) saturate(1.6)");
  });
});

describe("stepping aside", () => {
  test("forced colours: every CSS effect leaves its part as the component draws it", async () => {
    await emulate([{ name: "forced-colors", value: "active" }]);
    expect(matchMedia("(forced-colors: active)").matches, "emulation did not take").toBe(true);
    for (const [effect, target] of CASES) {
      const fixture = FIXTURES[target];
      const plain = look(fixture.part(render(fixture.render("", effect))));
      const withFx = look(fixture.part(render(fixture.render(fx(effect), effect))));
      for (const prop of ["--tw-shadow", "--tw-ring-shadow", "--tw-inset-shadow", "background-image", "backdrop-filter", "box-shadow", "-webkit-text-fill-color", "animation-name"]) {
        expect(withFx[prop], `fx("${effect}") on ${target}: ${prop} in forced colours`).toBe(plain[prop]);
      }
      expect(withFx["::after"], `fx("${effect}") on ${target}: ::after in forced colours`).toBe(plain["::after"]);
    }
  });

  test("reduced motion: no ambient animation runs, and sweep() starts none", async () => {
    await emulate([{ name: "prefers-reduced-motion", value: "reduce" }]);
    expect(matchMedia("(prefers-reduced-motion: reduce)").matches, "emulation did not take").toBe(true);
    const host = render(
      <div>
        <p className={fx("shimmer")}>Generating…</p>
        <h2 className={fx("ink")}>Asymmetric typography</h2>
        <Button className={fx("sheen")}>Publish</Button>
      </div>,
    );
    expect(getComputedStyle(q(host, "p")).animationName).toBe("none");
    expect(getComputedStyle(q(host, "h2")).animationName).toBe("none");
    const button = q(host, '[data-slot="button"]');
    sweep(button);
    expect(button.hasAttribute("data-fx-sweep")).toBe(false);
    expect(getComputedStyle(button).animationName).toBe("none");
  });
});

describe("motion", () => {
  test("shimmer and ink run on the loop token when motion is allowed", () => {
    const host = render(
      <div>
        <p className={fx("shimmer")}>Generating…</p>
        <h2 className={fx("ink")}>Asymmetric typography</h2>
      </div>,
    );
    expect(getComputedStyle(q(host, "p")).animationName).toBe("ui-fx-shimmer");
    expect(getComputedStyle(q(host, "h2")).animationName).toBe("ui-fx-ink-turn");
  });

  test("sweep() plays one pass of light and clears itself", async () => {
    const button = q(render(<Button className={fx("sheen")}>Publish</Button>), '[data-slot="button"]');
    const ended = new Promise<void>((resolve) => button.addEventListener("animationend", () => resolve(), { once: true }));
    sweep(button);
    expect(button.hasAttribute("data-fx-sweep")).toBe(true);
    expect(getComputedStyle(button).animationName).toBe("ui-fx-sweep");
    await ended;
    await new Promise((r) => setTimeout(r, 0));
    expect(button.hasAttribute("data-fx-sweep")).toBe(false);
  });
});
