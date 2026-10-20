/**
 * Resolves a registry item's `target` to a real path in the consumer app,
 * relative to the consumer root. A target comes in one of two shapes, and the
 * shape is read off the string itself — never off the item's `type`, because
 * special-casing `skill` would break again for the next non-component type.
 *
 * - **Alias-shaped** (`ui/header.tsx`, `lib/cn.ts`, `hooks`): the first
 *   segment is a key into the consumer's `components.json` `aliases`, resolved
 *   through its `tsconfig.json` `@/*` mapping — the same two files the
 *   shadcn-compatible install step already reads. No new convention: this
 *   mirrors what `components.json` in service-portal already declares
 *   (`"ui": "@/components/ui"`, `"@/*": ["./src/*"]`).
 * - **Literal** (`.claude/skills/diorama-ui-craft/SKILL.md`, `~/public/x.css`):
 *   a path from the consumer root, used as-is. A target is literal when its
 *   first segment starts with `.` — no alias ever does, and dot-directories
 *   (`.claude/`, `.github/`) are exactly where tool config that is not app
 *   source lives — or when it starts with `~/`, shadcn's own explicit
 *   "from the project root" marker, for a root path with no leading dot.
 *
 * The split is by SHAPE, not by "was the first segment found in aliases":
 * falling back to literal on a miss would turn a typo'd alias (`iu/button.tsx`)
 * into a file silently written at the consumer root. So an alias-shaped target
 * that misses still throws `UnresolvableAliasError`, and only a target that
 * announces itself as literal skips the alias lookup.
 *
 * Every target, either shape, is checked for escaping the consumer root first:
 * a target is registry data, and `../` or an absolute path must not let it
 * read or write outside the app it is being installed into.
 */

export interface ComponentsJson {
  aliases: Record<string, string>;
}

/** Only the one entry we need. A consumer's tsconfig may have many `paths`;
 *  we require exactly `@/*` because that is the only alias form the
 *  registry's own `target` values assume. */
export function findAtAliasBase(tsconfigPaths: Record<string, string[]> | undefined): string | null {
  const entry = tsconfigPaths?.["@/*"]?.[0];
  if (!entry) return null;
  // "./src/*" -> "src"
  return entry.replace(/^\.\//, "").replace(/\/\*$/, "");
}

// Plain field assignments, not TS constructor-parameter properties: Node's
// strip-only type stripping (--experimental-strip-types) erases type
// annotations but cannot expand parameter-property sugar, which has real
// runtime semantics (auto-assigning `this.x = x`) rather than being purely
// erasable syntax.
export class UnresolvableAliasError extends Error {
  aliasKey: string;
  constructor(aliasKey: string) {
    super(
      `No alias "${aliasKey}" in components.json — cannot resolve this item's target path. ` +
        `If the target is meant as a literal path from the consumer root, it must start with "." (e.g. ".claude/...") or "~/".`,
    );
    this.name = "UnresolvableAliasError";
    this.aliasKey = aliasKey;
  }
}

export class UnsupportedAliasFormError extends Error {
  aliasValue: string;
  constructor(aliasValue: string) {
    super(
      `Alias resolves to "${aliasValue}", which is not of the form "@/...". ` +
        `This CLI only understands the @/* -> ./src/* convention; extend resolveTargetPath if a consumer uses another.`,
    );
    this.name = "UnsupportedAliasFormError";
    this.aliasValue = aliasValue;
  }
}

/** A target that would resolve outside the consumer root, or to the root
 *  itself. Thrown before any alias lookup, for both target shapes. */
export class UnsafeTargetPathError extends Error {
  target: string;
  constructor(target: string, reason: string) {
    super(`Refusing registry target "${target}": ${reason}. Targets must stay inside the consumer app.`);
    this.name = "UnsafeTargetPathError";
    this.target = target;
  }
}

export type TargetShape = "literal" | "alias";

/** Which of the two shapes (see the module comment) a target is. Pure string
 *  inspection: it does not consult `aliases`, so a typo'd alias is still
 *  `"alias"` and still fails loudly at resolution. */
export function targetShape(target: string): TargetShape {
  if (target.startsWith("~/")) return "literal";
  return target.startsWith(".") ? "literal" : "alias";
}

/** Reject absolute paths and any `..` segment; return the target's segments
 *  with `~/` and `.` segments dropped. Both separators are split on, so a
 *  `..\` cannot slip past a check that only knows `/`. */
function safeSegments(target: string): string[] {
  if (target === "") throw new UnsafeTargetPathError(target, "it is empty");
  if (/^[\\/]/.test(target) || /^[A-Za-z]:/.test(target)) {
    throw new UnsafeTargetPathError(target, "it is an absolute path");
  }
  const body = target.startsWith("~/") ? target.slice(2) : target;
  const segments = body.split(/[\\/]/).filter((s) => s !== "" && s !== ".");
  if (segments.includes("..")) throw new UnsafeTargetPathError(target, 'it contains a ".." segment');
  if (segments.length === 0) throw new UnsafeTargetPathError(target, "it resolves to the consumer root itself");
  return segments;
}

/**
 * Alias-shaped:
 * `resolveTargetPath("ui/header.tsx", { ui: "@/components/ui" }, "src")`
 * -> `"src/components/ui/header.tsx"`.
 *
 * Literal:
 * `resolveTargetPath(".claude/skills/diorama-ui-craft/SKILL.md", aliases, "src")`
 * -> `".claude/skills/diorama-ui-craft/SKILL.md"` (no alias consulted).
 *
 * The result is always relative to the consumer root.
 */
export function resolveTargetPath(target: string, aliases: Record<string, string>, atAliasBase: string): string {
  const segments = safeSegments(target);

  if (targetShape(target) === "literal") return segments.join("/");

  const [aliasKey, ...rest] = segments as [string, ...string[]];
  const aliasValue = Object.hasOwn(aliases, aliasKey) ? aliases[aliasKey] : undefined;
  if (!aliasValue) throw new UnresolvableAliasError(aliasKey);
  if (!aliasValue.startsWith("@/")) throw new UnsupportedAliasFormError(aliasValue);

  const resolvedAlias = `${atAliasBase}/${aliasValue.slice(2)}`;
  return rest.length ? `${resolvedAlias}/${rest.join("/")}` : resolvedAlias;
}
