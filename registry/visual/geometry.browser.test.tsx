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
import { Plus, Microphone } from "griddy-icons";

// The laws, and the spec, are the SAME artefacts the node-side gate reads.
// Importing them rather than restating them is the whole point — a second copy
// of the numbers is a second thing to drift.
import { evaluate, sides, formatFailures } from "../../scripts/lib/geometry-laws.mjs";
import tabsSpec from "../../design/paper/specs/tabs.geometry.json";
import radioSpec from "../../design/paper/specs/radio.geometry.json";
import tooltipSpec from "../../design/paper/specs/tooltip.geometry.json";
import toastSpec from "../../design/paper/specs/toast.geometry.json";
import chatComposerSpec from "../../design/paper/specs/chat-composer.geometry.json";
import chatMessageSpec from "../../design/paper/specs/chat-message.geometry.json";
import chatProgressSpec from "../../design/paper/specs/chat-progress.geometry.json";
import chatWidgetSpec from "../../design/paper/specs/chat-widget.geometry.json";
import chatQuestionnaireSpec from "../../design/paper/specs/chat-questionnaire.geometry.json";

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
  tabsSpec as Spec,
  radioSpec as Spec,
  tooltipSpec as Spec,
  toastSpec as Spec,
  chatComposerSpec as Spec,
  chatMessageSpec as Spec,
  chatProgressSpec as Spec,
  chatWidgetSpec as Spec,
  chatQuestionnaireSpec as Spec,
];

/**
 * How each spec case is put on screen.
 *
 * Deliberately NOT the stories: a story is written to look right in a docs page
 * and carries whatever wrapper that needs. These are the sheet's own cases, in
 * the sheet's own composition, and nothing else.
 */
const CASES: Record<string, () => ReactElement> = {
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
  "chat-progress-steps": () => (
    <div className="w-[640px]">
      <ChatProgress
        form="steps"
        label="Gathering brand resources"
        duration="12 s"
        steps={[
          { id: "tone", label: "Tone of voice — 2 documents", status: "done" },
          { id: "styles", label: "Brand styles — palette and type ramp", status: "done" },
          { id: "images", label: "Collecting images — 8 of 12", status: "current" },
          { id: "moodboard", label: "Compose moodboard", status: "pending" },
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
};

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
  const kids = Array.from(document.querySelectorAll<HTMLElement>(childSelector));
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
        const el = document.querySelector(`[data-slot="${c.slots.container}"]`);
        if (el) await settled(el);
        const figure = measure(c.slots.container, c.slots.child, c.axis);
        const failures = evaluate(figure, c.laws, tolerance);
        expect(failures.length ? formatFailures(`${spec.item} › ${c.name}`, failures) : "").toBe("");
      });

      test(`${c.name}: insets match the sheet's own`, async () => {
        mount(CASES[c.name]!());
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
