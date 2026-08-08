/**
 * Resolves a registry item's `target` (e.g. `ui/header.tsx`, shadcn-shaped)
 * to a real path in the consumer app, using that app's own `components.json`
 * `aliases` plus its `tsconfig.json` `@/*` mapping — the same two files the
 * shadcn-compatible install step already reads. No new convention: this
 * mirrors what `components.json` in service-portal already declares
 * (`"ui": "@/components/ui"`, `"@/*": ["./src/*"]`).
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
    super(`No alias "${aliasKey}" in components.json — cannot resolve this item's target path.`);
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

/**
 * `resolveTargetPath("ui/header.tsx", { ui: "@/components/ui" }, "src")`
 * -> `"src/components/ui/header.tsx"`.
 */
export function resolveTargetPath(target: string, aliases: Record<string, string>, atAliasBase: string): string {
  const slash = target.indexOf("/");
  const aliasKey = slash === -1 ? target : target.slice(0, slash);
  const rest = slash === -1 ? "" : target.slice(slash + 1);

  const aliasValue = aliases[aliasKey];
  if (!aliasValue) throw new UnresolvableAliasError(aliasKey);
  if (!aliasValue.startsWith("@/")) throw new UnsupportedAliasFormError(aliasValue);

  const resolvedAlias = `${atAliasBase}/${aliasValue.slice(2)}`;
  return rest ? `${resolvedAlias}/${rest}` : resolvedAlias;
}
