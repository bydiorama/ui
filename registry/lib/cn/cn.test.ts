import test from "node:test";
import assert from "node:assert/strict";

import { cn } from "./cn.ts";

const has = (result: string, cls: string) => result.split(" ").includes(cls);

/**
 * The merge config is the least visible load-bearing thing in the library: when
 * it is wrong, a class is simply absent from the DOM — no build error, no
 * missing CSS, nothing to grep. Two shipped bugs lived here and there were no
 * tests at all until this file.
 */

test("a type role and an ink role coexist — they are different properties", () => {
  // Shipped once: every md/sm button label rendered at 16px because the
  // variant's colour merged the size away.
  const result = cn("text-button-sm", "text-ink-primary");
  assert.ok(has(result, "text-button-sm"), `size was dropped: ${result}`);
  assert.ok(has(result, "text-ink-primary"), `colour was dropped: ${result}`);
});

test("a type role does NOT clear a leading role", () => {
  // Shipped once: `leading-flat` then `text-label-sm` produced a Badge with
  // the font's normal leading, so md and sm were both 28px tall. Stock
  // Tailwind sizes bundle a line-height; ours never do (ADR 0009).
  const result = cn("leading-flat", "text-label-sm");
  assert.ok(has(result, "leading-flat"), `leading was dropped: ${result}`);
  assert.ok(has(result, "text-label-sm"), `size was dropped: ${result}`);
});

test("two type roles still merge — the last one wins", () => {
  const result = cn("text-body-md", "text-label-sm");
  assert.ok(!has(result, "text-body-md"), `both sizes survived: ${result}`);
  assert.ok(has(result, "text-label-sm"));
});

test("two leadings merge, including the custom step", () => {
  const result = cn("leading-flat", "leading-snug");
  assert.ok(!has(result, "leading-flat"), `both leadings survived: ${result}`);
  assert.ok(has(result, "leading-snug"));
});

test("two ink roles merge", () => {
  const result = cn("text-ink-muted", "text-ink-primary");
  assert.ok(!has(result, "text-ink-muted"));
  assert.ok(has(result, "text-ink-primary"));
});

test("a consumer's spacing displaces the component's own — §5 forwarding", () => {
  // Shipped once: `px-6` failed to displace `px-md`, so both survived and the
  // winner fell to stylesheet order — the exact thing cn() exists to prevent.
  const result = cn("px-md", "px-6");
  assert.ok(!has(result, "px-md"), `component default survived: ${result}`);
  assert.ok(has(result, "px-6"));

  const named = cn("gap-sm", "gap-xl");
  assert.ok(!has(named, "gap-sm"));
  assert.ok(has(named, "gap-xl"));
});

test("custom font weights merge against stock ones", () => {
  const result = cn("font-book", "font-bold");
  assert.ok(!has(result, "font-book"), `both weights survived: ${result}`);
  assert.ok(has(result, "font-bold"));
});

test("the knowing trade: a stock font size no longer clears a stock leading", () => {
  // Documented here so the trade stays deliberate rather than becoming a
  // surprise. Removing the font-size→leading conflict is what stops our own
  // roles from deleting their leading; the cost is that stock `text-sm` keeps
  // a preceding `leading-6` and the cascade decides. This library emits no
  // stock font sizes, so nothing here is affected — only consumer code.
  const result = cn("leading-6", "text-sm");
  assert.ok(has(result, "leading-6"), `expected the documented trade: ${result}`);
  assert.ok(has(result, "text-sm"));
});
