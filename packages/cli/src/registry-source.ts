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
    const json = (await res.json()) as { name: string; files: RegistryFile[] };
    return { name: json.name, files: json.files.map((f) => ({ target: f.target, content: f.content })) };
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
    const json = JSON.parse(raw) as { name: string; files: RegistryFile[] };
    return { name: json.name, files: json.files.map((f) => ({ target: f.target, content: f.content })) };
  };
}
