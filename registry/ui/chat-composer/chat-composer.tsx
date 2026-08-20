"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { ArrowUp, SquareRounded } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Button } from "@/ui/button";

/**
 * How the frame is arranged, and therefore what shape it takes.
 *
 * `inline` is the sheet's compact pill: one row, everything centred, the
 * corner fully rounded. `stacked` is what a wrapped message produces: the text
 * takes a row of its own and the controls drop below it, and the corner
 * squares to radius-xl because a pill around two rows is a lozenge.
 *
 * `auto` measures — a composer cannot know in advance whether the sentence
 * someone types will wrap, and the sheet's own rule is about the TEXT ("only
 * wrapped text squares it"), not about a prop. The two literal values exist
 * for the cases where measurement is the wrong answer: a story, a visual
 * baseline, or a caller who has already decided.
 */
export type ChatComposerLayout = "auto" | "inline" | "stacked";

interface ChatComposerBaseProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    // Owned by this component and forwarded deliberately, or meaningless here.
    // `rows`/`cols` in particular: the height is measured from the content and
    // capped at `maxRows`, so a caller's row count would be overwritten on the
    // first keystroke — a prop that is accepted and silently discarded reads
    // as supported.
    "value" | "defaultValue" | "onChange" | "disabled" | "rows" | "cols" | "children"
  > {
  /**
   * The accessible name of the message field. Required, and ALWAYS visually
   * hidden: the sheet draws no visible label in any of its three contexts, so
   * there is no `isLabelHidden` to get wrong. A placeholder is not a label —
   * it disappears the moment the user types.
   */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Enter (without Shift) and the Send button both call this with the current
   * value. The composer does NOT clear itself — a send that failed has to be
   * able to put the text back, and only the caller knows whether it did.
   */
  onSubmitAction?: (value: string) => void;
  /**
   * The agent is answering. The trailing control becomes Stop, and the
   * placeholder is the caller's to change ("Reply to interrupt…" in the
   * sheet). Typing and Enter still work: the sheet's own copy invites a reply
   * mid-answer, so submission is not gated on this.
   */
  isGenerating?: boolean;
  /** Runs when Stop is pressed. Only reachable while `isGenerating`. */
  onStopAction?: () => void;
  /**
   * Accessible name of the send control. Required — an icon-only button with
   * no name announces as "button", which is Button's own rule one level up.
   */
  sendLabel: string;
  /**
   * Accessible name of the stop control. Required even for a composer that
   * never generates, deliberately: `isGenerating` is a value that changes at
   * runtime, so a discriminated union on it cannot be satisfied by a caller
   * holding a boolean — the label would end up optional exactly when it is
   * needed.
   */
  stopLabel: string;
  isDisabled?: boolean;
  /**
   * The failure caption under the frame, in danger ink. Its presence also
   * marks the field invalid, so the edge and the message cannot disagree.
   */
  errorText?: string;
  /**
   * The caption below the frame — "Diorama Agent can make mistakes…". Outside
   * the frame and centred; the sheet hides it in the sidebar context, which is
   * done by not passing it.
   */
  disclaimer?: string;
  /**
   * The attachment tray, ABOVE the frame — a `Thumbnail.Group`, or the file
   * chips beside it. It never goes inside: the pill stays a pill however many
   * files are attached, which is the whole reason the sheet puts it here.
   */
  attachments?: ReactNode;
  /**
   * The leading control — the sheet's Add button, `Button ghost · md · full`
   * with a `Plus` glyph, opening the attach menu. A slot rather than a prop
   * bag because what it opens is the caller's (upload, library, camera).
   */
  startAction?: ReactElement;
  /**
   * Controls between the text and Send — the sheet draws Dictate here, and
   * calls it the first thing to drop when the frame is narrow. Same treatment
   * as `startAction`.
   */
  endActions?: ReactNode;
  /** Lines of text before the field scrolls instead of growing. */
  maxRows?: number;
  layout?: ChatComposerLayout;
  /**
   * A file is being dragged over the drop target. PRESENTATIONAL: in a chat
   * the drop target is the whole thread, not this pill, so the composer draws
   * the state and the app owns the event. Nothing here can detect it.
   */
  isDropActive?: boolean;
  /** Shown in place of the placeholder while `isDropActive` — "Drop to attach". */
  dropLabel?: string;
}

export type ChatComposerProps = ChatComposerBaseProps;

/** How many rows the sheet lets the text grow to before it scrolls. */
const DEFAULT_MAX_ROWS = 8;

export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer(
    {
      label,
      value,
      defaultValue = "",
      onValueChange,
      onSubmitAction,
      isGenerating = false,
      onStopAction,
      sendLabel,
      stopLabel,
      isDisabled = false,
      errorText,
      disclaimer,
      attachments,
      startAction,
      endActions,
      maxRows = DEFAULT_MAX_ROWS,
      layout = "auto",
      isDropActive = false,
      dropLabel,
      className,
      id,
      placeholder,
      onKeyDown,
      "aria-describedby": consumerDescribedBy,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const disclaimerId = `${fieldId}-disclaimer`;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // The ref is the FORM CONTROL, not the wrapper (CONVENTIONS §5): a ref to
    // the frame could not `.focus()`, could not be read for a value and could
    // not be handed to a form library, which is every reason a caller takes
    // one here.
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, []);

    const [text, setText] = useControllableState<string>({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    // Measured, not guessed. `auto` needs the number of line boxes the text
    // actually produced, which only layout knows.
    const [measuredLines, setMeasuredLines] = useState(1);

    const resize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      // Collapse first: `scrollHeight` never shrinks below the element's own
      // height, so measuring without this makes the field one-way — it grows
      // with the text and never comes back when the text is deleted.
      el.style.height = "auto";
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 0;
      const cap = lineHeight * maxRows;
      const content = el.scrollHeight;
      const next = cap > 0 ? Math.min(content, cap) : content;
      el.style.height = `${next}px`;
      // Only past the cap: an `auto` overflow at rest puts a scrollbar gutter
      // in a one-line pill on the platforms that reserve one.
      el.style.overflowY = cap > 0 && content > cap + 1 ? "auto" : "hidden";
      setMeasuredLines(lineHeight > 0 ? Math.max(1, Math.round(next / lineHeight)) : 1);
    }, [maxRows]);

    // Layout effect, not effect: the first paint has to be the right height,
    // or a composer restored with a long draft flashes at one line.
    useLayoutEffect(resize, [resize, text]);

    const resolvedLayout: Exclude<ChatComposerLayout, "auto"> =
      layout === "auto" ? (measuredLines > 1 ? "stacked" : "inline") : layout;
    const isStacked = resolvedLayout === "stacked";

    const invalid = Boolean(errorText);
    const canSend = text.trim().length > 0 && !isDisabled;

    const submit = () => {
      if (!canSend) return;
      onSubmitAction?.(text);
    };

    // Enter sends, Shift+Enter opens a line. This is also the keyboard
    // contract the browser test asserts; nothing else in the composer needs a
    // key handler, because every control in it is a real button.
    const handleKeyDown = composeEventHandlers(onKeyDown, (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      // A composition (IME) Enter is committing a candidate, not sending a
      // message — sending there loses half a sentence in Japanese or Korean.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    });

    const describedBy =
      [errorText ? errorId : null, disclaimer ? disclaimerId : null, consumerDescribedBy]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      // `className` lands on the outermost node (§5) so `<ChatComposer
      // className="w-[640px]" />` sizes the whole thing, tray and caption
      // included. Reaching a part from outside is what data-slot is for.
      <div
        data-slot="chat-composer"
        data-layout={resolvedLayout}
        className={cn("flex w-full flex-col gap-sm", className)}
      >
        {attachments ? (
          // The tray, ABOVE the frame. It scrolls rather than growing the
          // composer, which is the sheet's rule for a long attachment list.
          <div
            data-slot="chat-composer-attachments"
            className="flex min-w-0 items-center gap-xs overflow-x-auto"
          >
            {attachments}
          </div>
        ) : null}

        {/*
          One frame, two arrangements, ONE DOM. The layout switch is
          flex-wrap + `order`, not a different tree: re-mounting the textarea
          when a sentence wraps would drop focus and the caret mid-word.

          - inline  [start] [text grows] [end…] [send]
          - stacked [text spans the row] / [start] … [end…] [send]

          Height is never declared. p-md around a 32px control row is the
          sheet's 56px compact height exactly, and a declared height would be a
          SECOND author of the inset — the failure the geometry laws exist for.
        */}
        <div
          data-slot="chat-composer-frame"
          data-invalid={invalid || undefined}
          data-disabled={isDisabled || undefined}
          data-drop-active={isDropActive || undefined}
          className={cn(
            "flex flex-wrap items-center gap-sm p-md",
            // 1.5px is the sheet's hairline; Chromium snaps it to 1 device
            // pixel at DPR 1, which is what `border-hairline.browser.test.tsx`
            // pins so it is not re-investigated.
            "border-[1.5px] border-edge-subtle",
            "transition-[border-color,box-shadow,background-color,border-radius]", motionMicro,
            isStacked ? "rounded-xl" : "rounded-full",
            isDisabled ? "bg-field-disabled" : "bg-field",
            // Focus is drawn on the FRAME via focus-within: for a text field,
            // showing focus on a pointer click is correct. The ring carries
            // the contrast requirement — the resting hairline is decorative by
            // design (ADR 0010) and could never clear SC 1.4.11 on its own.
            "focus-within:border-edge-focus focus-within:shadow-(--ui-focus-ring)",
            // A box-shadow is forced to `none` in forced-colors mode, so the
            // outline is the fallback there. It costs nothing elsewhere.
            "focus-within:forced-colors:outline focus-within:forced-colors:outline-2",
            invalid && "border-danger",
            // Image Upload's drop treatment, verbatim: a solid focus edge over
            // the subtle accent fill. Never dashed.
            isDropActive && "border-edge-focus bg-accent-subtle",
          )}
        >
          {startAction ? (
            <span data-slot="chat-composer-start" className="flex shrink-0 items-center">
              {startAction}
            </span>
          ) : null}

          <div
            data-slot="chat-composer-text"
            className={cn(
              "flex min-w-0 flex-1 items-center",
              // The stacked text row: first in visual order, spanning the
              // frame, with the sheet's own 4/8 inset. `order-first` moves it
              // without moving it in the DOM, which is what keeps focus.
              isStacked && "order-first basis-full px-sm py-xs",
            )}
          >
            <textarea
              {...rest}
              ref={textareaRef}
              id={fieldId}
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              aria-label={label}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              // The drop state replaces the PLACEHOLDER rather than the field.
              // Swapping the element out would unmount a focused control, and
              // §10 forbids exactly that; swapping the string cannot.
              placeholder={isDropActive && dropLabel ? dropLabel : placeholder}
              data-slot="chat-composer-input"
              className={cn(
                "w-full min-w-0 resize-none bg-transparent",
                "font-body text-body-md font-regular leading-normal tracking-normal",
                "text-ink-primary placeholder:text-ink-placeholder",
                "disabled:cursor-not-allowed disabled:text-ink-disabled disabled:placeholder:text-ink-disabled",
                // The drop label is a MESSAGE, not a hint — the sheet draws it
                // at medium weight in secondary ink, one step louder than the
                // placeholder it replaces.
                isDropActive && "placeholder:font-medium placeholder:text-ink-secondary",
                // Safe here and only here: the frame owns the focus ring. On an
                // element that draws its OWN ring this poisons
                // --tw-outline-style and the ring renders in style `none`.
                "outline-none",
              )}
            />
          </div>

          <div
            data-slot="chat-composer-actions"
            className={cn("flex shrink-0 items-center gap-sm", isStacked && "ms-auto")}
          >
            {endActions}
            {isGenerating ? (
              <Button
                shape="full"
                size="md"
                isIconOnly
                aria-label={stopLabel}
                data-slot="chat-composer-stop"
                onClick={onStopAction}
                isDisabled={isDisabled}
                // The fill Button has no variant for: the loudest neutral
                // surface, not the accent. `--ui-bg-inverse` exists because
                // `--ui-bg-emphasis` IS the accent and theme zero pins it to
                // neutral-0 in BOTH schemes — so the drawn control was
                // invisible against a dark `bg-field`, which the sheet raised
                // as a Conflict. Written as the three states Button's own
                // variants are, so a press does not lose its feedback.
                className={cn(
                  "bg-inverse ring-inverse text-ink-inverse",
                  "enabled:hover:bg-inverse-hover enabled:hover:ring-inverse-hover",
                  "enabled:active:bg-inverse-active enabled:active:ring-inverse-active",
                )}
                // `SquareRounded filled`, not `Stop`: griddy's Stop glyph
                // hard-codes fill="black" and cannot take the ink, so it would
                // render a black square on the dark scheme's light control —
                // and `check:licensing` rejects it outright.
                icon={<SquareRounded filled />}
              />
            ) : (
              <Button
                variant="primary"
                shape="full"
                size="md"
                isIconOnly
                aria-label={sendLabel}
                data-slot="chat-composer-send"
                onClick={submit}
                isDisabled={!canSend}
                // The sheet fills the empty Send with bg-sunken, one step
                // below Button's own disabled fill. On a white field
                // bg-elevated measures 1.03:1 and the control disappears
                // entirely; the drawn value is the one that still reads as a
                // control. Recorded in needsDesign — the two should agree.
                className="disabled:bg-sunken disabled:ring-sunken"
                icon={<ArrowUp />}
              />
            )}
          </div>
        </div>

        {errorText ? (
          <p
            data-slot="chat-composer-error"
            id={errorId}
            // Inset past the pill's own curve — a caption flush with the
            // frame's border box would sit under the rounded corner.
            className="px-lg font-body text-caption text-danger"
          >
            {errorText}
          </p>
        ) : null}

        {disclaimer ? (
          <p
            data-slot="chat-composer-disclaimer"
            id={disclaimerId}
            // gap-sm from the column plus 4px, which is the space-md the
            // Contexts specimen lays out between the frame and this caption.
            className="pt-xs text-center font-body text-caption text-ink-muted"
          >
            {disclaimer}
          </p>
        ) : null}
      </div>
    );
  },
);
