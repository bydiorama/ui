import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { ChatComposer } from "./chat-composer.tsx";

/**
 * Wait out any running transition before reading computed style.
 *
 * A read taken immediately after a state change returns the value the property
 * is transitioning FROM, so a working focus ring reads as broken. The frame
 * transitions four properties at once here, the radius included.
 */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
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
  const textarea = c.querySelector("textarea");
  const frame = q("chat-composer-frame");
  if (!textarea || !frame) throw new Error("ChatComposer did not render");
  return { container: c, textarea, frame, q };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const BASE = { label: "Message", sendLabel: "Send message", stopLabel: "Stop generating" } as const;

/**
 * Focus with the caret at the END of the value.
 *
 * `HTMLElement.focus()` on a textarea that already has a value puts the caret
 * at offset 0 in Chromium, so a test that focuses and types inserts its text
 * BEFORE the draft — which reads as the component reversing the string. Real
 * users click, and a click lands the caret where they pointed.
 */
function focusAtEnd(textarea: HTMLTextAreaElement) {
  act(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });
}

describe("ChatComposer keyboard contract", () => {
  test("Enter submits the current value and inserts no newline", async () => {
    const sent: string[] = [];
    const { textarea } = mount(
      <ChatComposer {...BASE} defaultValue="Draft" onSubmitAction={(v) => sent.push(v)} />,
    );

    focusAtEnd(textarea);
    await userEvent.keyboard("{Enter}");

    expect(sent).toEqual(["Draft"]);
    // The composer deliberately does NOT clear itself — a send that failed has
    // to be able to put the draft back.
    expect(textarea.value).toBe("Draft");
  });

  test("Shift+Enter opens a line and does not submit", async () => {
    const sent: string[] = [];
    const { textarea } = mount(
      <ChatComposer {...BASE} defaultValue="One" onSubmitAction={(v) => sent.push(v)} />,
    );

    focusAtEnd(textarea);
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");

    expect(sent).toEqual([]);
    expect(textarea.value).toBe("One\n");
  });

  test("Enter on a blank composer submits nothing", async () => {
    const sent: string[] = [];
    const { textarea } = mount(<ChatComposer {...BASE} onSubmitAction={(v) => sent.push(v)} />);

    focusAtEnd(textarea);
    await userEvent.keyboard("{Enter}");
    // Whitespace is not a message either.
    await userEvent.type(textarea, "   ");
    await userEvent.keyboard("{Enter}");

    expect(sent).toEqual([]);
  });

  test("an Enter that is committing an IME candidate does not submit", () => {
    const sent: string[] = [];
    const { textarea } = mount(
      <ChatComposer {...BASE} defaultValue="ひらがな" onSubmitAction={(v) => sent.push(v)} />,
    );

    // `isComposing` cannot be produced by userEvent — it is set by the input
    // method, not by the key. Dispatched directly, which is the only way to
    // assert the branch that keeps a half-typed Japanese sentence out of the
    // thread.
    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, isComposing: true } as KeyboardEventInit),
      );
    });

    expect(sent).toEqual([]);
  });

  test("a consumer's onKeyDown runs first and can cancel submission", async () => {
    const sent: string[] = [];
    const { textarea } = mount(
      <ChatComposer
        {...BASE}
        defaultValue="Draft"
        onSubmitAction={(v) => sent.push(v)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />,
    );

    focusAtEnd(textarea);
    await userEvent.keyboard("{Enter}");

    expect(sent).toEqual([]);
  });
});

describe("ChatComposer send and stop", () => {
  test("send is disabled while the field is blank and enabled once it is not", async () => {
    const { textarea, q } = mount(<ChatComposer {...BASE} onSubmitAction={() => {}} />);
    const send = q<HTMLButtonElement>("chat-composer-send")!;

    expect(send.disabled).toBe(true);
    await userEvent.type(textarea, "Hello");
    expect(q<HTMLButtonElement>("chat-composer-send")!.disabled).toBe(false);
  });

  test("the send control is named, and pressing it submits", async () => {
    const sent: string[] = [];
    const { q } = mount(
      <ChatComposer {...BASE} defaultValue="Draft" onSubmitAction={(v) => sent.push(v)} />,
    );
    const send = q<HTMLButtonElement>("chat-composer-send")!;

    expect(send.getAttribute("aria-label")).toBe("Send message");
    await userEvent.click(send);
    expect(sent).toEqual(["Draft"]);
  });

  test("isGenerating replaces send with a named stop control", async () => {
    let stopped = 0;
    const { q } = mount(<ChatComposer {...BASE} isGenerating onStopAction={() => (stopped += 1)} />);

    expect(q("chat-composer-send")).toBeNull();
    const stop = q<HTMLButtonElement>("chat-composer-stop")!;
    expect(stop.getAttribute("aria-label")).toBe("Stop generating");
    expect(stop.disabled).toBe(false);

    await userEvent.click(stop);
    expect(stopped).toBe(1);
  });

  /**
   * The pair the `--ui-bg-inverse` role exists for.
   *
   * Drawn with `--ui-bg-emphasis` — the role the sheet reached for first —
   * the Stop control measured 1:1 against the field in DARK, because theme
   * zero pins emphasis to neutral-0 in both schemes and the dark field is
   * neutral-0 too. Asserting the RELATIONSHIP rather than a hex is what makes
   * this survive a brand seed: what has to be true is that the control is
   * visible on the frame it sits in, in both schemes.
   */
  test.each(["light", "dark"] as const)(
    "the stop control is visible against the frame — %s",
    async (scheme) => {
      const { frame, q } = mount(<ChatComposer {...BASE} isGenerating onStopAction={() => {}} />, scheme);
      const stop = q<HTMLElement>("chat-composer-stop")!;
      await settled(stop);

      const field = getComputedStyle(frame).backgroundColor;
      const fill = getComputedStyle(stop).backgroundColor;
      expect(fill).not.toBe(field);
      expect(contrast(fill, field), `${scheme}: stop fill vs field`).toBeGreaterThanOrEqual(3);
    },
  );

  test.each(["light", "dark"] as const)(
    "stop and send are told apart by their fill — %s",
    async (scheme) => {
      const idle = mount(<ChatComposer {...BASE} defaultValue="Draft" onSubmitAction={() => {}} />, scheme);
      const sendFill = getComputedStyle(idle.q<HTMLElement>("chat-composer-send")!).backgroundColor;
      unmount();

      const busy = mount(<ChatComposer {...BASE} isGenerating onStopAction={() => {}} />, scheme);
      const stopFill = getComputedStyle(busy.q<HTMLElement>("chat-composer-stop")!).backgroundColor;

      // Two states that must differ, asserted as a difference rather than as
      // two hexes — pinning values would pass while the two converged.
      expect(stopFill).not.toBe(sendFill);
    },
  );

  test("the empty send control fills with the sheet's bg-sunken, not Button's disabled fill", () => {
    const { q } = mount(
      <>
        <ChatComposer {...BASE} />
        {/* Probes rather than a custom-property read: the two roles have to be
            compared as PAINTED values, and the theme reaches this tree through
            the stylesheet's light-dark() pair rather than through an inline
            variable a test could read back. */}
        <div data-slot="probe-sunken" className="bg-sunken" />
        <div data-slot="probe-elevated" className="bg-elevated" />
      </>,
      "light",
    );

    const fill = getComputedStyle(q<HTMLElement>("chat-composer-send")!).backgroundColor;
    const sunken = getComputedStyle(q<HTMLElement>("probe-sunken")!).backgroundColor;
    const elevated = getComputedStyle(q<HTMLElement>("probe-elevated")!).backgroundColor;

    // The two roles are one step apart and the difference is the whole point:
    // bg-elevated measures 1.03:1 against a white field and the control simply
    // is not there.
    expect(sunken).not.toBe(elevated);
    expect(fill).toBe(sunken);
  });
});

describe("ChatComposer frame geometry", () => {
  test("the compact frame's height is its parts, with nothing else authoring it", async () => {
    const { frame } = mount(<ChatComposer {...BASE} startAction={<Button variant="ghost" shape="full" isIconOnly aria-label="Add" />} />);
    await settled(frame);

    // 1 + 12 (p-md) + 32 (the control row) + 12 + 1 = 58, where 1 is the
    // 1.5px hairline as Chromium USES it at DPR 1.
    //
    // The sheet says 56 and draws the same parts, because it also declares a
    // 56px height — which is a SECOND author of the inset, and the two agree
    // only by accident. Measured in Paper, its vertical gap is 12 against a
    // border+padding of 13.5, so the drawing contradicts itself by 1.5px on
    // each side; horizontally, where nothing else authors it, the gap is the
    // declared 13.5. This is Tabs' defect exactly. Raised on the sheet.
    expect(Math.round(frame.getBoundingClientRect().height)).toBe(58);

    // What actually has to hold: the inset is the same on all four sides and
    // is the border plus the padding, with nothing else contributing.
    const control = frame.querySelector<HTMLElement>('[data-slot="chat-composer-actions"]')!;
    const outer = frame.getBoundingClientRect();
    const inner = control.getBoundingClientRect();
    expect(Math.round(outer.bottom - inner.bottom)).toBe(13);
    expect(Math.round(inner.top - outer.top)).toBe(13);
    expect(Math.round(outer.right - inner.right)).toBe(13);
  });

  test("the corner is a pill inline and radius-xl once the text wraps", async () => {
    const inline = mount(<ChatComposer {...BASE} layout="inline" />);
    await settled(inline.frame);
    const pill = parseFloat(getComputedStyle(inline.frame).borderTopLeftRadius);
    unmount();

    const stacked = mount(<ChatComposer {...BASE} layout="stacked" />);
    await settled(stacked.frame);
    const squared = getComputedStyle(stacked.frame).borderTopLeftRadius;

    // radius-full is a 999px token clamped by the box; radius-xl is 24. What
    // matters is that they DIFFER and that the stacked one is the drawn value.
    expect(squared).toBe("24px");
    expect(pill).toBeGreaterThan(24);
  });

  test("auto layout follows the text, not a prop", async () => {
    const { frame, textarea, container: c } = mount(
      <ChatComposer {...BASE} className="w-[400px]" defaultValue="One line" />,
    );
    const root = c.querySelector<HTMLElement>('[data-slot="chat-composer"]')!;
    expect(root.dataset.layout).toBe("inline");

    focusAtEnd(textarea);
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}second");
    await settled(frame);

    expect(root.dataset.layout).toBe("stacked");
    expect(getComputedStyle(frame).borderTopLeftRadius).toBe("24px");
  });

  test("the field grows with the content and stops at maxRows", async () => {
    const { textarea } = mount(<ChatComposer {...BASE} maxRows={3} />);

    const oneLine = textarea.getBoundingClientRect().height;
    focusAtEnd(textarea);
    await userEvent.type(textarea, "one{Shift>}{Enter}{/Shift}two");
    const twoLines = textarea.getBoundingClientRect().height;
    expect(twoLines).toBeGreaterThan(oneLine);

    await userEvent.type(textarea, "{Shift>}{Enter}{/Shift}three{Shift>}{Enter}{/Shift}four{Shift>}{Enter}{/Shift}five");
    const capped = textarea.getBoundingClientRect().height;

    // Three line boxes of body-md at leading-normal, and no more.
    const line = parseFloat(getComputedStyle(textarea).lineHeight);
    expect(capped).toBeLessThanOrEqual(line * 3 + 1);
    // Past the cap it SCROLLS rather than clipping — the rows below the fold
    // stay reachable.
    expect(getComputedStyle(textarea).overflowY).toBe("auto");
  });
});

describe("ChatComposer states", () => {
  test("focus paints the ring on the frame, not on the field", async () => {
    const { frame, textarea } = mount(<ChatComposer {...BASE} />);

    const resting = getComputedStyle(frame).boxShadow;
    focusAtEnd(textarea);
    await settled(frame);

    const focused = getComputedStyle(frame).boxShadow;
    expect(focused).not.toBe(resting);
    expect(focused).not.toBe("none");
    // The field never draws its own — which is the only reason `outline-none`
    // is safe on it.
    expect(getComputedStyle(textarea).outlineStyle).toBe("none");
  });

  test("errorText marks the field invalid, describes it, and colours the edge", async () => {
    const { frame, textarea, q } = mount(<ChatComposer {...BASE} errorText="Too large" />);
    await settled(frame);

    const error = q<HTMLElement>("chat-composer-error")!;
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
    expect(error.textContent).toBe("Too large");

    const plain = mount(<ChatComposer {...BASE} />);
    await settled(plain.frame);
    // A wrong-looking field that announces fine is the failure this pairing
    // prevents; the edge has to move too.
    expect(getComputedStyle(frame).borderTopColor).not.toBe(
      getComputedStyle(plain.frame).borderTopColor,
    );
  });

  test("disabled uses the attribute, the disabled fill, and a not-allowed cursor", async () => {
    const { frame, textarea, q } = mount(<ChatComposer {...BASE} isDisabled />, "light");
    await settled(frame);

    expect(textarea.disabled).toBe(true);
    expect(getComputedStyle(textarea).cursor).toBe("not-allowed");
    // Never pointer-events: none — the element has to stay hoverable so the
    // tooltip explaining WHY can appear.
    expect(getComputedStyle(frame).pointerEvents).not.toBe("none");
    expect(q<HTMLButtonElement>("chat-composer-send")!.disabled).toBe(true);

    const fill = getComputedStyle(frame).backgroundColor;
    const enabled = mount(<ChatComposer {...BASE} />, "light");
    await settled(enabled.frame);
    expect(fill).not.toBe(getComputedStyle(enabled.frame).backgroundColor);
  });

  test("the drop state changes the edge, the fill AND the label", async () => {
    const { frame, textarea } = mount(
      <ChatComposer {...BASE} placeholder="Message Diorama…" isDropActive dropLabel="Drop to attach" />,
      "light",
    );
    await settled(frame);

    expect(textarea.placeholder).toBe("Drop to attach");
    const resting = mount(<ChatComposer {...BASE} placeholder="Message Diorama…" />, "light");
    await settled(resting.frame);

    // Three channels, so the tint is never the only one (§8, SC 1.4.1).
    expect(getComputedStyle(frame).backgroundColor).not.toBe(
      getComputedStyle(resting.frame).backgroundColor,
    );
    expect(getComputedStyle(frame).borderTopColor).not.toBe(
      getComputedStyle(resting.frame).borderTopColor,
    );
  });
});

describe("ChatComposer forwarding (CONVENTIONS §5)", () => {
  test("ref lands on the textarea, not on the frame", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { textarea } = mount(<ChatComposer {...BASE} ref={ref} />);

    expect(ref.current).toBe(textarea);
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(textarea);
  });

  test("className lands on the outermost node so a width sizes everything", () => {
    const { container: c, frame } = mount(
      <ChatComposer {...BASE} className="w-[420px]" disclaimer="Careful." />,
    );
    const rootEl = c.querySelector<HTMLElement>('[data-slot="chat-composer"]')!;

    expect(rootEl.classList.contains("w-[420px]")).toBe(true);
    expect(Math.round(rootEl.getBoundingClientRect().width)).toBe(420);
    // …and the frame follows it rather than being sized separately.
    expect(Math.round(frame.getBoundingClientRect().width)).toBe(420);
  });

  test("native textarea props land on the textarea", () => {
    const { textarea } = mount(<ChatComposer {...BASE} name="prompt" maxLength={400} spellCheck={false} />);

    expect(textarea.name).toBe("prompt");
    expect(textarea.maxLength).toBe(400);
    expect(textarea.spellcheck).toBe(false);
  });

  test("the field is named by `label` without a visible one", () => {
    const { textarea, container: c } = mount(<ChatComposer {...BASE} />);

    expect(textarea.getAttribute("aria-label")).toBe("Message");
    // The sheet draws no visible label in any context, so there is none to
    // hide — and no isLabelHidden prop to get wrong.
    expect(c.querySelector("label")).toBeNull();
  });

  test("controlled value never moves on its own", async () => {
    const seen: string[] = [];
    const { textarea } = mount(<ChatComposer {...BASE} value="fixed" onValueChange={(v) => seen.push(v)} />);

    focusAtEnd(textarea);
    await userEvent.keyboard("x");
    expect(textarea.value).toBe("fixed");
    expect(seen).toEqual(["fixedx"]);
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
