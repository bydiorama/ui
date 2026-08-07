import test from "node:test";
import assert from "node:assert/strict";

import { entriesForItem, type LedgerEntry } from "./ledger-source.ts";

test("sorts by date ascending regardless of input order", () => {
  const entries: LedgerEntry[] = [
    { id: "c", date: "2026-07-03", item: "widget", kind: "fix", summary: "" },
    { id: "a", date: "2026-07-01", item: "widget", kind: "fix", summary: "" },
    { id: "b", date: "2026-07-02", item: "widget", kind: "fix", summary: "" },
  ];
  const result = entriesForItem(entries, "widget", "2026-01-01T00:00:00.000Z");
  assert.deepEqual(result.map((e) => e.id), ["a", "b", "c"]);
});

test("an entry dated exactly at the lock time is excluded, not included", () => {
  // Already known when the item was locked -- inclusive would double-report it.
  const entries: LedgerEntry[] = [{ id: "same-instant", date: "2026-06-01T00:00:00.000Z", item: "widget", kind: "fix", summary: "" }];
  const result = entriesForItem(entries, "widget", "2026-06-01T00:00:00.000Z");
  assert.deepEqual(result, []);
});
