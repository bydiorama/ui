import { useCallback, useRef, useState } from "react";

export interface UseControllableStateOptions<T> {
  /** The controlled value. `undefined` means the component owns its state. */
  value?: T | undefined;
  /** The starting value when uncontrolled. Ignored once `value` is supplied. */
  defaultValue: T;
  /** Called on every change, controlled or not. */
  onChange?: ((value: T) => void) | undefined;
}

/**
 * One implementation of the controlled/uncontrolled pattern, shared by every
 * component that has state (CONVENTIONS §4: *never a bespoke implementation*).
 *
 * The contract:
 *
 * - `value === undefined` → uncontrolled. The hook holds the state and calls
 *   `onChange` after updating.
 * - `value !== undefined` → controlled. The hook holds nothing and only calls
 *   `onChange`; the parent decides whether anything moves. A component that
 *   updates internal state anyway is the bug this hook exists to prevent —
 *   the UI moves, the parent's value does not, and the two disagree until the
 *   next render accidentally reconciles them.
 *
 * Switching between the two modes mid-life is a caller error rather than a
 * supported feature, so it warns in development instead of silently picking a
 * winner. React's own inputs do the same, for the same reason: whichever
 * behaviour a library chooses, it will be wrong for half of the people who
 * hit it by accident.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const resolved = isControlled ? value : uncontrolled;

  // Kept in a ref so `setValue` stays referentially stable: it is frequently a
  // dependency of callbacks and effects, and a new identity every render turns
  // that into a re-render loop.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const wasControlled = useRef(isControlled);
  if (process.env.NODE_ENV !== "production" && wasControlled.current !== isControlled) {
    console.error(
      `A component switched from ${wasControlled.current ? "controlled to uncontrolled" : "uncontrolled to controlled"}. ` +
        "Decide once: pass `value` for the whole lifetime, or pass none and use the `default*` prop.",
    );
    wasControlled.current = isControlled;
  }

  // Read inside the stable callback below without becoming a dependency of it.
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const setValue = useCallback((next: T) => {
    // Only the uncontrolled branch stores anything. Writing here while
    // controlled is what makes a component drift from its parent.
    if (!isControlledRef.current) setUncontrolled(next);
    onChangeRef.current?.(next);
  }, []);

  return [resolved, setValue];
}
