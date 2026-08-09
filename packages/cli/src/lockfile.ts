/** Read/write for ui.lock.json — schema at schemas/ui.lock.schema.json. */

import { readFile, writeFile } from "node:fs/promises";

export interface LockedItem {
  revision: string;
  lockedAt: string;
  files: Record<string, string>;
  /**
   * Targets the consumer has deliberately FORKED, mapped to what the REGISTRY
   * shipped for them at lock time.
   *
   * Two things had to be persisted and neither was. `lock` detected the
   * divergence and printed a warning, but the warning went to a terminal and
   * `files` recorded the fork's OWN hash — so from the next command onward a
   * fork was indistinguishable from a clean install, and `sync` called it
   * "stale", the same word a clean install gets when the registry moves on.
   * Reported by a consumer whose local Badge fork was overwritten with every
   * check green.
   *
   * And the UPSTREAM hash is the second half, because for a forked file
   * `files[target]` is the fork — so "has upstream moved since I forked?" has
   * no baseline to measure against without it. That question is the whole
   * reason to carry a fork carefully: a fork whose original has changed
   * underneath is the one that needs re-deriving.
   *
   * Absent on items with no fork, so a clean lockfile stays exactly as it was.
   */
  forked?: Record<string, string>;
}

export interface UiLock {
  registry: string;
  items: Record<string, LockedItem>;
}

const EMPTY_LOCK: UiLock = { registry: "", items: {} };

export async function readLockfile(path: string): Promise<UiLock> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_LOCK, items: {} };
    throw err;
  }
  const parsed = JSON.parse(raw) as UiLock;
  return { registry: parsed.registry ?? "", items: parsed.items ?? {} };
}

export async function writeLockfile(path: string, lock: UiLock): Promise<void> {
  const withSchema = {
    $schema: "https://github.com/bydiorama/ui/schemas/ui.lock.schema.json",
    ...lock,
  };
  await writeFile(path, `${JSON.stringify(withSchema, null, 2)}\n`, "utf8");
}
