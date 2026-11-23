/**
 * `theme`: a brand seed → the installable stylesheet, the same file
 * `theme-zero.css` is for Diorama's own theme.
 *
 * Before this existed every brand-themed app hand-wrote a script that
 * imported `../ui/packages/tokens/src/index.ts` by path and called
 * `resolveThemePair` + `toTailwindTheme` + `toCss` itself — three calls
 * whose order, scope and header each app re-decided. The composition now
 * lives in `@bydiorama/tokens` (`toThemeStylesheet`), shared with
 * `scripts/build-theme-css.mjs`, and this command is the one caller a
 * consumer runs.
 *
 * WHERE THE TOKENS COME FROM. This CLI has zero runtime dependencies, and
 * `@bydiorama/tokens` is not a dependency of it on purpose:
 *  - it is unpublished (issue #30), so declaring it would make
 *    `npm i @bydiorama/ui` fail with E404 for every command, not just this one;
 *  - it ships TypeScript source, and Node refuses to strip types for files
 *    inside `node_modules` — the same reason this package ships `dist/` — so
 *    even published as it is today it could not be imported from here.
 * So the tokens are read from a bydiorama/ui CHECKOUT: `--registry-path
 * <checkout>` (the flag every other command already uses for a local
 * checkout), or, when this CLI is itself running from a checkout, the
 * `packages/tokens` beside it. Run from `node_modules` with no checkout, the
 * command fails with an error naming both ways out, instead of a module-not-
 * found stack trace.
 *
 * Everything that touches a disk or a module loader comes in through
 * `ThemeIo`, so the tests run the real resolver against in-memory files.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const THEME_SCHEMES = ["auto", "light", "dark"] as const;
export type ThemeScheme = (typeof THEME_SCHEMES)[number];

/** The slice of `@bydiorama/tokens` this command calls — structural, so the
 *  CLI's publish build never compiles the tokens package into itself. */
export interface ThemeIssue {
  path: string;
  message: string;
  severity: "error" | "info";
}
export interface ThemeAdjustment {
  token: string;
  against: string;
  ratioBefore: number;
  ratioAfter: number;
}
export interface ResolvedPairLike {
  light: Record<string, string>;
  dark: Record<string, string>;
  adjustments: { light: ThemeAdjustment[]; dark: ThemeAdjustment[] };
  issues: ThemeIssue[];
}
export interface TokensModule {
  resolveThemePair(seed: never): ResolvedPairLike;
  toThemeStylesheet(pair: never, options: { header: readonly string[]; scheme?: ThemeScheme }): string;
}

export class ThemeCommandError extends Error {}

/** The tokens entry relative to a checkout root. */
export const TOKENS_ENTRY = join("packages", "tokens", "src", "index.ts");

/**
 * Where to import `@bydiorama/tokens` from.
 *
 * `cliModuleUrl` is the running CLI's own `bin/ui.ts` (or `dist/bin/ui.js`):
 * two levels up from `packages/cli/bin/` is `packages/`, so in a checkout
 * the sibling `packages/tokens` is right there. Published, the same walk
 * lands inside `node_modules/@bydiorama/ui/`, where no tokens exist — and if
 * one somehow did, Node would refuse to strip its types.
 */
export function resolveTokensEntry(options: {
  registryPath?: string | undefined;
  cliModuleUrl: string;
  exists: (path: string) => boolean;
}): string {
  if (options.registryPath !== undefined) {
    const entry = resolve(options.registryPath, TOKENS_ENTRY);
    if (!options.exists(entry)) {
      throw new ThemeCommandError(
        `--registry-path ${options.registryPath} has no ${TOKENS_ENTRY.split(sep).join("/")} — is it a bydiorama/ui checkout?`,
      );
    }
    return entry;
  }
  const sibling = fileURLToPath(new URL("../../tokens/src/index.ts", options.cliModuleUrl));
  const inNodeModules = sibling.split(sep).includes("node_modules");
  if (!inNodeModules && options.exists(sibling)) return sibling;
  throw new ThemeCommandError(
    "`theme` needs @bydiorama/tokens, which is not published yet (issue #30) and is not a dependency of this CLI. " +
      "Run it from a bydiorama/ui checkout (`node --experimental-strip-types <checkout>/packages/cli/bin/ui.ts theme ...`), " +
      "or pass --registry-path <checkout> to read the tokens from one.",
  );
}

/**
 * The seed a module exports: `--export <name>` if given, else `default`, else
 * `seed`, else the one export shaped like a seed. Ambiguity is an error —
 * guessing between two seeds is how an app ships the wrong brand.
 */
export function pickSeed(mod: Record<string, unknown>, exportName?: string): { seed: unknown; exportName: string } {
  const isSeed = (v: unknown) =>
    typeof v === "object" && v !== null && typeof (v as { colors?: unknown }).colors === "object" && (v as { colors?: unknown }).colors !== null;

  if (exportName !== undefined) {
    if (!(exportName in mod)) {
      throw new ThemeCommandError(`The seed file has no export \`${exportName}\` (it exports: ${Object.keys(mod).join(", ") || "nothing"}).`);
    }
    if (!isSeed(mod[exportName])) throw new ThemeCommandError(`Export \`${exportName}\` is not a ThemeSeed — it has no \`colors\` object.`);
    return { seed: mod[exportName], exportName };
  }
  for (const name of ["default", "seed"]) {
    if (isSeed(mod[name])) return { seed: mod[name], exportName: name };
  }
  const shaped = Object.keys(mod).filter((k) => isSeed(mod[k]));
  if (shaped.length === 1) return { seed: mod[shaped[0]!], exportName: shaped[0]! };
  throw new ThemeCommandError(
    shaped.length === 0
      ? "The seed file exports no ThemeSeed (an object with a `colors` object) — export one as `default` or `seed`."
      : `The seed file exports several seeds (${shaped.join(", ")}) — pick one with --export <name>.`,
  );
}

const SCHEME_LINE: Record<ThemeScheme, string> = {
  auto: "Tailwind compiles. Light and dark follow prefers-color-scheme.",
  light: "Tailwind compiles. The scheme is forced to light (--scheme light).",
  dark: "Tailwind compiles. The scheme is forced to dark (--scheme dark).",
};

/** A path as written in the header and the regenerate command: relative to
 *  the app root, `/`-separated, and unable to close the comment it sits in. */
const label = (cwd: string, path: string) => relative(cwd, path).split(sep).join("/").replaceAll("*/", "*\\/");

/** The GENERATED header. No date or revision: `--check` compares bytes, and a
 *  header that changes on every run is a file that is always stale. */
export function themeHeader(options: { seedLabel: string; outLabel: string; scheme: ThemeScheme; exportName?: string | undefined }): string[] {
  const command = [
    "bydiorama-ui theme",
    `--seed ${options.seedLabel}`,
    `--out ${options.outLabel}`,
    ...(options.scheme !== "auto" ? [`--scheme ${options.scheme}`] : []),
    ...(options.exportName !== undefined ? [`--export ${options.exportName}`] : []),
  ].join(" ");
  return [
    "Brand theme — the @bydiorama/ui token layer and the Tailwind v4 theme that",
    `maps utilities onto it, resolved from ${options.seedLabel}.`,
    "GENERATED by `bydiorama-ui theme` from @bydiorama/tokens; do not edit —",
    "change the seed and regenerate:",
    "",
    `  ${command}`,
    "",
    "Import it once, after `@import \"tailwindcss\";`, in the stylesheet",
    SCHEME_LINE[options.scheme],
  ];
}

export interface ThemeIo {
  loadTokens(): Promise<TokensModule>;
  /** A `.json` seed as `{ default: parsed }`; anything else as its module namespace. */
  loadSeedModule(absPath: string): Promise<Record<string, unknown>>;
  readFile(absPath: string): Promise<string | null>;
  writeFile(absPath: string, content: string): Promise<void>;
}

export interface ThemeOptions {
  cwd: string;
  seed: string;
  out: string;
  scheme?: ThemeScheme;
  check?: boolean;
  exportName?: string | undefined;
}

export interface ThemeResult {
  /** `written` / `current` / `stale` (with --check) — or `rejected`: the seed
   *  has `error` issues and nothing was written or compared. */
  status: "written" | "current" | "stale" | "rejected";
  outLabel: string;
  seedLabel: string;
  command: string;
  issues: ThemeIssue[];
  adjustments: { light: ThemeAdjustment[]; dark: ThemeAdjustment[] };
}

export async function runTheme(options: ThemeOptions, io: ThemeIo): Promise<ThemeResult> {
  const scheme = options.scheme ?? "auto";
  if (!THEME_SCHEMES.includes(scheme)) {
    throw new ThemeCommandError(`--scheme must be one of ${THEME_SCHEMES.join(", ")} (got "${String(scheme)}").`);
  }
  const seedPath = isAbsolute(options.seed) ? options.seed : resolve(options.cwd, options.seed);
  const outPath = isAbsolute(options.out) ? options.out : resolve(options.cwd, options.out);
  const seedLabel = label(options.cwd, seedPath);
  const outLabel = label(options.cwd, outPath);

  const { seed, exportName } = pickSeed(await io.loadSeedModule(seedPath), options.exportName);
  const tokens = await io.loadTokens();
  const pair = tokens.resolveThemePair(seed as never);
  const header = themeHeader({ seedLabel, outLabel, scheme, exportName: options.exportName === undefined ? undefined : exportName });
  const command = header.find((line) => line.startsWith("  bydiorama-ui theme"))!.trim();
  const base = { outLabel, seedLabel, command, issues: pair.issues, adjustments: pair.adjustments };

  // An `error` issue means the resolver fell back or the value is unsafe to
  // serialise. Writing anyway would ship a theme the author did not choose
  // with a green build — the silent failure seed intake exists to prevent.
  if (pair.issues.some((i) => i.severity !== "info")) return { status: "rejected", ...base };

  const css = tokens.toThemeStylesheet(pair as never, { header, scheme });
  if (options.check) {
    const current = await io.readFile(outPath);
    return { status: current === css ? "current" : "stale", ...base };
  }
  await io.writeFile(outPath, css);
  return { status: "written", ...base };
}

/** The real disk and module loader, for `bin/ui.ts`. */
export function nodeThemeIo(tokensEntry: string): ThemeIo {
  const importModule = async (absPath: string) => {
    try {
      return (await import(pathToFileURL(absPath).href)) as Record<string, unknown>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ERR_UNKNOWN_FILE_EXTENSION") {
        throw new ThemeCommandError(
          `Cannot import ${absPath}: this Node does not strip TypeScript. Run the CLI with \`node --experimental-strip-types\` (Node ≥ 22.6).`,
        );
      }
      throw err;
    }
  };
  return {
    loadTokens: async () => (await importModule(tokensEntry)) as unknown as TokensModule,
    loadSeedModule: async (absPath) => {
      if (extname(absPath).toLowerCase() === ".json") {
        let raw: string;
        try {
          raw = await readFile(absPath, "utf8");
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new ThemeCommandError(`No seed file at ${absPath}.`);
          throw err;
        }
        return { default: JSON.parse(raw) as unknown };
      }
      try {
        return await importModule(absPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND" && (err as Error).message.includes(absPath)) {
          throw new ThemeCommandError(`No seed file at ${absPath}.`);
        }
        throw err;
      }
    },
    readFile: async (absPath) => {
      try {
        return await readFile(absPath, "utf8");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    writeFile: async (absPath, content) => {
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, content, "utf8");
    },
  };
}
