"use client";

import { forwardRef, type HTMLAttributes, type ReactElement } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { CheckCircle, ChevronDown, CloseCircle } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Button } from "@/ui/button";
import { Progress } from "@/ui/progress";

/**
 * The four escalating forms, lightest first.
 *
 * The agent picks the lightest one that tells the truth: `thinking` for a wait
 * under a few seconds, `activity` once it can name the source, `steps` when
 * more than one front is running, `measured` only when the total is known.
 * A form never downgrades mid-run — recorded as Derived on the sheet, and it
 * is the caller's rule to keep, because only the caller knows what the run is
 * doing.
 */
export type ChatProgressForm = "thinking" | "activity" | "steps" | "measured";

/** One named thing the agent is reading, searching or fetching. */
export interface ChatProgressActivity {
  /** The verb, at the head of the pill: "Reading…", "Searching…". */
  verb: string;
  /** What it is working on. Truncates with an ellipsis; it never wraps. */
  detail: string;
}

export type ChatProgressStepStatus = "done" | "current" | "pending";

export interface ChatProgressStep {
  id: string;
  label: string;
  status: ChatProgressStepStatus;
}

/**
 * The ring spinner, in CSS.
 *
 * griddy has no spinner glyph and `check:icons` forbids a private SVG — which
 * is right, because this is a non-icon visual state. It is the sheet's own
 * drawing: a full track ring with a quarter arc over it, so the arc reads as
 * one turning segment rather than as a chasing dot.
 *
 * The stroke is derived, not transcribed: the sheet draws `strokeWidth: 3` on
 * an r=8 circle in a 24 viewBox, which is 3/24 of the rendered size — 2px at
 * 16, 1.75px at 14. Rounded to the border widths that exist.
 *
 * `motion-safe:` rather than a `motion-reduce:` override, so the reduced-motion
 * default is "does not move" instead of "moves unless told otherwise". The
 * quarter arc stays visible either way, which is the static cue §8 requires
 * beside every animated one.
 */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="chat-progress-spinner"
      className={cn(
        "shrink-0 rounded-full border-sunken border-t-accent-legible motion-safe:animate-spin",
        className,
      )}
    />
  );
}

/** The pending step's empty ring — border-default at the sheet's 1.5px. */
function PendingRing() {
  return (
    <span
      aria-hidden="true"
      data-slot="chat-progress-pending"
      className="size-[14px] shrink-0 rounded-full border-[1.5px] border-edge-default"
    />
  );
}

interface ChatProgressBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Slot: replaces the thinking spinner. The concepts animate the product's
   * logo mark here, which is a product asset rather than a library one — so
   * the neutral ring is the default and the mark is passed in.
   */
  icon?: ReactElement;
  /**
   * The run stopped. Replaces the whole form with the failure line; the log
   * above it is history and stays in the thread.
   */
  errorText?: string;
}

/**
 * What each form needs, discriminated by `form`.
 *
 * A union rather than one flat prop bag: `steps` without steps and `measured`
 * without a value are the two shapes that would render an empty box, and both
 * are compile errors here.
 */
type ChatProgressFormProps =
  | {
      form?: "thinking";
      /** The waiting line — "Thinking…". */
      label: string;
    }
  | {
      form: "activity";
      /** One pill per named source. */
      activities: ChatProgressActivity[];
    }
  | {
      form: "steps";
      /** The group's name — "Gathering brand resources". */
      label: string;
      /** Elapsed time beside the name, already formatted: "12 s". */
      duration?: string;
      steps: ChatProgressStep[];
    }
  | {
      form: "measured";
      /** What is being measured — "Generating slide 3 of 6". */
      label: string;
      value: number;
      max?: number;
    };

/**
 * The receipt is the collapsed form, and it needs a line to show and a name
 * for the control that re-expands it. Both, or neither.
 */
type ChatProgressReceiptProps =
  | { isComplete?: false; receiptText?: undefined; expandLabel?: undefined }
  | { isComplete: true; receiptText: string; expandLabel: string };

/** A retry offer is a handler and a name together — never one of the two. */
type ChatProgressRetryProps =
  | { onRetryAction?: undefined; retryLabel?: undefined }
  | { onRetryAction: () => void; retryLabel: string };

/** Disclosure state, spelled the way §1 spells open/close everywhere. */
interface ChatProgressDisclosureProps {
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export type ChatProgressProps = ChatProgressBaseProps &
  ChatProgressFormProps &
  ChatProgressReceiptProps &
  ChatProgressRetryProps &
  ChatProgressDisclosureProps;

/**
 * The union, flattened for internal use.
 *
 * Every field is optional here and the PUBLIC type is what guarantees which
 * are present for a given form — the same split Button makes between its
 * discriminated `isIconOnly` API and the one render path underneath. One
 * documented widening beats narrowing the union at nine call sites.
 */
interface ResolvedProgress {
  form: ChatProgressForm;
  label?: string;
  duration?: string;
  activities?: ChatProgressActivity[];
  steps?: ChatProgressStep[];
  value?: number;
  max?: number;
}

/**
 * What the agent shows between the question and the answer.
 *
 * ONE component with a form axis, not three siblings — the sheet's own Not
 * built row asks for exactly that, and names the reason: the receipt, the
 * motion and the collapse are shared, and three components would drift apart
 * on precisely those.
 *
 * It lives inside the receiver block, at the thread's full width, above any
 * partial answer. Never a toast and never an overlay: progress belongs to the
 * turn that produced it.
 */
export const ChatProgress = forwardRef<HTMLDivElement, ChatProgressProps>(function ChatProgress(
  props,
  ref,
) {
  const {
    icon,
    errorText,
    isComplete = false,
    receiptText,
    expandLabel,
    onRetryAction,
    retryLabel,
    isOpen,
    defaultIsOpen,
    onOpenChange,
    className,
    // Pulled out of `rest` deliberately: every one of these is a form's own
    // data, and a stray `steps={[...]}` reaching the div would be serialised
    // onto the DOM as an attribute.
    form = "thinking",
    label,
    duration,
    activities,
    steps,
    value,
    max,
    ...rest
  } = props as ChatProgressBaseProps &
    ChatProgressReceiptProps &
    ChatProgressRetryProps &
    ChatProgressDisclosureProps &
    Partial<ResolvedProgress>;

  const status = errorText ? "failed" : isComplete ? "done" : "running";

  // The step list carries its own disclosure while it runs — the sheet draws a
  // chevron on the group header. Once the run finishes, EVERY form folds to the
  // same receipt row, and that row is the disclosure instead. One mechanism,
  // two summary lines.
  const hasDisclosure = status === "done" || (status === "running" && form === "steps");

  const body = (
    <FormBody
      form={form}
      {...(icon ? { icon } : {})}
      {...(label !== undefined ? { label } : {})}
      {...(activities ? { activities } : {})}
      {...(steps ? { steps } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(max !== undefined ? { max } : {})}
    />
  );

  return (
    <div
      ref={ref}
      data-slot="chat-progress"
      data-form={form}
      data-status={status}
      // Politely announced: a reader who asked a question and is waiting needs
      // to be told what is happening, and told again when it stops. Never
      // assertive — nothing here interrupts.
      role="status"
      className={cn("flex w-full flex-col gap-sm", className)}
      {...rest}
    >
      {status === "failed" ? (
        <div data-slot="chat-progress-failure" className="flex items-center gap-sm">
          <CloseCircle size={14} aria-hidden="true" className="shrink-0 text-danger" />
          <p className="font-body text-body-sm font-medium leading-normal text-danger">{errorText}</p>
          {onRetryAction && retryLabel ? (
            <Button variant="ghost" size="sm" data-slot="chat-progress-retry" onClick={onRetryAction}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      ) : hasDisclosure ? (
        <Collapsible.Root
          {...(isOpen !== undefined ? { open: isOpen } : {})}
          // A finished run folds; a running step list is open. The default is
          // the state the sheet draws for each, and a caller can pin either.
          {...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : { defaultOpen: status === "running" })}
          {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
          className="flex flex-col gap-sm"
        >
          <Collapsible.Trigger
            data-slot="chat-progress-summary"
            className={cn(
              "group/summary flex cursor-pointer items-center gap-sm rounded-sm text-start",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
            )}
          >
            {status === "done" ? (
              <>
                <CheckCircle size={14} aria-hidden="true" className="shrink-0 text-success" />
                <span className="font-body text-body-sm leading-normal text-ink-muted">{receiptText}</span>
                <Chevron />
                {/* The trigger's accessible name. The receipt line alone says
                    what happened and not what the control does. */}
                <span className="sr-only">{expandLabel}</span>
              </>
            ) : (
              <>
                <Chevron />
                <span className="font-body text-label-md font-bold leading-normal text-ink-secondary">{label}</span>
                {duration ? (
                  <span className="font-body text-caption leading-normal text-ink-muted">{`· ${duration}`}</span>
                ) : null}
              </>
            )}
          </Collapsible.Trigger>
          <Collapsible.Panel data-slot="chat-progress-body">{body}</Collapsible.Panel>
        </Collapsible.Root>
      ) : (
        body
      )}
    </div>
  );
});

/**
 * The disclosure chevron. It rotates rather than swapping glyph, so the two
 * states are one object moving instead of two objects replacing each other.
 */
function Chevron() {
  return (
    <ChevronDown
      size={12}
      aria-hidden="true"
      className={cn(
        "shrink-0 text-ink-muted",
        // `rotate`, not `transform`: v4 writes the standalone property, so a
        // transition naming `transform` would cover nothing and the chevron
        // would snap. Accordion's chevron, verbatim — including the direction,
        // which the sheet draws the other way round (see needsDesign).
        "transition-[rotate]", motionMicro,
        "group-data-[panel-open]/summary:rotate-180",
      )}
    />
  );
}

/** The form's own body — everything below the summary line. */
function FormBody(props: ResolvedProgress & { icon?: ReactElement }) {
  const { form, icon } = props;

  if (form === "activity") {
    const activities = props.activities ?? [];
    return (
      <div data-slot="chat-progress-activities" className="flex flex-col gap-sm">
        {activities.map((activity) => (
          <div
            key={`${activity.verb}-${activity.detail}`}
            data-slot="chat-progress-activity"
            // The same lift the sender bubble takes — bg-elevated, radius-md —
            // so a named source reads as a quoted object rather than as prose.
            className="flex items-center gap-sm rounded-md bg-elevated px-md py-sm"
          >
            <span
              data-slot="chat-progress-activity-verb"
              className="shrink-0 font-body text-label-md font-bold leading-normal text-ink-secondary"
            >
              {activity.verb}
            </span>
            {/* Truncates; it never wraps. A source title that wraps turns a
                one-line status into a paragraph the reader has to parse. */}
            <span
              data-slot="chat-progress-activity-detail"
              className="min-w-0 flex-1 truncate font-body text-body-sm leading-normal text-ink-muted"
            >
              {activity.detail}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (form === "steps") {
    const steps = props.steps ?? [];
    return (
      // Indented to the group header's text, which is what makes the list read
      // as belonging to it without a rule between them (Menu.Separator's rule:
      // grouping is the difference between two gaps, never a line).
      <ul data-slot="chat-progress-steps" className="flex flex-col gap-sm ps-xl">
        {steps.map((step) => (
          <li key={step.id} data-slot="chat-progress-step" data-step-status={step.status} className="flex items-center gap-sm">
            {step.status === "done" ? (
              <CheckCircle size={14} aria-hidden="true" className="shrink-0 text-success" />
            ) : step.status === "current" ? (
              <Spinner className="size-[14px] border-[1.5px]" />
            ) : (
              <PendingRing />
            )}
            <span
              className={cn(
                "font-body text-body-sm leading-normal",
                // The CURRENT step is the only one that steps forward; done and
                // pending both sit in text-ink-muted and are told apart by their
                // glyph — a check against an empty ring.
                //
                // The sheet draws a pending step in text-ink-disabled, which
                // measures 2.14:1 and was caught by the story-a11y run. WCAG's
                // exemption covers inactive CONTROLS, and a step label is
                // content: it describes work the reader is waiting for, so it
                // has to be readable while they wait. Raised on the sheet, and
                // redrawn there.
                step.status === "current" ? "font-medium text-ink-secondary" : "text-ink-muted",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (form === "measured") {
    const { label = "", value = 0, max } = props;
    return (
      // The Progress primitive, not a hand-rolled track: a bar drawn here would
      // have no role="progressbar", no aria-valuenow, and no reason to reach
      // for --ui-bg-accent-legible — which is the SC 1.4.11 failure that role
      // exists to prevent.
      <Progress
        data-slot="chat-progress-measured"
        size="sm"
        hasValueText
        label={label}
        value={value}
        {...(max !== undefined ? { max } : {})}
      />
    );
  }

  const { label = "" } = props;
  return (
    <div
      data-slot="chat-progress-thinking"
      // The slot is SIZED. A caller passing their product's mark here would
      // otherwise get griddy's 24px presentation attribute beside a 13px line
      // — the defect `icon-slot.browser.test.tsx` exists for, and this
      // component is in it.
      className="flex items-center gap-sm [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {icon ?? <Spinner className="size-4 border-2" />}
      <span className="font-body text-body-sm font-medium leading-normal text-ink-muted">{label}</span>
    </div>
  );
}
