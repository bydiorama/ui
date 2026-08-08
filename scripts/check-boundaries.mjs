#!/usr/bin/env node
// The behaviour layer stays swappable (ADR 0012 / ADR 0002).
//
// Two rules, both of which lint and types cannot express on their own:
//
//   1. Only a component's own implementation file may import the behaviour
//      layer. A doc file, a hook, or `lib/` reaching for it means the
//      dependency has stopped being an implementation detail of one component
//      and started being load-bearing for the library.
//
//   2. No behaviour-layer identifier may appear in an EXPORTED type. The
//      moment `export interface DialogProps extends BaseDialog.Props` exists,
//      every consumer's code is typed against someone else's library and the
//      layer can no longer be swapped without a breaking change — which is
//      the entire promise ADR 0002 makes.
//
// This gate is written before its first violation is possible, on purpose: by
// the time a Base UI type has leaked into a public signature, removing it is a
// breaking change rather than a code review comment.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/** Package prefixes that are behaviour mechanics, not our API. */
const BEHAVIOUR_PACKAGES = [
  "@base-ui",
  "@radix-ui",
  "radix-ui",
  "@react-aria",
  "@react-stately",
  "react-aria",
  "react-stately",
  "@floating-ui",
  "@zag-js",
  "@ark-ui",
];

const isBehaviour = (specifier) =>
  BEHAVIOUR_PACKAGES.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`));

/**
 * A component's own implementation file: `registry/ui/<name>/<name>.tsx`.
 * Everything else in the tree is off limits.
 */
function mayImportBehaviour(rel) {
  const match = rel.match(/^registry\/ui\/([^/]+)\/([^/]+)\.tsx$/);
  return Boolean(match) && match[1] === match[2];
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** `import X, { a as b, type C } from "pkg"` → the local names it binds. */
function importedNames(clause) {
  const names = [];
  const defaultOrNamespace = clause.match(/^\s*(?:type\s+)?([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultOrNamespace) names.push(defaultOrNamespace[1]);
  const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespace) names.push(namespace[1]);
  const braced = clause.match(/\{([^}]*)\}/);
  if (braced) {
    for (const part of braced[1].split(",")) {
      const local = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
      if (local) names.push(local.trim());
    }
  }
  return names.filter(Boolean);
}

/** Exported type positions: the declarations a consumer's code binds against. */
const EXPORTED_TYPE = /export\s+(?:declare\s+)?(?:type\s+\w+\s*(?:<[^=]*>)?\s*=|interface\s+\w+[^{]*\{)/g;

function exportedTypeBodies(source) {
  const bodies = [];
  for (const match of source.matchAll(EXPORTED_TYPE)) {
    const start = match.index;
    if (source.slice(match.index, match.index + match[0].length).includes("interface")) {
      // Interfaces: the heading (which carries `extends`) plus the braced body.
      let depth = 0;
      let i = source.indexOf("{", start);
      const open = i;
      for (; i < source.length; i++) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}" && --depth === 0) break;
      }
      bodies.push(source.slice(start, open) + source.slice(open, i + 1));
    } else {
      // Type aliases: to the end of the statement.
      const end = source.indexOf(";", start);
      bodies.push(source.slice(start, end === -1 ? source.length : end));
    }
  }
  return bodies;
}

const errors = [];
let scanned = 0;

for (const file of walk(join(ROOT, "registry"))) {
  const rel = relative(ROOT, file).split("\\").join("/");
  const source = readFileSync(file, "utf8");
  scanned++;

  const bound = new Set();
  for (const match of source.matchAll(/import\s+([\s\S]*?)\s*from\s*["']([^"']+)["']/g)) {
    if (!isBehaviour(match[2])) continue;

    if (!mayImportBehaviour(rel)) {
      errors.push(
        `${rel}: imports the behaviour layer ("${match[2]}"). Only a component's own ` +
          `implementation file (registry/ui/<name>/<name>.tsx) may — ADR 0012.`,
      );
    }
    for (const name of importedNames(match[1])) bound.add(name);
  }

  if (bound.size === 0) continue;

  for (const body of exportedTypeBodies(source)) {
    for (const name of bound) {
      if (new RegExp(`\\b${name}\\b`).test(body)) {
        errors.push(
          `${rel}: exported type references "${name}" from the behaviour layer. ` +
            `Public signatures are ours alone (ADR 0002) — restate the props you accept, ` +
            `or derive from React's own DOM types.`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error("Behaviour-layer boundary violations:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nThe layer is swappable only while nothing public depends on it.");
  process.exit(1);
}

console.log(`boundaries ok — ${scanned} registry file(s), no behaviour-layer leaks`);
