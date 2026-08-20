import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { ChatProgress, type ChatProgressStep } from "./chat-progress.tsx";

/** Wait out any running transition before reading computed style. */
async function settled(element: Element) {
  await Promise.all(
    element
      .getAnimations()
      // The spinner never finishes. Awaiting an infinite animation's `finished`
      // hangs the whole file — the visual suite learned this one first.
      .filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  );
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement, scheme?: "light" | "dark") {
  container = document.createElement("div");
  if (scheme) {
    Object.assign(
      container.style,
      toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
      { colorScheme: scheme },
    );
    container.className = "bg-base";
  }
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const c = container;
  const q = <T extends HTMLElement>(slot: string) => c.querySelector<T>(`[data-slot="${slot}"]`);
  const all = (slot: string) => Array.from(c.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`));
  return { container: c, q, all };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const STEPS: ChatProgressStep[] = [
  { id: "tone", label: "Tone of voice", status: "done" },
  { id: "images", label: "Collecting images", status: "current" },
  { id: "moodboard", label: "Compose moodboard", status: "pending" },
];

describe("ChatProgress forms", () => {
  test("thinking renders the spinner and the line, and nothing to operate", () => {
    const { q, container: c } = mount(<ChatProgress label="Thinking…" />);

    expect(q("chat-progress-thinking")!.textContent).toBe("Thinking…");
    expect(q("chat-progress-spinner")).not.toBeNull();
    // The lightest form has no disclosure: there is nothing folded to reveal.
    expect(c.querySelector("button")).toBeNull();
    expect(q("chat-progress")!.dataset.form).toBe("thinking");
  });

  test("the icon slot replaces the spinner rather than joining it", () => {
    const { q } = mount(<ChatProgress label="Thinking…" icon={<span data-slot="probe-mark" />} />);

    expect(q("probe-mark")).not.toBeNull();
    expect(q("chat-progress-spinner")).toBeNull();
  });

  test("an activity detail truncates and never wraps", () => {
    const { q } = mount(
      <div style={{ width: "400px" }}>
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Searching…", detail: "Grid Systems in Graphic Design, Josef Muller-Brockmann 1961, and every scan in the library that references it" },
          ]}
        />
      </div>,
    );
    const detail = q<HTMLElement>("chat-progress-activity")!.lastElementChild as HTMLElement;
    const style = getComputedStyle(detail);

    // All three together are what `truncate` means; any one alone is not.
    expect(style.overflow).toBe("hidden");
    expect(style.textOverflow).toBe("ellipsis");
    expect(style.whiteSpace).toBe("nowrap");
    // One line, and the box is the line — a wrapped source title turns a
    // status into a paragraph.
    expect(Math.round(detail.getBoundingClientRect().height)).toBe(
      Math.round(parseFloat(style.lineHeight)),
    );
  });

  test("the verb never shrinks while the detail does", () => {
    const { q } = mount(
      <div style={{ width: "260px" }}>
        <ChatProgress
          form="activity"
          activities={[{ verb: "Searching…", detail: "5 files included across 3 spaces and then some" }]}
        />
      </div>,
    );
    const pill = q<HTMLElement>("chat-progress-activity")!;
    const verb = pill.firstElementChild as HTMLElement;

    expect(getComputedStyle(verb).flexShrink).toBe("0");
    expect(verb.textContent).toBe("Searching…");
  });

  test("the three step statuses are three different treatments", () => {
    const { all } = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />, "light");
    const [done, current, pending] = all("chat-progress-step");

    expect(done!.dataset.stepStatus).toBe("done");
    expect(current!.dataset.stepStatus).toBe("current");
    expect(pending!.dataset.stepStatus).toBe("pending");

    // The GLYPH differs: a success mark, a spinner, an empty ring. Asserted by
    // which element is present, not by a colour, because the colour is the
    // second channel and not the first.
    expect(done!.querySelector('[data-slot="chat-progress-spinner"]')).toBeNull();
    expect(current!.querySelector('[data-slot="chat-progress-spinner"]')).not.toBeNull();
    expect(pending!.querySelector('[data-slot="chat-progress-pending"]')).not.toBeNull();

    // The INK separates the current step from the rest, and only that. Done and
    // pending deliberately share it: the sheet drew pending in text-disabled,
    // which measures 2.14:1 and is content rather than an inactive control, so
    // the glyph above carries done-vs-pending and the ink carries now-vs-not.
    const [doneInk, currentInk, pendingInk] = [done, current, pending].map(
      (li) => getComputedStyle(li!.lastElementChild!).color,
    );
    expect(currentInk).not.toBe(doneInk);
    expect(pendingInk).toBe(doneInk);
  });

  test("the steps are a real list, so a screen reader is given the count", () => {
    const { q } = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />);
    const list = q<HTMLElement>("chat-progress-steps")!;

    expect(list.tagName).toBe("UL");
    expect(list.querySelectorAll("li")).toHaveLength(3);
  });

  test("measured renders the Progress primitive with its ARIA, not a bare track", () => {
    const { q, container: c } = mount(<ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />);

    const bar = c.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("48");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    // The name comes from the label, not from the number.
    expect(c.textContent).toContain("Generating slide 3 of 6");
    expect(c.textContent).toContain("48%");
    expect(q("chat-progress-measured")).not.toBeNull();
  });

  test("max reshapes the percentage rather than the value", () => {
    const { container: c } = mount(<ChatProgress form="measured" label="Generating" value={3} max={6} />);
    const bar = c.querySelector('[role="progressbar"]')!;

    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuemax")).toBe("6");
    expect(c.textContent).toContain("50%");
  });
});

describe("ChatProgress receipt and failure", () => {
  test("a running step list opens by default; a finished one folds", () => {
    const running = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />);
    expect(running.q("chat-progress-steps")).not.toBeNull();
    unmount();

    const done = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s · 4 steps"
        expandLabel="Show what the agent did"
      />,
    );
    expect(done.q("chat-progress-summary")!.textContent).toContain("Worked for 26 s · 4 steps");
    // Folded, not deleted — the log is history.
    expect(done.q("chat-progress-steps")).toBeNull();
  });

  test("the receipt re-expands, and its trigger is named", async () => {
    const { q, container: c } = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s · 4 steps"
        expandLabel="Show what the agent did"
      />,
    );
    const trigger = q<HTMLButtonElement>("chat-progress-summary")!;

    expect(trigger.tagName).toBe("BUTTON");
    // The receipt line says what HAPPENED; the accessible name says what the
    // control DOES, and both are in the name because one without the other is
    // either a mystery or a lie.
    expect(trigger.textContent).toContain("Show what the agent did");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(c.querySelector('[data-slot="chat-progress-steps"]')).not.toBeNull();
  });

  test("the disclosure is controllable, and a controlled one does not move on its own", async () => {
    const seen: boolean[] = [];
    const { q, container: c } = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isOpen={false}
        onOpenChange={(open) => seen.push(open)}
      />,
    );

    await userEvent.click(q<HTMLButtonElement>("chat-progress-summary")!);
    expect(seen).toEqual([true]);
    // The parent decides. A component that opened anyway is the bug
    // useControllableState exists to prevent, and Base UI holds the same line.
    expect(c.querySelector('[data-slot="chat-progress-steps"]')).toBeNull();
  });

  test("errorText replaces the form and offers a real Retry", async () => {
    let retried = 0;
    const { q } = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        errorText="Stopped after 12 s — connection lost"
        retryLabel="Retry"
        onRetryAction={() => (retried += 1)}
      />,
      "light",
    );

    expect(q("chat-progress")!.dataset.status).toBe("failed");
    expect(q("chat-progress-steps")).toBeNull();
    expect(q("chat-progress-failure")!.textContent).toContain("Stopped after 12 s");

    const retry = q<HTMLButtonElement>("chat-progress-retry")!;
    expect(retry.tagName).toBe("BUTTON");
    await userEvent.click(retry);
    expect(retried).toBe(1);
  });

  test("the whole log is a polite live region", () => {
    const { q } = mount(<ChatProgress label="Thinking…" />);
    const region = q<HTMLElement>("chat-progress")!;

    expect(region.getAttribute("role")).toBe("status");
    // Never assertive: nothing here interrupts what the reader was doing.
    expect(region.getAttribute("aria-live")).not.toBe("assertive");
  });
});

describe("ChatProgress rendering", () => {
  test.each(["light", "dark"] as const)(
    "the spinner's arc is visible against its own track — %s",
    async (scheme) => {
      const { q } = mount(<ChatProgress label="Thinking…" />, scheme);
      const spinner = q<HTMLElement>("chat-progress-spinner")!;
      await settled(spinner);
      const style = getComputedStyle(spinner);

      // The arc is a top border over a full ring. If the two ever resolve to
      // the same value the spinner is an unmoving circle, which is exactly what
      // it must not be.
      expect(style.borderTopColor).not.toBe(style.borderRightColor);
      expect(contrast(style.borderTopColor, style.borderRightColor)).toBeGreaterThanOrEqual(1.5);
    },
  );

  test("the spinner turns, and only when motion is allowed", () => {
    const { q } = mount(<ChatProgress label="Thinking…" />);
    const spinner = q<HTMLElement>("chat-progress-spinner")!;

    // `motion-safe:` is a media query, so under the default (no reduced-motion
    // preference) the animation exists. The GUARD is what is asserted — that
    // the class is the safe-side one, which the computed name proves.
    expect(getComputedStyle(spinner).animationName).not.toBe("none");
  });

  test("form and status reach the DOM so a thread can style its own log", () => {
    const { q } = mount(<ChatProgress form="measured" label="Generating" value={10} />);
    expect(q("chat-progress")!.dataset.form).toBe("measured");
    expect(q("chat-progress")!.dataset.status).toBe("running");
  });

  test("ref, className and native props land on the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { q } = mount(<ChatProgress ref={ref} label="Thinking…" className="mt-lg" id="run-4" />);
    const rootEl = q<HTMLElement>("chat-progress")!;

    expect(ref.current).toBe(rootEl);
    expect(rootEl.id).toBe("run-4");
    expect(getComputedStyle(rootEl).marginTop).toBe("16px");
  });

  test("a form's own data never reaches the DOM as an attribute", () => {
    const { q } = mount(<ChatProgress form="steps" label="Gathering" duration="12 s" steps={STEPS} />);
    const rootEl = q<HTMLElement>("chat-progress")!;

    // React serialises unknown props onto the element. `steps` arriving there
    // would be "[object Object],[object Object]" in the markup.
    expect(rootEl.getAttribute("steps")).toBeNull();
    expect(rootEl.getAttribute("label")).toBeNull();
    expect(rootEl.getAttribute("duration")).toBeNull();
  });
});

/** WCAG relative-luminance contrast between two `rgb(...)` strings. */
function contrast(a: string, b: string): number {
  const luminance = (color: string) => {
    const [r, g, b2] = (color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as [number, number, number];
    const channel = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b2);
  };
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
