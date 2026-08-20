/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { Button } from "@/ui/button/button.tsx";
import { ChatMessage } from "./chat-message.tsx";

export function Valid() {
  return (
    <>
      <ChatMessage.Sender>Hello</ChatMessage.Sender>
      <ChatMessage.Sender size="sm">Hello</ChatMessage.Sender>
      <ChatMessage.Sender status="sent">Hello</ChatMessage.Sender>
      <ChatMessage.Sender status="sending" statusText="Sending…">Hello</ChatMessage.Sender>
      <ChatMessage.Sender status="failed" statusText="Not sent" retryLabel="Retry" onRetryAction={() => {}}>
        Hello
      </ChatMessage.Sender>
      <ChatMessage.Sender attachments={<span />}>Hello</ChatMessage.Sender>

      <ChatMessage.Receiver>An answer</ChatMessage.Receiver>
      <ChatMessage.Receiver size="sm" isStreaming>An answer</ChatMessage.Receiver>
      <ChatMessage.Receiver actions={<Button isIconOnly aria-label="Copy" />} meta="Agent · now">
        An answer
      </ChatMessage.Receiver>
      <ChatMessage.Receiver isActionsVisible errorText="Stopped">An answer</ChatMessage.Receiver>
      <ChatMessage.Receiver errorText="Stopped" retryLabel="Retry" onRetryAction={() => {}}>
        An answer
      </ChatMessage.Receiver>
      {/* Native div props reach the outermost node. */}
      <ChatMessage.Receiver id="turn-4" className="mt-lg" onMouseEnter={() => {}}>An answer</ChatMessage.Receiver>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The caption is the ONLY channel carrying delivery state — the bubble's
          fill never moves — so a pending message with no caption has no state
          at all. A type, not a doc note. */}
      {/* @ts-expect-error statusText is required once status leaves "sent" */}
      <ChatMessage.Sender status="sending">Hello</ChatMessage.Sender>

      {/* @ts-expect-error statusText is required for failed too */}
      <ChatMessage.Sender status="failed">Hello</ChatMessage.Sender>

      {/* A retry handler with no label is a button that announces as "button". */}
      {/* @ts-expect-error retryLabel travels with onRetryAction */}
      <ChatMessage.Receiver errorText="Stopped" onRetryAction={() => {}}>An answer</ChatMessage.Receiver>

      {/* @ts-expect-error and the label alone does nothing */}
      <ChatMessage.Sender status="failed" statusText="Not sent" retryLabel="Retry">Hello</ChatMessage.Sender>

      {/* Sizes are the library's shared vocabulary, and this component ships
          two of them. */}
      {/* @ts-expect-error unknown size */}
      <ChatMessage.Receiver size="lg">An answer</ChatMessage.Receiver>

      {/* The receiver has NO bubble by design, so it has no attachment slot
          inside one — attachments belong to the person's turn. */}
      {/* @ts-expect-error attachments is the sender's */}
      <ChatMessage.Receiver attachments={<span />}>An answer</ChatMessage.Receiver>

      {/* …and the sender has no actions row: the row belongs under the answer. */}
      {/* @ts-expect-error actions is the receiver's */}
      <ChatMessage.Sender actions={<span />}>Hello</ChatMessage.Sender>

      {/* Streaming is a property of an answer being written, not of a message
          that has already been sent. */}
      {/* @ts-expect-error isStreaming is the receiver's */}
      <ChatMessage.Sender isStreaming>Hello</ChatMessage.Sender>

      {/* Both voices require content — an empty turn is not a turn. */}
      {/* @ts-expect-error children are required */}
      <ChatMessage.Sender />
    </>
  );
}
