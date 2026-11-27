"use client";

import { Children, cloneElement, isValidElement, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Presence } from "@/ui/presence";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * Stagger — a group arriving in order (ADR 0028 §6; the Stagger sheet).
 *
 * Presence with `appear`, plus a per-item delay: the items present on the
 * FIRST render arrive one `--ui-stagger-step` after another, in document
 * order. Reserved for infrequent moments (CONVENTIONS §8) — a first load, an
 * empty state filling, a success summary — never routine updates. Items
 * added later arrive through Presence at once; nothing waits on the group's
 * past.
 *
 * The delay is capped at the sixth item (decided 2026-11-27): everything
 * after it arrives with it, so a group of any length is in within
 * 5 × step + base. At Reduced and Off the step token is 0, so the group
 * arrives together with no code here.
 */
export interface StaggerProps extends OwnedSlot {
  /**
   * rise (default) — Presence's rise: opacity and a lift of `--ui-space-xs`
   * × `--ui-motion-travel`. fade — opacity only, for items that already sit
   * close together (avatars, chips).
   */
  kind?: "rise" | "fade" | undefined;
  /**
   * The items: elements, each with a stable `key`. Each item must forward
   * `className`, `style` and `data-*` to its root (CONVENTIONS §5), as for
   * Presence. Text and other non-element children are not rendered.
   */
  children?: ReactNode;
}

/** Items after this many arrive together with the last one. */
export const STAGGER_CAP = 6;

/**
 * The delay, only while the item is entering: once Presence settles it to
 * `present` the delay is gone, so a later hover, fade or exit on the item is
 * never held back. Written out in full so Tailwind compiles it.
 */
const DELAY = "data-[presence=entering]:[transition-delay:calc(var(--ui-stagger-index)*var(--ui-stagger-step))]";

interface StaggerItemProps {
  className?: string;
  style?: CSSProperties;
}

export function Stagger({ kind = "rise", children }: StaggerProps) {
  const items = Children.toArray(children).filter((child): child is ReactElement<StaggerItemProps> => isValidElement(child));

  // The group is the items of the first render, in order. Captured once: a
  // later render's new items are not part of it and arrive without delay.
  const [order] = useState(() => new Map(items.map((item, index) => [item.key, Math.min(index, STAGGER_CAP - 1)])));

  return (
    <Presence kind={kind} appear>
      {items.map((item) => {
        const index = order.get(item.key);
        if (index === undefined) return item;
        return cloneElement(item, {
          className: cn(item.props.className, DELAY),
          style: { ...item.props.style, "--ui-stagger-index": index } as CSSProperties,
        });
      })}
    </Presence>
  );
}
