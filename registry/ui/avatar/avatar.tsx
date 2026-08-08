import { Children, forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const childrenToArray = Children.toArray;

export type AvatarSize = "lg" | "md" | "sm";
/**
 * `soft` and `full`, the same two words Button uses for the same two shapes
 * (CONVENTIONS §2 — shared vocabulary where the meaning is shared), and the
 * two the sheet's own layers are named after: "Avatar Rounded Soft" and
 * "Avatar Rounded Full". The previous `circle | rounded` was a synonym pair
 * for a concept that already had names.
 */
export type AvatarShape = "soft" | "full";
/** Presence, drawn as a dot on the corner. Intent vocabulary, as everywhere. */
export type AvatarStatus = "success" | "neutral" | "danger";

/**
 * The design draws one size (32px). `md` is that size verbatim; `lg` and `sm`
 * are DERIVED from the same scale so a row of avatars can match the control
 * heights they sit beside — recorded in the doc.
 */
const SIZE = {
  lg: "size-12 text-body-sm",
  md: "size-8 text-caption",
  sm: "size-6 text-caption",
} as const satisfies Record<AvatarSize, string>;

/** Matches Button's soft radius at each step, so a row of both is concentric. */
const SOFT_RADIUS = {
  lg: "rounded-md",
  md: "rounded-md",
  sm: "rounded-sm",
} as const satisfies Record<AvatarSize, string>;

/**
 * The status dot. 4px with a 1.5px ring at the sheet's 32px, inset 2px from
 * the corner — all three transcribed. `lg` scales with the avatar (6px, inset
 * 4px); `sm` deliberately does NOT scale down, because 3px is a mark nobody
 * can see and the dot is the only visual carrier of the state.
 */
const DOT_SIZE = {
  lg: "size-1.5 right-1 bottom-1",
  md: "size-1 right-0.5 bottom-0.5",
  sm: "size-1 right-0.5 bottom-0.5",
} as const satisfies Record<AvatarSize, string>;

/**
 * Dot fills, as ROLES rather than as the sheet's values.
 *
 * The sheet drew success from `--ui-data-transactional-fg` — a data-viz
 * category role that happens to be the same green — and neutral from
 * `--ui-bg-emphasis-active`, which measures 10.34:1 in light and **1.31:1 in
 * dark**: invisible in the scheme nobody checked. Success and danger take the
 * intent roles they always should have; neutral takes `--ui-text-muted`, which
 * is what Banner's own `neutral` variant uses and which holds in both schemes
 * (5.78 / 6.47 against the ring). Measured by `check:contrast`, not asserted.
 */
const DOT_FILL = {
  success: "bg-success",
  neutral: "bg-ink-muted",
  danger: "bg-danger",
} as const satisfies Record<AvatarStatus, string>;

interface AvatarBaseProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: AvatarSize;
  shape?: AvatarShape;
  /**
   * The person or entity. Required in both forms: it is the image's alt text
   * and, when there is no image, the source the initials are derived from.
   * An avatar with no name is decoration wearing a person's face.
   */
  name: string;
}

interface AvatarImageProps extends AvatarBaseProps {
  src: string;
}

interface AvatarInitialsProps extends AvatarBaseProps {
  src?: undefined;
  /** Override the derived initials — non-Latin names, mononyms, brand marks. */
  initials?: string;
}

/**
 * A dot is colour and position only, so on its own it says nothing to anyone
 * not looking at it — WCAG 1.4.1 exactly. The label is therefore required BY
 * THE TYPE whenever a status is set, the same shape `isIconOnly` uses for
 * `aria-label`, rather than being a line in the docs that reviewers enforce.
 */
type AvatarStatusProps =
  | { status?: undefined; statusLabel?: undefined }
  | { status: AvatarStatus; statusLabel: string };

export type AvatarProps = (AvatarImageProps | AvatarInitialsProps) & AvatarStatusProps;

/** First letters of the first and last word, capped at two. */
function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]![0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

const AvatarRoot = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(props, ref) {
  const {
    size = "md",
    shape = "soft",
    name,
    status,
    statusLabel,
    className,
    ...rest
  } = props;
  const src = "src" in props ? props.src : undefined;
  const initials = "initials" in props && props.initials ? props.initials : initialsFrom(name);
  const radius = shape === "full" ? "rounded-full" : SOFT_RADIUS[size];

  return (
    // Two nodes rather than one, because the dot cannot live inside the
    // clipping context: the frame is `overflow-clip` so a photo takes the
    // radius, and a descendant dot on the corner would be cut in half by it.
    // The root therefore holds the box (and `className`, and the ref — §5),
    // and the frame holds everything that gets clipped.
    <span
      ref={ref}
      data-slot="avatar"
      data-size={size}
      data-shape={shape}
      data-status={status}
      className={cn("relative inline-flex shrink-0 select-none", SIZE[size], className)}
      {...rest}
    >
      <span
        data-slot="avatar-frame"
        className={cn(
          "flex size-full items-center justify-center overflow-clip",
          "font-body font-medium tracking-tight",
          // The sheet's hairline: an INSET ring in the page's own surface, so
          // two overlapping avatars in a group read as two rather than as one
          // shape. `outline` rather than `border`, because a border would eat
          // 1.5px of the image and Chromium floors it to a whole device pixel
          // anyway (border-hairline.browser.test.tsx).
          "outline-[1.5px] outline-offset-[-1.5px] outline-surface",
          // No image means initials on a recessed well. Ink is `muted`, not
          // the sheet's `disabled`: initials identify a person and must clear
          // AA. Measured, disabled is 1.76:1 on this well and muted is 4.87:1.
          !src && "bg-sunken text-ink-muted",
          radius,
        )}
      >
        {src ? (
          // A real <img> rather than a background: it carries alt text, and a
          // broken URL degrades to that text instead of an empty box.
          <img src={src} alt={name} data-slot="avatar-image" className="size-full object-cover" />
        ) : (
          // The visible glyphs are an abbreviation, so they are hidden from
          // assistive tech and the full name is exposed instead — a screen
          // reader announcing "M V" helps nobody.
          <>
            <span aria-hidden="true" data-slot="avatar-initials">
              {initials}
            </span>
            <span className="sr-only">{name}</span>
          </>
        )}
      </span>

      {status && (
        <>
          <span
            aria-hidden="true"
            data-slot="avatar-status"
            className={cn(
              "absolute rounded-full outline-[1.5px] outline-surface",
              DOT_SIZE[size],
              DOT_FILL[status],
            )}
          />
          {/* The state in words, next to the name it belongs to. */}
          <span className="sr-only">{statusLabel}</span>
        </>
      )}
    </span>
  );
});

interface AvatarGroupBaseProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  /**
   * Sizes the "+N" tile. It has to be told, because the group renders that
   * tile itself and cannot read a size off children it never inspects — pass
   * the same size the avatars carry.
   */
  size?: AvatarSize;
  /** Shapes the "+N" tile. Same reason, same rule. */
  shape?: AvatarShape;
}

/**
 * `max` and `overflowLabel` travel together or not at all. A "+4" tile is a
 * glyph and a number; without a sentence beside it a screen reader reads
 * "plus four" and the user learns nothing about who those four are.
 */
type AvatarGroupOverflowProps =
  | { max?: undefined; overflowLabel?: undefined }
  | { max: number; overflowLabel: string };

export type AvatarGroupProps = AvatarGroupBaseProps & AvatarGroupOverflowProps;

/**
 * A stack of avatars, overlapping by the sheet's 4px.
 *
 * The overlap is a NEGATIVE margin on every child but the first, which is
 * what the sheet draws (`margin-left: -4px`) and what `-space-x-xs` compiles
 * to. It is applied from the container rather than by cloning the children,
 * because a slot's contents are never rewritten by their parent (§3).
 */
function AvatarGroup({
  children,
  max,
  overflowLabel,
  size = "md",
  shape = "soft",
  className,
  ...rest
}: AvatarGroupProps) {
  // `Children.toArray` rather than a hand-rolled Array.isArray branch: it
  // flattens fragments, drops null/false from a conditional child, and keys
  // what it returns. A `{cond && <Avatar/>}` in the list would otherwise count
  // toward `max` as a falsy item and silently hide a real avatar.
  const items = childrenToArray(children);
  const shown = typeof max === "number" ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;

  return (
    <span
      data-slot="avatar-group"
      // The sheet's 4px overlap, as a negative margin on every child but the
      // first — which is exactly what it draws (`margin-left: -4px`).
      className={cn("inline-flex items-center -space-x-xs", className)}
      {...rest}
    >
      {shown}
      {hidden > 0 && (
        // The counter is the same tile as an avatar with no photo, on purpose:
        // it sits in the stack, so it has to carry the same well, radius and
        // hairline or it reads as a different kind of object.
        <span
          data-slot="avatar-overflow"
          className={cn(
            "relative inline-flex shrink-0 select-none items-center justify-center",
            "bg-sunken text-ink-muted font-body font-medium tracking-tight",
            "outline-[1.5px] outline-offset-[-1.5px] outline-surface",
            SIZE[size],
            shape === "full" ? "rounded-full" : SOFT_RADIUS[size],
          )}
        >
          <span aria-hidden="true">{`+${hidden}`}</span>
          <span className="sr-only">{overflowLabel}</span>
        </span>
      )}
    </span>
  );
}

export const Avatar = Object.assign(AvatarRoot, { Group: AvatarGroup });
