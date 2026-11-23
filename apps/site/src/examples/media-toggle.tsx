import { useState } from "react";
import { MediaToggle } from "@/ui/media-toggle";

export function Example() {
  const [isPaused, setIsPaused] = useState(true);
  return (
    <div className="specimen-row">
      <MediaToggle
        isPaused={isPaused}
        onPausedChange={setIsPaused}
        playLabel="Play preview"
        pauseLabel="Pause preview"
      />
      <span role="status">
        {isPaused ? "Preview paused" : "Preview playing"}
      </span>
    </div>
  );
}
