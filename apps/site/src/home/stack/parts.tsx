import { Fragment, type CSSProperties, type ReactNode } from "react";

/** A theme role as a CSS value. Every fill and stroke in the drawing is one. */
export const role = (name: string) => `var(--ui-${name})`;

const round = (value: number) => Math.round(value * 100) / 100;

/** A part's outline, drawn once per extruded copy with that copy's fill. */
export type Shape = ((className: string, fill: string) => ReactNode) & { posts?: [number, number][] };

/** A rounded rectangle on the plate's plane. Square-cornered ones get a post
 *  up each visible corner; `extra` names a class that restyles the corners. */
export function rect(left: number, top: number, width: number, height: number, rx = 1.5, extra = ""): Shape {
  const x = round(left);
  const y = round(top);
  const shape: Shape = (className, fill) => <rect className={`${className}${extra}`.trim() || undefined} x={x} y={y} width={width} height={height} rx={rx} style={{ fill }} />;
  shape.posts = rx <= 3 && !extra ? [[round(x + width), round(y + height)], [round(x + width), y], [x, round(y + height)]] : [];
  return shape;
}
export function disc(cx: number, cy: number, r: number): Shape {
  return (className, fill) => <circle className={className || undefined} cx={cx} cy={cy} r={r} style={{ fill }} />;
}

const lift = (n: number) => ({ "--n": n }) as CSSProperties;

interface SolidProps {
  /** Extruded height, in units. */
  h: number;
  /** Height it stands on, when it sits on another part. */
  base?: number;
  fill?: string;
  wall?: string;
  /** The part shows a role's own colour, so its wall is that colour, darker. */
  isInk?: boolean;
  shape: Shape;
  /** Drawn on the top face. */
  children?: ReactNode;
}

/**
 * A solid part: a top face, a wall in a flat tint and a hairline on every
 * edge (the outline of its foot, its top, and a post up each visible corner).
 * The wall is the outline repeated once per unit of height; each copy is
 * lifted by the stylesheet, so a part stands up only on the current plate.
 */
export function Solid({ h, base = 0, fill = "bg-surface", wall = "bg-sunken", isInk = false, shape, children }: SolidProps) {
  const side = !isInk ? role(wall) : fill === "bg-accent" ? role("bg-accent-active") : `color-mix(in oklab, ${role(fill)}, ${role("border-strong")} 34%)`;
  return <>
    {Array.from({ length: h }, (_, n) => <g key={n} className="stack-lift" style={lift(base + n)}>{shape(n === 0 ? "stack-edge" : "", side)}</g>)}
    {shape.posts && shape.posts.length > 0 && (
      <g className="stack-lift" style={lift(base)}>
        {shape.posts.map(([x, y]) => <path key={`${x} ${y}`} className="stack-post" d="M0 0H1" style={{ "--x": `${x}px`, "--y": `${y}px`, "--h": h } as CSSProperties} />)}
      </g>
    )}
    <g className="stack-lift" style={lift(base + h)}>{shape("stack-edge", role(fill))}{children}</g>
  </>;
}

/** Painter's order: whatever sits nearer the front corner is drawn later. */
export function inOrder(items: [depth: number, node: ReactNode][]) {
  return items.map((item, index) => [...item, index] as const).sort((a, b) => a[0] - b[0] || a[2] - b[2]).map(([, node, index]) => <Fragment key={index}>{node}</Fragment>);
}

export function Label({ x, y, size, weight, fill, anchor = "start", isNumeric = false, children }: { x: number; y: number; size: number; weight: number; fill: string; anchor?: "start" | "middle"; isNumeric?: boolean; children: string }) {
  return <text className={isNumeric ? "stack-num" : undefined} x={x} y={y} fontSize={size} fontWeight={weight} textAnchor={anchor} style={{ fill: role(fill) }}>{children}</text>;
}

/** A placeholder line of text. */
export function Bar({ x, y, length, stroke = "border-default" }: { x: number; y: number; length: number; stroke?: string }) {
  return <path d={`M${x} ${y}h${length}`} strokeWidth={3} strokeLinecap="round" style={{ stroke: role(stroke) }} />;
}
