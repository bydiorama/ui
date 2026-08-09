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
  const { locked, divergesFromRegistry } = await lockItem(WIDGET, "sha1", "2026-01-01T00:00:00.000Z", reader, identity);
  assert.deepEqual(divergesFromRegistry, ["a.ts"]);
  // And WRITES it down. Returning the divergence let `lock` print a warning
  // to a terminal, while the lockfile recorded the fork's own hash — so from
  // the next command onward the fork was indistinguishable from a clean
  // install and `sync` called it "stale". A warning nobody can re-read is not
  // a record.
  // Mapped to what the REGISTRY shipped, not just named: `files["a.ts"]` is
  // the fork, so it cannot answer "has the thing I forked changed since?".
  assert.deepEqual(locked.forked, { "a.ts": hashContent("content-a") });
  assert.equal(locked.files["a.ts"], hashContent("hand-edited already"));
});

test("a clean lock carries no `forked` key at all", async () => {
  const reader = async (p: string) => ({ "a.ts": "content-a", "b.ts": "content-b" } as Record<string, string>)[p] ?? null;
  const { locked } = await lockItem(WIDGET, "sha1", "2026-01-01T00:00:00.000Z", reader, identity);
  // Absent rather than `[]`, so a lockfile with no forks reads exactly as it
  // did before this existed — and `"forked" in item` is a usable question.
  assert.equal("forked" in locked, false);
});
