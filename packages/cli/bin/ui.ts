#!/usr/bin/env node
/**
 * `bydiorama-ui` CLI. Not yet published (packages/cli/package.json is
 * private) — run locally with `node --experimental-strip-types bin/ui.ts
 * <command>` from a bydiorama/ui checkout, against a consumer app's
 * directory.
 *
 * Commands:
 *   add <item...>    Install items (and their registry dependencies) from
 *                     the registry into the consumer app, lock what was
 *                     newly installed, and report the npm dependencies the
 *                     consumer still has to install. Never overwrites a
 *                     local edit without --force, and never overwrites a
 *                     locked fork at all.
 *   lock <item...>   Record installed items' current file hashes into the
 *                     consumer's ui.lock.json (first-time setup, or adding a
 *                     newly-installed item).
 *   sync [--json]     Diff every locked item against the registry's current
 *                     content and report status + applicable ledger entries.
 *
 * Flags (all commands):
 *   --cwd <path>              Consumer app root. Default: process.cwd().
 *   --registry-path <path>    Read the registry from a local bydiorama/ui
 *                              checkout instead of the published URL.
 *   --registry-url <template> Override the URL template (default: read from
 *                              the consumer's own components.json).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { findAtAliasBase, resolveTargetPath } from "../src/target-path.ts";
import { localRegistrySource, remoteRegistrySource, type RegistrySource } from "../src/registry-source.ts";
import { localLedgerSource, remoteLedgerSource, type LedgerSource } from "../src/ledger-source.ts";
import { readLockfile, writeLockfile } from "../src/lockfile.ts";
import { lockItem } from "../src/lock.ts";
import { syncAll, type FileReader } from "../src/sync.ts";
import { addItems, type FileWriter } from "../src/add.ts";

const GITHUB_OWNER = "bydiorama";
const GITHUB_REPO = "ui";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function readComponentsJson(cwd: string) {
  const raw = await readFile(join(cwd, "components.json"), "utf8");
  return JSON.parse(raw) as { aliases: Record<string, string>; registries?: Record<string, string> };
}

async function readTsconfigAtAliasBase(cwd: string): Promise<string> {
  const raw = await readFile(join(cwd, "tsconfig.json"), "utf8");
  const tsconfig = JSON.parse(raw) as { compilerOptions?: { paths?: Record<string, string[]> } };
  const base = findAtAliasBase(tsconfig.compilerOptions?.paths);
  if (!base) throw new Error('tsconfig.json has no "@/*" path — this CLI only understands that alias form.');
  return base;
}

function makeFileReader(cwd: string): FileReader {
  return async (resolvedPath) => {
    try {
      return await readFile(join(cwd, resolvedPath), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  };
}

async function resolveSources(
  cwd: string,
  flags: Record<string, string | boolean>,
): Promise<{ registrySource: RegistrySource; ledgerSource: LedgerSource; registryLabel: string }> {
  const registryPath = flags["registry-path"];
  if (typeof registryPath === "string") {
    return {
      registrySource: localRegistrySource(registryPath),
      ledgerSource: localLedgerSource(registryPath),
      registryLabel: registryPath,
    };
  }

  let urlTemplate = typeof flags["registry-url"] === "string" ? (flags["registry-url"] as string) : undefined;
  if (!urlTemplate) {
    const componentsJson = await readComponentsJson(cwd);
    urlTemplate = Object.values(componentsJson.registries ?? {})[0];
  }
  if (!urlTemplate) {
    throw new Error("No registry URL: pass --registry-url, or add a `registries` entry to components.json.");
  }
  return {
    registrySource: remoteRegistrySource(urlTemplate),
    ledgerSource: remoteLedgerSource(GITHUB_OWNER, GITHUB_REPO, "main"),
    registryLabel: urlTemplate,
  };
}

function makeFileWriter(cwd: string): FileWriter {
  return async (resolvedPath, content) => {
    const full = join(cwd, resolvedPath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  };
}

/**
 * The registry revision `add` locks at. `--revision` wins; otherwise, for a
 * remote registry, ask GitHub for main's current sha — raw.githubusercontent
 * serves main, so that IS the revision being installed (within the raw CDN's
 * few minutes of cache). A local checkout has git right there, so requiring
 * an explicit sha costs one flag and keeps this CLI's no-shelling-out rule.
 */
async function resolveAddRevision(flags: Record<string, string | boolean>): Promise<string> {
  if (typeof flags.revision === "string") return flags.revision;
  if (typeof flags["registry-path"] === "string") {
    throw new Error("--revision <git-sha> is required with --registry-path (run `git rev-parse HEAD` in the checkout).");
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/main`, {
    headers: { accept: "application/vnd.github.sha" },
  });
  if (!res.ok) {
    throw new Error(`Could not resolve the registry's current revision from the GitHub API (${res.status}) — pass --revision <git-sha>.`);
  }
  return (await res.text()).trim();
}

async function cmdAdd(itemNames: string[], flags: Record<string, string | boolean>) {
  const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
  const { registrySource, registryLabel } = await resolveSources(cwd, flags);
  const componentsJson = await readComponentsJson(cwd);
  const atAliasBase = await readTsconfigAtAliasBase(cwd);
  const resolveTargetToPath = (target: string) => resolveTargetPath(target, componentsJson.aliases, atAliasBase);
  const readInstalledFile = makeFileReader(cwd);
  const revision = await resolveAddRevision(flags);

  const lock = await readLockfile(join(cwd, "ui.lock.json"));
  const result = await addItems(
    itemNames,
    registrySource,
    lock,
    readInstalledFile,
    makeFileWriter(cwd),
    resolveTargetToPath,
    { force: flags.force === true },
  );

  for (const name of result.notFound) console.error(`✗ ${name}: not found in the registry.`);

  const alreadyLocked: string[] = [];
  for (const added of result.items) {
    const line = added.files.map((f) => `${f.target} (${f.status})`).join(", ");
    console.log(`${added.requested ? "✓" : "+"} ${added.item}: ${line}`);
    for (const f of added.files) {
      if (f.status === "kept") console.log(`    kept your local edit — re-run with --force to overwrite it`);
      if (f.status === "forked") console.log(`    locked fork — never overwritten; resolve it via \`sync\` and re-\`lock\` first`);
    }

    // Lock what THIS run introduced. An item already in the lockfile keeps
    // its entry untouched: re-locking would advance its lockedAt, and that
    // timestamp is sync's cutoff for "which ledger entries haven't you
    // seen" — silently resetting it hides history.
    if (lock.items[added.item]) {
      alreadyLocked.push(added.item);
      continue;
    }
    const registryItem = await registrySource(added.item);
    if (!registryItem) continue;
    const { locked } = await lockItem(registryItem, revision, new Date().toISOString(), readInstalledFile, resolveTargetToPath);
    if (Object.keys(locked.files).length > 0) lock.items[added.item] = locked;
  }

  lock.registry = registryLabel;
  await writeLockfile(join(cwd, "ui.lock.json"), lock);

  if (alreadyLocked.length) {
    console.log(`Already locked, left as-is (run \`sync\` for their drift): ${alreadyLocked.join(", ")}`);
  }
  if (result.npmDependencies.length) {
    console.log(`
npm dependencies to install:
    ${result.npmDependencies.join(" ")}`);
  }
}

async function cmdLock(itemNames: string[], flags: Record<string, string | boolean>) {
  const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
  const { registrySource, registryLabel } = await resolveSources(cwd, flags);
  const componentsJson = await readComponentsJson(cwd);
  const atAliasBase = await readTsconfigAtAliasBase(cwd);
  const resolveTargetToPath = (target: string) => resolveTargetPath(target, componentsJson.aliases, atAliasBase);
  const readInstalledFile = makeFileReader(cwd);

  const revision =
    typeof flags.revision === "string"
      ? flags.revision
      : (() => {
          throw new Error("--revision <git-sha> is required for `lock` (this CLI does not shell out to git).");
        })();
  const now = new Date().toISOString();

  const lock = await readLockfile(join(cwd, "ui.lock.json"));
  lock.registry = registryLabel;

  for (const itemName of itemNames) {
    const registryItem = await registrySource(itemName);
    if (!registryItem) {
      console.error(`✗ ${itemName}: not found in the registry.`);
      continue;
    }
    const { locked, divergesFromRegistry } = await lockItem(registryItem, revision, now, readInstalledFile, resolveTargetToPath);
    if (Object.keys(locked.files).length === 0) {
      console.error(`✗ ${itemName}: no installed files found — is it actually installed in this app?`);
      continue;
    }
    lock.items[itemName] = locked;
    const flag = divergesFromRegistry.length ? ` (⚠ diverges from registry: ${divergesFromRegistry.join(", ")})` : "";
    console.log(`✓ ${itemName}: locked ${Object.keys(locked.files).length} file(s) at ${revision.slice(0, 12)}${flag}`);
  }

  await writeLockfile(join(cwd, "ui.lock.json"), lock);
}

async function cmdSync(flags: Record<string, string | boolean>) {
  const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
  const { registrySource, ledgerSource } = await resolveSources(cwd, flags);
  const componentsJson = await readComponentsJson(cwd);
  const atAliasBase = await readTsconfigAtAliasBase(cwd);
  const resolveTargetToPath = (target: string) => resolveTargetPath(target, componentsJson.aliases, atAliasBase);
  const readInstalledFile = makeFileReader(cwd);

  const lock = await readLockfile(join(cwd, "ui.lock.json"));
  const results = await syncAll(lock, readInstalledFile, resolveTargetToPath, registrySource, ledgerSource);

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  for (const r of results) {
    const icon =
      r.status === "current" ? "✓"
      : r.status === "missing-upstream" ? "?"
      : r.status === "forked" || r.status === "forked-and-stale" ? "✎"
      : "⚠";
    console.log(`${icon} ${r.item}: ${r.status}`);
    // Named files, not just a status word. A fork is work that a re-install
    // destroys, so the report says exactly which files to keep before running
    // anything that writes.
    const forked = r.files.filter((f) => f.forked).map((f) => f.target);
    if (forked.length) {
      console.log(`    forked locally — re-installing this item OVERWRITES: ${forked.join(", ")}`);
    }
    for (const entry of r.ledgerEntries) {
      console.log(`    [${entry.kind}] ${entry.id} — ${entry.summary.split("\n")[0]!.slice(0, 100)}`);
    }
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;

  if (command === "add") {
    if (rest.length === 0) throw new Error("Usage: bydiorama-ui add <item...> [--force] [--revision <sha>]");
    await cmdAdd(rest, flags);
  } else if (command === "lock") {
    if (rest.length === 0) throw new Error("Usage: bydiorama-ui lock <item...> --revision <sha>");
    await cmdLock(rest, flags);
  } else if (command === "sync") {
    await cmdSync(flags);
  } else {
    console.error("Usage: bydiorama-ui <add|lock|sync> [...flags]");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
