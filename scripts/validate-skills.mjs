#!/usr/bin/env node
// The skill authoring contract (ledger/decisions/0013).
//
// A skill is loaded into an agent's context by its DESCRIPTION alone — the
// body is only read once the description has already won. So the description
// is not documentation, it is the trigger, and a skill with a vague one is a
// skill that never fires. Nothing but a check can hold that line: the failure
// mode is silence, not an error.

import { existsSync } from "node:fs";
import { readSkills, installName, DISTRIBUTED_PREFIX } from "./lib/skills.mjs";
import { readManifest, ROOT } from "./lib/manifest.mjs";
import { join } from "node:path";

const errors = [];
const skills = readSkills();
const seenNames = new Set();

if (skills.length === 0) errors.push("registry/skills/ has no skills — the source tree is missing");

for (const skill of skills) {
  const where = `registry/skills/${skill.dir}`;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill.dir)) {
    errors.push(`${where}: directory must be kebab-case`);
  }
  if (skill.source === null) {
    errors.push(`${where}: no SKILL.md — a skill directory with no skill in it`);
    continue;
  }
  if (!skill.parsed) {
    errors.push(`${where}: missing or malformed YAML front matter (must open with '---')`);
    continue;
  }

  const { name, description } = skill.parsed.fields;

  if (!name) {
    errors.push(`${where}: front matter needs a "name"`);
  } else if (seenNames.has(name)) {
    errors.push(`${where}: duplicate skill name "${name}"`);
  } else {
    seenNames.add(name);
  }

  // The name rule encodes WHY the two tiers differ: a distributed skill lands
  // in a consumer's .claude/skills alongside every other vendor's, so it is
  // namespaced. An authoring skill is only ever loaded here, so it is not.
  if (name) {
    const expected = skill.isDistributed ? `${DISTRIBUTED_PREFIX}${skill.dir}` : skill.dir;
    if (name !== expected) {
      errors.push(
        `${where}: front-matter name is "${name}" but must be "${expected}" — ` +
          (skill.isDistributed
            ? "distributed skills are namespaced, because a consumer's .claude/skills is shared ground"
            : "an authoring skill's name is its directory"),
      );
    }
  }

  if (!description) {
    errors.push(`${where}: front matter needs a "description" — it is the only thing an agent reads when deciding whether to load the skill`);
  } else {
    if (description.length < 80) {
      errors.push(
        `${where}: description is ${description.length} chars. Too short to route on — ` +
          `say what it does AND when to use it (aim for 150-500).`,
      );
    }
    if (description.length > 900) {
      errors.push(`${where}: description is ${description.length} chars — over 900 it stops being a trigger and becomes the skill`);
    }
    if (!/\buse\s+(when|whenever|this|for|before|after)\b/i.test(description)) {
      errors.push(
        `${where}: description has no trigger clause. Include "Use when …" — a description ` +
          `that only says what the skill IS will not fire when it is needed.`,
      );
    }
  }

  // Distributed skills must actually be installable.
  if (skill.isDistributed) {
    const target = skill.item.files?.[0]?.target;
    const expected = `.claude/skills/${name}/SKILL.md`;
    if (target !== expected) {
      errors.push(`${where}: manifest install target is "${target}", must be "${expected}"`);
    }
    if (skill.item.files?.length !== 1) {
      errors.push(`${where}: a distributed skill ships exactly one SKILL.md`);
    }
  }
}

// A skill declared in the manifest with no source directory would generate a
// registry item pointing at nothing.
for (const item of readManifest().items ?? []) {
  if (item.type !== "skill") continue;
  if (!existsSync(join(ROOT, `registry/skills/${item.name}/SKILL.md`))) {
    errors.push(`manifest item "${item.name}": type is "skill" but registry/skills/${item.name}/SKILL.md does not exist`);
  }
}

if (errors.length) {
  console.error("Skill contract violations:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSee ledger/decisions/0013-skills.md and the create-skill skill.");
  process.exit(1);
}

const distributed = skills.filter((s) => s.isDistributed).length;
console.log(
  `skills ok — ${skills.length} skill(s): ${distributed} distributed, ` +
    `${skills.length - distributed} authoring-only ` +
    `(${skills.map(installName).join(", ")})`,
);
