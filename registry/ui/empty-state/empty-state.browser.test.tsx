import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";
import { Inbox } from "griddy-icons";

import { EmptyState } from "./empty-state.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const q = <T extends HTMLElement>(slot: string) =>
    container!.querySelector<T>(`[data-slot="${slot}"]`);
  return {
    container: container!,
    empty: q("empty-state")!,
    prompt: q("empty-state-prompt")!,
    icon: q("empty-state-icon"),
    title: q("empty-state-title")!,
    description: q("empty-state-description"),
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** The resolved value of a token, so an assertion names the ROLE not a hex. */
function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe("the block", () => {
  test("is a centred column at the sheet's 16px inset and gaps", () => {
    const { empty, prompt } = mount(
      <EmptyState title="No designers match this filter" description="Clear the status filter." />,
    );
    const outer = getComputedStyle(empty);
    const inner = getComputedStyle(prompt);

    expect(outer.display).toBe("flex");
    expect(outer.flexDirection).toBe("column");
    expect(outer.alignItems).toBe("center");
    expect(outer.padding).toBe("16px");
    // 16px between "what happened" and "what to do"; 8px inside the group.
    expect(outer.rowGap).toBe("16px");
    expect(inner.rowGap).toBe("8px");
  });

  test("has NO min-height — the sheet's 133px is its auto-layout's, not a decision", () => {
    const { empty } = mount(<EmptyState title="Nothing here" />);
    // Chromium reports an unset min-height as `0px`, not `auto`.
    expect(getComputedStyle(empty).minHeight).toBe("0px");
  });
});

describe("the mark", () => {
  test("is a 32px sunken well, and the well sizes the glyph to 16", () => {
    const { icon } = mount(<EmptyState title="Nothing here" icon={<Inbox />} />);
    const well = getComputedStyle(icon!);

    expect(well.width).toBe("32px");
    expect(well.height).toBe("32px");
    expect(well.borderRadius).toBe("8px");
    expect(well.backgroundColor).toBe(tokenColor("--ui-bg-sunken"));

    // griddy writes width="24" as a presentation ATTRIBUTE, so a slot the
    // component does not size ships 24px. One CSS rule beats it.
    const svg = icon!.querySelector("svg")!;
    expect(getComputedStyle(svg).width).toBe("16px");
    expect(getComputedStyle(svg).height).toBe("16px");
  });

  test("is hidden from assistive tech — the sentence carries the meaning", () => {
    const { icon } = mount(<EmptyState title="Nothing here" icon={<Inbox />} />);
    expect(icon!.getAttribute("aria-hidden")).toBe("true");
  });

  test("is absent, not empty, when no icon is passed", () => {
    const { icon } = mount(<EmptyState title="Nothing here" />);
    expect(icon).toBeNull();
  });
});

describe("type", () => {
  test("the title is 13px secondary ink at the leading its role sets", () => {
    const { title } = mount(<EmptyState title="No designers match this filter" />);
    const style = getComputedStyle(title);

    expect(style.fontSize).toBe("13px");
    expect(style.fontWeight).toBe("500");
    expect(style.color).toBe(tokenColor("--ui-text-secondary"));
    // leading-normal is 135%: 13 * 1.35 = 17.55.
    expect(style.lineHeight).toBe("17.55px");
  });

  test("the description WRAPS without colliding — the sheet's leading-flat is why this exists", () => {
    const { description } = mount(
      <EmptyState title="Nothing here" description="Clear the status filter to see all 24 records." />,
    );
    const style = getComputedStyle(description!);

    expect(style.fontSize).toBe("12px");
    expect(style.color).toBe(tokenColor("--ui-text-muted"));
    // 12 * 1.35 = 16.2. The sheet draws `leading-flat` (100%), which is 12px —
    // exactly the font size, so two lines of a wrapped description touch.
    expect(style.lineHeight).toBe("16.2px");
    expect(style.lineHeight).not.toBe("12px");
  });

  test("the two roles are not the same size — hierarchy is real, not declared", () => {
    const { title, description } = mount(
      <EmptyState title="Nothing here" description="Because of a filter." />,
    );
    expect(getComputedStyle(title).fontSize).not.toBe(getComputedStyle(description!).fontSize);
  });
});

describe("the action", () => {
  test("is rendered exactly as handed over — the parent never wraps a slot (§3)", () => {
    const { empty } = mount(
      <EmptyState
        title="Nothing here"
        action={
          <button type="button" data-slot="probe">
            Clear Filter
          </button>
        }
      />,
    );
    // The button is a DIRECT child of the block. A wrapper would break the
    // caller's ability to style or size the control they passed in.
    expect(empty.lastElementChild?.tagName).toBe("BUTTON");
    expect(empty.lastElementChild?.getAttribute("data-slot")).toBe("probe");
  });
});

describe("forwarding (§5)", () => {
  test("ref and className both land on the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { empty } = mount(
      <EmptyState ref={ref} className="mt-2xl" title="Nothing here" icon={<Inbox />} />,
    );

    expect(ref.current).toBe(empty);
    expect(getComputedStyle(empty).marginTop).toBe("32px");
    // The component's own padding survives a consumer's margin.
    expect(getComputedStyle(empty).padding).toBe("16px");
  });

  test("a consumer's padding DISPLACES the component's rather than joining it", () => {
    const { empty } = mount(<EmptyState className="p-2xl" title="Nothing here" />);
    expect(getComputedStyle(empty).padding).toBe("32px");
  });

  test("native div props reach the outermost node, so a container can make it live", () => {
    const { empty } = mount(<EmptyState title="Nothing here" role="status" aria-live="polite" />);
    expect(empty.getAttribute("role")).toBe("status");
    expect(empty.getAttribute("aria-live")).toBe("polite");
  });

  test("it announces nothing on its own", () => {
    const { empty } = mount(<EmptyState title="Nothing here" />);
    expect(empty.getAttribute("role")).toBeNull();
    expect(empty.getAttribute("aria-live")).toBeNull();
  });
});
