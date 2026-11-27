# Lint the boundaries

[← Back to the README](../../README.md)

The library's own import rules — griddy-icons only, no second component
library, CSS-first motion (CONVENTIONS §7–8) — ship as an ESLint flat-config
preset, so the app is held to them too:

```bash
npx @bydiorama/ui add eslint-preset
```

```js
// eslint.config.mjs
import tseslint from "typescript-eslint";
import diorama from "./eslint.diorama.mjs";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...diorama, // after the presets it should override
);
```

It is plain objects with no plugin. If your config also sets
`no-restricted-imports`, ESLint keeps only the LAST object's options — merge
instead, from the exported `restrictedImports.paths` and `.patterns`. Add
package names to `paths`, never to `patterns`: patterns match like
`.gitignore`, so `"motion"` there also catches `@/lib/motion`, which every
installed component imports.

## Check it against the design

Install the `visual-diff` item and the `ui` agent plugin. The plugin's
`ui:visual-review` skill diffs the running app against 1× exports of the
design's frames and components with that script, and teaches the agent to
read the result. `ui:app-motion` covers motion beyond what the components
already do.
