/**
 * Where `sync` reads ledger entries from — mirrors registry-source.ts's two
 * modes. Entries are matched to a locked item by `entry.item === itemName`
 * OR `entry.affects` containing `component:<itemName>` (the convention this
 * repo's own entries already use, e.g. `["component:card"]`), same as a
 * human reading `ledger/entries/*.json` would do by eye — not a new
 * convention invented for this CLI.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { githubApiGet, USER_AGENT, type GitHubApiOptions } from "./github-api.ts";

export interface LedgerEntry {
  id: string;
  date: string;
  item: string;
  kind: "breaking" | "addition" | "fix" | "visual" | "a11y" | "token" | "decision";
  summary: string;
  affects?: string[];
  migration?: { codemod?: string; manual?: string };
}

export type LedgerSource = () => Promise<LedgerEntry[]>;

export function localLedgerSource(checkoutPath: string): LedgerSource {
  return async () => {
    const dir = join(checkoutPath, "ledger", "entries");
    const names = await readdir(dir);
    const entries: LedgerEntry[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      entries.push(JSON.parse(await readFile(join(dir, name), "utf8")) as LedgerEntry);
    }
    return entries;
  };
}

/** GitHub's contents API lists a directory (raw.githubusercontent.com
 *  cannot). A public repo needs no auth, but anonymous calls share a
 *  60-an-hour limit per IP address, so GITHUB_TOKEN / GH_TOKEN is sent when
 *  set (github-api.ts). The entry files themselves come from
 *  raw.githubusercontent.com, which is not the API and is not sent the token. */
export function remoteLedgerSource(owner: string, repo: string, ref: string, options: GitHubApiOptions = {}): LedgerSource {
  const doFetch = options.fetch ?? fetch;
  return async () => {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/ledger/entries?ref=${ref}`;
    const listRes = await githubApiGet(listUrl, {
      ...options,
      accept: "application/vnd.github+json",
      what: "Listing ledger entries",
      withoutToken: "run `sync` against a local checkout with --registry-path <checkout>, which reads ledger/entries from disk",
    });
    const files = (await listRes.json()) as Array<{ name: string; download_url: string }>;

    const entries: LedgerEntry[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;
      const res = await doFetch(file.download_url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`Fetching ${file.download_url} failed: ${res.status} ${res.statusText}`);
      entries.push((await res.json()) as LedgerEntry);
    }
    return entries;
  };
}

/** Entries that apply to `itemName` and landed after `since` (a lockfile's
 *  `lockedAt`, exclusive — an entry dated exactly at lock time was already
 *  known when this item was locked). */
export function entriesForItem(entries: LedgerEntry[], itemName: string, since: string): LedgerEntry[] {
  const sinceTime = new Date(since).getTime();
  return entries
    .filter((e) => e.item === itemName || (e.affects ?? []).includes(`component:${itemName}`))
    .filter((e) => new Date(e.date).getTime() > sinceTime)
    .sort((a, b) => a.date.localeCompare(b.date));
}
