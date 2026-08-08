import test from "node:test";
import assert from "node:assert/strict";

import { hashContent } from "./hash.ts";
import { lockItem } from "./lock.ts";
import type { RegistryItem } from "./registry-source.ts";

const identity = (target: string) => target;

const WIDGET: RegistryItem = {
  name: "widget",
  files: [
    { target: "a.ts", content: "content-a" },
    { target: "b.ts", content: "content-b" },
  ],
};

test("records the hash of what's actually installed, one entry per file", async () => {
  const reader = async (p: string) => ({ "a.ts": "content-a", "b.ts": "content-b" } as Record<string, string>)[p] ?? null;
  const { locked, divergesFromRegistry } = await lockItem(WIDGET, "sha1", "2026-01-01T00:00:00.000Z", reader, identity);
  assert.equal(locked.revision, "sha1");
  assert.equal(locked.files["a.ts"], hashContent("content-a"));
  assert.equal(locked.files["b.ts"], hashContent("content-b"));
  assert.deepEqual(divergesFromRegistry, []);
});

test("a file not present in this consumer is skipped, not locked as missing", async () => {
  const reader = async (p: string) => (p === "a.ts" ? "content-a" : null);
  const { locked } = await lockItem(WIDGET, "sha1", "2026-01-01T00:00:00.000Z", reader, identity);
  assert.deepEqual(Object.keys(locked.files), ["a.ts"]);
});

test("flags a file whose installed content already diverges from the registry, rather than baselining it silently", async () => {
  const reader = async (p: string) => ({ "a.ts": "hand-edited already", "b.ts": "content-b" } as Record<string, string>)[p] ?? null;
  const { divergesFromRegistry } = await lockItem(WIDGET, "sha1", "2026-01-01T00:00:00.000Z", reader, identity);
  assert.deepEqual(divergesFromRegistry, ["a.ts"]);
});
