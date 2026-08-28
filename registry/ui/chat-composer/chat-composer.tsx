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

    const frameRef = useRef<HTMLDivElement>(null);

    // The FIRST half of the flip animation: the geometry the frame and its
    // control slots had before an `auto` re-arrangement, captured by `resize`
    // in the same breath as the decision to flip. `null` means the next
    // commit is not a flip and must not animate.
    const flipFromRef = useRef<{
      frameHeight: number;
      frameRadius: number;
      parts: ReadonlyArray<readonly [HTMLElement, DOMRect]>;
    } | null>(null);
    // The running height animation, so a flip reversed mid-flight retargets
    // instead of stacking two height tracks — and so its cleanup can tell
    // whether it is still the current one before un-clipping the frame.
    const heightAnimationRef = useRef<Animation | null>(null);
    const hasPaintedRef = useRef(false);
    // What the current commit resolved to, readable from inside `resize`
    // without threading state through its dependency list.
    const isStackedRef = useRef(false);

    const resize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 0;

      // The arrangement is decided FIRST, and always against the width the
      // text column has INLINE — never against whichever width the field
      // happens to hold right now. The two arrangements give the textarea
      // different widths (inline shares its row with the controls, stacked
      // spans the frame), so a measurement taken at the current width feeds
      // back into the thing it decides: a draft that wraps inline but fits on
      // one stacked line would flip the frame on alternate keystrokes, with
      // the height set from whichever width was about to lose. Probing at the
      // inline width makes the rule a fixed point — the frame stacks exactly
      // when the text no longer fits the inline row.
      const frame = frameRef.current;
      if (layout === "auto" && frame && lineHeight > 0) {
        const frameStyle = getComputedStyle(frame);
        const gap = parseFloat(frameStyle.columnGap) || 0;
        const start = frame.querySelector<HTMLElement>(':scope > [data-slot="chat-composer-start"]');
        const actions = frame.querySelector<HTMLElement>(':scope > [data-slot="chat-composer-actions"]');
        // Captured BEFORE the probe touches a single style: these rects are
        // the "first" half of the flip animation, and the probe's transient
        // width would corrupt them. Cheap unless kept — they are only stashed
        // when the measurement below actually crosses arrangements.
        const firstHeight = frame.getBoundingClientRect().height;
        // The radius the frame is PAINTING, not the declared one: rounded-full
        // computes to 999px, the box clamps it to half its height, and a
        // running flip animation shows partway between. Clamping the computed
        // value covers all three.
        const firstRadius = Math.min(
          parseFloat(frameStyle.borderTopLeftRadius) || 0,
          firstHeight / 2,
        );
        const parts = [start, actions].filter((p): p is HTMLElement => p !== null);
        const firstRects = parts.map((p) => [p, p.getBoundingClientRect()] as const);

        const inlineWidth = Math.max(
          1,
          frame.clientWidth -
            parseFloat(frameStyle.paddingLeft) -
            parseFloat(frameStyle.paddingRight) -
            (start ? start.offsetWidth + gap : 0) -
            (actions ? actions.offsetWidth + gap : 0),
        );
        // The probe is the element itself, transiently at the inline width.
        // Restored before this effect returns, so no intermediate ever paints.
        const prevWidth = el.style.width;
        el.style.height = "auto";
        el.style.width = `${inlineWidth}px`;
        const lines = Math.max(1, Math.round(el.scrollHeight / lineHeight));
        el.style.width = prevWidth;

        // Crossing arrangements: hand the pre-flip geometry to the flip
        // effect. Never on the first pass — a composer MOUNTED with a long
        // draft renders stacked, it does not arrive there (craft: no
        // entrance animation on first render).
        if (hasPaintedRef.current && (lines > 1) !== isStackedRef.current) {
          flipFromRef.current = {
            frameHeight: firstHeight,
            frameRadius: firstRadius,
            parts: firstRects,
          };
        }
        setMeasuredLines(lines);
      }

      // Collapse first: `scrollHeight` never shrinks below the element's own
      // height, so measuring without this makes the field one-way — it grows
      // with the text and never comes back when the text is deleted.
      el.style.height = "auto";
      const cap = lineHeight * maxRows;
      const content = el.scrollHeight;
      const next = cap > 0 ? Math.min(content, cap) : content;
      el.style.height = `${next}px`;
      // Only past the cap: an `auto` overflow at rest puts a scrollbar gutter
      // in a one-line pill on the platforms that reserve one.
      el.style.overflowY = cap > 0 && content > cap + 1 ? "auto" : "hidden";
    }, [layout, maxRows]);

    const resolvedLayout: Exclude<ChatComposerLayout, "auto"> =
      layout === "auto" ? (measuredLines > 1 ? "stacked" : "inline") : layout;
    const isStacked = resolvedLayout === "stacked";
    isStackedRef.current = isStacked;

    // Layout effect, not effect: the first paint has to be the right height,
    // or a composer restored with a long draft flashes at one line.
    // `resolvedLayout` is a dependency because the height half of `resize`
    // reads the field's REAL width — when the probe above flips the
    // arrangement, this has to run once more so the height is taken at the
    // width the field ends up with, not the one it just left.
    useLayoutEffect(resize, [resize, text, resolvedLayout]);

    // The flip animation — a FLIP, in both senses. When measured `auto`
    // layout crosses arrangements, `resize` has stashed the pre-flip
    // geometry; here, after the DOM has re-arranged and BEFORE it paints, the
    // frame's height and the two control slots animate from where they were
    // to where they now are. One-shots via the Web Animations API rather than
    // a CSS transition, because the values are measured per flip — and they
    // run ONLY on this crossing: not on mount, not for an explicit `layout`
    // prop (visual baselines stay static), and never on ordinary line growth,
    // where an easing height would trail the caret (see the doc's motion
    // note). The text row deliberately snaps: its width change re-wraps the
    // draft instantly either way, and gliding glyphs under a still-moving
    // Send button reads as a glitch, not as motion.
    useLayoutEffect(() => {
      const from = flipFromRef.current;
      if (!from) return;
      flipFromRef.current = null;
      const frame = frameRef.current;
      if (!frame || typeof frame.animate !== "function") return;
      // Explicit, per the craft rule for JS-driven motion — although the
      // duration read below collapses to 1ms at the token layer anyway.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const frameStyle = getComputedStyle(frame);
      // The tokens, read at their computed values: WAAPI cannot consume a
      // custom property by name, and a literal here would be a second motion
      // system. duration-base with ease-out is motionStandard — a surface
      // growing, not interaction feedback.
      const duration = parseFloat(frameStyle.getPropertyValue("--ui-duration-base"));
      const easing = frameStyle.getPropertyValue("--ui-ease-out").trim() || "ease";
      if (!(duration > 1)) return;

      // Retarget, don't stack: a flip reversed mid-flight starts from the
      // height the frame VISUALLY holds (the captured rect includes the
      // running animation's value) — but the DESTINATION is the settled
      // layout, so the old track has to be cancelled before it is measured.
      heightAnimationRef.current?.cancel();
      const toHeight = frame.getBoundingClientRect().height;
      if (Math.round(from.frameHeight) !== Math.round(toHeight)) {
        // The radius travels INSIDE this track, visual value to visual value
        // (the same clamp as the capture), because its class-declared 999px
        // pill cannot be transitioned — see the frame's class list. On
        // finish the underlying paint is already at the destination value,
        // so releasing the animation is seamless.
        const toRadius = Math.min(
          parseFloat(frameStyle.borderTopLeftRadius) || 0,
          toHeight / 2,
        );
        // Clipped while in flight — the children already sit in their final
        // arrangement, so without this the second row pokes past the frame's
        // still-growing bottom edge.
        frame.style.overflow = "clip";
        const grow = frame.animate(
          [
            { height: `${from.frameHeight}px`, borderRadius: `${from.frameRadius}px` },
            { height: `${toHeight}px`, borderRadius: `${toRadius}px` },
          ],
          { duration, easing },
        );
        heightAnimationRef.current = grow;
        const settle = () => {
          // Only the CURRENT animation may un-clip — the cancelled one's
          // cleanup arrives as a microtask while its replacement is mid-air.
          if (heightAnimationRef.current !== grow) return;
          heightAnimationRef.current = null;
          frame.style.overflow = "";
        };
        grow.finished.then(settle, settle);
      }

      for (const [part, was] of from.parts) {
        // Same retarget rule: the slot's only animations are earlier flips of
        // itself (the buttons' own transitions live on the buttons), and its
        // destination is only measurable once they are gone.
        for (const running of part.getAnimations()) running.cancel();
        const now = part.getBoundingClientRect();
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        part.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
          { duration, easing },
        );
      }
    }, [resolvedLayout]);

    // The probe is only as fresh as the widths it read — a resized container
    // moves the wrap point, and no keystroke arrives to remeasure it.
    useLayoutEffect(() => {
      const frame = frameRef.current;
      if (!frame) return;
      const observer = new ResizeObserver(() => resize());
      observer.observe(frame);
      return () => observer.disconnect();
    }, [resize]);

    useLayoutEffect(() => {
      hasPaintedRef.current = true;
    }, []);

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
          ref={frameRef}
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
            // border-radius is deliberately NOT in this list. rounded-full
            // computes to 999px and only the PAINTED radius is clamped to the
            // box, so a transition from it spends ~99% of its duration above
            // the clamp and snaps in the last frames — it was never motion.
            // The flip effect below animates the radius from its measured
            // visual value instead, on the same clock as the growth.
            "transition-[border-color,box-shadow,background-color]", motionMicro,
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
