/** Read/write for ui.lock.json — schema at schemas/ui.lock.schema.json. */

import { readFile, writeFile } from "node:fs/promises";

export interface LockedItem {
  revision: string;
  lockedAt: string;
  files: Record<string, string>;
}

export interface UiLock {
  registry: string;
  items: Record<string, LockedItem>;
}

const EMPTY_LOCK: UiLock = { registry: "", items: {} };

export async function readLockfile(path: string): Promise<UiLock> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_LOCK, items: {} };
    throw err;
  }
  const parsed = JSON.parse(raw) as UiLock;
  return { registry: parsed.registry ?? "", items: parsed.items ?? {} };
}

export async function writeLockfile(path: string, lock: UiLock): Promise<void> {
  const withSchema = {
    $schema: "https://github.com/bydiorama/ui/schemas/ui.lock.schema.json",
    ...lock,
  };
  await writeFile(path, `${JSON.stringify(withSchema, null, 2)}\n`, "utf8");
}
