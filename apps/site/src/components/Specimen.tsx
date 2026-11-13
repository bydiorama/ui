import type { ComponentType } from "react";
import { useAppearance } from "../lib/use-appearance";

// A new example becomes a catalog preview automatically. Reference pages read
// the same files as raw source, so preview and code cannot acquire separate lists.
const modules = import.meta.glob<{ Example: ComponentType<{ hasEffects?: boolean; isThumbnail?: boolean }> }>("../examples/*.tsx", { eager: true });
const examples = Object.fromEntries(Object.entries(modules).map(([path, module]) => [
  path.split("/").at(-1)!.replace(/\.tsx$/, ""), module.Example,
]));
export const featured = ["button", "input", "tabs", "switch", "checkbox", "badge", "avatar", "progress", "chart"] as const;
export function hasExample(name: string): boolean { return Object.hasOwn(examples, name); }
export function Specimen({ name, isThumbnail = false }: { name: string; isThumbnail?: boolean }) {
  const { effects } = useAppearance();
  if (!hasExample(name)) return null;
  const Component = examples[name];
  return Component ? <Component hasEffects={effects === "on"} isThumbnail={isThumbnail} /> : null;
}
