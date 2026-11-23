/**
 * Every element that names a type role renders that role's weight, leading
 * and tracking — measured, in every story (ADR 0020 §3).
 *
 * `TYPE_ROLES` carried a weight, leading and tracking per role for months
 * and nothing applied them: components chose their own per call site, and
 * about 49 of 137 disagreed with the table on weight alone. The maintainer
 * decided on 2026-09-24 that the TABLE is the truth, and the Tailwind
 * emitter now hangs each attribute on the size utility as a companion.
 *
 * What remains is the way it could drift back: an explicit `font-*`,
 * `leading-*` or `tracking-*` on the same element, which beats the
 * companion. A source scan cannot see all of those — a component's size map
 * and its base classes are separate strings, often a hundred lines apart,
 * and `cn()` joins them only at runtime. The computed style can. This reads
 * the role's own tokens off the element, so it holds inside a brand scope
 * too, and names the part that drifted.
 */

import { STEPPED_ROLES, TYPE_ROLES, type TypeRoleName } from "@bydiorama/tokens";

/** Every row of the table, read from it — a role added there is checked here
 *  without a second list to keep in step. */
const ROLES = Object.keys(TYPE_ROLES).map((token) => token.replace("--ui-text-", "")) as TypeRoleName[];

/**
 * The density-stepped roles (ADR 0026): `text-row` renders one table role at
 * default and another under compact, switched by `--ui-type-step`. Each is
 * held to the role it resolves to IN SCOPE — read off the element, so a
 * compact story is checked against the compact role.
 */
const STEPPED = Object.entries(STEPPED_ROLES) as [string, { default: TypeRoleName; compact: TypeRoleName }][];

type Attribute = "weight" | "leading" | "tracking";

/**
 * The declared deviations, by part and attribute — decided by the
 * maintainer on 2026-09-24 alongside "the table is the truth". Each is a
 * designed DIFFERENCE between parts that share a role, or a box height the
 * sheet pins, which following the table would erase. Same contract as
 * check:controls: one line, one reason. A part not named here follows its
 * role exactly.
 */
export const TYPE_ROLE_EXCEPTIONS: Record<string, Partial<Record<Attribute, string>>> = {
  "calendar-day": { weight: "A resting day sits one step under button-sm so the selected day, at the role's 600, reads heavier — selection is marked by weight as well as fill." },
  "calendar-month-option": { weight: "Resting one step under the role, as the day cells are, so the selected month reads heavier." },
  "calendar-year-option": { weight: "Resting one step under the role, as the day cells are, so the selected year reads heavier." },
  "sidebar-section-label": {
    weight: "The two nav levels share a size and an inset; the section heading is told apart from its items by weight (600 against body-lg's 500).",
    leading: "The sheet's 46px row is drawn at leading-normal; body-lg's 1.55 would make it 49px.",
  },
  "sidebar-item": { leading: "The sheet's 46px row is drawn at leading-normal; body-lg's 1.55 would make it 49px." },
  "sidebar-layer-title": { leading: "The layer title is a row like the items it heads, at the same leading-normal." },
  "sidebar-profile-name": {
    weight: "The name heads its row; at body-lg's 500 it would read lighter than the 600 email beneath it.",
    leading: "The profile is a rail row like the items below it, at the same leading-normal, so the rail keeps the sheet's heights.",
  },
  "modal-title": {
    weight: "A dialog title is 16px FIXED, so it is set in body-lg rather than the fluid title-sm (#51), at title-sm's 600 so it still heads the dialog.",
  },
  "chat-message-bubble": { leading: "The sender's voice is set tighter (1.35) than the receiver's 1.55 — the pair's signature at the same size." },
  textarea: { leading: "The box is rows × leading, and the sheet's 128px is drawn at leading-snug at every size." },
};

/** Sub-pixel slack: line-height and tracking are computed from a rem size
 *  and rounded by the engine, so equality is to half a pixel. */
const SLACK_PX = 0.5;

const describe = (el: Element) => {
  const slot = el.getAttribute("data-slot");
  return slot ? `<${el.tagName.toLowerCase()} data-slot="${slot}">` : `<${el.tagName.toLowerCase()} class="${el.className}">`;
};

export function typeRoleViolations(root: ParentNode = document.body): string[] {
  const out: string[] = [];
  const excused = (el: Element, attribute: Attribute) =>
    Boolean(TYPE_ROLE_EXCEPTIONS[el.getAttribute("data-slot") ?? ""]?.[attribute]);
  const targets: [utility: string, el: Element, role: TypeRoleName][] = [];
  for (const role of ROLES) {
    for (const el of root.querySelectorAll(`.text-${role}`)) targets.push([role, el, role]);
  }
  for (const [name, step] of STEPPED) {
    for (const el of root.querySelectorAll(`.text-${name}`)) {
      const compact = parseFloat(getComputedStyle(el).getPropertyValue("--ui-type-step")) >= 1;
      targets.push([name, el, compact ? step.compact : step.default]);
    }
  }
  for (const [utility, el, role] of targets) {
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    const want = {
      weight: parseFloat(style.getPropertyValue(`--ui-text-${role}-weight`)),
      leading: parseFloat(style.getPropertyValue(`--ui-text-${role}-leading`)),
      tracking: parseFloat(style.getPropertyValue(`--ui-text-${role}-tracking`)),
    };
    // No tokens in scope means no stylesheet, not a drift — nothing to say.
    if (Number.isNaN(want.weight)) continue;

    const weight = parseFloat(style.fontWeight);
    if (weight !== want.weight && !excused(el, "weight")) {
      out.push(`${describe(el)} is text-${utility} at weight ${weight}; the role (${role}) is ${want.weight}`);
    }
    const leading = style.lineHeight === "normal" ? Number.NaN : parseFloat(style.lineHeight);
    if (!(Math.abs(leading - size * want.leading) <= SLACK_PX) && !excused(el, "leading")) {
      out.push(`${describe(el)} is text-${utility} at line-height ${style.lineHeight}; the role (${role}) is ${want.leading} (${(size * want.leading).toFixed(2)}px)`);
    }
    const tracking = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing);
    if (!(Math.abs(tracking - size * want.tracking) <= SLACK_PX) && !excused(el, "tracking")) {
      out.push(`${describe(el)} is text-${utility} at letter-spacing ${style.letterSpacing}; the role (${role}) is ${want.tracking}em`);
    }
  }
  return out;
}
