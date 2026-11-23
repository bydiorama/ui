#!/usr/bin/env node
// The skill authoring contract (ledger/decisions/0013, amended by 0027), and
// the `ui` agent plugin's manifests (0027).
//
// A skill is loaded into an agent's context by its DESCRIPTION alone — the
// body is only read once the description has already won. So the description
// is not documentation, it is the trigger, and a skill with a vague one is a
// skill that never fires. Nothing but a check can hold that line: the failure
// mode is silence, not an error.

import { existsSync, readFileSync } from "node:fs";
import {
  readSkills, installName, pluginTarget, PLUGIN_NAME, PLUGIN_MANIFEST, MARKETPLACE_MANIFEST,
} from "./lib/skills.mjs";
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

  // A skill's name is its directory, in both tiers. The plugin namespaces the
  // shipped ones (`ui:craft`), so a prefix of our own would be read twice —
  // and "ui" or "diorama" in the name says nothing the namespace does not.
  if (name && name !== skill.dir) {
    errors.push(`${where}: front-matter name is "${name}" but must be "${skill.dir}" — a skill's name is its directory`);
  }
  if (skill.isDistributed && /^(ui|diorama|bydiorama)-/.test(skill.dir)) {
    errors.push(`${where}: a shipped skill's directory must not start with "ui-", "diorama-" or "bydiorama-" — the plugin already shows it as ${PLUGIN_NAME}:<name>`);
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

  // A shipped skill's manifest entry names its SKILL.md and where the plugin
  // carries it. Reference files beside it travel with it (skills:build).
  if (skill.isDistributed) {
    const target = skill.item.files?.[0]?.target;
    const expected = pluginTarget(skill.dir);
    if (skill.item.files?.length !== 1 || target !== expected) {
      errors.push(`${where}: the manifest item must list one file, its SKILL.md, with target "${expected}" (got "${target}")`);
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

// The plugin's two hand-written manifests (ADR 0027). Both follow the rules of
// bydiorama/internal-skills and bydiorama/motion: no version, so installs
// follow main; the marketplace lists exactly this plugin, from its folder.
function readJson(path, label) {
  if (!existsSync(path)) { errors.push(`${label}: missing`); return null; }
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { errors.push(`${label}: not valid JSON — ${e.message}`); return null; }
}
const plugin = readJson(PLUGIN_MANIFEST, `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`);
if (plugin) {
  if (plugin.name !== PLUGIN_NAME) errors.push(`plugin.json: name must be "${PLUGIN_NAME}"`);
  if ("version" in plugin) errors.push("plugin.json: no `version` — without one, installs follow main (ADR 0027)");
  if (!plugin.description) errors.push("plugin.json: needs a description");
}
if (existsSync(join(ROOT, "plugins", PLUGIN_NAME, "bin"))) {
  errors.push(`plugins/${PLUGIN_NAME}/bin: no bin/ folder — claude.ai and Cowork refuse a plugin that has one (ADR 0027)`);
}
const marketplace = readJson(MARKETPLACE_MANIFEST, ".claude-plugin/marketplace.json");
if (marketplace) {
  const entry = (marketplace.plugins ?? []).find((p) => p.name === PLUGIN_NAME);
  if (!entry) errors.push(`marketplace.json: does not list the "${PLUGIN_NAME}" plugin`);
  else if (entry.source !== `./plugins/${PLUGIN_NAME}`) errors.push(`marketplace.json: "${PLUGIN_NAME}" source must be "./plugins/${PLUGIN_NAME}"`);
}

if (errors.length) {
  console.error("Skill contract violations:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSee ledger/decisions/0013-skills.md, 0027-agent-plugin.md and the create-skill skill.");
  process.exit(1);
}

const distributed = skills.filter((s) => s.isDistributed).length;
console.log(
  `skills ok — ${skills.length} skill(s): ${distributed} in the ${PLUGIN_NAME} plugin, ` +
    `${skills.length - distributed} authoring-only ` +
    `(${skills.filter((s) => !s.isDistributed).map(installName).join(", ")})`,
);
