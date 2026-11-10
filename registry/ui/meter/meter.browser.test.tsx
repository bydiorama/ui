import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Meter } from "./meter.tsx";

function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function tokenLength(name: string): string {
  const probe = document.createElement("div");
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).width;
  probe.remove();
  return value;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement, width = 400) {
  container = document.createElement("div");
  container.style.width = `${width}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  const q = <T extends Element = HTMLElement>(slot: string) => container!.querySelector<T>(`[data-slot="${slot}"]`);
  return { q, container: container! };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
}

afterEach(unmount);

describe("Meter announces itself as a meter", () => {
  test("role=meter with value, range and a valuetext equal to what is printed", () => {
    const { q, container: c } = mount(<Meter label="Ink reserve" value={84} status="warning" statusText="near limit" />);
    const bar = q("meter-bar")!;
    expect(bar.getAttribute("role")).toBe("meter");
    expect(bar.getAttribute("aria-valuenow")).toBe("84");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("84%, near limit");
    expect(q("meter-value")!.textContent).toBe("84%, near limit");
    const name = c.querySelector(`#${CSS.escape(bar.getAttribute("aria-labelledby")!)}`);
    expect(name?.textContent).toBe("Ink reserve");
  });

  test("the clamped value is announced, not the raw one", () => {
    const { q } = mount(<Meter label="x" value={140} />);
    expect(q("meter-bar")!.getAttribute("aria-valuenow")).toBe("100");
    expect(q("meter-bar")!.getAttribute("aria-valuetext")).toBe("100%");
  });

  test("valueText replaces the percentage, printed and spoken", () => {
    const { q } = mount(<Meter label="Sheets" value={412} max={600} valueText="412 of 600 sheets" />);
    expect(q("meter-bar")!.getAttribute("aria-valuetext")).toBe("412 of 600 sheets");
    expect(q("meter-value")!.textContent).toBe("412 of 600 sheets");
  });

  test("no reading: no meter role, no invented value, and the words are shown", () => {
    const { q } = mount(<Meter label="Stock" value={null} emptyText="No reading yet" />);
    const bar = q("meter-bar")!;
    expect(bar.getAttribute("role")).toBeNull();
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(q("meter-empty")!.textContent).toBe("No reading yet");
    expect(q("meter-fill")).toBeNull();
  });

  test("loading is busy, empty, and reserves the bar's height", () => {
    const { q, container: c } = mount(<Meter label="Stock" value={68} isLoading />);
    expect(c.querySelector('[data-slot="meter"]')!.getAttribute("aria-busy")).toBe("true");
    expect(q("meter-fill")).toBeNull();
    expect(q("meter-bar")!.getBoundingClientRect().height).toBe(8);
  });
});

describe("Meter paints the designed bar", () => {
  test("an 8px sunken pill, filled to the value with the legible accent", () => {
    const { q } = mount(<Meter label="x" value={50} />);
    const track = q("meter-track")!;
    const fill = q("meter-fill")!;
    expect(track.getBoundingClientRect().height).toBe(8);
    expect(getComputedStyle(track).backgroundColor).toBe(tokenColor("--ui-bg-sunken"));
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent-legible"));
    expect(fill.getBoundingClientRect().width).toBeCloseTo(track.getBoundingClientRect().width / 2, 0);
  });

  test("the three states paint three different fills", () => {
    const fills = (["normal", "warning", "danger"] as const).map((s) => {
      const ui = s === "normal"
        ? <Meter label="x" value={60} />
        : <Meter label="x" value={60} status={s} statusText="words" />;
      const { q } = mount(ui);
      const color = getComputedStyle(q("meter-fill")!).backgroundColor;
      unmount();
      return color;
    });
    expect(new Set(fills).size).toBe(3);
    expect(fills[1]).toBe(tokenColor("--ui-intent-warning-fg"));
    expect(fills[2]).toBe(tokenColor("--ui-intent-danger-fg"));
  });

  test("label and value use the sheet's roles, the value with tabular figures", () => {
    const { q } = mount(<Meter label="Paper stock" value={68} />);
    const label = getComputedStyle(q("meter-label")!);
    const value = getComputedStyle(q("meter-value")!);
    expect(label.color).toBe(tokenColor("--ui-text-muted"));
    expect(value.color).toBe(tokenColor("--ui-text-primary"));
    expect(value.fontWeight).toBe("600");
    expect(value.fontVariantNumeric).toContain("tabular-nums");
    expect(label.fontSize).toBe(value.fontSize);
  });

  test("a target is a 2px border-strong rule at its position, across a 16px bar", () => {
    const { q } = mount(<Meter label="x" value={62} target={75} targetText="Target 75%" />, 400);
    const bar = q("meter-bar")!.getBoundingClientRect();
    const rule = q("meter-target")!;
    const r = rule.getBoundingClientRect();
    const s = getComputedStyle(rule);
    expect(bar.height).toBe(16);
    expect(r.height).toBe(16);
    expect(s.borderInlineStartWidth).toBe(tokenLength("--ui-stroke-thick"));
    expect(s.borderInlineStartColor).toBe(tokenColor("--ui-border-strong"));
    expect(r.left - bar.left).toBeCloseTo(bar.width * 0.75, 0);
    // In the second half the label ENDS at the rule, so it cannot overflow.
    const label = q("meter-target-label")!.getBoundingClientRect();
    expect(label.right).toBeCloseTo(r.left, 0);
    expect(label.right).toBeLessThanOrEqual(bar.right);
  });
});

describe("Meter, radial", () => {
  test("an 80px ring: sunken track and an arc in the fill role, the value centred", () => {
    const { q } = mount(<Meter label="Paper stock" value={68} shape="radial" />);
    const ring = q("meter-ring")!;
    expect(ring.getAttribute("role")).toBe("meter");
    expect(ring.getAttribute("aria-valuetext")).toBe("68%");
    const box = ring.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([80, 80]);
    expect(q<SVGPathElement>("meter-fill")!.getAttribute("d")).toBe("M40 6A34 34 0 1 1 9.24 54.48");
    const track = getComputedStyle(q("meter-track")!);
    expect(track.stroke).toBe(tokenColor("--ui-bg-sunken"));
    expect(track.strokeWidth).toBe("8px");
    expect(getComputedStyle(q("meter-fill")!).stroke).toBe(tokenColor("--ui-bg-accent-legible"));
    const v = q("meter-value")!.getBoundingClientRect();
    expect(v.left + v.width / 2).toBeCloseTo(box.left + 40, 0);
  });

  test("the label is screen-reader only, not removed", () => {
    const { q } = mount(<Meter label="Paper stock" value={68} shape="radial" />);
    const label = q("meter-label")!;
    expect(label.textContent).toBe("Paper stock");
    expect(getComputedStyle(label).display).not.toBe("none");
    expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  test("a status prints its words under the ring", () => {
    const { q } = mount(<Meter label="x" value={84} shape="radial" status="warning" statusText="near limit" />);
    expect(q("meter-status")!.textContent).toBe("near limit");
    expect(q("meter-ring")!.getAttribute("aria-valuetext")).toBe("84%, near limit");
  });
});

describe("Meter forwards per §5", () => {
  test("className, ref and native props land on the root", () => {
    let node: HTMLDivElement | null = null;
    const { container: c } = mount(
      <Meter ref={(n) => { node = n; }} label="x" value={1} className="max-w-sm" data-testid="m" />,
    );
    const el = c.querySelector<HTMLElement>('[data-slot="meter"]')!;
    expect(node).toBe(el);
    expect(el.classList.contains("max-w-sm")).toBe(true);
    expect(el.dataset.testid).toBe("m");
  });
});
