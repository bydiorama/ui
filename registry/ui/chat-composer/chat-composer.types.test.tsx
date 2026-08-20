/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { Button } from "@/ui/button/button.tsx";
import { ChatComposer } from "./chat-composer.tsx";

export function Valid() {
  return (
    <>
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" placeholder="Message Diorama…" />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" defaultValue="Draft" />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" value="" onValueChange={() => {}} />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" onSubmitAction={(value) => value.length} />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" isGenerating onStopAction={() => {}} />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" isDisabled errorText="Too large" />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" layout="stacked" maxRows={4} />
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" isDropActive dropLabel="Drop to attach" />
      <ChatComposer
        label="Message"
        sendLabel="Send"
        stopLabel="Stop"
        startAction={<Button variant="ghost" isIconOnly aria-label="Add" />}
        endActions={<Button variant="ghost" isIconOnly aria-label="Dictate" />}
        attachments={<span />}
        disclaimer="Diorama Agent can make mistakes."
      />
      {/* Native textarea attributes stay native and land on the control. */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" name="prompt" maxLength={4000} autoFocus />
      {/* The consumer's key handler composes with the Enter contract. */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" onKeyDown={(event) => event.key} />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A field with no accessible name is unusable to a screen reader and
          looks perfectly fine in review — so the type refuses it. */}
      {/* @ts-expect-error label is required */}
      <ChatComposer sendLabel="Send" stopLabel="Stop" />

      {/* Both button names are required, for the same reason Button's
          isIconOnly requires aria-label: an unnamed icon button announces as
          "button". stopLabel is required even when the composer never
          generates — see the prop note for why a union cannot express it. */}
      {/* @ts-expect-error sendLabel is required */}
      <ChatComposer label="Message" stopLabel="Stop" />

      {/* @ts-expect-error stopLabel is required */}
      <ChatComposer label="Message" sendLabel="Send" />

      {/* One way to express the state (CONVENTIONS §1) — the native attribute
          is omitted so it cannot compete with isDisabled. */}
      {/* @ts-expect-error use isDisabled, not the native disabled */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" disabled />

      {/* `rows` is refused rather than ignored: the height is measured from
          the content and capped at maxRows, so a caller's row count would be
          overwritten on the first keystroke. */}
      {/* @ts-expect-error rows has no effect — the field measures its content */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" rows={4} />

      {/* Same for cols: the control is w-full, so a character width never
          reaches layout. */}
      {/* @ts-expect-error cols has no effect; size the composer with className */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" cols={40} />

      {/* The value change callback is onValueChange (§1), not the DOM event —
          `onChange` is omitted so the two cannot both be wired. */}
      {/* @ts-expect-error use onValueChange, not the native onChange */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" onChange={() => {}} />

      {/* Layout is a closed set. */}
      {/* @ts-expect-error unknown layout */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" layout="pill" />

      {/* An action callback, not a value. Named `onSubmitAction` per §1 — and
          deliberately not `onSubmit`, which IS a DOM event and would compile
          against HTMLAttributes while doing something else entirely. */}
      {/* @ts-expect-error onSubmitAction takes the value, not an event */}
      <ChatComposer label="Message" sendLabel="Send" stopLabel="Stop" onSubmitAction={(event: Event) => event.type} />
    </>
  );
}
