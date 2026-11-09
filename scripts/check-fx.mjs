#!/usr/bin/env node
// The effects layer is held to its own registry and its own rules (ADR 0022).
//
// `EFFECTS` in registry/lib/fx/fx.ts says what exists, what each effect is
// for and where it applies. Everything else — one stylesheet per effect, the
// layer stack in base.css, the shader programs and their recipes — is checked
// against it here, because the failure mode of a CSS effect is SILENCE: a
// class nothing styles, a layer nothing composes or a keyframe that ignores
// reduced motion all render the component exactly as it was, and no type,
// test or screenshot says so.
//
// What it cannot see is a stylesheet that sets a layer on a part the
// composer in base.css never paints: that needs a rendered component, and
// registry/lib/fx/fx.browser.test.tsx asserts every CSS effect visibly
// changes every component it lists.
//
// And the shader admission rule, on the sources: a shader paints only pixels
// it owns (no texture sampling — refraction failed exactly there, twice) and
// takes every input from a token. Rules three and four (the component is the
// floor; the ink keeps its contrast per pixel) need a browser and live in
// registry/lib/shader/shader.browser.test.tsx.
//
// Dependency-free like every gate in `verify`; run with
// --experimental-strip-types so it can read the registry from the source.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const FX = join(ROOT, "registry/lib/fx");
const SHADER = join(ROOT, "registry/lib/shader");

const { EFFECTS } = await import(join(FX, "fx.ts"));
const { SHADERS } = await import(join(SHADER, "shader-programs.ts"));
const { GLASS_LIGHT_UNDER_TEXT } = await import(join(ROOT, "packages/tokens/src/resolve.ts"));

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

/** Comments are not code (the lesson every gate here learned once). */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const stripTs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const read = (file) => readFileSync(file, "utf8");
const sheets = Object.fromEntries(
  readdirSync(FX)
    .filter((f) => f.endsWith(".css"))
    .map((f) => [f.replace(/\.css$/, ""), stripCss(read(join(FX, f)))]),
);
const shaderCss = stripCss(read(join(SHADER, "shader.css")));
const allCss = { ...Object.fromEntries(Object.entries(sheets).map(([k, v]) => [`fx/${k}.css`, v])), "shader.css": shaderCss };

// ------------------------------------------------------------ vocabulary

const names = Object.keys(EFFECTS);
const entry = sheets.fx ?? "";
const imported = new Set([...entry.matchAll(/@import\s+["']\.\/([\w-]+)\.css["']/g)].map((m) => m[1]));

for (const sheet of Object.keys(sheets)) {
  if (sheet === "fx") continue;
  if (!imported.has(sheet)) fail(`registry/lib/fx/${sheet}.css`, "is not imported by fx.css, so it never reaches a page.");
}
if (!imported.has("base")) fail("registry/lib/fx/fx.css", "must import base.css — the layer stack every effect composes into.");

for (const [name, spec] of Object.entries(EFFECTS)) {
  const where = `EFFECTS.${name}`;
  const css = spec.kind === "css" ? sheets[spec.sheet] : shaderCss;
  if (spec.kind === "css" && css === undefined) {
    fail(where, `names sheet "${spec.sheet}", and registry/lib/fx/${spec.sheet}.css does not exist.`);
    continue;
  }
  if (!new RegExp(`\\.fx-${name}(?![\\w-])`).test(css)) {
    fail(where, `no rule in its stylesheet styles .fx-${name}: fx("${name}") would do nothing.`);
  }
  // Every component it claims, its stylesheet (or its shader recipe) reaches.
  for (const target of spec.on) {
    if (target === "text" || target === "ground") continue;
    if (spec.kind === "css" && !css.includes(`[data-slot="${target}"]`)) {
      fail(where, `lists "${target}", and no selector in ${spec.sheet}.css reaches [data-slot="${target}"].`);
    }
  }
}

for (const [file, css] of Object.entries(allCss)) {
  for (const [, cls] of css.matchAll(/\.fx-([a-z][\w-]*)/g)) {
    if (!names.includes(cls)) {
      fail(file, `styles .fx-${cls}, which is not in EFFECTS — add it there (kind, sheet, job, on) or remove the rule.`);
    }
  }
}

// --------------------------------------------------------- the layer stack

const base = sheets.base ?? "";
const stack = base.match(/background-image:\s*([^;]+);/)?.[1] ?? "";
for (const [sheet, css] of Object.entries(sheets)) {
  for (const [, layer] of css.matchAll(/(--ui-fx-layer-[\w-]+)\s*:/g)) {
    if (!stack.includes(`var(${layer}`)) {
      fail(`registry/lib/fx/${sheet}.css`, `sets ${layer}, which base.css's stack never paints.`);
    }
    if (sheet === "base") continue;
    for (const [name, spec] of Object.entries(EFFECTS)) {
      if (spec.sheet !== sheet || !new RegExp(`\\.fx-${name}(?![\\w-])[^{]*\\{[^}]*${layer}`).test(css)) continue;
      if (!new RegExp(`\\.fx-${name}(?![\\w-])`).test(base)) {
        fail(`registry/lib/fx/base.css`, `the composer never matches .fx-${name}, so its ${layer} is never painted.`);
      }
    }
  }
}

// ------------------------------------------ cascade layer and reduced motion

/** Top-level statements and the at-rule chain each declaration sits in. */
function walkCss(css, onDeclaration, onTop) {
  const chain = [];
  let buf = "";
  for (const ch of css) {
    if (ch === "{") {
      const prelude = buf.trim();
      if (!chain.length) onTop(prelude);
      chain.push(prelude);
      buf = "";
    } else if (ch === "}") {
      if (buf.trim()) onDeclaration(buf.trim(), chain);
      chain.pop();
      buf = "";
    } else if (ch === ";") {
      const stmt = buf.trim();
      if (!chain.length) onTop(stmt);
      else onDeclaration(stmt, chain);
      buf = "";
    } else buf += ch;
  }
}

for (const [file, css] of Object.entries(allCss)) {
  walkCss(
    css,
    (decl, chain) => {
      if (/\b\d+ms\b/.test(decl) || /cubic-bezier\s*\(/.test(decl)) {
        fail(file, `\`${decl}\` — a literal duration or easing. Timing comes from --ui-duration-* / --ui-ease-* (ADR 0005).`);
      }
      if (/^transition\s*:\s*all\b/.test(decl)) fail(file, "transitions `all` (CONVENTIONS §6).");
      const anim = decl.match(/^animation\s*:\s*(.+)$/);
      if (anim && !/^(none|revert-layer|revert|initial|unset)$/.test(anim[1].trim())) {
        const guarded = chain.some((p) => /@media[^{]*prefers-reduced-motion\s*:\s*no-preference/.test(p));
        if (!guarded) {
          fail(file, `\`${decl}\` runs under prefers-reduced-motion. A keyframe carries its own timing — put it inside @media (prefers-reduced-motion: no-preference).`);
        }
      }
    },
    (top) => {
      if (!top) return;
      if (/^@(import|property|keyframes)\b/.test(top) || top === "@layer fx") return;
      fail(file, `\`${top.slice(0, 60)}\` sits outside @layer fx. Every rule of the layer is in it, so the app's unlayered CSS outranks an effect and revert-layer hands a property back to the component.`);
    },
  );
}

// ------------------------------------------------------ the admission rule

const programs = stripTs(read(join(SHADER, "shader-programs.ts")));
for (const banned of ["sampler2D", "texture(", "texelFetch", "textureSize"]) {
  if (programs.includes(banned)) {
    fail("registry/lib/shader/shader-programs.ts", `uses ${banned}. A shader paints only pixels it owns and reads nothing (ADR 0022, rule 1).`);
  }
}
const runtime = stripTs(read(join(SHADER, "shader.ts")));
for (const banned of ["createTexture", "texImage2D", "texSubImage2D", "copyTexImage2D", "readPixels", "u_backdrop"]) {
  if (runtime.includes(banned)) {
    fail("registry/lib/shader/shader.ts", `calls ${banned}. The runtime hands a shader no texture and reads nothing back from the GPU (ADR 0022, rule 1).`);
  }
}
for (const [name, def] of Object.entries(SHADERS)) {
  if (EFFECTS[name]?.kind !== "shader") fail(`SHADERS.${name}`, "has no shader entry in EFFECTS.");
  for (const [uniform, spec] of Object.entries(def.uniforms)) {
    const token = spec.color ?? spec.number;
    if (typeof token !== "string" || !token.startsWith("--")) {
      fail(`SHADERS.${name}.${uniform}`, "does not name a token. Every input is a token, read where the part sits (ADR 0022, rule 2).");
    }
  }
}

// Recipes, read from the source: shader.ts imports its programs through the
// consumer's `@/` alias, which a plain Node import cannot resolve.
const recipes = runtime.match(/SHADER_RECIPES[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
for (const [name, spec] of Object.entries(EFFECTS)) {
  if (spec.kind !== "shader") continue;
  if (!SHADERS[name]) fail(`EFFECTS.${name}`, "is a shader with no program in shader-programs.ts.");
  const block = recipes.match(new RegExp(`\\n\\s{2}${name}:\\s*\\{([\\s\\S]*?)\\n\\s{2}\\}`))?.[1];
  if (block === undefined) {
    fail(`EFFECTS.${name}`, "has no entry in SHADER_RECIPES.");
    continue;
  }
  for (const target of spec.on) {
    const key = target === "ground" ? '"\\*"' : `(?:${target}|"${target}")`;
    if (!new RegExp(`\\n\\s{4}${key}:`).test(block)) {
      fail(`EFFECTS.${name}`, `lists "${target}", and SHADER_RECIPES.${name} has no recipe for it.`);
    }
  }
}

// ------------------------------------------------- glass light under text

// The resolver builds the dark glass floor with GLASS_LIGHT_UNDER_TEXT; the
// glass stylesheet paints the light. The three layers that can sit under
// text, overlapping, must not add up to more than the floor assumed — or the
// audit clears a pane brighter than the one it measured.
const glass = sheets.glass ?? "";
const darkAlpha = (token) => {
  const m = glass.match(new RegExp(`${token}\\s*:\\s*light-dark\\([^,]+,\\s*rgb\\(255 255 255 / ([\\d.]+)\\)\\)`));
  return m ? Number(m[1]) : null;
};
const under = ["--ui-fx-glass-wash", "--ui-fx-glass-grade", "--ui-fx-glass-bloom"].map(darkAlpha);
if (under.some((a) => a === null)) {
  fail("registry/lib/fx/glass.css", "declares the light under text as something other than light-dark(…, rgb(255 255 255 / a)); this gate cannot hold it to the resolver.");
} else {
  const total = 1 - under.reduce((keep, a) => keep * (1 - a), 1);
  if (total > GLASS_LIGHT_UNDER_TEXT + 1e-9) {
    fail(
      "registry/lib/fx/glass.css",
      `the dark light under text (wash, grade, bloom) composites to ${total.toFixed(4)}, more than the ${GLASS_LIGHT_UNDER_TEXT} the resolver's glass floor assumes (packages/tokens/src/resolve.ts).`,
    );
  }
}

// ------------------------------------------------------------------ report

if (!existsSync(join(FX, "fx.css"))) fail("registry/lib/fx", "fx.css, the entry stylesheet, is missing.");

if (errors.length) {
  console.error(`check:fx — ${errors.length} problem(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `fx ok — ${names.length} effects (${names.filter((n) => EFFECTS[n].kind === "shader").length} shader), ` +
    `${Object.keys(allCss).length} stylesheets, admission rule holds on ${Object.keys(SHADERS).length} program(s)`,
);
