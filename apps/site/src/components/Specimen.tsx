import type { ComponentType } from "react";
import { useAppearance } from "../lib/use-appearance";

// A new example becomes a catalog preview automatically. Reference pages read
// the same files as raw source, so preview and code cannot acquire separate lists.
const modules = import.meta.glob<{ Example: ComponentType<{ hasEffects?: boolean }> }>("../examples/*.tsx", { eager: true });
const examples = Object.fromEntries(Object.entries(modules).map(([path, module]) => [
  path.split("/").at(-1)!.replace(/\.tsx$/, ""), module.Example,
]));
export const exampleNames = Object.keys(examples);
export const featured = ["button", "input", "tabs", "switch", "checkbox", "badge", "avatar", "progress", "sparkline"] as const;
export function hasExample(name: string): boolean { return Object.hasOwn(examples, name); }
export function Specimen({ name }: { name: string }) {
  const { effects } = useAppearance();
  if (!hasExample(name)) return null;
  const Component = examples[name];
  return Component ? <Component hasEffects={effects === "on"} /> : null;
}
