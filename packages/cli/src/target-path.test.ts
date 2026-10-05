import test from "node:test";
import assert from "node:assert/strict";

import {
  findAtAliasBase, resolveTargetPath, targetShape,
  UnresolvableAliasError, UnsafeTargetPathError, UnsupportedAliasFormError,
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

// ── Literal targets (#12) ────────────────────────────────────────────────────

test("a skill's dot-directory target is literal: resolved from the consumer root, no alias consulted", () => {
  // The exact target ui-craft ships, which check:skills pins to
  // `.claude/skills/<name>/SKILL.md`. Before, ".claude" was looked up as an
  // alias and every lock/sync of a skill threw UnresolvableAliasError.
  const target = ".claude/skills/diorama-ui-craft/SKILL.md";
  assert.equal(targetShape(target), "literal");
  assert.equal(resolveTargetPath(target, ALIASES, "src"), target);
  // Not the @/* base either — a skill is not app source.
  assert.equal(resolveTargetPath(target, {}, "app"), target);
});

test("`~/` marks a root path with no leading dot as literal (shadcn's own convention)", () => {
  assert.equal(targetShape("~/public/fonts/aspekta/aspekta.css"), "literal");
  assert.equal(resolveTargetPath("~/public/fonts/aspekta/aspekta.css", ALIASES, "src"), "public/fonts/aspekta/aspekta.css");
  assert.equal(resolveTargetPath("./notes/README.md", ALIASES, "src"), "notes/README.md");
});

test("an alias target is unchanged by the literal rule", () => {
  assert.equal(targetShape("ui/header.tsx"), "alias");
  assert.equal(resolveTargetPath("ui/header.tsx", ALIASES, "src"), "src/components/ui/header.tsx");
});

test("a typo'd alias still fails loudly rather than falling back to a literal path", () => {
  // Falling back on a miss would write `iu/button.tsx` at the consumer root
  // with every check green. Only a target that LOOKS literal skips the lookup.
  assert.equal(targetShape("iu/button.tsx"), "alias");
  assert.throws(() => resolveTargetPath("iu/button.tsx", ALIASES, "src"), UnresolvableAliasError);
  // A root path without a leading dot is alias-shaped, and the error says how
  // to mark it literal instead.
  assert.throws(() => resolveTargetPath("public/fonts/x.css", ALIASES, "src"), /must start with "\." .* or "~\/"/);
});

test("an alias key is an own property, never something inherited from Object.prototype", () => {
  assert.throws(() => resolveTargetPath("constructor/x.ts", ALIASES, "src"), UnresolvableAliasError);
});

test("a target that would escape the consumer root is rejected, in either shape", () => {
  for (const target of [
    "../outside.ts",
    ".claude/../../outside.md",
    "ui/../../../etc/passwd",
    "~/../outside",
    ".claude\\..\\..\\outside.md",
    "/etc/passwd",
    "\\server\\share\\x",
    "C:/Windows/x",
    "~/",
    ".",
    "",
  ]) {
    assert.throws(() => resolveTargetPath(target, ALIASES, "src"), UnsafeTargetPathError, `expected ${JSON.stringify(target)} to be rejected`);
  }
});

test("the traversal check runs before the alias lookup, so an escape never reads as a typo", () => {
  assert.throws(() => resolveTargetPath("nope/../../x", ALIASES, "src"), UnsafeTargetPathError);
});
