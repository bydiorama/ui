/**
 * One rule, asserted across every component that takes an icon.
 *
 * An `icon` prop is a SLOT: the caller passes an element and the component
 * never wraps it (§3). What that leaves unsaid is who decides its size — and
 * the answer was nobody. griddy's IconBase renders `width="24" height="24"` as
 * presentation attributes, so an unconstrained slot shipped the icon library's
 * default: 24px in a 24px `sm` button, where the glyph exactly filled the
 * control, and 24px beside 16px text everywhere else. The sheet draws 16 at
 * every button size, and every gate was green throughout, because a size the
 * component never sets is a size no per-component test thinks to check.
 *
 * This file exists so the next component with an icon slot fails here rather
 * than shipping. It lives outside any one component's folder deliberately: the
 * rule is the system's, not Button's.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";
import { InfoCircle, Search } from "griddy-icons";

import { Badge } from "@/ui/badge/badge.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Accordion } from "@/ui/accordion/accordion.tsx";
import { Input } from "@/ui/input/input.tsx";
import { chromeControl } from "@/lib/chrome-control";
import { Header } from "@/ui/header/header.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

/** The sheet's icon size, drawn identically at every control size. */
const ICON = 16;

const CASES: Array<[name: string, ui: ReactElement]> = [
  ["Button lg", <Button size="lg" icon={<Search />} iconEnd={<Search />}>Go</Button>],
  ["Button md", <Button size="md" icon={<Search />}>Go</Button>],
  ["Button sm", <Button size="sm" icon={<Search />}>Go</Button>],
  ["Button icon-only lg", <Button size="lg" isIconOnly aria-label="Search" icon={<Search />} />],
  ["Button icon-only sm", <Button size="sm" isIconOnly aria-label="Search" icon={<Search />} />],
  ["Input lg", <Input label="Query" size="lg" icon={<Search />} iconEnd={<Search />} />],
  ["Input sm", <Input label="Query" size="sm" icon={<Search />} />],
  ["Banner", <Banner icon={<InfoCircle />} onDismiss={() => {}} dismissLabel="Dismiss">Message</Banner>],
  [
    // The trigger carries TWO marks at 16px: the caller's icon slot and the
    // component's own chevron. Only the slot is at risk of arriving oversize,
    // but both are measured — this file asserts every svg in the mounted tree.
    "Accordion trigger",
    <Accordion>
      <Accordion.Item value="a">
        <Accordion.Trigger icon={<Search />}>Question</Accordion.Trigger>
        <Accordion.Panel>Answer</Accordion.Panel>
      </Accordion.Item>
    </Accordion>,
  ],
  [
    "Sidebar item",
    <Sidebar label="Primary"><Sidebar.Item href="#a" icon={<Search />}>Row</Sidebar.Item></Sidebar>,
  ],
  [
    "Header menu button",
    <Header><Header.End><Header.MenuButton label="Open primary navigation" /></Header.End></Header>,
  ],
  [
    "chrome control",
    // The shared recipe sizes its own slot too. It is a lib rather than a
    // component, so no per-component test would ever have covered it.
    <button type="button" aria-label="Back" className={chromeControl()}><Search /></button>,
  ],
  [
    "Sidebar section",
    <Sidebar label="Primary">
      <Sidebar.Section label="Brand" icon={<Search />}>
        <Sidebar.Item href="#a">Row</Sidebar.Item>
      </Sidebar.Section>
    </Sidebar>,
  ],
];

describe("every icon slot is sized by the component, not by the icon library", () => {
  for (const [name, ui] of CASES) {
    test(`${name} renders its icons at ${ICON}px`, () => {
      const c = mount(ui);
      const svgs = Array.from(c.querySelectorAll<SVGElement>("svg"));
      expect(svgs.length, "no icon rendered — the case is not testing anything").toBeGreaterThan(0);
      for (const svg of svgs) {
        const box = svg.getBoundingClientRect();
        expect(Math.round(box.width), `${name}: ${box.width}px wide`).toBe(ICON);
        expect(Math.round(box.height), `${name}: ${box.height}px tall`).toBe(ICON);
      }
    });
  }

  test("Badge keeps its OWN smaller icon at sm — the rule is per component, not global", () => {
    // `iconEnd`, not `icon` — Badge has only the trailing slot, because the
    // sheet draws its mark on the right. Writing `icon` here silently rendered
    // nothing, which is what JSX does with a prop a component does not declare.
    const c = mount(
      <>
        <div id="md"><Badge size="md" iconEnd={<Search />}>Badge</Badge></div>
        <div id="sm"><Badge size="sm" iconEnd={<Search />}>Badge</Badge></div>
      </>,
    );
    const md = c.querySelector<SVGElement>("#md svg")!;
    const sm = c.querySelector<SVGElement>("#sm svg")!;
    // Badge was the only component that ever sized its slot, and it sizes it
    // per badge size. Asserted as a DIFFERENCE so a well-meant sweep that made
    // everything 16 would fail here rather than silently flatten the pair.
    expect(Math.round(md.getBoundingClientRect().width)).toBe(16);
    expect(Math.round(sm.getBoundingClientRect().width)).toBe(12);
  });

  test("a caller can still override the slot size — §5 forwarding", () => {
    const c = mount(<Button size="lg" className="[&_svg]:size-6" icon={<Search />}>Go</Button>);
    const svg = c.querySelector<SVGElement>("svg")!;
    // The component decides the default; the consumer decides. If tailwind-merge
    // ever stopped resolving the arbitrary variant, this would silently pin at 16.
    expect(Math.round(svg.getBoundingClientRect().width)).toBe(24);
  });
});
