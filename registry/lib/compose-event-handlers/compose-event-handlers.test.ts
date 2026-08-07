import assert from "node:assert/strict";
import test from "node:test";

import { composeEventHandlers } from "./compose-event-handlers.ts";

function event() {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

test("runs the consumer before the component behaviour", () => {
  const calls: string[] = [];
  const handler = composeEventHandlers(
    () => calls.push("consumer"),
    () => calls.push("internal"),
  );

  handler(event());
  assert.deepEqual(calls, ["consumer", "internal"]);
});

test("preventDefault opts out of optional component behaviour", () => {
  const calls: string[] = [];
  const handler = composeEventHandlers(
    (current) => {
      calls.push("consumer");
      current.preventDefault();
    },
    () => calls.push("internal"),
  );

  handler(event());
  assert.deepEqual(calls, ["consumer"]);
});
