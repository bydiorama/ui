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
 *                     newly-installed item). `--all` instead of names locks
 *                     every registry item that has files installed.
 *   sync [--json]     Diff every locked item against the registry's current
 *                     content and report status + applicable ledger entries.
 *   theme --seed <file> --out <css>
 *                     Resolve a brand ThemeSeed (.ts/.json) into the same
 *                     installable stylesheet theme-zero.css is. `--check`
 *                     fails if the file is stale. Needs a bydiorama/ui
 *                     checkout for @bydiorama/tokens (src/theme.ts).
 *
 * Flags (all commands):
 *   --cwd <path>              Consumer app root. Default: process.cwd().
 *   --registry-path <path>    Read the registry from a local bydiorama/ui
 *                              checkout instead of the published URL.
 *   --registry-url <template> Override the URL template (default: read from
 *                              the consumer's own components.json).
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { findAtAliasBase, resolveTargetPath } from "../src/target-path.ts";
import { listRegistryItems, localRegistrySource, remoteRegistrySource, type RegistrySource } from "../src/registry-source.ts";
import { localLedgerSource, remoteLedgerSource, type LedgerSource } from "../src/ledger-source.ts";
import { readLockfile, writeLockfile } from "../src/lockfile.ts";
import { resolveRemoteRevision } from "../src/github-api.ts";
import { lockItem } from "../src/lock.ts";
import { syncAll, type FileReader } from "../src/sync.ts";
import { addItems, type FileWriter } from "../src/add.ts";
import { nodeThemeIo, resolveTokensEntry, runTheme, THEME_SCHEMES, type ThemeScheme } from "../src/theme.ts";

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
 * The API call sends GITHUB_TOKEN / GH_TOKEN when set and explains a rate
 * limit (src/github-api.ts).
 */
async function resolveAddRevision(flags: Record<string, string | boolean>): Promise<string> {
  if (typeof flags.revision === "string") return flags.revision;
  if (typeof flags["registry-path"] === "string") {
    throw new Error("--revision <git-sha> is required with --registry-path (run `git rev-parse HEAD` in the checkout).");
  }
  return resolveRemoteRevision(GITHUB_OWNER, GITHUB_REPO, "main");
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
          throw new Error(
            "--revision <git-sha> is required for `lock`: the bydiorama/ui commit the installed files came from " +
              "(the SHA in your registry URL, or `git -C <checkout> rev-parse HEAD`). This CLI does not shell out to git.",
          );
        })();
  const now = new Date().toISOString();

  const lock = await readLockfile(join(cwd, "ui.lock.json"));
  lock.registry = registryLabel;

  // --all: every published item, silently skipping the ones not installed
  // here — "not installed" is the expected answer for most of them.
  const isAll = flags.all === true;
  const names = isAll
    ? await listRegistryItems(
        typeof flags["registry-path"] === "string"
          ? { registryPath: flags["registry-path"] }
          : { urlTemplate: registryLabel },
      )
    : itemNames;

  for (const itemName of names) {
    const registryItem = await registrySource(itemName);
    if (!registryItem) {
      console.error(`✗ ${itemName}: not found in the registry.`);
      continue;
    }
    const { locked, divergesFromRegistry } = await lockItem(registryItem, revision, now, readInstalledFile, resolveTargetToPath);
    if (Object.keys(locked.files).length === 0) {
      if (!isAll) console.error(`✗ ${itemName}: no installed files found — is it actually installed in this app?`);
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

async function cmdTheme(flags: Record<string, string | boolean>) {
  const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
  if (typeof flags.seed !== "string" || typeof flags.out !== "string") throw new Error(HELP.theme);
  const scheme = flags.scheme === undefined ? "auto" : flags.scheme;
  if (typeof scheme !== "string" || !(THEME_SCHEMES as readonly string[]).includes(scheme)) {
    throw new Error(`--scheme must be one of ${THEME_SCHEMES.join(", ")}.`);
  }
  const tokensEntry = resolveTokensEntry({
    registryPath: typeof flags["registry-path"] === "string" ? flags["registry-path"] : undefined,
    cliModuleUrl: import.meta.url,
    exists: existsSync,
  });

  const result = await runTheme(
    {
      cwd,
      seed: flags.seed,
      out: flags.out,
      scheme: scheme as ThemeScheme,
      check: flags.check === true,
      exportName: typeof flags.export === "string" ? flags.export : undefined,
    },
    nodeThemeIo(tokensEntry),
  );

  for (const issue of result.issues) {
    console.error(`${issue.severity === "info" ? "ℹ" : "✗"} ${result.seedLabel} ${issue.path}: ${issue.message}`);
  }
  // One token can be moved against several grounds; name each once.
  const moved = (["light", "dark"] as const)
    .map((scheme) => [scheme, [...new Set(result.adjustments[scheme].map((a) => a.token))]] as const)
    .filter(([, tokens]) => tokens.length > 0);
  if (moved.length) {
    console.log(
      `  the contrast audit moved these off the seed's colours to clear AA — ${moved.map(([scheme, tokens]) => `${scheme}: ${tokens.join(", ")}`).join("; ")}`,
    );
  }

  if (result.status === "rejected") {
    console.error(`✗ ${result.outLabel} not ${flags.check === true ? "checked" : "written"}: fix the seed's errors above first.`);
    process.exitCode = 1;
  } else if (result.status === "stale") {
    console.error(`✗ ${result.outLabel} is stale — run \`${result.command}\`.`);
    process.exitCode = 1;
  } else if (result.status === "current") {
    console.log(`✓ ${result.outLabel} matches ${result.seedLabel}`);
  } else {
    console.log(`wrote ${result.outLabel} from ${result.seedLabel}`);
  }
}

const HELP: Record<string, string> = {
  general: `bydiorama-ui — install and track @bydiorama/ui registry items as source.

Usage: bydiorama-ui <command> [...] [flags]

Commands:
  add <item...>   Install items and their registry dependencies, then lock them.
  lock <item...>  Record already-installed items in ui.lock.json (or --all).
  sync            Report drift for every locked item, with applicable ledger entries.
  theme           Emit a brand seed's theme stylesheet (or --check it is current).

Flags (all commands):
  --cwd <path>               Consumer app root (default: the current directory).
  --registry-path <path>     Read from a local bydiorama/ui checkout instead of the URL.
  --registry-url <template>  Item URL template containing {name}
                             (default: components.json "registries").

Run \`bydiorama-ui <command> --help\` for a command's own flags.`,
  add: `Usage: bydiorama-ui add <item...> [--force] [--revision <sha>]

Writes each item's files through your components.json aliases and tsconfig "@/*",
installs its registry dependencies, locks what it wrote into ui.lock.json, and
prints the npm packages left for you to install.

  --force           Overwrite files you have edited locally. A declared fork is
                    never overwritten.
  --revision <sha>  The bydiorama/ui commit the files come from, recorded in the
                    lock. Use the SHA in your registry URL, or
                    \`git -C <checkout> rev-parse HEAD\` with --registry-path.
                    Omitted, \`add\` asks the GitHub API for main's sha.

Environment:
  GITHUB_TOKEN      A GitHub token (or GH_TOKEN) sent to the GitHub API, which
                    allows only 60 anonymous calls an hour per IP address.`,
  lock: `Usage: bydiorama-ui lock (<item...> | --all) --revision <sha>

Records the current hash of each installed item's files, so \`sync\` can tell an
upstream change (stale) from your own edit (modified). Use it for items that
were installed some other way — copied by hand, or with the shadcn CLI.

  --all             Lock every registry item that has files installed here.
  --revision <sha>  REQUIRED. The bydiorama/ui commit the installed files came
                    from — the SHA in your registry URL, or
                    \`git -C <checkout> rev-parse HEAD\` for a local checkout.
                    This CLI does not shell out to git, so it cannot guess.

Files that differ from the registry at lock time are reported as diverging. If
you installed with the shadcn CLI, expect that: it drops a file's leading
comment, so reinstall byte-exact with \`add <item> --force --revision <sha>\`.`,
  sync: `Usage: bydiorama-ui sync [--json]

Diffs every locked item against the registry and prints its status — current,
stale, modified, forked, or a combination — with the ledger entries that apply.

  --json  Machine-readable output.

Environment:
  GITHUB_TOKEN  A GitHub token (or GH_TOKEN) sent when listing the ledger
                through the GitHub API, which allows only 60 anonymous calls
                an hour per IP address. --registry-path avoids the API.`,
  theme: `Usage: bydiorama-ui theme --seed <file> --out <css> [--scheme auto|light|dark]
                          [--check] [--export <name>] [--registry-path <checkout>]

Resolves a brand ThemeSeed and writes the stylesheet an app imports once, after
\`@import "tailwindcss";\` — the Tailwind v4 \`@theme inline\` map plus the token
layer, exactly what theme-zero.css is for Diorama's own theme, with a GENERATED
header naming the command that regenerates it.

  --seed <file>       A .ts/.mts/.js/.mjs module exporting a ThemeSeed (\`default\`,
                      \`seed\`, or its only seed-shaped export), or a .json seed.
                      Relative to --cwd.
  --out <css>         The stylesheet to write. Relative to --cwd.
  --scheme <scheme>   auto (default) follows prefers-color-scheme; light or dark
                      force it.
  --check             Write nothing; exit 1 if <css> differs from what the seed
                      resolves to now. For CI.
  --export <name>     The export to read when the module has several seeds.
  --registry-path     The bydiorama/ui checkout to read @bydiorama/tokens from.
                      Default: the checkout this CLI runs from. The tokens are
                      unpublished (issue #30), so a CLI installed from npm needs
                      this flag.

Seed issues are printed; an \`error\` (an unsafe or unusable value) writes nothing
and exits 1, an \`info\` (a valid value that resolves to something easy to
misread, like a small baseSize) is printed and the file is still written.`,
};

async function main() {
  const argv = process.argv.slice(2);
  const wantsHelp = argv.includes("--help") || argv.includes("-h");
  const { positional, flags } = parseArgs(argv.filter((a) => a !== "-h"));
  const [command, ...rest] = positional;

  if (command === "help" || command === undefined) {
    console.log(HELP[rest[0] ?? ""] ?? HELP.general);
    if (command === undefined && !wantsHelp) process.exitCode = 1;
    return;
  }
  if (wantsHelp) {
    console.log(HELP[command] ?? HELP.general);
    return;
  }

  if (command === "add") {
    if (rest.length === 0) throw new Error(HELP.add);
    await cmdAdd(rest, flags);
  } else if (command === "lock") {
    if (rest.length === 0 && !flags.all) throw new Error(HELP.lock);
    await cmdLock(rest, flags);
  } else if (command === "sync") {
    await cmdSync(flags);
  } else if (command === "theme") {
    await cmdTheme(flags);
  } else {
    console.error(HELP.general);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
