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

const ROLES = [
  "display-lg", "display-md", "title-lg", "title-md", "title-sm",
  "body-lg", "body-md", "body-sm", "label-md", "label-sm", "caption",
  "button-lg", "button-sm", "figure",
] as const;

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
  "chat-message-bubble": { leading: "The sender's voice is set tighter (1.35) than the receiver's 1.55 — the pair's signature at the same size." },
  "chart-tick": { weight: "Ticks are 12/16 at 400 (Chart Anatomy sheet): the scale recedes so the marks and the 600 values carry the weight. The sheet proposes a data-tick role; until it exists this is the declared difference." },
  "chart-legend-label": { weight: "Legend names sit at the ticks' 400, one step under the 600 title, so the key reads as reference rather than as a heading (Chart Anatomy sheet)." },
  "chart-tooltip-label": { weight: "A tooltip row's series name is 400 beside its 600 value, so the number is what the eye lands on (Chart Anatomy sheet)." },
  "diagram-edge-label": { weight: "An edge's predicate is label-sm at 400, muted, so the 600 node labels it runs between stay what the eye lands on; an active edge's label returns to the role's 600 (Diagram sheet, Edge label)." },
  "diagram-node-description": { weight: "A node's second line is 12/16 at 400, muted, under its 600 label (Diagram sheet, Node)." },
  "diagram-list-note": { weight: "The list's group and \"No relations\" notes sit at the description's 400 under the 600 node name." },
  "network-edge-label": { weight: "An edge's predicate is label-sm at 400, muted, under the 600 node labels; on an active edge it returns to 600 (Network sheet, Edges)." },
  "knowledge-graph-explorer-verb": { weight: "A relation row's verb and its \"inferred\" tag are 400, muted, beside the 600 name they qualify (Network sheet, Explorer detail panel)." },
  "knowledge-graph-explorer-shown": { weight: "\"7 of 1,284 shown\" is a quiet status at 400, muted, at the end of the toolbar (Network sheet, Explorer toolbar)." },
  "knowledge-graph-explorer-count": { weight: "A count beside a type or a heading is 400, muted, so the 600 name stays the label (Network sheet, Explorer)." },
  "stat-label": { weight: "A tile's label is label-sm at 400, muted, so the 600 figure under it is what the eye lands on (Stat tiles and Chart card sheet)." },
  "stat-comparison": { weight: "The comparison (\"vs 1971\") is 400 beside the change's 600: the change is the reading, the comparison its reference." },
  "stat-empty": { weight: "\"No reading yet\" sits where the change line would, at the comparison's 400." },
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
  for (const role of ROLES) {
    for (const el of root.querySelectorAll(`.text-${role}`)) {
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
        out.push(`${describe(el)} is text-${role} at weight ${weight}; the role is ${want.weight}`);
      }
      const leading = style.lineHeight === "normal" ? Number.NaN : parseFloat(style.lineHeight);
      if (!(Math.abs(leading - size * want.leading) <= SLACK_PX) && !excused(el, "leading")) {
        out.push(`${describe(el)} is text-${role} at line-height ${style.lineHeight}; the role is ${want.leading} (${(size * want.leading).toFixed(2)}px)`);
      }
      const tracking = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing);
      if (!(Math.abs(tracking - size * want.tracking) <= SLACK_PX) && !excused(el, "tracking")) {
        out.push(`${describe(el)} is text-${role} at letter-spacing ${style.letterSpacing}; the role is ${want.tracking}em`);
      }
    }
  }
  return out;
}
