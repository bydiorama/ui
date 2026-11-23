/**
 * The installable theme stylesheet: one file an app imports once, after
 * `@import "tailwindcss";`, holding the Tailwind v4 `@theme inline` map AND
 * the token layer it maps utilities onto.
 *
 * Composed in ONE place because two things write it: `scripts/build-theme-css.mjs`
 * for theme zero (the `theme-zero-css` registry item) and `bydiorama-ui theme`
 * for a brand seed. Each used to hand-assemble the same three calls; a brand
 * stylesheet that differs from theme zero's in anything but its values is a
 * second dialect of the same file.
 */

import type { ResolvedPair } from "../resolve.ts";
import { toCss, type ColorScheme } from "./css.ts";
import { toTailwindTheme } from "./tailwind.ts";

export interface StylesheetOptions {
  /** Lines of the leading comment block, without the ` * ` gutter. An empty
   *  string is a blank comment line. Say there what generated the file and
   *  how to regenerate it — the reader has nothing else to go on. */
  header: readonly string[];
  /** Passed to `toCss`. `auto` follows the visitor's OS; the others force it. */
  scheme?: ColorScheme;
}

export function toThemeStylesheet(pair: ResolvedPair, options: StylesheetOptions): string {
  return [
    "/*",
    ...options.header.map((line) => (line === "" ? " *" : ` * ${line}`)),
    " */",
    "",
    toTailwindTheme(),
    "",
    toCss(pair, { scope: ":root", scheme: options.scheme ?? "auto" }),
  ].join("\n");
}
