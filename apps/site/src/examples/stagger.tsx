import { useState } from "react";
import { Stagger } from "@/ui/stagger";
import { Button } from "@/ui/button";

const STEPS = ["Set the grid", "Choose a palette", "Pick the type", "Draw the components", "Write the guidelines"];

export function Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-md">
      <ul key={run} className="flex w-72 flex-col gap-xs">
        <Stagger>
          {STEPS.map((step) => (
            <li key={step} className="rounded-md border border-edge-subtle bg-surface px-md py-sm text-label-md text-ink-primary">
              {step}
            </li>
          ))}
        </Stagger>
      </ul>
      <Button size="sm" variant="secondary" onClick={() => setRun((r) => r + 1)}>
        Replay
      </Button>
    </div>
  );
}
