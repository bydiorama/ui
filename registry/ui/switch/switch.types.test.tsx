/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { useRef } from "react";
import { Switch } from "./switch.tsx";

export function Valid() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Switch>Show job title</Switch>
      <Switch defaultIsChecked>Uncontrolled</Switch>
      <Switch isChecked onCheckedChange={() => {}}>Controlled</Switch>
      <Switch isDisabled isLabelHidden>Disabled</Switch>
      <Switch ref={ref} name="jobTitle" value="on">With a ref and form props</Switch>
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error children is required — there is no nameless switch */
  const a = <Switch />;
  /* @ts-expect-error use isChecked, not checked */
  const b = <Switch checked>x</Switch>;
  /* @ts-expect-error use defaultIsChecked, not defaultChecked */
  const c = <Switch defaultChecked>x</Switch>;
  /* @ts-expect-error use isDisabled, not disabled */
  const d = <Switch disabled>x</Switch>;
  /* @ts-expect-error type is fixed — a Switch is never a radio */
  const e = <Switch type="radio">x</Switch>;
  /* @ts-expect-error onCheckedChange receives a boolean, not an event */
  const f = <Switch onCheckedChange={(ev: React.ChangeEvent) => ev.type}>x</Switch>;
  return [a, b, c, d, e, f];
}
