/**
 * The core of `add` — the owned install channel. Fetches an item and its
 * transitive `registryDependencies` from the registry and writes their files
 * into the consumer app, so installing does not route through anyone else's
 * CLI. The shadcn CLI remains a working alternative (the registry speaks its
 * schema on purpose), but it cannot do the half that matters here: `add`
 * reads `ui.lock.json` BEFORE writing, so a deliberate fork is refused, not
 * overwritten — the exact incident that taught `lock` to record forks.
 *
 * Pure planning logic; all I/O (registry reads, file reads/writes) is
 * injected, same as sync.ts, so this is testable without a filesystem or
 * network.
 *
 * npm dependencies are REPORTED, never installed: this CLI does not shell
 * out (see `lock`'s stance on git), and a consumer's package manager, ranges
 * and workspace layout are theirs. The aggregated, deduplicated list is part
 * of the result so the caller can print one copy-pasteable install line.
 */

import { hashContent } from "./hash.ts";
import type { UiLock } from "./lockfile.ts";
import type { RegistryItem, RegistrySource } from "./registry-source.ts";
import type { FileReader } from "./sync.ts";

export type FileWriter = (resolvedPath: string, content: string) => Promise<void>;

export type AddedFileStatus =
  /** Was not on disk; written. */
  | "added"
  /** Already on disk with exactly the registry's content; left alone. */
  | "unchanged"
  /** On disk with DIFFERENT content and not overwritten. Overwriting a
   *  local edit is destroying work, so it is an explicit choice (`force`),
   *  never a side effect of installing. */
  | "kept"
  /** On disk, different, and overwritten because `force` was passed. */
  | "overwritten"
  /** ui.lock.json records this target as a deliberate fork that still
   *  stands. Never overwritten, `force` included: the fork record exists
   *  precisely so that "anything that overwrites files has one boolean to
   *  refuse on" (sync.ts). Re-installing over it is done by resolving the
   *  fork first — re-`lock` without the divergence — not by out-flagging it. */
  | "forked";

export interface AddedFile {
  target: string;
  status: AddedFileStatus;
}

export interface AddedItem {
  item: string;
  /** Whether this item was asked for by name or pulled in as a dependency. */
  requested: boolean;
  files: AddedFile[];
}

export interface AddResult {
  items: AddedItem[];
  /** Requested names the registry does not have. */
  notFound: string[];
  /** Union of every installed item's npm `dependencies`, deduplicated in
   *  first-seen order — what the consumer still has to install themselves. */
  npmDependencies: string[];
}

/** `@bydiorama/cn` → `cn`. Bare names pass through, so a hand-typed
 *  dependency (or another registry's convention) still resolves. */
export function registryDependencyName(ref: string): string {
  const slash = ref.lastIndexOf("/");
  return slash === -1 ? ref : ref.slice(slash + 1);
}

/**
 * Resolve `itemNames` plus their transitive registry dependencies into a
 * flat, deduplicated install order (dependencies before dependents, so a
 * partial failure never leaves an item present without its imports).
 */
export async function resolveInstallSet(
  itemNames: string[],
  registrySource: RegistrySource,
): Promise<{ items: Array<{ item: RegistryItem; requested: boolean }>; notFound: string[] }> {
  const resolved = new Map<string, { item: RegistryItem; requested: boolean }>();
  const notFound: string[] = [];

  async function visit(name: string, requested: boolean): Promise<void> {
    const seen = resolved.get(name);
    if (seen) {
      // First seen as a dependency, now asked for by name: it was requested.
      if (requested) seen.requested = true;
      return;
    }
    const item = await registrySource(name);
    if (!item) {
      // A missing DEPENDENCY is thrown, not collected: "button installed,
      // but its cn is silently absent" is a broken app that looks installed.
      // A missing requested name is the caller's typo — report and go on.
      if (!requested) throw new Error(`Registry dependency "${name}" not found in the registry — the registry itself is inconsistent.`);
      notFound.push(name);
      return;
    }
    for (const ref of item.registryDependencies ?? []) {
      await visit(registryDependencyName(ref), false);
    }
    // After the dependencies: Map preserves insertion order, which is the
    // install order.
    resolved.set(name, { item, requested });
  }

  for (const name of itemNames) await visit(name, true);
  return { items: [...resolved.values()], notFound };
}

export async function addItems(
  itemNames: string[],
  registrySource: RegistrySource,
  lock: UiLock,
  readInstalledFile: FileReader,
  writeInstalledFile: FileWriter,
  resolveTargetToPath: (target: string) => string,
  options: { force?: boolean } = {},
): Promise<AddResult> {
  const { items, notFound } = await resolveInstallSet(itemNames, registrySource);

  const result: AddResult = { items: [], notFound, npmDependencies: [] };
  const npmSeen = new Set<string>();

  for (const { item, requested } of items) {
    const files: AddedFile[] = [];
    const lockedForks = lock.items[item.name]?.forked ?? {};

    for (const file of item.files) {
      const path = resolveTargetToPath(file.target);
      const installed = await readInstalledFile(path);

      if (installed === null) {
        await writeInstalledFile(path, file.content);
        files.push({ target: file.target, status: "added" });
      } else if (hashContent(installed) === hashContent(file.content)) {
        files.push({ target: file.target, status: "unchanged" });
      } else if (file.target in lockedForks) {
        files.push({ target: file.target, status: "forked" });
      } else if (options.force) {
        await writeInstalledFile(path, file.content);
        files.push({ target: file.target, status: "overwritten" });
      } else {
        files.push({ target: file.target, status: "kept" });
      }
    }

    for (const dep of item.dependencies ?? []) {
      if (!npmSeen.has(dep)) {
        npmSeen.add(dep);
        result.npmDependencies.push(dep);
      }
    }

    result.items.push({ item: item.name, requested, files });
  }

  return result;
}
