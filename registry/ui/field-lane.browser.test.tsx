/**
 * The field family's text lane, measured (lib/field-lane).
 *
 * A field's label, its helper and its error start at the same edge as the
 * text typed in the control: the control's border plus its inline padding.
 * The family used to disagree (flush, a fixed 8px, or one of each), so a form
 * mixing Input and Select zig-zagged. Only a rendered box can prove the lane,
 * because the padding is a density token and the border a brand stroke.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { Input } from "@/ui/input/input.tsx";
import { Textarea } from "@/ui/textarea/textarea.tsx";
import { Select } from "@/ui/select/select.tsx";
import { Combobox } from "@/ui/combobox/combobox.tsx";
import { DatePicker } from "@/ui/date-picker/date-picker.tsx";
import { Multiselect } from "@/ui/multiselect/multiselect.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "360px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Where an element's CONTENT starts: its box, plus its border and padding. */
const contentEdge = (el: Element) => {
  const s = getComputedStyle(el);
  return el.getBoundingClientRect().left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
};
/**
 * Same lane, to the half pixel. The control's 1.5px hairline renders 1px at
 * devicePixelRatio 1 (Chromium floors borders to device pixels; see the note
 * in input.tsx and border-hairline.browser.test.tsx), while the lane's calc
 * reads the token's 1.5. At 2x, where the design is drawn, they are exact.
 */
const onLane = (edge: number, text: number, what = "") =>
  expect(Math.abs(edge - text), `${what} is ${edge - text}px off the text lane`).toBeLessThanOrEqual(0.51);
const q = (c: ParentNode, slot: string) => c.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;

const ITEMS = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];
const SIZES = ["lg", "md", "sm"] as const;

describe("label, helper, error and the typed text share one lane", () => {
  for (const size of SIZES) {
    test(`Input, ${size}, every shape`, () => {
      for (const shape of [undefined, "soft", "full"] as const) {
        const c = mount(
          <Input label="Workspace name" size={size} {...(shape ? { shape } : {})} helperText="Shown to everyone you invite." defaultValue="Brand research" />,
        );
        const text = contentEdge(q(c, "input"));
        onLane(contentEdge(q(c, "label")), text, `label, ${shape ?? "themed"}`);
        onLane(contentEdge(q(c, "helper")), text, `helper, ${shape ?? "themed"}`);
        act(() => root?.unmount());
        container?.remove();
      }
    });

    test(`Textarea, ${size}`, () => {
      const c = mount(<Textarea label="Notes" size={size} helperText="Markdown works." errorText="Too short." />);
      const text = contentEdge(q(c, "textarea"));
      onLane(contentEdge(q(c, "label")), text);
      onLane(contentEdge(q(c, "helper")), text);
      onLane(contentEdge(q(c, "error")), text);
    });

    test(`Select, ${size}`, () => {
      const c = mount(<Select label="Status" size={size} items={ITEMS} helperText="Visible to the team." />);
      const text = q(c, "select-value").getBoundingClientRect().left;
      onLane(contentEdge(q(c, "select-label")), text);
      onLane(contentEdge(q(c, "select-helper")), text);
    });

    test(`Combobox, ${size}, both shapes`, () => {
      for (const shape of ["soft", "full"] as const) {
        const c = mount(<Combobox label="Owner" size={size} shape={shape} items={ITEMS} helperText="Search by name." />);
        const text = q(c, "combobox-input").getBoundingClientRect().left;
        onLane(contentEdge(q(c, "combobox-label")), text, shape);
        onLane(contentEdge(q(c, "combobox-helper")), text, shape);
        act(() => root?.unmount());
        container?.remove();
      }
    });

    test(`Multiselect, ${size}`, () => {
      const c = mount(<Multiselect label="Tags" size={size} items={ITEMS} />);
      onLane(contentEdge(q(c, "multiselect-label")), contentEdge(q(c, "multiselect-trigger")), "label");
    });
  }

  test("DatePicker", () => {
    const c = mount(<DatePicker label="Due" helperText="Weekdays only." />);
    const text = q(c, "date-picker-value").getBoundingClientRect().left;
    onLane(contentEdge(q(c, "date-picker-label")), text);
    onLane(contentEdge(q(c, "date-picker-helper")), text);
  });

  test("the lane follows density: compact and comfortable move label and text together", () => {
    for (const density of ["compact", "comfortable"] as const) {
      const c = mount(
        <div data-ui-density={density}>
          <Input label="Workspace name" size="md" shape="soft" helperText="Shown to everyone." defaultValue="Brand" />
        </div>,
      );
      const text = contentEdge(q(c, "input"));
      onLane(contentEdge(q(c, "label")), text, density);
      onLane(contentEdge(q(c, "helper")), text, density);
      act(() => root?.unmount());
      container?.remove();
    }
  });
});
