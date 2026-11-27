# Tokens and themes

[← Back to the README](../../README.md)

Components style themselves with token utilities (`bg-surface`,
`text-ink-primary`, …), so the app needs the theme. Theme zero ships as a
registry item:

```bash
npx @bydiorama/ui add theme-zero-css
```

and is imported once, after Tailwind:

```css
@import "tailwindcss";
@import "./theme-zero.css";
```

**Tailwind must see the installed source — and normally already does.**
Components style themselves with utilities, which Tailwind v4 only emits for
class names it finds by scanning files. Its automatic detection scans the
project root — Vite's `root` with `@tailwindcss/vite`, the working directory
for the PostCSS plugin and the CLI — and skips `node_modules`, anything your
`.gitignore` excludes, binaries and CSS. The CLI installs into `src/ui`,
`src/lib` and `src/hooks` (your `components.json` aliases), which is inside
that root and not ignored, so **a standard app needs no `@source` line**.
Measured with Tailwind 4.3.5's scanner on the first consumer: all 40 installed
files were scanned without its three `@source` lines. Add one only when
detection cannot reach the files, pointing at the folder relative to the
stylesheet:

| Situation | Fix |
| --- | --- |
| The install folder is git-ignored (a generated or vendored path) | `@source "../ui";` — an explicit `@source` is scanned even when ignored |
| The source lives outside the root: a monorepo package, a shared folder, a sibling checkout | `@source "../../../packages/ui";` (this repo's Storybook does exactly this for `registry/`) |
| The stylesheet narrows the base: `@import "tailwindcss" source("../app")` or `source(none)` | `@source` each folder the installed items land in |

The symptom of a miss is quiet: components render unstyled or half-styled,
and nothing errors. A utility built at runtime from a template string is
missed in every setup — that is why the library keeps class names literal.

A **brand** theme is the same file generated from the brand's seed: write a
`ThemeSeed` (a `.ts` module exporting it, or a `.json`), then let the CLI emit
the stylesheet — the same `@theme inline` map and token layer theme zero
ships, under a GENERATED header that names the command to regenerate it:

```bash
node --experimental-strip-types ../ui/packages/cli/bin/ui.ts theme \
  --cwd . --seed theme/brand.seed.ts --out src/styles/brand-theme.css
```

```css
@import "tailwindcss";
@import "./brand-theme.css";
```

Add the same command with `--check` to CI: it exits 1 when the committed CSS
no longer matches the seed (or the tokens it resolves through), the way
`pnpm check:theme-css` guards theme zero. `--scheme light|dark` forces a
scheme instead of following the OS. `@bydiorama/tokens` is unpublished, so
the command reads it from the checkout it runs from (or `--registry-path`);
there is no hand-written emitter script to keep in step any more. See
[`packages/cli/README.md`](../../packages/cli/README.md#theme---seed-file---out-css).

`typography.baseSize` is the scale's 16px reference, **not** the body size:
body copy is the 14px row, so `baseSize: 13` gives 11.375px body text. The
table is on `SeedTypography.baseSize`, and `theme` prints an `info` note for
anything under 15.
