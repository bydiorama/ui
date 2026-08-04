import { expect, test } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { Multiselect } from "./multiselect.tsx";
import { Input } from "@/ui/input/input.tsx";

test("probe border widths", () => {
  const c = document.createElement("div");
  document.body.appendChild(c);
  act(() => { createRoot(c).render(<><Multiselect label="S" items={[{value:"a",label:"A"}]} /><Input label="L" /></>); });
  const t = document.querySelector('[data-slot="multiselect-trigger"]')!;
  const i = document.querySelector('[data-slot="control"]')!;
  console.log("TRIGGER class:", t.className);
  console.log("TRIGGER borderTopWidth:", getComputedStyle(t).borderTopWidth);
  console.log("INPUT   class:", i.className);
  console.log("INPUT   borderTopWidth:", getComputedStyle(i).borderTopWidth);
  expect(true).toBe(true);
});
