import { useState } from "react";
import { Presence } from "@/ui/presence";
import { Button } from "@/ui/button";

const TASKS = ["Pick a typeface", "Set the grid", "Choose a palette", "Draw the icons", "Write the copy"];

export function Example() {
  const [tasks, setTasks] = useState(TASKS.slice(0, 3));
  const next = TASKS.find((task) => !tasks.includes(task));

  return (
    <div className="flex w-full max-w-sm flex-col gap-md">
      <ul className="flex flex-col rounded-md border border-edge-subtle bg-surface">
        <Presence kind="collapse">
          {tasks.map((task) => (
            <li key={task} className="flex items-center justify-between gap-md border-b border-edge-subtle px-md py-sm last:border-b-0">
              <span className="text-label-md text-ink-primary">{task}</span>
              <Button size="sm" variant="ghost" onClick={() => setTasks((all) => all.filter((t) => t !== task))}>
                Done
              </Button>
            </li>
          ))}
        </Presence>
      </ul>
      <div>
        <Button size="sm" variant="secondary" isDisabled={!next} onClick={() => next && setTasks((all) => [...all, next])}>
          Add a task
        </Button>
      </div>
    </div>
  );
}
