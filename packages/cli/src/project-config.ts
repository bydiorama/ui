import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findAtAliasBase } from "./target-path.ts";

export const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/bydiorama/ui/main/r/{name}.json";
export interface ProjectConfig {
  sourceRoot: string;
  aliases: Record<string, string>;
  registries: Record<string, string>;
}

async function readJson(path: string): Promise<Record<string, unknown> | null> {
  try { return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

function validateSourceRoot(value: string) {
  if (/^[\\/]|^[A-Za-z]:|(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value)) throw Error("sourceRoot must be a relative directory inside your project.");
  return value.replace(/^\.\//, "").replace(/\/$/, "") || ".";
}

async function sourceRoot(cwd: string): Promise<string> {
  const config = await readJson(join(cwd, "tsconfig.json"));
  const compiler = config?.compilerOptions as { paths?: Record<string, string[]> } | undefined;
  const base = findAtAliasBase(compiler?.paths);
  if (!base) throw Error('No "@/*" path in tsconfig.json. Run init with --src <source-directory>, and configure the same alias in your app.');
  return validateSourceRoot(base);
}

export async function readProjectConfig(cwd: string): Promise<ProjectConfig> {
  const own = await readJson(join(cwd, "ui.config.json"));
  if (own) {
    if (own.version !== 1 || typeof own.sourceRoot !== "string" || !own.aliases || typeof own.aliases !== "object") throw Error("Invalid ui.config.json. Expected version, sourceRoot and aliases from bydiorama-ui init.");
    return { sourceRoot: validateSourceRoot(own.sourceRoot), aliases: own.aliases as Record<string, string>, registries: { "@bydiorama": DEFAULT_REGISTRY, ...(own.registries as Record<string, string> | undefined) } };
  }
  const legacy = await readJson(join(cwd, "components.json"));
  if (!legacy?.aliases) throw Error("Run bydiorama-ui init first, or supply an existing shadcn components.json.");
  return { sourceRoot: await sourceRoot(cwd), aliases: legacy.aliases as Record<string, string>, registries: { "@bydiorama": DEFAULT_REGISTRY, ...(legacy.registries as Record<string, string> | undefined) } };
}

/** Creates only the owned config. Existing app configuration and source stay intact. */
export async function initProject(cwd: string, src?: string): Promise<{ created: boolean; config: ProjectConfig }> {
  if (await readJson(join(cwd, "ui.config.json"))) return { created: false, config: await readProjectConfig(cwd) };
  const legacy = await readJson(join(cwd, "components.json"));
  const config: ProjectConfig = {
    sourceRoot: src !== undefined ? validateSourceRoot(src) : await sourceRoot(cwd),
    aliases: { ui: "@/ui", lib: "@/lib", hooks: "@/hooks", styles: "@/styles", ...(legacy?.aliases as Record<string, string> | undefined) },
    registries: { "@bydiorama": DEFAULT_REGISTRY, ...(legacy?.registries as Record<string, string> | undefined) },
  };
  try { await writeFile(join(cwd, "ui.config.json"), JSON.stringify({ version: 1, ...config }, null, 2) + "\n", { flag: "wx" }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return { created: false, config: await readProjectConfig(cwd) }; throw error; }
  return { created: true, config };
}
