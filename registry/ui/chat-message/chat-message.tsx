import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Button } from "@/ui/button";

/**
 * The type scale a message is set at.
 *
 * `md` is the thread on the page and on a phone; `sm` is the assistant
 * sidebar, where the sheet steps the body down and tightens the bubble's
 * inset. It is NOT the same axis as the bubble's width cap — the sheet draws
 * a 343px mobile column at `md` with the narrow cap, which is why the cap is
 * a custom property rather than a second thing this prop decides.
 */
export type ChatMessageSize = "md" | "sm";

/** Sender delivery state. The bubble's fill never moves; the caption does. */
export type ChatMessageStatus = "sent" | "sending" | "failed";

const BUBBLE_SIZE = {
  md: "px-lg py-md text-body-md",
  sm: "px-md py-sm text-body-sm",
} as const satisfies Record<ChatMessageSize, string>;

const BODY_SIZE = {
  md: "text-body-md",
  sm: "text-body-sm",
} as const satisfies Record<ChatMessageSize, string>;

interface SenderBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The message. A slot rather than a string so it can carry a link. */
  children: ReactNode;
  size?: ChatMessageSize;
  /**
   * Attachments, ABOVE the text and INSIDE the bubble — a `Thumbnail.Group`.
   * Sent tiles carry no remove control: the message is gone.
   */
  attachments?: ReactNode;
  status?: ChatMessageStatus;
}

/**
 * A status other than `sent` has to say what it is.
 *
 * The caption is the ONLY channel carrying delivery state — the sheet is
 * explicit that the bubble never changes fill — so a `sending` bubble with no
 * caption is a message with no state at all, and that is a type error rather
 * than a doc note.
 */
type SenderStatusProps =
  | { status?: "sent"; statusText?: undefined }
  | { status: "sending" | "failed"; statusText: string };

/**
 * Retry needs a NAME and a HANDLER together. The sheet draws the word "retry"
 * inside the failure caption, which reads as a control and is not one — a word
 * in a caption cannot be tabbed to, activated, or announced as a button. It
 * ships as a real control beside the caption instead; recorded as a deviation
 * in the doc, and redrawn on the sheet.
 */
type SenderRetryProps =
  | { onRetryAction?: undefined; retryLabel?: undefined }
  | { onRetryAction: () => void; retryLabel: string };

export type ChatMessageSenderProps = SenderBaseProps & SenderStatusProps & SenderRetryProps;

/**
 * The person's turn: a right-aligned `bg-elevated` bubble, capped at a share
 * of the thread. No tail, no border, no avatar and no timestamp inside.
 */
const ChatMessageSender = forwardRef<HTMLDivElement, ChatMessageSenderProps>(
  function ChatMessageSender(
    { children, size = "md", attachments, status = "sent", statusText, onRetryAction, retryLabel, className, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-slot="chat-message"
        data-role="sender"
        data-status={status}
        className={cn(
          // The cap, as a component custom property (§6) rather than a prop.
          // The sheet's rule — 75% on the 640 column, 85% once it narrows — is
          // about the COLUMN's width, and a component cannot see that: the
          // assistant sidebar is 308px inside a 1440px window, so no viewport
          // breakpoint describes it. The app that chose the column sets this.
          "[--ui-chat-message-bubble-max-width:75%]",
          "flex w-full flex-col items-end gap-xs",
          className,
        )}
        {...rest}
      >
        <div
          data-slot="chat-message-bubble"
          className={cn(
            "flex max-w-(--ui-chat-message-bubble-max-width) flex-col gap-sm",
            // radius-lg, no edge: the fill is the whole boundary. In dark the
            // bubble sits ABOVE the page ground, so the step is upward and no
            // hairline is needed to find it.
            "rounded-lg bg-elevated",
            "font-body font-regular leading-normal tracking-normal text-ink-primary",
            BUBBLE_SIZE[size],
          )}
        >
          {attachments ? (
            <div data-slot="chat-message-attachments" className="flex min-w-0 items-center gap-xs">
              {attachments}
            </div>
          ) : null}
          {/* Wrapped, as Banner wraps its message: the text needs a box of its
              own so the bubble's two rows are addressable — by a consumer, and
              by the geometry test, which measures a track and cannot measure a
              bare text node. A <div> rather than a <p>, because a message may
              legitimately contain block content. */}
          <div data-slot="chat-message-text" className="min-w-0">
            {children}
          </div>
        </div>

        {status !== "sent" && statusText ? (
          <div data-slot="chat-message-status" className="flex items-center gap-xs">
            <p
              className={cn(
                "font-body text-caption leading-normal",
                // Failure is the only one that colours: a "Sending…" caption in
                // danger ink would report a problem that has not happened.
                status === "failed" ? "font-medium text-danger" : "text-ink-muted",
              )}
            >
              {statusText}
            </p>
            {onRetryAction && retryLabel ? (
              <Button variant="ghost" size="sm" data-slot="chat-message-retry" onClick={onRetryAction}>
                {retryLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

interface ReceiverBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The answer. Rich blocks — widgets, progress, code — stack inside at
   * `--ui-space-stack-md`; a plain string is the common case.
   */
  children: ReactNode;
  size?: ChatMessageSize;
  /**
   * The answer is still arriving. Draws the caret block, and WITHHOLDS the
   * actions row — copying or rating half an answer is worse than waiting.
   */
  isStreaming?: boolean;
  /**
   * The action row's controls — `Button ghost · sm · isIconOnly` at the call
   * site (Copy, Refresh, ThumbsUp, ThumbsDown, Bookmark, MoreVertical in the
   * sheet). A slot, because which of them a product offers is the product's.
   */
  actions?: ReactNode;
  /** Agent name and relative time, at the trailing end of the actions row. */
  meta?: ReactNode;
  /**
   * Keeps the actions row visible instead of revealing it on hover. The sheet
   * asks for exactly this on touch and on the latest message — both are facts
   * about the THREAD, which only the thread knows.
   */
  isActionsVisible?: boolean;
  /**
   * The generation failed. Renders the failure block inside the message, under
   * whatever partial answer arrived — never a toast, because the error belongs
   * to the turn that produced it.
   */
  errorText?: string;
}

/** Same pairing as the sender's, for the same reason. */
type ReceiverRetryProps =
  | { onRetryAction?: undefined; retryLabel?: undefined }
  | { onRetryAction: () => void; retryLabel: string };

export type ChatMessageReceiverProps = ReceiverBaseProps & ReceiverRetryProps;

/**
 * The agent's turn: no bubble, no avatar, the full column.
 *
 * The looser leading is the receiver's signature and the reason it needs no
 * container — the asymmetry between the two voices is what keeps a long answer
 * readable.
 */
const ChatMessageReceiver = forwardRef<HTMLDivElement, ChatMessageReceiverProps>(
  function ChatMessageReceiver(
    {
      children,
      size = "md",
      isStreaming = false,
      actions,
      meta,
      isActionsVisible = false,
      errorText,
      onRetryAction,
      retryLabel,
      className,
      ...rest
    },
    ref,
  ) {
    // Withheld while streaming, per the sheet: the row appears when the answer
    // settles. Rendering it hidden instead would put six tab stops in front of
    // an answer that is still being written.
    const showActions = !isStreaming && (actions || meta);

    return (
      <div
        ref={ref}
        data-slot="chat-message"
        data-role="receiver"
        data-streaming={isStreaming || undefined}
        // Named group: a message inside a widget inside a message must not
        // reveal its parent's action row.
        className={cn("group/chat-message flex w-full flex-col gap-md", className)}
        {...rest}
      >
        <div
          data-slot="chat-message-body"
          className={cn(
            // gap-lg IS --ui-space-stack-md (the stack scale maps md to
            // space-lg); the spacing namespace emits the base steps only, so
            // this is the same 16px the sheet names, spelled the way the theme
            // can resolve.
            "flex min-w-0 flex-col gap-lg",
            "font-body font-regular leading-relaxed tracking-normal text-ink-primary",
            BODY_SIZE[size],
          )}
        >
          {children}
          {isStreaming ? (
            // The only ornament while streaming. Static rather than blinking:
            // the text arriving is already the motion, and a second animation
            // for the same fact is what §8's "motion is never the only channel,
            // and never doubled" is about.
            <span
              data-slot="chat-message-caret"
              aria-hidden="true"
              className="inline-block h-[15px] w-[8px] shrink-0 self-start rounded-[2px] bg-ink-primary"
            />
          ) : null}
        </div>

        {errorText ? (
          <div
            data-slot="chat-message-error"
            // A live region: the answer stopped, and a reader who was following
            // it needs telling. Polite, because the partial answer above is
            // kept and nothing is lost by finishing the sentence first.
            role="status"
            className="flex items-center gap-md rounded-md bg-danger-subtle px-md py-sm"
          >
            <p className="min-w-0 flex-1 font-body text-body-sm leading-normal text-ink-on-danger-subtle">
              {errorText}
            </p>
            {onRetryAction && retryLabel ? (
              <Button variant="danger" size="sm" data-slot="chat-message-retry" onClick={onRetryAction}>
                {retryLabel}
              </Button>
            ) : null}
          </div>
        ) : null}

        {showActions ? (
          <div
            data-slot="chat-message-actions"
            className={cn(
              "flex items-center gap-xs",
              "transition-opacity", motionMicro,
              // Revealed on hover AND on focus — a row that only answers the
              // pointer puts six controls a keyboard can reach and cannot see
              // (SC 2.4.7). Opacity rather than mounting, so focus is never
              // lost and the tab order does not change under the user.
              isActionsVisible
                ? "opacity-100"
                : "opacity-0 group-hover/chat-message:opacity-100 group-focus-within/chat-message:opacity-100",
              // A device with no hover has no way to reveal it. Arbitrary
              // variant rather than a prop: this is a fact about the INPUT,
              // not about the thread.
              "[@media(hover:none)]:opacity-100",
            )}
          >
            {actions}
            {meta ? (
              <p data-slot="chat-message-meta" className="ms-auto font-body text-caption leading-normal text-ink-muted">
                {meta}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

/**
 * The two voices, as one item.
 *
 * There is deliberately no bare `<ChatMessage>`: the receiver has no bubble by
 * design, so a single component with a `role` prop would carry a bubble, an
 * attachment slot and a status caption that mean nothing in half its uses, and
 * an actions row and a failure block that mean nothing in the other half —
 * which is §7a's Sheet-and-Drawer test, and it fails the same way.
 */
export const ChatMessage = {
  Sender: ChatMessageSender,
  Receiver: ChatMessageReceiver,
};
