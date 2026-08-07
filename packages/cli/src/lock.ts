/**
 * Generates the initial `ui.lock.json` entries for items already installed
 * in a consumer app — records what's actually on disk right now (not what
 * the registry says, though for a cleanly-installed item the two should
 * already agree), so the baseline `sync` compares against later is the
 * consumer's true starting point.
 */

import { hashContent } from "./hash.ts";
import type { LockedItem } from "./lockfile.ts";
import type { RegistryItem } from "./registry-source.ts";
import type { FileReader } from "./sync.ts";

export interface LockItemResult {
  locked: LockedItem;
  /** Installed files whose hash does not match the registry's current
   *  content — surfaced immediately rather than silently baselined, so
   *  locking an already-modified file is a visible decision, not an
   *  accidental one. */
  divergesFromRegistry: string[];
}

export async function lockItem(
  registryItem: RegistryItem,
  revision: string,
  now: string,
  readInstalledFile: FileReader,
  resolveTargetToPath: (target: string) => string,
): Promise<LockItemResult> {
  const files: Record<string, string> = {};
  const divergesFromRegistry: string[] = [];

  for (const file of registryItem.files) {
    const installedContent = await readInstalledFile(resolveTargetToPath(file.target));
    if (installedContent === null) continue; // not installed in this consumer — not locked
    const installedHash = hashContent(installedContent);
    files[file.target] = installedHash;
    if (installedHash !== hashContent(file.content)) divergesFromRegistry.push(file.target);
  }

  return {
    locked: { revision, lockedAt: now, files },
    divergesFromRegistry,
  };
}
