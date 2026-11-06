import test from "node:test";
import assert from "node:assert/strict";

import { EFFECTS, fx, sweep, type FxSpec } from "./fx.ts";

test("fx() names one class per effect, in the order given", () => {
  assert.equal(fx("glass", "edge", "grain"), "fx-glass fx-edge fx-grain");
  assert.equal(fx(), "");
});

test("every effect says what it is for and where it applies", () => {
  for (const [name, spec] of Object.entries(EFFECTS) as Array<[string, FxSpec]>) {
    assert.ok(spec.job.length > 20, `${name}: a job is the question to ask before reaching for it`);
    assert.ok(spec.on.length > 0, `${name}: an effect that applies nowhere does nothing`);
    assert.ok(spec.kind === "shader" ? spec.sheet === "shader" : spec.sheet !== "shader", `${name}: sheet and kind disagree`);
  }
});

test("sweep() is a no-op where there is no window — server rendering imports this file", () => {
  assert.doesNotThrow(() => sweep({} as HTMLElement));
});
