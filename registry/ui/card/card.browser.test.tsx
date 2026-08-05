import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Card } from "./card.tsx";
import { Popover } from "@/ui/popover/popover.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return {
    card: container.querySelector<HTMLElement>('[data-slot="card"]')!,
    header: container.querySelector<HTMLElement>('[data-slot="card-header"]'),
    title: container.querySelector<HTMLElement>('[data-slot="card-title"]'),
    footer: container.querySelector<HTMLElement>('[data-slot="card-footer"]'),
    container: container!,
  };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

describe("Card is structure, not a styled div", () => {
  test("renders a section with a real heading", () => {
    const { card, title } = mount(
      <Card><Card.Header>Section options</Card.Header></Card>,
    );
    expect(card.tagName).toBe("SECTION");
    // A heading makes a card navigable by screen reader; a div does not.
    expect(title!.tagName).toBe("H3");
    expect(title!.textContent).toBe("Section options");
  });

  test("the heading level is a prop, because only the page knows its outline", () => {
    const { title } = mount(
      <Card><Card.Header headingLevel={2}>Section options</Card.Header></Card>,
    );
    expect(title!.tagName).toBe("H2");
  });

  test("actions are a slot and are never wrapped away from their names", () => {
    const { container: c } = mount(
      <Card>
        <Card.Header actions={<button type="button" aria-label="Delete section">x</button>}>
          Section options
        </Card.Header>
      </Card>,
    );
    const action = c.querySelector<HTMLElement>('[data-slot="card-actions"] button')!;
    expect(action.getAttribute("aria-label")).toBe("Delete section");
  });
});

describe("Card paints the designed surface", () => {
  test("geometry and elevation resolve", () => {
    const { card } = mount(<Card><Card.Header>Title</Card.Header></Card>);
    const style = getComputedStyle(card);
    expect(style.borderRadius).toBe("24px");
    expect(style.padding).toBe("16px");
    expect(style.gap).toBe("16px");
    expect(style.backgroundColor).toBe("rgb(246, 243, 240)");
    expect(style.borderTopColor).toBe("rgb(218, 212, 206)");
    expect(style.boxShadow).not.toBe("none");
  });

  test("its surface AGREES with Popover's panel", async () => {
    // Asserted as a relationship: a card and a popover on one screen must not
    // disagree about what a surface is. Numbers on each would pass while the
    // two drifted apart.
    const { card } = mount(
      <>
        <Card><Card.Header>Title</Card.Header></Card>
        <Popover defaultIsOpen>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Panel><Popover.Title>Panel</Popover.Title></Popover.Panel>
        </Popover>
      </>,
    );
    const panel = document.querySelector<HTMLElement>('[data-slot="popover-panel"]')!;
    const c = getComputedStyle(card);
    const p = getComputedStyle(panel);
    expect(c.borderRadius).toBe(p.borderRadius);
    expect(c.padding).toBe(p.padding);
    expect(c.borderTopColor).toBe(p.borderTopColor);
  });

  test("header and footer take the unboxed inset; the card's own padding does not double", () => {
    const { header, footer } = mount(
      <Card>
        <Card.Header>Title</Card.Header>
        <Card.Footer>Actions</Card.Footer>
      </Card>,
    );
    // Bare text steps in by --ui-space-sm inside a 24px radius; a boxed child
    // stays flush at the card's p-lg.
    expect(getComputedStyle(header!).paddingLeft).toBe("8px");
    expect(getComputedStyle(footer!).paddingLeft).toBe("8px");
    expect(getComputedStyle(footer!).justifyContent).toBe("space-between");
  });

  test("the title uses the designed role and truncates rather than wrapping", () => {
    const { title } = mount(
      <Card><Card.Header>A section title long enough that it would wrap</Card.Header></Card>,
    );
    const style = getComputedStyle(title!);
    // title-sm is FLUID (ADR 0009): a band, not a value.
    const px = Number.parseFloat(style.fontSize);
    expect(px).toBeGreaterThanOrEqual(12);
    expect(px).toBeLessThanOrEqual(16);
    expect(style.fontWeight).toBe("600");
    expect(style.textOverflow).toBe("ellipsis");
  });

  test("className lands on the outermost node (§5)", () => {
    const { card } = mount(<Card className="max-w-lg"><Card.Header>T</Card.Header></Card>);
    expect(card.classList.contains("max-w-lg")).toBe(true);
  });
});
