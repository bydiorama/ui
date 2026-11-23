import { useState } from "react";
import { Fade } from "@/ui/fade";

export function Example() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-surface">
      <div
        ref={setContainer}
        tabIndex={0}
        role="region"
        aria-label="Scrollable project notes"
        className="h-36 overflow-y-auto p-lg"
      >
        <div className="flex flex-col gap-lg">
          <p>Start with the content.</p>
          <p>Give each element room to breathe.</p>
          <p>Use contrast to show what matters.</p>
          <p>Keep related things together.</p>
          <p>Let the layout follow the work.</p>
        </div>
      </div>
      <Fade side="top" ground="surface" scrollContainer={container} />
      <Fade side="bottom" ground="surface" scrollContainer={container} />
    </div>
  );
}
