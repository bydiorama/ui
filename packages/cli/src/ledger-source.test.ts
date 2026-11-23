import test from "node:test";
import assert from "node:assert/strict";

import { entriesForItem, remoteLedgerSource, type LedgerEntry } from "./ledger-source.ts";
import { USER_AGENT, type Fetch } from "./github-api.ts";

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

test("remoteLedgerSource authenticates the listing, and not the raw file fetches", async () => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const doFetch: Fetch = async (url, init) => {
    calls.push({ url, headers: { ...(init?.headers as Record<string, string> | undefined) } });
    if (url.startsWith("https://api.github.com/")) {
      return Response.json([
        { name: "2026-11-01-a.json", download_url: "https://raw.githubusercontent.com/bydiorama/ui/main/ledger/entries/2026-11-01-a.json" },
        { name: "README.md", download_url: "https://raw.githubusercontent.com/bydiorama/ui/main/ledger/entries/README.md" },
      ]);
    }
    return Response.json({ id: "a", date: "2026-11-01", item: "button", kind: "fix", summary: "" });
  };

  const entries = await remoteLedgerSource("bydiorama", "ui", "main", { fetch: doFetch, env: { GITHUB_TOKEN: "t0ken" } })();
  assert.deepEqual(entries.map((e) => e.id), ["a"]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]!.url, "https://api.github.com/repos/bydiorama/ui/contents/ledger/entries?ref=main");
  assert.equal(calls[0]!.headers.Authorization, "Bearer t0ken");
  assert.equal(calls[0]!.headers["User-Agent"], USER_AGENT);
  assert.equal("Authorization" in calls[1]!.headers, false);
});

test("remoteLedgerSource explains a rate-limited listing with both ways out", async () => {
  const doFetch: Fetch = async () =>
    new Response('{"message":"API rate limit exceeded for 203.0.113.7."}', {
      status: 403,
      statusText: "Forbidden",
      headers: { "x-ratelimit-remaining": "0" },
    });
  await assert.rejects(remoteLedgerSource("bydiorama", "ui", "main", { fetch: doFetch, env: {} })(), (err: Error) => {
    assert.match(err.message, /^Listing ledger entries failed: the GitHub API rate limit is exceeded \(403\)/);
    assert.match(err.message, /set GITHUB_TOKEN \(or GH_TOKEN\)/);
    assert.match(err.message, /--registry-path <checkout>/);
    return true;
  });
});
