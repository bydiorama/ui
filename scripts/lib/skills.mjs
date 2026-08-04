// Shared skill discovery, for the validator and the sync build.
//
// One source of truth: every skill in this repo lives in `registry/skills/`.
// The manifest — not the folder — decides which ones ship, exactly as it does
// for components (stories and tests live under `registry/` and are never
// distributed). `.claude/skills/` is GENERATED from this tree so the agents
// working in this repo load the same text the repo publishes.
//
// Dependency-free, like every other check here: it must run in a cold clone.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readManifest } from "./manifest.mjs";

export const SKILL_SOURCE_DIR = join(ROOT, "registry/skills");
export const SKILL_INSTALL_DIR = join(ROOT, ".claude/skills");

/** Distributed skills are namespaced; a consumer's .claude/skills is shared. */
export const DISTRIBUTED_PREFIX = "diorama-";

/**
 * Minimal YAML front matter reader — key: value pairs only, which is all the
 * skill contract allows. A real YAML parser would be a dependency, and a skill
 * that needs nested front matter has outgrown being a single file.
 */
export function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) return null;
  const end = source.indexOf("\n---", 3);
  if (end === -1) return null;

  const fields = {};
  for (const line of source.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const at = line.indexOf(":");
    if (at === -1) continue;
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { fields, body: source.slice(end + 4) };
}

/** Every skill on disk, joined to whether the manifest distributes it. */
export function readSkills() {
  if (!existsSync(SKILL_SOURCE_DIR)) return [];
  const manifest = readManifest();

  // manifest item name → item, for the skills the manifest declares.
  const distributed = new Map(
    (manifest.items ?? []).filter((i) => i.type === "skill").map((i) => [i.name, i]),
  );

  return readdirSync(SKILL_SOURCE_DIR)
    .filter((dir) => statSync(join(SKILL_SOURCE_DIR, dir)).isDirectory())
    .sort()
    .map((dir) => {
      const path = join(SKILL_SOURCE_DIR, dir, "SKILL.md");
      const source = existsSync(path) ? readFileSync(path, "utf8") : null;
      return {
        dir,
        path,
        relPath: `registry/skills/${dir}/SKILL.md`,
        source,
        parsed: source ? parseFrontmatter(source) : null,
        item: distributed.get(dir) ?? null,
        isDistributed: distributed.has(dir),
      };
    });
}

/**
 * Where a skill lands in `.claude/skills/`. Distributed skills use their
 * namespaced front-matter name — the SAME directory a consumer installs into,
 * so this repo dogfoods the exact path it publishes.
 */
export function installName(skill) {
  return skill.parsed?.fields.name ?? skill.dir;
}
