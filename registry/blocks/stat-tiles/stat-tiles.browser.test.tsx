import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { StatFigure, StatTiles } from "./stat-tiles.tsx";

function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** 1152: the sheet's row, four tiles across. */
async function mount(ui: ReactElement, width = 1152) {
  container = document.createElement("div");
  container.style.width = `${width}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  await act(async () => {});
  const all = (slot: string) => [...container!.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
  return { all, q: (slot: string) => all(slot)[0]!, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function Row() {
  return (
    <StatTiles aria-label="Printing this year">
      <StatTiles.Tile label="Posters printed" value="1,284" delta={{ change: 0.12, comparison: "vs 1971" }} trend={<svg data-testid="trend" width="120" height="32" />} />
      <StatTiles.Tile label="Books bound" value="862" delta={{ change: -0.04, comparison: "vs 1971" }} />
      <StatTiles.Tile label="Ink cost" value="€3,410" delta={{ change: 0.09, comparison: "vs 1971", polarity: "down-is-good" }} />
      <StatTiles.Tile label="Presses running" value="6" delta={{ change: 0, comparison: "vs 1971" }} />
    </StatTiles>
  );
}

describe("StatTiles is one frame of hairline-separated tiles", () => {
  test("a description list: the label is the term, the figure and change its descriptions", async () => {
    const { q, all } = await mount(<Row />);
    expect(q("stat-tiles").tagName).toBe("DL");
    expect(all("stat-label").every((el) => el.tagName === "DT")).toBe(true);
    expect(all("stat-value").every((el) => el.tagName === "DD")).toBe(true);
    // What a screen reader walks: the term, the figure, the spoken direction.
    expect(all("stat-tile")[0]!.textContent).toBe("Posters printed1,284Up 12%vs 1971");
  });

  test("the frame is the sheet's: surface, subtle hairline, radius-md; tiles inset 24px", async () => {
    const { q, all } = await mount(<Row />);
    const frame = getComputedStyle(q("stat-tiles"));
    expect(frame.backgroundColor).toBe(tokenColor("--ui-bg-surface"));
    expect(frame.borderTopColor).toBe(tokenColor("--ui-border-subtle"));
    expect(frame.borderTopLeftRadius).toBe("8px");
    const [first, second] = all("stat-tile").map((t) => getComputedStyle(t));
    expect(first!.paddingTop).toBe("24px");
    expect(first!.paddingLeft).toBe("24px");
    // Hairlines BETWEEN tiles, never around each one.
    expect(first!.borderLeftWidth).toBe("0px");
    expect(second!.borderLeftWidth).toBe("1px");
    expect(second!.borderLeftColor).toBe(tokenColor("--ui-border-subtle"));
  });

  test("the figure is the fixed figure role — 24/30 at 600, tabular — not a fluid title", async () => {
    const { q } = await mount(<Row />);
    const figure = getComputedStyle(q("stat-value").firstElementChild!);
    expect(figure.fontSize).toBe("24px");
    expect(figure.lineHeight).toBe("30px");
    expect(figure.fontWeight).toBe("600");
    expect(figure.fontVariantNumeric).toBe("tabular-nums");
    expect(figure.color).toBe(tokenColor("--ui-text-primary"));
    // The role itself carries no viewport term: a tile does not shrink with
    // the phone, so neither may its number (title-lg computes ~17px there).
    expect(getComputedStyle(document.documentElement).getPropertyValue("--ui-text-figure").trim()).toBe("1.5rem");
  });

  test("label and comparison recede to 400 muted; the change is 600", async () => {
    const { q, all } = await mount(<Row />);
    const label = getComputedStyle(q("stat-label"));
    expect([label.fontSize, label.fontWeight, label.color]).toEqual(["12px", "400", tokenColor("--ui-text-muted")]);
    const comparison = getComputedStyle(all("stat-comparison")[0]!);
    expect([comparison.fontWeight, comparison.color]).toEqual(["400", tokenColor("--ui-text-muted")]);
    expect(getComputedStyle(q("stat-change")).fontWeight).toBe("600");
  });
});

describe("The change line: the glyph says which way, the colour whether that is good", () => {
  test("up-is-good: a rise is success, a fall is danger, and the glyph follows the sign", async () => {
    const { all } = await mount(<Row />);
    const [rise, fall] = all("stat-delta");
    expect(rise!.dataset.direction).toBe("up");
    expect(getComputedStyle(rise!).color).toBe(tokenColor("--ui-intent-success-fg"));
    expect(fall!.dataset.direction).toBe("down");
    expect(getComputedStyle(fall!).color).toBe(tokenColor("--ui-intent-danger-fg"));
    // The glyph paints in the line's ink: colour and shape agree.
    expect(getComputedStyle(rise!.querySelector("svg")!).color).toBe(getComputedStyle(rise!).color);
    // The two glyphs are different drawings, not one recoloured.
    expect(rise!.querySelector("svg")!.innerHTML).not.toBe(fall!.querySelector("svg")!.innerHTML);
  });

  test("down-is-good flips the colour and never the glyph", async () => {
    const { all } = await mount(<Row />);
    const cost = all("stat-delta")[2]!;
    expect(cost.dataset.direction).toBe("up");
    expect(cost.dataset.tone).toBe("bad");
    expect(getComputedStyle(cost).color).toBe(tokenColor("--ui-intent-danger-fg"));
    expect(cost.querySelector("svg")!.innerHTML).toBe(all("stat-delta")[0]!.querySelector("svg")!.innerHTML);
  });

  test("zero — and a change that PRINTS as zero — is flat, muted, and says so", async () => {
    const { all } = await mount(
      <StatTiles>
        <StatTiles.Tile label="a" value="6" delta={{ change: 0, comparison: "vs 1971" }} />
        <StatTiles.Tile label="b" value="6" delta={{ change: 0.004, comparison: "vs 1971" }} />
        <StatTiles.Tile label="c" value="6" delta={{ change: 0.004, comparison: "vs 1971", format: { style: "percent", maximumFractionDigits: 1 } }} />
      </StatTiles>,
    );
    const [zero, rounds, printed] = all("stat-delta");
    for (const flat of [zero!, rounds!]) {
      expect(flat.dataset.direction).toBe("flat");
      expect(getComputedStyle(flat).color).toBe(tokenColor("--ui-text-muted"));
      expect(flat.textContent).toBe("No change vs 1971");
    }
    // One more digit and the same change is visible, so it is a rise.
    expect(printed!.dataset.direction).toBe("up");
    expect(printed!.textContent).toContain("0.4%");
  });
});

describe("StatTiles' data states keep the tile", () => {
  test("loading: label printed, figure and change as skeletons, aria-busy, same height as a loaded tile", async () => {
    const { all } = await mount(
      <StatTiles>
        <StatTiles.Tile label="Posters printed" value="1,284" delta={{ change: 0.12, comparison: "vs 1971" }} />
        <StatTiles.Tile label="Books bound" value={null} isLoading />
      </StatTiles>,
    );
    const [loaded, loading] = all("stat-tile");
    expect(loading!.getAttribute("aria-busy")).toBe("true");
    expect(loading!.querySelector('[data-slot="stat-label"]')!.textContent).toBe("Books bound");
    const skeletons = [...loading!.querySelectorAll<HTMLElement>('[data-slot="skeleton"]')].map((s) => s.getBoundingClientRect());
    expect(skeletons.map((r) => [r.width, r.height])).toEqual([[96, 24], [72, 12]]);
    expect(loading!.getBoundingClientRect().height).toBe(loaded!.getBoundingClientRect().height);
  });

  test("no value: a muted dash and the empty text, never a zero", async () => {
    const { q } = await mount(
      <StatTiles>
        <StatTiles.Tile label="Books bound" value={null} delta={{ change: 0.1, comparison: "vs 1971" }} />
      </StatTiles>,
    );
    expect(q("stat-value").textContent).toBe("—");
    expect(getComputedStyle(q("stat-value").firstElementChild!).color).toBe(tokenColor("--ui-text-muted"));
    expect(q("stat-empty").textContent).toBe("No reading yet");
    expect(q("stat-delta")).toBeUndefined();
  });

  test("no comparison: no change line at all", async () => {
    const { q } = await mount(
      <StatTiles>
        <StatTiles.Tile label="Presses running" value="6" />
      </StatTiles>,
    );
    expect(q("stat-delta-row")).toBeUndefined();
  });

  test("the trend sits at the end of the tile, its foot on the change line's", async () => {
    const { q, container: c } = await mount(<Row />);
    const trend = c.querySelector('[data-testid="trend"]')!.getBoundingClientRect();
    const tile = q("stat-tile").getBoundingClientRect();
    const delta = q("stat-delta-row").getBoundingClientRect();
    expect(Math.round(tile.right - 24 - trend.right)).toBe(0);
    expect(Math.round(delta.bottom - trend.bottom)).toBe(0);
  });
});

describe("The narrow row (sheet: Narrow row)", () => {
  const rows = (tiles: HTMLElement[]) => tiles.map((t) => Math.round(t.getBoundingClientRect().top));
  const lines = (t: HTMLElement) => {
    const cs = getComputedStyle(t);
    return [cs.borderLeftWidth, cs.borderTopWidth];
  };

  test("four across only from 1120px: the sheet's row is one line at 1152", async () => {
    const { all } = await mount(<Row />, 1152);
    expect(new Set(rows(all("stat-tile"))).size).toBe(1);
  });

  test("below it, two by two, and the hairlines follow the wrap", async () => {
    const { all } = await mount(<Row />, 720);
    const tiles = all("stat-tile");
    const [a, b, c, d] = rows(tiles);
    expect([a === b, c === d, c! > a!]).toEqual([true, true, true]);
    // A start line on the second column, a top line on the second row.
    expect(tiles.map(lines)).toEqual([["0px", "0px"], ["1px", "0px"], ["0px", "1px"], ["1px", "1px"]]);
    expect(getComputedStyle(tiles[3]!).borderTopColor).toBe(tokenColor("--ui-border-subtle"));
  });

  test("three tiles: one row from 840px; under it the third spans the second row", async () => {
    const Three = () => (
      <StatTiles>
        <StatTiles.Tile label="a" value="1" />
        <StatTiles.Tile label="b" value="2" />
        <StatTiles.Tile label="c" value="3" />
      </StatTiles>
    );
    const wide = await mount(<Three />, 880);
    expect(new Set(rows(wide.all("stat-tile"))).size).toBe(1);
    act(() => root?.unmount());
    container?.remove();
    const narrow = await mount(<Three />, 720);
    const [, , third] = narrow.all("stat-tile");
    expect(Math.round(third!.getBoundingClientRect().width)).toBe(718); // the frame less its two 1px borders
    expect(lines(third!)).toEqual(["0px", "1px"]);
  });

  test("a tile under 220px of content drops its sparkline under the change line, 16px clear", async () => {
    const { q, container: c } = await mount(<Row />, 343);
    const trend = c.querySelector('[data-testid="trend"]')!.getBoundingClientRect();
    const tile = q("stat-tile").getBoundingClientRect();
    const delta = q("stat-delta-row").getBoundingClientRect();
    expect(Math.round(trend.top - delta.bottom)).toBe(16);
    expect(Math.round(trend.left - tile.left)).toBe(24);
    // The text takes the whole width: no empty column beside it.
    expect(Math.round(delta.width)).toBe(Math.round(tile.width - 48));
  });

  test("at 720 a tile keeps its sparkline beside the text", async () => {
    const { q, container: c } = await mount(<Row />, 720);
    const trend = c.querySelector('[data-testid="trend"]')!.getBoundingClientRect();
    const delta = q("stat-delta-row").getBoundingClientRect();
    expect(Math.round(delta.bottom - trend.bottom)).toBe(0);
    expect(trend.left).toBeGreaterThan(delta.left);
  });
});

describe("Forwarding", () => {
  test("className, ref and attributes land on the root and on each tile", async () => {
    const rootRef = createRef<HTMLDListElement>();
    const tileRef = createRef<HTMLDivElement>();
    const { q } = await mount(
      <StatTiles ref={rootRef} className="max-w-xl" aria-label="Row">
        <StatTiles.Tile ref={tileRef} className="bg-hover" data-x="1" label="a" value="1" />
      </StatTiles>,
    );
    expect(rootRef.current).toBe(q("stat-tiles"));
    expect(q("stat-tiles").classList.contains("max-w-xl")).toBe(true);
    expect(q("stat-tiles").getAttribute("aria-label")).toBe("Row");
    expect(tileRef.current).toBe(q("stat-tile"));
    expect(q("stat-tile").dataset.x).toBe("1");
    expect(getComputedStyle(q("stat-tile")).backgroundColor).toBe(tokenColor("--ui-bg-hover"));
  });
});

describe("StatFigure is the tile's own parts, in a row", () => {
  test("the same figure and change as a tile, 12px apart on one baseline", async () => {
    const { all } = await mount(
      <div>
        <StatFigure value="2,370" delta={{ change: 0.18, comparison: "vs 1951–1956" }} />
        <StatTiles>
          <StatTiles.Tile label="a" value="2,370" delta={{ change: 0.18, comparison: "vs 1951–1956" }} />
        </StatTiles>
      </div>,
    );
    const [inFigure, inTile] = all("stat-value").map((v) => getComputedStyle(v.tagName === "DD" ? v.firstElementChild! : v));
    for (const prop of ["fontSize", "lineHeight", "fontWeight", "letterSpacing", "fontVariantNumeric", "color"] as const) {
      expect(inFigure![prop], prop).toBe(inTile![prop]);
    }
    expect(getComputedStyle(all("stat-figure")[0]!).columnGap).toBe("12px");
  });
});
