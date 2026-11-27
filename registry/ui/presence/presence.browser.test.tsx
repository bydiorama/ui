/**
 * Presence, measured in Chromium: what arrives plays an entrance from the
 * tokens, what leaves stays until its exit has run, and the motion levels
 * reach both. Every motion assertion goes through `getAnimations()` and the
 * transitions' own keyframes — a declared transition and a running one read
 * the same in `getComputedStyle` (ADR 0018).
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef, useState, type ReactElement } from "react";

import { Presence, type PresenceKind } from "./presence.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}
function rerender(ui: ReactElement) {
  act(() => root!.render(ui));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = container = null;
  document.documentElement.removeAttribute("data-ui-motion");
});

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(n);
  });

function tokenMs(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}

const items = () => [...container!.querySelectorAll<HTMLElement>("li")];
const item = (id: string) => container!.querySelector<HTMLElement>(`li[data-id="${id}"]`);

/** A list rendered through Presence, keyed by id. */
function List({ ids, kind = "fade", appear }: { ids: string[]; kind?: PresenceKind; appear?: boolean }) {
  return (
    <ul>
      <Presence kind={kind} appear={appear}>
        {ids.map((id) => (
          <li key={id} data-id={id} className="py-sm">
            {id}
          </li>
        ))}
      </Presence>
    </ul>
  );
}

/** Each running transition's property and the value it starts FROM. */
function starts(el: Element) {
  return new Map(
    el.getAnimations().map((a) => {
      const property = (a as CSSTransition).transitionProperty;
      const [from] = (a.effect as KeyframeEffect).getKeyframes();
      return [property, { from: String((from as Record<string, unknown>)[property]), timing: a.effect!.getTiming() }];
    }),
  );
}

/**
 * The transitions an item starts, captured at `transitionrun` — the moment the
 * browser creates each one. A 1ms transition at Off is over before any frame
 * a test could wait for, so reading afterwards would find nothing on working
 * code.
 */
async function startsAsTheyRun(target: () => Element | null) {
  const seen = new Map<string, { from: string; timing: EffectTiming }>();
  const capture = (event: Event) => {
    const el = target();
    if (el && event.target === el) for (const [k, v] of starts(el)) seen.set(k, v);
  };
  document.addEventListener("transitionrun", capture, true);
  await frames(3);
  document.removeEventListener("transitionrun", capture, true);
  return seen;
}

/**
 * A frame for the list to be ON SCREEN before it changes. A transition needs
 * a previously computed style to start from: mounting and removing in one task
 * gives the browser nothing to transition from, which no real page does.
 */
const shown = () => frames(2);

async function settled(el: Element) {
  await frames(1);
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

describe("what is already there does not perform", () => {
  test("items present on the first render are present, with nothing running", async () => {
    mount(<List ids={["a", "b"]} />);
    await frames();
    for (const li of items()) {
      expect(li.dataset.presence).toBe("present");
      expect(li.getAnimations()).toHaveLength(0);
    }
  });

  test("appear plays the entrance on the first render too", async () => {
    mount(<List ids={["a"]} appear />);
    await frames(1);
    expect(item("a")!.dataset.presence).toBe("entering");
    expect(starts(item("a")!).get("opacity")?.from).toBe("0");
  });
});

describe("arriving", () => {
  test("a new item fades in from 0 over --ui-duration-base, then is present", async () => {
    mount(<List ids={["a"]} />);
    await shown();
    rerender(<List ids={["a", "b"]} />);
    await frames(1);
    const b = item("b")!;
    expect(b.dataset.presence).toBe("entering");
    const opacity = starts(b).get("opacity");
    expect(opacity?.from).toBe("0");
    expect(opacity?.timing.duration).toBe(tokenMs("--ui-duration-base"));
    await settled(b);
    await frames();
    expect(b.dataset.presence).toBe("present");
  });

  test("rise lands from --ui-space-xs below at full, and only fades at reduced", async () => {
    mount(<List ids={["a"]} kind="rise" />);
    await shown();
    rerender(<List ids={["a", "b"]} kind="rise" />);
    await frames(1);
    expect(starts(item("b")!).get("translate")?.from).toMatch(/^0px 4px$/);

    act(() => root!.unmount());
    container!.remove();
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(<List ids={["a"]} kind="rise" />);
    await shown();
    rerender(<List ids={["a", "b"]} kind="rise" />);
    await frames(1);
    const reduced = starts(item("b")!);
    expect(reduced.get("translate")?.from ?? "none").toMatch(/^(none|0px( 0px)?)$/);
    expect(reduced.get("opacity")?.from).toBe("0");
  });

  test("collapse opens the item's height from 0 to its own, then lets go of it", async () => {
    mount(<List ids={["a"]} kind="collapse" />);
    await shown();
    rerender(<List ids={["a", "b"]} kind="collapse" />);
    const heights = await startsAsTheyRun(() => item("b"));
    const b = item("b")!;
    expect(heights.get("height")?.from).toBe("0px");
    await settled(b);
    await frames();
    expect(b.style.height).toBe("");
    // The RELATIONSHIP, not a number: it settles at a sibling's own height.
    expect(b.getBoundingClientRect().height).toBe(item("a")!.getBoundingClientRect().height);
  });
});

/**
 * Rows built the way a real list builds them: the padding and the divider are
 * ON the item, which is exactly what a height transition alone cannot fold —
 * with border-box sizing, height 0 stops at padding + border.
 */
function Rows({ ids }: { ids: string[] }) {
  return (
    <ul>
      <Presence kind="collapse">
        {ids.map((id) => (
          <li key={id} data-id={id} className="flex items-center border-b border-black px-md py-sm">
            <span className="block h-8">{id}</span>
          </li>
        ))}
      </Presence>
    </ul>
  );
}

describe("collapse folds the whole box", () => {
  test("a padded, bordered row closes all the way: its padding and border fold with its height", async () => {
    mount(<Rows ids={["a", "b", "c"]} />);
    await shown();
    const b = item("b")!;
    let atEnd = -1;
    b.addEventListener("transitionend", (event) => {
      if (event.propertyName === "height") atEnd = b.getBoundingClientRect().height;
    });
    rerender(<Rows ids={["a", "c"]} />);
    await vi.waitFor(() => expect(atEnd).toBeGreaterThanOrEqual(0), { timeout: 2000 });
    // Measured before the fix: 17px — the row sat at its padding and border,
    // invisible, then vanished in one jump.
    expect(atEnd).toBeLessThanOrEqual(0.5);
  });

  test("a padded row arrives at its full height, so nothing jumps when the transition lets go", async () => {
    mount(<Rows ids={["a"]} />);
    await shown();
    const rest = item("a")!.getBoundingClientRect().height;
    rerender(<Rows ids={["a", "b"]} />);
    let to = "";
    const capture = (event: TransitionEvent) => {
      const b = item("b");
      if (!b || event.target !== b || event.propertyName !== "height") return;
      const run = b.getAnimations().find((a) => (a as CSSTransition).transitionProperty === "height")!;
      to = String(((run.effect as KeyframeEffect).getKeyframes().at(-1) as Record<string, unknown>).height);
    };
    document.addEventListener("transitionrun", capture, true);
    await frames(3);
    document.removeEventListener("transitionrun", capture, true);
    // Measured before the fix: it ran to the height of the SQUEEZED box and
    // then snapped the rest of the way.
    expect(Number.parseFloat(to)).toBeCloseTo(rest, 0);
  });

  test("on arrival the room opens first: the fold starts at once, the fade half a fast step later", async () => {
    mount(<Rows ids={["a"]} />);
    await shown();
    rerender(<Rows ids={["a", "b"]} />);
    const seen = await startsAsTheyRun(() => item("b"));
    expect(seen.get("height")?.timing.delay).toBe(0);
    expect(seen.get("opacity")?.timing.delay).toBe(tokenMs("--ui-duration-fast") / 2);
  });
});

describe("leaving", () => {
  test("a removed item stays, inert and hidden, in its place until its exit has run", async () => {
    mount(<List ids={["a", "b", "c"]} />);
    await shown();
    rerender(<List ids={["a", "c"]} />);
    await frames(1);
    const b = item("b")!;
    expect(b).not.toBeNull();
    expect(items().map((li) => li.dataset.id)).toEqual(["a", "b", "c"]);
    expect(b.dataset.presence).toBe("leaving");
    expect(b.inert).toBe(true);
    expect(b.getAttribute("aria-hidden")).toBe("true");
    const opacity = starts(b).get("opacity");
    expect(opacity?.from).toBe("1");
    expect(opacity?.timing.duration).toBe(tokenMs("--ui-duration-fast"));
    await settled(b);
    await frames(3);
    expect(item("b")).toBeNull();
  });

  test("added back mid-exit, it turns around and stays", async () => {
    mount(<List ids={["a", "b"]} />);
    await shown();
    rerender(<List ids={["a"]} />);
    await frames(1);
    rerender(<List ids={["a", "b"]} />);
    await frames(1);
    const b = item("b")!;
    expect(b.dataset.presence).toBe("present");
    expect(b.inert).toBe(false);
    await settled(b);
    await frames(3);
    expect(item("b")).not.toBeNull();
  });

  test("collapse's fade and fold start together: fade on fast, fold on base, neither delayed", async () => {
    // One gesture, one motion. The fold used to wait for the fade, so the row
    // vanished and only THEN did the list respond — read as lag.
    mount(<List ids={["a", "b"]} kind="collapse" />);
    await shown();
    rerender(<List ids={["a"]} kind="collapse" />);
    await frames(1);
    const map = starts(item("b")!);
    expect(map.get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-fast"));
    expect(map.get("opacity")?.timing.delay).toBe(0);
    expect(map.get("height")?.timing.duration).toBe(tokenMs("--ui-duration-base"));
    expect(map.get("height")?.timing.delay).toBe(0);
  });

  test("at Off the exit is 1ms, and removal still waits for it rather than happening at once", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(<List ids={["a", "b"]} />);
    await shown();
    rerender(<List ids={["a"]} />);
    // Same task as the removal: still rendered, so a same-frame reversal works.
    const b = item("b")!;
    expect(b).not.toBeNull();
    expect(getComputedStyle(b).transitionDuration).toBe("0.001s");
    // A 1ms transition is over before even its own transitionrun is delivered,
    // so the event's property name is the evidence that it ran at all.
    const ran: string[] = [];
    const onRun = (event: TransitionEvent) => event.target === b && ran.push(event.propertyName);
    document.addEventListener("transitionrun", onRun, true);
    await frames(4);
    document.removeEventListener("transitionrun", onRun, true);
    expect(ran).toContain("opacity");
    expect(item("b")).toBeNull();
  });

  test("focus inside a leaving item moves to its neighbour before it turns inert", async () => {
    function Buttons() {
      const [ids, setIds] = useState(["a", "b", "c"]);
      return (
        <Presence>
          {ids.map((id) => (
            <button key={id} type="button" data-id={id} onClick={() => setIds((all) => all.filter((x) => x !== id))}>
              Remove {id}
            </button>
          ))}
        </Presence>
      );
    }
    const c = mount(<Buttons />);
    await shown();
    const b = c.querySelector<HTMLButtonElement>('[data-id="b"]')!;
    b.focus();
    act(() => b.click());
    expect(document.activeElement).toBe(c.querySelector('[data-id="c"]'));
    // The last one hands focus back to the previous item.
    const last = c.querySelector<HTMLButtonElement>('[data-id="c"]')!;
    await shown();
    act(() => last.click());
    expect(document.activeElement).toBe(c.querySelector('[data-id="a"]'));
  });
});

describe("the item is the caller's element", () => {
  test("its own className and ref survive alongside Presence's", async () => {
    const ref = createRef<HTMLLIElement>();
    mount(
      <ul>
        <Presence>
          <li key="a" ref={ref} className="text-ink-muted">
            a
          </li>
        </Presence>
      </ul>,
    );
    expect(ref.current).toBe(item("a") ?? container!.querySelector("li"));
    const li = container!.querySelector("li")!;
    expect(li.className).toContain("text-ink-muted");
    expect(getComputedStyle(li).transitionProperty).toContain("opacity");
  });
});
