"use client";

import { forwardRef, useMemo, useState, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * Count — a number changing where it stands (ADR 0028 §6; the Count sheet).
 *
 * The element's text is ALWAYS the formatted value, one span per character:
 * copy, find in page, screen readers and tests read "1,250", never digit
 * debris. Only the characters that changed move — matched to the previous
 * value from the right, so units stay over units. A changed character
 * remounts and arrives through `starting:` on `--ui-duration-base`, rising
 * `--ui-space-xs` × `--ui-motion-travel` (dropping, when the value shrank);
 * under it an aria-hidden ghost draws the old character with CSS `content`
 * from a data attribute and fades on `--ui-duration-fast`. Generated content
 * is never text, so the DOM stays the plain value at every frame.
 *
 * TextSwap's clock and Presence's rise, reused unchanged: a label and a
 * number changing in one Button move as one. The first render is still.
 */
export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children">, OwnedSlot {
  /** The number. Changing it is the change. */
  value: number;
  /** Intl.NumberFormat options — currency, percent, compact, fraction digits. */
  format?: Intl.NumberFormatOptions | undefined;
  /** BCP 47 locale for the formatting. Omitted follows the runtime's. */
  locale?: string | undefined;
}

interface Shown {
  value: number;
  text: string;
  /** The text before the latest change; null on the first render. */
  previous: string | null;
  /** 1 when the value grew (new digits rise), -1 when it shrank (they drop). */
  direction: 1 | -1;
  /** Bumped on every change, so a ghost remounts even for a repeated digit. */
  version: number;
}

export const Count = forwardRef<HTMLSpanElement, CountProps>(function Count(
  { value, format, locale, className, ...rest },
  ref,
) {
  const formatter = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  const text = formatter.format(value);

  // The previous text is derived DURING render (React's documented pattern
  // for state that follows a prop) — an effect would paint one frame with the
  // new digits and no ghosts.
  const [shown, setShown] = useState<Shown>({ value, text, previous: null, direction: 1, version: 0 });
  if (shown.text !== text) {
    setShown({
      value,
      text,
      previous: shown.text,
      direction: value < shown.value ? -1 : 1,
      version: shown.version + 1,
    });
  }

  const chars = [...text];
  const before = shown.previous === null ? null : [...shown.previous];

  return (
    <span {...rest} ref={ref} data-slot="count" className={cn("inline-flex tabular-nums", className)}>
      {chars.map((char, index) => {
        // Places from the right: the units are place 0 in every value.
        const place = chars.length - 1 - index;
        const old = before ? before[before.length - 1 - place] : char;
        const changed = before !== null && old !== char;
        return (
          // The place keeps its element; the character and its ghost are
          // siblings in one grid cell, so the ghost neither inherits the
          // arriving character's opacity nor moves with it.
          <span key={place} data-slot="count-place" className="inline-grid">
            <span
              // A changed character gets a new key and remounts, which is
              // what lets `starting:` give it a "before"; an unchanged one
              // keeps its element and does not move.
              key={char}
              data-slot="count-char"
              className={cn(
                "col-start-1 row-start-1 whitespace-pre",
                before !== null && [
                  "transition-[opacity,translate] duration-(--ui-duration-base) ease-(--ui-ease-out)",
                  "starting:opacity-0",
                  shown.direction === 1
                    ? "starting:translate-y-[calc(var(--ui-space-xs)*var(--ui-motion-travel))]"
                    : "starting:-translate-y-[calc(var(--ui-space-xs)*var(--ui-motion-travel))]",
                ],
              )}
            >
              {char}
            </span>
            {changed && old !== undefined && (
              <span
                key={`ghost-${shown.version}`}
                aria-hidden="true"
                data-slot="count-ghost"
                data-char={old}
                className={cn(
                  "pointer-events-none col-start-1 row-start-1 whitespace-pre opacity-0",
                  "before:content-[attr(data-char)]",
                  "transition-opacity duration-(--ui-duration-fast) ease-(--ui-ease-out) starting:opacity-100",
                )}
              />
            )}
          </span>
        );
      })}
    </span>
  );
});
