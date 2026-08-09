/**
 * Tailwind v4 `@theme inline` emitter.
 *
 * `inline` matters: it makes Tailwind emit `background-color: var(--ui-bg-base)`
 * rather than resolving the value at build time. Utilities therefore keep
 * pointing at the live custom property, so a brand scope (`[data-ui-theme]`)
 * re-binding `--ui-*` re-skins every utility with no rebuild. A non-inline
 * theme would bake theme zero's hexes into the stylesheet and silently defeat
 * the whole Brand Theme mechanism.
 *
 * Naming: the `--ui-*` contract is role-first (`--ui-bg-surface`), Tailwind is
 * utility-first (`bg-surface`). Emitting `--color-bg-surface` would produce
 * `bg-bg-surface`, so each family is remapped to read correctly at the call
 * site — that mapping is this file's only real decision, and it is total:
 * every brandable colour token gets exactly one utility name.
 */

import { BRANDABLE_TOKENS, FIXED_TOKENS, SCHEME_ONLY_TOKENS, type BrandableToken } from "../contract.ts";

/** Dimension/composite tokens whose prefixes collide with colour families.
 *  Mapping these into `--color-*` would mint utilities like `bg-nav-width` —
 *  a colour whose value is `17rem`. */
const NOT_COLORS = new Set<string>([
  "--ui-border-width",
  "--ui-focus-ring",
  "--ui-nav-width",
  "--ui-nav-rail-width",
]);

/** `--ui-bg-surface` → `bg-surface`; `--ui-text-muted` → `text-ink-muted`. */
function utilityName(token: BrandableToken): string | null {
  const name = token.replace(/^--ui-/, "");

  if (NOT_COLORS.has(token)) return null;
  // Type SIZES share the --ui-text-* prefix with ink COLOURS. Sizes are
  // enumerated because only they belong in Tailwind's --text-* namespace.
  if (TYPE_SIZE_ROLES.has(token)) return null;

  if (name.startsWith("bg-")) return `--color-${name.slice(3)}`;
  if (name.startsWith("text-")) return `--color-ink-${name.slice(5)}`;
  // Distinct contract tokens must get distinct utility names. These two once
  // both produced `--color-edge-focus`, so the second silently overwrote the
  // first — invisible while theme zero gives them equal values, and a silent
  // loss for any brand that moves them apart.
  if (name === "focus-ring-color") return "--color-focus-ring";
  if (name.startsWith("border-")) return `--color-edge-${name.slice(7)}`;
  // `intent-danger-bg` → `bg-danger-subtle`, not `bg-danger-bg`. The role
  // vocabulary says "bg" because the token is a background; the utility
  // already says it, so repeating it reads as a stutter at the call site.
  if (name.startsWith("intent-")) {
    const role = name.slice(7);
    return `--color-${role
      .replace(/-bg-hover$/, "-subtle-hover")
      .replace(/-bg$/, "-subtle")
      .replace(/-fg$/, "")}`;
  }
  if (name.startsWith("data-")) return `--color-${name}`;
  // The nav family is remapped like every other one, for the reason in this
  // file's header: passing it through produced `bg-nav-bg` and `text-nav-ink`,
  // which stutter. Nothing consumed these roles until Sidebar, so the omission
  // had never surfaced.
  if (name.startsWith("nav-")) {
    if (name === "nav-bg") return "--color-nav";
    if (name === "nav-hover-bg") return "--color-nav-hover";
    if (name === "nav-active-bg") return "--color-nav-active";
    if (name === "nav-border") return "--color-edge-nav";
    if (name === "nav-ink") return "--color-ink-nav";
    if (name === "nav-active-ink") return "--color-ink-nav-active";
    if (name.startsWith("nav-ink-")) return `--color-ink-nav-${name.slice(8)}`;
    return `--color-${name}`;
  }
  return null;
}

const TYPE_SIZE_ROLES = new Set<string>(
  BRANDABLE_TOKENS.filter((t) =>
    /^--ui-text-(display|title|body|label|caption|button)/.test(t),
  ),
);

const SHAPE_NAMESPACES: Array<[prefix: string, namespace: string]> = [
  ["--ui-radius-", "--radius-"],
  ["--ui-shadow-", "--shadow-"],
  ["--ui-font-", "--font-"],
];

export interface TailwindOptions {
  indent?: string;
  /** Emit the ramp primitives too. Off by default: components must reach for
   *  semantic roles, and an available `bg-blue-80` utility is an invitation
   *  not to (CONVENTIONS §6). */
  includePalette?: boolean;
}

export function toTailwindTheme(options: TailwindOptions = {}): string {
  const indent = options.indent ?? "  ";
  const lines: string[] = ["@theme inline {"];

  const push = (comment: string, entries: Array<[string, string]>) => {
    lines.push("", `${indent}/* ${comment} */`);
    for (const [name, value] of entries) lines.push(`${indent}${name}: ${value};`);
  };

  const colors: Array<[string, string]> = [];
  for (const token of BRANDABLE_TOKENS) {
    const utility = utilityName(token);
    if (utility) colors.push([utility, `var(${token})`]);
  }
  // The scrim varies with the scheme but never with the brand, so it lives in
  // SCHEME_ONLY_TOKENS and was emitted as CSS with no utility. A component
  // wanting it had to write the arbitrary `bg-(--ui-scrim)` form, which
  // `check:utilities` skips by design — leaving it unverified. Modal is the
  // first component to need one. The other scheme-only tokens drive
  // `::selection` from CSS and want no utility.
  if ((SCHEME_ONLY_TOKENS as readonly string[]).includes("--ui-scrim")) {
    colors.push(["--color-scrim", "var(--ui-scrim)"]);
  }
  push("Colour roles.", colors);

  push(
    "Type scale.",
    [...TYPE_SIZE_ROLES].map((t) => [`--text-${t.replace("--ui-text-", "")}`, `var(${t})`]),
  );

  for (const [prefix, namespace] of SHAPE_NAMESPACES) {
    const entries = BRANDABLE_TOKENS.filter((t) => t.startsWith(prefix)).map(
      (t) => [`${namespace}${t.slice(prefix.length)}`, `var(${t})`] as [string, string],
    );
    if (entries.length) push(`${namespace.replace(/-/g, "")} namespace.`, entries);
  }

  // The nav widths are DIMENSIONS that live in the colour-prefixed nav family,
  // so `utilityName` correctly refuses them and they had no utility at all —
  // the same gap `--ui-scrim` had before Modal. Sidebar is the first component
  // to need them, so they enter the spacing namespace: `w-nav`, `w-nav-rail`.
  //
  // The dialog widths join them for a sharper reason. Tailwind v4 resolves
  // `max-w-<name>` against `--container-*` and falls back to `--spacing-*`;
  // this system emits no container scale and names its spacing steps `md`/`lg`
  // — so `max-w-md` compiled to a 12px cap and Modal's two sizes rendered
  // identically. A purpose-named token cannot be confused for a spacing step,
  // and `check:utilities` now refuses the bare ones outright.
  push("Chrome dimensions.", [
    ["--spacing-nav", "var(--ui-nav-width)"],
    ["--spacing-nav-rail", "var(--ui-nav-rail-width)"],
    ["--spacing-dialog-md", "var(--ui-dialog-width-md)"],
    ["--spacing-dialog-lg", "var(--ui-dialog-width-lg)"],
  ]);

  push(
    "Spacing — the base scale only; stack/inline/inset intents stay CSS-side.",
    FIXED_TOKENS.filter((t) => /^--ui-space-(xs|sm|md|lg|xl|2xl|3xl|4xl)$/.test(t)).map(
      (t) => [`--spacing-${t.replace("--ui-space-", "")}`, `var(${t})`] as [string, string],
    ),
  );

  push(
    "Typography attributes.",
    FIXED_TOKENS.filter((t) => /^--ui-(weight|leading|tracking)-/.test(t)).map((t) => {
      const [, family, name] = t.match(/^--ui-(weight|leading|tracking)-(.+)$/)!;
      const ns = family === "weight" ? "--font-weight-" : family === "leading" ? "--leading-" : "--tracking-";
      return [`${ns}${name}`, `var(${t})`] as [string, string];
    }),
  );

  lines.push("}");
  return `${lines.join("\n")}\n`;
}
