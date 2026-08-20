/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { ChatQuestionnaire, type ChatQuestionnaireOption, type ChatQuestionnaireTile } from "./chat-questionnaire.tsx";

const OPTIONS: ChatQuestionnaireOption[] = [{ id: "a", label: "Confident and direct" }];
const TILES: ChatQuestionnaireTile[] = [{ id: "a", label: "Botanical", src: "x", alt: "A leaf" }];

export function Valid() {
  return (
    <>
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} mode="single" />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} variant="list" />
      <ChatQuestionnaire question="Which direction?" variant="tiles" options={TILES} />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} defaultValue={["a"]} />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} value={["a"]} onValueChange={(next) => next.length} />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} onSubmitAction={(value) => value.join()} />
      <ChatQuestionnaire
        question="Which formats?"
        mode="multiple"
        options={OPTIONS}
        confirmLabel="Confirm — 2 picked"
        skipLabel="Skip"
        onSkipAction={() => {}}
        onSubmitAction={() => {}}
      />
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} answer="Warm and personal" />
      {/* A handoff is an option that does not answer. */}
      <ChatQuestionnaire question="Which tone?" options={[{ id: "other", label: "Other…", isHandoff: true }]} />
      {/* Native div props reach the outermost node. */}
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} id="q-1" className="mt-lg" />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A questionnaire with no question is a list of buttons. */}
      {/* @ts-expect-error question is required */}
      <ChatQuestionnaire options={OPTIONS} />

      {/* @ts-expect-error options are required */}
      <ChatQuestionnaire question="Which tone?" />

      {/* A tile is a PICTURE, and alt is not optional on a picture — a row of
          unnamed tiles is a row of grey squares to anyone not looking at it. */}
      {/* @ts-expect-error tiles need src and alt */}
      <ChatQuestionnaire question="Which direction?" variant="tiles" options={OPTIONS} />

      {/* @ts-expect-error alt is required on a tile */}
      <ChatQuestionnaire question="Which direction?" variant="tiles" options={[{ id: "a", label: "b", src: "x" }]} />

      {/* Both axes are closed sets. */}
      {/* @ts-expect-error unknown mode */}
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} mode="any" />

      {/* @ts-expect-error unknown variant */}
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} variant="grid" />

      {/* The value is ALWAYS an array, including single-select — two shapes for
          one concept is how a caller writes a branch it does not need. */}
      {/* @ts-expect-error value is string[], not string */}
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} value="a" />

      {/* The change callback is onValueChange (§1); the DOM event is omitted so
          the two cannot both be wired. */}
      {/* @ts-expect-error use onValueChange, not the native onChange */}
      <ChatQuestionnaire question="Which tone?" options={OPTIONS} onChange={() => {}} />
    </>
  );
}
