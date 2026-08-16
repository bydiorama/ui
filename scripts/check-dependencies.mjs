#!/usr/bin/env node
// Every third-party import must be declared by the item that ships the file.
//
// The registry distributes SOURCE. A consumer runs the CLI, receives
// `ui/modal.tsx`, and it imports `@base-ui-components/react` — a package their
// app has never heard of. Unless the registry item declares it, the CLI
// installs nothing and the file does not compile, leaving them to work out the
// dependency from a stack trace.
//
// This was not a design choice, and the manifest proves it: `cn` declared
// `clsx` and `tailwind-merge` correctly from the start, so the mechanism was
// understood. Seven items on the behaviour layer simply never got the same
// treatment, because nothing ever compared the imports to the declaration.
//
// The near miss that made it invisible: those items DID declare
// `peerDependencies`, listing `@base-ui-components/react` by name. It reads
// exactly like the problem is handled. But `peerDependencies` is not part of
// the shadcn registry-item schema and `lib/manifest.mjs` never emitted it — so
// the field was documentation that looked like configuration, which is worse
// than an empty one. This gate compares against what actually SHIPS.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readManifest } from "./lib/manifest.mjs";

/**
 * Never installed by the registry. Anything consuming a React component
 * library already has React, and pinning a version here would fight the
 * application's own.
 */
const ASSUMED = new Set(["react", "react-dom"]);

/** Only code declares dependencies. Prose that mentions a package does not. */
const CODE = /\.tsx?$/;

const IMPORT = /(?:from|import)\s+["']([^"']+)["']/g;

/**
 * Comments are not code — the fourth gate here to learn it.
 *
 * `check:utilities`, `check:controls` and `check:overlays` each strip comments
 * before matching, and this one did not, so ANY prose containing the word
 * `from` beside a quoted string read as an import. Skeleton's comment — the
 * pulse "separates `loading` from `empty`" — reported a missing dependency on
 * a package called `empty`, and the fix the message asked for was to declare
 * it in the manifest.
 *
 * The failure is worse than the noise suggests: it is unfixable from the
 * manifest, the message names a package that does not exist, and the only way
 * to make the build pass is to reword an accurate comment. A gate that cannot
 * tell prose from code teaches people to write worse comments.
 *
 * The `[^:]` guard on the line form is what keeps a `https://` inside a
 * comment from being read as the start of one.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** `@base-ui-components/react/dialog` → `@base-ui-components/react` */
function packageOf(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/** `griddy-icons@^0.2.0` → `griddy-icons` */
function nameOf(dependency) {
  const at = dependency.lastIndexOf("@");
  return at > 0 ? dependency.slice(0, at) : dependency;
}

const manifest = readManifest();

/**
 * `@/ui/calendar` → the item that installs to `ui/calendar.tsx`.
 *
 * The alias a distributed file imports is the CONSUMER's path, so the only
 * honest way to resolve it is through the install targets — which is also
 * what makes a target rename show up here rather than in someone's build.
 */
const byTarget = new Map();
for (const item of manifest.items) {
  for (const file of item.files ?? []) {
    if (!file.target) continue;
    byTarget.set(`@/${file.target.replace(/\.tsx?$/, "")}`, item.name);
  }
}

const errors = [];
let checked = 0;
let aliased = 0;

for (const item of manifest.items) {
  const declared = new Map((item.dependencies ?? []).map((d) => [nameOf(d), d]));
  const registry = new Set(item.registryDependencies ?? []);
  const imported = new Set();

  for (const file of item.files ?? []) {
    if (!CODE.test(file.path)) continue;
    const full = join(ROOT, file.path);
    if (!existsSync(full)) continue;
    const source = stripComments(readFileSync(full, "utf8"));
    for (const [, specifier] of source.matchAll(IMPORT)) {
      // Relative imports are files inside the item itself.
      if (specifier.startsWith(".")) continue;
      // An aliased import IS a registry item, and until this check existed
      // nothing verified it was declared: `@/` was skipped with a comment
      // saying "the alias ones are what registryDependencies is for", and
      // then nobody compared the two. A consumer who installs `date-picker`
      // without `calendar` receives a file importing a module they do not
      // have — the same failure this gate was written for, one namespace over.
      if (specifier.startsWith("@/")) {
        aliased++;
        const target = byTarget.get(specifier.replace(/\.tsx?$/, ""));
        if (!target) {
          errors.push(
            `${item.name}: imports "${specifier}", which is not any item's install target. ` +
              `A distributed file must import the path the CONSUMER will have — check the ` +
              `\`target\` fields in ui.manifest.json, not this repo's folder layout.`,
          );
        } else if (target !== item.name && !registry.has(target)) {
          errors.push(
            `${item.name}: imports "${specifier}" but does not list "${target}" in ` +
              `\`registryDependencies\`. Installing this item alone would deliver source ` +
              `that cannot resolve its own import.`,
          );
        }
        continue;
      }
      if (specifier.startsWith("@bydiorama/")) continue;
      const pkg = packageOf(specifier);
      if (!ASSUMED.has(pkg)) imported.add(pkg);
    }
  }
  checked++;

  for (const pkg of imported) {
    if (!declared.has(pkg)) {
      errors.push(
        `${item.name}: imports "${pkg}" but does not declare it. Anyone installing ` +
          `this item receives source that will not compile. Add it to \`dependencies\` ` +
          `in ui.manifest.json, with a version.`,
      );
    }
  }
  // A dependency that is declared and not imported gets installed into someone
  // else's app for no reason, and quietly outlives the code that needed it.
  for (const [pkg, spec] of declared) {
    if (!imported.has(pkg)) {
      errors.push(`${item.name}: declares "${spec}" but imports nothing from it. Remove it.`);
    }
  }
  // An unversioned dependency resolves to whatever is newest on the day of
  // install, which for a pre-1.0 package is a different API.
  for (const [pkg, spec] of declared) {
    if (nameOf(spec) === spec) {
      errors.push(`${item.name}: declares "${pkg}" with no version. Pin it.`);
    }
  }
}

if (errors.length) {
  console.error("Registry items that do not declare what they import:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nThe registry ships SOURCE. An undeclared import is a build error for the consumer.");
  process.exit(1);
}

console.log(
  `dependencies ok — ${checked} item(s), imports match declarations ` +
    `(${aliased} cross-item import(s) resolved against install targets)`,
);
