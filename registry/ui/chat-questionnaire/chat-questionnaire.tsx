"use client";

import { forwardRef, useId, type HTMLAttributes, type ReactNode } from "react";
import { Check } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";
import { AspectRatio } from "@/ui/aspect-ratio";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

/** How many answers the question takes. */
export type ChatQuestionnaireMode = "single" | "multiple";

export interface ChatQuestionnaireOption {
  id: string;
  label: string;
  /**
   * Hands off instead of answering — the sheet's "Other — tell me in your own
   * words…", which puts the cursor in the composer. It reads quieter than the
   * real answers because it is not one.
   */
  isHandoff?: boolean;
}

export interface ChatQuestionnaireTile extends ChatQuestionnaireOption {
  src: string;
  /** What the picture IS. A row of unnamed tiles is a row of grey squares. */
  alt: string;
}

interface ChatQuestionnaireBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** The agent's question, in full. */
  question: string;
  mode?: ChatQuestionnaireMode;
  /** Chosen option ids. Controlled; uncontrolled through `defaultValue`. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * The answer is final. Called on tap in `single` mode and on Confirm in
   * `multiple` — the two ways the sheet draws a question being committed.
   */
  onSubmitAction?: (value: string[]) => void;
  /** Multi-select only. Required by the type when `onSubmitAction` can be reached. */
  confirmLabel?: string;
  skipLabel?: string;
  onSkipAction?: () => void;
  /**
   * The question is ANSWERED. Collapses to the receipt: the question stays in
   * muted ink and the chosen answer becomes a selected Badge; the rest of the
   * options leave the thread.
   */
  answer?: string;
}

/**
 * Two pickers, one selection language — but a tile has a picture and a row does
 * not, and `alt` is not optional on a picture.
 */
type ChatQuestionnaireVariantProps =
  | { variant?: "list"; options: ChatQuestionnaireOption[] }
  | { variant: "tiles"; options: ChatQuestionnaireTile[] };

export type ChatQuestionnaireProps = ChatQuestionnaireBaseProps & ChatQuestionnaireVariantProps;

/**
 * The chosen option's edge and check.
 *
 * Card Sorting's active card, verbatim: the fill does NOT change and a 1.5px
 * `border-focus` edge plus a check in the same blue carries the state. The
 * filled accent stays reserved for Send, Confirm and the answered Badge — an
 * option that fills would be as loud as the button that commits it.
 *
 * It is also what keeps hover and selected from colliding: hover is a FILL and
 * selection is an EDGE, so the two are on different channels by construction
 * rather than by hoping about which token wins.
 */
const OPTION_SELECTED = "border-edge-focus text-ink-primary";

/**
 * The agent asking, inside the thread.
 *
 * No container, no fill, no action bar: the question and its options sit
 * directly on the receiver's ground. That is why this is not a `ChatWidget`
 * payload — six of that component's parts mean nothing here (§7a).
 */
export const ChatQuestionnaire = forwardRef<HTMLDivElement, ChatQuestionnaireProps>(
  function ChatQuestionnaire(props, ref) {
    const {
      question,
      mode = "single",
      value,
      defaultValue,
      onValueChange,
      onSubmitAction,
      confirmLabel,
      skipLabel,
      onSkipAction,
      answer,
      variant = "list",
      options,
      className,
      ...rest
    } = props as ChatQuestionnaireBaseProps & {
      variant?: "list" | "tiles";
      options: ChatQuestionnaireTile[];
    };

    const questionId = useId();
    const [selected, setSelected] = useControllableState<string[]>({
      value,
      defaultValue: defaultValue ?? [],
      onChange: onValueChange,
    });

    const choose = (option: ChatQuestionnaireOption) => {
      if (option.isHandoff) {
        // A handoff does not answer the question — it moves the cursor. The
        // caller decides what that means, and nothing is selected here.
        onSubmitAction?.([option.id]);
        return;
      }
      if (mode === "single") {
        setSelected([option.id]);
        // Tap commits. The sheet's own rule, and the reason a single-select
        // question has no Confirm button to press afterwards.
        onSubmitAction?.([option.id]);
        return;
      }
      setSelected(
        selected.includes(option.id)
          ? selected.filter((id) => id !== option.id)
          : [...selected, option.id],
      );
    };

    // Answered: the receipt. The question stays because an answer with no
    // question is a fragment, and the thread is read from the top.
    if (answer !== undefined) {
      return (
        <div
          ref={ref}
          data-slot="chat-questionnaire"
          data-answered="true"
          className={cn("flex w-full flex-wrap items-center gap-sm", className)}
          {...rest}
        >
          <p data-slot="chat-questionnaire-question" className="font-body text-body-sm leading-normal text-ink-muted">
            {question}
          </p>
          <Badge variant="selected" data-slot="chat-questionnaire-answer">
            {answer}
          </Badge>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="chat-questionnaire"
        data-mode={mode}
        data-variant={variant}
        className={cn("flex w-full flex-col gap-md", className)}
        {...rest}
      >
        <p
          id={questionId}
          data-slot="chat-questionnaire-question"
          className="font-body text-body-md font-medium leading-normal text-ink-primary"
        >
          {question}
        </p>

        <div
          // A named group rather than a radiogroup: in `single` mode a press
          // ANSWERS the question rather than moving a selection around, so the
          // options are actions and arrow-key roving would be a promise this
          // widget does not keep. Recorded in needsDesign — a radiogroup is the
          // alternative if the design ever adds a separate Confirm to single.
          role="group"
          aria-labelledby={questionId}
          data-slot="chat-questionnaire-options"
          className={cn(
            variant === "tiles"
              ? "grid grid-cols-4 gap-sm"
              : // The sheet's 400px cap: options read as controls, not as
                // paragraphs, and a 640-wide row of one sentence reads as prose.
                "flex max-w-[400px] flex-col gap-sm",
          )}
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return variant === "tiles" ? (
              <button
                key={option.id}
                type="button"
                data-slot="chat-questionnaire-option"
                data-selected={isSelected || undefined}
                {...(mode === "multiple" ? { "aria-pressed": isSelected } : { "aria-current": isSelected || undefined })}
                onClick={() => choose(option)}
                className="group/tile flex cursor-pointer flex-col gap-xs text-start"
              >
                <span
                  data-slot="chat-questionnaire-tile"
                  className={cn(
                    "relative block rounded-md",
                    // The outline is on the TILE, outside the frame — so the
                    // picture keeps its own edge and the selection reads as a
                    // ring around the thing rather than a border on it. Image
                    // Thumbnail uses the same 2px offset.
                    "outline-2 outline-offset-2 outline-transparent",
                    "transition-[outline-color]", motionMicro,
                    isSelected && "outline-edge-focus",
                  )}
                >
                  {/*
                    The library's own frame, not a hand-rolled `aspect-[1/1]`.
                    AspectRatio already clips to radius-md, sizes the image
                    from the outside (`[&>img]:size-full object-cover`) and
                    keeps a well behind it — three things every call site that
                    reinvents the frame has to remember, and the one that
                    forgets ships an intrinsically-sized image in a box that
                    crops it. The fill is the media ground rather than its
                    default sunken, because what sits here is a photograph.
                  */}
                  <AspectRatio ratio="square" className="bg-media-floor">
                    <img src={option.src} alt={option.alt} />
                  </AspectRatio>
                  {isSelected ? (
                    <span
                      aria-hidden="true"
                      data-slot="chat-questionnaire-check"
                      className="absolute end-xs top-xs flex size-5 items-center justify-center rounded-full bg-accent text-ink-on-accent [&_svg]:size-3"
                    >
                      <Check />
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "font-body text-caption leading-normal",
                    isSelected ? "text-ink-primary" : "text-ink-muted",
                  )}
                >
                  {option.label}
                </span>
              </button>
            ) : (
              <button
                key={option.id}
                type="button"
                data-slot="chat-questionnaire-option"
                data-selected={isSelected || undefined}
                {...(mode === "multiple" ? { "aria-pressed": isSelected } : { "aria-current": isSelected || undefined })}
                onClick={() => choose(option)}
                className={cn(
                  "flex cursor-pointer items-center gap-sm rounded-md border-[1.5px] px-md py-sm text-start",
                  "bg-base font-body text-body-sm font-medium leading-normal",
                  "transition-[background-color,border-color,color]", motionMicro,
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
                  isSelected
                    ? OPTION_SELECTED
                    : cn(
                        "border-edge-subtle",
                        // Quieter once something else is chosen: the answer is
                        // the thing to read, and the rest are still available.
                        selected.length > 0 ? "text-ink-muted" : option.isHandoff ? "text-ink-muted" : "text-ink-secondary",
                        // Hover is a FILL and selection is an EDGE, so the two
                        // never compete. `not-data-[selected]` makes them
                        // mutually exclusive by construction, not by order.
                        "hover:bg-hover",
                      ),
                )}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {isSelected ? (
                  <Check
                    size={14}
                    aria-hidden="true"
                    data-slot="chat-questionnaire-check"
                    className="shrink-0 text-edge-focus"
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {mode === "multiple" && confirmLabel ? (
          <div data-slot="chat-questionnaire-confirm" className="flex items-center gap-sm">
            <Button
              variant="primary"
              size="md"
              isDisabled={selected.length === 0}
              onClick={() => onSubmitAction?.(selected)}
            >
              {confirmLabel}
            </Button>
            {skipLabel && onSkipAction ? (
              <Button variant="ghost" size="md" onClick={onSkipAction}>
                {skipLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

/** Re-exported for a caller building its own option list. */
export type ChatQuestionnaireChildren = ReactNode;
