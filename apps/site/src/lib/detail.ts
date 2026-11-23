import { catalog, type Item } from "./catalog";

/** A pure union of string literals ("a" | "b") is drawn as one chip per member. */
export function typeChips(type: string | undefined): string[] | null {
  if (!type) return null;
  const parts = type.split("|").map(part => part.trim());
  if (parts.length < 2) return null;
  const literals = parts.map(part => /^(["'])(.*)\1$/.exec(part)?.[2]);
  return literals.every((literal): literal is string => literal !== undefined) ? literals : null;
}

/** "Tab / Shift+Tab" is two keys, each its own keycap; "Enter (in a field)" keeps its aside beside the cap. */
export function keycaps(key: string): { key: string; note?: string }[] {
  return key.split(/\s*(?:\/|,)\s*(?![^(]*\))/).map(part => part.trim()).filter(Boolean).map(part => {
    const match = /^(.*?)\s*\((.*)\)$/.exec(part);
    return match ? { key: match[1]!, note: `(${match[2]})` } : { key: part };
  });
}

/** Defaults arrive as source ("\"md\""); the page shows the value, not the quoting. */
export function plainDefault(value: unknown): string {
  return typeof value === "string" ? value.replace(/^(["'])(.*)\1$/, "$2") : String(value ?? "—");
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-13" -> "13 Nov"; the year is added only when it is not this one. */
export function shortDate(iso: string, now = new Date()): string {
  const [year, month, day] = iso.split("-").map(Number);
  const label = `${day} ${months[(month ?? 1) - 1]}`;
  return year === now.getFullYear() ? label : `${label} ${year}`;
}

export const changeLabels: Record<string, string> = { addition: "New", fix: "Fix", visual: "Visual", token: "Token", decision: "Decision", breaking: "Breaking", a11y: "Access" };

/** The first text-ink pairs, drawn as "Aa" swatches; every pair is counted. Borders and fills are not text, so they are not drawn as it. */
export function contrastSwatches(item: Item, count = 3) {
  const pairs = item.contrast ?? [];
  return { swatches: pairs.filter(pair => pair.floor === "text").slice(0, count), total: pairs.length };
}

/**
 * The family this item sits in, the few entries around it for the rail (a
 * family of thirteen must not make a sticky rail taller than the window), and
 * the one after it for the pager (the last of a family has none).
 */
export function neighbours(item: Item, railSize = 5) {
  const family = catalog.items.filter(entry => entry.category === item.category);
  const index = family.findIndex(entry => entry.name === item.name);
  const start = Math.min(Math.max(0, index - Math.floor(railSize / 2)), Math.max(0, family.length - railSize));
  return { family, nearby: family.slice(start, start + railSize), next: family[index + 1] };
}
