"use client";

import { useEffect, useRef } from "react";

import type { NetworkRendererProps, NetworkSlot } from "@/ui/network";

/** The roles the canvas paints with, resolved through the cascade so a brand scope and dark mode both apply. */
const ROLES = {
  base: "var(--ui-bg-base)",
  elevated: "var(--ui-bg-elevated)",
  ink: "var(--ui-text-primary)",
  muted: "var(--ui-text-muted)",
  control: "var(--ui-border-control)",
  focus: "var(--ui-border-focus)",
  thick: "var(--ui-stroke-thick)",
  hairline: "var(--ui-stroke-hairline)",
  font: "var(--ui-font-body)",
} as const;

type Inks = Record<keyof typeof ROLES, string> & { wash: Record<NetworkSlot, string>; solid: Record<NetworkSlot, string> };

const SLOTS: NetworkSlot[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Custom properties come back from getComputedStyle as the authored text —
 * `light-dark(…)` unresolved — so each role is pushed through a real property
 * on the canvas element itself and read back as the colour the browser
 * actually uses.
 */
function resolveInks(el: HTMLElement): Inks {
  const before = el.style.cssText;
  const colour = (value: string) => {
    el.style.color = value;
    return getComputedStyle(el).color;
  };
  const length = (value: string) => {
    el.style.outlineWidth = value;
    el.style.outlineStyle = "solid";
    return getComputedStyle(el).outlineWidth;
  };
  const inks = {
    base: colour(ROLES.base),
    elevated: colour(ROLES.elevated),
    ink: colour(ROLES.ink),
    muted: colour(ROLES.muted),
    control: colour(ROLES.control),
    focus: colour(ROLES.focus),
    thick: length(ROLES.thick),
    hairline: length(ROLES.hairline),
    font: getComputedStyle(el).fontFamily,
    wash: Object.fromEntries(SLOTS.map((s) => [s, colour(`var(--ui-data-cat-${s}-bg)`)])) as Record<NetworkSlot, string>,
    solid: Object.fromEntries(SLOTS.map((s) => [s, colour(`var(--ui-data-cat-${s}-solid)`)])) as Record<NetworkSlot, string>,
  };
  el.style.cssText = before;
  return inks;
}

/**
 * Network's Canvas 2D tier for ~2k – ~20k elements (plan §3.2). One paint
 * surface instead of a DOM node per mark; pass it as `renderer` and Network
 * admits it above `canvasThreshold`. It only paints: the keyboard, the
 * announcer, hit-testing and the adjacency table stay with Network, and
 * Network shows that table instead of this canvas before hydration and in
 * forced colours, which a canvas cannot honour.
 *
 * Draws the SVG tier's marks — the edge paths are the same SVG path data,
 * through Path2D — at device-pixel resolution. Node glyphs and edge labels
 * are not drawn: at the densities this tier is for they are noise, and the
 * type and the relation still reach the reader through the announcer and
 * the table.
 */
export function NetworkCanvas({ nodes, edges, view, size }: NetworkRendererProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const inks = resolveInks(canvas);
    const px = (v: string) => Number.parseFloat(v) || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.x, dpr * view.y);
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";

    for (const e of edges) {
      if (!e.d) continue;
      ctx.globalAlpha = e.isDimmed ? 0.32 : 1;
      const path = new Path2D(e.d);
      if (e.isFocused) {
        ctx.strokeStyle = inks.focus;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke(path);
        ctx.lineCap = "butt";
      }
      ctx.strokeStyle = e.isActive ? inks.ink : e.isInferred ? inks.muted : inks.control;
      ctx.lineWidth = px(e.isInferred && !e.isActive ? inks.hairline : inks.thick);
      ctx.stroke(path);
      if (e.head) {
        ctx.fillStyle = e.isActive ? inks.ink : inks.control;
        ctx.fill(new Path2D(e.head));
      }
    }

    const tau = Math.PI * 2;
    for (const n of nodes) {
      ctx.globalAlpha = n.isDimmed ? 0.32 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 20, 0, tau);
      ctx.fillStyle = inks.base;
      ctx.fill();
      if (!n.isSelected && n.slot) {
        ctx.fillStyle = inks.wash[n.slot];
        ctx.fill();
      }
      ctx.beginPath();
      if (n.isSelected) {
        ctx.arc(n.x, n.y, 19, 0, tau);
        ctx.strokeStyle = inks.ink;
        ctx.lineWidth = 2;
      } else {
        ctx.arc(n.x, n.y, 19.25, 0, tau);
        ctx.strokeStyle = n.slot ? inks.solid[n.slot] : inks.control;
        ctx.lineWidth = px(inks.hairline);
      }
      ctx.stroke();
      if (n.isFocused) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 23, 0, tau);
        ctx.strokeStyle = inks.focus;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Labels only once they are legible: below half scale a name is a smudge.
    if (view.k >= 0.5) {
      ctx.font = `600 12px ${inks.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const n of nodes) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = n.isDimmed ? inks.muted : inks.ink;
        ctx.fillText(n.label, n.x, n.y + 28, 180);
      }
    }
    ctx.globalAlpha = 1;
  }, [nodes, edges, view, size]);

  return (
    <canvas
      ref={ref}
      data-slot="network-canvas"
      aria-hidden="true"
      style={{ width: size.width, height: size.height }}
      className="pointer-events-none absolute top-0 left-0 font-body"
    />
  );
}
