import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { ChatMessage } from "./chat-message.tsx";

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
  return { container: c, q };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const ACTIONS = (
  <>
    <Button variant="ghost" size="sm" isIconOnly aria-label="Copy answer" />
    <Button variant="ghost" size="sm" isIconOnly aria-label="Regenerate" />
  </>
);

describe("ChatMessage — the two voices differ", () => {
  /**
   * The whole design is the asymmetry, and every gate but this one is blind to
   * it: both voices resolve legal utilities, declare legal colours and render
   * accessible markup. What has to be true is that they do NOT look alike.
   */
  test.each(["light", "dark"] as const)("the sender has a fill and the receiver has none — %s", async (scheme) => {
    const { q, container: c } = mount(
      <>
        <ChatMessage.Sender>Question</ChatMessage.Sender>
        <ChatMessage.Receiver>Answer</ChatMessage.Receiver>
      </>,
      scheme,
    );
    const bubble = q<HTMLElement>("chat-message-bubble")!;
    const body = q<HTMLElement>("chat-message-body")!;
    await settled(bubble);

    const page = getComputedStyle(c).backgroundColor;
    expect(getComputedStyle(bubble).backgroundColor).not.toBe(page);
    // The receiver is the page. A fill here would be the bubble the sheet
    // spends its whole intro arguing against.
    expect(getComputedStyle(body).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(bubble).borderTopWidth).toBe("0px");
  });

  test("the receiver's leading is looser than the sender's — its signature", () => {
    const { container: c } = mount(
      <>
        <ChatMessage.Sender>Question</ChatMessage.Sender>
        <ChatMessage.Receiver>Answer</ChatMessage.Receiver>
      </>,
    );
    const bubble = c.querySelector<HTMLElement>('[data-slot="chat-message-bubble"]')!;
    const body = c.querySelector<HTMLElement>('[data-slot="chat-message-body"]')!;

    const senderLeading = parseFloat(getComputedStyle(bubble).lineHeight);
    const receiverLeading = parseFloat(getComputedStyle(body).lineHeight);
    // leading-normal (135%) against leading-relaxed (155%) at the same size —
    // asserted as an ORDERING, so it survives a change to either token.
    expect(receiverLeading).toBeGreaterThan(senderLeading);
    expect(parseFloat(getComputedStyle(body).fontSize)).toBe(
      parseFloat(getComputedStyle(bubble).fontSize),
    );
  });

  /** Long enough that the bubble reaches its cap rather than its content. */
  const LONG =
    "Create a title slide for a talk on Josef Muller-Brockmann's grid systems and use the attached poster scan as the visual reference throughout.";

  test("the sender is right-aligned and capped; the receiver takes the column", () => {
    const { container: c } = mount(
      <div style={{ width: "640px" }}>
        <ChatMessage.Sender>{LONG}</ChatMessage.Sender>
        <ChatMessage.Receiver>Answer</ChatMessage.Receiver>
      </div>,
    );
    const senderRoot = c.querySelectorAll<HTMLElement>('[data-slot="chat-message"]')[0]!;
    const bubble = c.querySelector<HTMLElement>('[data-slot="chat-message-bubble"]')!;
    const body = c.querySelector<HTMLElement>('[data-slot="chat-message-body"]')!;

    // 75% of 640 = 480, the sheet's own cap. Measured on the RECT, not read
    // from `max-width` — Chromium returns a percentage there verbatim, so the
    // obvious assertion would pass against a cap that resolved to nothing.
    expect(Math.round(bubble.getBoundingClientRect().width)).toBe(480);
    // Flush with the trailing edge of its row.
    expect(Math.round(bubble.getBoundingClientRect().right)).toBe(
      Math.round(senderRoot.getBoundingClientRect().right),
    );
    expect(Math.round(body.getBoundingClientRect().width)).toBe(640);
  });

  test("the cap is a custom property a narrow column can move", () => {
    const { container: c } = mount(
      <div style={{ width: "400px" }}>
        <ChatMessage.Sender className="[--ui-chat-message-bubble-max-width:85%]">{LONG}</ChatMessage.Sender>
      </div>,
    );
    // 85% of 400 = 340. A caller's className lands after the default, so the
    // override wins by order rather than by specificity arithmetic.
    expect(
      Math.round(c.querySelector('[data-slot="chat-message-bubble"]')!.getBoundingClientRect().width),
    ).toBe(340);
  });
});

describe("ChatMessage.Sender status", () => {
  test("the bubble's fill does NOT move with status — the caption carries it", async () => {
    const sent = mount(<ChatMessage.Sender>Question</ChatMessage.Sender>, "light");
    const sentFill = getComputedStyle(sent.q<HTMLElement>("chat-message-bubble")!).backgroundColor;
    unmount();

    const failed = mount(
      <ChatMessage.Sender status="failed" statusText="Not sent">Question</ChatMessage.Sender>,
      "light",
    );
    const failedFill = getComputedStyle(failed.q<HTMLElement>("chat-message-bubble")!).backgroundColor;

    expect(failedFill).toBe(sentFill);
    expect(failed.q("chat-message-status")!.textContent).toContain("Not sent");
  });

  test("failed and sending captions are different inks", () => {
    const sending = mount(
      <ChatMessage.Sender status="sending" statusText="Sending…">Question</ChatMessage.Sender>,
      "light",
    );
    const sendingInk = getComputedStyle(sending.q<HTMLElement>("chat-message-status")!.firstElementChild!).color;
    unmount();

    const failed = mount(
      <ChatMessage.Sender status="failed" statusText="Not sent">Question</ChatMessage.Sender>,
      "light",
    );
    const failedInk = getComputedStyle(failed.q<HTMLElement>("chat-message-status")!.firstElementChild!).color;

    // Two states that must differ, asserted as a difference: pinning two hexes
    // would pass while they converged.
    expect(failedInk).not.toBe(sendingInk);
  });

  test("retry is a real control, not a word in a caption", async () => {
    let retried = 0;
    const { q } = mount(
      <ChatMessage.Sender status="failed" statusText="Not sent" retryLabel="Retry" onRetryAction={() => (retried += 1)}>
        Question
      </ChatMessage.Sender>,
    );
    const retry = q<HTMLButtonElement>("chat-message-retry")!;

    expect(retry.tagName).toBe("BUTTON");
    retry.focus();
    // Implicit activation: a real button answers Enter with no key handler.
    await userEvent.keyboard("{Enter}");
    expect(retried).toBe(1);
  });

  test("attachments sit inside the bubble, above the text", () => {
    const { q } = mount(
      <ChatMessage.Sender attachments={<span data-slot="probe-tile" className="size-12 bg-sunken" />}>
        Question
      </ChatMessage.Sender>,
    );
    const bubble = q<HTMLElement>("chat-message-bubble")!;
    const attachments = q<HTMLElement>("chat-message-attachments")!;

    expect(bubble.contains(attachments)).toBe(true);
    expect(attachments.getBoundingClientRect().top).toBeLessThan(bubble.getBoundingClientRect().bottom);
    // Above the text, which is the next child.
    expect(attachments.nextElementSibling ?? bubble.lastChild).toBeTruthy();
    expect(Array.from(bubble.children).indexOf(attachments)).toBe(0);
  });
});

describe("ChatMessage.Receiver states", () => {
  test("streaming draws the caret and WITHHOLDS the actions row", () => {
    const { q } = mount(
      <ChatMessage.Receiver isStreaming actions={ACTIONS} meta="Agent">Half an answer</ChatMessage.Receiver>,
    );

    expect(q("chat-message-caret")).not.toBeNull();
    // Not hidden — absent. A hidden row would put two tab stops in front of an
    // answer that is still being written.
    expect(q("chat-message-actions")).toBeNull();
    expect(q<HTMLElement>("chat-message-caret")!.getAttribute("aria-hidden")).toBe("true");
  });

  test("settled drops the caret and shows the row", () => {
    const { q } = mount(
      <ChatMessage.Receiver actions={ACTIONS} meta="Agent · now" isActionsVisible>A whole answer</ChatMessage.Receiver>,
    );

    expect(q("chat-message-caret")).toBeNull();
    expect(q("chat-message-actions")).not.toBeNull();
    expect(q("chat-message-meta")!.textContent).toBe("Agent · now");
  });

  test("the actions row is revealed by FOCUS as well as by hover", async () => {
    const { q } = mount(<ChatMessage.Receiver actions={ACTIONS} meta="Agent">An answer</ChatMessage.Receiver>);
    const row = q<HTMLElement>("chat-message-actions")!;
    await settled(row);

    expect(getComputedStyle(row).opacity).toBe("0");

    const first = row.querySelector("button")!;
    act(() => first.focus());
    await settled(row);

    // A row that only answers the pointer is one a keyboard user can reach and
    // cannot see — SC 2.4.7, and the reason opacity is used instead of mounting.
    expect(getComputedStyle(row).opacity).toBe("1");
  });

  test("a hidden actions row is still reachable — it is never unmounted", () => {
    const { q } = mount(<ChatMessage.Receiver actions={ACTIONS}>An answer</ChatMessage.Receiver>);
    const row = q<HTMLElement>("chat-message-actions")!;

    expect(getComputedStyle(row).opacity).toBe("0");
    expect(getComputedStyle(row).display).not.toBe("none");
    expect(row.querySelectorAll("button")).toHaveLength(2);
  });

  test("the failure block is inside the message, announced, and keeps the partial answer", async () => {
    let retried = 0;
    const { q } = mount(
      <ChatMessage.Receiver
        errorText="Generation stopped — connection lost."
        retryLabel="Retry"
        onRetryAction={() => (retried += 1)}
      >
        Half an answer
      </ChatMessage.Receiver>,
      "light",
    );
    const error = q<HTMLElement>("chat-message-error")!;
    const body = q<HTMLElement>("chat-message-body")!;

    expect(error.getAttribute("role")).toBe("status");
    // Under the partial answer, not replacing it.
    expect(body.textContent).toContain("Half an answer");
    expect(error.getBoundingClientRect().top).toBeGreaterThanOrEqual(body.getBoundingClientRect().bottom);
    // A tinted surface of its own, so it reads as a block rather than as prose.
    expect(getComputedStyle(error).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

    await userEvent.click(q<HTMLButtonElement>("chat-message-retry")!);
    expect(retried).toBe(1);
  });
});

describe("ChatMessage forwarding (CONVENTIONS §5)", () => {
  test("ref and className land on the outermost node of each voice", () => {
    const senderRef = createRef<HTMLDivElement>();
    const receiverRef = createRef<HTMLDivElement>();
    const { container: c } = mount(
      <>
        <ChatMessage.Sender ref={senderRef} className="mt-lg">Question</ChatMessage.Sender>
        <ChatMessage.Receiver ref={receiverRef} className="mb-lg">Answer</ChatMessage.Receiver>
      </>,
    );

    const roots = c.querySelectorAll<HTMLElement>('[data-slot="chat-message"]');
    expect(senderRef.current).toBe(roots[0]);
    expect(receiverRef.current).toBe(roots[1]);
    expect(senderRef.current!.dataset.role).toBe("sender");
    expect(receiverRef.current!.dataset.role).toBe("receiver");
    expect(getComputedStyle(senderRef.current!).marginTop).toBe("16px");
  });

  test("native props reach the same node", () => {
    const { container: c } = mount(<ChatMessage.Receiver id="turn-4">Answer</ChatMessage.Receiver>);
    expect(c.querySelector<HTMLElement>('[data-slot="chat-message"]')!.id).toBe("turn-4");
  });

  test("size steps the type on both voices, and they step together", () => {
    const md = mount(
      <>
        <ChatMessage.Sender>Question</ChatMessage.Sender>
        <ChatMessage.Receiver>Answer</ChatMessage.Receiver>
      </>,
    );
    const mdSender = parseFloat(getComputedStyle(md.q<HTMLElement>("chat-message-bubble")!).fontSize);
    const mdReceiver = parseFloat(getComputedStyle(md.q<HTMLElement>("chat-message-body")!).fontSize);
    unmount();

    const sm = mount(
      <>
        <ChatMessage.Sender size="sm">Question</ChatMessage.Sender>
        <ChatMessage.Receiver size="sm">Answer</ChatMessage.Receiver>
      </>,
    );
    const smSender = parseFloat(getComputedStyle(sm.q<HTMLElement>("chat-message-bubble")!).fontSize);
    const smReceiver = parseFloat(getComputedStyle(sm.q<HTMLElement>("chat-message-body")!).fontSize);

    // The two sizes must DIFFER — Badge shipped two that were pixel-identical
    // while every test passed — and the two voices must differ together, or a
    // sidebar exchange reads at two scales.
    expect(smSender).toBeLessThan(mdSender);
    expect(smReceiver).toBeLessThan(mdReceiver);
    expect(smSender).toBe(smReceiver);

    // The bubble's inset steps with it.
    expect(parseFloat(getComputedStyle(sm.q<HTMLElement>("chat-message-bubble")!).paddingLeft)).toBeLessThan(12.001);
  });
});
