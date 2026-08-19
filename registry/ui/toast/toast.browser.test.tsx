import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useEffect } from "react";
import type { ReactElement } from "react";

import { Button } from "../button/button.tsx";
import { Toast, useToast, type ToastManager, type ToastOptions } from "./toast.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Everything is portalled, so nothing is inside the mount container. */
const viewport = () => document.querySelector<HTMLElement>('[data-slot="toast-viewport"]')!;
const toasts = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="toast"]'));
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

function Grab({ onManager }: { onManager: (manager: ToastManager) => void }) {
  const manager = useToast();
  useEffect(() => {
    onManager(manager);
  }, [manager, onManager]);
  return null;
}

let manager: ToastManager;

function Harness(props: { viewportClassName?: string; children?: ReactElement }) {
  return (
    // timeout 0: a specimen that dismisses itself mid-assertion is flake.
    <Toast.Provider timeout={0}>
      <Grab
        onManager={(m) => {
          manager = m;
        }}
      />
      {props.children}
      <Toast.Viewport
        label="Notifications"
        dismissLabel="Dismiss"
        {...(props.viewportClassName ? { className: props.viewportClassName } : {})}
      />
    </Toast.Provider>
  );
}

function add(options: ToastOptions): string {
  let id = "";
  act(() => {
    id = manager.add(options);
  });
  return id;
}

const SUCCESS: ToastOptions = {
  type: "success",
  title: "Brand kit exported",
  description: "Grid systems — Josef Müller-Brockmann, 1961",
};

describe("anatomy — the sheet's values, computed", () => {
  test("title and description render the sheet's type", async () => {
    mount(<Harness />);
    add(SUCCESS);
    await settled(toasts()[0]!);

    // 16px is the assertion that tells body-lg apart from the fluid title-sm,
    // which computes BELOW 16 in a fixed-width surface (the title-role trap).
    const title = getComputedStyle(slot("toast-title")!);
    expect(title.fontSize).toBe("16px");
    expect(title.fontWeight).toBe("600");

    const description = getComputedStyle(slot("toast-description")!);
    expect(description.fontSize).toBe("13px");
    expect(description.fontWeight).toBe("500");
  });

  test("surface and content lay out the sheet's geometry", async () => {
    mount(<Harness />);
    add(SUCCESS);
    const el = toasts()[0]!;
    await settled(el);

    const cs = getComputedStyle(el);
    expect(cs.borderRadius).toBe("16px");
    expect(cs.borderTopWidth).toBe("1px");

    const content = getComputedStyle(slot("toast-content")!);
    expect(content.padding).toBe("16px");
    expect(content.columnGap).toBe("12px");

    // The sheet's 416 column — dialog-width-md — capped to the window minus
    // space-lg each side, which is what a narrow test window exercises.
    expect(viewport().getBoundingClientRect().width).toBe(Math.min(416, window.innerWidth - 32));
  });

  test("the intent glyph is a 16px icon in its own slot; the default type has none", async () => {
    mount(<Harness />);
    add(SUCCESS);
    await settled(toasts()[0]!);
    const svg = slot("toast-icon")!.querySelector("svg")!;
    expect(getComputedStyle(svg).width).toBe("16px");
    expect(getComputedStyle(svg).height).toBe("16px");

    add({ title: "Draft saved" });
    await expect.poll(() => toasts().length).toBe(2);
    const plain = toasts().find((t) => t.textContent?.includes("Draft saved"))!;
    expect(plain.querySelector('[data-slot="toast-icon"]')).toBeNull();
  });

  test("loading renders the guarded spinner in muted ink", async () => {
    mount(<Harness />);
    add({ type: "loading", title: "Exporting brand kit…" });
    await settled(toasts()[0]!);
    const spinner = slot("toast-spinner")!;
    const spin = spinner.getAnimations().find((a) => (a as CSSAnimation).animationName === "spin");
    expect(spin).toBeDefined();
    // The slot's ink is the description's ink — one muted role, not two greys.
    add(SUCCESS);
    await expect.poll(() => slot("toast-description")).not.toBeNull();
    expect(getComputedStyle(spinner.parentElement!).color).toBe(
      getComputedStyle(slot("toast-description")!).color,
    );
  });
});

describe("motion — the split transition survives to computed style", () => {
  test("longhand per-property timings are not clobbered", async () => {
    mount(<Harness />);
    add(SUCCESS);
    const el = toasts()[0]!;
    // Deliberately BEFORE settled(): the declaration is what is asserted.
    const cs = getComputedStyle(el);
    expect(cs.transitionProperty).toBe("translate, scale, opacity, height");
    expect(cs.transitionDuration).toBe("0.4s, 0.4s, 0.32s, 0.12s");
    expect(cs.transitionTimingFunction).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
    // And the declaration has an effect: entering, something is animating.
    expect(el.getAnimations().length).toBeGreaterThan(0);
  });
});

describe("controls", () => {
  test("close carries its accessible name and the 24px floor, and dismisses", async () => {
    mount(<Harness />);
    add(SUCCESS);
    const el = toasts()[0]!;
    await settled(el);

    const close = slot("toast-close")!;
    expect(close.getAttribute("aria-label")).toBe("Dismiss");
    const rect = close.getBoundingClientRect();
    // size-6 = 24px exactly — the SC 2.5.8 floor, Banner's dismiss recipe.
    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);

    await userEvent.click(close);
    await expect.poll(() => toasts().length, { timeout: 3000 }).toBe(0);
  });

  test("the action fires, then dismisses the toast itself", async () => {
    const onClick = vi.fn();
    mount(<Harness />);
    add({ ...SUCCESS, action: { label: "Undo", onClick } });
    await settled(toasts()[0]!);

    await userEvent.click(slot("toast-action")!);
    expect(onClick).toHaveBeenCalledTimes(1);
    await expect.poll(() => toasts().length, { timeout: 3000 }).toBe(0);
  });

  test("the action IS Button secondary md — the relationship, not the numbers", async () => {
    mount(
      <Harness>
        <Button variant="secondary" size="md" data-slot="reference-button">
          Undo
        </Button>
      </Harness>,
    );
    add({ ...SUCCESS, action: { label: "Undo", onClick: vi.fn() } });
    await settled(toasts()[0]!);

    const action = getComputedStyle(slot("toast-action")!);
    const reference = getComputedStyle(slot("reference-button")!);
    expect(action.height).toBe(reference.height);
    expect(action.borderRadius).toBe(reference.borderRadius);
    expect(action.boxShadow).toBe(reference.boxShadow);
    expect(action.fontSize).toBe(reference.fontSize);
  });
});

describe("the stack", () => {
  const THREE: ToastOptions[] = [
    {
      title: "Draft saved",
      description:
        "A deliberately longer description that wraps onto several lines, so this toast's natural height differs from its neighbours' and the expanded stack has something to prove.",
    },
    { type: "danger", title: "Export failed", description: "Movable type — Johannes Gutenberg, 1440" },
    SUCCESS,
  ];

  test("collapsed, every toast is clamped to the frontmost height and behind content is hidden", async () => {
    mount(<Harness />);
    for (const t of THREE) add(t);
    await expect.poll(() => toasts().length).toBe(3);
    for (const el of toasts()) await settled(el);

    const heights = toasts().map((el) => el.getBoundingClientRect().height);
    // getBoundingClientRect includes the scale transform; compare the USED
    // height instead, which is what the clamp sets.
    const used = toasts().map((el) => getComputedStyle(el).height);
    expect(new Set(used).size).toBe(1);
    expect(heights.length).toBe(3);

    const contents = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="toast-content"]'),
    );
    const opacities = contents.map((c) => getComputedStyle(c).opacity);
    expect(opacities.filter((o) => o === "0").length).toBe(2);
    expect(opacities.filter((o) => o === "1").length).toBe(1);
  });

  test("hovering the viewport expands the stack to full heights", async () => {
    mount(<Harness />);
    for (const t of THREE) add(t);
    await expect.poll(() => toasts().length).toBe(3);
    for (const el of toasts()) await settled(el);

    await userEvent.hover(toasts()[0]!);
    await expect.poll(() => toasts().every((el) => el.hasAttribute("data-expanded"))).toBe(true);
    for (const el of toasts()) await settled(el);
    const used = toasts().map((el) => getComputedStyle(el).height);
    // Three different descriptions wrap differently — expanded heights differ.
    expect(new Set(used).size).toBeGreaterThan(1);
  });
});

describe("the viewport", () => {
  test("is a named landmark, and className forwards to it", () => {
    mount(<Harness viewportClassName="testing-forwarded-class" />);
    expect(viewport().getAttribute("aria-label")).toBe("Notifications");
    expect(viewport().classList.contains("testing-forwarded-class")).toBe(true);
  });

  test("F6 moves focus into the region; Escape closes the focused toast", async () => {
    mount(<Harness />);
    add(SUCCESS);
    await settled(toasts()[0]!);

    await userEvent.keyboard("{F6}");
    await expect
      .poll(() => viewport().contains(document.activeElement) || document.activeElement === viewport())
      .toBe(true);

    // Escape closes the FOCUSED toast, so walk into it first.
    await userEvent.tab();
    await expect.poll(() => toasts()[0]?.contains(document.activeElement) ?? false).toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => toasts().length, { timeout: 3000 }).toBe(0);
  });
});

describe("review evidence — the layers where bugs hide", () => {
  test("the action label renders exactly once (render-prop merge, not duplication)", async () => {
    mount(<Harness />);
    add({ ...SUCCESS, action: { label: "Undo", onClick: vi.fn() } });
    await settled(toasts()[0]!);
    expect(slot("toast-action")!.textContent).toBe("Undo");
  });

  test("the close button paints a real focus ring when tabbed to", async () => {
    mount(<Harness />);
    add(SUCCESS);
    await settled(toasts()[0]!);

    // Real Tab presses — :focus-visible does not reliably match programmatic
    // focus, and a fixed Tab count asserts whatever is Nth. Walk until the
    // close button holds focus.
    const close = slot("toast-close")!;
    for (let i = 0; i < 10 && document.activeElement !== close; i += 1) {
      await userEvent.keyboard("{Tab}");
    }
    expect(document.activeElement).toBe(close);
    const cs = getComputedStyle(close);
    expect(cs.outlineStyle).toBe("solid");
    expect(cs.outlineWidth).toBe("2px");
  });

  test("the stack's per-index math computes — scale and z actually resolve", async () => {
    mount(<Harness />);
    add({ title: "Draft saved" });
    add(SUCCESS);
    await expect.poll(() => toasts().length).toBe(2);
    for (const el of toasts()) await settled(el);

    // Two toasts, two indices: the front computes scale 1, the one behind
    // 0.95. Asserted as a DIFFERENCE plus one exact value, so a var that
    // fails to resolve (utility compiled wrong, Base UI var missing) cannot
    // pass — an invalid calc() computes to `none` for scale.
    const scales = toasts().map((el) => getComputedStyle(el).scale);
    expect(new Set(scales).size).toBe(2);
    expect(scales).toContain("1");
    expect(scales).toContain("0.95");

    const zs = toasts().map((el) => getComputedStyle(el).zIndex);
    expect(new Set(zs).size).toBe(2);

    // The hover bridge over the expanded gap exists and spans it.
    const after = getComputedStyle(toasts()[0]!, "::after");
    expect(after.height).toBe("13px"); // --gap (12) + 1
  });

  test("a brand scope reaches the toast through `container` — the portal-theme relationship", async () => {
    // Theme tokens are inherited custom properties; a portal to document.body
    // leaves the scope. Assert the RELATIONSHIP: the same toast paints
    // differently inside a re-scoped container than in theme zero.
    const scope = document.createElement("div");
    scope.style.setProperty("--ui-bg-elevated", "rgb(1, 2, 3)");
    document.body.appendChild(scope);
    try {
      mount(
        <Toast.Provider timeout={0}>
          <Grab
            onManager={(m) => {
              manager = m;
            }}
          />
          <Toast.Viewport label="Notifications" dismissLabel="Dismiss" container={scope} />
        </Toast.Provider>,
      );
      add(SUCCESS);
      await settled(toasts()[0]!);
      expect(getComputedStyle(toasts()[0]!).backgroundColor).toBe("rgb(1, 2, 3)");
    } finally {
      scope.remove();
    }
  });
});

describe("promise()", () => {
  test("a rejected promise lands on the danger rendering", async () => {
    mount(<Harness />);
    let reject!: (reason: unknown) => void;
    const work = new Promise<string>((_, r) => {
      reject = r;
    });
    let settledPromise: Promise<unknown>;
    act(() => {
      settledPromise = manager
        .promise(work, {
          loading: "Exporting brand kit…",
          success: "Brand kit exported",
          error: { title: "Export failed", description: "Movable type — Johannes Gutenberg, 1440" },
        })
        .catch(() => undefined);
    });

    await expect.poll(() => slot("toast-spinner")).not.toBeNull();
    act(() => reject(new Error("boom")));
    await settledPromise!;

    // Base UI stamps `error`; the renderer treats it as this library's danger.
    await expect.poll(() => toasts()[0]?.getAttribute("data-type")).toBe("error");
    await expect.poll(() => slot("toast-spinner")).toBeNull();
    const icon = slot("toast-icon");
    expect(icon).not.toBeNull();
    // The glyph carries the intent ink, not the text's.
    expect(getComputedStyle(icon!).color).not.toBe(
      getComputedStyle(slot("toast-description")!).color,
    );
  });
});
