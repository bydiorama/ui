import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { LineChart } from "@/ui/chart";
import { StatusMatrix, type StatusMatrixStatus } from "@/ui/status-matrix";
import { fx, sweep, type FxName } from "@/lib/fx";

const finishes = ["glass", "grain", "sheen", "glow", "shimmer", "ink"] as const satisfies readonly FxName[];
type Finish = (typeof finishes)[number];
const label = (name: string) => name[0]!.toUpperCase() + name.slice(1);

/**
 * Six finishes, one class each. The pane is always glass, because that is
 * what the tile is drawn as; picking another finish puts it where it
 * belongs: grain on the pane, sheen and glow on the chosen chip, shimmer and
 * ink on the line of code.
 */
export function EffectsTile() {
  const [finish, setFinish] = useState<Finish>("glass");
  const chips = useRef<Partial<Record<Finish, HTMLElement | null>>>({});
  const choose = (next: Finish) => {
    setFinish(next);
    if (next === "sheen") requestAnimationFrame(() => { const chip = chips.current.sheen; if (chip) sweep(chip); });
  };
  return (
    <Card className={`effects-pane ${fx(...(finish === "grain" ? ["glass", "grain"] as const : ["glass"] as const))}`}>
      <code className={`effects-code ${finish === "shimmer" ? fx("shimmer") : finish === "ink" ? fx("ink") : ""}`}>className=&#123;fx("{finish}")&#125;</code>
      <div className="effects-chips" role="group" aria-label="Finish">
        {finishes.map(name => (
          <Button
            key={name}
            ref={element => { chips.current[name] = element; }}
            size="sm"
            shape="full"
            variant={finish === name ? "primary" : "secondary"}
            aria-pressed={finish === name}
            className={finish === name && (name === "sheen" || name === "glow") ? fx(name) : undefined}
            onClick={() => choose(name)}
          >{label(name)}</Button>
        ))}
      </div>
    </Card>
  );
}

const looks = ["wash", "sweep", "fold", "rise", "dawn"] as const;
type Look = (typeof looks)[number];

/**
 * The five looks of the gradient ground it sits on. The ground is static
 * HTML that the shader runtime owns (a hydrated island would fight it for
 * the canvas), so the picker writes the look onto it as a custom property
 * and the same canvas redraws; nothing is remounted.
 */
export function GradientPicker() {
  const [look, setLook] = useState<Look>("sweep");
  const picker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    picker.current?.closest<HTMLElement>(".fx-gradient")?.style.setProperty("--ui-fx-gradient-look", look);
  }, [look]);
  return (
    <div ref={picker} className="look-picker" role="radiogroup" aria-label="Gradient look">
      {looks.map(name => (
        <label key={name} className="look-picker-option" data-look={name} data-selected={look === name ? "" : undefined}>
          <input type="radio" name="gradient-look" value={name} checked={look === name} onChange={() => setLook(name)} />
          <span className="look-picker-swatch" aria-hidden="true" />
          <span className="sr-only">{label(name)}</span>
        </label>
      ))}
    </div>
  );
}

/** One week of reviews: approved overtakes opened on Friday. */
const week = [
  { day: "Mon", opened: 14, approved: 8 },
  { day: "Tue", opened: 18, approved: 12 },
  { day: "Wed", opened: 16, approved: 14 },
  { day: "Thu", opened: 20, approved: 18 },
  { day: "Fri", opened: 24, approved: 30 },
  { day: "Sat", opened: 26, approved: 34 },
  { day: "Sun", opened: 30, approved: 44 },
];

/**
 * The library's own line chart in its plain variant: the plot alone on the
 * tile's ground. The caption below already says what it is, so the chart
 * prints no title, legend or axes, but a screen reader still gets its name,
 * its takeaway and the table.
 */
export function ChartTile() {
  return (
    <LineChart
      variant="plain"
      className="chart-tile"
      label="Reviews this week"
      description="Approved reviews overtook opened ones on Friday and kept rising."
      data={week}
      x="day"
      xLabel="Day"
      series={[{ key: "approved", label: "Approved" }, { key: "opened", label: "Opened" }]}
    />
  );
}

const marks = ["typing", "thinking", "working", "streaming", "progress"] as const satisfies readonly StatusMatrixStatus[];

/** Each mark holds still until it is hovered or focused, so the row is not
 *  five clocks running at once. */
export function StatusMarksTile() {
  const [playing, setPlaying] = useState<string | null>(null);
  // Progress has no loop of its own: its value IS the animation. While it
  // plays, the value runs from empty to full, rests full, and starts again,
  // so the whole fill is seen. At rest it shows a part-filled meter.
  const [progress, setProgress] = useState(62);
  useEffect(() => {
    if (playing !== "progress") { setProgress(62); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setProgress(100); return; }
    let value = 0;
    setProgress(0);
    const timer = window.setInterval(() => {
      value = value >= 130 ? 0 : value + 4; // 100…130 is the rest at full
      setProgress(Math.min(100, value));
    }, 70);
    return () => window.clearInterval(timer);
  }, [playing]);
  return (
    <ul className="status-marks" aria-label="Status marks">
      {marks.map(status => (
        <li key={status}>
          <button
            type="button"
            className="status-mark"
            aria-pressed={playing === status}
            onPointerEnter={() => setPlaying(status)}
            onPointerLeave={() => setPlaying(current => current === status ? null : current)}
            onFocus={() => setPlaying(status)}
            onBlur={() => setPlaying(current => current === status ? null : current)}
          >
            {status === "progress"
              ? <StatusMatrix status="progress" value={progress} size="md" isHeld={playing !== status} label={label(status)} />
              : <StatusMatrix status={status} size="md" isHeld={playing !== status} label={label(status)} />}
            <span>{label(status)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
