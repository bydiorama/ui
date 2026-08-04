import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Compose class names.
 *
 * Two jobs, and the second is the one that matters: `clsx` flattens
 * conditionals, then tailwind-merge resolves *conflicting* utilities by
 * keeping the last one. That is what makes the forwarding rule in
 * CONVENTIONS.md §5 true — a consumer passing `className="px-6"` to a component
 * whose default is `px-4` gets `px-6`, rather than two competing declarations
 * whose winner depends on stylesheet order.
 *
 * The configuration below is NOT optional. tailwind-merge only knows
 * Tailwind's default class names; the system's own utilities share the `text-`
 * prefix across two different properties (`text-button-sm` is a font size,
 * `text-ink-primary` is a colour), and without being told which is which the
 * merger guesses — and DELETES one. That is a silent failure with no build
 * error and no missing CSS: the class simply never reaches the DOM. It shipped
 * once: every md/sm button label rendered at the body's 16px because the size
 * utility was merged away by the variant's colour. Computed-style tests in the
 * browser suite now pin this.
 */
const twMerge = extendTailwindMerge({
  extend: {
    // The spacing scale's own step names. Registered on the shared scale so
    // every group that derives from it (p*, m*, gap*, space-*, inset-*)
    // merges: without this, a consumer's `px-6` failed to displace a
    // component's `px-md` — both survived and the winner fell to stylesheet
    // order, which is exactly what cn() exists to prevent.
    theme: {
      spacing: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
    },
    classGroups: {
      // The type roles (--text-* namespace in the emitted theme).
      "font-size": [
        { text: [(value: string) => /^(display|title|body|label|button)-(lg|md|sm)$/.test(value) || value === "caption"] },
      ],
      // The ink roles. Namespaced `ink-*` precisely so this rule can be a
      // prefix match instead of a list that drifts.
      "text-color": [{ text: [(value: string) => value.startsWith("ink-")] }],
      // Custom names on default namespaces, so two weights or two leadings
      // still merge correctly.
      "font-weight": [{ font: ["regular", "book"] }],
      leading: [{ leading: ["flat"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
