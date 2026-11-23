import { useState } from "react";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { DotPattern } from "@/ui/dot-pattern";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { fx } from "@/lib/fx";
import { useAppearance } from "../lib/use-appearance";

/** One form, rendered twice under two brand seeds. Nothing in it names a
 *  colour, a radius or a shape: Hockney's capsule controls and Graphite's
 *  flat corners both come from the scope it sits in. */
function PublishCard({ brand, name }: { brand: string; name: string }) {
  const [value, setValue] = useState(name);
  const [isNotifying, setIsNotifying] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const { effects } = useAppearance();
  return (
    <Card className={effects === "on" ? `theme-pair-card ${fx("glass")}` : "theme-pair-card"}>
      <div className="theme-pair-head">
        <span>Publish theme</span>
        <Badge variant="selected" size="sm">{isPublished ? "Live" : "Draft"}</Badge>
      </div>
      <Input label="Reviewer" isLabelHidden size="lg" value={value} onChange={event => setValue(event.target.value)} />
      <Switch labelPlacement="start" isChecked={isNotifying} onCheckedChange={setIsNotifying} className="theme-pair-switch">Notify reviewers</Switch>
      <div className="theme-pair-actions">
        <Button variant="secondary" onClick={() => { setIsPublished(false); setValue(name); }}>Cancel</Button>
        <Button onClick={() => setIsPublished(true)} aria-describedby={`${brand}-publish-state`}>Publish</Button>
      </div>
      <span id={`${brand}-publish-state`} className="sr-only" role="status">{isPublished ? `${brand} theme published` : ""}</span>
    </Card>
  );
}

export function ThemePair() {
  const { effects } = useAppearance();
  return (
    <div className="theme-pair">
      <div className={effects === "on" ? `theme-pair-well theme-pair-well-dots ${fx("grain")}` : "theme-pair-well theme-pair-well-dots"} data-site-brand="hockney">
        <DotPattern />
        <PublishCard brand="Hockney" name="Cipe Pineles" />
      </div>
      <div className={effects === "on" ? `theme-pair-well theme-pair-well-wash ${fx("grain")}` : "theme-pair-well theme-pair-well-wash"} data-site-brand="graphite">
        <PublishCard brand="Graphite" name="Karl Gerstner" />
      </div>
    </div>
  );
}
