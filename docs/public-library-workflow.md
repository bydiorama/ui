# Keeping the public library in step

`apps/site` is the public reader for the library’s existing sources. It is
an Astro static site with React islands importing registry components in
place. There is no separately maintained component catalog.

## Add or change a component

Follow `registry/skills/add-component/SKILL.md`. The public part is:

1. Write the typed `*.doc.ts`, including `lead`: a short public explanation
   of what the component does. Keep internal history in the detailed summary.
2. Register `category` and `docs` in `ui.manifest.json`. Categories are the
   closed list in `scripts/lib/site.mjs`. Stable and experimental UI items
   and blocks appear publicly; experimental status is shown explicitly.
3. Rebuild the registry, record the ledger entry, and update the contrast
   report if its inputs changed.
4. Run `pnpm site:data`, then `pnpm verify`, `pnpm type-check`, `pnpm lint`
   and `pnpm site:build`.

The data generator joins the manifest, typed docs, registry, contrast report
and item ledger. It requires no dependencies and its `--check` mode is part
of `pnpm verify`. It includes a source hash, so an edit cannot silently leave
the public reference behind. Generated data is committed alongside the
registry; never edit it by hand.

The site creates the component reference, `.md` twin, gallery entry, search
entry, agent indexes and registry route automatically. Build checks assert
coverage against the manifest and resolve internal links and anchors. The
registry index is emitted beside the item files at `/r/registry.json`.

## What is automatic, and what still needs design

Documentation and registration are automatic. Interactive examples are
authored compositions. The initial site has a featured subset; remaining
items still get a complete reference and a gallery entry. Add a specimen by
importing the real registry source into the site, then expose that same
type-checked file to its code view. Files live at
`apps/site/src/examples/<name>.tsx`; `Specimen.tsx` selects the composition
and the page reads that file verbatim. Never copy the component implementation
into `apps/site`. `check:site-source` checks that boundary.

`pnpm test:site` builds and runs Chromium against public pages in both
schemes, checks accessibility and overflow, and exercises the gallery,
search and appearance controls. Scheme tests compare computed color-scheme
and rendered ground under every brand, then reload the saved choice.
Checking a data attribute alone missed the emitted CSS overriding Light.
Responsive checks cover intact prop names, stacked mobile rows and aligned
navigation text. It does not claim the site’s measured
Core Web Vitals or complete the public-release gates in `PLAN.md`.

## Component references and installation

Keep HTML references to a preview (when authored), installation, API reference
and accessibility. Long prop notes and implementation notes disclose on demand;
full reasoning remains in Markdown. No per-component changelog. Desktop tables
have fixed lanes; phone rows stack Type and Default under the prop. Both
navigation columns share a left edge for headings and rows.

Appearance uses registry Button, Popover, RadioGroup and Switch. Keep choices
visible in the panel. The stylesheet's explicit scheme rules must remain at
the same cascade level as emitted themes, and win regardless of the brand.

Installation defaults to the owned CLI. `prepare:site` packs its compiled JS
and includes the tarball in the site's downloads. Filename and commands read
the package version, never a copied release number. `init --src src` creates
`ui.config.json`; an existing shadcn configuration remains supported. The
alternate shadcn tab documents namespace setup. Run `pnpm test:cli-package`
after changing installation or packaging. Npm publication remains in PLAN;
do not advertise the short npm command as working before release.

## Copy and design

The philosophy comes from Jakub’s [Codrops article](https://tympanus.net/codrops/2026/11/01/design-systems-agents/):
people direct and review; agents help with structured work; each correction
can improve the shared system. Use plain, concrete language. Explain what
someone can do and where a component stops. Keep taste and judgment with
the person using the system.

Do not put changing component totals, test totals or contrast-pair totals
in public copy, category labels or footers, even when they are generated.
Fixture values in examples and values being edited in a theme are different:
they explain a control rather than advertise the size of the library.

The [Paper page](https://app.paper.design/file/01M5D1CCKC5MQZ9JZJ83G954CR/p-5-0)
contains the design direction and its responsive and scheme variants.
The initial implementation follows its type scale, spacing and gallery
surfaces; future playground and example routes remain in the release plan.

## Build and release

Use `pnpm site:dev` locally and `pnpm site:build` for static output at
`apps/site/dist`. Fonts and their OFL notice are copied from the registry by
the preparation step. Alias maps come from manifest install targets, so new
items do not need another Vite or TypeScript list.

This branch prepares a local site. It does not publish npm packages, change
DNS, deploy hosting or change the canonical registry address. Until the
public release, the CLI and shadcn alternative both read the working
GitHub registry. Main-branch CI rebuilds the public site from source; a
hosting deployment should run the same `pnpm site:build` command. Deployment
configuration and the remaining release gates are tracked in `PLAN.md`.
