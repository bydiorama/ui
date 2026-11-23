import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `data-slot.types.test.tsx` proves no exported component accepts a caller's
 * `data-slot` — but only for the modules it imports. A component added
 * without an import there would be unchecked while the type test stayed
 * green, which is the shape of every gate here that has reported success
 * while measuring nothing. So the import list is held to the tree.
 */
const here = dirname(fileURLToPath(import.meta.url));
const registry = join(here, "..");
const typesTest = readFileSync(join(here, "data-slot.types.test.tsx"), "utf8");

function implementationModules(): string[] {
  const out: string[] = [];
  for (const area of ["ui", "blocks"]) {
    const root = join(registry, area);
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const file of readdirSync(join(root, entry.name))) {
        if (!file.endsWith(".tsx") || /\.(stories|test|types\.test|browser\.test)\.tsx$/.test(file)) continue;
        out.push(join(root, entry.name, file));
      }
    }
  }
  return out;
}

test("the data-slot type test imports every implementation module", () => {
  const modules = implementationModules();
  assert.ok(modules.length > 50, `found only ${modules.length} modules — the walk is wrong, not the tree`);
  const missing = modules.filter((file) => {
    const rel = relative(here, file).split("\\").join("/");
    const spec = rel.startsWith(".") ? rel : `./${rel}`;
    return !typesTest.includes(`from "${spec}"`);
  });
  assert.deepEqual(
    missing.map((f) => relative(registry, f)),
    [],
    "add each to registry/ui/data-slot.types.test.tsx (an `import * as …Module` line and its `Modules` entry)",
  );
});

test("every imported module is also walked — an import without a Modules entry checks nothing", () => {
  for (const [, name, spec] of typesTest.matchAll(/^import \* as (\w+) from "([^"]+)";$/gm)) {
    assert.ok(existsSync(join(here, spec!)), `${spec} does not exist`);
    assert.match(typesTest, new RegExp(`: typeof ${name};`), `${name} is imported but not in Modules`);
  }
});
