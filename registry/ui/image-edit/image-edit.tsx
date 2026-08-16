"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RefreshCcw, RefreshCw } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Slider } from "@/ui/slider";

/**
 * What the crop is FOR, which is what decides its shape.
 *
 * `rect` is the sheet's default and carries corner marks; `circle` is the
 * avatar case, where the mask matches the destination — a circular crop with
 * corner handles would be promising a rectangle it cannot deliver, which is
 * why the sheet draws none on that row.
 */
export type ImageEditShape = "rect" | "circle";

/** The crop window, per shape. Fixed sizes: the IMAGE moves, not the window. */
const CROP = {
  rect: "h-42 w-60 rounded-none",
  circle: "size-42 rounded-full",
} as const satisfies Record<ImageEditShape, string>;

/**
 * The same two windows as NUMBERS, because the cover fit has to do arithmetic
 * on them and a class name cannot be measured.
 *
 * Duplication, and the honest kind: `image-edit.browser.test.tsx` asserts the
 * painted window equals these, so the pair cannot drift without a failure.
 */
const CROP_SIZE = {
  rect: { w: 240, h: 168 },
  circle: { w: 168, h: 168 },
} as const satisfies Record<ImageEditShape, { w: number; h: number }>;

interface ImageEditOwnProps {
  src: string;
  /**
   * Required. The picture is the whole subject of this dialog, and a cropper
   * whose image announces as nothing leaves a screen-reader user adjusting an
   * unnamed thing.
   */
  alt: string;
  shape?: ImageEditShape;

  zoom?: number;
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;

  /**
   * Degrees. Omit `hasRotation` and the control is not drawn at all — the
   * sheet draws three rows without it and one with.
   */
  rotation?: number;
  defaultRotation?: number;
  onRotationChange?: (rotation: number) => void;
  hasRotation?: boolean;
  maxRotation?: number;

  /** Visible strings. Props, because there is no i18n runtime here (§9). */
  cropLabel?: string;
  zoomLabel?: string;
  rotationLabel?: string;
  zoomOutLabel?: string;
  zoomInLabel?: string;
  rotateLeftLabel?: string;
  rotateRightLabel?: string;
  /** The sentence a keyboard user is told when the stage takes focus. */
  keyboardHint?: string;
}

export interface ImageEditProps
  extends ImageEditOwnProps,
    Omit<HTMLAttributes<HTMLDivElement>, keyof ImageEditOwnProps> {}

/** How far one arrow press moves the image, in stage pixels. */
const NUDGE = 8;

export const ImageEdit = forwardRef<HTMLDivElement, ImageEditProps>(function ImageEdit(
  {
    src,
    alt,
    shape = "rect",
    zoom,
    defaultZoom = 100,
    onZoomChange,
    minZoom = 100,
    maxZoom = 300,
    rotation,
    defaultRotation = 0,
    onRotationChange,
    hasRotation = false,
    maxRotation = 45,
    cropLabel = "Crop area",
    zoomLabel = "Zoom",
    rotationLabel = "Rotate",
    zoomOutLabel = "Zoom out",
    zoomInLabel = "Zoom in",
    rotateLeftLabel = "Rotate left",
    rotateRightLabel = "Rotate right",
    keyboardHint = "Use the arrow keys to move the image inside the crop.",
    className,
    ...rest
  },
  ref,
) {
  const hintId = useId();
  const [zoomValue, setZoom] = useControllableState<number>({
    ...(zoom !== undefined ? { value: zoom } : {}),
    defaultValue: defaultZoom,
    ...(onZoomChange ? { onChange: onZoomChange } : {}),
  });
  const [rotationValue, setRotation] = useControllableState<number>({
    ...(rotation !== undefined ? { value: rotation } : {}),
    defaultValue: defaultRotation,
    ...(onRotationChange ? { onChange: onRotationChange } : {}),
  });

  // The pan offset is INTERNAL. It is meaningless outside the stage's own
  // pixel space — a caller cannot act on "the image is 12px left" without also
  // knowing the stage size — so it is not a prop, and what a caller gets on
  // Apply is the zoom and the rotation.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  /**
   * The picture's LAID-OUT size, once it has one.
   *
   * `object-contain` inside the stage decides it, and nothing else in this
   * component can compute it — the natural dimensions are not known until the
   * image loads. Every guarantee below is blocked on this one fact, which is
   * why it was a knownGap before it was a measurement.
   */
  const [fitted, setFitted] = useState<{ w: number; h: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const measure = useCallback(() => {
    const el = imageRef.current;
    if (!el || !el.naturalWidth || !el.naturalHeight) return;
    // `offsetWidth/Height`, NOT getBoundingClientRect: the rect is the
    // TRANSFORMED box, so measuring with it feeds the element's own scale and
    // rotation back into the fit that produces them. It agrees at 0° and 100%
    // — which is why the first version passed every unrotated case and failed
    // every rotated one.
    const boxW = el.offsetWidth;
    const boxH = el.offsetHeight;
    if (!boxW || !boxH) return;
    // The picture inside that box under object-contain: the scale below is
    // applied on top of a picture the browser has already fitted.
    const fit = Math.min(boxW / el.naturalWidth, boxH / el.naturalHeight);
    const next = { w: el.naturalWidth * fit, h: el.naturalHeight * fit };
    setFitted((current) =>
      current && Math.abs(current.w - next.w) < 0.5 && Math.abs(current.h - next.h) < 0.5
        ? current
        : next,
    );
  }, []);

  /**
   * Re-measure when the stage changes width.
   *
   * The fitted size is what every guarantee here is computed from, and it is a
   * function of the stage's box — so a viewport resize invalidates it, and a
   * stale one means the crop silently stops being covered. Measured on load
   * alone this held only until the first resize.
   */
  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  /**
   * What "100%" MEANS: the picture exactly covering the crop, at the rotation
   * it currently has.
   *
   * It used to mean "contained in the stage", which promised nothing about the
   * crop — and the crop is the only thing that matters, because it is what the
   * user gets back. A portrait or panoramic picture simply left a hole in it
   * (a 600x3000 image fitted to 52x260 against a 240px-wide crop: 188px of
   * nothing), and rotation opened the corners on images that were fine at 0°,
   * because the crop's ROTATED bounding box grows faster than the picture does:
   *
   *   crop 240x168 at -20°  needs 283x240   a fitted 16:9 is 384x216  -> gaps
   *
   * So the baseline is a COVER fit against that rotated box. 100% is then a
   * true floor rather than an arbitrary number: at it the crop is exactly full,
   * and above it there is only more picture. The visible consequence is that
   * rotating at 100% grows the image — it has to, or the guarantee breaks.
   */
  const coverScale = (() => {
    if (!fitted) return 1;
    const radians = (Math.abs(rotationValue) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    // The crop, expressed in the picture's own (unrotated) frame.
    const needW = CROP_SIZE[shape].w * cos + CROP_SIZE[shape].h * sin;
    const needH = CROP_SIZE[shape].w * sin + CROP_SIZE[shape].h * cos;
    return Math.max(needW / fitted.w, needH / fitted.h, 1);
  })();

  const scale = coverScale * (zoomValue / 100);

  /**
   * How far the picture may be dragged before the crop leaves it.
   *
   * Half the overhang on each axis, measured in the ROTATED frame for the same
   * reason the cover scale is. At exactly 100% with no rotation the overhang is
   * zero and the picture does not move at all, which is correct: there is
   * nothing to choose between.
   */
  const limit = (() => {
    if (!fitted) return { x: Infinity, y: Infinity };
    const radians = (Math.abs(rotationValue) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const needW = CROP_SIZE[shape].w * cos + CROP_SIZE[shape].h * sin;
    const needH = CROP_SIZE[shape].w * sin + CROP_SIZE[shape].h * cos;
    return {
      x: Math.max(0, (fitted.w * scale - needW) / 2),
      y: Math.max(0, (fitted.h * scale - needH) / 2),
    };
  })();

  const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value));

  const move = (dx: number, dy: number) =>
    setOffset((current) => ({
      x: clamp(current.x + dx, limit.x),
      y: clamp(current.y + dy, limit.y),
    }));

  /**
   * The transform the picture carries.
   *
   * Inline, because the values are continuous — a class cannot carry a drag.
   * `transform` rather than Tailwind's standalone `scale`/`translate`/`rotate`
   * so the three compose in a defined ORDER: translate, then rotate, then
   * scale. Written as separate properties they compose in the order the
   * browser applies them, and a rotation would then swing the pan around with
   * it, which reads as the image sliding sideways when you straighten it.
   *
   * The offset is clamped on READ as well as on write: zooming out or
   * straightening shrinks the limit under an offset that was legal a moment
   * ago, and a stale one would show as the crop drifting off the picture with
   * nothing having been dragged.
   */
  const transform: CSSProperties = {
    transform:
      `translate(${clamp(offset.x, limit.x)}px, ${clamp(offset.y, limit.y)}px) ` +
      `rotate(${rotationValue}deg) scale(${scale})`,
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Primary button only, and never a second finger mid-drag.
    if (event.button !== 0 || drag.current) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    // Capture, so a drag that leaves the stage keeps tracking rather than
    // freezing the image halfway.
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    move(event.clientX - active.x, event.clientY - active.y);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /**
   * The keyboard path for the drag — the sheet draws none, and without it the
   * only way to position the image is a pointer (SC 2.1.1). `check:gestures`
   * refuses a pointer initiator with no keyboard handler, which is why this is
   * a handler here rather than a note in the doc.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? NUDGE * 4 : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[event.key];
    if (!delta) return;
    // Only once it is known to be a key this control handles — otherwise Tab
    // and Escape are swallowed and the dialog cannot be left.
    event.preventDefault();
    move(delta[0], delta[1]);
  };


  return (
    <div
      ref={ref}
      data-slot="image-edit"
      data-shape={shape}
      className={cn("flex w-full flex-col gap-lg", className)}
      {...rest}
    >
      <div
        data-slot="image-edit-stage"
        role="group"
        aria-label={cropLabel}
        aria-describedby={hintId}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          // `group/stage` is named so the thirds grid inside the crop can key
          // off the STAGE being pressed. An unnamed `group` would also match a
          // group the consumer happens to have outside.
          "group/stage relative flex h-65 w-full shrink-0 items-center justify-center self-stretch",
          "overflow-clip rounded-md",
          // `bg-media`, NOT the sheet's `bg-emphasis`. Emphasis IS the accent,
          // so an editor stage painted with it resolves to the brand colour —
          // #ffe066 under a pale-yellow seed — and every colour in the picture
          // is then judged against it. See the media family in the contract.
          "bg-media",
          "cursor-grab touch-none active:cursor-grabbing",
          "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
          "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
        )}
      >
        {/*
          ONE picture, not two.
          The first version drew the image twice — dimmed across the stage, and
          again at full opacity inside the crop — and the two could never line
          up: each was `object-contain` inside a DIFFERENT box (384x260 and
          240x168), so they resolved to different scales and different offsets.
          Rotating then showed both quads at once, which is the doubling.
          One image, and the crop's dimming is a hole punched in a scrim
          instead.
        */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          data-slot="image-edit-image"
          draggable={false}
          // The picture's fitted box is the input to every guarantee here, and
          // it is not knowable until it loads.
          onLoad={measure}
          style={transform}
          className="pointer-events-none absolute inset-0 size-full object-contain select-none"
        />

        <div
          data-slot="image-edit-crop"
          style={{
            // The hole. A spread larger than any stage dims everything outside
            // the window and nothing inside it, and it follows border-radius —
            // so the circular mask gets a circular hole for free, which four
            // dimming rectangles could not do. The stage clips the overflow.
            boxShadow: `0 0 0 9999px color-mix(in oklab, var(--ui-bg-media) 64%, transparent)`,
          }}
          className={cn(
            "relative shrink-0",
            // The window's edge and marks are ink ON MEDIA, so they hold
            // against any photograph rather than against the page.
            "border-[1.5px] border-solid border-(--ui-text-on-media)",
            CROP[shape],
          )}
        >
          {/* Rule of thirds, while dragging. aria-hidden: it is an aid for the
              eye and says nothing a screen reader can use. */}
          <span
            aria-hidden="true"
            data-slot="image-edit-thirds"
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0",
              "group-active/stage:opacity-45",
              "transition-opacity", motionMicro,
            )}
          >
            {["left-1/3", "left-2/3"].map((position) => (
              <span
                key={position}
                className={cn("absolute top-0 h-full w-px bg-(--ui-text-on-media)", position)}
              />
            ))}
            {["top-1/3", "top-2/3"].map((position) => (
              <span
                key={position}
                className={cn("absolute left-0 h-px w-full bg-(--ui-text-on-media)", position)}
              />
            ))}
          </span>

          {/* Corner marks. Decoration on a fixed window — the image moves, not
              the crop — so they are aria-hidden and carry no handlers. The
              circle has none, because a round crop cannot deliver the
              rectangle a corner handle promises. */}
          {shape === "rect" && (
            <span aria-hidden="true" data-slot="image-edit-handles">
              {(
                [
                  ["top-0 left-0", "top-0 left-0"],
                  ["top-0 right-0", "top-0 right-0"],
                  ["bottom-0 left-0", "bottom-0 left-0"],
                  ["bottom-0 right-0", "bottom-0 right-0"],
                ] as const
              ).map(([arm, leg]) => (
                <span key={arm}>
                  <span className={cn("absolute h-[3px] w-3.5 bg-(--ui-text-on-media)", arm)} />
                  <span className={cn("absolute h-3.5 w-[3px] bg-(--ui-text-on-media)", leg)} />
                </span>
              ))}
            </span>
          )}
        </div>

        <span id={hintId} className="sr-only">
          {keyboardHint}
        </span>
      </div>

      <ImageEditControl
        label={zoomLabel}
        value={`${Math.round(zoomValue)}%`}
        slider={
          <Slider
            label={zoomLabel}
            isLabelHidden
            size="sm"
            min={minZoom}
            max={maxZoom}
            value={zoomValue}
            onValueChange={setZoom}
            hasSteppers
            decrementLabel={zoomOutLabel}
            incrementLabel={zoomInLabel}
          />
        }
      />

      {hasRotation && (
        <ImageEditControl
          label={rotationLabel}
          // The degree sign and a MINUS sign, not a hyphen — the sheet draws
          // "−12°" and a hyphen is a different character at a different width.
          value={`${rotationValue < 0 ? "−" : ""}${Math.abs(Math.round(rotationValue))}°`}
          slider={
            <Slider
              label={rotationLabel}
              isLabelHidden
              size="sm"
              min={-maxRotation}
              max={maxRotation}
              value={rotationValue}
              onValueChange={setRotation}
              hasSteppers
              decrementLabel={rotateLeftLabel}
              incrementLabel={rotateRightLabel}
              decrementIcon={<RefreshCcw aria-hidden="true" />}
              incrementIcon={<RefreshCw aria-hidden="true" />}
            />
          }
        />
      )}
    </div>
  );
});

/**
 * The label row above a slider.
 *
 * Drawn here rather than through Slider's own `label` + `hasValueText`,
 * because the sheet's row is a DIFFERENT pair of type roles — label-md at 550
 * over caption at 500, against Slider's body-sm muted — and because the value
 * carries a unit (`128%`, `−12°`) that Slider renders as a bare number. The
 * slider keeps its accessible name through `label` + `isLabelHidden`, so
 * nothing is lost by drawing the visible row separately.
 */
function ImageEditControl({
  label,
  value,
  slider,
}: {
  label: string;
  value: string;
  slider: React.ReactElement;
}) {
  return (
    <div data-slot="image-edit-control" className="flex flex-col gap-sm self-stretch">
      <div className="flex items-baseline justify-between self-stretch">
        <span
          data-slot="image-edit-control-label"
          className="text-label-md font-body font-semibold leading-normal text-ink-secondary"
        >
          {label}
        </span>
        {/* aria-hidden: the slider already announces its own value, and a
            screen reader hearing "128%" twice learns nothing the second time. */}
        <span
          aria-hidden="true"
          data-slot="image-edit-control-value"
          className="text-caption font-body font-medium leading-normal text-ink-muted"
        >
          {value}
        </span>
      </div>
      {slider}
    </div>
  );
}
