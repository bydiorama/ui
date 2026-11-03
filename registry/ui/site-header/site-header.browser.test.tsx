import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { SiteHeader, type SiteHeaderItem, type SiteHeaderProps } from "./site-header.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

/** A role's resolved colour, read the way the page reads it. */
function probe(token: string) {
  const p = document.createElement("div");
  p.style.color = `var(${token})`;
  document.body.appendChild(p);
  const v = getComputedStyle(p).color;
  p.remove();
  return v;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

const ITEMS: SiteHeaderItem[] = [
  { label: "Work", href: "#work" },
  { label: "Studio", href: "#studio", isCurrent: true },
  { label: "Journal", href: "#journal" },
];

/** `wide` sets the point under any test viewport, `narrow` over it. */
function Bar({ layout, ...props }: Partial<SiteHeaderProps> & { layout: "wide" | "narrow" }) {
  return (
    <SiteHeader
      brand={{ label: "Diorama" }}
      items={ITEMS}
      cta={{ label: "Book a call", href: "#contact" }}
      collapseBelow={layout === "wide" ? "10rem" : "200rem"}
      affix={false}
      {...props}
    />
  );
}

const q = <T extends HTMLElement = HTMLElement>(c: ParentNode, slot: string) =>
  c.querySelector<T>(`[data-slot="${slot}"]`)!;
const shown = (el: Element) => getComputedStyle(el).display !== "none";

describe("SiteHeader layout", () => {
  test("above the point: wordmark, quiet links and the CTA — and no menu control", () => {
    const c = mount(<Bar layout="wide" />);
    expect(shown(q(c, "header-nav"))).toBe(true);
    expect(shown(q(c, "site-header-cta"))).toBe(true);
    expect(shown(q(c, "site-header-menu"))).toBe(false);
    expect(q(c, "header").getBoundingClientRect().height).toBe(48);
    expect(getComputedStyle(q(c, "header")).paddingInline).toBe("24px");
  });

  test("below it: two words, the wordmark and Menu — the nav and the CTA are gone, not just hidden", () => {
    const c = mount(<Bar layout="narrow" />);
    // display:none, which also removes them from the accessibility tree.
    expect(shown(q(c, "header-nav"))).toBe(false);
    expect(shown(q(c, "site-header-cta"))).toBe(false);
    const menu = q<HTMLButtonElement>(c, "site-header-menu");
    expect(shown(menu)).toBe(true);
    expect(menu.textContent).toBe("Menu");
    expect(getComputedStyle(q(c, "header")).paddingInline).toBe("16px");
  });

  test("the menu control is the WORD: no surface, label-md, a 44px target, its name starting with what it shows", () => {
    const c = mount(<Bar layout="narrow" />);
    const menu = q<HTMLButtonElement>(c, "site-header-menu");
    const style = getComputedStyle(menu);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(menu.getBoundingClientRect().height).toBe(44);
    expect(style.fontWeight).toBe("600");
    expect(menu.getAttribute("aria-label")).toBe("Menu, site navigation");
    expect(menu.getAttribute("aria-label")!.startsWith(menu.textContent!)).toBe(true);
  });

  test("the switch is CSS: the scoped <style> is in the markup itself, so static HTML already has it", () => {
    const c = mount(<Bar layout="wide" collapseBelow="62rem" />);
    const css = c.querySelector("style")!.textContent!;
    expect(css).toContain("@media (width >= 62rem)");
    expect(css).toContain("@media (width < 62rem)");
    expect(css).toContain(`[data-site-header="${q(c, "header").dataset.siteHeader}"]`);
  });

  test("a collapseBelow that is not a plain length never reaches the CSS", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const c = mount(<Bar layout="wide" collapseBelow="1px){} body{display:none" />);
    expect(c.querySelector("style")!.textContent).not.toContain("body{");
    expect(c.querySelector("style")!.textContent).toContain("62rem");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("collapseBelow"));
  });

  test("a menu name that does not start with its visible word is reported (SC 2.5.3)", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mount(<Bar layout="narrow" menuLabel="Open navigation" />);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("2.5.3"));
  });
});

describe("SiteHeader brand", () => {
  test("type-only by default: one link home, named by the organisation", () => {
    const c = mount(<Bar layout="wide" />);
    const brand = q<HTMLAnchorElement>(c, "site-header-brand");
    expect(brand.getAttribute("href")).toBe("/");
    expect(brand.textContent).toBe("Diorama");
    expect(brand.hasAttribute("aria-label")).toBe(false);
    expect(getComputedStyle(brand).fontWeight).toBe("600");
  });

  test("with artwork, the artwork is hidden and the label names the link", () => {
    const c = mount(
      <Bar layout="wide" brand={{ label: "Diorama", href: "#top", wordmark: <svg viewBox="0 0 10 10" /> }} />,
    );
    const brand = q<HTMLAnchorElement>(c, "site-header-brand");
    expect(brand.getAttribute("aria-label")).toBe("Diorama");
    expect(brand.querySelector("svg")!.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("SiteHeader quiet items", () => {
  const item = (c: HTMLElement, label: string) =>
    [...c.querySelectorAll<HTMLElement>('[data-slot="header-item"]')].find((el) => el.textContent === label)!;

  test("ink is the only channel: muted at rest, primary when current, and never a fill", () => {
    const c = mount(<Bar layout="wide" />);
    const rest = item(c, "Work");
    const current = item(c, "Studio");
    expect(getComputedStyle(rest).color).toBe(probe("--ui-text-muted"));
    expect(getComputedStyle(current).color).toBe(probe("--ui-text-primary"));
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(rest.tagName).toBe("A");
    expect(getComputedStyle(rest).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(rest.getBoundingClientRect().height).toBe(32);
  });

  test("hover steps the ink UP to primary and paints nothing", async () => {
    const c = mount(<Bar layout="wide" />);
    const rest = item(c, "Journal");
    await userEvent.hover(rest);
    await settled(rest);
    expect(getComputedStyle(rest).color).toBe(probe("--ui-text-primary"));
    expect(getComputedStyle(rest).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  test("the CTA is a link styled as Button primary md — the bar's one fill", () => {
    const c = mount(<Bar layout="wide" />);
    const cta = q<HTMLAnchorElement>(c, "site-header-cta");
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("#contact");
    expect(cta.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(cta).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });
});

describe("SiteHeader menu", () => {
  const panel = () => document.querySelector<HTMLElement>('[data-slot="site-header-menu-panel"]');

  test("Menu opens a full-screen dialog from the top, named like the nav", async () => {
    const c = mount(<Bar layout="narrow" menuFooter="studio@diorama.example" />);
    await userEvent.click(q(c, "site-header-menu"));
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const dialog = panel()!.closest<HTMLElement>('[role="dialog"]')!;
    await settled(dialog);
    expect(dialog.getAttribute("aria-label")).toBe("Site");
    const rect = dialog.getBoundingClientRect();
    expect(rect.top).toBe(0);
    expect(rect.left).toBe(0);
    expect(rect.width).toBe(window.innerWidth);
    expect(rect.height).toBe(window.innerHeight);
    expect(getComputedStyle(dialog).borderTopLeftRadius).toBe("0px");
    expect(panel()!.textContent).toContain("studio@diorama.example");
  });

  test("rows are title-lg in 44px targets, muted, with the current page in primary", async () => {
    const c = mount(<Bar layout="narrow" />);
    await userEvent.click(q(c, "site-header-menu"));
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const rows = [...document.querySelectorAll<HTMLAnchorElement>('[data-slot="site-header-menu-item"]')];
    expect(rows.map((r) => r.textContent)).toEqual(["Work", "Studio", "Journal"]);
    expect(rows[0]!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(getComputedStyle(rows[0]!).color).toBe(probe("--ui-text-muted"));
    expect(getComputedStyle(rows[1]!).color).toBe(probe("--ui-text-primary"));
    expect(rows[1]!.getAttribute("aria-current")).toBe("page");
    expect(getComputedStyle(rows[0]!).fontWeight).toBe("500");
  });

  test("the CTA moves to the menu's foot, full width", async () => {
    const c = mount(<Bar layout="narrow" />);
    await userEvent.click(q(c, "site-header-menu"));
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const cta = [...panel()!.querySelectorAll<HTMLAnchorElement>("a")].find((a) => a.textContent === "Book a call")!;
    expect(cta.getAttribute("href")).toBe("#contact");
    const foot = cta.parentElement!.getBoundingClientRect();
    expect(cta.getBoundingClientRect().width).toBe(foot.width - 32);
  });

  test("Close sits where Menu was, and dismisses", async () => {
    const c = mount(<Bar layout="narrow" />);
    const menu = q(c, "site-header-menu");
    await userEvent.click(menu);
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    const close = [...panel()!.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Close")!;
    expect(close.getAttribute("aria-label")).toBe("Close, site navigation");
    await settled(panel()!.closest('[role="dialog"]')!);
    expect(Math.round(close.getBoundingClientRect().right)).toBe(Math.round(menu.getBoundingClientRect().right));
    await userEvent.click(close);
    await vi.waitFor(() => expect(panel()).toBeNull());
  });

  test("following a link closes the menu", async () => {
    const c = mount(<Bar layout="narrow" />);
    await userEvent.click(q(c, "site-header-menu"));
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="site-header-menu-item"]')!);
    await vi.waitFor(() => expect(panel()).toBeNull());
  });

  test("Escape closes it", async () => {
    const c = mount(<Bar layout="narrow" />);
    await userEvent.click(q(c, "site-header-menu"));
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(panel()).toBeNull());
  });
});

describe("SiteHeader over media", () => {
  function OnHero(props: Partial<SiteHeaderProps>) {
    return (
      <div>
        <Bar layout="wide" isOverMedia {...props} />
        <section data-testid="hero" className="h-60 bg-media" />
      </div>
    );
  }

  test("no fill, the media inks, and the hero pulled up under the bar", () => {
    const c = mount(<OnHero />);
    const bar = q(c, "header");
    expect(bar.hasAttribute("data-over-media")).toBe(true);
    expect(getComputedStyle(bar).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(bar).color).toBe(probe("--ui-text-on-media"));
    const hero = c.querySelector<HTMLElement>('[data-testid="hero"]')!;
    expect(hero.getBoundingClientRect().top).toBe(bar.getBoundingClientRect().top);
    const rest = [...c.querySelectorAll<HTMLElement>('[data-slot="header-item"]')].find((el) => el.textContent === "Work")!;
    expect(getComputedStyle(rest).color).toBe(probe("--ui-text-on-media-muted"));
  });

  test("the scrim is --ui-bg-media at 72% held for 48px, then a 32px tail to nothing, behind the content", () => {
    const c = mount(<OnHero />);
    const scrim = q(c, "site-header-scrim");
    const style = getComputedStyle(scrim);
    expect(scrim.getBoundingClientRect().height).toBe(80);
    expect(style.pointerEvents).toBe("none");
    expect(style.zIndex).toBe("-1");
    expect(scrim.getAttribute("aria-hidden")).toBe("true");
    const image = scrim.style.backgroundImage;
    expect(image).toMatch(/72%, transparent\) 0px/);
    expect(image).toMatch(/72%, transparent\) 48px/);
    expect(image).toMatch(/ 0%, transparent\) 80px\)$/);
  });

  test("scrim={false} leaves only the inks", () => {
    const c = mount(<OnHero scrim={false} />);
    expect(c.querySelector('[data-slot="site-header-scrim"]')).toBeNull();
  });

  test("once the page runs under the pinned bar, it is the ordinary bar again", async () => {
    const c = mount(
      <div data-testid="scroller" style={{ height: "200px", overflowY: "auto" }}>
        <Bar layout="wide" isOverMedia affix />
        <section className="h-60 bg-media" />
        <div style={{ height: "900px" }} />
      </div>,
    );
    const bar = q(c, "header");
    expect(bar.hasAttribute("data-over-media")).toBe(true);
    act(() => { c.querySelector<HTMLElement>('[data-testid="scroller"]')!.scrollTop = 400; });
    await vi.waitFor(() => expect(bar.hasAttribute("data-affixed")).toBe(true));
    await vi.waitFor(() => expect(bar.hasAttribute("data-over-media")).toBe(false));
    const rest = [...c.querySelectorAll<HTMLElement>('[data-slot="header-item"]')].find((el) => el.textContent === "Work")!;
    await settled(rest);
    // Affixed, rest steps up to secondary (muted is 3.66:1 on the affix floor in dark).
    expect(getComputedStyle(rest).color).toBe(probe("--ui-text-secondary"));
    await settled(q(c, "site-header-scrim"));
    expect(getComputedStyle(q(c, "site-header-scrim")).opacity).toBe("0");
  });
});
