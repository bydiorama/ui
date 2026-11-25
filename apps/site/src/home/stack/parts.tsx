import { Fragment, type CSSProperties, type ReactNode } from "react";

/** A theme role as a CSS value. Every fill and stroke in the drawing is one. */
export const role = (name: string) => `var(--ui-${name})`;

const round = (value: number) => Math.round(value * 100) / 100;

/** A part's fill, set as a custom property the stylesheet paints with: a
 *  neutral part is repainted as the shaded surface, an inked one keeps it. */
export const paint = (fill: string) => ({ "--f": fill }) as CSSProperties;

/** A part's outline, drawn with its fill. */
export type Shape = (className: string, fill: string) => ReactNode;

/** A rounded rectangle on the plate's plane; `extra` names a class that
 *  restyles the corners. */
export function rect(left: number, top: number, width: number, height: number, rx = 1.5, extra = ""): Shape {
  return (className, fill) => <rect className={`stack-f ${className}${extra}`.trim()} x={round(left)} y={round(top)} width={width} height={height} rx={rx} style={paint(fill)} />;
}
export function disc(cx: number, cy: number, r: number): Shape {
  return (className, fill) => <circle className={`stack-f ${className}`.trim()} cx={cx} cy={cy} r={r} style={paint(fill)} />;
}

interface PartProps {
  fill?: string;
  /** The part shows a role's own colour, so it keeps that fill. A neutral
   *  part is drawn as the softly shaded surface instead. */
  isInk?: boolean;
  shape: Shape;
  /** Drawn on the part. */
  children?: ReactNode;
}

/** A flat part: its outline with a hairline edge, and whatever sits on it. */
export function Part({ fill = "bg-surface", isInk = false, shape, children }: PartProps) {
  return <g className="stack-part" data-ink={isInk ? "" : undefined}>{shape("stack-edge", role(fill))}{children}</g>;
}

/** Painter's order: whatever sits nearer the front corner is drawn later. */
export function inOrder(items: [depth: number, node: ReactNode][]) {
  return items.map((item, index) => [...item, index] as const).sort((a, b) => a[0] - b[0] || a[2] - b[2]).map(([, node, index]) => <Fragment key={index}>{node}</Fragment>);
}

export function Label({ x, y, size, weight, fill, anchor = "start", isNumeric = false, children }: { x: number; y: number; size: number; weight: number; fill: string; anchor?: "start" | "middle"; isNumeric?: boolean; children: string }) {
  return <text className={isNumeric ? "stack-num" : undefined} x={x} y={y} fontSize={size} fontWeight={weight} textAnchor={anchor} style={{ fill: role(fill) }}>{children}</text>;
}
