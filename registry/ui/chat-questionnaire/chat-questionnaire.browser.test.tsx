import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import {
  ChatQuestionnaire,
  type ChatQuestionnaireOption,
  type ChatQuestionnaireTile,
} from "./chat-questionnaire.tsx";

/** Wait out any running transition before reading computed style. */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement, scheme?: "light" | "dark") {
  container = document.createElement("div");
  if (scheme) {
    Object.assign(
      container.style,
      toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
      { colorScheme: scheme },
    );
    container.className = "bg-base";
  }
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const c = container;
  const q = <T extends HTMLElement>(slot: string) => c.querySelector<T>(`[data-slot="${slot}"]`);
  const all = (slot: string) => Array.from(c.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`));
  return { container: c, q, all };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const TONE: ChatQuestionnaireOption[] = [
  { id: "confident", label: "Confident and direct" },
  { id: "warm", label: "Warm and personal" },
  { id: "other", label: "Other — tell me in your own words…", isHandoff: true },
];

const TILES: ChatQuestionnaireTile[] = [
  { id: "botanical", label: "Botanical macro", src: "data:,", alt: "A leaf against a dark ground" },
  { id: "studio", label: "Studio still life", src: "data:,", alt: "Objects on a seamless backdrop" },
];

describe("ChatQuestionnaire answering", () => {
  test("single-select COMMITS on tap — there is no Confirm to press", async () => {
    const submitted: string[][] = [];
    const { all, q } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE} onSubmitAction={(v) => submitted.push(v)} />,
    );

    await userEvent.click(all("chat-questionnaire-option")[1]!);

    expect(submitted).toEqual([["warm"]]);
    // The tap IS the commit, so the widget never grows a second step.
    expect(q("chat-questionnaire-confirm")).toBeNull();
  });

  test("multi-select toggles and waits for Confirm", async () => {
    const submitted: string[][] = [];
    const { all, container: c } = mount(
      <ChatQuestionnaire
        question="Which formats?"
        mode="multiple"
        options={TONE.slice(0, 2)}
        confirmLabel="Confirm"
        onSubmitAction={(v) => submitted.push(v)}
      />,
    );
    const options = all("chat-questionnaire-option");

    await userEvent.click(options[0]!);
    await userEvent.click(options[1]!);
    expect(submitted).toEqual([]);
    expect(options[0]!.getAttribute("aria-pressed")).toBe("true");

    // Toggling OFF is what makes it multi-select rather than multi-add.
    await userEvent.click(options[0]!);
    expect(options[0]!.getAttribute("aria-pressed")).toBe("false");

    const confirm = Array.from(c.querySelectorAll("button")).find((b) => b.textContent === "Confirm")!;
    await userEvent.click(confirm);
    expect(submitted).toEqual([["warm"]]);
  });

  test("Confirm is disabled until something is picked", () => {
    const { container: c } = mount(
      <ChatQuestionnaire
        question="Which formats?"
        mode="multiple"
        options={TONE.slice(0, 2)}
        confirmLabel="Confirm"
        onSubmitAction={() => {}}
      />,
    );
    const confirm = Array.from(c.querySelectorAll("button")).find((b) => b.textContent === "Confirm")!;
    expect(confirm.disabled).toBe(true);
  });

  test("a handoff option submits its own id and selects NOTHING", async () => {
    const submitted: string[][] = [];
    const { all } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE} onSubmitAction={(v) => submitted.push(v)} />,
    );
    const handoff = all("chat-questionnaire-option")[2]!;

    await userEvent.click(handoff);

    expect(submitted).toEqual([["other"]]);
    // It does not answer the question — it moves the cursor, which is the
    // caller's to do. Nothing here is chosen.
    expect(all("chat-questionnaire-option").some((o) => o.dataset.selected)).toBe(false);
  });

  test("a controlled value never moves on its own", async () => {
    const seen: string[][] = [];
    const { all } = mount(
      <ChatQuestionnaire
        question="Which formats?"
        mode="multiple"
        options={TONE.slice(0, 2)}
        value={[]}
        onValueChange={(next) => seen.push(next)}
      />,
    );

    await userEvent.click(all("chat-questionnaire-option")[0]!);
    expect(seen).toEqual([["confident"]]);
    expect(all("chat-questionnaire-option")[0]!.dataset.selected).toBeUndefined();
  });

  test("answered collapses to the receipt and keeps the question", () => {
    const { q, all } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE} answer="Warm and personal" />,
    );

    expect(q("chat-questionnaire")!.dataset.answered).toBe("true");
    // An answer with no question is a fragment, and a thread is read from the
    // top — so the question stays and the options leave.
    expect(q("chat-questionnaire-question")!.textContent).toBe("Which tone?");
    expect(all("chat-questionnaire-option")).toHaveLength(0);
    expect(q("chat-questionnaire-answer")!.textContent).toBe("Warm and personal");
  });
});

describe("ChatQuestionnaire selection language", () => {
  test.each(["light", "dark"] as const)(
    "the chosen option keeps its FILL and changes its EDGE — %s",
    async (scheme) => {
      const { all } = mount(
        <ChatQuestionnaire question="Which tone?" options={TONE.slice(0, 2)} defaultValue={["confident"]} />,
        scheme,
      );
      const [chosen, other] = all("chat-questionnaire-option");
      await settled(chosen!);
      await settled(other!);

      // Card Sorting's active card, verbatim. If the fill ever moves, the
      // accent stops being reserved for Send/Confirm/the Badge — and selection
      // starts competing with hover, which is a fill.
      expect(getComputedStyle(chosen!).backgroundColor).toBe(getComputedStyle(other!).backgroundColor);
      expect(getComputedStyle(chosen!).borderTopColor).not.toBe(getComputedStyle(other!).borderTopColor);
    },
  );

  test("the edge is not the only channel — a check comes with it", () => {
    const { all } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE.slice(0, 2)} defaultValue={["confident"]} />,
    );
    const [chosen, other] = all("chat-questionnaire-option");

    // SC 1.4.1: colour is never the only channel carrying state.
    expect(chosen!.querySelector('[data-slot="chat-questionnaire-check"]')).not.toBeNull();
    expect(other!.querySelector('[data-slot="chat-questionnaire-check"]')).toBeNull();
  });

  test("hover is a fill and selection is an edge, so the two never collide", async () => {
    const { all } = mount(<ChatQuestionnaire question="Which tone?" options={TONE.slice(0, 2)} />, "light");
    const option = all("chat-questionnaire-option")[0]!;

    const resting = getComputedStyle(option).backgroundColor;
    await userEvent.hover(option);
    await settled(option);
    const hovered = getComputedStyle(option).backgroundColor;

    expect(hovered).not.toBe(resting);
    // …and hover leaves the edge alone, which is what stops the known
    // bg-hover / bg-selected collision from reaching this component.
    expect(getComputedStyle(option).borderTopColor).toBe(
      getComputedStyle(all("chat-questionnaire-option")[1]!).borderTopColor,
    );
  });

  test("the options are a named group, and every option is a real button", () => {
    const { q, all } = mount(<ChatQuestionnaire question="Which tone?" options={TONE} />);
    const group = q<HTMLElement>("chat-questionnaire-options")!;
    const question = q<HTMLElement>("chat-questionnaire-question")!;

    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-labelledby")).toBe(question.id);
    expect(question.id).not.toBe("");
    for (const option of all("chat-questionnaire-option")) expect(option.tagName).toBe("BUTTON");
  });

  test("single-select marks the answer with aria-current, not aria-pressed", () => {
    const { all } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE.slice(0, 2)} defaultValue={["confident"]} />,
    );
    const [chosen] = all("chat-questionnaire-option");

    // A press ANSWERS the question rather than moving a selection around, so a
    // row of "toggle button, not pressed" would describe the wrong widget.
    expect(chosen!.getAttribute("aria-current")).toBe("true");
    expect(chosen!.getAttribute("aria-pressed")).toBeNull();
  });

  test("Enter activates an option — it is a button, so nothing is faked", async () => {
    const submitted: string[][] = [];
    const { all } = mount(
      <ChatQuestionnaire question="Which tone?" options={TONE} onSubmitAction={(v) => submitted.push(v)} />,
    );

    act(() => all("chat-questionnaire-option")[0]!.focus());
    await userEvent.keyboard("{Enter}");
    expect(submitted).toEqual([["confident"]]);
  });
});

describe("ChatQuestionnaire tiles", () => {
  test("a tile carries its picture's alt as well as its caption", () => {
    const { all } = mount(<ChatQuestionnaire question="Which direction?" variant="tiles" options={TILES} />);
    const first = all("chat-questionnaire-option")[0]!;

    expect(first.querySelector("img")!.alt).toBe("A leaf against a dark ground");
    expect(first.textContent).toContain("Botanical macro");
  });

  test("the selection outline sits OUTSIDE the media", async () => {
    const { all } = mount(
      <ChatQuestionnaire
        question="Which direction?"
        variant="tiles"
        options={TILES}
        defaultValue={["botanical"]}
      />,
      "light",
    );
    const [chosen, other] = all("chat-questionnaire-option");
    const chosenTile = chosen!.querySelector<HTMLElement>('[data-slot="chat-questionnaire-tile"]')!;
    const otherTile = other!.querySelector<HTMLElement>('[data-slot="chat-questionnaire-tile"]')!;
    await settled(chosenTile);

    // Offset, so the photograph keeps its own edge — the outline is about the
    // tile, not about the picture.
    expect(parseFloat(getComputedStyle(chosenTile).outlineOffset)).toBeGreaterThan(0);
    expect(getComputedStyle(chosenTile).outlineColor).not.toBe(getComputedStyle(otherTile).outlineColor);
    expect(chosen!.querySelector('[data-slot="chat-questionnaire-check"]')).not.toBeNull();
  });

  test("tiles lay out four across", () => {
    const { q } = mount(<ChatQuestionnaire question="Which direction?" variant="tiles" options={TILES} />);
    expect(getComputedStyle(q<HTMLElement>("chat-questionnaire-options")!).gridTemplateColumns.split(" ")).toHaveLength(4);
  });
});

describe("ChatQuestionnaire forwarding (CONVENTIONS §5)", () => {
  test("ref, className and native props land on the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { q } = mount(
      <ChatQuestionnaire ref={ref} question="Which tone?" options={TONE} className="mt-lg" id="q-1" />,
    );
    const rootEl = q<HTMLElement>("chat-questionnaire")!;

    expect(ref.current).toBe(rootEl);
    expect(rootEl.id).toBe("q-1");
    expect(getComputedStyle(rootEl).marginTop).toBe("16px");
  });

  test("the option list never reaches the DOM as an attribute", () => {
    const { q } = mount(<ChatQuestionnaire question="Which tone?" options={TONE} />);
    const rootEl = q<HTMLElement>("chat-questionnaire")!;

    expect(rootEl.getAttribute("options")).toBeNull();
    expect(rootEl.getAttribute("question")).toBeNull();
  });
});
