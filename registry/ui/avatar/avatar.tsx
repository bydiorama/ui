import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type AvatarSize = "lg" | "md" | "sm";
export type AvatarShape = "circle" | "rounded";

/**
 * The design draws one size (32px). `md` is that size verbatim; `lg` and `sm`
 * are DERIVED from the same scale so a row of avatars can match the control
 * heights they sit beside — recorded as a known gap in the doc.
 */
const SIZE = {
  lg: "size-12 text-body-sm",
  md: "size-8 text-caption",
  sm: "size-6 text-caption",
} as const satisfies Record<AvatarSize, string>;

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

export type AvatarProps = AvatarImageProps | AvatarInitialsProps;

/** First letters of the first and last word, capped at two. */
function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]![0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(props, ref) {
  const { size = "md", shape = "circle", name, className, ...rest } = props;
  const src = "src" in props ? props.src : undefined;
  const initials = "initials" in props && props.initials ? props.initials : initialsFrom(name);

  return (
    <span
      ref={ref}
      data-slot="avatar"
      data-size={size}
      data-shape={shape}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-clip",
        "font-body font-medium tracking-tight",
        // No image means initials on a recessed well. Ink is `muted`, not
        // `disabled`: initials identify a person and must clear AA (4.9:1 on
        // bg-sunken); the sheet's disabled ink measured 1.8:1.
        !src && "bg-sunken text-ink-muted",
        shape === "circle" ? "rounded-full" : "rounded-md",
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {src ? (
        // A real <img> rather than a background: it carries alt text, and a
        // broken URL degrades to that text instead of an empty box.
        <img
          src={src}
          alt={name}
          data-slot="avatar-image"
          className="size-full object-cover"
        />
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
  );
});
