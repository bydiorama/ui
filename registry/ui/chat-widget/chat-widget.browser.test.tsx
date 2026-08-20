import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { ChatWidget } from "./chat-widget.tsx";

/** Wait out any running transition before reading computed style. */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

/** A ResizeObserver measurement lands after a frame, not after `act`. */
async function measured() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
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
  return { container: c, q };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const LONG = Array.from({ length: 12 }, (_, i) => (
  <p key={i}>
    Grid Systems in Graphic Design, 1961: strict enough that anyone following it lands somewhere defensible, open
    enough that the good ones land somewhere memorable.
  </p>
));

describe("ChatWidget container", () => {
  test.each(["light", "dark"] as const)(
    "the fill is the whole boundary — no border, no shadow — %s",
    async (scheme) => {
      const { q, container: c } = mount(
        <ChatWidget>
          <ChatWidget.Header name="A draft" />
        </ChatWidget>,
        scheme,
      );
      const widget = q<HTMLElement>("chat-widget")!;
      await settled(widget);
      const style = getComputedStyle(widget);

      expect(style.borderTopWidth).toBe("0px");
      expect(style.boxShadow).toBe("none");
      // …which only works if the fill actually differs from the page.
      expect(style.backgroundColor).not.toBe(getComputedStyle(c).backgroundColor);
    },
  );

  test("the media's corner is concentric with the container's", () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Media>
          <img src="data:," alt="A picture" />
        </ChatWidget.Media>
      </ChatWidget>,
    );
    const widget = q<HTMLElement>("chat-widget")!;
    const stage = q<HTMLElement>("chat-widget-media")!.firstElementChild!;

    const outer = parseFloat(getComputedStyle(widget).borderTopLeftRadius);
    const inset = parseFloat(getComputedStyle(widget).paddingTop);
    const inner = parseFloat(getComputedStyle(stage).borderTopLeftRadius);

    // CONVENTIONS §6: outerRadius = innerRadius + padding. 16 = 8 + 8, and it
    // is the one rule here that breaks visibly if the inset moves without the
    // radius following — which is why it is asserted as the ARITHMETIC rather
    // than as two numbers.
    expect(outer).toBe(inner + inset);
  });

  test("the header's text starts where the action bar's labels do", () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Header name="A draft" />
        <ChatWidget.Actions>
          <Button variant="secondary" size="md">
            Copy
          </Button>
        </ChatWidget.Actions>
      </ChatWidget>,
    );
    const widget = q<HTMLElement>("chat-widget")!;
    const name = q<HTMLElement>("chat-widget-name")!;
    const button = widget.querySelector("button")!;

    // The container's 8px inset plus the header's own px-md is 20; a
    // secondary·md button sits at the same 8 and pads itself by 12. Type
    // aligns to type — the sheet's own words, and the reason the header is not
    // flush with the container.
    const widgetLeft = widget.getBoundingClientRect().left;
    const labelLeft = button.getBoundingClientRect().left + parseFloat(getComputedStyle(button).paddingLeft);
    expect(Math.round(name.getBoundingClientRect().left - widgetLeft)).toBe(20);
    expect(Math.round(labelLeft - widgetLeft)).toBe(20);
  });

  test("the name truncates while the chip and the icon hold their size", () => {
    const { q } = mount(
      <div style={{ width: "320px" }}>
        <ChatWidget>
          <ChatWidget.Header
            name="A name long enough that it has to give way before anything else in this row does"
            icon={<span data-slot="probe-icon" className="block size-4" />}
            chip={<Badge>Draft</Badge>}
          />
        </ChatWidget>
      </div>,
    );
    const name = q<HTMLElement>("chat-widget-name")!;
    const style = getComputedStyle(name);

    expect(style.overflow).toBe("hidden");
    expect(style.textOverflow).toBe("ellipsis");
    expect(style.whiteSpace).toBe("nowrap");
    // One line — a wrapped filename turns a one-line header into two.
    expect(Math.round(name.getBoundingClientRect().height)).toBe(Math.round(parseFloat(style.lineHeight)));
  });
});

describe("ChatWidget body", () => {
  test("a short body is NOT a region and NOT in the tab order", async () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Body scrollLabel="A draft">
          <p>One line.</p>
        </ChatWidget.Body>
      </ChatWidget>,
    );
    await measured();
    const body = q<HTMLElement>("chat-widget-body")!;

    // An unconditional tab stop in front of every short draft is the failure
    // this half prevents; the other half is the test below.
    expect(body.getAttribute("tabindex")).toBeNull();
    expect(body.getAttribute("role")).toBeNull();
    expect(body.dataset.scrollable).toBeUndefined();
    expect(q("chat-widget-fade")).toBeNull();
  });

  test("a body past its cap scrolls, is named, and enters the tab order", async () => {
    const { q } = mount(
      <div style={{ width: "480px" }}>
        <ChatWidget>
          <ChatWidget.Body scrollLabel="Studio manifesto draft">{LONG}</ChatWidget.Body>
        </ChatWidget>
      </div>,
    );
    await measured();
    const body = q<HTMLElement>("chat-widget-body")!;

    expect(body.dataset.scrollable).toBe("true");
    // role, name and tab stop TOGETHER — a named region nobody can reach is as
    // useless as a reachable one with no name.
    expect(body.getAttribute("role")).toBe("region");
    expect(body.getAttribute("aria-label")).toBe("Studio manifesto draft");
    expect(body.getAttribute("tabindex")).toBe("0");
    expect(getComputedStyle(body).overflowY).toBe("auto");
    // The cap, from the sheet.
    expect(Math.round(body.getBoundingClientRect().height)).toBe(320);
    // …and it really does hold more than it shows.
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
  });

  test("the fade appears only while the body scrolls, and never eats a press", async () => {
    const { q } = mount(
      <div style={{ width: "480px" }}>
        <ChatWidget>
          <ChatWidget.Body scrollLabel="Studio manifesto draft">{LONG}</ChatWidget.Body>
        </ChatWidget>
      </div>,
    );
    await measured();
    const fade = q<HTMLElement>("chat-widget-fade")!;

    expect(fade.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(fade).pointerEvents).toBe("none");
    // Two stops the theme already has, which is the answer to the sheet's
    // Conflict: the fade is not a colour, so no token could have expressed it.
    expect(getComputedStyle(fade).backgroundImage).toContain("gradient");
  });

  test("the body's typography is the receiver block's, unchanged", () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Body scrollLabel="A draft">
          <p>Some prose</p>
        </ChatWidget.Body>
      </ChatWidget>,
    );
    const body = q<HTMLElement>("chat-widget-body")!;
    const style = getComputedStyle(body);

    // body-md at leading-relaxed: 14 x 1.55. Asserted as the RATIO, so it
    // survives a change to either token but not to the relationship.
    expect(parseFloat(style.fontSize)).toBe(14);
    expect(parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toBeCloseTo(1.55, 2);
  });
});

describe("ChatWidget actions and rail", () => {
  test("the bar pushes its trailing icons to the edge without justify-between", () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Actions end={<Button isIconOnly aria-label="Save" data-slot="probe-end" />}>
          <Button variant="secondary" size="md">
            Copy
          </Button>
        </ChatWidget.Actions>
      </ChatWidget>,
    );
    const bar = q<HTMLElement>("chat-widget-actions")!;
    const end = q<HTMLElement>("probe-end")!;

    // A bar with ONE verb still puts its icons on the trailing edge, which
    // `justify-between` gets right by accident and wrong the moment a second
    // verb arrives.
    expect(Math.round(bar.getBoundingClientRect().right - end.getBoundingClientRect().right)).toBe(0);
  });

  test("the rail is a real list, so a screen reader is given the count", () => {
    const { q } = mount(
      <ChatWidget>
        <ChatWidget.Rail label="Frames">
          <li>one</li>
          <li>two</li>
        </ChatWidget.Rail>
      </ChatWidget>,
    );
    const rail = q<HTMLElement>("chat-widget-rail")!;

    expect(rail.tagName).toBe("UL");
    expect(rail.getAttribute("aria-label")).toBe("Frames");
    expect(rail.querySelectorAll("li")).toHaveLength(2);
  });

  test("the media overlay floats in the stage's trailing bottom corner", () => {
    const { q } = mount(
      <div style={{ width: "480px" }}>
        <ChatWidget>
          <ChatWidget.Media overlay={<span data-slot="probe-overlay" className="block size-6" />}>
            <img src="data:," alt="A picture" />
          </ChatWidget.Media>
        </ChatWidget>
      </div>,
    );
    const media = q<HTMLElement>("chat-widget-media")!.getBoundingClientRect();
    const overlay = q<HTMLElement>("chat-widget-media-overlay")!.getBoundingClientRect();

    expect(Math.round(media.right - overlay.right)).toBe(8);
    expect(Math.round(media.bottom - overlay.bottom)).toBe(8);
  });
});

describe("ChatWidget forwarding (CONVENTIONS §5)", () => {
  test("each part forwards its ref and className to its own outermost node", () => {
    const rootRef = createRef<HTMLDivElement>();
    const headerRef = createRef<HTMLDivElement>();
    const { q } = mount(
      <ChatWidget ref={rootRef} className="mt-lg">
        <ChatWidget.Header ref={headerRef} name="A draft" />
      </ChatWidget>,
    );

    expect(rootRef.current).toBe(q("chat-widget"));
    expect(headerRef.current).toBe(q("chat-widget-header"));
    expect(getComputedStyle(rootRef.current!).marginTop).toBe("16px");
  });

  test("Body's ref is the SCROLLER, not its positioning frame", async () => {
    const bodyRef = createRef<HTMLDivElement>();
    const { q } = mount(
      <div style={{ width: "480px" }}>
        <ChatWidget>
          <ChatWidget.Body ref={bodyRef} scrollLabel="A draft">
            {LONG}
          </ChatWidget.Body>
        </ChatWidget>
      </div>,
    );
    await measured();

    // `scrollTop` is what a caller takes this ref for; the frame has none.
    expect(bodyRef.current).toBe(q("chat-widget-body"));
    expect(bodyRef.current!.scrollHeight).toBeGreaterThan(bodyRef.current!.clientHeight);
  });

  test("native props land on the same node", () => {
    const { q } = mount(
      <ChatWidget id="artifact-1">
        <ChatWidget.Header name="A draft" id="artifact-1-header" />
      </ChatWidget>,
    );
    expect(q<HTMLElement>("chat-widget")!.id).toBe("artifact-1");
    expect(q<HTMLElement>("chat-widget-header")!.id).toBe("artifact-1-header");
  });
});
