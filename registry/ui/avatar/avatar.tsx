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
 * The seam colour, and where it is and is not painted.
 *
 * EVERY avatar in every library carries a full-perimeter ring in the page's
 * colour — shadcn (`*:ring-2 *:ring-background`), MUI (`2px solid
 * background.paper`), Atlassian, Flowbite. All of them have the same defect,
 * and MUI has it on file (#21700): "Avatar group uses the background colour
 * set for the app for the Avatar borders, but doesn't pick up on the
 * background colour of the div it's within." Their answer, and ours until now,
 * is to let the consumer rebind the colour.
 *
 * The sharper answer is Primer's: paint the seam ONLY where it does work.
 * A ring's whole job is to separate two OVERLAPPING avatars — the component's
 * own comment has always said so — and three of its four sides never touch
 * another avatar. Those three sides are the entire defect: they sit on the
 * ground, claim to BE the ground, and are wrong the moment the avatar is on a
 * card, a menu panel or a table row. A lone avatar has nothing behind it at
 * all and wore the ring anyway, which is most call sites in an app.
 *
 * So the frame carries no ring. `Avatar.Group` paints a seam on the LEADING
 * edge of every child but the first — the one edge that lands on top of the
 * avatar beneath it — and it never reaches the ground. Drawn as an offset
 * `box-shadow` rather than a border: a shadow copies the border-box SHAPE, so
 * it follows `soft` and `full` alike with no per-shape geometry, stays
 * resolution-independent, and needs none of the pixel maths a mask does. Primer
 * uses `border-right` and has to invert the z-index so the earlier avatar
 * paints on top; putting the seam on the LEADING edge instead means DOM order
 * already puts it in the right place.
 *
 * `--ui-avatar-ring-color` survives for the two things that still paint: the
 * seam, and the status dot's ring. It is the same escape hatch every library
 * lands on, and it now matters for a 1.5px sliver rather than for every
 * avatar's whole perimeter. The fallback lives in the `var()` rather than as a
 * declaration on the element, because a declaration would beat an ancestor's
 * binding and make the property useless for the case it exists for.
 *
 * NOT a mask. A cut-out is the only truly ground-independent answer and it is
 * the wrong trade here: it clips tightly enough that an outer focus ring
 * becomes impossible (Vaadin #26 — and this avatar is going to become a
 * control), it lands on fractional pixels and jitters on resize, and the
 * radial-gradient form everyone ships is a CIRCLE trick while `soft` is this
 * component's default.
 *
 * The STATUS DOT below keeps an opaque ring, and it is the one case a cut-out
 * could never serve: it separates a 4px mark from the photograph beneath it,
 * so a hole there shows the photograph. Outset rather than inset, and mostly
 * painted over the image — only a sliver at the corner reaches the ground.
 *
 * Every class here is written out IN FULL rather than composed from a shared
 * constant, and that is not a style preference. Tailwind scans SOURCE TEXT: a
 * class built by interpolation never appears literally, so the rule is never
 * generated and `outline-color` silently falls back to `currentColor` — a
 * near-black ring round the dot instead of the ground. Probed exactly that
 * way; it computed to rgb(29, 27, 25). `check:utilities` cannot see it either,
 * because arbitrary values are skipped there by design.
 */
const DOT_RING = "outline-[1.5px] outline-[color:var(--ui-avatar-ring-color,var(--ui-bg-surface))]";

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
      // The radius is on the ROOT as well as the frame, and it is load-bearing
      // rather than decorative: the root does not clip, so it changes nothing
      // visually — but `Avatar.Group` draws the seam as a box-shadow on this
      // node, and a shadow copies the BORDER-BOX shape. Without the radius here
      // the seam would be a square offset behind a rounded tile.
      className={cn("relative inline-flex shrink-0 select-none", radius, SIZE[size], className)}
      {...rest}
    >
      <span
        data-slot="avatar-frame"
        className={cn(
          "flex size-full items-center justify-center overflow-clip",
          "font-body font-medium tracking-tight",
          // NO ring. It used to carry a full-perimeter hairline in the page's
          // colour, which is what every library ships and what made the avatar
          // wrong on any ground but one. Separating two overlapping avatars is
          // the group's job and the group does it on one edge — see SEAM.
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
              // The dot's ring is OUTSET — it separates the mark from the photo
              // under it — so no negative offset here.
              "absolute rounded-full",
              DOT_RING,
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
      className={cn(
        // The sheet's 4px overlap, as a negative margin on every child but the
        // first — which is exactly what it draws (`margin-left: -4px`).
        "inline-flex items-center -space-x-xs",
        // The seam, on the LEADING edge of every child but the first — the one
        // edge that lands on top of the avatar beneath it, and the only place a
        // separation is needed. An offset box-shadow rather than a border,
        // because a shadow copies the border-box SHAPE: it follows `soft` and
        // `full` with no per-shape geometry. The offset is smaller than the
        // 4px overlap by construction, so the seam never reaches the ground.
        //
        // The first child gets nothing, and neither does a lone avatar outside
        // a group — which is the whole point. This is where every library
        // (shadcn, MUI, Atlassian, Flowbite) paints a full ring in the page's
        // colour instead, and where all of them acquire the same bug.
        "[&>*:not(:first-child)]:shadow-[-1.5px_0_0_0_var(--ui-avatar-ring-color,var(--ui-bg-surface))]",
        // The stack reverses under RTL, so the leading edge does too. A
        // box-shadow offset is the one thing here with no logical form.
        "rtl:[&>*:not(:first-child)]:shadow-[1.5px_0_0_0_var(--ui-avatar-ring-color,var(--ui-bg-surface))]",
        className,
      )}
      {...rest}
    >
      {shown}
      {hidden > 0 && (
        // The counter is the same tile as an avatar with no photo, on purpose:
        // it sits in the stack, so it has to carry the same well and radius or
        // it reads as a different kind of object. Its seam comes from the same
        // container rule the avatars get — it is a child like any other.
        <span
          data-slot="avatar-overflow"
          className={cn(
            "relative inline-flex shrink-0 select-none items-center justify-center",
            "bg-sunken text-ink-muted font-body font-medium tracking-tight",
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
