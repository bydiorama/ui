import type { ReactNode } from "react";

import { Chart, type ChartProps } from "@/ui/chart";
import { StatFigure, type StatDeltaProps } from "@/components/blocks/stat-tiles";

/*
 * ChartCard — a Chart whose head answers "how much, and is that good" before
 * the plot is read (Stat tiles and Chart card sheet). Below the head it IS
 * the Chart: legend, plot, axes, tooltip, keyboard and table, untouched.
 */

interface ChartCardOwnProps {
  /** The headline figure, formatted by the caller ("2,370"): usually the
   *  plot's total or latest value. The card does not compute it. */
  value: string;
  /** The figure's change and what it is against — StatTiles' own change line. */
  delta?: StatDeltaProps;
  /**
   * The marks. Default: one fading area, `<Chart.Areas wash="fade" />`, as
   * the sheet draws the card. Any `Chart.*` mark goes in.
   */
  children?: ReactNode;
}

export type ChartCardProps<Row> = ChartCardOwnProps & Omit<ChartProps<Row>, "children" | "headline" | keyof ChartCardOwnProps>;

/**
 * The Chart frame with the stat tile's figure and change under its title.
 * The figure takes the description's printed place; the description is still
 * required and stays the chart's accessible description (decided 2026-11-11).
 */
export function ChartCard<Row>({ value, delta, children, ...props }: ChartCardProps<Row>) {
  return (
    <Chart {...(props as ChartProps<Row>)} data-block="chart-card" headline={<StatFigure value={value} isLoading={props.isLoading ?? false} {...(delta ? { delta } : {})} />}>
      {children ?? <Chart.Areas wash="fade" />}
    </Chart>
  );
}
