/**
 * The consumer ESLint preset, linted against fixture imports.
 *
 * Two directions, both of which have failed in a real app: a foreign import
 * that must be caught, and a Diorama import that must NOT be — the first
 * consumer's `patterns: ["motion"]` also matched `@/lib/motion`, which every
 * installed component imports, so the rule fired on the library itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";

// A computed specifier keeps tsc from demanding a declaration for the .mjs;
// the preset is plain JS precisely so a consumer needs no build for it.
const presetUrl = new URL("./eslint.diorama.mjs", import.meta.url).href;
const { default: preset, restrictedImports } = (await import(presetUrl)) as {
  default: Linter.Config[];
  restrictedImports: { paths: { name: string }[]; patterns: { group: string[] }[] };
};

const linter = new Linter({ configType: "flat" });

function lint(specifier: string, filename = "src/app.tsx") {
  const config: Linter.Config[] = [
    { languageOptions: { ecmaVersion: "latest", sourceType: "module" } },
    ...preset,
  ];
  // Plain JS so espree parses it; the rule only looks at the specifier.
  return linter
    .verify(`import x from ${JSON.stringify(specifier)};\nexport default x;\n`, config, filename.replace(/\.tsx?$/, ".js"))
    .filter((m) => m.ruleId === "no-restricted-imports");
}

const BLOCKED = [
  "lucide-react",
  "@heroicons/react",
  "@heroicons/react/24/outline",
  "@radix-ui/react-icons",
  "react-icons/fa",
  "@phosphor-icons/react",
  "@tabler/icons-react",
  "@fortawesome/free-solid-svg-icons",
  "@radix-ui/react-dialog",
  "@mui/material",
  "@mui/material/Button",
  "@chakra-ui/react",
  "@headlessui/react",
  "@mantine/core",
  "antd",
  "antd/es/button",
  "react-bootstrap",
  "react-aria-components",
  "framer-motion",
  "motion",
  "motion/react",
  "motion/react-client",
  "gsap",
];

const ALLOWED = [
  "griddy-icons",
  "@base-ui/react",
  "@base-ui/react/dialog",
  "motion/mini",
  "react",
  // Diorama's own installed source: the gitignore-style trap.
  "@/lib/motion",
  "@/lib/cn",
  "@/ui/button",
  "@/hooks/use-controllable-state",
  // An app's own folders that happen to share a package's name.
  "@/components/antd",
  "./motion",
  "../icons/lucide-react",
  "@/lib/motion/react",
];

for (const specifier of BLOCKED) {
  test(`blocks ${specifier}`, () => {
    const hits = lint(specifier);
    assert.equal(hits.length, 1, `expected exactly one report for "${specifier}", got ${hits.length}`);
    assert.ok(hits[0]!.message.length > 40, "the message explains the boundary, not just the name");
  });
}

for (const specifier of ALLOWED) {
  test(`allows ${specifier}`, () => {
    assert.deepEqual(lint(specifier).map((m) => m.message), []);
  });
}

test("no bare package name hides in patterns (gitignore matches it at any depth)", () => {
  for (const { group } of restrictedImports.patterns) {
    for (const entry of group) {
      const body = entry.replace(/^!/, "");
      assert.ok(/^[^/]+\/./.test(body), `pattern "${entry}" has no slash in the middle — put the package in paths`);
    }
  }
});

test("applies to every script extension an app lints", () => {
  for (const file of ["a.js", "a.jsx", "a.mjs", "a.cjs"]) {
    const hits = linter
      .verify(`import x from "lucide-react";\nexport default x;\n`, [{ languageOptions: { sourceType: "module" } }, ...preset], `src/${file}`)
      .filter((m) => m.ruleId === "no-restricted-imports");
    assert.equal(hits.length, 1, file);
  }
});
