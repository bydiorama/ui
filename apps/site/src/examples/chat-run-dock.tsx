import { useState } from "react";
import { ChatRunDock } from "@/ui/chat-run-dock";
import { Button } from "@/ui/button";

const runs = [
  {
    id: "draft",
    name: "Project draft",
    activity: "Checking the layout",
    elapsed: "12s",
    value: 2,
    max: 3,
  },
];
export function Example() {
  const [isRunning, setIsRunning] = useState(true);
  return (
    <div className="specimen-stack w-full">
      {isRunning ? (
        <ChatRunDock
          className="mx-0 w-full"
          aria-label="Active preview runs"
          runs={runs}
          onStopAction={() => setIsRunning(false)}
          stopLabel={(run) => `Stop ${run.name}`}
        />
      ) : (
        <>
          <p role="status">Run stopped</p>
          <Button variant="outline" onClick={() => setIsRunning(true)}>
            Restart preview
          </Button>
        </>
      )}
    </div>
  );
}
