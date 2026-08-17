// Types for geometry-laws.mjs.
//
// The implementation stays plain `.mjs` because every gate in this repo must
// run in a cold clone with no `node_modules` and no build step. The render-side
// half of design validation is TypeScript, though, and imports the same module
// — so the shapes are declared here rather than the module being duplicated in
// a language each side prefers. One implementation, two callers.

export type Side = "top" | "right" | "bottom" | "left";
export type Sides = Record<Side, number>;

export interface Figure {
  axis: "horizontal" | "vertical";
  container: {
    width: number;
    height: number;
    padding: Sides;
    border: Sides;
    radius?: number | null;
  };
  /** Flex gap between children, along the stacking axis. */
  gap?: number;
  children: Array<{ width: number; height: number; radius?: number | null }>;
  /** Container border box → the union of the children. */
  gaps: Sides;
}

export interface LawFailure {
  law: string;
  why: string;
  violations: string[];
}

export declare const SIDES: readonly Side[];
export declare const LAW_NAMES: readonly string[];
export declare const LAWS: Record<string, { why: string; check(figure: Figure, tolerance: number): string[] }>;

/** `3` and `{ top: 3, … }` both mean the same thing. */
export declare function sides(value: number | Partial<Sides> | null | undefined): Sides;

export declare function evaluate(figure: Figure, lawNames: readonly string[], tolerance?: number): LawFailure[];

export declare function formatFailures(label: string, failures: readonly LawFailure[]): string;
