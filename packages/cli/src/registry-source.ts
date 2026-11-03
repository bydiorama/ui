/**
 * Where `sync` reads a registry item's CURRENT content from — either a live
 * URL (the real, published path: `components.json`'s own `registries` entry
 * already points at `raw.githubusercontent.com/.../r/{name}.json`) or a
 * local checkout (for developing against a branch that hasn't merged to
 * `main` yet, which is the only way to test this against real in-flight
 * changes before this package is ever published).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface RegistryFile {
  target: string;
  content: string;
}

export interface RegistryItem {
  name: string;
  files: RegistryFile[];
  /** npm packages the item's source imports (name@range strings, from the
   *  manifest via `r/*.json`). `add` reports these; `sync` never needs them. */
  dependencies?: string[];
  /** Other registry items this one imports, as `@bydiorama/<name>` refs. */
  registryDependencies?: string[];
}

export type RegistrySource = (itemName: string) => Promise<RegistryItem | null>;

/** `base` is a URL template containing `{name}`, e.g. the exact string
 *  `components.json`'s `registries["@bydiorama"]` already carries. */
export function remoteRegistrySource(urlTemplate: string): RegistrySource {
  return async (itemName) => {
    const url = urlTemplate.replace("{name}", itemName);
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Fetching ${url} failed: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as RegistryItem;
    return parseRegistryItem(json);
  };
}

/** Both sources parse the same `r/*.json` shape; keep only what the CLI uses. */
function parseRegistryItem(json: RegistryItem): RegistryItem {
  return {
    name: json.name,
    files: json.files.map((f) => ({ target: f.target, content: f.content })),
    ...(json.dependencies ? { dependencies: json.dependencies } : {}),
    ...(json.registryDependencies ? { registryDependencies: json.registryDependencies } : {}),
  };
}

/** `checkoutPath` is the root of a local `bydiorama/ui` clone (i.e. it
 *  contains `r/`). */
export function localRegistrySource(checkoutPath: string): RegistrySource {
  return async (itemName) => {
    const path = join(checkoutPath, "r", `${itemName}.json`);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    const json = JSON.parse(raw) as RegistryItem;
    return parseRegistryItem(json);
  };
}

/**
 * Every item name the registry publishes, for `lock --all`.
 *
 * Local: the checkout's `registry.json`. Remote: the index sits next to the
 * `r/` directory the item template points into, so a template ending in
 * `/r/{name}.json` resolves to `/registry.json` beside it. Any other template
 * shape has no index this CLI can find — the caller names items instead.
 */
export async function listRegistryItems(source: { registryPath?: string; urlTemplate?: string }): Promise<string[]> {
  let raw: string;
  if (source.registryPath) {
    raw = await readFile(join(source.registryPath, "registry.json"), "utf8");
  } else if (source.urlTemplate && /\/r\/\{name\}\.json$/.test(source.urlTemplate)) {
    const url = source.urlTemplate.replace(/\/r\/\{name\}\.json$/, "/registry.json");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetching ${url} failed: ${res.status} ${res.statusText}`);
    raw = await res.text();
  } else {
    throw new Error("Cannot find the registry index for this --registry-url; name the items to lock instead of --all.");
  }
  const index = JSON.parse(raw) as { items: Array<{ name: string }> };
  return index.items.map((item) => item.name);
}
