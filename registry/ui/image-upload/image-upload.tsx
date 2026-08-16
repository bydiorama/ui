import {
  forwardRef,
  useId,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle, Close, Plus, Upload } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Progress } from "@/ui/progress";

/**
 * The dropzone's state, as ONE closed union rather than three booleans.
 *
 * Three booleans describe eight states, five of which are nonsense — busy and
 * rejected at once, attached while empty. The sheet draws five rows and four
 * of them are this union; the fifth (drag-over) is not here on purpose,
 * because the component owns it: whether a file is currently over the target
 * is not something a caller knows or should have to tell it.
 */
export type ImageUploadStatus = "empty" | "busy" | "attached" | "rejected";

interface ImageUploadOwnProps {
  /**
   * Required, like every field in this library (§10). A drop target with no
   * name announces as "region" and a file input with no name announces as
   * "browse" — neither says what is being uploaded.
   */
  label: string;
  isLabelHidden?: boolean;
  /** The constraints, in words, under the target. */
  helperText?: string;
  /**
   * What went wrong. Its presence is what puts the field in `rejected`, the
   * same way `errorText` works on Input — so the error and the state cannot
   * disagree.
   */
  errorText?: string;
  /** The second line of a rejection: what to do about it. */
  errorDetail?: string;
  status?: ImageUploadStatus;
  /** The prompt above the browse control. A prop, because there is no i18n
   *  runtime here (§9) and every user-visible string is the app's. */
  prompt?: string;
  browseLabel?: string;
  /** What `busy` says while the upload runs. */
  busyText?: string;
  /** Native `accept`, forwarded to the real file input. */
  accept?: string;
  isMultiple?: boolean;
  isDisabled?: boolean;
  /**
   * The attached image. A slot, so the caller decides whether it is a bare
   * `<img>`, an AspectRatio or an ImageOverlay with a caption on it.
   */
  preview?: ReactNode;
  /** Replace / Remove / Choose another file — real Buttons, at the call site. */
  actions?: ReactNode;
  /** Fires for a drop AND for a browse, so a caller handles one path. */
  onSelect?: (files: File[]) => void;
}

export interface ImageUploadProps
  extends ImageUploadOwnProps,
    Omit<HTMLAttributes<HTMLDivElement>, keyof ImageUploadOwnProps> {}

/** The dropzone's outer edge, per state. */
const EDGE = {
  empty: "border-edge-subtle",
  busy: "border-edge-subtle",
  attached: "border-edge-subtle",
  // The error is carried by the BOUNDARY as well as by the message. Input
  // shipped once with an error state whose border was identical to default,
  // leaving colour of the message as the only channel — WCAG 1.4.1 exactly.
  rejected: "border-danger",
} as const satisfies Record<ImageUploadStatus, string>;

/** The inner well's fill, per state. */
const WELL = {
  empty: "bg-elevated",
  busy: "bg-elevated",
  attached: "bg-elevated",
  rejected: "bg-danger-subtle",
} as const satisfies Record<ImageUploadStatus, string>;

const ImageUploadRoot = forwardRef<HTMLDivElement, ImageUploadProps>(function ImageUpload(
  {
    label,
    isLabelHidden = false,
    helperText,
    errorText,
    errorDetail,
    status,
    prompt = "Drag an image here or",
    browseLabel = "browse",
    busyText = "Uploading",
    accept,
    isMultiple = false,
    isDisabled = false,
    preview,
    actions,
    onSelect,
    className,
    ...rest
  },
  ref,
) {
  const inputId = useId();
  const helperId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // `errorText` decides, exactly as it does on Input: a caller cannot show a
  // message and forget the state, or set the state and forget the message.
  const state: ImageUploadStatus = errorText ? "rejected" : (status ?? "empty");
  const describedBy = [errorText ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(" ");

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onSelect?.(Array.from(list));
  };

  const stop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={ref}
      data-slot="image-upload"
      data-status={state}
      data-dragging={isDragging || undefined}
      className={cn("flex w-full flex-col items-start gap-sm", className)}
      {...rest}
    >
      {/*
        A real <label> for a real <input type="file">. The input is the field:
        it carries the accessible name, the disabled state, `accept`, and the
        native picker — which is also the keyboard path for everything the
        drop target does with a pointer (see check-gestures' allowlist).
      */}
      <label
        htmlFor={inputId}
        data-slot="image-upload-label"
        className={cn(
          // Input's own label, verbatim, because this IS a field and the two
          // stack in a form. The sheet draws weight 550 here and 500 on
          // Input; following Input is what keeps a form from having two
          // label styles. Flagged in needsDesign.
          "text-label-md font-body font-medium text-ink-secondary",
          isLabelHidden && "sr-only",
        )}
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        data-slot="image-upload-input"
        className="sr-only"
        {...(accept ? { accept } : {})}
        multiple={isMultiple}
        disabled={isDisabled}
        {...(describedBy ? { "aria-describedby": describedBy } : {})}
        aria-invalid={state === "rejected" || undefined}
        onChange={(event) => emit(event.currentTarget.files)}
      />

      <div
        data-slot="image-upload-dropzone"
        // The drag events live on a plain div and NOT on the input: a file
        // input's own drop target is the control, which is visually hidden
        // here. `dragover` must preventDefault or the browser navigates to
        // the file instead of handing it over.
        onDragOver={(event) => {
          if (isDisabled) return;
          stop(event);
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          stop(event);
          setIsDragging(false);
        }}
        onDrop={(event) => {
          if (isDisabled) return;
          stop(event);
          setIsDragging(false);
          emit(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center self-stretch",
          "min-h-38 gap-sm rounded-lg p-sm",
          "border-[1.5px] border-solid bg-surface",
          // The drag-over ring. `border-edge-focus` is the role whose whole job is
          // "something is happening here", and it is already audited at 3:1.
          isDragging && !isDisabled ? "border-edge-focus" : EDGE[state],
          "transition-[border-color,background-color]", motionMicro,
        )}
      >
        {state === "attached" && preview ? (
          <div data-slot="image-upload-preview" className="w-full self-stretch">
            {preview}
          </div>
        ) : (
          <div
            data-slot="image-upload-well"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-sm self-stretch",
              "rounded-md p-sm",
              // The sheet washes the well to `accent-subtle` while dragging.
              isDragging && !isDisabled ? "bg-accent-subtle" : WELL[state],
              "transition-[background-color]", motionMicro,
              "[&_svg]:size-4 [&_svg]:shrink-0",
            )}
          >
            {state === "rejected" ? (
              <>
                {/* aria-hidden: the icon repeats what the message says, and
                    the message is what conveys the error (WCAG 1.4.1 is
                    already satisfied by the danger BORDER plus this text). */}
                <AlertCircle aria-hidden="true" className="text-danger" />
                <p
                  id={errorId}
                  data-slot="image-upload-error"
                  className="text-label-md font-body font-medium leading-normal text-ink-on-danger-subtle"
                >
                  {errorText}
                </p>
                {errorDetail && (
                  <p
                    data-slot="image-upload-error-detail"
                    className="text-caption font-body font-book leading-normal text-ink-on-danger-subtle"
                  >
                    {errorDetail}
                  </p>
                )}
              </>
            ) : state === "busy" ? (
              <>
                {/* CSS, not an icon: griddy has no spinner glyph and
                    check:icons forbids a private SVG — a non-icon visual
                    state is exactly what it says to draw with CSS. */}
                <span
                  aria-hidden="true"
                  data-slot="image-upload-spinner"
                  className={cn(
                    "size-4 shrink-0 rounded-full",
                    "border-[1.5px] border-solid border-edge-subtle border-t-(--ui-text-secondary)",
                    "motion-safe:animate-spin",
                  )}
                />
                {/*
                  A live region, because the whole point of this state is that
                  something is happening while the user is not looking at it.
                  Ink is `secondary`, NOT the sheet's `text-disabled`: this is
                  live status, and disabled ink measures 1.94:1 on the well.
                  WCAG exempts disabled CONTROLS, not status messages.
                */}
                <p
                  role="status"
                  data-slot="image-upload-busy"
                  className="text-label-md font-body font-medium leading-normal text-ink-secondary"
                >
                  {busyText}
                </p>
              </>
            ) : (
              <>
                <Upload aria-hidden="true" className="text-ink-secondary" />
                <p
                  data-slot="image-upload-prompt"
                  className="flex items-center gap-xs text-label-md font-body font-medium leading-normal text-ink-secondary"
                >
                  {prompt}
                  {/*
                    A real button, not the sheet's styled span. It opens the
                    native picker, which is the keyboard path for everything
                    the drop target offers a pointer — without it the whole
                    control is mouse-only (SC 2.1.1).
                  */}
                  <button
                    type="button"
                    data-slot="image-upload-browse"
                    disabled={isDisabled}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      "cursor-pointer rounded-sm font-semibold text-ink-link underline",
                      "disabled:cursor-not-allowed disabled:text-ink-disabled disabled:no-underline",
                      "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
                      "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
                    )}
                  >
                    {browseLabel}
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {actions && (
        <div data-slot="image-upload-actions" className="flex items-center gap-sm">
          {actions}
        </div>
      )}

      {helperText && (
        <p
          id={helperId}
          data-slot="image-upload-helper"
          className={cn(
            "text-caption font-body font-book leading-normal",
            // The sheet turns the constraints red once one of them is broken,
            // which is right: they stop being guidance and become the reason.
            state === "rejected" ? "text-danger" : "text-ink-muted",
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

interface ImageUploadFileOwnProps {
  /** The file's name, as the row's visible headline. */
  name: string;
  /** "1.4 MB of 2.2 MB" — the app's sentence, not a computed one (§9). */
  detail?: string;
  /** Percent complete. Omit once the upload has finished. */
  value?: number;
  /** A thumbnail or a file glyph. Sized by the slot, per §7. */
  icon?: ReactNode;
}

type ImageUploadFileCancel =
  | { onCancel?: undefined; cancelLabel?: undefined }
  | { onCancel: () => void; cancelLabel: string };

export type ImageUploadFileProps = ImageUploadFileOwnProps &
  ImageUploadFileCancel &
  Omit<HTMLAttributes<HTMLDivElement>, keyof ImageUploadFileOwnProps | "onCancel">;

/**
 * One file, mid-upload.
 *
 * The bar is a real Progress rather than a hand-drawn track, which is what
 * makes it announce as a progressbar and what keeps its fill on
 * `--ui-bg-accent-legible` — the sheet fills its own track with
 * `--ui-bg-accent`, 1.24:1 against the well.
 */
function ImageUploadFile({
  name,
  detail,
  value,
  icon,
  onCancel,
  cancelLabel,
  className,
  ...rest
}: ImageUploadFileProps) {
  return (
    <div
      data-slot="image-upload-file"
      className={cn(
        "flex w-full items-center gap-md self-stretch rounded-lg p-md",
        "border-[1.5px] border-solid border-edge-subtle bg-elevated",
        className,
      )}
      {...rest}
    >
      <span
        data-slot="image-upload-file-thumb"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center overflow-clip",
          "rounded-sm bg-sunken text-ink-muted",
          "[&_svg]:size-4 [&_svg]:shrink-0 [&_img]:size-full [&_img]:object-cover",
        )}
      >
        {icon}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <span className="flex items-center gap-sm">
          <span
            data-slot="image-upload-file-name"
            className="min-w-0 flex-1 truncate text-body-sm font-body font-semibold leading-normal text-ink-primary"
          >
            {name}
          </span>
          {typeof value === "number" && (
            // The percentage belongs on the NAME's line, at its end, which is
            // what the sheet draws — `Progress hasValueText` puts it in a row
            // of its own above the track, so using it here stacked the number
            // under the file name instead. It is aria-hidden because the bar
            // below already carries aria-valuenow: announcing "62" twice is
            // worse than announcing it once.
            <span
              aria-hidden="true"
              data-slot="image-upload-file-value"
              className="shrink-0 text-caption font-body font-medium leading-normal text-ink-muted"
            >
              {`${Math.round(value)}%`}
            </span>
          )}
        </span>
        {typeof value === "number" && (
          // The name is the accessible name of the bar, so a screen reader
          // hears which file is at 62% rather than a bare "62%".
          <Progress
            size="xs"
            value={value}
            label={name}
            isLabelHidden
            data-slot="image-upload-file-progress"
          />
        )}
        {detail && (
          <span
            data-slot="image-upload-file-detail"
            className="text-caption font-body font-book leading-normal text-ink-muted"
          >
            {detail}
          </span>
        )}
      </div>

      {onCancel && (
        <button
          type="button"
          data-slot="image-upload-file-cancel"
          aria-label={cancelLabel}
          onClick={onCancel}
          className={cn(
            "relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center",
            "rounded-sm text-ink-muted",
            "[&_svg]:size-4 [&_svg]:shrink-0",
            "enabled:hover:bg-hover enabled:hover:text-ink-primary",
            "transition-[background-color,color]", motionMicro,
            "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
            "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
          )}
        >
          {/* `Close`, not `X` — in griddy, `X` is the X/Twitter wordmark. */}
          <Close aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export interface ImageUploadGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * The multiple-image layout: attached tiles beside an add tile.
 *
 * The tiles are Thumbnails — the grid only supplies the framed well they sit
 * in, which is the same surface the dropzone draws.
 */
function ImageUploadGrid({ children, className, ...rest }: ImageUploadGridProps) {
  return (
    <div
      data-slot="image-upload-grid"
      className={cn(
        "flex w-full items-center gap-sm self-stretch rounded-lg p-sm",
        "border-[1.5px] border-solid border-edge-subtle bg-surface",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface ImageUploadAddProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  /** Required: the tile is a plus glyph and nothing else. */
  label: string;
  isDisabled?: boolean;
}

/**
 * The add tile.
 *
 * A real button rather than the sheet's frame, and NOT the shared chrome
 * control: that recipe is a fixed 32px square for page chrome, and this is a
 * 92px tile that sits in a row of images. It is allowlisted in
 * `check:controls` with that reason.
 */
function ImageUploadAdd({ label, isDisabled = false, className, ...rest }: ImageUploadAddProps) {
  return (
    <button
      type="button"
      data-slot="image-upload-add"
      aria-label={label}
      disabled={isDisabled}
      className={cn(
        "flex size-23 shrink-0 cursor-pointer items-center justify-center",
        "rounded-md bg-sunken text-ink-muted",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        "enabled:hover:bg-hover enabled:hover:text-ink-primary",
        "disabled:cursor-not-allowed disabled:text-ink-disabled",
        "transition-[background-color,color]", motionMicro,
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
        "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
        className,
      )}
      {...rest}
    >
      <Plus aria-hidden="true" />
    </button>
  );
}

export const ImageUpload = Object.assign(ImageUploadRoot, {
  File: ImageUploadFile,
  Grid: ImageUploadGrid,
  Add: ImageUploadAdd,
});
