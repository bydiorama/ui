/**
 * The core of `npx @bydiorama/ui sync` (plan.md §4.6, part 3): for each item
 * in ui.lock.json, work out whether the CONSUMER changed it locally
 * ("modified"), the REGISTRY changed it since the lock was taken ("stale"),
 * both, or neither ("current") — and which ledger entries apply.
 *
 * Pure diffing logic lives here; all I/O (reading the installed file, the
 * registry's current content, the ledger) is injected, so this is testable
 * without a filesystem or network and swappable between local-checkout and
 * published-registry sources (registry-source.ts / ledger-source.ts).
 */

import { hashContent } from "./hash.ts";
import type { LockedItem, UiLock } from "./lockfile.ts";
import type { RegistrySource } from "./registry-source.ts";
import { entriesForItem, type LedgerEntry, type LedgerSource } from "./ledger-source.ts";

export type ItemStatus = "current" | "stale" | "modified" | "modified-and-stale" | "missing-upstream";

export interface FileDiff {
  target: string;
  lockedHash: string;
  installedHash: string | null; // null: the file is gone from disk
  currentUpstreamHash: string | null; // null: the registry no longer has this file
  /** Installed content does not match what the registry currently ships —
   *  the actionable question. A consumer edit that happens to already equal
   *  the new upstream value is NOT modified: there is nothing left to
   *  reconcile, however they got there. */
  modified: boolean;
  /** Installed content is unchanged since lock, but upstream has moved —
   *  informational, distinct from `modified`, so "local edit" and "upstream
   *  moved on its own" are never collapsed into one undifferentiated flag. */
  staleUpstream: boolean;
}

export interface ItemSyncResult {
  item: string;
  status: ItemStatus;
  lockedRevision: string;
  files: FileDiff[];
  /** Files the registry's CURRENT item has that the lock has never seen —
   *  upstream added something since install. Not itself a reason to call the
   *  item modified or stale; surfaced so `sync` can say "there's more now". */
  newUpstreamFiles: string[];
  ledgerEntries: LedgerEntry[];
}

/** Read one installed file's content, or null if it doesn't exist. Injected
 *  so this stays testable without touching a real filesystem. */
export type FileReader = (resolvedPath: string) => Promise<string | null>;

export async function diffItem(
  itemName: string,
  locked: LockedItem,
  readInstalledFile: FileReader,
  resolveTargetToPath: (target: string) => string,
  registrySource: RegistrySource,
  ledgerEntries: LedgerEntry[],
): Promise<ItemSyncResult> {
  const registryItem = await registrySource(itemName);
  const currentByTarget = new Map((registryItem?.files ?? []).map((f) => [f.target, f.content]));

  const files: FileDiff[] = [];
  for (const [target, lockedHash] of Object.entries(locked.files)) {
    const installedContent = await readInstalledFile(resolveTargetToPath(target));
    const installedHash = installedContent === null ? null : hashContent(installedContent);

    const currentContent = currentByTarget.get(target);
    const currentUpstreamHash = currentContent === undefined ? null : hashContent(currentContent);

    // Three-way comparison (installed / locked / upstream), not two
    // independent flags — "does installed already match the CURRENT
    // upstream" has to be checked first, because a consumer edit that lands
    // exactly on the new upstream value has nothing left to reconcile even
    // though it differs from the old locked baseline.
    const matchesUpstream = installedHash !== null && installedHash === currentUpstreamHash;
    const matchesLocked = installedHash === lockedHash;

    files.push({
      target,
      lockedHash,
      installedHash,
      currentUpstreamHash,
      modified: !matchesUpstream && !matchesLocked,
      staleUpstream: !matchesUpstream && matchesLocked,
    });
  }

  const newUpstreamFiles = [...currentByTarget.keys()].filter((t) => !(t in locked.files));

  const anyModified = files.some((f) => f.modified);
  const anyUpstreamMoved = files.some((f) => f.currentUpstreamHash !== f.lockedHash);

  const status: ItemStatus = registryItem === null
    ? "missing-upstream"
    : anyModified && anyUpstreamMoved
      ? "modified-and-stale"
      : anyModified
        ? "modified"
        : files.some((f) => f.staleUpstream)
          ? "stale"
          : "current";

  return {
    item: itemName,
    status,
    lockedRevision: locked.revision,
    files,
    newUpstreamFiles,
    ledgerEntries: entriesForItem(ledgerEntries, itemName, locked.lockedAt),
  };
}

export async function syncAll(
  lock: UiLock,
  readInstalledFile: FileReader,
  resolveTargetToPath: (target: string) => string,
  registrySource: RegistrySource,
  ledgerSource: LedgerSource,
): Promise<ItemSyncResult[]> {
  const entries = await ledgerSource();
  const results: ItemSyncResult[] = [];
  for (const [itemName, locked] of Object.entries(lock.items)) {
    results.push(await diffItem(itemName, locked, readInstalledFile, resolveTargetToPath, registrySource, entries));
  }
  return results;
}
