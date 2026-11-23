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
 *      measured before);
 *   7. a compact CHOICE ROW (Checkbox, Radio, Switch) may be shorter than
 *      24px while its hit target is not — measured by hit-testing, because
 *      the target is a pseudo-element no box measurement can see;
 *   8. ROWS and TYPE follow density too (ADR 0025): menu, option and Sidebar
 *      rows are 32px under compact and set in the stepped roles, NavRail's
 *      squares step to 28px, a field's label to 12px and its md value to
 *      13px — and the stepped type follows a brand scope's own baseSize at
 *      every nesting, which re-binding the role tokens could not.
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
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { NavRail } from "@/ui/nav-rail/nav-rail.tsx";
import { Radio, RadioGroup } from "@/ui/radio/radio.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
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
  document.getElementById("density-test-big-brand-style")?.remove();
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

/**
 * A dense table's rows were forced to 24px by the checkbox in them: the
 * choice rows padded the LABEL to the target floor, so the row and the target
 * were one box. Compact now releases the row (--ui-choice-row-min-height: 0)
 * and carries the target on a ::before instead — so the two claims are
 * measured separately. The row is a layout fact (offsetHeight); the target is
 * a HIT-TESTING fact, so it is measured with elementFromPoint, the browser's
 * own answer to "what does a pointer here land on". A pseudo-element hit
 * resolves to its label; scanning a vertical line through the row and
 * counting the span that lands inside the label is the target's height.
 */
describe("compact choice rows keep a 24px target (SC 2.5.8)", () => {
  const ROWS = [
    ["checkbox", <Checkbox key="c" isLabelHidden>Select Brief A</Checkbox>],
    [
      "radio",
      <RadioGroup key="r" label="Brief" isLabelHidden>
        <Radio value="a">Brief A</Radio>
      </RadioGroup>,
    ],
    ["switch", <Switch key="s">Agent</Switch>],
  ] as const;

  /** The target's height: the run of points on the row's vertical centre line
   *  whose hit lands in the label, sampled every 0.25px from 12px above to
   *  12px below the row. Pseudo-element hits resolve to the label itself. */
  function targetHeight(label: HTMLElement): number {
    const box = label.getBoundingClientRect();
    // Over the control — the left edge of the row plus a few px — so the
    // probe crosses the box/track, the part a dense row is built around.
    const x = box.left + 4;
    const step = 0.25;
    let hits = 0;
    for (let y = box.top - 12; y <= box.bottom + 12; y += step) {
      const hit = document.elementFromPoint(x, y);
      if (hit && label.contains(hit)) hits++;
    }
    return hits * step;
  }

  for (const [name, row] of ROWS) {
    test(`${name}: the row falls under 24px under compact, and the target does not`, () => {
      // Padding around the row so the scan's margins land on the page, not
      // on the edge of the viewport.
      const c = mount(
        <div data-ui-density="compact" className="p-xl">
          {row}
        </div>,
      );
      const label = c.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
      expect(height(label)).toBeLessThan(24);
      expect(targetHeight(label)).toBeGreaterThanOrEqual(24);
    });

    test(`${name}: default density is unchanged — the row IS the 24px target`, () => {
      const c = mount(<div className="p-xl">{row}</div>);
      const label = c.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
      expect(height(label)).toBe(24);
      // The pseudo coincides with the row, so the target is the row: 24px to
      // within the scan's resolution (both edges sampled inclusively, and a
      // hit test rounds to device pixels — 1px of slack, never 4).
      expect(Math.abs(targetHeight(label) - 24)).toBeLessThanOrEqual(1);
    });

    test(`${name}: default inside compact restores the 24px row`, () => {
      const c = mount(
        <div data-ui-density="compact">
          <div data-ui-density="default" className="p-xl">
            {row}
          </div>
        </div>,
      );
      expect(height(c.querySelector(`[data-slot="${name}"]`))).toBe(24);
    });
  }

  test("the pseudo sits under the row's content: a click on the box or text still lands on it", () => {
    const c = mount(
      <div data-ui-density="compact" className="p-xl">
        <Checkbox>Select Brief A</Checkbox>
      </div>,
    );
    for (const part of ["control", "label"]) {
      const el = c.querySelector<HTMLElement>(`[data-slot="checkbox"] [data-slot="${part}"]`)!;
      const r = el.getBoundingClientRect();
      expect(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)).toBe(el);
    }
  });

  test("a click in the extended margin toggles the control", () => {
    const c = mount(
      <div data-ui-density="compact" className="p-xl">
        <Checkbox>Select Brief A</Checkbox>
      </div>,
    );
    const label = c.querySelector<HTMLElement>('[data-slot="checkbox"]')!;
    const input = label.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    const r = label.getBoundingClientRect();
    // 1px above the visible row: outside the label's own box, inside the target.
    const hit = document.elementFromPoint(r.left + 4, r.top - 1) as HTMLElement;
    expect(hit).toBe(label);
    act(() => hit.click());
    expect(input.checked).toBe(true);
  });
});

/**
 * ADR 0025. Rows had no density at all: a menu row was `p-md text-body-md`
 * (~46px) and a Sidebar row 46px at 16px, so the first dense consumer passed
 * `className="p-sm text-body-sm"` to every Menu.Item and wrote its own
 * sidebar. Each claim is measured at default (the drawn geometry, unchanged)
 * and under compact, because reading the right token is not the same claim
 * as the token reaching a box.
 */
describe("rows follow density (ADR 0025)", () => {
  const px = (el: Element | null) => parseFloat(getComputedStyle(el as Element).fontSize);
  const weight = (el: Element | null) => parseFloat(getComputedStyle(el as Element).fontWeight);
  const slot = (scope: ParentNode, name: string) => scope.querySelector<HTMLElement>(`[data-slot="${name}"]`);

  function OpenMenu({ density }: { density?: "compact" | "default" }) {
    return (
      <Menu defaultIsOpen>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel {...(density ? { "data-ui-density": density } : {})}>
          <Menu.Group label="Item">
            <Menu.Item>Rename</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item>
          </Menu.Group>
        </Menu.Panel>
      </Menu>
    );
  }

  test("Menu: a ~46px body-md row at default, a 32px dense-md row under compact", async () => {
    mount(<OpenMenu />);
    await expect.poll(() => slot(document, "menu-item")).toBeTruthy();
    const row = slot(document, "menu-item")!;
    expect(height(row)).toBe(46);
    expect(px(row)).toBe(14);
    expect(getComputedStyle(row).paddingInlineStart).toBe("12px");
    act(() => root!.unmount());
    root = createRoot(container!);

    act(() => root!.render(<OpenMenu density="compact" />));
    await expect.poll(() => slot(document, "menu-item")).toBeTruthy();
    const dense = slot(document, "menu-item")!;
    expect(height(dense)).toBe(32);
    expect(px(dense)).toBe(13);
    expect(weight(dense)).toBe(400);
    expect(getComputedStyle(dense).paddingInlineStart).toBe("8px");
    // The group label rides the rows' inline lane.
    expect(getComputedStyle(slot(document, "menu-group-label")!).paddingInlineStart).toBe("8px");
  });

  test("Select: options follow the trigger's density into the portal — 46px at default, 32px under compact", async () => {
    const ITEMS: SelectItem[] = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Bravo" },
    ];
    const c = mount(
      <div data-ui-density="compact">
        <Select label="Pick" items={ITEMS} size="md" onValueChange={() => {}} />
      </div>,
    );
    // The md trigger's value steps to dense-md; its label to label-sm.
    expect(px(slot(c, "select-trigger"))).toBe(13);
    expect(px(slot(c, "select-label"))).toBe(12);
    await userEvent.click(slot(c, "select-trigger")!);
    await expect.poll(() => slot(document, "select-option")).toBeTruthy();
    // The list portals to <body>, OUTSIDE the compact wrapper: it is compact
    // only because Select carried the trigger's density onto its popup.
    const panel = slot(document, "select-panel")!;
    expect(c.contains(panel)).toBe(false);
    expect(panel.getAttribute("data-ui-density")).toBe("compact");
    expect(height(slot(document, "select-option"))).toBe(32);
    expect(px(slot(document, "select-option"))).toBe(13);
  });

  test("Select at default density: 46px options, and no density attribute is invented", async () => {
    const ITEMS: SelectItem[] = [{ value: "a", label: "Alpha" }];
    const c = mount(<Select label="Pick" items={ITEMS} size="md" onValueChange={() => {}} />);
    expect(px(slot(c, "select-trigger"))).toBe(14);
    await userEvent.click(slot(c, "select-trigger")!);
    await expect.poll(() => slot(document, "select-option")).toBeTruthy();
    expect(slot(document, "select-panel")!.hasAttribute("data-ui-density")).toBe(false);
    expect(height(slot(document, "select-option"))).toBe(46);
  });

  function Rail({ density, layer }: { density?: "compact" | "default"; layer?: string }) {
    return (
      <div data-ui-density={density}>
        <Sidebar label="Nav" layer={layer ?? null}>
          <Sidebar.Main>
            <Sidebar.Profile name="Jakub" email="j@example.com" layer="profile" />
            <Sidebar.Search label="Search" />
            <Sidebar.Section label="Brand">
              <Sidebar.Item href="/a">Assets</Sidebar.Item>
            </Sidebar.Section>
            <Sidebar.Item href="/x">Exports</Sidebar.Item>
          </Sidebar.Main>
          <Sidebar.Layer id="profile" title="Profile" backLabel="Back">
            <Sidebar.Item href="/b">Brand</Sidebar.Item>
          </Sidebar.Layer>
        </Sidebar>
      </div>
    );
  }

  test("Sidebar: 46px rows at 16px by default; 32px rows at 13px under compact", () => {
    const def = mount(<Rail />);
    for (const name of ["sidebar-item", "sidebar-section-label"]) {
      expect(height(slot(def, name)), name).toBe(46);
      expect(px(slot(def, name)), name).toBe(16);
    }
    expect(px(slot(def, "sidebar-profile-name"))).toBe(16);
    act(() => root!.unmount());
    container!.remove();

    const c = mount(<Rail density="compact" />);
    for (const name of ["sidebar-item", "sidebar-section-label"]) {
      expect(height(slot(c, name)), name).toBe(32);
      expect(px(slot(c, name)), name).toBe(13);
    }
    // Weight is the role's and the declared exception's, unchanged in kind:
    // items at body-sm's 500, the section heading still bold.
    expect(weight(slot(c, "sidebar-item"))).toBe(500);
    expect(weight(slot(c, "sidebar-section-label"))).toBe(600);
    expect(px(slot(c, "sidebar-profile-name"))).toBe(13);
    expect(px(c.querySelector('[data-slot="sidebar-search"] input'))).toBe(13);
  });

  test("Sidebar: compact labels share the 16px lane the compact search text sits on", () => {
    const c = mount(<Rail density="compact" />);
    const lane = (el: Element) => el.getBoundingClientRect().left;
    const itemText = c.querySelector('[data-slot="sidebar-item"] [data-slot="sidebar-text"]')!;
    const searchInput = c.querySelector<HTMLInputElement>('[data-slot="sidebar-search"] input')!;
    const rail = slot(c, "sidebar")!;
    expect(lane(itemText) - lane(rail)).toBe(16);
    expect(lane(searchInput) - lane(rail)).toBe(16);
  });

  test("Sidebar: a layer's title is a 32px row under compact", () => {
    const c = mount(<Rail density="compact" layer="profile" />);
    expect(height(slot(c, "sidebar-layer-title"))).toBe(32);
    expect(px(slot(c, "sidebar-layer-title"))).toBe(13);
  });

  test("default inside compact restores the drawn rows and their type", () => {
    const c = mount(
      <div data-ui-density="compact">
        <Rail density="default" />
      </div>,
    );
    expect(height(slot(c, "sidebar-item"))).toBe(46);
    expect(px(slot(c, "sidebar-item"))).toBe(16);
  });

  test("NavRail: 32px squares at default, 28px under compact, on the rail's axis", () => {
    const rail = (density?: "compact") => (
      <div data-ui-density={density}>
        <NavRail label="Primary">
          <NavRail.Section label="Workspace">
            <NavRail.Item icon={<svg aria-hidden="true" />} label="Overview" href="/o" />
          </NavRail.Section>
          <NavRail.Item icon={<svg aria-hidden="true" />} label="Search" />
        </NavRail>
      </div>
    );
    const def = mount(rail());
    for (const item of def.querySelectorAll('[data-slot="nav-rail-item"]')) expect(height(item)).toBe(32);
    act(() => root!.unmount());
    container!.remove();

    const c = mount(rail("compact"));
    const box = slot(c, "nav-rail")!.getBoundingClientRect();
    for (const item of c.querySelectorAll('[data-slot="nav-rail-item"]')) {
      expect(height(item)).toBe(28);
      const r = item.getBoundingClientRect();
      expect(r.left + r.width / 2).toBeCloseTo(box.left + box.width / 2, 1);
    }
  });

  test("fields: label-md → label-sm and the md value body-md → dense-md under compact; lg keeps body-md", () => {
    const c = mount(
      <>
        <div data-testid="d"><Input label="Name" size="md" /></div>
        <div data-testid="c" data-ui-density="compact">
          <Input label="Name" size="md" />
          <Input label="Name" size="lg" data-testid="lg" />
          <Textarea label="Note" />
        </div>
      </>,
    );
    const d = c.querySelector('[data-testid="d"]')!;
    const k = c.querySelector('[data-testid="c"]')!;
    expect(px(slot(d, "label"))).toBe(13);
    expect(px(d.querySelector("input"))).toBe(14);
    expect(px(slot(k, "label"))).toBe(12);
    expect(weight(slot(k, "label"))).toBe(600);
    expect(px(k.querySelector("input"))).toBe(13);
    // The input sets its own `font-medium` over the role at every density.
    expect(weight(k.querySelector("input"))).toBe(weight(d.querySelector("input")));
    expect(px(k.querySelector('[data-testid="lg"]'))).toBe(14);
    expect(px(k.querySelector("textarea"))).toBe(14);
  });

  test("every compact row clears the 24px target floor", async () => {
    mount(<OpenMenu density="compact" />);
    await expect.poll(() => slot(document, "menu-item")).toBeTruthy();
    for (const row of document.querySelectorAll('[data-slot="menu-item"]')) {
      expect(height(row)).toBeGreaterThanOrEqual(24);
    }
  });

  /**
   * Why the stepped roles are a calc() on `--ui-type-step` and not a
   * re-binding of `--ui-text-body-lg` under `[data-ui-density]`. A brand
   * scope re-declares every role token on itself, so a re-bound role would
   * be reset to the brand's DEFAULT size inside it — finding I2 again, for
   * type. The switch is a bare number that a brand scope never declares,
   * and the mix is evaluated on the row, against the brand's own tokens.
   */
  test("a brand scope inside a compact page steps against its own baseSize", () => {
    const big = { ...THEME_ZERO, typography: { ...THEME_ZERO.typography, baseSize: 18 } };
    const style = document.createElement("style");
    style.id = "density-test-big-brand-style";
    style.textContent = toCss(resolveThemePair(big), { scope: '[data-ui-theme="big"]', includeBase: true });
    document.head.appendChild(style);

    const c = mount(
      <>
        <div data-testid="default" data-ui-theme="big">
          <Rail />
        </div>
        <div data-testid="compact" data-ui-density="compact">
          <div data-ui-theme="big">
            <Rail />
          </div>
        </div>
      </>,
    );
    const item = (id: string) => c.querySelector(`[data-testid="${id}"] [data-slot="sidebar-item"]`);
    // body-lg and body-sm scaled by 18/16.
    expect(px(item("default"))).toBe(18);
    expect(px(item("compact"))).toBeCloseTo(13 * 18 / 16, 2);
    expect(height(item("compact"))).toBe(32);
  });
});
