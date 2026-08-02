// Shared manifest loading + registry generation.
//
// Kept dependency-free on purpose: every check in this repo must run in a cold
// clone with no `node_modules`, so CI (and an agent picking the repo up for the
// first time) can verify state before installing anything.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MANIFEST_PATH = join(ROOT, "ui.manifest.json");
export const REGISTRY_PATH = join(ROOT, "registry.json");
export const ITEM_DIR = join(ROOT, "r");

/** Manifest item types → the `registry:*` types the generated registry uses. */
export const ITEM_TYPES = ["ui", "lib", "hook", "block", "theme", "file", "style"];

export function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error("ui.manifest.json not found — this repo cannot describe itself.");
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

/** Namespaced name a consumer types: `@bydiorama/button`. */
export function qualifiedName(manifest, itemName) {
  return `${manifest.name}/${itemName}`;
}

/**
 * The registry index. Metadata only — no file contents — so it stays small
 * enough to fetch on every `add`, and so an agent can list what exists without
 * pulling every component's source.
 */
export function buildIndex(manifest) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: manifest.name,
    homepage: manifest.homepage,
    items: manifest.items.map((item) => ({
      name: item.name,
      type: `registry:${item.type}`,
      description: item.description,
      ...(item.dependencies?.length ? { dependencies: item.dependencies } : {}),
      ...(item.registryDependencies?.length
        ? { registryDependencies: item.registryDependencies.map((d) => qualifiedName(manifest, d)) }
        : {}),
      files: item.files.map((f) => ({ path: f.path, type: `registry:${item.type}`, target: f.target })),
    })),
  };
}

/**
 * A single item with file contents inlined — what a CLI actually installs.
 * Served as `r/<name>.json`.
 */
export function buildItem(manifest, item) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: item.name,
    type: `registry:${item.type}`,
    description: item.description,
    ...(item.dependencies?.length ? { dependencies: item.dependencies } : {}),
    ...(item.registryDependencies?.length
      ? { registryDependencies: item.registryDependencies.map((d) => qualifiedName(manifest, d)) }
      : {}),
    files: item.files.map((f) => ({
      path: f.path,
      type: `registry:${item.type}`,
      target: f.target,
      content: readFileSync(join(ROOT, f.path), "utf8"),
    })),
  };
}

/** Every generated artifact, as a path → JSON-text map. */
export function buildAll(manifest) {
  const out = new Map();
  out.set(REGISTRY_PATH, `${JSON.stringify(buildIndex(manifest), null, 2)}\n`);
  for (const item of manifest.items) {
    out.set(join(ITEM_DIR, `${item.name}.json`), `${JSON.stringify(buildItem(manifest, item), null, 2)}\n`);
  }
  return out;
}
