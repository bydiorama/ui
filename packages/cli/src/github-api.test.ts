import test from "node:test";
import assert from "node:assert/strict";

import { GitHubApiError, githubApiHeaders, githubToken, isRateLimited, resolveRemoteRevision, USER_AGENT, type Fetch } from "./github-api.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const TOKEN = "ghp_test_token_never_printed_0000";

/** A fetch that answers every call with `respond()` and records what it was asked. */
function fakeFetch(respond: () => Response) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const doFetch: Fetch = async (url, init) => {
    calls.push({ url, headers: { ...(init?.headers as Record<string, string> | undefined) } });
    return respond();
  };
  return { doFetch, calls };
}

const rateLimitBody = JSON.stringify({
  message: "API rate limit exceeded for 203.0.113.7. (But here's the good news: Authenticated requests get a higher rate limit.)",
  documentation_url: "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting",
});

function rateLimited(status = 403, headers: Record<string, string> = { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1795437900" }) {
  return new Response(rateLimitBody, { status, statusText: "Forbidden", headers });
}

async function rejection(promise: Promise<unknown>): Promise<GitHubApiError> {
  try {
    await promise;
  } catch (err) {
    assert.ok(err instanceof GitHubApiError, `expected a GitHubApiError, got ${String(err)}`);
    return err;
  }
  assert.fail("expected the call to reject");
}

test("GITHUB_TOKEN wins over GH_TOKEN; blank values count as unset", () => {
  assert.deepEqual(githubToken({ GITHUB_TOKEN: "a", GH_TOKEN: "b" }), { token: "a", from: "GITHUB_TOKEN" });
  assert.deepEqual(githubToken({ GITHUB_TOKEN: "  ", GH_TOKEN: "b" }), { token: "b", from: "GH_TOKEN" });
  assert.equal(githubToken({ GITHUB_TOKEN: "", GH_TOKEN: undefined }), undefined);
  assert.equal(githubToken({}), undefined);
});

test("headers always carry a User-Agent, and Authorization only with a token", () => {
  assert.deepEqual(githubApiHeaders("application/vnd.github+json", {}), {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  });
  assert.equal(githubApiHeaders("x", { GH_TOKEN: TOKEN }).Authorization, `Bearer ${TOKEN}`);
});

test("a 403 is a rate limit only when GitHub says so", () => {
  const none = new Headers();
  assert.equal(isRateLimited(403, new Headers({ "x-ratelimit-remaining": "0" }), ""), true);
  assert.equal(isRateLimited(403, none, "You have exceeded a secondary rate limit."), true);
  assert.equal(isRateLimited(429, none, "API rate limit exceeded"), true);
  assert.equal(isRateLimited(403, new Headers({ "x-ratelimit-remaining": "41" }), '{"message":"Resource not accessible"}'), false);
  assert.equal(isRateLimited(404, new Headers({ "x-ratelimit-remaining": "0" }), "rate limit"), false);
});

test("resolveRemoteRevision sends the token and a User-Agent, and returns the sha", async () => {
  const { doFetch, calls } = fakeFetch(() => new Response(`${SHA}\n`, { status: 200 }));
  const sha = await resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: { GITHUB_TOKEN: TOKEN } });
  assert.equal(sha, SHA);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.github.com/repos/bydiorama/ui/commits/main");
  assert.equal(calls[0]!.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[0]!.headers["User-Agent"], USER_AGENT);
  assert.equal(calls[0]!.headers.Accept, "application/vnd.github.sha");
});

test("resolveRemoteRevision without a token sends no Authorization header", async () => {
  const { doFetch, calls } = fakeFetch(() => new Response(SHA, { status: 200 }));
  await resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: {} });
  assert.equal("Authorization" in calls[0]!.headers, false);
  assert.equal(calls[0]!.headers["User-Agent"], USER_AGENT);
});

test("an anonymous rate limit names the cause and both ways out", async () => {
  const { doFetch } = fakeFetch(() => rateLimited());
  const err = await rejection(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: {} }));
  assert.equal(err.status, 403);
  assert.equal(err.rateLimited, true);
  assert.match(err.message, /rate limit is exceeded \(403\)/);
  assert.match(err.message, /60 anonymous API calls an hour per IP address/);
  assert.match(err.message, /set GITHUB_TOKEN \(or GH_TOKEN\)/);
  assert.match(err.message, /pass --revision <sha>/);
  assert.match(err.message, /resets at \d\d:\d\d UTC/);
});

test("a 429 whose body says rate limit is treated the same, with no headers", async () => {
  const { doFetch } = fakeFetch(() => rateLimited(429, {}));
  const err = await rejection(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: {} }));
  assert.equal(err.rateLimited, true);
  assert.match(err.message, /set GITHUB_TOKEN/);
  assert.match(err.message, /--revision <sha>/);
  assert.doesNotMatch(err.message, /resets at/);
});

test("a rate limit with a token names the variable, never the token", async () => {
  const { doFetch } = fakeFetch(() => rateLimited());
  const err = await rejection(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: { GH_TOKEN: TOKEN } }));
  assert.match(err.message, /authenticated with GH_TOKEN/);
  assert.match(err.message, /--revision <sha>/);
  assert.equal(err.message.includes(TOKEN), false);
});

test("a rejected token says so without printing it", async () => {
  const { doFetch } = fakeFetch(
    () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401, statusText: "Unauthorized" }),
  );
  const err = await rejection(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: { GITHUB_TOKEN: TOKEN } }));
  assert.equal(err.rateLimited, false);
  assert.match(err.message, /rejected the token in GITHUB_TOKEN \(401\)/);
  assert.equal(err.message.includes(TOKEN), false);
});

test("a 403 that is not a rate limit is not called one, and shows GitHub's reason", async () => {
  const { doFetch } = fakeFetch(
    () =>
      new Response(JSON.stringify({ message: "Request forbidden by administrative rules." }), {
        status: 403,
        statusText: "Forbidden",
        headers: { "x-ratelimit-remaining": "57" },
      }),
  );
  const err = await rejection(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: {} }));
  assert.equal(err.rateLimited, false);
  assert.doesNotMatch(err.message, /rate limit/);
  assert.match(err.message, /403 Forbidden \(GitHub says: Request forbidden by administrative rules\)\./);
  assert.match(err.message, /--revision <sha>/);
});

test("a 200 that is not a sha is refused rather than locked", async () => {
  const { doFetch } = fakeFetch(() => new Response("<html>captive portal</html>", { status: 200 }));
  await assert.rejects(resolveRemoteRevision("bydiorama", "ui", "main", { fetch: doFetch, env: {} }), /not a commit sha/);
});
