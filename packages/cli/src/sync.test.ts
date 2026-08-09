import test from "node:test";
import assert from "node:assert/strict";

import { hashContent } from "./hash.ts";
import { diffItem } from "./sync.ts";
import type { LockedItem } from "./lockfile.ts";
import type { RegistrySource } from "./registry-source.ts";
import type { LedgerEntry } from "./ledger-source.ts";

const identity = (target: string) => target;

function fakeRegistry(files: Record<string, string> | null): RegistrySource {
  return async () => (files === null ? null : { name: "widget", files: Object.entries(files).map(([target, content]) => ({ target, content })) });
}

function fakeReader(installed: Record<string, string>) {
  return async (path: string) => (path in installed ? installed[path]! : null);
}

const V1 = "one";
const V2 = "two";

test("current: installed matches lock, registry has not moved", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": V1 }), identity, fakeRegistry({ "a.ts": V1 }), []);
  assert.equal(result.status, "current");
  assert.equal(result.files[0]!.modified, false);
  assert.equal(result.files[0]!.staleUpstream, false);
});

test("modified: the consumer's file no longer matches the lock, registry unchanged", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": "edited by hand" }), identity, fakeRegistry({ "a.ts": V1 }), []);
  assert.equal(result.status, "modified");
  assert.equal(result.files[0]!.modified, true);
  assert.equal(result.files[0]!.staleUpstream, false);
});

test("stale: the consumer's file is untouched, but the registry moved", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": V1 }), identity, fakeRegistry({ "a.ts": V2 }), []);
  assert.equal(result.status, "stale");
  assert.equal(result.files[0]!.modified, false);
  assert.equal(result.files[0]!.staleUpstream, true);
});

test("modified-and-stale: both moved, independently — this is the case a report without a hash would collapse into noise", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": "hand-edited" }), identity, fakeRegistry({ "a.ts": V2 }), []);
  assert.equal(result.status, "modified-and-stale");
});

test("a consumer edit that coincidentally matches the new upstream value reads as current, not modified", async () => {
  // The consumer independently arrived at exactly what upstream now ships --
  // there is nothing left to reconcile, regardless of how they got there.
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": V2 }), identity, fakeRegistry({ "a.ts": V2 }), []);
  assert.equal(result.status, "current");
  assert.equal(result.files[0]!.modified, false);
  assert.equal(result.files[0]!.staleUpstream, false);
});

test("forked: a declared fork is NOT reported as merely stale", async () => {
  // The case that shipped wrong. A fork matches its own lock hash by
  // construction, so `modified` is false and the only word left was `stale` —
  // the same word a clean install gets when the registry moves on. One reads
  // as "run the update", the other as "you will lose work". A consumer's
  // Badge fork was overwritten with every check green.
  const locked: LockedItem = {
    revision: "abc",
    lockedAt: "2026-01-01T00:00:00.000Z",
    files: { "a.ts": hashContent("my fork") },
    forked: { "a.ts": hashContent(V1) },
  };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": "my fork" }), identity, fakeRegistry({ "a.ts": V1 }), []);
  assert.equal(result.status, "forked");
  assert.equal(result.files[0]!.forked, true);
  assert.equal(result.files[0]!.modified, false);

  // Same inputs WITHOUT the flag: indistinguishable from upstream moving on,
  // which is exactly what the flag exists to separate.
  const unflagged: LockedItem = {
    revision: locked.revision,
    lockedAt: locked.lockedAt,
    files: locked.files,
  };
  const before = await diffItem("widget", unflagged, fakeReader({ "a.ts": "my fork" }), identity, fakeRegistry({ "a.ts": V1 }), []);
  assert.equal(before.status, "stale");
});

test("forked-and-stale: the fork stands and the registry has moved under it", async () => {
  const locked: LockedItem = {
    revision: "abc",
    lockedAt: "2026-01-01T00:00:00.000Z",
    files: { "a.ts": hashContent("my fork") },
    forked: { "a.ts": hashContent(V1) },
  };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": "my fork" }), identity, fakeRegistry({ "a.ts": V2 }), []);
  assert.equal(result.status, "forked-and-stale");
  assert.equal(result.files[0]!.forked, true);
});

test("a fork upstream has since ADOPTED stops being reported as one", async () => {
  // The flag is a claim about divergence, not a permanent label. Once the
  // registry ships what the consumer forked to, there is nothing to lose.
  const locked: LockedItem = {
    revision: "abc",
    lockedAt: "2026-01-01T00:00:00.000Z",
    files: { "a.ts": hashContent("my fork") },
    forked: { "a.ts": hashContent(V1) },
  };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": "my fork" }), identity, fakeRegistry({ "a.ts": "my fork" }), []);
  assert.equal(result.status, "current");
  assert.equal(result.files[0]!.forked, false);
});

test("a file deleted from disk is reported, not silently skipped", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({}), identity, fakeRegistry({ "a.ts": V1 }), []);
  assert.equal(result.files[0]!.installedHash, null);
  assert.equal(result.status, "modified"); // null !== lockedHash
});

test("missing-upstream: the item was removed from the registry entirely", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": V1 }), identity, fakeRegistry(null), []);
  assert.equal(result.status, "missing-upstream");
});

test("upstream adding a new file to the item is surfaced, not treated as drift on existing files", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-01-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const result = await diffItem(
    "widget", locked, fakeReader({ "a.ts": V1 }), identity, fakeRegistry({ "a.ts": V1, "b.ts": "new" }), [],
  );
  assert.equal(result.status, "current");
  assert.deepEqual(result.newUpstreamFiles, ["b.ts"]);
});

test("ledger entries are filtered to this item and to after the lock date", async () => {
  const locked: LockedItem = { revision: "abc", lockedAt: "2026-06-01T00:00:00.000Z", files: { "a.ts": hashContent(V1) } };
  const entries: LedgerEntry[] = [
    { id: "old-1", date: "2026-01-01", item: "widget", kind: "fix", summary: "before the lock, irrelevant" },
    { id: "new-1", date: "2026-07-01", item: "widget", kind: "breaking", summary: "after the lock, relevant" },
    { id: "new-2", date: "2026-07-02", item: "gadget", kind: "fix", summary: "different item, irrelevant" },
    { id: "new-3", date: "2026-07-03", item: "system", kind: "addition", summary: "affects widget via the affects list", affects: ["component:widget"] },
  ];
  const result = await diffItem("widget", locked, fakeReader({ "a.ts": V1 }), identity, fakeRegistry({ "a.ts": V1 }), entries);
  assert.deepEqual(result.ledgerEntries.map((e) => e.id), ["new-1", "new-3"]);
});
