import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Count } from "@/ui/count";
import { slideRadioSelection } from "../lib/site-motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { fx } from "@/lib/fx";
import { setAppearance } from "../lib/appearance";
import { useAppearance } from "../lib/use-appearance";
import { looks } from "./LookDock";

type Offset = { x: number; y: number };
const INTERACTIVE = "button, input, label, a, [role='slider'], [data-slot='slider']";

/**
 * Five live components on five cards, fanned. A card is picked up anywhere
 * that is not a control, and stays where it is dropped; the one in hand
 * comes to the top. The controls on them are the real ones.
 */
function FanCard({ index, title, tone, children }: { index: number; title: string; tone?: "inverse" | "glass"; children: ReactNode }) {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [layer, setLayer] = useState(0);
  const start = useRef<{ pointer: Offset; offset: Offset } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest(INTERACTIVE)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { pointer: { x: event.clientX, y: event.clientY }, offset };
    setIsDragging(true);
    setLayer(Date.now() % 100000);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!start.current) return;
    setOffset({ x: start.current.offset.x + event.clientX - start.current.pointer.x, y: start.current.offset.y + event.clientY - start.current.pointer.y });
  };
  const onPointerUp = () => { start.current = null; setIsDragging(false); };

  return (
    <section
      className="fan-card"
      data-index={index}
      data-tone={tone}
      data-dragging={isDragging ? "" : undefined}
      aria-label={title}
      style={{ "--fan-x": `${offset.x}px`, "--fan-y": `${offset.y}px`, zIndex: layer || undefined } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {tone === "glass"
        // The library's own Card with the glass finish, so the cards it is
        // dropped over read through it, blurred. The section stays the
        // draggable frame; the Card is its face.
        ? <Card className={`fan-card-face ${fx("glass", "edge")}`}><h3 className="fan-card-title">{title}</h3><div className="fan-card-body">{children}</div></Card>
        : <><h3 className="fan-card-title">{title}</h3><div className="fan-card-body">{children}</div></>}
    </section>
  );
}

export function CardFan() {
  const appearance = useAppearance();
  const [presses, setPresses] = useState(12);
  const [level, setLevel] = useState(64);
  return (
    <div className="card-fan" data-dock-end>
      <FanCard index={0} title="Switch">
        <Switch isLabelHidden defaultIsChecked className={`fan-switch ${appearance.effects === "on" ? fx("glow") : ""}`}>Try the switch</Switch>
      </FanCard>
      <FanCard index={1} title="Slider">
        <div className="fan-value" aria-hidden="true"><Count value={level} locale="en" /></div>
        <Slider label="Level" isLabelHidden size="sm" value={level} onValueChange={setLevel} className={appearance.effects === "on" ? fx("sheen") : ""} />
      </FanCard>
      <FanCard index={2} title="Button" tone="inverse">
        <p className="fan-count" aria-live="polite">Pressed <Count value={presses} locale="en" /> times</p>
        <Button variant="inverse" size="lg" isFullWidth className={appearance.effects === "on" ? fx("sheen", "grain") : undefined} onClick={() => setPresses(count => count + 1)}>Press me</Button>
      </FanCard>
      <FanCard index={3} title="Badge">
        <div className="fan-badges">
          <Badge variant="success" shape="full">Active</Badge>
          <Badge variant="warning" shape="full">Pending</Badge>
          <Badge variant="danger" shape="full">Blocked</Badge>
          <Badge variant="selected" shape="full">Selected</Badge>
        </div>
      </FanCard>
      <FanCard index={4} title="Look" tone="glass">
        <div className="fan-looks" role="radiogroup" aria-label="Look">
          {looks.map(look => (
            <label key={look.value} className="fan-look" data-site-brand={look.value} data-selected={appearance.brand === look.value ? "" : undefined}>
              <input type="radio" name="fan-look" value={look.value} checked={appearance.brand === look.value} onChange={event => {
                slideRadioSelection(event.currentTarget);
                setAppearance("brand", look.value);
              }} />
              <span className="selection-fill" aria-hidden="true" />
              <span className="sr-only">{look.label}</span>
            </label>
          ))}
        </div>
      </FanCard>
    </div>
  );
}
