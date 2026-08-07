import { test } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
test("max-h-64 alive?", () => {
  const el = document.createElement("div");
  el.className = "max-h-64 max-w-md w-full";
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(null));
  const cs = getComputedStyle(el);
  console.log("PROBE_MAXH", JSON.stringify({ maxHeight: cs.maxHeight, maxWidth: cs.maxWidth }));
});
