import test from "node:test";
import assert from "node:assert/strict";

import { hashContent } from "./hash.ts";

test("hashes are prefixed sha256, matching ui.lock.schema.json's pattern", () => {
  assert.match(hashContent("hello"), /^sha256:[0-9a-f]{64}$/);
});

test("is deterministic", () => {
  assert.equal(hashContent("same content"), hashContent("same content"));
});

test("distinguishes different content", () => {
  assert.notEqual(hashContent("a"), hashContent("b"));
});
