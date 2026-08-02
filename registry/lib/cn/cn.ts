import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose class names.
 *
 * Two jobs, and the second is the one that matters: `clsx` flattens
 * conditionals, then `twMerge` resolves *conflicting* Tailwind utilities by
 * keeping the last one. That is what makes the forwarding rule in
 * CONVENTIONS.md §5 true — a consumer passing `className="px-6"` to a component
 * whose default is `px-4` gets `px-6`, rather than two competing declarations
 * whose winner depends on stylesheet order.
 *
 * Every component's root element runs its classes through this.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
