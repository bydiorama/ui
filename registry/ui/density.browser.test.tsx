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
 *      forwards unknown props to its popup, so it can, with no new API — and
 *      that claim is checked on Modal, Sheet, Drawer, Popover AND Menu
 *      (review finding M3: only Modal was checked before);
 *   5. a BRAND scope nested inside a compact page does not reset it back to
 *      default — the failure mode is CSS custom-property inheritance, which
 *      no assertion on source strings can see (review finding I2);
 *   6. density reaches every field-height consumer, not only Input — Select,
 *      Multiselect, DatePicker, the Sidebar search and Textarea's inset
 *      (review finding M2: only Input, Button and the chrome control were
 *      measured before).
 */
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { chromeControl } from "@/lib/chrome-control";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Modal } from "@/ui/modal/modal.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Drawer } from "@/ui/drawer/drawer.tsx";
import { Popover } from "@/ui/popover/popover.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { Multiselect, type MultiselectItem } from "@/ui/multiselect/multiselect.tsx";
import { DatePicker } from "@/ui/date-picker/date-picker.tsx";
import { Textarea } from "@/ui/textarea/textarea.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { resolveThemePair, toCss, THEME_ZERO } from "@bydiorama/tokens";

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
  document.getElementById("density-test-brand-style")?.remove();
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

/**
 * The rest of the field family (review finding M2: only Input was measured
 * before). Select, Multiselect and the Sidebar search read the same
 * `h-field-*` ladder Input does; DatePicker's trigger is fixed at `field-lg`.
 * Each is checked at default AND under a compact ancestor, because a
 * component reading the right TOKEN name is not the same claim as the token
 * actually reaching a rendered box (that is exactly how `--ui-border-width`
 * went unread for its whole life — ADR 0020's own opening finding).
 */
describe("density reaches the rest of the field family (review finding M2)", () => {
  const ITEMS: SelectItem[] = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ];
  const MULTI_ITEMS: MultiselectItem[] = ITEMS;

  const scoped = (c: HTMLElement, testid: string, slot: string) =>
    c.querySelector<HTMLElement>(`[data-testid="${testid}"] [data-slot="${slot}"]`);

  test("Select, Multiselect and DatePicker follow the field ladder, at default and under compact", () => {
    const c = mount(
      <>
        <div data-testid="select-default">
          <Select label="Pick" items={ITEMS} size="lg" onValueChange={() => {}} />
        </div>
        <div data-testid="select-compact" data-ui-density="compact">
          <Select label="Pick" items={ITEMS} size="lg" onValueChange={() => {}} />
        </div>
        <div data-testid="multiselect-default">
          <Multiselect label="Pick" items={MULTI_ITEMS} size="lg" onValueChange={() => {}} />
        </div>
        <div data-testid="multiselect-compact" data-ui-density="compact">
          <Multiselect label="Pick" items={MULTI_ITEMS} size="lg" onValueChange={() => {}} />
        </div>
        <div data-testid="date-picker-default">
          <DatePicker label="Deadline" />
        </div>
        <div data-testid="date-picker-compact" data-ui-density="compact">
          <DatePicker label="Deadline" />
        </div>
      </>,
    );
    expect(height(scoped(c, "select-default", "select-trigger"))).toBe(48);
    expect(height(scoped(c, "select-compact", "select-trigger"))).toBe(44);
    expect(height(scoped(c, "multiselect-default", "multiselect-trigger"))).toBe(48);
    expect(height(scoped(c, "multiselect-compact", "multiselect-trigger"))).toBe(44);
    expect(height(scoped(c, "date-picker-default", "date-picker-trigger"))).toBe(48);
    expect(height(scoped(c, "date-picker-compact", "date-picker-trigger"))).toBe(44);
  });

  test("the Sidebar search field is field-md's height, and moves under compact", () => {
    const c = mount(
      <>
        <div data-testid="search-default">
          <Sidebar label="Nav">
            <Sidebar.Search label="Search" />
          </Sidebar>
        </div>
        <div data-testid="search-compact" data-ui-density="compact">
          <Sidebar label="Nav">
            <Sidebar.Search label="Search" />
          </Sidebar>
        </div>
      </>,
    );
    expect(height(scoped(c, "search-default", "sidebar-search"))).toBe(40);
    expect(height(scoped(c, "search-compact", "sidebar-search"))).toBe(36);
  });

  test("Textarea's inset moves with density; its box height (rows × leading) does not", () => {
    // Textarea has no height token at all — ADR 0020 §4 deliberately leaves
    // it out, because the box is `rows` line boxes, not a fixed control
    // height. Only its padding is a density-sensitive `px-field-inset-*`.
    const c = mount(
      <>
        <div data-testid="ta-default">
          <Textarea label="Message" rows={3} />
        </div>
        <div data-testid="ta-compact" data-ui-density="compact">
          <Textarea label="Message" rows={3} />
        </div>
      </>,
    );
    const defaultTa = scoped(c, "ta-default", "textarea")!;
    const compactTa = scoped(c, "ta-compact", "textarea")!;
    expect(getComputedStyle(compactTa).paddingInlineStart).not.toBe(getComputedStyle(defaultTa).paddingInlineStart);
    expect(height(compactTa)).toBe(height(defaultTa));
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

  /**
   * Every overlay panel forwards unknown props to its popup part, so
   * `data-ui-density` needs no new API on any of them — proven here on all
   * five that portal (review finding M3: only Modal was checked before).
   * Each renders its OWN popup element with `data-ui-density="compact"`,
   * because that is the API surface a consumer actually uses; the point is
   * that the prop lands on the real DOM node, not that any one component's
   * internals are special-cased for it.
   */
  const PORTAL_CASES: ReadonlyArray<[name: string, ui: ReactElement]> = [
    [
      "Modal",
      <Modal key="modal">
        <Modal.Trigger render={<Button>Open</Button>} />
        <Modal.Surface data-ui-density="compact">
          <Modal.Title>Compact</Modal.Title>
          <Button size="lg" data-testid="in-panel">Save</Button>
        </Modal.Surface>
      </Modal>,
    ],
    [
      "Sheet",
      <Sheet key="sheet">
        <Sheet.Trigger>Open</Sheet.Trigger>
        <Sheet.Panel label="Compact" data-ui-density="compact">
          <Button size="lg" data-testid="in-panel">Save</Button>
        </Sheet.Panel>
      </Sheet>,
    ],
    [
      "Drawer",
      <Drawer key="drawer">
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Panel label="Compact" data-ui-density="compact">
          <Drawer.Body>
            <Button size="lg" data-testid="in-panel">Save</Button>
          </Drawer.Body>
        </Drawer.Panel>
      </Drawer>,
    ],
    [
      "Popover",
      <Popover key="popover">
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Panel data-ui-density="compact">
          <Button size="lg" data-testid="in-panel">Save</Button>
        </Popover.Panel>
      </Popover>,
    ],
    [
      "Menu",
      <Menu key="menu">
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel data-ui-density="compact">
          <Button size="lg" data-testid="in-panel">Save</Button>
        </Menu.Panel>
      </Menu>,
    ],
  ];

  test.each(PORTAL_CASES)("%s's popup part takes the attribute, with no new API", async (_name, ui) => {
    mount(<div data-ui-density="compact">{ui}</div>);
    await userEvent.click(document.querySelector("button")!);
    await expect.poll(() => document.querySelector('[data-testid="in-panel"]')).toBeTruthy();
    const inPanel = document.querySelector('[data-testid="in-panel"]')!;
    // Every one of these portals to <body>, OUTSIDE the compact wrapper; each
    // is compact only because the attribute travelled with its popup part.
    expect(inPanel.closest('[data-ui-density="compact"]')).not.toBeNull();
    expect(height(inPanel)).toBe(40);
  });
});

describe("a brand scope does not reset an ancestor's density (review finding I2)", () => {
  test("a control inside [data-ui-theme] still inherits the compact ancestor", () => {
    // The real-world shape this guards: an app nests a brand's stylesheet
    // (`toCss(pair, { scope: '[data-ui-theme="acme"]' })`, exactly the usage
    // that option's own doc comment names) inside a page that is compact
    // everywhere. Emitting the brand block with the documented default
    // (`includeBase: true`) used to re-declare every control/field size on
    // `[data-ui-theme="acme"]` itself — an element's own declaration always
    // wins over an inherited one, so every control under the brand silently
    // reset to default height, invisible to any assertion on CSS source text.
    const style = document.createElement("style");
    style.id = "density-test-brand-style";
    style.textContent = toCss(resolveThemePair(THEME_ZERO), { scope: '[data-ui-theme="acme"]', includeBase: true });
    document.head.appendChild(style);

    const c = mount(
      <div data-ui-density="compact">
        <div data-ui-theme="acme">
          <Button size="lg" data-testid="branded">Save</Button>
        </div>
      </div>,
    );
    expect(height(control(c, "branded"))).toBe(40);
  });
});
