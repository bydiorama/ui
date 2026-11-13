/**
 * The render side of design validation: does the shipped component lay out the
 * numbers the sheet lays out?
 *
 * The other half is `pnpm check:design-spec`, which runs the SAME laws over the
 * numbers extracted from Paper. This file runs them over `getBoundingClientRect`
 * in a real Chromium. Neither half is sufficient: the sheet can be internally
 * wrong, and the implementation's geometry does not exist until something lays
 * it out.
 *
 * WHAT THIS CATCHES THAT NOTHING ELSE DOES. Tabs' track shipped `p-[2px] h-8`.
 * The source reads symmetric — one padding, four sides. The rendered insets
 * were 3px left and right and 4px top and bottom, because `h-8` demanded 32px
 * from parts adding to 31 and `items-center` paid the difference out of the
 * vertical gaps. `check:utilities` saw legal classes. `check:contrast` saw
 * legal colours. The visual baselines were green — their own header records
 * that a small element can change ENTIRELY under `allowedMismatchedPixelRatio`.
 * A person found it by zooming in. This file is that person, made repeatable.
 *
 * ADDING A COMPONENT: extract its sheet into `design/paper/specs/<item>.geometry.json`
 * (the `design-component` skill carries the Paper calls), then add one entry to
 * CASES below keyed by the spec's case name. check:design-spec fails if a spec
 * case has no entry here, so the two cannot drift apart silently.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { useEffect, useRef } from "react";

import { Accordion } from "@/ui/accordion/accordion.tsx";
import { Table } from "@/ui/table/table.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";
import { Radio, RadioGroup } from "@/ui/radio/radio.tsx";
import { Tooltip } from "@/ui/tooltip/tooltip.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Toast, useToast } from "@/ui/toast/toast.tsx";
import { ChatComposer } from "@/ui/chat-composer/chat-composer.tsx";
import { ChatMessage } from "@/ui/chat-message/chat-message.tsx";
import { ChatProgress } from "@/ui/chat-progress/chat-progress.tsx";
import { ChatWidget } from "@/ui/chat-widget/chat-widget.tsx";
import { ChatQuestionnaire } from "@/ui/chat-questionnaire/chat-questionnaire.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Combobox } from "@/ui/combobox/combobox.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { BarChart } from "@/ui/chart/chart.tsx";
import { StatTiles } from "@/blocks/stat-tiles/stat-tiles.tsx";
import { Plus, Microphone, InfoCircle, Close } from "griddy-icons";

// The laws, and the spec, are the SAME artefacts the node-side gate reads.
// Importing them rather than restating them is the whole point — a second copy
// of the numbers is a second thing to drift.
import { evaluate, sides, formatFailures } from "../../scripts/lib/geometry-laws.mjs";
import accordionSpec from "../../design/paper/specs/accordion.geometry.json";
import tableSpec from "../../design/paper/specs/table.geometry.json";
import tabsSpec from "../../design/paper/specs/tabs.geometry.json";
import radioSpec from "../../design/paper/specs/radio.geometry.json";
import tooltipSpec from "../../design/paper/specs/tooltip.geometry.json";
import toastSpec from "../../design/paper/specs/toast.geometry.json";
import chatComposerSpec from "../../design/paper/specs/chat-composer.geometry.json";
import chatMessageSpec from "../../design/paper/specs/chat-message.geometry.json";
import chatProgressSpec from "../../design/paper/specs/chat-progress.geometry.json";
import chatWidgetSpec from "../../design/paper/specs/chat-widget.geometry.json";
import chatQuestionnaireSpec from "../../design/paper/specs/chat-questionnaire.geometry.json";
import sheetSpec from "../../design/paper/specs/sheet.geometry.json";
import comboboxSpec from "../../design/paper/specs/combobox.geometry.json";
import sliderSpec from "../../design/paper/specs/slider.geometry.json";
import chartSpec from "../../design/paper/specs/chart.geometry.json";
import statTilesSpec from "../../design/paper/specs/stat-tiles.geometry.json";

/** A spec case, as far as this file needs to read one. */
type Spec = {
  item: string;
  tolerance?: number;
  cases: Array<{
    name: string;
    axis: "horizontal" | "vertical";
    slots: { container: string; child: string };
    laws: string[];
    sheet: {
      // `3` and `{ top: 3, … }` mean the same thing to `sides()`, and a spec
      // uses whichever is honest: Tabs' inset is uniform, Tooltip's is 8 inline
      // and 4 block on purpose.
      container: {
        width: number;
        height: number;
        padding: number | { top: number; right: number; bottom: number; left: number };
        border: number | { top: number; right: number; bottom: number; left: number };
        radius?: number | null;
      };
      gap?: number;
      children: Array<{ width: number; height: number; radius?: number | null }>;
      gaps: { top: number; right: number; bottom: number; left: number };
    };
  }>;
};

const SPECS: Spec[] = [
  accordionSpec as Spec,
  tabsSpec as Spec,
  tableSpec as Spec,
  radioSpec as Spec,
  tooltipSpec as Spec,
  toastSpec as Spec,
  chatComposerSpec as Spec,
  chatMessageSpec as Spec,
  chatProgressSpec as Spec,
  chatWidgetSpec as Spec,
  chatQuestionnaireSpec as Spec,
  sheetSpec as Spec,
  comboboxSpec as Spec,
  sliderSpec as Spec,
  chartSpec as Spec,
  statTilesSpec as Spec,
];

/**
 * How each spec case is put on screen.
 *
 * Deliberately NOT the stories: a story is written to look right in a docs page
 * and carries whatever wrapper that needs. These are the sheet's own cases, in
 * the sheet's own composition, and nothing else.
 */
const CASES: Record<string, () => ReactElement> = {
  "table-frame": () => <Table caption="Props" size="sm" columns={[
    { key: "name", header: "Prop", cell: row => row.name },
    { key: "type", header: "Type", cell: row => row.type },
  ]} rows={[{ name: "variant", type: "primary | secondary | outline | ghost | danger | inverse" }, { name: "size", type: "sm | md | lg" }]}
    getRowId={row => row.name} rowDetails={row => row.name === "variant" ? <p>Choose the emphasis for this action.</p> : null} />,

  // ONE item, because `measure` takes every [data-slot="accordion-trigger"] on
  // screen — a second row would put its trigger into the union the gap
  // arithmetic runs over and the bottom inset would read as the whole list.
  /**
   * The panel is `fixed inset-y-0`, so its RENDERED height is the viewport's
   * and Sheet.Body is what takes the slack. `track-is-the-sum-of-its-parts`
   * therefore holds at any size and fails the moment Body stops being
   * `flex-1` or the panel grows an inset of its own — which is the regression
   * worth catching, and the one a height assertion could not express.
   */
  "sheet-panel-md": () => (
    <Sheet defaultIsOpen>
      <Sheet.Panel label="Filters" side="right" size="md">
        <Sheet.Header className="justify-end">
          <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close filters" icon={<Close />} />} />
        </Sheet.Header>
        <Sheet.Body>
          <Sheet.Title>Filters</Sheet.Title>
          <div>Asymmetric typography</div>
          <div>Grid systems</div>
        </Sheet.Body>
        <Sheet.Footer>
          <Button>Show 24 results</Button>
          <Button variant="secondary">Clear all</Button>
        </Sheet.Footer>
      </Sheet.Panel>
    </Sheet>
  ),
  "accordion-card-closed": () => (
    <Accordion variant="card">
      <Accordion.Item value="process">
        <Accordion.Trigger icon={<InfoCircle />}>What does your process look like?</Accordion.Trigger>
        <Accordion.Panel>
          Our process starts with discovery, where we understand your goals and vision.
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),
  "accordion-card-open": () => (
    <Accordion variant="card" defaultValue={["process"]}>
      <Accordion.Item value="process">
        <Accordion.Trigger icon={<InfoCircle />}>What does your process look like?</Accordion.Trigger>
        <Accordion.Panel>
          Our process starts with discovery, where we understand your goals and vision.
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),
  "enclosed-horizontal": () => (
    <Tabs defaultValue="links">
      <Tabs.List>
        <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
        <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="links">Links panel</Tabs.Panel>
      <Tabs.Panel value="appearance">Appearance panel</Tabs.Panel>
    </Tabs>
  ),
  "enclosed-vertical": () => (
    <Tabs defaultValue="links" orientation="vertical">
      <Tabs.List>
        <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
        <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
        <Tabs.Tab value="advanced">Advanced settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="links">Links panel</Tabs.Panel>
      <Tabs.Panel value="appearance">Appearance panel</Tabs.Panel>
      <Tabs.Panel value="advanced">Advanced panel</Tabs.Panel>
    </Tabs>
  ),
  "ghost-horizontal": () => (
    <Tabs defaultValue="links" variant="ghost">
      <Tabs.List>
        <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
        <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
        <Tabs.Tab value="advanced">Advanced Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="links">Links panel</Tabs.Panel>
      <Tabs.Panel value="appearance">Appearance panel</Tabs.Panel>
      <Tabs.Panel value="advanced">Advanced panel</Tabs.Panel>
    </Tabs>
  ),
  "group-vertical": () => (
    <RadioGroup label="Reviewer" defaultValue="brockmann">
      <Radio value="brockmann">Josef Müller-Brockmann</Radio>
      <Radio value="tschichold">Jan Tschichold</Radio>
      <Radio value="crouwel">Wim Crouwel</Radio>
    </RadioGroup>
  ),
  // One option, and it is the SELECTED one — the dot only exists there, and it
  // is the child this case measures.
  "control-dot": () => (
    <RadioGroup label="Reviewer" defaultValue="brockmann">
      <Radio value="brockmann">Josef Müller-Brockmann</Radio>
    </RadioGroup>
  ),
  // The sheet's anatomy toast, in its fullest form. All three toast cases
  // measure this one composition at different depths: shell → content row →
  // text column. The widths land wherever the test window puts them (the
  // viewport caps at 100vw − 32); the laws and the gap assertions are
  // width-independent by construction.
  // The sheet's own two arrangements, at its 640px column and with the slots
  // it draws filled: Add leading, Dictate trailing, Send. `layout` is pinned
  // rather than measured — this file is about the figure, and letting the
  // wrap decide it would make the case depend on a font metric.
  // The sheet's anatomy bubble: a 48px tile above two wrapped lines, at the
  // 480px the 75% cap gives on its 640 column.
  // ONE pill: the measurement selects every matching child in the document,
  // so a second activity would put four items in a two-item track.
  "chat-widget-media-container": () => (
    <div className="w-[640px]">
      <ChatWidget>
        <ChatWidget.Media ratio="landscape">
          <img src="data:," alt="A generated title slide" className="size-full object-cover" />
        </ChatWidget.Media>
        <ChatWidget.Actions>
          <Button variant="secondary" size="md">Edit</Button>
        </ChatWidget.Actions>
      </ChatWidget>
    </div>
  ),
  "chat-questionnaire-options": () => (
    <div className="w-[640px]">
      <ChatQuestionnaire
        question="Which tone should the campaign lead with?"
        options={[
          { id: "confident", label: "Confident and direct" },
          { id: "warm", label: "Warm and personal" },
          { id: "playful", label: "Playful — a wink in every line" },
          { id: "other", label: "Other — tell me in your own words…", isHandoff: true },
        ]}
      />
    </div>
  ),
  "chat-progress-activity-pill": () => (
    <div className="w-[640px]">
      <ChatProgress
        form="activity"
        activities={[{ verb: "Reading…", detail: "Grid Systems in Graphic Design — Josef Müller-Brockmann, 1961" }]}
      />
    </div>
  ),
  // The sheet's lane is 506 wide and hangs 24px in from the run's leading
  // edge, so a 530px column renders it at the sheet's own width.
  "chat-progress-lane": () => (
    <div className="w-[530px]">
      <ChatProgress
        form="parallel"
        label="Working on 1 thing"
        duration="31 s"
        isHeld
        lanes={[
          { id: "carousel", name: "Carousel", activity: "Reframing the scan to 4:5 — frame 2 of 3", status: "current", duration: "31 s" },
        ]}
      />
    </div>
  ),
  "chat-message-bubble": () => (
    <div className="w-[640px]">
      <ChatMessage.Sender attachments={<span className="size-12 shrink-0 rounded-md bg-sunken" />}>
        Create a title slide for a talk on Josef Müller-Brockmann&apos;s grid systems — use this poster scan as the
        reference.
      </ChatMessage.Sender>
    </div>
  ),
  // The receiver alone: both voices share the root slot, and the measurement
  // takes the first match.
  "chat-message-receiver": () => (
    <div className="w-[640px]">
      <ChatMessage.Receiver
        isActionsVisible
        actions={<Button variant="ghost" size="sm" isIconOnly aria-label="Copy" icon={<Plus />} />}
        meta="Diorama Agent · 2 min ago"
      >
        Here&apos;s your title slide — Aspekta headline on the brand&apos;s deep blue, with the 1961 poster grid
        recreated as a background system.
      </ChatMessage.Receiver>
    </div>
  ),
  "chat-composer-inline": () => (
    <ChatComposer
      className="w-[640px]"
      label="Message"
      placeholder="Message Diorama…"
      sendLabel="Send message"
      stopLabel="Stop generating"
      layout="inline"
      startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Plus />} />}
      endActions={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Dictate" icon={<Microphone />} />}
    />
  ),
  "chat-composer-stacked": () => (
    <ChatComposer
      className="w-[640px]"
      label="Message"
      defaultValue="Create a LinkedIn carousel about Josef Müller-Brockmann's grid systems — use the attached scan as the visual reference and keep the type strictly on the grid."
      sendLabel="Send message"
      stopLabel="Stop generating"
      layout="stacked"
      startAction={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Add" icon={<Plus />} />}
      endActions={<Button variant="ghost" shape="full" size="md" isIconOnly aria-label="Dictate" icon={<Microphone />} />}
    />
  ),
  // The inline bar's content row: label and value inside a 40px bar, 12px in
  // from each end. One slider, because `measure` takes every label on screen.
  "slider-inline-md": () => (
    <Slider label="Dot size" variant="inline" defaultValue={12} max={48} formatValue={(v) => `${v} px`} />
  ),
  "toast-shell": () => <ToastGeometryCase />,
  "toast-content-row": () => <ToastGeometryCase />,
  "toast-text-column": () => <ToastGeometryCase />,
  // `defaultIsOpen`, so the chip is on screen without driving the pointer — and
  // the string is the sheet's own, because the chip's width is its content's.
  "chip": () => (
    <Tooltip defaultIsOpen>
      <Tooltip.Trigger render={<Button variant="secondary">Trigger</Button>} />
      <Tooltip.Content>Licensing and bundling rules</Tooltip.Content>
    </Tooltip>
  ),
  // ONE row, unselected and not highlighted — the sheet's § Option rows /
  // Rest, with its own string. Combobox has no open prop (the list opens on
  // typing or ArrowDown), so the case opens it the way a keyboard user does.
  "combobox-option-row": () => <OpenCombobox />,
  // The anatomy sheet's specimen: two series, so the legend renders and the
  // frame stacks all three of its parts. One chart, because `measure` takes
  // every matching slot on screen.
  "chart-frame": () => <ChartSpecimen />,
  "chart-plot-row": () => <ChartSpecimen />,
  "chart-plot-column": () => <ChartSpecimen />,
  // The Legend toggle sheet's "Shown" entry, with its own string: the first
  // entry is Books, and `measure` reads the first container it finds.
  "chart-legend-entry": () => (
    <BarChart label="Printed" description="Books and posters." x="year" xLabel="Year"
      data={[{ year: 1957, books: 80, posters: 120 }]}
      series={[{ key: "books", label: "Books" }, { key: "posters", label: "Posters" }]} />
  ),
  // The sheet's first tile: no start hairline, and the trend as a 120×32 box
  // (a Sparkline at size sm). ONE tile, because `measure` unions every
  // matching slot on screen.
  "stat-tile": () => (
    <StatTiles>
      <StatTiles.Tile
        label="Posters printed"
        value="1,284"
        delta={{ change: 0.12, comparison: "vs 1971" }}
        trend={<svg aria-hidden="true" width="120" height="32" />}
      />
    </StatTiles>
  ),
};

function ChartSpecimen() {
  return (
    <BarChart
      label="Printed work by year"
      description="Posters led books in every year and peaked in 1972."
      data={[
        { year: 1957, posters: 120, books: 80 },
        { year: 1964, posters: 240, books: 130 },
        { year: 1972, posters: 320, books: 220 },
      ]}
      x="year"
      xLabel="Year"
      series={[
        { key: "posters", label: "Posters" },
        { key: "books", label: "Books" },
      ]}
    />
  );
}

function OpenCombobox() {
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('[data-slot="combobox-input"]');
    if (!input) return;
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  }, []);
  // One item and no action: `measure` takes EVERY element in the child slots,
  // so a second row would join the union and the insets would read as the
  // list's. (Opening by ArrowDown highlights the row — paint, not geometry.)
  return <Combobox label="Search the archive" hasTrigger={false} items={[{ value: "gutenberg", label: "Johannes Gutenberg" }]} />;
}

function AddSheetToast() {
  const manager = useToast();
  const added = useRef(false);
  useEffect(() => {
    if (added.current) return;
    added.current = true;
    manager.add({
      type: "success",
      title: "Brand kit exported",
      description: "Grid systems — Josef Müller-Brockmann, 1961",
      action: { label: "Undo", onClick: () => {} },
    });
  }, [manager]);
  return null;
}

function ToastGeometryCase() {
  return (
    // timeout 0: a specimen that dismisses itself mid-measurement is flake.
    <Toast.Provider timeout={0}>
      <AddSheetToast />
      <Toast.Viewport label="Notifications" dismissLabel="Dismiss" />
    </Toast.Provider>
  );
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  // Wide enough that a stretched track is not being sized by the viewport,
  // and the sheet's own 416px column fits inside it.
  container.style.width = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

/**
 * A surface that animates in is measured MID-TRANSITION otherwise, and
 * `getBoundingClientRect` reports the scaled box: a tooltip entering from
 * `scale-98` reads 23.70 where it settles at 24.19, and the inset assertions
 * then fail by a fraction with nothing wrong. Tabs never needed this because
 * nothing about it moves.
 */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

/**
 * Two frames for a ResizeObserver to report, then its re-render. A component
 * that sizes a part from its own measured width — Chart draws its x-axis row
 * at the plot's width — renders the server default first, and is measured at
 * that default otherwise: the plot column read a 640px tick row in a 390px
 * track. The first case to need it was chart-plot-column.
 */
async function laidOut() {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await act(async () => {});
}

/** `getComputedStyle` returns the USED width — which is the one the laws want. */
const px = (value: string) => Number.parseFloat(value) || 0;

function measure(containerSlot: string, childSlot: string, axis: "horizontal" | "vertical") {
  const el = document.querySelector<HTMLElement>(`[data-slot="${containerSlot}"]`);
  if (!el) throw new Error(`no [data-slot="${containerSlot}"] on screen`);
  // `child` may name SEVERAL slots, "|"-separated — Toast's content row is
  // four different parts in one track, and the union-gap laws want all of
  // them. Selected in document order so the track arithmetic reads the lane
  // sequence the sheet lays out.
  const childSelector = childSlot
    .split("|")
    .map((slot) => `[data-slot="${slot}"]`)
    .join(", ");
  // Children are looked for INSIDE the container. A document-wide query put
  // every matching slot on screen into the union, so a part that repeats — a
  // legend entry, an accordion row — could only be measured alone.
  const kids = Array.from(el.querySelectorAll<HTMLElement>(childSelector));
  if (!kids.length) throw new Error(`no [data-slot="${childSlot}"] on screen`);

  const cs = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const rects = kids.map((k) => k.getBoundingClientRect());

  return {
    axis,
    container: {
      width: box.width,
      height: box.height,
      padding: sides({
        top: px(cs.paddingTop), right: px(cs.paddingRight),
        bottom: px(cs.paddingBottom), left: px(cs.paddingLeft),
      }),
      border: sides({
        top: px(cs.borderTopWidth), right: px(cs.borderRightWidth),
        bottom: px(cs.borderBottomWidth), left: px(cs.borderLeftWidth),
      }),
      radius: px(cs.borderTopLeftRadius),
    },
    gap: px(cs.columnGap === "normal" ? cs.rowGap : cs.columnGap),
    children: kids.map((k, i) => ({
      width: rects[i]!.width,
      height: rects[i]!.height,
      radius: px(getComputedStyle(k).borderTopLeftRadius),
    })),
    // The union of the children against the container's border box — what a
    // person sees, and what a per-child padding readout would miss.
    gaps: {
      top: Math.min(...rects.map((r) => r.top)) - box.top,
      right: box.right - Math.max(...rects.map((r) => r.right)),
      bottom: box.bottom - Math.max(...rects.map((r) => r.bottom)),
      left: Math.min(...rects.map((r) => r.left)) - box.left,
    },
  };
}

for (const spec of SPECS) {
  describe(`${spec.item} — laid out as the sheet lays it out`, () => {
    for (const c of spec.cases) {
      const tolerance = spec.tolerance ?? 0.5;

      test(`${c.name}: obeys its declared laws`, async () => {
        mount(CASES[c.name]!());
        await laidOut();
        const el = document.querySelector(`[data-slot="${c.slots.container}"]`);
        if (el) await settled(el);
        const figure = measure(c.slots.container, c.slots.child, c.axis);
        const failures = evaluate(figure, c.laws, tolerance);
        expect(failures.length ? formatFailures(`${spec.item} › ${c.name}`, failures) : "").toBe("");
      });

      test(`${c.name}: insets match the sheet's own`, async () => {
        mount(CASES[c.name]!());
        await laidOut();
        const el = document.querySelector(`[data-slot="${c.slots.container}"]`);
        if (el) await settled(el);
        const figure = measure(c.slots.container, c.slots.child, c.axis);
        // The laws prove the render is SELF-consistent. This proves it is the
        // same figure the designer drew — a track could be uniformly inset by
        // 6px and pass every law above.
        for (const side of ["top", "right", "bottom", "left"] as const) {
          expect(
            Math.abs(figure.gaps[side] - c.sheet.gaps[side]),
            `${c.name} ${side} inset: sheet ${c.sheet.gaps[side]}px, rendered ${figure.gaps[side].toFixed(2)}px`,
          ).toBeLessThanOrEqual(tolerance);
        }
      });
    }
  });
}

/**
 * A case in the spec with nothing rendering it would assert nothing at all.
 * check:design-spec fails on that too, from the other side — this is the
 * version that fails without leaving the browser, because a spec added while
 * the node gate was not run is exactly when it matters.
 */
describe("the spec and this file cannot drift apart", () => {
  test("every spec case has a render", () => {
    const missing = SPECS.flatMap((s) => s.cases.map((c) => c.name)).filter((n) => !CASES[n]);
    expect(missing, "spec cases with no entry in CASES").toEqual([]);
  });

  test("every render belongs to a spec case", () => {
    const declared = new Set(SPECS.flatMap((s) => s.cases.map((c) => c.name)));
    expect(Object.keys(CASES).filter((n) => !declared.has(n)), "renders with no spec case").toEqual([]);
  });
});
