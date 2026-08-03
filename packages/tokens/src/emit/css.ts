/**
 * CSS emitter.
 *
 * Schemes are expressed with `light-dark()` rather than a duplicated block
 * behind a media query, so switching is one `color-scheme` declaration and a
 * themed scope nested inside another cannot half-apply. The author's choice of
 * scheme (a brand that deliberately ships dark must not be inverted by a
 * visitor's OS setting) is expressed by *forcing* `color-scheme` rather than by
 * emitting different tokens.
 */

import { BRANDABLE_TOKENS } from "../contract.ts";
import { FIXED_TOKEN_VALUES, REDUCED_MOTION_OVERRIDES, SCHEME_TOKEN_VALUES } from "../base.ts";
import type { ResolvedPair } from "../resolve.ts";

export type ColorScheme = "light" | "dark" | "auto";

export interface CssOptions {
  /** Selector the variables are bound to. `:root` for the app's own theme,
   *  `[data-ui-theme="acme"]` for a brand scope. */
  scope?: string;
  /** Author's choice. `auto` follows the visitor's OS; the others force it. */
  scheme?: ColorScheme;
  /** Emit the non-brandable base tokens too. False when writing a brand scope
   *  nested inside a document that already has them. */
  includeBase?: boolean;
  indent?: string;
}

const declaration = (name: string, value: string, indent: string) => `${indent}${name}: ${value};`;

/** `light-dark(a, b)` — collapsed to a single value when both schemes agree,
 *  which keeps output readable and diffs meaningful. */
function pairValue(light: string, dark: string): string {
  return light === dark ? light : `light-dark(${light}, ${dark})`;
}

export function toCss(pair: ResolvedPair, options: CssOptions = {}): string {
  const scope = options.scope ?? ":root";
  const scheme = options.scheme ?? "auto";
  const includeBase = options.includeBase ?? true;
  const indent = options.indent ?? "  ";

  const lines: string[] = [`${scope} {`];

  lines.push(
    declaration(
      "color-scheme",
      scheme === "auto" ? "light dark" : scheme,
      indent,
    ),
  );

  if (includeBase) {
    lines.push("", `${indent}/* Structural — identical in every theme. */`);
    for (const [name, value] of Object.entries(FIXED_TOKEN_VALUES)) {
      lines.push(declaration(name, value, indent));
    }
    lines.push("", `${indent}/* Scheme-varying, brand-invariant. */`);
    for (const [name, value] of Object.entries(SCHEME_TOKEN_VALUES)) {
      lines.push(declaration(name, pairValue(value.light, value.dark), indent));
    }
  }

  lines.push("", `${indent}/* Theme. */`);
  for (const token of BRANDABLE_TOKENS) {
    lines.push(declaration(token, pairValue(pair.light[token], pair.dark[token]), indent));
  }

  lines.push("}");

  if (includeBase) {
    lines.push(
      "",
      "@media (prefers-reduced-motion: reduce) {",
      `${indent}${scope} {`,
    );
    for (const [name, value] of Object.entries(REDUCED_MOTION_OVERRIDES)) {
      lines.push(declaration(name, value, indent + indent));
    }
    lines.push(`${indent}}`, "}");
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Inline-style map for a themed scope rendered server-side.
 *
 * `light-dark()` needs `color-scheme` on the same element, which React's style
 * prop can carry — so a brand scope needs no `<style>` tag and no serialisation
 * of untrusted values into raw CSS. That removes the injection surface the
 * previous generation had to defend with a value filter.
 */
export function toStyleObject(pair: ResolvedPair, scheme: ColorScheme = "auto"): Record<string, string> {
  const style: Record<string, string> = {
    colorScheme: scheme === "auto" ? "light dark" : scheme,
  };
  for (const token of BRANDABLE_TOKENS) {
    style[token] = pairValue(pair.light[token], pair.dark[token]);
  }
  return style;
}
