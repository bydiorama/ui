# 0021 — Busy swallows activation

**Status:** accepted · 2026-10-05

## Context

CONVENTIONS §4 said `isBusy` was "visual only": the control kept focus, its tab
stop, *and its operability*. Button's doc went further and told callers never
to swap busy for `isDisabled` during a submit.

The first consuming app's audit (issue #8) measured what that costs. Its legacy
`loading` prop disabled the button implicitly, and that was the app's
double-submit guard. Of the 93 real `loading=` call sites, 57 passed no
`disabled` at all, and 29 bound `disabled` to an unrelated validity check. So
about 87 of 93 would quietly lose the guard on a mechanical `loading` →
`isBusy` rename, across save, delete, create and publish flows.

Making busy imply disabled was rejected. A disabled button leaves the tab
order, and focus is lost in the middle of the action the person just took.
Leaving busy operable was rejected too: it makes every caller remember a
second prop to avoid a data bug.

## Decision

1. **Busy keeps focus and its tab stop, and it ignores activation.** While
   `isBusy` is set, a click (pointer, Enter or Space) is cancelled before the
   caller's handler runs. A `type="submit"` busy button does not submit its
   form, and that includes implicit submission from Enter in a text field,
   which the browser routes through a synthetic click on the default button.
2. **It announces itself as unavailable:** `aria-busy` plus `aria-disabled="true"`.
   Most screen readers do not announce `aria-busy` on a button. Without
   `aria-disabled`, a control that does nothing would be presented as working.
3. **It is not disabled.** Busy gets no disabled styling. The cursor is
   `progress` and the press-scale is off, because motion would acknowledge a
   press that does nothing.
4. **The guard is a safety invariant in the sense of ADR 0014 §3.** A
   consumer's handler cannot opt out of it.

## Consequences

- A `loading` → `isBusy` rename is now safe by itself. Callers should drop any
  `isDisabled` that only mirrored the pending flag.
- Tests that clicked a busy button to assert the handler ran must change.
  Playwright's actionability wait treats `aria-disabled` as not actionable,
  so `userEvent.click` on a busy button waits until it times out. Dispatch
  the click directly instead.
- Any component that later renders a busy Button, including through
  `render={<Button/>}`, inherits the guard, because it lives in Button.

Ledger: `2026-10-05-busy-swallows-activation`.
