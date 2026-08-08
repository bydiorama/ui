#!/usr/bin/env node
// Every named export in a story file must BE a story.
//
// Storybook's CSF indexer treats each named export as a story and calls it.
// A shared constant beside them — `export const PLACEHOLDER = "data:..."` —
// crashes `processCSFFile`, and the whole file fails to load in Storybook with
// a stack that names the indexer and never mentions the export. It shipped:
// AspectRatio's stories exported the placeholder image they all use.
//
// Nothing else caught it. `tsc` is happy, ESLint is happy, and the `stories`
// vitest project is happy too — addon-vitest imports the module and reads the
// exports it recognises, so a stray string is simply ignored there. Only a
// Storybook BUILD sees it, and a build is far too slow to be the feedback loop
// for "did I just export a constant".
//
// The rule is the repo's own convention, which every real story already
// follows: `export const Name: Story = {`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/** `export const Foo: Story = {` — the shape a story is written in here. */
const STORY = /^export\s+const\s+([A-Za-z0-9_]+)\s*:\s*Story\s*=/;
/** Any other named `export const`, which is the failure. */
const NAMED_EXPORT = /^export\s+const\s+([A-Za-z0-9_]+)/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const errors = [];
let files = 0;
let stories = 0;

for (const file of walk(join(ROOT, "registry"))) {
  if (!file.endsWith(".stories.tsx")) continue;
  const rel = relative(ROOT, file);
  files++;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (STORY.test(line)) {
      stories++;
      continue;
    }
    const named = NAMED_EXPORT.exec(line);
    if (!named) continue;
    errors.push(
      `${rel}: exports "${named[1]}", which is not typed \`: Story\`. Storybook's CSF ` +
        `indexer calls EVERY named export in a story file as a story, so this crashes ` +
        `processCSFFile and the whole file fails to load. Drop the \`export\` — a shared ` +
        `constant does not need one — or make it a real story.`,
    );
  }
}

if (errors.length) {
  console.error("Story files with exports that are not stories:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nEach one type-checks, lints, and passes the stories test project.");
  process.exit(1);
}

console.log(`stories ok — ${stories} story export(s) across ${files} file(s), no stray exports`);
