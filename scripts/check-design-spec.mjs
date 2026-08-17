#!/usr/bin/env node
// The sheet side of design validation: are the numbers in a design spec
// internally consistent, and is anything actually asserting them?
//
// This is half a gate on purpose. It can prove the SHEET obeys its own laws;
// it cannot prove the component does, because the component's geometry does
// not exist until a browser lays it out. The other half is
// `registry/visual/geometry.browser.test.tsx`, which runs the same laws over
// measured rects. This file's third check exists to keep the two halves
// joined — a spec whose cases nothing renders is a file of numbers that
// asserts nothing, and would read in review exactly like one that does.
//
// WHY A SPEC AND NOT A SCREENSHOT. Tabs' track shipped a 2px inset against the
// sheet's 3px, and `h-8` turned that into 3px on the sides and 4px top and
// bottom. Nothing caught it: the visual baselines were green (its own header
// admits a small element can change ENTIRELY under the mismatch floor), the
// browser suite asserted behaviour, and the source read as symmetric. It was
// found by a person zooming in. The design's numbers had been in Paper the
// whole time and nothing in this repo could read them.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";
import { evaluate, sides, formatFailures, LAW_NAMES } from "./lib/geometry-laws.mjs";

const SPEC_DIR = join(ROOT, "design/paper/specs");
const RENDER_TEST = join(ROOT, "registry/visual/geometry.browser.test.tsx");

const errors = [];

if (!existsSync(SPEC_DIR)) {
  console.log("design-spec ok — no specs yet");
  process.exit(0);
}

const specFiles = readdirSync(SPEC_DIR).filter((f) => f.endsWith(".geometry.json")).sort();
const renderSource = existsSync(RENDER_TEST) ? readFileSync(RENDER_TEST, "utf8") : "";

if (specFiles.length && !renderSource) {
  errors.push(
    `${specFiles.length} spec(s) exist but registry/visual/geometry.browser.test.tsx does not. ` +
      `Nothing measures the implementation, so every number below is decoration.`,
  );
}

let caseCount = 0;

for (const file of specFiles) {
  const where = `design/paper/specs/${file}`;
  let spec;
  try {
    spec = JSON.parse(readFileSync(join(SPEC_DIR, file), "utf8"));
  } catch (e) {
    errors.push(`${where}: not valid JSON — ${e.message}`);
    continue;
  }

  if (!spec.item) errors.push(`${where}: missing "item"`);
  if (!spec.source?.url) errors.push(`${where}: source.url must deep-link the artboard, so the numbers can be re-derived rather than trusted`);
  if (!Array.isArray(spec.cases) || !spec.cases.length) {
    errors.push(`${where}: needs at least one case`);
    continue;
  }

  const tolerance = spec.tolerance ?? 0.5;
  const declaredNames = new Set();

  for (const c of spec.cases) {
    caseCount++;
    const label = `${where} › ${c.name ?? "(unnamed)"}`;

    if (!c.name) { errors.push(`${label}: a case needs a name`); continue; }
    if (declaredNames.has(c.name)) errors.push(`${label}: duplicate case name`);
    declaredNames.add(c.name);

    if (!c.slots?.container || !c.slots?.child) {
      errors.push(`${label}: slots.container and slots.child name the data-slots the render side measures`);
    }
    if (!c.nodes?.container || !c.nodes?.children?.length) {
      errors.push(`${label}: nodes.container and nodes.children carry the Paper ids — without them no number here can be re-derived`);
    }
    if (!Array.isArray(c.laws) || !c.laws.length) {
      errors.push(`${label}: a case with no laws asserts nothing. Known: ${LAW_NAMES.join(", ")}`);
      continue;
    }

    // Every law is either declared or refused with a reason. A law that is
    // simply absent is indistinguishable from one nobody thought of, and that
    // is precisely how `concentric-radius` went unenforced on a component
    // whose own comment said it did not close.
    for (const name of LAW_NAMES) {
      if (c.laws.includes(name)) continue;
      if (!c.lawsNotDeclared?.[name]) {
        errors.push(
          `${label}: does not declare "${name}" and gives no reason. ` +
            `Add it to laws, or say why it does not bind this case in lawsNotDeclared.`,
        );
      }
    }
    for (const name of Object.keys(c.lawsNotDeclared ?? {})) {
      if (c.laws.includes(name)) errors.push(`${label}: "${name}" is both declared and excused`);
      if (!LAW_NAMES.includes(name)) errors.push(`${label}: excuses unknown law "${name}"`);
    }

    const sheet = c.sheet;
    if (!sheet?.container || !sheet?.children?.length || !sheet?.gaps) {
      errors.push(`${label}: sheet needs container, children and gaps`);
      continue;
    }

    // The gaps must come from Paper's LAID-OUT coordinates, not from its
    // declared padding — otherwise `uniform-inset` is checking the spec author's
    // arithmetic against itself and can never fail. The tell is a gap that
    // exactly equals border+padding on all four sides while the frame's own
    // extent disagrees, so `track-is-the-sum-of-its-parts` is what catches a
    // spec transcribed from the styles panel instead of the canvas.
    const figure = {
      axis: c.axis ?? "horizontal",
      container: {
        width: sheet.container.width,
        height: sheet.container.height,
        padding: sides(sheet.container.padding),
        border: sides(sheet.container.border),
        radius: sheet.container.radius ?? null,
      },
      gap: sheet.gap ?? 0,
      children: sheet.children,
      gaps: sheet.gaps,
    };

    const failures = evaluate(figure, c.laws, tolerance);
    if (failures.length) {
      errors.push(
        formatFailures(
          `${label}: the SHEET does not obey the laws it declares — the design is wrong here, ` +
            `or the numbers were transcribed rather than measured`,
          failures,
        ),
      );
    }

    // The join. A `name: "x"` in the render test is how a case gets measured;
    // no match means this case is inert.
    if (renderSource && !renderSource.includes(`"${c.name}"`)) {
      errors.push(
        `${label}: no case named "${c.name}" in registry/visual/geometry.browser.test.tsx. ` +
          `The spec is not asserted against anything.`,
      );
    }
  }

  for (const d of spec.deviations ?? []) {
    if (!declaredNames.has(d.case)) {
      errors.push(`${where}: deviation names case "${d.case}", which does not exist`);
    }
    if ((d.why ?? "").length < 40) {
      errors.push(`${where}: deviation on "${d.case}" needs the reason spelled out, not asserted`);
    }
  }
}

if (errors.length) {
  console.error("Design geometry specs:\n");
  for (const e of errors) console.error(`  - ${e}\n`);
  process.exit(1);
}

console.log(
  `design-spec ok — ${specFiles.length} spec(s), ${caseCount} case(s), ` +
    `${LAW_NAMES.length} laws, all joined to the render-side test`,
);
