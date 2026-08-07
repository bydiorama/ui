import test from "node:test";
import assert from "node:assert/strict";

import {
  findAtAliasBase, resolveTargetPath, UnresolvableAliasError, UnsupportedAliasFormError,
} from "./target-path.ts";

const ALIASES = { ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" };

test("resolves a real target the way service-portal's components.json actually does", () => {
  assert.equal(resolveTargetPath("ui/header.tsx", ALIASES, "src"), "src/components/ui/header.tsx");
  assert.equal(resolveTargetPath("lib/chrome-control.ts", ALIASES, "src"), "src/lib/chrome-control.ts");
});

test("a bare alias with no rest path resolves to just the alias directory", () => {
  assert.equal(resolveTargetPath("hooks", ALIASES, "src"), "src/hooks");
});

test("throws a named error for an alias components.json does not declare", () => {
  assert.throws(() => resolveTargetPath("unknown/thing.ts", ALIASES, "src"), UnresolvableAliasError);
});

test("throws a named error when the alias is not the @/... form this CLI understands", () => {
  assert.throws(
    () => resolveTargetPath("weird/thing.ts", { weird: "../outside/thing" }, "src"),
    UnsupportedAliasFormError,
  );
});

test("findAtAliasBase reads tsconfig's @/* -> ./src/* the way service-portal's does", () => {
  assert.equal(findAtAliasBase({ "@/*": ["./src/*"] }), "src");
});

test("findAtAliasBase returns null when there is no @/* path at all", () => {
  assert.equal(findAtAliasBase({ "@other/*": ["./other/*"] }), null);
  assert.equal(findAtAliasBase(undefined), null);
});
