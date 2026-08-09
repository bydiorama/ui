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
  /** target → the hash the REGISTRY shipped, for forked targets only. */
  const forked: Record<string, string> = {};

  for (const file of registryItem.files) {
    const installedContent = await readInstalledFile(resolveTargetToPath(file.target));
    if (installedContent === null) continue; // not installed in this consumer — not locked
    const installedHash = hashContent(installedContent);
    files[file.target] = installedHash;
    const upstreamHash = hashContent(file.content);
    if (installedHash !== upstreamHash) {
      divergesFromRegistry.push(file.target);
      // The upstream hash, not just the target name: `files[target]` is the
      // FORK, so without this there is no baseline to answer "has the thing I
      // forked changed since?" — see the note on LockedItem.forked.
      forked[file.target] = upstreamHash;
    }
  }

  return {
    // The divergence is RECORDED, not merely reported. Printing it and then
    // baselining the fork's own hash is what made a fork invisible from the
    // next command onward.
    locked: {
      revision,
      lockedAt: now,
      files,
      ...(divergesFromRegistry.length ? { forked } : {}),
    },
    divergesFromRegistry,
  };
}
