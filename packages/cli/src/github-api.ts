/**
 * The CLI's two calls to api.github.com — `add` asking for main's sha, `sync`
 * listing ledger/entries — go through here, so both authenticate the same
 * way and explain a refusal the same way.
 *
 * Anonymous API calls are limited to 60 an hour per IP address. On a shared
 * machine (a CI runner, a cloud session) other people's calls count against
 * the same address, so the CLI's first call can be the one that answers 403 —
 * while `curl` to raw.githubusercontent.com from the same machine works,
 * because that host is not the API. With GITHUB_TOKEN (or GH_TOKEN) set, the
 * request is authenticated and gets the token's own limit (5,000 an hour).
 *
 * The token is only ever put in the Authorization header. Messages name the
 * variable it came from, never its value.
 */

/** GitHub rejects API requests without a User-Agent. Generic on purpose: it
 *  identifies the client, not the person running it. */
export const USER_AGENT = "bydiorama-ui-cli";

export type Env = Record<string, string | undefined>;
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Injection points for tests; both default to the real thing. */
export interface GitHubApiOptions {
  fetch?: Fetch;
  env?: Env;
}

export const TOKEN_VARIABLES = ["GITHUB_TOKEN", "GH_TOKEN"] as const;
export type TokenVariable = (typeof TOKEN_VARIABLES)[number];

/** The first of GITHUB_TOKEN, GH_TOKEN that is set and not blank. */
export function githubToken(env: Env = process.env): { token: string; from: TokenVariable } | undefined {
  for (const from of TOKEN_VARIABLES) {
    const token = env[from]?.trim();
    if (token) return { token, from };
  }
  return undefined;
}

export function githubApiHeaders(accept: string, env: Env = process.env): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept, "User-Agent": USER_AGENT };
  const auth = githubToken(env);
  if (auth) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
}

/**
 * A 403 is not always a rate limit — a blocked request or a token without
 * access answers 403 too — so it counts only when GitHub says so: the
 * remaining-calls header at 0, or "rate limit" in the body (the secondary
 * limit's 403 carries no header, only the message). 429 is the same answer.
 */
export function isRateLimited(status: number, headers: Headers, body: string): boolean {
  if (status !== 403 && status !== 429) return false;
  return headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(body);
}

export class GitHubApiError extends Error {
  readonly status: number;
  readonly rateLimited: boolean;
  constructor(message: string, status: number, rateLimited: boolean) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export interface GitHubApiRequest extends GitHubApiOptions {
  accept: string;
  /** What was being attempted, as the start of a sentence: "Listing ledger entries". */
  what: string;
  /** The way out that needs no token, for this command: "pass --revision <sha>". */
  withoutToken: string;
}

/** GET an api.github.com URL; a non-2xx answer throws a GitHubApiError whose
 *  message names the cause and the ways out. */
export async function githubApiGet(url: string, request: GitHubApiRequest): Promise<Response> {
  const env = request.env ?? process.env;
  const doFetch = request.fetch ?? fetch;
  const res = await doFetch(url, { headers: githubApiHeaders(request.accept, env) });
  if (res.ok) return res;

  let body = "";
  try {
    body = await res.text();
  } catch {
    // An unreadable body leaves the status and headers to decide.
  }
  const rateLimited = isRateLimited(res.status, res.headers, body);
  throw new GitHubApiError(describeFailure(res, body, rateLimited, request, githubToken(env)?.from), res.status, rateLimited);
}

function describeFailure(
  res: Response,
  body: string,
  rateLimited: boolean,
  request: GitHubApiRequest,
  tokenFrom: TokenVariable | undefined,
): string {
  if (rateLimited) {
    const reset = resetTime(res.headers);
    const lines = [
      `${request.what} failed: the GitHub API rate limit is exceeded (${res.status}).`,
      tokenFrom
        ? `The request was authenticated with ${tokenFrom}, so that token's own limit is used up${reset ? `; it resets at ${reset}` : ""}.`
        : `This request was anonymous. GitHub allows 60 anonymous API calls an hour per IP address, and on a shared machine ` +
          `(a CI runner, a cloud session) everyone else's calls count against the same address${reset ? `; it resets at ${reset}` : ""}.`,
      "Either:",
      tokenFrom
        ? `  - wait for the reset, or set ${tokenFrom} to a different GitHub token, or`
        : "  - set GITHUB_TOKEN (or GH_TOKEN) to a GitHub token — any token works for this public repository, " +
          "no scopes needed — and authenticated calls get 5,000 an hour, or",
      `  - ${request.withoutToken}.`,
    ];
    return lines.join("\n");
  }

  if (res.status === 401 && tokenFrom) {
    return (
      `${request.what} failed: GitHub rejected the token in ${tokenFrom} (401). ` +
      `Check that it is valid and not expired, or unset ${tokenFrom} to call anonymously.`
    );
  }

  const detail = githubMessage(body)?.replace(/\.+$/, "");
  return (
    `${request.what} failed: ${res.status} ${res.statusText}${detail ? ` (GitHub says: ${detail})` : ""}.\n` +
    `To avoid the API call: ${request.withoutToken}.`
  );
}

/** GitHub's JSON errors carry a human `message`; anything else is not shown. */
function githubMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    return typeof parsed.message === "string" ? parsed.message : undefined;
  } catch {
    return undefined;
  }
}

function resetTime(headers: Headers): string | undefined {
  const seconds = Number(headers.get("x-ratelimit-reset"));
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return `${new Date(seconds * 1000).toISOString().slice(11, 16)} UTC`;
}

/**
 * The sha `ref` points at in owner/repo — what `add` locks at when no
 * `--revision` is given.
 */
export async function resolveRemoteRevision(
  owner: string,
  repo: string,
  ref: string,
  options: GitHubApiOptions = {},
): Promise<string> {
  const res = await githubApiGet(`https://api.github.com/repos/${owner}/${repo}/commits/${ref}`, {
    ...options,
    accept: "application/vnd.github.sha",
    what: `Resolving the registry's current revision (${owner}/${repo}@${ref}) from the GitHub API`,
    withoutToken:
      "pass --revision <sha>, the commit to lock at, and no API call is made " +
      `(\`git ls-remote https://github.com/${owner}/${repo} ${ref}\` prints it without using the API)`,
  });
  const sha = (await res.text()).trim();
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(sha)) {
    throw new Error(`The GitHub API answered with something that is not a commit sha for ${owner}/${repo}@${ref} — pass --revision <sha>.`);
  }
  return sha;
}
