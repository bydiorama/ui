/**
 * Density, measured on real controls (ADR 0020 §4).
 *
 * Density is a MODE, not a brand value: `[data-ui-density]` re-binds the
 * control and field sizes for its subtree, so a dense inspector can sit in a
 * default page. Four things only a rendered box can prove:
 *
 *   1. default density draws exactly the ladders the size maps used to spell
 *      as `h-11`/`h-12` — the migration moved nothing;
 *   2. each mode moves every height by 4px, and compact never goes under the
 *      24px SC 2.5.8 floor;
 *   3. modes nest — `default` inside `compact` returns to default;
 *   4. a PORTALLED surface leaves the subtree (the ADR 0017 §4 trap), so the
 *      attribute has to travel with the popup part. Every overlay panel
 *      forwards unknown props to its popup, so it can, with no new API.
 */
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { chromeControl } from "@/lib/chrome-control";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Modal } from "@/ui/modal/modal.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

/** LAYOUT height, not the painted box: a panel's enter animation scales its
 *  contents, and getBoundingClientRect reports the transform (a 40px button
 *  measured 39.2 mid-entrance). Density is a layout fact. */
const height = (el: Element | null) => (el as HTMLElement).offsetHeight;
const control = (c: HTMLElement, name: string) => c.querySelector(`[data-testid="${name}"]`);

function Controls({ density }: { density?: "compact" | "default" | "comfortable" }) {
  return (
    <div data-ui-density={density}>
      <Button size="lg" data-testid="button-lg">Save</Button>
      <Button size="md" data-testid="button-md">Save</Button>
      <Button size="sm" data-testid="button-sm">Save</Button>
      <button type="button" aria-label="Back" data-testid="chrome" className={chromeControl()} />
      <Input label="Name" size="lg" data-testid="input-lg" />
      <Input label="Name" size="md" data-testid="input-md" />
      <Input label="Name" size="sm" data-testid="input-sm" />
    </div>
  );
}

/** The field's drawn box — the part that carries the height, not the label. */
const field = (c: HTMLElement, name: string) => control(c, name)?.closest('[data-slot="control"]') ?? control(c, name);

describe("default density is the drawn ladders", () => {
  test("actions 44/32/24, the chrome control 32, fields 48/40/32", () => {
    const c = mount(<Controls />);
    expect(height(control(c, "button-lg"))).toBe(44);
    expect(height(control(c, "button-md"))).toBe(32);
    expect(height(control(c, "button-sm"))).toBe(24);
    expect(height(control(c, "chrome"))).toBe(32);
    expect(height(field(c, "input-lg"))).toBe(48);
    expect(height(field(c, "input-md"))).toBe(40);
    expect(height(field(c, "input-sm"))).toBe(32);
  });
});

describe("each mode moves every height by 4px, floored at 24", () => {
  test("compact: 40/28/24 actions — sm holds at the floor — and 44/36/28 fields", () => {
    const c = mount(<Controls density="compact" />);
    expect(height(control(c, "button-lg"))).toBe(40);
    expect(height(control(c, "button-md"))).toBe(28);
    expect(height(control(c, "button-sm"))).toBe(24);
    expect(height(control(c, "chrome"))).toBe(28);
    expect(height(field(c, "input-lg"))).toBe(44);
    expect(height(field(c, "input-md"))).toBe(36);
    expect(height(field(c, "input-sm"))).toBe(28);
  });

  test("comfortable: 48/36/28 actions and 52/44/36 fields", () => {
    const c = mount(<Controls density="comfortable" />);
    expect(height(control(c, "button-lg"))).toBe(48);
    expect(height(control(c, "button-md"))).toBe(36);
    expect(height(control(c, "button-sm"))).toBe(28);
    expect(height(field(c, "input-lg"))).toBe(52);
  });

  test("the inset moves with the height; type does not", () => {
    const c = mount(
      <>
        <Controls />
        <div data-testid="compact"><Controls density="compact" /></div>
      </>,
    );
    const [def, compact] = [...c.querySelectorAll('[data-testid="button-lg"]')] as HTMLElement[];
    expect(getComputedStyle(def!).paddingInlineStart).toBe("16px");
    expect(getComputedStyle(compact!).paddingInlineStart).toBe("12px");
    expect(getComputedStyle(compact!).fontSize).toBe(getComputedStyle(def!).fontSize);
  });
});

describe("modes are scoped, and nest", () => {
  test("default inside compact returns to default", () => {
    const c = mount(
      <div data-ui-density="compact">
        <Button size="lg" data-testid="outer">Outer</Button>
        <div data-ui-density="default">
          <Button size="lg" data-testid="inner">Inner</Button>
        </div>
      </div>,
    );
    expect(height(control(c, "outer"))).toBe(40);
    expect(height(control(c, "inner"))).toBe(44);
  });

  test("a portalled panel takes the attribute on its popup part, with no new API", async () => {
    mount(
      <div data-ui-density="compact">
        <Modal>
          <Modal.Trigger render={<Button>Open</Button>} />
          <Modal.Surface data-ui-density="compact">
            <Modal.Title>Compact</Modal.Title>
            <Button size="lg" data-testid="in-modal">Save</Button>
          </Modal.Surface>
        </Modal>
      </div>,
    );
    await userEvent.click(document.querySelector("button")!);
    await expect.poll(() => document.querySelector('[data-testid="in-modal"]')).toBeTruthy();
    // The modal portals to <body>, OUTSIDE the compact wrapper; it is compact
    // only because the attribute travelled with its popup part.
    expect(document.querySelector('[data-testid="in-modal"]')!.closest('[data-ui-density="compact"]')).not.toBeNull();
    expect(height(document.querySelector('[data-testid="in-modal"]'))).toBe(40);
  });
});
