/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { createRef } from "react";

import { ChatSources, type ChatSource, type ChatSourcesLabels } from "./chat-sources.tsx";

const SOURCES: ChatSource[] = [
  { id: "a", kind: "web", title: "A page", origin: "a.example", href: "https://a.example" },
  { id: "b", kind: "libraryItem", title: "A book", origin: "Library · p. 48" },
];
const LABELS: ChatSourcesLabels = {
  openSource: "Open source",
  previousSource: "Previous source",
  nextSource: "Next source",
  unavailable: "No longer available",
};

export function Valid() {
  const buttonRef = createRef<HTMLButtonElement>();
  const divRef = createRef<HTMLDivElement>();
  return (
    <ChatSources.Provider sources={SOURCES} labels={LABELS} isStreaming={false} container={null}>
      <ChatSources.Citation sourceIds={["a"]} />
      <ChatSources.Citation sourceIds={["a", "b"]} ref={buttonRef} className="ms-xs" aria-describedby="x" />
      <ChatSources label="2 sources" />
      <ChatSources label="2 sources" layout="list" />
      <ChatSources label="2 sources" isGathering />
      <ChatSources label="2 sources" isGathering isHeld />
      <ChatSources label="2 sources" isOpen onOpenChange={(isOpen) => isOpen} />
      <ChatSources label="2 sources" defaultIsOpen />
      <ChatSources label="2 sources" layout="cards" moreLabel={(n) => `+${n} more`} />
      <ChatSources label="2 sources" layout="cards" moreLabel={(n) => `+${n} more`} cardCount={3} />
      {/* Native div props and the ref reach the root. */}
      <ChatSources label="2 sources" ref={divRef} id="sources-4" className="mt-lg" />
    </ChatSources.Provider>
  );
}

export function Invalid() {
  return (
    <ChatSources.Provider sources={SOURCES} labels={LABELS}>
      {/* A marker that points at nothing is a pill with no number. */}
      {/* @ts-expect-error sourceIds must be non-empty */}
      <ChatSources.Citation sourceIds={[]} />

      {/* @ts-expect-error sourceIds is required */}
      <ChatSources.Citation />

      {/* The component owns the button's type and its disabled state — a
          marker is disabled by the turn streaming, not per instance. */}
      {/* @ts-expect-error type is the component's */}
      <ChatSources.Citation sourceIds={["a"]} type="submit" />

      {/* @ts-expect-error disabled is the component's */}
      <ChatSources.Citation sourceIds={["a"]} disabled />

      {/* The count is the caller's words — the block does not pluralise. */}
      {/* @ts-expect-error label is required */}
      <ChatSources />

      {/* A cards block with no way to name the rest. */}
      {/* @ts-expect-error moreLabel is required with layout="cards" */}
      <ChatSources label="2 sources" layout="cards" />

      {/* The cards' own props do not belong on a list. */}
      {/* @ts-expect-error moreLabel is cards-only */}
      <ChatSources label="2 sources" moreLabel={(n: number) => `+${n} more`} />

      {/* @ts-expect-error cardCount is cards-only */}
      <ChatSources label="2 sources" layout="list" cardCount={3} />

      {/* @ts-expect-error the layout axis is closed */}
      <ChatSources label="2 sources" layout="grid" />

      {/* §1: the boolean is `is*`, the callback receives it. */}
      {/* @ts-expect-error open is spelled isOpen */}
      <ChatSources label="2 sources" open />
    </ChatSources.Provider>
  );
}

export function InvalidData() {
  return (
    <>
      {/* @ts-expect-error labels are required — strings are props, not a runtime */}
      <ChatSources.Provider sources={SOURCES}>{null}</ChatSources.Provider>

      <ChatSources.Provider
        // @ts-expect-error the kind axis is closed: a fifth kind is a design decision
        sources={[{ id: "x", kind: "video", title: "A clip", origin: "x.example" }]}
        labels={LABELS}
      >
        {null}
      </ChatSources.Provider>

      <ChatSources.Provider
        // @ts-expect-error a source needs an origin — every surface draws one
        sources={[{ id: "x", kind: "web", title: "A page" }]}
        labels={LABELS}
      >
        {null}
      </ChatSources.Provider>
    </>
  );
}
