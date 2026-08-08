#!/usr/bin/env node
/**
 * `bydiorama-ui` CLI. Not yet published (packages/cli/package.json is
 * private) — run locally with `node --experimental-strip-types bin/ui.ts
 * <command>` from a bydiorama/ui checkout, against a consumer app's
 * directory.
 *
 * Commands:
 *   lock <item...>   Record installed items' current file hashes into the
 *                     consumer's ui.lock.json (first-time setup, or adding a
 *                     newly-installed item).
 *   sync [--json]     Diff every locked item against the registry's current
 *                     content and report status + applicable ledger entries.
 *
 * Flags (both commands):
 *   --cwd <path>              Consumer app root. Default: process.cwd().
 *   --registry-path <path>    Read the registry from a local bydiorama/ui
 *                              checkout instead of the published URL.
 *   --registry-url <template> Override the URL template (default: read from
 *                              the consumer's own components.json).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { findAtAliasBase, resolveTargetPath } from "../src/target-path.ts";
import { localRegistrySource, remoteRegistrySource, type RegistrySource } from "../src/registry-source.ts";
import { localLedgerSource, remoteLedgerSource, type LedgerSource } from "../src/ledger-source.ts";
import { readLockfile, writeLockfile } from "../src/lockfile.ts";
import { lockItem } from "../src/lock.ts";
import { syncAll, type FileReader } from "../src/sync.ts";

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
    const icon = r.status === "current" ? "✓" : r.status === "missing-upstream" ? "?" : "⚠";
    console.log(`${icon} ${r.item}: ${r.status}`);
    for (const entry of r.ledgerEntries) {
      console.log(`    [${entry.kind}] ${entry.id} — ${entry.summary.split("\n")[0]!.slice(0, 100)}`);
    }
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;

  if (command === "lock") {
    if (rest.length === 0) throw new Error("Usage: bydiorama-ui lock <item...> --revision <sha>");
    await cmdLock(rest, flags);
  } else if (command === "sync") {
    await cmdSync(flags);
  } else {
    console.error("Usage: bydiorama-ui <lock|sync> [...flags]");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
