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
import { cdp } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { EFFECTS, fx, sweep, type FxName, type FxTarget } from "@/lib/fx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Card } from "@/ui/card/card.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
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

/** Glass and its modifiers are for UNFILLED buttons; light and grain for filled ones. */
const GLASS_FAMILY = new Set<FxName>(["glass", "edge", "inner", "specular"]);

/** Every component a CSS effect can list, rendered in the state the effect needs. */
const FIXTURES: Record<Exclude<FxTarget, "field" | "ground">, {
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
const CASES = CSS_EFFECTS.flatMap((effect) =>
  EFFECTS[effect].on.map((target) => [effect, target as keyof typeof FIXTURES] as const),
);

describe("every CSS effect changes every component it lists", () => {
  // The per-part half of check:fx: a stylesheet can set a layer on a part
  // the composer in base.css never paints, and only a computed style says so.
  test.each(CASES)("%s on %s", (effect, target) => {
    const fixture = FIXTURES[target];
    const plain = fixture.part(render(fixture.render("", effect)));
    const withFx = fixture.part(render(fixture.render(fx(effect), effect)));
    expect(look(withFx), `fx("${effect}") renders ${target} exactly as without it`).not.toEqual(look(plain));
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
