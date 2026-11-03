import { userEvent } from "vitest/browser";
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
    expect(style.borderRadius).toBe("16px");
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
    // Bare text steps in by --ui-space-sm inside a 16px radius; a boxed child
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

describe("Card surface options (#10)", () => {
  test("surface=\"outlined\" keeps the hairline and drops the shadow", () => {
    const { card } = mount(<Card surface="outlined"><Card.Header>Title</Card.Header></Card>);
    const style = getComputedStyle(card);
    expect(card.getAttribute("data-surface")).toBe("outlined");
    expect(style.borderTopStyle).toBe("solid");
    // Tailwind v4 composes box-shadow from placeholder layers, so "no shadow"
    // is every layer's colour being fully transparent, not the keyword.
    const colours = style.boxShadow.match(/rgba?\([^)]*\)/g) ?? [];
    expect(colours.every((c) => /rgba\([^)]*,\s*0\)$/.test(c))).toBe(true);
  });

  test("no minimum width: a card fits a column narrower than 320px", () => {
    const { card } = mount(
      <div style={{ width: 240 }}>
        <Card><Card.Header>Title</Card.Header></Card>
      </div>,
    );
    expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(240);
  });

  test("Header subtitle sits under the title, outside the heading, and describes the card", () => {
    const { card, title } = mount(
      <Card>
        <Card.Header subtitle="Shared with the Zürich studio">Grid systems</Card.Header>
      </Card>,
    );
    const subtitle = document.querySelector<HTMLElement>('[data-slot="card-subtitle"]')!;
    expect(title!.textContent).toBe("Grid systems");
    expect(title!.contains(subtitle)).toBe(false);
    expect(card.getAttribute("aria-describedby")).toBe(subtitle.id);
    expect(subtitle.getBoundingClientRect().top).toBeGreaterThan(title!.getBoundingClientRect().top);
    // Drawn: body-sm in --ui-text-muted, 4px under the title.
    expect(getComputedStyle(subtitle).fontSize).toBe("13px");
  });

  test("no subtitle, no aria-describedby — never a dangling reference", () => {
    const { card } = mount(<Card><Card.Header>Grid systems</Card.Header></Card>);
    expect(card.hasAttribute("aria-describedby")).toBe(false);
  });

  test("a capped Card.Body scrolls under a bottom Fade that clears at the end", async () => {
    mount(
      <Card>
        <Card.Header>Grid systems</Card.Header>
        <Card.Body style={{ maxHeight: 60 }}>
          <p style={{ height: 300 }}>Long content</p>
        </Card.Body>
      </Card>,
    );
    const scroller = document.querySelector<HTMLElement>('[data-slot="card-body-scroll"]')!;
    const fade = document.querySelector<HTMLElement>('[data-slot="card-body"] [data-slot="fade"]')!;
    expect(scroller.clientHeight).toBeLessThanOrEqual(60);
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
    // Bound to the scroller, the band reads its strength from how much
    // content runs past the edge: full with 240px still below, nothing at
    // the end. Read through the computed opacity — the value painted.
    expect(fade.dataset.scrollLinked).toBe("true");
    await expect.poll(() => getComputedStyle(fade).opacity).toBe("1");
    scroller.scrollTop = scroller.scrollHeight;
    scroller.dispatchEvent(new Event("scroll"));
    await expect.poll(() => getComputedStyle(fade).opacity).toBe("0");
  });
});

describe("collapsible (#10)", () => {
  function Pipeline(props: { defaultIsOpen?: boolean }) {
    return (
      <Card collapsible={props.defaultIsOpen === undefined ? true : { defaultIsOpen: props.defaultIsOpen }}>
        <Card.Header subtitle="Step 3 of 5">Analysing brand guidelines</Card.Header>
        <Card.Body>Timeline</Card.Body>
        <Card.Footer>Open full report</Card.Footer>
      </Card>
    );
  }

  test("the trigger is last in the actions, named by the title, and controls the body", () => {
    mount(<Pipeline />);
    const trigger = document.querySelector<HTMLButtonElement>('[data-slot="card-trigger"]')!;
    const body = document.querySelector<HTMLElement>('[data-slot="card-body"]')!;
    const title = document.querySelector<HTMLElement>('[data-slot="card-title"]')!;
    expect(trigger.getAttribute("aria-labelledby")).toBe(title.id);
    expect(trigger.getAttribute("aria-controls")).toBe(body.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(body.hidden).toBe(false);
  });

  test("toggling hides the body but keeps it — and the footer — in the DOM", async () => {
    mount(<Pipeline />);
    const trigger = document.querySelector<HTMLButtonElement>('[data-slot="card-trigger"]')!;
    await userEvent.click(trigger);
    const body = document.querySelector<HTMLElement>('[data-slot="card-body"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(body.hidden).toBe(true);
    expect(document.querySelector('[data-slot="card-footer"]')).not.toBeNull();
  });

  test("defaultIsOpen: false starts collapsed", () => {
    mount(<Pipeline defaultIsOpen={false} />);
    expect(document.querySelector<HTMLElement>('[data-slot="card-body"]')!.hidden).toBe(true);
  });

  test("a card that is not collapsible renders no trigger", () => {
    mount(<Card><Card.Header>Title</Card.Header><Card.Body>Body</Card.Body></Card>);
    expect(document.querySelector('[data-slot="card-trigger"]')).toBeNull();
  });
});
