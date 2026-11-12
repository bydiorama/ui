import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, Component, createRef, type ReactElement, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";
import { HOVER_INTENT_DELAY_MS, HOVER_INTENT_SKIP_MS } from "@/lib/motion";

import { ChatSources, type ChatSource, type ChatSourcesLabels } from "./chat-sources.tsx";

// ---------------------------------------------------------------- harness

const SOURCES: ChatSource[] = [
  {
    id: "moma",
    kind: "web",
    title: "Lighthouse at dusk",
    origin: "moma.example",
    excerpt: "The lamp is the only saturated mark on the sheet.",
    href: "https://moma.example/lighthouse",
  },
  { id: "grid", kind: "libraryItem", title: "Grid Systems", origin: "Library · p. 48", href: "/library/grid" },
  {
    id: "guidelines",
    kind: "brandAsset",
    title: "Colour and contrast",
    origin: "Guidelines · Chapter 4",
    excerpt: "The accent is a signal, not a fill.",
    href: "/brand/4",
    actionLabel: "Open in guidelines",
  },
  { id: "moodboard", kind: "file", title: "moodboard-v3.png", origin: "Attached to this chat", href: "/files/m.png" },
  { id: "tate", kind: "web", title: "Coastal prints", origin: "tate.example", href: "https://tate.example/coastal" },
];

const LABELS: ChatSourcesLabels = {
  openSource: "Open source",
  previousSource: "Previous source",
  nextSource: "Next source",
  unavailable: "No longer available",
};

const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

/** Wait out any running transition before reading computed style. */
async function settled(element: Element) {
  await Promise.all(
    element
      .getAnimations({ subtree: true })
      .filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  );
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * Mounts inside a theme-zero scope, light by default. `ui` may be a function
 * of the scope element, so a Provider can portal its previews INTO it and
 * the panel resolves the same tokens as everything else under test.
 */
function mount(ui: ReactElement | ((scope: HTMLDivElement) => ReactElement), scheme: "light" | "dark" = "light") {
  host = document.createElement("div");
  Object.assign(
    host.style,
    toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
    { colorScheme: scheme, width: "640px" },
  );
  host.className = "bg-base p-lg";
  document.body.appendChild(host);
  root = createRoot(host);
  const scope = host;
  act(() => {
    root!.render(typeof ui === "function" ? ui(scope) : ui);
  });
  const q = <T extends HTMLElement = HTMLElement>(slot: string) =>
    document.querySelector<T>(`[data-slot="${slot}"]`);
  const all = (slot: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`));
  return { host: scope, q, all };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** The computed value of a token, read through a probe in the same scope. */
function token(prop: "color" | "backgroundColor", cssVar: string): string {
  const probe = document.createElement("span");
  probe.style[prop] = `var(${cssVar})`;
  host!.appendChild(probe);
  const value = getComputedStyle(probe)[prop];
  probe.remove();
  return value;
}

const box = (el: Element) => el.getBoundingClientRect();

function Block(props: { children?: ReactNode; sources?: ChatSource[]; isStreaming?: boolean; scope?: HTMLElement }) {
  return (
    <ChatSources.Provider
      sources={props.sources ?? SOURCES}
      labels={LABELS}
      {...(props.isStreaming ? { isStreaming: true } : {})}
      {...(props.scope ? { container: props.scope } : {})}
    >
      {props.children}
    </ChatSources.Provider>
  );
}

/** A focusable element BEFORE the markers, so Tab arrives from somewhere real. */
const Before = () => <button type="button" data-slot="probe-before">before</button>;

const preview = () => document.querySelector<HTMLElement>('[data-slot="popover-panel"]');

// ---------------------------------------------------------------- the block

describe("ChatSources block", () => {
  test("folds by default to discs, the count and a chevron", () => {
    const { q, all } = mount(
      <Block>
        <ChatSources label="5 sources" />
      </Block>,
    );
    const summary = q<HTMLButtonElement>("chat-sources-summary")!;

    expect(summary.tagName).toBe("BUTTON");
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(summary.textContent).toBe("5 sources");
    expect(q("chat-sources")!.dataset.state).toBe("folded");
    expect(q("chat-sources-list")).toBeNull();
    // One disc per distinct KIND, at most three — five sources across four
    // kinds draw three.
    expect(all("chat-sources-disc")).toHaveLength(3);
  });

  test("the discs are 20px, overlap by 6px and are cut by a 2px ring in the ground's colour", async () => {
    const { all } = mount(
      <Block>
        <ChatSources label="5 sources" />
      </Block>,
    );
    const [first, second] = all("chat-sources-disc");
    await settled(first!);

    expect(box(first!).width).toBe(20);
    expect(box(first!).height).toBe(20);
    expect(box(second!).left - box(first!).left).toBe(14);
    const style = getComputedStyle(first!);
    expect(style.backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    expect(style.boxShadow).toContain(token("color", "--ui-bg-base"));
    expect(style.boxShadow).toContain("0px 0px 0px 2px");
    expect(box(first!.querySelector("svg")!).width).toBe(12);
  });

  test("opens to a numbered list of link rows", async () => {
    const { q, all } = mount(
      <Block>
        <ChatSources label="5 sources" />
      </Block>,
    );
    await userEvent.click(q("chat-sources-summary")!);

    const list = q("chat-sources-list")!;
    expect(list.tagName).toBe("OL");
    expect(list.querySelectorAll(":scope > li")).toHaveLength(5);
    expect(all("chat-sources-row-index").map((el) => el.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(q("chat-sources")!.dataset.state).toBe("open");
    expect(q("chat-sources-summary")!.getAttribute("aria-expanded")).toBe("true");
    // Open, the summary is the count and the chevron — no discs.
    expect(q("chat-sources-discs")).toBeNull();

    const row = all("chat-sources-row")[0]!;
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("href")).toBe("https://moma.example/lighthouse");
  });

  test("the disclosure is controllable and a controlled one does not move on its own", async () => {
    const seen: boolean[] = [];
    const { q } = mount(
      <Block>
        <ChatSources label="5 sources" isOpen={false} onOpenChange={(isOpen) => seen.push(isOpen)} />
      </Block>,
    );
    await userEvent.click(q("chat-sources-summary")!);

    expect(seen).toEqual([true]);
    expect(q("chat-sources-list")).toBeNull();
  });

  test("a row's lanes: 32px tall, 16px index, 168px origin, a 24px link slot", async () => {
    const { all } = mount(
      <Block>
        <ChatSources label="5 sources" defaultIsOpen />
      </Block>,
    );
    const row = all("chat-sources-row")[0]!;
    await settled(row);

    expect(box(row).height).toBe(32);
    expect(getComputedStyle(row).paddingInlineStart).toBe("8px");
    expect(box(row.querySelector('[data-slot="chat-sources-row-index"]')!).width).toBe(16);
    expect(box(row.querySelector('[data-slot="chat-sources-row-origin"]')!).width).toBe(168);
    expect(box(row.querySelector('[data-slot="chat-sources-row-link"]')!).width).toBe(24);
    expect(box(row.querySelector("svg")!).width).toBe(16);

    const title = row.querySelector<HTMLElement>('[data-slot="chat-sources-row-title"]')!;
    const style = getComputedStyle(title);
    expect(style.textOverflow).toBe("ellipsis");
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.fontSize).toBe("13px");
    expect(style.color).toBe(token("color", "--ui-text-primary"));
  });

  test("hovering a row fills it and reveals the link glyph", async () => {
    const { all } = mount(
      <Block>
        <ChatSources label="5 sources" defaultIsOpen />
      </Block>,
    );
    const row = all("chat-sources-row")[0]!;
    const slot = row.querySelector<HTMLElement>('[data-slot="chat-sources-row-link"]')!;
    await settled(row);
    expect(getComputedStyle(slot).opacity).toBe("0");

    await userEvent.hover(row);
    await settled(row);
    expect(getComputedStyle(row).backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    expect(getComputedStyle(slot).opacity).toBe("1");
    expect(getComputedStyle(slot).color).toBe(token("color", "--ui-text-link"));
    expect(box(slot.querySelector("svg")!).width).toBe(14);
  });

  test("a focused row paints the focus ring and shows its link glyph", async () => {
    const { all, q } = mount(
      <Block>
        <Before />
        <ChatSources label="5 sources" defaultIsOpen />
      </Block>,
    );
    q<HTMLButtonElement>("probe-before")!.focus();
    await userEvent.tab(); // the summary
    await userEvent.tab(); // the first row
    const row = all("chat-sources-row")[0]!;
    expect(document.activeElement).toBe(row);
    await settled(row);

    const style = getComputedStyle(row);
    expect(style.outlineStyle).toBe("solid");
    expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(style.outlineColor).toBe(token("color", "--ui-border-focus"));
    expect(getComputedStyle(row.querySelector('[data-slot="chat-sources-row-link"]')!).opacity).toBe("1");
  });

  test("cards: two 172×96 cards and a '+N more' card that opens the list", async () => {
    const { all, q } = mount(
      <Block>
        <ChatSources label="5 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
      </Block>,
    );
    const cards = all("chat-sources-card");
    expect(cards).toHaveLength(2);
    await settled(cards[0]!);
    expect(box(cards[0]!).width).toBe(172);
    expect(box(cards[0]!).height).toBe(96);
    const style = getComputedStyle(cards[0]!);
    expect(style.backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    expect(style.paddingTop).toBe("12px");
    expect(style.borderTopWidth).toBe("0px");
    expect(style.boxShadow).toBe("none");

    const more = q<HTMLButtonElement>("chat-sources-more")!;
    expect(more.textContent).toBe("+3 more");
    expect(box(more).height).toBe(96);

    await userEvent.click(more);
    expect(q("chat-sources-list")).not.toBeNull();
    expect(q("chat-sources-more")).toBeNull();
    // The control that was pressed is gone; focus is handed to the summary
    // that replaces it rather than falling to <body>.
    expect(document.activeElement).toBe(q("chat-sources-summary"));
  });

  test("hovering a card steps it up to bg-hover", async () => {
    const { all } = mount(
      <Block>
        <ChatSources label="5 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
      </Block>,
    );
    const card = all("chat-sources-card")[0]!;
    await userEvent.hover(card);
    await settled(card);
    expect(getComputedStyle(card).backgroundColor).toBe(token("backgroundColor", "--ui-bg-hover"));
  });

  test("cards: when every source fits there is no '+1 more'", () => {
    const { all, q } = mount(
      <Block sources={SOURCES.slice(0, 3)}>
        <ChatSources label="3 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
      </Block>,
    );
    expect(all("chat-sources-card")).toHaveLength(3);
    expect(q("chat-sources-more")).toBeNull();
  });

  test("gathering: a live count beside a working StatusMatrix, and nothing to fold", () => {
    const { q, host: scope } = mount(
      <Block>
        <ChatSources label="3 sources so far" isGathering />
      </Block>,
    );
    const line = q("chat-sources-gathering")!;
    expect(line.getAttribute("role")).toBe("status");
    expect(line.textContent).toBe("3 sources so far");
    const matrix = line.querySelector<SVGElement>('[data-slot="status-matrix"]')!;
    expect(matrix.dataset.status).toBe("working");
    // Live by default; the caller holds it when another matrix is the turn's live edge.
    expect(matrix.dataset.held).toBeUndefined();
    expect(box(matrix).width).toBe(14);
    expect(box(line).height).toBe(20);
    expect(scope.querySelector("button")).toBeNull();
    expect(q("chat-sources")!.dataset.state).toBe("gathering");
  });

  test("isHeld holds the gathering matrix on its key frame", () => {
    const { q } = mount(
      <Block>
        <ChatSources label="3 sources so far" isGathering isHeld />
      </Block>,
    );
    expect(q("status-matrix")!.hasAttribute("data-held")).toBe(true);
  });

  test("a single source is its row alone: no summary, no index", () => {
    const { q } = mount(
      <Block sources={[SOURCES[0]!]}>
        <ChatSources label="1 source" />
      </Block>,
    );
    expect(q("chat-sources-summary")).toBeNull();
    expect(q("chat-sources-row")).not.toBeNull();
    expect(q("chat-sources-row-index")).toBeNull();
    expect(q("chat-sources")!.dataset.state).toBe("single");
  });

  test("an unavailable source stays listed, says so, and cannot be followed", () => {
    const { q } = mount(
      <Block sources={[{ ...SOURCES[2]!, isUnavailable: true }]}>
        <ChatSources label="1 source" />
      </Block>,
    );
    const row = q("chat-sources-row")!;
    expect(row.tagName).toBe("DIV");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("href")).toBeNull();
    expect(row.tabIndex).toBe(-1);
    expect(q("chat-sources-row-origin")!.textContent).toBe("No longer available");
    expect(getComputedStyle(q("chat-sources-row-title")!).color).toBe(token("color", "--ui-text-disabled"));
  });

  test("ref, className and native props land on the root; the block's own props do not", () => {
    const ref = createRef<HTMLDivElement>();
    const { q } = mount(
      <Block>
        <ChatSources
          ref={ref}
          label="5 sources"
          layout="cards"
          moreLabel={(n) => `+${n} more`}
          className="mt-lg"
          id="sources-4"
        />
      </Block>,
    );
    const rootEl = q("chat-sources")!;
    expect(ref.current).toBe(rootEl);
    expect(rootEl.id).toBe("sources-4");
    expect(getComputedStyle(rootEl).marginTop).toBe("16px");
    expect(rootEl.dataset.layout).toBe("cards");
    for (const attr of ["label", "layout", "morelabel", "cardcount"]) {
      expect(rootEl.getAttribute(attr)).toBeNull();
    }
  });

  test("a part outside the Provider throws, naming the Provider", () => {
    let caught: unknown = null;
    class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
      override state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      override componentDidCatch(error: unknown) {
        caught = error;
      }
      override render() {
        return this.state.failed ? null : this.props.children;
      }
    }
    // React logs a caught render error; this one is the point of the test.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mount(
        <Boundary>
          <ChatSources label="5 sources" />
        </Boundary>,
      );
    } finally {
      quiet.mockRestore();
    }
    expect(String(caught)).toContain("ChatSources.Provider");
  });
});

// ---------------------------------------------------------------- the marker

describe("ChatSources.Citation", () => {
  test("a 16px pill with a 2px lead, muted on the elevated fill", async () => {
    const { q } = mount(
      <Block>
        <p className="text-body-md">
          A clause
          <ChatSources.Citation sourceIds={["moma"]} />.
        </p>
      </Block>,
    );
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    await settled(pill);
    const style = getComputedStyle(pill);

    expect(pill.tagName).toBe("BUTTON");
    expect(pill.type).toBe("button");
    expect(box(pill).height).toBe(16);
    expect(box(pill).width).toBeGreaterThanOrEqual(16);
    expect(style.marginInlineStart).toBe("2px");
    expect(style.paddingInlineStart).toBe("4px");
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(8);
    expect(style.fontSize).toBe("12px");
    expect(style.fontVariantNumeric).toBe("tabular-nums");
    expect(style.backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    expect(style.color).toBe(token("color", "--ui-text-muted"));
    expect(style.cursor).toBe("pointer");
  });

  test("its name leads with the visible number and carries the titles", () => {
    const { q } = mount(
      <Block>
        <ChatSources.Citation sourceIds={["grid", "tate"]} />
      </Block>,
    );
    const pill = q("chat-sources-citation")!;
    // One pill for two sources — "2, 5", never two pills.
    expect(pill.textContent).toBe("2, 5: Grid Systems; Coastal prints");
    expect(pill.querySelector(".sr-only")!.textContent).toBe(": Grid Systems; Coastal prints");
  });

  test("hover opens the preview only after the hover-intent delay, and leaving closes it", async () => {
    const { q, all } = mount((scope) => (
      <Block scope={scope}>
        <p>
          A clause <ChatSources.Citation sourceIds={["moma"]} />
        </p>
        <ChatSources label="5 sources" defaultIsOpen />
      </Block>
    ));
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;

    await userEvent.hover(pill);
    await settled(pill);
    // The fill arrives at once — it is the cue the marker can be opened…
    expect(getComputedStyle(pill).backgroundColor).toBe(token("backgroundColor", "--ui-bg-accent-subtle"));
    expect(getComputedStyle(pill).color).toBe(token("color", "--ui-text-link"));
    // …the preview does not.
    expect(preview()).toBeNull();

    await wait(HOVER_INTENT_DELAY_MS + 100);
    expect(preview()).not.toBeNull();
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    // The cited row takes the marker's wash, and its index the link ink.
    const row = all("chat-sources-row")[0]!;
    expect(row.dataset.cited).toBeDefined();
    await settled(row);
    expect(getComputedStyle(row).backgroundColor).toBe(token("backgroundColor", "--ui-bg-accent-subtle"));
    expect(getComputedStyle(row.querySelector('[data-slot="chat-sources-row-index"]')!).color).toBe(
      token("color", "--ui-text-link"),
    );

    await userEvent.unhover(pill);
    await userEvent.hover(q("chat-sources-summary")!);
    await wait(HOVER_INTENT_SKIP_MS + 200);
    expect(pill.getAttribute("aria-expanded")).toBe("false");
    expect(all("chat-sources-row")[0]!.dataset.cited).toBeUndefined();
  });

  test("the pointer can cross into the preview without it closing", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <ChatSources.Citation sourceIds={["moma"]} />
      </Block>
    ));
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    await userEvent.hover(pill);
    await wait(HOVER_INTENT_DELAY_MS + 100);
    await userEvent.hover(preview()!);
    await wait(HOVER_INTENT_SKIP_MS + 200);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
  });

  test("keyboard: focus opens the preview and keeps focus; Tab enters it; Escape closes it for good", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <Before />
        <ChatSources.Citation sourceIds={["moma"]} />
        <button type="button" data-slot="probe-after">after</button>
      </Block>
    ));
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    q<HTMLButtonElement>("probe-before")!.focus();

    await userEvent.tab();
    expect(document.activeElement).toBe(pill);
    await wait(50);
    expect(preview()).not.toBeNull();
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    // Opening never moves focus: the reader's place is the marker.
    expect(document.activeElement).toBe(pill);

    // The focus ring is painted, in the focus token.
    await settled(pill);
    const ring = getComputedStyle(pill);
    expect(ring.outlineStyle).toBe("solid");
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(ring.outlineColor).toBe(token("color", "--ui-border-focus"));

    await userEvent.tab();
    const link = q("chat-sources-preview-link")!;
    expect(document.activeElement).toBe(link);
    expect(pill.getAttribute("aria-expanded")).toBe("true");

    await userEvent.keyboard("{Escape}");
    await wait(300);
    expect(pill.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(pill);
    // The returning focus does not re-open what was just dismissed.
    await wait(50);
    expect(pill.getAttribute("aria-expanded")).toBe("false");
  });

  test("Enter on a marker unfolds the block to its row and keeps the preview", async () => {
    const seen: boolean[] = [];
    const { q, all } = mount((scope) => (
      <Block scope={scope}>
        <Before />
        <ChatSources.Citation sourceIds={["guidelines"]} />
        <ChatSources label="5 sources" onOpenChange={(isOpen) => seen.push(isOpen)} />
      </Block>
    ));
    const scrolled: Element[] = [];
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) {
      scrolled.push(this);
    });
    q<HTMLButtonElement>("probe-before")!.focus();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await wait(50);
    scroll.mockRestore();

    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    expect(seen).toEqual([true]);
    expect(q("chat-sources-list")).not.toBeNull();
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    const row = all("chat-sources-row")[2]!;
    expect(row.dataset.cited).toBeDefined();
    // The row it was for, brought into view as the list unfolded.
    expect(scrolled).toEqual([row]);
  });

  test("a mouse press opens the preview and unfolds the block", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <ChatSources.Citation sourceIds={["moma"]} />
        <ChatSources label="5 sources" />
      </Block>
    ));
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    await userEvent.click(pill);
    await wait(50);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    expect(q("chat-sources-list")).not.toBeNull();
  });

  test("touch: a tap opens the preview without unfolding the block, a second tap closes it", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <ChatSources.Citation sourceIds={["moma"]} />
        <ChatSources label="5 sources" />
      </Block>
    ));
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    const tap = () =>
      act(() => {
        pill.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
        pill.click();
      });

    tap();
    await wait(50);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    expect(q("chat-sources-list")).toBeNull();

    tap();
    await wait(50);
    expect(pill.getAttribute("aria-expanded")).toBe("false");
  });

  test("the preview: 320px, gap-md, origin · title · excerpt · link", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <Before />
        <ChatSources.Citation sourceIds={["moma"]} />
      </Block>
    ));
    q<HTMLButtonElement>("probe-before")!.focus();
    await userEvent.tab();
    await wait(50);
    const panel = preview()!;
    await settled(panel);

    expect(panel.getAttribute("role")).toBe("dialog");
    expect(box(panel).width).toBe(320);
    expect(getComputedStyle(panel).rowGap).toBe("12px");
    expect(getComputedStyle(panel).backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    // gap-xs below the marker.
    const pill = q("chat-sources-citation")!;
    expect(Math.round(box(panel).top - box(pill).bottom)).toBe(4);
    expect(Math.round(box(panel).left)).toBe(Math.round(box(pill).left));

    expect(q("chat-sources-preview-origin")!.textContent).toBe("moma.example1");
    const title = q("popover-title")!;
    expect(title.textContent).toBe("Lighthouse at dusk");
    expect(getComputedStyle(title).fontSize).toBe("13px");
    expect(getComputedStyle(title).paddingInlineStart).toBe("0px");
    const excerpt = q("popover-description")!;
    expect(getComputedStyle(excerpt).fontSize).toBe("13px");
    expect(getComputedStyle(excerpt).webkitLineClamp).toBe("3");
    expect(getComputedStyle(excerpt).color).toBe(token("color", "--ui-text-muted"));
    expect(panel.getAttribute("aria-labelledby")).toBe(title.id);

    const link = q<HTMLAnchorElement>("chat-sources-preview-link")!;
    expect(link.textContent).toBe("Open source");
    expect(link.getAttribute("href")).toBe("https://moma.example/lighthouse");
    expect(getComputedStyle(link).color).toBe(token("color", "--ui-text-link"));
    expect(box(link.querySelector("svg")!).width).toBe(12);
    // A single source has nothing to page.
    expect(q("chat-sources-preview-pager")).toBeNull();
  });

  test("a source with no excerpt shows its title alone, and its own action label", async () => {
    const { q } = mount((scope) => (
      <Block
        scope={scope}
        sources={[
          {
            id: "guidelines",
            kind: "brandAsset",
            title: "Colour and contrast",
            origin: "Guidelines · Chapter 4",
            href: "/brand/4",
            actionLabel: "Open in guidelines",
          },
          SOURCES[0]!,
        ]}
      >
        <Before />
        <ChatSources.Citation sourceIds={["guidelines"]} />
      </Block>
    ));
    q<HTMLButtonElement>("probe-before")!.focus();
    await userEvent.tab();
    await wait(50);
    expect(q("popover-description")).toBeNull();
    expect(q("chat-sources-preview-link")!.textContent).toBe("Open in guidelines");
  });

  test("a grouped marker pages through its sources", async () => {
    const { q } = mount((scope) => (
      <Block scope={scope}>
        <Before />
        <ChatSources.Citation sourceIds={["grid", "tate"]} />
      </Block>
    ));
    q<HTMLButtonElement>("probe-before")!.focus();
    await userEvent.tab();
    await wait(50);
    await settled(preview()!);

    const pager = q("chat-sources-preview-pager")!;
    const [previous, next] = Array.from(pager.querySelectorAll("button"));
    expect(pager.textContent).toContain("1 / 2");
    expect(previous!.getAttribute("aria-label")).toBe("Previous source");
    expect(previous!.disabled).toBe(true);
    expect(q("popover-title")!.textContent).toBe("Grid Systems");
    expect(box(next!).width).toBe(24);

    await userEvent.click(next!);
    expect(pager.textContent).toContain("2 / 2");
    expect(q("popover-title")!.textContent).toBe("Coastal prints");
    expect(next!.disabled).toBe(true);
  });

  test("streaming: a disabled button in disabled ink that opens nothing", async () => {
    const { q } = mount(
      <Block isStreaming>
        <ChatSources.Citation sourceIds={["moma"]} />
      </Block>,
    );
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    await settled(pill);

    expect(pill.disabled).toBe(true);
    expect(pill.dataset.streaming).toBeDefined();
    expect(getComputedStyle(pill).color).toBe(token("color", "--ui-text-disabled"));
    expect(getComputedStyle(pill).backgroundColor).toBe(token("backgroundColor", "--ui-bg-elevated"));
    expect(getComputedStyle(pill).cursor).toBe("not-allowed");
    expect(pill.hasAttribute("aria-expanded")).toBe(false);

    await userEvent.hover(pill, { force: true } as never);
    await wait(HOVER_INTENT_DELAY_MS + 100);
    expect(preview()).toBeNull();
  });

  test("ref, className and native props land on the button, and the caller's handlers run", async () => {
    const ref = createRef<HTMLButtonElement>();
    let clicked = 0;
    const { q } = mount(
      <Block>
        <ChatSources.Citation
          ref={ref}
          sourceIds={["moma"]}
          className="ms-xs"
          aria-describedby="note-1"
          onClick={() => (clicked += 1)}
        />
        <ChatSources label="5 sources" />
      </Block>,
    );
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    expect(ref.current).toBe(pill);
    expect(pill.getAttribute("aria-describedby")).toBe("note-1");
    // The caller's className wins over the 2px lead.
    expect(getComputedStyle(pill).marginInlineStart).toBe("4px");
    expect(pill.getAttribute("sourceids")).toBeNull();

    await userEvent.click(pill);
    expect(clicked).toBe(1);
  });

  test("dark: the resting and hovered numerals keep their tokens", async () => {
    const { q } = mount(
      <Block>
        <ChatSources.Citation sourceIds={["moma"]} />
      </Block>,
      "dark",
    );
    const pill = q<HTMLButtonElement>("chat-sources-citation")!;
    await settled(pill);
    expect(getComputedStyle(pill).color).toBe(token("color", "--ui-text-muted"));
    await userEvent.hover(pill);
    await settled(pill);
    expect(getComputedStyle(pill).color).toBe(token("color", "--ui-text-link"));
    expect(getComputedStyle(pill).backgroundColor).toBe(token("backgroundColor", "--ui-bg-accent-subtle"));
  });
});
